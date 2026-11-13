import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { LatLng } from '../domain/types'
import { createDefaultGeocoder } from '../infrastructure/geocoding/default-geocoder'
import type { GeocodeResult } from '../infrastructure/geocoding/types'
import { parseCoordinates } from '../lib/coordinates'
import { MapPicker } from './MapPicker'

export interface LocationValue {
  address: string
  coordinates: LatLng | null
}

interface LocationPickerProps {
  id: string
  label: string
  value: LocationValue
  onChange: (value: LocationValue) => void
  error?: string
  center?: LatLng
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' | 'error'; query: string }
  | { status: 'success'; query: string; results: GeocodeResult[] }

const SEARCH_DELAY_MS = 450

export function LocationPicker({ id, label, value, onChange, error, center }: LocationPickerProps) {
  const geocoder = useMemo(() => createDefaultGeocoder({ center }), [center])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<SearchState>({ status: 'idle' })
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [resolving, setResolving] = useState(false)
  const reverseRequestId = useRef(0)

  useEffect(() => {
    if (query.trim().length < 3 || query !== value.address) return
    let cancelled = false
    const timeout = setTimeout(() => {
      geocoder.search(query.trim()).then((results) => {
        if (!cancelled) setSearch({ status: 'success', query, results })
      }).catch(() => {
        if (!cancelled) setSearch({ status: 'error', query })
      })
    }, SEARCH_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query, value.address, geocoder])

  const currentSearch = query === value.address && search.status !== 'idle' && search.query === query
    ? search : null
  const results = currentSearch?.status === 'success' ? currentSearch.results : []
  const expanded = open && results.length > 0
  const hasEnteredCoordinates = value.coordinates !== null && parseCoordinates(value.address) !== null

  function selectResult(result: GeocodeResult) {
    reverseRequestId.current += 1
    setResolving(false)
    setQuery('')
    setSearch({ status: 'idle' })
    setOpen(false)
    setActiveIndex(-1)
    onChange({ address: result.label, coordinates: result.coordinates })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length > 0) {
      event.preventDefault()
      setOpen(true)
      const next = event.key === 'ArrowDown'
        ? (activeIndex + 1) % results.length
        : (activeIndex <= 0 ? results.length - 1 : activeIndex - 1)
      setActiveIndex(next)
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView?.({ block: 'nearest' })
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) selectResult(results[activeIndex])
      else setOpen(false)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  async function handleMapChange(coordinates: LatLng) {
    const requestId = ++reverseRequestId.current
    setQuery('')
    setSearch({ status: 'idle' })
    setOpen(false)
    setActiveIndex(-1)
    const address = parseCoordinates(value.address) || !value.address.trim()
      ? `${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`
      : value.address
    onChange({ address, coordinates })
    setResolving(true)
    try {
      const result = await geocoder.reverse(coordinates)
      if (requestId === reverseRequestId.current && result) {
        onChange({ address: result.label, coordinates })
      }
    } catch {
      // Keep the selected point and allow the address to be entered manually.
    } finally {
      if (requestId === reverseRequestId.current) setResolving(false)
    }
  }

  return (
    <div className="location-picker space-y-3">
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
        <div className="address-input">
          <input
            id={id}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? `${id}-suggestions` : undefined}
            aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
            value={value.address}
            autoComplete="off"
            onChange={(event) => {
              const address = event.target.value
              const coordinates = parseCoordinates(address)
              reverseRequestId.current += 1
              setResolving(false)
              setQuery(coordinates ? '' : address)
              setSearch(!coordinates && address.trim().length >= 3 ? { status: 'loading', query: address } : { status: 'idle' })
              setActiveIndex(-1)
              setOpen(!coordinates)
              onChange({ address, coordinates })
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => { setOpen(false); setActiveIndex(-1) }}
            onKeyDown={handleKeyDown}
            placeholder="Dirección, referencia o coordenadas"
            className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm"
          />
          {expanded ? (
            <ul id={`${id}-suggestions`} role="listbox" aria-label="Direcciones sugeridas" className="address-suggestions">
              {results.map((result, index) => (
                <li
                  key={`${result.label}-${result.coordinates.lat}-${result.coordinates.lon}`}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onPointerDown={(event) => event.preventDefault()}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectResult(result)}
                >
                  <span aria-hidden="true">↗</span><span>{result.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
        <p id={`${id}-hint`} className="field-hint">Selecciona una sugerencia o pega coordenadas y ajusta el pin en el mapa. También puedes escribir una referencia y usar una distancia manual.</p>
        <div role="status" className="location-status">
          {hasEnteredCoordinates && !resolving ? 'Coordenadas reconocidas. Puedes ajustar el pin en el mapa.' : null}
          {open && currentSearch?.status === 'loading' ? 'Buscando direcciones…' : null}
          {open && currentSearch?.status === 'error' ? 'No se pudo buscar. Puedes escribir la dirección y usar una distancia manual, o marcar el mapa.' : null}
          {open && currentSearch?.status === 'success' && results.length === 0 ? 'Sin resultados. Prueba otra referencia o conserva la dirección para cotizar manualmente.' : null}
          {expanded ? `${results.length} sugerencias. Usa las flechas y Enter para elegir.` : null}
          {resolving ? 'Resolviendo la dirección…' : null}
        </div>
      </div>
      <div className="map-caption"><span>Ubicación en el mapa</span><span>{value.coordinates ? 'Pin seleccionado' : 'Sin pin'}</span></div>
      <MapPicker value={value.coordinates} onChange={handleMapChange} center={center} ariaLabel={`Mapa para ubicar: ${label}`} />
      <p className="field-hint">También puedes tocar el mapa o arrastrar el pin para ajustar la ubicación.</p>
    </div>
  )
}
