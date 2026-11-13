import { describe, expect, it } from 'vitest'
import { parseCoordinates } from './coordinates'

describe('parseCoordinates', () => {
  it.each([
    `12°30'0"S 45°15'0"W`,
    '12º 30′ 0″ s, 45º 15′ 0″ o',
    '-12.5, -45.25',
    '−12.5; −45.25',
    '  -12.5   -45.25  ',
  ])('converts latitude and longitude from %s', (input) => {
    const coordinates = parseCoordinates(input)
    expect(coordinates?.lat).toBeCloseTo(-12.5, 8)
    expect(coordinates?.lon).toBeCloseTo(-45.25, 8)
  })

  it('keeps north and east positive', () => {
    expect(parseCoordinates(`34°30'0"N 71°15'0"E`)).toEqual({ lat: 34.5, lon: 71.25 })
  })

  it.each(['90, 180', `90°0'0"N 180°0'0"E`])('accepts the valid boundary %s', (input) => {
    expect(parseCoordinates(input)).toEqual({ lat: 90, lon: 180 })
  })

  it.each([
    '', 'Ejemplo 123 Ciudad Ejemplo', 'NaN, 71', '34, Infinity',
    '91, 71', '-34, -181', '34, 71, 12', '34.3,',
    `34°60'0"S 71°0'0"W`,
    `34°0'60"S 71°0'0"W`,
    `90°0'0.1"S 71°0'0"W`,
    `34°0'0"S 180°0'0.1"W`,
    `-34°18'16.5"N 71°0'0"W`,
    `34°18'16.5"E 71°0'0"N`,
    `34°18'16.5"S 71°00'25.1"`,
  ])('rejects incomplete, invalid or non-coordinate input: %s', (input) => {
    expect(parseCoordinates(input)).toBeNull()
  })
})
