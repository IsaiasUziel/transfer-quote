import { NominatimGeocoder } from './nominatim'
import { PhotonGeocoder } from './photon'
import type { Geocoder } from './types'
import type { LatLng } from '../../domain/types'

export function createDefaultGeocoder(options: { center?: LatLng } = {}): Geocoder {
  const photon = new PhotonGeocoder(options)
  const nominatim = new NominatimGeocoder()

  return {
    search: (query) => photon.search(query),
    reverse: (coordinates) => nominatim.reverse(coordinates),
  }
}
