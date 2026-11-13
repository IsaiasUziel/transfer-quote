import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { LatLng } from '../domain/types'
import { LocationPicker, type LocationValue } from './LocationPicker'

vi.mock('./MapPicker', () => ({
  MapPicker: ({ onChange }: { onChange: (coordinates: LatLng) => void }) => (
    <button
      type="button"
      onClick={() => onChange({ lat: -33.4505, lon: -70.6705 })}
    >
      Ajustar pin
    </button>
  ),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('suggests the available street for a numbered address and lets the user adjust its pin', async () => {
  vi.useFakeTimers()
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (url.hostname === 'photon.komoot.io') {
      if (url.searchParams.get('lang') === 'es') {
        return new Response(JSON.stringify({ lang: 'Language is not supported' }), { status: 400 })
      }
      return new Response(JSON.stringify({
        features: [{
          geometry: { type: 'Point', coordinates: [-70.67, -33.45] },
          properties: {
            name: 'Pasaje Ejemplo', city: 'Rancagua', countrycode: 'CL', type: 'street',
          },
        }],
      }), { status: 200 })
    }
    return new Response(JSON.stringify({
      display_name: 'Pasaje Ejemplo, Rancagua', lat: '-33.4505', lon: '-70.6705',
    }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  const onChange = vi.fn<(value: LocationValue) => void>()

  function Harness() {
    const [value, setValue] = useState<LocationValue>({ address: '', coordinates: null })
    return (
      <LocationPicker
        id="client-address"
        label="Dirección del cliente"
        value={value}
        onChange={(next) => { setValue(next); onChange(next) }}
      />
    )
  }

  render(<Harness />)
  const input = screen.getByLabelText('Dirección del cliente')
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: 'Ejemplo 123 Ciudad Ejemplo' } })
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })

  const searchUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
  expect(searchUrl.searchParams.get('q')).toBe('Ejemplo 123 Ciudad Ejemplo')
  expect(searchUrl.searchParams.get('lang')).toBe('default')
  expect(searchUrl.searchParams.get('countrycode')).toBe('CL')
  const suggestion = screen.getByRole('option', { name: /Pasaje Ejemplo, Rancagua/ })
  fireEvent.mouseDown(suggestion)
  fireEvent.click(suggestion)

  expect(input).toHaveValue('Pasaje Ejemplo, Rancagua')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(onChange).toHaveBeenLastCalledWith({
    address: 'Pasaje Ejemplo, Rancagua',
    coordinates: { lat: -33.45, lon: -70.67 },
  })

  fireEvent.click(screen.getByRole('button', { name: 'Ajustar pin' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })

  expect(onChange).toHaveBeenLastCalledWith({
    address: 'Pasaje Ejemplo, Rancagua',
    coordinates: { lat: -33.4505, lon: -70.6705 },
  })
})
