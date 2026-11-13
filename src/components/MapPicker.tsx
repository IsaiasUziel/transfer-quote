import { divIcon, map as createMap, marker, tileLayer, type Map as LeafletMap, type Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useEffectEvent, useRef } from 'react'
import { APP_CONFIG } from '../config/app'
import type { LatLng } from '../domain/types'
import { DEFAULT_MAP_CENTER } from '../lib/geo'

const PIN_ICON = divIcon({
  className: 'location-pin',
  html: `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M15 1C7.82 1 2 6.82 2 14c0 9.5 11.2 23.3 12.24 24.55a1 1 0 0 0 1.52 0C16.8 37.3 28 23.5 28 14 28 6.82 22.18 1 15 1Z" fill="#0f766e" stroke="#ffffff" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="#ffffff"/>
    </svg>
  `,
  iconSize: [30, 40],
  iconAnchor: [15, 38],
})

const MAP_HEIGHT_PX = 400

interface MapPickerProps {
  value: LatLng | null
  onChange: (coordinates: LatLng) => void
  center?: LatLng
  ariaLabel?: string
}

export function MapPicker({ value, onChange, center = DEFAULT_MAP_CENTER, ariaLabel }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const notifyChange = useEffectEvent((coordinates: LatLng) => onChange(coordinates))

  useEffect(() => {
    if (!containerRef.current) return
    const map = createMap(containerRef.current, {
      center: [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lon],
      zoom: 14,
      scrollWheelZoom: true,
    })
    mapRef.current = map
    if (APP_CONFIG.tileUrl) {
      tileLayer(APP_CONFIG.tileUrl, { attribution: APP_CONFIG.tileAttribution, maxZoom: 19 }).addTo(map)
    }
    map.on('click', (event) => {
      notifyChange({ lat: event.latlng.lat, lon: event.latlng.lng })
    })
    const observer = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => map.invalidateSize({ pan: false })) : null
    observer?.observe(containerRef.current)

    return () => {
      observer?.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!value) {
      if (markerRef.current) map.removeLayer(markerRef.current)
      markerRef.current = null
      map.setView([center.lat, center.lon], 13)
      return
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lon])
    } else {
      const pin = marker([value.lat, value.lon], {
        icon: PIN_ICON, draggable: true, title: 'Ubicación seleccionada', alt: 'Ubicación seleccionada',
      }).addTo(map)
      pin.on('dragend', () => {
        const position = pin.getLatLng()
        notifyChange({ lat: position.lat, lon: position.lng })
      })
      markerRef.current = pin
    }
    map.setView([value.lat, value.lon], Math.max(map.getZoom(), 14))
  }, [value, center])

  return (
    <div className="map-frame overflow-hidden rounded-xl border border-line" role="region" aria-label={ariaLabel ?? 'Mapa para seleccionar una ubicación'}>
      <div ref={containerRef} style={{ height: MAP_HEIGHT_PX, width: '100%' }} />
    </div>
  )
}
