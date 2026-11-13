export function roundKm(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10
}
