import { afterEach, describe, expect, it, vi } from 'vitest'
import { OsrmRouteProvider, parseOsrmRoute } from './osrm'
import { RoutingError } from './types'

describe('parseOsrmRoute', () => {
  it('converts meters to kilometers rounded to one decimal', () => {
    expect(
      parseOsrmRoute({
        code: 'Ok',
        routes: [{ distance: 12_345.6, duration: 600 }],
      }),
    ).toEqual({ distanceKm: 12.3, durationMin: 10 })
  })

  it('throws when no route is found', () => {
    expect(() => parseOsrmRoute({ code: 'NoRoute', routes: [] })).toThrow(
      RoutingError,
    )
  })

  it('throws on a malformed payload', () => {
    expect(() => parseOsrmRoute({ code: 'Ok' })).toThrow(RoutingError)
    expect(() => parseOsrmRoute(null)).toThrow(RoutingError)
  })

  it('omits the duration when it is missing', () => {
    expect(
      parseOsrmRoute({ code: 'Ok', routes: [{ distance: 500 }] }),
    ).toEqual({ distanceKm: 0.5, durationMin: undefined })
  })
})

describe('OsrmRouteProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the route with longitude before latitude', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [{ distance: 5000, duration: 300 }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OsrmRouteProvider('https://example.test/route')
    const result = await provider.getRoute(
      { lat: -34.4, lon: -70.8 },
      { lat: -33.4, lon: -70.6 },
    )

    expect(result.distanceKm).toBe(5)
    expect(result.durationMin).toBe(5)

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/-70.800000,-34.400000;-70.600000,-33.400000')
  })
})
