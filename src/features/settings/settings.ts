import { z } from 'zod'
import { DEFAULT_PRICING } from '../../domain/pricing'
import type { LatLng, PricingConfig } from '../../domain/types'

export interface AppSettings {
  baseAddress: string
  baseCoordinates: LatLng | null
  pricing: PricingConfig
}

// Keep the original namespace to preserve existing browser preferences.
const SETTINGS_KEY = 'elenis-traslados:settings'
const SETTINGS_VERSION = 1

export function createDefaultSettings(): AppSettings {
  return {
    baseAddress: '',
    baseCoordinates: null,
    pricing: { ...DEFAULT_PRICING },
  }
}

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
})

const settingsSchema = z.object({
  schemaVersion: z.literal(SETTINGS_VERSION),
  baseAddress: z.string(),
  baseCoordinates: coordinatesSchema.nullable(),
  pricing: z.object({
    tariffPerKm: z.number().min(0),
    includedKm: z.number().min(0),
    minimumFare: z.number().min(0),
    emptySurchargePerKm: z.number().min(0),
  }),
})

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return createDefaultSettings()

    const parsed = settingsSchema.safeParse(JSON.parse(raw) as unknown)
    if (!parsed.success) return createDefaultSettings()

    return {
      baseAddress: parsed.data.baseAddress,
      baseCoordinates: parsed.data.baseCoordinates,
      pricing: parsed.data.pricing,
    }
  } catch {
    return createDefaultSettings()
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ schemaVersion: SETTINGS_VERSION, ...settings }),
    )
  } catch {
    // Storage can be unavailable, for example in private browsing.
    // The in-memory settings keep working for this session.
  }
}
