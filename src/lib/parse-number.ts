export function parseNumberInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
