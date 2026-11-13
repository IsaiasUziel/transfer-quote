import { describe, expect, it } from 'vitest'
import { formatPhotonLabel, parsePhotonResults } from './photon'
import { GeocodingError } from './types'

const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-70.8583, -34.4064] },
  properties: {
    name: 'Calle Ejemplo',
    street: 'Calle Ejemplo',
    housenumber: '450',
    city: 'Ciudad Ejemplo',
    state: "Región Ejemplo",
    country: 'Chile',
  },
}

describe('formatPhotonLabel', () => {
  it('joins name, street, locality and region without duplicates', () => {
    expect(formatPhotonLabel(feature.properties)).toBe(
      "Calle Ejemplo 450, Ciudad Ejemplo, Región Ejemplo",
    )
  })

  it('falls back to the city when there is no street', () => {
    expect(
      formatPhotonLabel({ name: 'Ciudad Ejemplo', city: 'Ciudad Ejemplo', state: "Región Ejemplo" }),
    ).toBe("Ciudad Ejemplo, Región Ejemplo")
  })
})

describe('parsePhotonResults', () => {
  it('maps features to labeled coordinates', () => {
    expect(parsePhotonResults({ features: [feature] })).toEqual([
      {
        label:
          "Calle Ejemplo 450, Ciudad Ejemplo, Región Ejemplo",
        coordinates: { lat: -34.4064, lon: -70.8583 },
      },
    ])
  })

  it('skips features without coordinates', () => {
    const broken = {
      ...feature,
      geometry: { type: 'Point', coordinates: [] },
    }

    expect(parsePhotonResults({ features: [broken] })).toEqual([])
  })

  it('deduplicates results by label', () => {
    expect(parsePhotonResults({ features: [feature, feature] })).toHaveLength(1)
  })

  it('uses the fallback label when properties are empty', () => {
    const empty = {
      ...feature,
      properties: {},
    }

    expect(parsePhotonResults({ features: [empty] }, 'Ciudad Ejemplo')[0]?.label).toBe(
      'Ciudad Ejemplo',
    )
  })

  it('throws on a malformed payload', () => {
    expect(() => parsePhotonResults({})).toThrow(GeocodingError)
  })
})
