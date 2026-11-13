import { useRef, useState, type ChangeEvent } from 'react'
import type { Quote } from '../../domain/types'
import { downloadExportFile, readExportFile } from '../../infrastructure/storage/export-import'
import { formatCurrency, formatDateTime, formatKm } from '../../lib/format'

interface HistoryListProps {
  quotes: Quote[]
  loading: boolean
  loadError: string | null
  onDelete: (id: string) => Promise<void> | void
  onClear: () => Promise<void> | void
  onImport: (
    quotes: Quote[],
  ) => Promise<{ added: number; skipped: number }> | { added: number; skipped: number }
}

function getQuoteTitle(quote: Quote): string {
  return quote.label?.trim() || quote.clientAddress || 'Cliente sin dirección'
}

export function HistoryList({
  quotes,
  loading,
  loadError,
  onDelete,
  onClear,
  onImport,
}: HistoryListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    setImportMessage(null)
    setImportError(null)

    try {
      const result = await readExportFile(file)
      const counts = await onImport(result.quotes)

      if (counts.added === 0 && counts.skipped === 0) {
        setImportMessage('El archivo no contiene cotizaciones.')
      } else if (counts.added === 0) {
        setImportMessage(
          `No se agregaron cotizaciones nuevas. ${counts.skipped} ya existían.`,
        )
      } else {
        const skippedSuffix =
          counts.skipped > 0
            ? ` ${counts.skipped} ya existían y se omitieron.`
            : ''
        setImportMessage(
          `${counts.added} cotizaciones importadas.${skippedSuffix}`,
        )
      }
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'No se pudo importar el archivo.',
      )
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete(quote: Quote) {
    const confirmed = window.confirm(
      `¿Eliminar la cotización de ${getQuoteTitle(quote)}?`,
    )
    if (!confirmed) return
    await onDelete(quote.id)
  }

  async function handleClear() {
    const confirmed = window.confirm(
      '¿Borrar todo el historial? Esta acción no se puede deshacer.',
    )
    if (!confirmed) return
    await onClear()
  }

  return (
    <div className="history-page space-y-6">
      <div className="page-heading">
        <div><h2>Historial de cotizaciones</h2><p>Consulta tus traslados guardados y conserva una copia de respaldo.</p></div>
        {!loading && !loadError ? <span className="context-label">{quotes.length} {quotes.length === 1 ? 'cotización' : 'cotizaciones'}</span> : null}
      </div>
      <section className="history-toolbar">
        <button
          type="button"
          onClick={() => downloadExportFile(quotes)}
          disabled={quotes.length === 0}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          Exportar JSON
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importing ? 'Importando…' : 'Importar JSON'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleClear}
          disabled={quotes.length === 0}
          className="ml-auto rounded-lg border border-danger-line px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Borrar historial
        </button>
      </section>

      {importMessage ? (
        <p role="status" className="feedback feedback-success">
          {importMessage}
        </p>
      ) : null}

      {importError ? (
        <p role="alert" className="feedback feedback-error">
          {importError}
        </p>
      ) : null}

      {loadError ? (
        <p role="alert" className="feedback feedback-error">
          {loadError}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="feedback">Cargando historial…</p>
      ) : null}

      {!loading && !loadError && quotes.length === 0 ? (
        <section className="history-empty">
          <span className="empty-symbol" aria-hidden="true">↗</span>
          <h3>Todavía no hay cotizaciones guardadas.</h3>
          <p>En Cotizar, completa un traslado y guarda su cotización para encontrarla aquí.</p>
          <p className="text-sm">Si tienes un respaldo, puedes recuperarlo con Importar JSON.</p>
        </section>
      ) : null}

      <ul className="space-y-3">
        {quotes.map((quote) => (
          <li
            key={quote.id}
            className="history-item"
          >
            <div className="history-item-heading">
              <div className="min-w-0 space-y-1">
                <h3 className="break-words text-base font-semibold text-heading">
                  {getQuoteTitle(quote)}
                </h3>
                {quote.label?.trim() ? (
                  <p className="break-words text-sm text-muted">{quote.clientAddress}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {formatDateTime(quote.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-accent">
                  {formatCurrency(quote.total)}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(quote)}
                  aria-label={`Eliminar cotización: ${getQuoteTitle(quote)}`}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <dl className="history-facts">
              <div>
                <dt className="font-medium text-muted">Ida</dt>
                <dd className="tabular-nums">{formatKm(quote.oneWayKm)}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Visitas</dt>
                <dd className="tabular-nums">{quote.visits}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Km de ida</dt>
                <dd className="tabular-nums">{formatKm(quote.loadedKm)}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted">Km de retorno</dt>
                <dd className="tabular-nums">{formatKm(quote.emptyKm)}</dd>
              </div>
            </dl>

            <details className="history-details">
              <summary className="cursor-pointer select-none font-medium text-muted">
                Desglose y tarifas
              </summary>
              <ul className="mt-2 space-y-1">
                <li>
                  Total aproximado de kms (ida y vuelta):{' '}
                  {formatKm(quote.oneWayKm * 2 * quote.visits)}
                </li>
                <li>Km incluidos: {formatKm(quote.pricing.includedKm)}</li>
                <li>
                  Km de ida cobrables:{' '}
                  {formatKm(Math.max(0, quote.loadedKm - quote.pricing.includedKm))}
                </li>
                <li>
                  Tarifa por distancia:{' '}
                  {formatCurrency(quote.distanceFare)}
                </li>
                <li>
                  Tarifa por retorno:{' '}
                  {formatCurrency(quote.emptySurcharge)}
                </li>
                <li>
                  Tarifas usadas: mínima{' '}
                  {formatCurrency(quote.pricing.minimumFare)}, por km{' '}
                  {formatCurrency(quote.pricing.tariffPerKm)}, incluidos{' '}
                  {formatKm(quote.pricing.includedKm)}, retorno{' '}
                  {formatCurrency(quote.pricing.emptySurchargePerKm)}/km.
                </li>
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}
