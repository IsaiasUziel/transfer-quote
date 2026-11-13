import type { LatLng } from '../../domain/types'
import { DEFAULT_MAP_CENTER } from '../../lib/geo'
import { APP_CONFIG } from '../../config/app'
import { fetchJson } from '../../lib/http'
import { isRecord } from '../../lib/object'
import {
  GeocodingError,
  type GeocodeResult,
  type SearchGeocoder,
} from './types'

const MAX_RESULTS = 5

function propertyString(
  properties: Record<string, unknown>,
  key: string,
): string | null {
  const value = properties[key]
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : null
}

function joinStreet(street: string | null, housenumber: string | null): string | null {
  if (!street) return housenumber
  return housenumber ? `${street} ${housenumber}` : street
}

export function formatPhotonLabel(properties: Record<string, unknown>): string {
  const name = propertyString(properties, 'name')
  const street = joinStreet(
    propertyString(properties, 'street'),
    propertyString(properties, 'housenumber'),
  )

  // Photon often repeats the street as the feature name.
  const nameIsStreet =
    name !== null &&
    street !== null &&
    (street.toLowerCase() === name.toLowerCase() ||
      street.toLowerCase().startsWith(`${name.toLowerCase()} `))

  const locality =
    propertyString(properties, 'city') ??
    propertyString(properties, 'district') ??
    propertyString(properties, 'county')
  const region = propertyString(properties, 'state')

  const seen = new Set<string>()
  const parts: string[] = []

  for (const value of [nameIsStreet ? null : name, street, locality, region]) {
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    parts.push(value)
  }

  return parts.join(', ')
}

function parsePhotonFeature(
  feature: unknown,
  fallbackLabel: string,
): GeocodeResult | null {
  if (!isRecord(feature)) return null

  const geometry = feature.geometry
  const properties = feature.properties
  if (!isRecord(geometry) || !isRecord(properties)) return null

  const coordinates = geometry.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null

  const [lon, lat] = coordinates
  if (typeof lon !== 'number' || typeof lat !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const label =
    formatPhotonLabel(properties) ||
    propertyString(properties, 'name') ||
    fallbackLabel

  return { label, coordinates: { lat, lon } }
}

export function parsePhotonResults(
  payload: unknown,
  fallbackLabel = '',
): GeocodeResult[] {
  if (!isRecord(payload)) {
    throw new GeocodingError('Unexpected geocoding response')
  }

  const features = payload.features
  if (!Array.isArray(features)) {
    throw new GeocodingError('Unexpected geocoding response')
  }

  const results: GeocodeResult[] = []
  const seen = new Set<string>()

  for (const feature of features) {
    const result = parsePhotonFeature(feature, fallbackLabel)
    if (!result || result.label === '') continue

    const key = result.label.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    results.push(result)

    if (results.length === MAX_RESULTS) break
  }

  return results
}

interface PhotonGeocoderOptions {
  center?: LatLng
}

export class PhotonGeocoder implements SearchGeocoder {
  private readonly center: LatLng

  constructor(options: PhotonGeocoderOptions = {}) {
    this.center = options.center ?? DEFAULT_MAP_CENTER
  }

  async search(query: string): Promise<GeocodeResult[]> {
    const trimmed = query.trim()
    if (trimmed.length < 3 || !APP_CONFIG.photonUrl) return []

    const params = new URLSearchParams({
      q: trimmed,
      limit: String(MAX_RESULTS),
      lang: 'default',
      lat: String(this.center.lat),
      lon: String(this.center.lon),
    })
    if (APP_CONFIG.countryCode) params.set('countrycode', APP_CONFIG.countryCode)

    const separator = APP_CONFIG.photonUrl.includes('?') ? '&' : '?'
    const payload = await fetchJson(`${APP_CONFIG.photonUrl}${separator}${params.toString()}`)
    return parsePhotonResults(payload, trimmed)
  }
}
