import { describe, expect, it } from 'vitest'
import { calculateQuote, DEFAULT_PRICING } from './pricing'

describe('calculateQuote', () => {
  it('calculates the two-visit round-trip example', () => {
    expect(
      calculateQuote({ oneWayKm: 10, visits: 2 }, DEFAULT_PRICING),
    ).toEqual({
      loadedKm: 20,
      emptyKm: 20,
      distanceFare: 7200,
      emptySurcharge: 4000,
      total: 11200,
    })
  })

  it('scales with the number of visits', () => {
    expect(
      calculateQuote({ oneWayKm: 10, visits: 4 }, DEFAULT_PRICING).total,
    ).toBe(23200)
  })

  it('applies the minimum fare on very short trips', () => {
    expect(
      calculateQuote({ oneWayKm: 0.5, visits: 1 }, DEFAULT_PRICING).total,
    ).toBe(400)
  })

  it('supports a disabled distance tariff', () => {
    expect(
      calculateQuote(
        { oneWayKm: 10, visits: 2 },
        { ...DEFAULT_PRICING, tariffPerKm: 0 },
      ).total,
    ).toBe(4000)
  })

  it('rounds route distance to one decimal', () => {
    expect(
      calculateQuote({ oneWayKm: 10.04, visits: 1 }, DEFAULT_PRICING).loadedKm,
    ).toBe(10)
  })

  it('returns the minimum fare for zero distance and zero visits', () => {
    expect(
      calculateQuote({ oneWayKm: 0, visits: 0 }, DEFAULT_PRICING).total,
    ).toBe(400)
  })
})
