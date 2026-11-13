import type { LatLng } from '../domain/types'

function text(env: Record<string, unknown>, key: string, fallback: string): string {
  return typeof env[key] === 'string' ? env[key].trim() : fallback
}

function coordinate(env: Record<string, unknown>, key: string, fallback: number, limit: number): number {
  const raw = text(env, key, '')
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || Math.abs(value) > limit) throw new Error(`Invalid ${key}`)
  return value
}

export function createAppConfig(env: Record<string, unknown>) {
  const countryCode = text(env, 'VITE_GEOCODING_COUNTRY', 'CL').toUpperCase()
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error('VITE_GEOCODING_COUNTRY must be a two-letter country code or empty')
  }
  const mapCenter: LatLng = {
    lat: coordinate(env, 'VITE_MAP_LATITUDE', -33.4489, 90),
    lon: coordinate(env, 'VITE_MAP_LONGITUDE', -70.6693, 180),
  }

  return {
    name: text(env, 'VITE_APP_NAME', 'Cotizador de traslados') || 'Cotizador de traslados',
    countryCode,
    mapCenter,
    photonUrl: text(env, 'VITE_PHOTON_URL', 'https://photon.komoot.io/api/'),
    reverseGeocodingUrl: text(env, 'VITE_REVERSE_GEOCODING_URL', ''),
    osrmUrl: text(env, 'VITE_OSRM_URL', 'https://router.project-osrm.org/route/v1/driving').replace(/\/+$/, ''),
    tileUrl: text(env, 'VITE_TILE_URL', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
    tileAttribution: text(env, 'VITE_TILE_ATTRIBUTION', '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'),
  }
}

export const APP_CONFIG = createAppConfig(import.meta.env)
