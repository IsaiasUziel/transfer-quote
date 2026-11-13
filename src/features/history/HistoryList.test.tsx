import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Quote } from '../../domain/types'
import { HistoryList } from './HistoryList'

const quote: Quote = {
  id: 'quote-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  currency: 'CLP',
  baseAddress: 'Base Ciudad Ejemplo',
  clientAddress: `12°30'0"S 45°15'0"W`,
  oneWayKm: 10,
  visits: 2,
  pricing: { tariffPerKm: 400, includedKm: 2, minimumFare: 400, emptySurchargePerKm: 200 },
  loadedKm: 20,
  emptyKm: 20,
  distanceFare: 7200,
  emptySurcharge: 4000,
  total: 11200,
}

function renderHistory(item: Quote) {
  const onDelete = vi.fn()
  render(
    <HistoryList
      quotes={[item]}
      loading={false}
      loadError={null}
      onDelete={onDelete}
      onClear={() => {}}
      onImport={() => ({ added: 0, skipped: 0 })}
    />,
  )
  return onDelete
}

afterEach(() => { vi.restoreAllMocks() })

describe('HistoryList quote names', () => {
  it('uses the custom label as the title and keeps the address visible', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDelete = renderHistory({ ...quote, label: 'Cumpleaños de Ana' })

    expect(screen.getByRole('heading', { name: 'Cumpleaños de Ana' })).toBeInTheDocument()
    expect(screen.getByText(quote.clientAddress)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cotización: Cumpleaños de Ana' }))
    expect(confirm).toHaveBeenCalledWith('¿Eliminar la cotización de Cumpleaños de Ana?')
    expect(onDelete).toHaveBeenCalledWith(quote.id)
  })

  it.each([undefined, '', '   '])('uses the address when the label is %j', (label) => {
    renderHistory(label === undefined ? quote : { ...quote, label })

    expect(screen.getByRole('heading', { name: quote.clientAddress })).toBeInTheDocument()
    expect(screen.getAllByText(quote.clientAddress)).toHaveLength(1)
  })
})
