import type { DistanceSource, QuoteBreakdown } from '../../domain/types'
import { formatCurrency, formatKm } from '../../lib/format'

interface QuoteResultProps {
  breakdown: QuoteBreakdown
  oneWayKm: number
  visits: number
  includedKm: number
  minimumFareApplied: boolean
  baseAddress: string
  clientAddress: string
  distanceSource: DistanceSource
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="result-row"><dt>{label}</dt><dd>{value}</dd></div>
}

export function QuoteResult({ breakdown, oneWayKm, visits, includedKm, minimumFareApplied, baseAddress, clientAddress, distanceSource }: QuoteResultProps) {
  return (
    <section className="quote-result">
      <div className="result-total" role="status" aria-live="polite" aria-atomic="true">
        <h3>Total del traslado</h3>
        <p className="total-amount">{formatCurrency(breakdown.total)} <span>CLP</span></p>
        <p>{formatKm(oneWayKm)} de ida · {visits} {visits === 1 ? 'visita' : 'visitas'}</p>
      </div>
      <div className="result-detail">
        <dl className="route-context">
          <div><dt>Desde</dt><dd>{baseAddress.trim() || 'Base sin configurar'}</dd></div>
          <div><dt>Hasta</dt><dd>{clientAddress.trim() || 'Cliente por definir'}</dd></div>
        </dl>
        <p className="distance-source">{distanceSource === 'route' ? 'Distancia calculada por ruta' : 'Distancia ingresada manualmente'}</p>
        <h4>Desglose de la cotización</h4>
        <dl>
          <Row label="Distancia de ida" value={formatKm(oneWayKm)} />
          <Row label="Visitas" value={String(visits)} />
          <Row label="Total aproximado de kms" value={formatKm(oneWayKm * 2 * visits)} />
          <Row label="Km de ida" value={formatKm(breakdown.loadedKm)} />
          <Row label="Km de retorno" value={formatKm(breakdown.emptyKm)} />
        </dl>
        <dl className="result-charges">
          <Row label="Km incluidos" value={formatKm(includedKm)} />
          <Row label="Km de ida cobrables" value={formatKm(Math.max(0, breakdown.loadedKm - includedKm))} />
          <Row label="Tarifa por distancia" value={formatCurrency(breakdown.distanceFare)} />
          <Row label="Tarifa por retorno" value={formatCurrency(breakdown.emptySurcharge)} />
        </dl>
        {minimumFareApplied ? (
          <p className="minimum-note">Se aplicó la tarifa mínima porque el cálculo por distancia y recargo era menor.</p>
        ) : null}
      </div>
    </section>
  )
}
