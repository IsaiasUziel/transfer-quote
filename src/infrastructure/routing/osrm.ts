import type { LatLng } from '../../domain/types'
import { APP_CONFIG } from '../../config/app'
import { fetchJson } from '../../lib/http'
import { roundKm } from '../../lib/number'
import { isRecord } from '../../lib/object'
import { createRateLimiter } from '../../lib/rate-limit'
import {
  RoutingError,
  type RouteProvider,
  type RouteResult,
} from './types'

export function parseOsrmRoute(payload: unknown): RouteResult {
  if (!isRecord(payload)) {
    throw new RoutingError('Unexpected routing response')
  }

  if (payload.code !== 'Ok') {
    throw new RoutingError('No driving route found between the selected points')
  }

  const routes = payload.routes
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new RoutingError('No driving route found between the selected points')
  }

  const route = routes[0]
  if (!isRecord(route) || typeof route.distance !== 'number') {
    throw new RoutingError('Unexpected routing response')
  }

  if (!Number.isFinite(route.distance) || route.distance < 0) {
    throw new RoutingError('Unexpected routing response')
  }

  const durationMin =
    typeof route.duration === 'number' && Number.isFinite(route.duration)
      ? Math.max(1, Math.round(route.duration / 60))
      : undefined

  return {
    distanceKm: roundKm(route.distance / 1000),
    durationMin,
  }
}

function formatCoordinate(value: number): string {
  return value.toFixed(6)
}

export class OsrmRouteProvider implements RouteProvider {
  private readonly baseUrl: string
  private readonly limiter = createRateLimiter(1100)

  constructor(baseUrl = APP_CONFIG.osrmUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  async getRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
    if (!this.baseUrl) throw new RoutingError('Routing is disabled; enter the distance manually')
    const coordinates = [
      `${formatCoordinate(from.lon)},${formatCoordinate(from.lat)}`,
      `${formatCoordinate(to.lon)},${formatCoordinate(to.lat)}`,
    ].join(';')

    const url = `${this.baseUrl}/${coordinates}?overview=false&alternatives=false&steps=false`
    const payload = await this.limiter.schedule(() => fetchJson(url))

    return parseOsrmRoute(payload)
  }
}
