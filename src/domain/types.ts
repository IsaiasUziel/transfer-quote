export type Currency = 'CLP'

export interface LatLng {
  lat: number
  lon: number
}

export type DistanceSource = 'route' | 'manual'

export interface PricingConfig {
  tariffPerKm: number
  includedKm: number
  minimumFare: number
  emptySurchargePerKm: number
}

export interface QuoteInput {
  oneWayKm: number
  visits: number
}

export interface QuoteBreakdown {
  loadedKm: number
  emptyKm: number
  distanceFare: number
  emptySurcharge: number
  total: number
}

export interface Quote extends QuoteBreakdown {
  id: string
  createdAt: string
  currency: Currency
  baseAddress: string
  clientAddress: string
  label?: string
  oneWayKm: number
  visits: number
  pricing: PricingConfig
  baseCoordinates?: LatLng
  clientCoordinates?: LatLng
  distanceSource?: DistanceSource
}
