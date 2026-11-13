import type { LatLng } from '../../domain/types'

export interface RouteResult {
  distanceKm: number
  durationMin?: number
}

export interface RouteProvider {
  getRoute(from: LatLng, to: LatLng): Promise<RouteResult>
}

export class RoutingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoutingError'
  }
}
