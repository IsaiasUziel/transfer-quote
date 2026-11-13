import { describe, expect, it } from 'vitest'
import type { Quote } from '../../domain/types'
import { mergeQuotes } from './merge-quotes'

function makeQuote(id: string, createdAt: string): Quote {
  return {
    id,
    createdAt,
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
  }
}

describe('mergeQuotes', () => {
  it('adds imported quotes and sorts newest first', () => {
    const existing = [makeQuote('a', '2026-01-01T00:00:00.000Z')]
    const imported = [makeQuote('b', '2026-01-02T00:00:00.000Z')]

    const result = mergeQuotes(existing, imported)

    expect(result.quotes.map((quote) => quote.id)).toEqual(['b', 'a'])
    expect(result.addedQuotes.map((quote) => quote.id)).toEqual(['b'])
    expect(result.skipped).toBe(0)
  })

  it('skips quotes that already exist', () => {
    const existing = [makeQuote('a', '2026-01-01T00:00:00.000Z')]
    const imported = [
      makeQuote('a', '2026-01-01T00:00:00.000Z'),
      makeQuote('b', '2026-01-02T00:00:00.000Z'),
    ]

    const result = mergeQuotes(existing, imported)

    expect(result.addedQuotes.map((quote) => quote.id)).toEqual(['b'])
    expect(result.skipped).toBe(1)
  })

  it('deduplicates repeated ids inside the imported file', () => {
    const quote = makeQuote('a', '2026-01-01T00:00:00.000Z')

    const result = mergeQuotes([], [quote, quote])

    expect(result.addedQuotes).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })
})
