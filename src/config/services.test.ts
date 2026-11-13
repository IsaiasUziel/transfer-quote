import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('configured service requests', () => {
  it.each(['US', ''])('uses the configured search service and country %j with the current base bias', async (country) => {
    vi.resetModules()
    vi.stubEnv('VITE_PHOTON_URL', 'https://maps.example/search')
    vi.stubEnv('VITE_GEOCODING_COUNTRY', country)
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ features: [] })))
    vi.stubGlobal('fetch', fetchMock)
    const { createDefaultGeocoder } = await import('../infrastructure/geocoding/default-geocoder')
    await createDefaultGeocoder({ center: { lat: 13, lon: 46 } }).search('Example Street')

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.origin + url.pathname).toBe('https://maps.example/search')
    expect(url.searchParams.get('lat')).toBe('13')
    expect(url.searchParams.get('lon')).toBe('46')
    expect(url.searchParams.get('lang')).toBe('default')
    expect(url.searchParams.get('countrycode')).toBe(country || null)
  })

  it('does not contact a reverse-geocoding service unless one is configured', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_REVERSE_GEOCODING_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { createDefaultGeocoder } = await import('../infrastructure/geocoding/default-geocoder')

    expect(await createDefaultGeocoder().reverse({ lat: 12, lon: 45 })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses an explicitly configured reverse-geocoding service', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_REVERSE_GEOCODING_URL', 'https://maps.example/reverse')
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({
      display_name: 'Example destination', lat: '12', lon: '45',
    })))
    vi.stubGlobal('fetch', fetchMock)
    const { createDefaultGeocoder } = await import('../infrastructure/geocoding/default-geocoder')

    expect(await createDefaultGeocoder().reverse({ lat: 12, lon: 45 })).toMatchObject({ label: 'Example destination' })
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.origin + url.pathname).toBe('https://maps.example/reverse')
    expect(url.searchParams.get('lat')).toBe('12.000000')
  })

  it('routes through the configured OSRM-compatible service', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_OSRM_URL', 'https://routes.example/route/v1/driving/')
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({
      code: 'Ok', routes: [{ distance: 1000, duration: 60 }],
    })))
    vi.stubGlobal('fetch', fetchMock)
    const { OsrmRouteProvider } = await import('../infrastructure/routing/osrm')

    expect(await new OsrmRouteProvider().getRoute({ lat: 12, lon: 45 }, { lat: 13, lon: 46 })).toMatchObject({ distanceKm: 1 })
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('https://routes.example/route/v1/driving/45.000000,12.000000;46.000000,13.000000')
  })
})
