import { describe, expect, it } from 'vitest'
import type { Quote } from '../../domain/types'
import {
  createExportFile,
  ExportFileError,
  parseExportFile,
  readExportFile,
  serializeExportFile,
} from './export-import'

const quote: Quote = {
  id: 'quote-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  currency: 'CLP',
  baseAddress: 'Base',
  clientAddress: 'Client',
  oneWayKm: 10,
  visits: 2,
  pricing: {
    tariffPerKm: 400,
    includedKm: 2,
    minimumFare: 400,
    emptySurchargePerKm: 200,
  },
  loadedKm: 20,
  emptyKm: 20,
  distanceFare: 7200,
  emptySurcharge: 4000,
  total: 11200,
}

describe('export/import', () => {
  it('creates a versioned export file', () => {
    const file = createExportFile([quote])

    expect(file.schemaVersion).toBe(1)
    expect(file.quotes).toEqual([quote])
    expect(Date.parse(file.exportedAt)).not.toBeNaN()
  })

  it('serializes and parses a valid export file', () => {
    const parsed = parseExportFile(
      JSON.parse(serializeExportFile([quote])) as unknown,
    )

    expect(parsed.quotes).toEqual([quote])
  })

  it('preserves a custom quote label through export and import', () => {
    const namedQuote = { ...quote, label: 'Cumpleaños de Ana' }
    const parsed = parseExportFile(JSON.parse(serializeExportFile([namedQuote])) as unknown)

    expect(parsed.quotes).toEqual([namedQuote])
  })

  it('rejects a label that is not text', () => {
    expect(() => parseExportFile({
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      quotes: [{ ...quote, label: 123 }],
    })).toThrow(ExportFileError)
  })

  it('rejects a file with an unsupported schema version', () => {
    expect(() =>
      parseExportFile({
        schemaVersion: 2,
        exportedAt: '2026-01-01T00:00:00.000Z',
        quotes: [],
      }),
    ).toThrow(ExportFileError)
  })

  it('rejects a quote with an invalid currency', () => {
    expect(() =>
      parseExportFile({
        schemaVersion: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        quotes: [{ ...quote, currency: 'USD' }],
      }),
    ).toThrow(ExportFileError)
  })

  it('rejects a file that is not valid JSON', async () => {
    const file = new File(['not json'], 'quotes.json', {
      type: 'application/json',
    })

    await expect(readExportFile(file)).rejects.toThrow(ExportFileError)
  })
})
