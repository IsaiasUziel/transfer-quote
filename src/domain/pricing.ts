import { roundKm } from '../lib/number'
import type { PricingConfig, QuoteBreakdown, QuoteInput } from './types'

export const DEFAULT_PRICING: PricingConfig = {
  tariffPerKm: 400,
  includedKm: 2,
  minimumFare: 400,
  emptySurchargePerKm: 200,
}

export function calculateQuote(
  input: QuoteInput,
  pricing: PricingConfig,
): QuoteBreakdown {
  const rawOneWayKm = Number.isFinite(input.oneWayKm)
    ? Math.max(0, input.oneWayKm)
    : 0
  const visits = Number.isFinite(input.visits)
    ? Math.max(0, Math.floor(input.visits))
    : 0

  const oneWayKm = roundKm(rawOneWayKm)
  const loadedKm = roundKm(oneWayKm * visits)
  const emptyKm = roundKm(oneWayKm * visits)

  const billableKm = Math.max(0, loadedKm - pricing.includedKm)
  const distanceFare = billableKm * pricing.tariffPerKm
  const emptySurcharge = emptyKm * pricing.emptySurchargePerKm
  const total = Math.max(
    pricing.minimumFare,
    Math.round(distanceFare + emptySurcharge),
  )

  return {
    loadedKm,
    emptyKm,
    distanceFare: Math.round(distanceFare),
    emptySurcharge: Math.round(emptySurcharge),
    total,
  }
}
