import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Quote } from '../../domain/types'
import { IndexedDbQuoteRepository } from './indexeddb'

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'quote-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    currency: 'CLP',
    baseAddress: 'Base',
    clientAddress: 'Client',
    oneWayKm: 10,
    visits: 2,
    pricing: {
      tariffPerKm: 400,
      includedKm: 2,
      minimumFare: 400,
      emptySurchargePerKm: 200,
    },
    loadedKm: 20,
    emptyKm: 20,
    distanceFare: 7200,
    emptySurcharge: 4000,
    total: 11200,
    ...overrides,
  }
}

describe('IndexedDbQuoteRepository', () => {
  const repository = new IndexedDbQuoteRepository()

  beforeEach(async () => {
    await repository.clear()
  })

  it('saves and lists quotes newest first', async () => {
    await repository.save(
      makeQuote({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' }),
    )
    await repository.save(
      makeQuote({ id: 'newer', createdAt: '2026-01-02T00:00:00.000Z' }),
    )

    const quotes = await repository.list()

    expect(quotes.map((quote) => quote.id)).toEqual(['newer', 'older'])
  })

  it('removes a quote by id', async () => {
    await repository.save(makeQuote({ id: 'to-remove' }))

    await repository.remove('to-remove')

    expect(await repository.list()).toEqual([])
  })

  it('preserves a custom label alongside the original address', async () => {
    const quote = makeQuote({ label: 'Cumpleaños de Ana', clientAddress: `12°30'0"S 45°15'0"W` })
    await repository.save(quote)

    expect(await repository.list()).toEqual([quote])
  })

  it('clears every quote', async () => {
    await repository.save(makeQuote({ id: 'one' }))
    await repository.save(makeQuote({ id: 'two' }))

    await repository.clear()

    expect(await repository.list()).toEqual([])
  })
})
