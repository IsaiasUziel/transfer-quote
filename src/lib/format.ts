const currencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const kmFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(Math.round(value))
}

export function formatKmNumber(value: number): string {
  return kmFormatter.format(value)
}

export function formatKm(value: number): string {
  return `${kmFormatter.format(value)} km`
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return dateTimeFormatter.format(date)
}
