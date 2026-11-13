import type { LatLng } from '../../domain/types'
import { APP_CONFIG } from '../../config/app'
import { fetchJson } from '../../lib/http'
import { isRecord } from '../../lib/object'
import { createRateLimiter } from '../../lib/rate-limit'
import {
  GeocodingError,
  type GeocodeResult,
  type ReverseGeocoder,
} from './types'

// Nominatim's usage policy allows at most one request per second.
const MIN_REQUEST_INTERVAL_MS = 1100

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function parseNominatimReverse(payload: unknown): GeocodeResult | null {
  if (!isRecord(payload)) {
    throw new GeocodingError('Unexpected reverse geocoding response')
  }

  if (typeof payload.error === 'string') return null

  const label =
    typeof payload.display_name === 'string'
      ? payload.display_name.trim()
      : ''

  const lat = toNumber(payload.lat)
  const lon = toNumber(payload.lon)

  if (!label || lat === null || lon === null) return null

  return { label, coordinates: { lat, lon } }
}

export class NominatimGeocoder implements ReverseGeocoder {
  private readonly limiter = createRateLimiter(MIN_REQUEST_INTERVAL_MS)

  async reverse(coordinates: LatLng): Promise<GeocodeResult | null> {
    if (!APP_CONFIG.reverseGeocodingUrl) return null
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: coordinates.lat.toFixed(6),
      lon: coordinates.lon.toFixed(6),
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'es',
    })

    const separator = APP_CONFIG.reverseGeocodingUrl.includes('?') ? '&' : '?'
    const payload = await this.limiter.schedule(() =>
      fetchJson(`${APP_CONFIG.reverseGeocodingUrl}${separator}${params.toString()}`),
    )

    return parseNominatimReverse(payload)
  }
}
