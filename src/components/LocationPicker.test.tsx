import { useState } from 'react'
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeocodeResult } from '../infrastructure/geocoding/types'
import type { LatLng } from '../domain/types'
import { LocationPicker, type LocationValue } from './LocationPicker'

const { search, reverse } = vi.hoisted(() => ({
  search: vi.fn<(query: string) => Promise<GeocodeResult[]>>(),
  reverse: vi.fn<(coordinates: LatLng) => Promise<GeocodeResult | null>>(),
}))

vi.mock('../infrastructure/geocoding/default-geocoder', () => ({
  createDefaultGeocoder: () => ({ search, reverse }),
}))

vi.mock('./MapPicker', () => ({
  MapPicker: ({ onChange }: { onChange: (coordinates: LatLng) => void }) => (
    <button type="button" onClick={() => onChange({ lat: -34.4, lon: -70.85 })}>
      Marcar en mapa
    </button>
  ),
}))

const suggestions: GeocodeResult[] = [
  { label: 'Ciudad Ejemplo, Chile', coordinates: { lat: -34.4, lon: -70.85 } },
  { label: 'Otra Ciudad, Chile', coordinates: { lat: -34.27, lon: -70.95 } },
]

function Harness({ onChange = () => {} }: { onChange?: (value: LocationValue) => void }) {
  const [value, setValue] = useState<LocationValue>({ address: '', coordinates: null })
  return (
    <form>
      <LocationPicker
        id="test-location"
        label="Dirección del cliente"
        value={value}
        onChange={(next) => { setValue(next); onChange(next) }}
      />
    </form>
  )
}

async function finishDebounce() {
  await act(async () => { await vi.advanceTimersByTimeAsync(500) })
}

describe('LocationPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    search.mockReset().mockResolvedValue([])
    reverse.mockReset().mockResolvedValue(null)
  })

  afterEach(() => { vi.useRealTimers() })

  it.each([
    `12°30'0"S 45°15'0"W`,
    '-12.5, -45.25',
  ])('places a pin directly from coordinates: %s', async (address) => {
    const onChange = vi.fn<(value: LocationValue) => void>()
    render(<Harness onChange={onChange} />)
    const input = screen.getByLabelText('Dirección del cliente')

    fireEvent.change(input, { target: { value: address } })
    await finishDebounce()

    const location = onChange.mock.calls.at(-1)?.[0]
    expect(location?.coordinates?.lat).toBeCloseTo(-12.5, 8)
    expect(location?.coordinates?.lon).toBeCloseTo(-45.25, 8)
    expect(input).toHaveValue(address)
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(search).not.toHaveBeenCalled()
    expect(reverse).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Coordenadas reconocidas')
  })

  it('selects a suggested address with the keyboard without submitting the form', async () => {
    search.mockResolvedValue(suggestions)
    const onChange = vi.fn<(value: LocationValue) => void>()
    render(<Harness onChange={onChange} />)
    const input = screen.getByLabelText('Dirección del cliente')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Ren' } })
    await finishDebounce()

    expect(search).toHaveBeenCalledWith('Ren')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const activeId = input.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(document.getElementById(activeId!)).toHaveTextContent('Otra Ciudad, Chile')
    expect(input).toHaveAttribute('aria-expanded', 'true')

    const enter = createEvent.keyDown(input, { key: 'Enter', cancelable: true })
    fireEvent(input, enter)

    expect(enter.defaultPrevented).toBe(true)
    expect(input).toHaveValue('Otra Ciudad, Chile')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({
      address: suggestions[1]!.label,
      coordinates: suggestions[1]!.coordinates,
    })
  })

  it('keeps typed text and closes suggestions with Escape', async () => {
    search.mockResolvedValue(suggestions)
    render(<Harness />)
    const input = screen.getByLabelText('Dirección del cliente')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Ren' } })
    await finishDebounce()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(input).toHaveValue('Ren')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('keeps coordinate text aligned with an adjusted pin when reverse lookup fails', async () => {
    reverse.mockRejectedValue(new Error('Service unavailable'))
    const onChange = vi.fn<(value: LocationValue) => void>()
    render(<Harness onChange={onChange} />)
    const input = screen.getByLabelText('Dirección del cliente')

    fireEvent.change(input, { target: { value: `12°30'0"S 45°15'0"W` } })
    fireEvent.click(screen.getByRole('button', { name: 'Marcar en mapa' }))
    await finishDebounce()

    expect(input).toHaveValue('-34.400000, -70.850000')
    expect(onChange).toHaveBeenLastCalledWith({
      address: '-34.400000, -70.850000',
      coordinates: { lat: -34.4, lon: -70.85 },
    })
    expect(search).not.toHaveBeenCalled()
  })

  it('keeps a new map point usable when reverse lookup returns no address', async () => {
    const onChange = vi.fn<(value: LocationValue) => void>()
    render(<Harness onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Marcar en mapa' }))
    await finishDebounce()

    expect(screen.getByLabelText('Dirección del cliente')).toHaveValue('-34.400000, -70.850000')
    expect(onChange).toHaveBeenLastCalledWith({
      address: '-34.400000, -70.850000', coordinates: { lat: -34.4, lon: -70.85 },
    })
    expect(search).not.toHaveBeenCalled()
  })

  it('ignores reverse geocoding after the user edits the address', async () => {
    let resolveReverse!: (result: GeocodeResult | null) => void
    reverse.mockReturnValue(new Promise((resolve) => { resolveReverse = resolve }))
    const onChange = vi.fn<(value: LocationValue) => void>()
    render(<Harness onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar en mapa' }))
    fireEvent.change(screen.getByLabelText('Dirección del cliente'), {
      target: { value: 'Referencia manual' },
    })
    await act(async () => { resolveReverse(suggestions[0]!) })

    expect(screen.getByLabelText('Dirección del cliente')).toHaveValue('Referencia manual')
    expect(onChange).toHaveBeenLastCalledWith({
      address: 'Referencia manual', coordinates: null,
    })
  })

  it('does not restore old suggestions when the query changes during a request', async () => {
    let resolveFirst!: (results: GeocodeResult[]) => void
    search.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce([suggestions[1]!])
    render(<Harness />)
    const input = screen.getByLabelText('Dirección del cliente')

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Ren' } })
    await finishDebounce()
    fireEvent.change(input, { target: { value: 'Otra Ciudad' } })
    await finishDebounce()
    await act(async () => { resolveFirst([suggestions[0]!]) })

    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option')).toHaveTextContent('Otra Ciudad, Chile')
    expect(input).toHaveValue('Otra Ciudad')
  })
})
