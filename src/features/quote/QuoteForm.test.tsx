import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Quote } from '../../domain/types'
import type { AppSettings } from '../settings/settings'
import { OsrmRouteProvider } from '../../infrastructure/routing/osrm'
import type { RouteResult } from '../../infrastructure/routing/types'
import { QuoteForm } from './QuoteForm'

interface MockLocationPickerProps {
  id: string
  label: string
  value: {
    address: string
    coordinates: { lat: number; lon: number } | null
  }
  onChange: (value: MockLocationPickerProps['value']) => void
}

vi.mock('../../components/LocationPicker', () => ({
  LocationPicker: ({ id, label, value, onChange }: MockLocationPickerProps) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value.address}
        onChange={(event) =>
          onChange({ ...value, address: event.target.value })
        }
      />
      <button
        type="button"
        onClick={() =>
          onChange({
            address: value.address,
            coordinates: { lat: -34.41, lon: -70.86 },
          })
        }
      >
        Marcar pin
      </button>
      <button
        type="button"
        onClick={() => onChange({
          address: value.address,
          coordinates: { lat: -34.42, lon: -70.87 },
        })}
      >
        Mover pin
      </button>
    </div>
  ),
}))

const settings: AppSettings = {
  baseAddress: 'Base Ciudad Ejemplo',
  baseCoordinates: { lat: -34.4, lon: -70.85 },
  pricing: {
    tariffPerKm: 400,
    includedKm: 2,
    minimumFare: 400,
    emptySurchargePerKm: 200,
  },
}

function renderForm(onSaveQuote: (quote: Quote) => Promise<void>, appSettings = settings) {
  render(
    <QuoteForm
      settings={appSettings}
      onSaveQuote={onSaveQuote}
      onGoToSettings={() => {}}
    />,
  )
}

describe('QuoteForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows included and billable km when the full outbound distance is included', () => {
    renderForm(vi.fn(async (_quote: Quote) => {}), {
      ...settings,
      pricing: { ...settings.pricing, includedKm: 5, tariffPerKm: 300, minimumFare: 0 },
    })
    fireEvent.change(screen.getByLabelText('Distancia de ida (km)'), {
      target: { value: '1,3' },
    })

    expect(screen.queryByText('Km incluidos')).toBeInTheDocument()
    expect(screen.getByText('Km incluidos').parentElement).toHaveTextContent('5,0 km')
    expect(screen.getByText('Km de ida cobrables').parentElement).toHaveTextContent('0,0 km')
    expect(screen.getByText('Km de ida').parentElement).toHaveTextContent('1,3 km')
    expect(screen.getByText('Total aproximado de kms').parentElement).toHaveTextContent('2,6 km')
    expect(screen.getByText('Tarifa por distancia').parentElement).toHaveTextContent('$0')
    expect(screen.getByRole('status')).toHaveTextContent('$260')
  })

  it.each(['', '   ', '  Cumpleaños de Ana  '])('calculates and saves a manual quote with optional label %j', async (label) => {
    const onSaveQuote = vi.fn(async (_quote: Quote) => {})
    renderForm(onSaveQuote)

    fireEvent.change(screen.getByLabelText('Nombre de la cotización (opcional)'), {
      target: { value: label },
    })
    fireEvent.change(screen.getByLabelText('Dirección del cliente'), {
      target: { value: 'Cliente Ciudad Ejemplo' },
    })
    fireEvent.change(screen.getByLabelText('Distancia de ida (km)'), {
      target: { value: '10' },
    })
    expect(screen.getByText('Total aproximado de kms').parentElement).toHaveTextContent('20,0 km')
    expect(screen.getByText('Km de ida cobrables').parentElement).toHaveTextContent('8,0 km')
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una visita' }))

    expect(screen.getByText('Total aproximado de kms').parentElement).toHaveTextContent('40,0 km')
    expect(screen.getByText('Km incluidos').parentElement).toHaveTextContent('2,0 km')
    expect(screen.getByText('Km de ida cobrables').parentElement).toHaveTextContent('18,0 km')
    expect(screen.getByText('$11.200')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar cotización' }),
    )

    await waitFor(() => expect(onSaveQuote).toHaveBeenCalledTimes(1))
    await screen.findByText('Cotización guardada en el historial.')
    expect(screen.getByLabelText('Nombre de la cotización (opcional)')).toHaveValue('')

    const quote = onSaveQuote.mock.calls[0]?.[0]
    if (label.trim()) {
      expect(quote).toHaveProperty('label', label.trim())
    } else {
      expect(quote).not.toHaveProperty('label')
    }
    expect(quote).toMatchObject({
      baseAddress: 'Base Ciudad Ejemplo',
      clientAddress: 'Cliente Ciudad Ejemplo',
      oneWayKm: 10,
      visits: 2,
      distanceSource: 'manual',
      loadedKm: 20,
      emptyKm: 20,
      distanceFare: 7200,
      emptySurcharge: 4000,
      total: 11200,
    })
  })

  it('fills the distance from the route when a client pin is set', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [{ distance: 10_500, duration: 900 }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderForm(vi.fn(async (_quote: Quote) => {}))

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pin' }))

    await waitFor(
      () =>
        expect(screen.getByLabelText('Distancia de ida (km)')).toHaveValue(
          '10,5',
        ),
      { timeout: 3000 },
    )

    expect(screen.getByText('$5.500')).toBeInTheDocument()
    expect(screen.getByText('Total aproximado de kms').parentElement).toHaveTextContent('21,0 km')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/-70.850000,-34.400000;-70.860000,-34.410000',
    )
  })

  it('keeps a manual distance when an older route response arrives', async () => {
    vi.useFakeTimers()
    let resolveRoute!: (route: RouteResult) => void
    const routeRequest = new Promise<RouteResult>((resolve) => {
      resolveRoute = resolve
    })
    const getRoute = vi.spyOn(OsrmRouteProvider.prototype, 'getRoute')
      .mockReturnValue(routeRequest)
    renderForm(vi.fn(async (_quote: Quote) => {}))

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pin' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(getRoute).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('Distancia de ida (km)'), {
      target: { value: '15' },
    })
    await act(async () => { resolveRoute({ distanceKm: 10.5, durationMin: 15 }) })

    expect(screen.getByLabelText('Distancia de ida (km)')).toHaveValue('15')
  })

  it('clears the previous automatic distance while a moved pin is being routed', async () => {
    vi.useFakeTimers()
    vi.spyOn(OsrmRouteProvider.prototype, 'getRoute')
      .mockResolvedValueOnce({ distanceKm: 10.5, durationMin: 15 })
      .mockReturnValueOnce(new Promise<RouteResult>(() => {}))
    renderForm(vi.fn(async (_quote: Quote) => {}))

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pin' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(screen.getByLabelText('Distancia de ida (km)')).toHaveValue('10,5')

    fireEvent.click(screen.getByRole('button', { name: 'Mover pin' }))

    expect(screen.getByLabelText('Distancia de ida (km)')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Guardar cotización' })).toBeDisabled()
  })
})
