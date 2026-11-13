import type { LatLng } from '../../domain/types'

export interface GeocodeResult {
  label: string
  coordinates: LatLng
}

export interface SearchGeocoder {
  search(query: string): Promise<GeocodeResult[]>
}

export interface ReverseGeocoder {
  reverse(coordinates: LatLng): Promise<GeocodeResult | null>
}

export interface Geocoder extends SearchGeocoder, ReverseGeocoder {}

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeocodingError'
  }
}
