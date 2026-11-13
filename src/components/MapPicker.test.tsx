import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as leaflet from 'leaflet'
import { MapPicker } from './MapPicker'

vi.mock('leaflet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('leaflet')>()
  return { ...actual, map: vi.fn(actual.map), marker: vi.fn(actual.marker) }
})

beforeEach(() => { vi.clearAllMocks() })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MapPicker with native Leaflet', () => {
  it('centers on the configured base and keeps scroll zoom enabled', () => {
    const createMap = vi.mocked(leaflet.map)
    render(<MapPicker value={null} center={{ lat: 12, lon: 45 }} onChange={() => {}} />)
    const map = createMap.mock.results[0]!.value

    expect(map.getCenter().lat).toBeCloseTo(12)
    expect(map.getCenter().lng).toBeCloseTo(45)
    expect(map.scrollWheelZoom.enabled()).toBe(true)
    expect(map.getContainer().style.height).toBe('400px')
    expect(screen.getByRole('region', { name: 'Mapa para seleccionar una ubicación' })).toBeInTheDocument()
  })

  it('reports a selected point and a dragged marker using the latest callback', () => {
    const createMap = vi.mocked(leaflet.map)
    const createMarker = vi.mocked(leaflet.marker)
    const onChange = vi.fn()
    const view = render(<MapPicker value={null} onChange={onChange} />)
    const map = createMap.mock.results[0]!.value
    act(() => { map.fire('click', { latlng: leaflet.latLng(12.5, 45.25) }) })
    expect(onChange).toHaveBeenCalledWith({ lat: 12.5, lon: 45.25 })

    const nextCallback = vi.fn()
    view.rerender(<MapPicker value={{ lat: 12.5, lon: 45.25 }} onChange={nextCallback} />)
    const pin = createMarker.mock.results[0]!.value
    expect(pin.dragging?.enabled()).toBe(true)
    act(() => { pin.setLatLng([12.6, 45.3]).fire('dragend') })
    expect(nextCallback).toHaveBeenCalledWith({ lat: 12.6, lon: 45.3 })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('updates and removes the pin without recreating the map', () => {
    const createMap = vi.mocked(leaflet.map)
    const createMarker = vi.mocked(leaflet.marker)
    const view = render(<MapPicker value={{ lat: 12.5, lon: 45.25 }} onChange={() => {}} />)
    const pin = createMarker.mock.results[0]!.value
    view.rerender(<MapPicker value={{ lat: 13, lon: 46 }} onChange={() => {}} />)
    expect(pin.getLatLng().lat).toBe(13)
    expect(createMap).toHaveBeenCalledTimes(1)
    expect(createMarker).toHaveBeenCalledTimes(1)

    view.rerender(<MapPicker value={null} onChange={() => {}} />)
    expect(createMap.mock.results[0]!.value.hasLayer(pin)).toBe(false)
  })

  it('cleans up maps during strict-mode remounting and final unmount', () => {
    const createMap = vi.mocked(leaflet.map)
    const remove = vi.spyOn(leaflet.Map.prototype, 'remove')
    const view = render(<StrictMode><MapPicker value={null} onChange={() => {}} /></StrictMode>)
    expect(createMap).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(remove).toHaveBeenCalledTimes(2)
  })
})
