import type { LatLng } from '../domain/types'

const DMS_PATTERN = /^(\d{1,2})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:[.,]\d+)?)\s*"\s*([NS])\s*[,;]?\s*(\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:[.,]\d+)?)\s*"\s*([EWO])$/
const DECIMAL_PATTERN = /^([+-]?\d+(?:\.\d+)?)\s*(?:,|;|\s)\s*([+-]?\d+(?:\.\d+)?)$/

function fromDms(degrees: string, minutes: string, seconds: string, hemisphere: string): number | null {
  const minutesValue = Number(minutes)
  const secondsValue = Number(seconds.replace(',', '.'))
  if (minutesValue >= 60 || secondsValue >= 60) return null

  const magnitude = Number(degrees) + minutesValue / 60 + secondsValue / 3600
  return 'SWO'.includes(hemisphere) ? -magnitude : magnitude
}

function validatedCoordinates(lat: number, lon: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}

export function parseCoordinates(input: string): LatLng | null {
  const normalized = input.trim().toUpperCase()
    .replace(/º/g, '°')
    .replace(/[′’‘]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/−/g, '-')

  const dms = normalized.match(DMS_PATTERN)
  if (dms) {
    const lat = fromDms(dms[1], dms[2], dms[3], dms[4])
    const lon = fromDms(dms[5], dms[6], dms[7], dms[8])
    return lat === null || lon === null ? null : validatedCoordinates(lat, lon)
  }

  const decimal = normalized.match(DECIMAL_PATTERN)
  return decimal ? validatedCoordinates(Number(decimal[1]), Number(decimal[2])) : null
}
