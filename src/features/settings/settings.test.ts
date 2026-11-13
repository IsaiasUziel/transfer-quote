import { beforeEach, describe, expect, it } from 'vitest'
import {
  createDefaultSettings,
  loadSettings,
  saveSettings,
} from './settings'

const SETTINGS_KEY = 'elenis-traslados:settings'

describe('settings storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(createDefaultSettings())
  })

  it('round-trips settings through localStorage', () => {
    const settings = {
      baseAddress: 'Base',
      baseCoordinates: { lat: -34.4, lon: -70.8 },
      pricing: {
        tariffPerKm: 500,
        includedKm: 3,
        minimumFare: 600,
        emptySurchargePerKm: 250,
      },
    }

    saveSettings(settings)

    expect(loadSettings()).toEqual(settings)
  })

  it('falls back to defaults on invalid JSON', () => {
    localStorage.setItem(SETTINGS_KEY, 'not-json')

    expect(loadSettings()).toEqual(createDefaultSettings())
  })

  it('falls back to defaults on an unsupported version', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        schemaVersion: 2,
        baseAddress: 'Base',
        baseCoordinates: null,
        pricing: {
          tariffPerKm: 1,
          includedKm: 1,
          minimumFare: 1,
          emptySurchargePerKm: 1,
        },
      }),
    )

    expect(loadSettings()).toEqual(createDefaultSettings())
  })
})
