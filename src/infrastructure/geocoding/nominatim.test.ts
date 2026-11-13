import { describe, expect, it } from 'vitest'
import { parseNominatimReverse } from './nominatim'
import { GeocodingError } from './types'

describe('parseNominatimReverse', () => {
  it('maps a reverse result to a labeled coordinate', () => {
    expect(
      parseNominatimReverse({
        lat: '-34.4064012',
        lon: '-70.8583021',
        display_name: 'Calle Ejemplo 450, Ciudad Ejemplo, Chile',
      }),
    ).toEqual({
      label: 'Calle Ejemplo 450, Ciudad Ejemplo, Chile',
      coordinates: { lat: -34.4064012, lon: -70.8583021 },
    })
  })

  it('returns null when Nominatim cannot resolve the point', () => {
    expect(parseNominatimReverse({ error: 'Unable to geocode' })).toBeNull()
  })

  it('returns null when the label is missing', () => {
    expect(
      parseNominatimReverse({ lat: '-34.4', lon: '-70.8', display_name: '' }),
    ).toBeNull()
  })

  it('throws on a malformed payload', () => {
    expect(() => parseNominatimReverse('nope')).toThrow(GeocodingError)
  })
})
