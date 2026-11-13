import { describe, expect, it } from 'vitest'
import { createAppConfig } from './app'

describe('deployment defaults', () => {
  it('uses a neutral name and requires an explicit reverse-geocoding endpoint', () => {
    const config = createAppConfig({})
    expect(config.name).toBe('Cotizador de traslados')
    expect(config.reverseGeocodingUrl).toBe('')
    expect(config.countryCode).toBe('CL')
  })

  it('accepts a deployment name, region and service endpoints', () => {
    const config = createAppConfig({
      VITE_APP_NAME: '  Field Visits  ',
      VITE_GEOCODING_COUNTRY: 'us',
      VITE_MAP_LATITUDE: '12.5',
      VITE_MAP_LONGITUDE: '45.25',
      VITE_PHOTON_URL: 'https://maps.example/search',
      VITE_REVERSE_GEOCODING_URL: 'https://maps.example/reverse',
      VITE_OSRM_URL: 'https://maps.example/route/v1/driving/',
      VITE_TILE_URL: 'https://maps.example/tiles/{z}/{x}/{y}.png',
      VITE_TILE_ATTRIBUTION: 'Example map provider',
    })
    expect(config).toMatchObject({
      name: 'Field Visits', countryCode: 'US', mapCenter: { lat: 12.5, lon: 45.25 },
      photonUrl: 'https://maps.example/search',
      reverseGeocodingUrl: 'https://maps.example/reverse',
      osrmUrl: 'https://maps.example/route/v1/driving',
      tileUrl: 'https://maps.example/tiles/{z}/{x}/{y}.png',
      tileAttribution: 'Example map provider',
    })
  })

  it('allows worldwide search and disabled network services', () => {
    expect(createAppConfig({
      VITE_GEOCODING_COUNTRY: '', VITE_PHOTON_URL: '', VITE_OSRM_URL: '',
    })).toMatchObject({ countryCode: '', photonUrl: '', osrmUrl: '' })
  })

  it.each([
    { VITE_MAP_LATITUDE: '91' }, { VITE_MAP_LONGITUDE: '-181' },
    { VITE_MAP_LATITUDE: 'not a number' }, { VITE_GEOCODING_COUNTRY: 'Chile' },
  ])('rejects invalid geographic defaults: %j', (env) => {
    expect(() => createAppConfig(env)).toThrow()
  })
})
