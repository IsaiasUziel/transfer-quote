import { z } from 'zod'
import type { Quote } from '../../domain/types'

export const EXPORT_SCHEMA_VERSION = 1

export interface ExportFile {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION
  exportedAt: string
  quotes: Quote[]
}

const pricingSchema = z.object({
  tariffPerKm: z.number().min(0),
  includedKm: z.number().min(0),
  minimumFare: z.number().min(0),
  emptySurchargePerKm: z.number().min(0),
})

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
})

const quoteSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  currency: z.literal('CLP'),
  baseAddress: z.string(),
  clientAddress: z.string(),
  label: z.string().optional(),
  oneWayKm: z.number().min(0),
  visits: z.number().int().min(0),
  pricing: pricingSchema,
  baseCoordinates: coordinatesSchema.optional(),
  clientCoordinates: coordinatesSchema.optional(),
  distanceSource: z.enum(['route', 'manual']).optional(),
  loadedKm: z.number().min(0),
  emptyKm: z.number().min(0),
  distanceFare: z.number().min(0),
  emptySurcharge: z.number().min(0),
  total: z.number().min(0),
})

const exportFileSchema = z.object({
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION),
  exportedAt: z.string().min(1),
  quotes: z.array(quoteSchema),
})

export class ExportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExportFileError'
  }
}

export function createExportFile(quotes: Quote[]): ExportFile {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    quotes,
  }
}

export function serializeExportFile(quotes: Quote[]): string {
  return JSON.stringify(createExportFile(quotes), null, 2)
}

export function parseExportFile(raw: unknown): ExportFile {
  const result = exportFileSchema.safeParse(raw)

  if (!result.success) {
    throw new ExportFileError(
      'El archivo no contiene cotizaciones compatibles.',
    )
  }

  return result.data
}

export function downloadExportFile(quotes: Quote[]): void {
  const blob = new Blob([serializeExportFile(quotes)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)

  anchor.href = url
  anchor.download = `transfer-quotes-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function readExportFile(file: File): Promise<ExportFile> {
  const text = await file.text()

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ExportFileError('El archivo no contiene JSON válido.')
  }

  return parseExportFile(raw)
}
