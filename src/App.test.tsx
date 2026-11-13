import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Quote } from './domain/types'
import App from './App'

const { saveQuote } = vi.hoisted(() => ({
  saveQuote: vi.fn(async (_quote: Quote) => {}),
}))

vi.mock('./components/MapPicker', () => ({
  MapPicker: () => <div data-testid="map-picker" />,
}))

vi.mock('./infrastructure/storage/indexeddb', () => ({
  IndexedDbQuoteRepository: class {
    async list() {
      return []
    }

    save = saveQuote

    async remove() {}

    async clear() {}
  },
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders the quote form and switches tabs', async () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Cotizador de traslados' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Dirección del cliente')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Apariencia' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))

    expect(screen.getByLabelText('Dirección de la base')).toBeInTheDocument()
    expect(screen.getByLabelText('Tarifa mínima (CLP)')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }))

    expect(
      await screen.findByText('Todavía no hay cotizaciones guardadas.'),
    ).toBeInTheDocument()
  })

  it('uses saved settings to quote a transfer and show it in history', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    fireEvent.change(screen.getByLabelText('Dirección de la base'), {
      target: { value: 'Base Ciudad Ejemplo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }))

    expect(JSON.parse(localStorage.getItem('elenis-traslados:settings')!)).toMatchObject({
      schemaVersion: 1,
      baseAddress: 'Base Ciudad Ejemplo',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cotizar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cotización' }))

    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.getByLabelText('Dirección del cliente')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Distancia de ida (km)')).toHaveAttribute('aria-invalid', 'true')
    fireEvent.click(screen.getByRole('link', { name: 'Ingresa una distancia de ida mayor a 0.' }))
    expect(screen.getByLabelText('Distancia de ida (km)')).toHaveFocus()

    fireEvent.change(screen.getByLabelText('Nombre de la cotización (opcional)'), {
      target: { value: 'Cumpleaños de Ana' },
    })
    fireEvent.change(screen.getByLabelText('Dirección del cliente'), {
      target: { value: 'Cliente Otra Ciudad' },
    })
    fireEvent.change(screen.getByLabelText('Distancia de ida (km)'), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una visita' }))

    expect(screen.getByText('$11.200')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cotización' }))

    expect(await screen.findByText('Cotización guardada en el historial.')).toBeInTheDocument()
    expect(saveQuote).toHaveBeenCalledWith(expect.objectContaining({
      baseAddress: 'Base Ciudad Ejemplo',
      clientAddress: 'Cliente Otra Ciudad',
      label: 'Cumpleaños de Ana',
      oneWayKm: 10,
      visits: 2,
      total: 11200,
    }))

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }))

    expect(await screen.findByText('Cumpleaños de Ana')).toBeInTheDocument()
    expect(await screen.findByText('Cliente Otra Ciudad')).toBeInTheDocument()
    expect(screen.getByText('$11.200')).toBeInTheDocument()
    expect(screen.getByText(/Total aproximado de kms/)).toHaveTextContent('40,0 km')
    expect(screen.getByText(/^Km incluidos:/)).toHaveTextContent('2,0 km')
    expect(screen.getByText(/^Km de ida cobrables:/)).toHaveTextContent('18,0 km')
    expect(screen.queryByText('Todavía no hay cotizaciones guardadas.')).not.toBeInTheDocument()
  })
})
