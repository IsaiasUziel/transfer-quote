import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { LocationPicker, type LocationValue } from '../../components/LocationPicker'
import { calculateQuote } from '../../domain/pricing'
import type { DistanceSource, Quote } from '../../domain/types'
import { OsrmRouteProvider } from '../../infrastructure/routing/osrm'
import { formatCurrency, formatKm, formatKmNumber } from '../../lib/format'
import { createId } from '../../lib/id'
import { parseNumberInput } from '../../lib/parse-number'
import { roundKm } from '../../lib/number'
import type { AppSettings } from '../settings/settings'
import { QuoteResult } from './QuoteResult'

interface QuoteFormProps {
  settings: AppSettings
  onSaveQuote: (quote: Quote) => Promise<void>
  onGoToSettings: () => void
}

type RouteStatus = 'idle' | 'loading' | 'error'

const ROUTE_DEBOUNCE_MS = 600

export function QuoteForm({
  settings,
  onSaveQuote,
  onGoToSettings,
}: QuoteFormProps) {
  const routeProvider = useMemo(() => new OsrmRouteProvider(), [])
  const [quoteLabel, setQuoteLabel] = useState('')
  const [client, setClient] = useState<LocationValue>({
    address: '',
    coordinates: null,
  })
  const [distanceKm, setDistanceKm] = useState('')
  const [distanceSource, setDistanceSource] =
    useState<DistanceSource>('manual')
  const routeRequestId = useRef(0)
  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle')
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null)
  const [recalculateToken, setRecalculateToken] = useState(0)
  const [visitsRaw, setVisitsRaw] = useState('1')
  const [formError, setFormError] = useState<string | null>(null)
  const [validationAttempt, setValidationAttempt] = useState(0)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const baseCoordinates = settings.baseCoordinates
  const clientCoordinates = client.coordinates

  const clearAutomaticDistance = useEffectEvent(() => {
    if (distanceSource === 'route') setDistanceKm('')
    setDistanceSource('manual')
  })

  useEffect(() => {
    const requestId = ++routeRequestId.current
    if (!baseCoordinates || !clientCoordinates) {
      setRouteStatus('idle')
      setRouteDurationMin(null)
      setRouteError(null)
      clearAutomaticDistance()
      return
    }

    let cancelled = false
    clearAutomaticDistance()
    setRouteStatus('loading')
    setRouteError(null)
    setRouteDurationMin(null)

    const timeout = setTimeout(() => {
      if (requestId !== routeRequestId.current) return
      routeProvider
        .getRoute(baseCoordinates, clientCoordinates)
        .then((result) => {
          if (cancelled || requestId !== routeRequestId.current) return
          setDistanceKm(formatKmNumber(result.distanceKm))
          setDistanceSource('route')
          setRouteDurationMin(result.durationMin ?? null)
          setRouteStatus('idle')
        })
        .catch(() => {
          if (cancelled || requestId !== routeRequestId.current) return
          setRouteStatus('error')
          setRouteError(
            'No pudimos calcular la ruta. Ingresa la distancia a mano.',
          )
        })
    }, ROUTE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [
    baseCoordinates,
    clientCoordinates,
    recalculateToken,
    routeProvider,
  ])

  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => setSuccess(null), 5000)
    return () => clearTimeout(timeout)
  }, [success])

  const parsedDistance = parseNumberInput(distanceKm)
  const oneWayKm =
    parsedDistance !== null && parsedDistance > 0 ? roundKm(parsedDistance) : 0

  const parsedVisits = Number.parseInt(visitsRaw, 10)
  const visits =
    Number.isFinite(parsedVisits) && parsedVisits > 0
      ? Math.min(parsedVisits, 99)
      : 1

  const fieldErrors = {
    base: validationAttempt > 0 && !settings.baseAddress.trim() ? 'Configura tu base antes de guardar una cotización.' : '',
    client: validationAttempt > 0 && !client.address.trim() ? 'Ingresa o marca la dirección del cliente.' : '',
    distance: validationAttempt > 0 && oneWayKm <= 0 ? 'Ingresa una distancia de ida mayor a 0.' : '',
  }
  const hasFieldErrors = Boolean(fieldErrors.base || fieldErrors.client || fieldErrors.distance)

  useEffect(() => {
    if (validationAttempt > 0) errorSummaryRef.current?.focus()
  }, [validationAttempt])

  const breakdown = calculateQuote({ oneWayKm, visits }, settings.pricing)
  const minimumFareApplied =
    breakdown.total === settings.pricing.minimumFare &&
    breakdown.distanceFare + breakdown.emptySurcharge <
      settings.pricing.minimumFare

  function updateVisits(next: number) {
    setVisitsRaw(String(Math.min(99, Math.max(1, next))))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || routeStatus === 'loading') return
    setFormError(null)
    setSuccess(null)

    if (!settings.baseAddress.trim() || oneWayKm <= 0 || !client.address.trim()) {
      setValidationAttempt((attempt) => attempt + 1)
      return
    }

    setSaving(true)

    try {
      const label = quoteLabel.trim()
      await onSaveQuote({
        id: createId(),
        createdAt: new Date().toISOString(),
        currency: 'CLP',
        baseAddress: settings.baseAddress,
        clientAddress: client.address.trim(),
        ...(label ? { label } : {}),
        oneWayKm,
        visits,
        pricing: { ...settings.pricing },
        baseCoordinates: settings.baseCoordinates ?? undefined,
        clientCoordinates: client.coordinates ?? undefined,
        distanceSource,
        ...breakdown,
      })

      setSuccess('Cotización guardada en el historial.')
      setValidationAttempt(0)
      setClient({ address: '', coordinates: null })
      setQuoteLabel('')
      setVisitsRaw('1')
      setDistanceKm('')
      setDistanceSource('manual')
      setRouteStatus('idle')
      setRouteError(null)
      setRouteDurationMin(null)
    } catch {
      setFormError('No se pudo guardar la cotización en este navegador.')
    } finally {
      setSaving(false)
    }
  }

  const tariffLabel =
    settings.pricing.tariffPerKm === 0
      ? 'sin cobro por distancia'
      : `${formatCurrency(settings.pricing.tariffPerKm)}/km sobre ${formatKm(settings.pricing.includedKm)}`

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div><h2>Nueva cotización</h2><p>Calcula el costo de tus recorridos, desde la base hasta el destino.</p></div>
        <span className="context-label">Traslados · CLP</span>
      </div>
      <section className={`base-strip ${settings.baseAddress.trim() ? '' : 'base-strip-pending'}`}>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Punto de partida
          </p>
          <p className="break-words text-sm font-semibold text-heading">
            {settings.baseAddress.trim() || 'Configura tu base para comenzar'}
          </p>
          {settings.baseCoordinates ? (
            <p className="text-xs text-muted">Pin listo para calcular rutas.</p>
          ) : (
            <p className="text-xs text-warning">
              Agrega un pin para calcular rutas o ingresa la distancia a mano.
            </p>
          )}
        </div>

        <button
          type="button"
          id="configure-base"
          onClick={onGoToSettings}
          className="shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-subtle"
        >
          {settings.baseAddress.trim() ? 'Editar base' : 'Configurar base'}
        </button>
      </section>

      <form onSubmit={handleSubmit} className="quote-layout" noValidate>
        {hasFieldErrors ? (
          <div ref={errorSummaryRef} tabIndex={-1} role="alert" aria-labelledby="quote-errors-title" className="error-summary">
            <h3 id="quote-errors-title">Revisa los datos del traslado</h3>
            <ul>
              {fieldErrors.base ? <li><a href="#configure-base" onClick={() => document.getElementById('configure-base')?.focus()}>{fieldErrors.base}</a></li> : null}
              {fieldErrors.client ? <li><a href="#client-location" onClick={() => document.getElementById('client-location')?.focus()}>{fieldErrors.client}</a></li> : null}
              {fieldErrors.distance ? <li><a href="#distance-km" onClick={() => document.getElementById('distance-km')?.focus()}>{fieldErrors.distance}</a></li> : null}
            </ul>
          </div>
        ) : null}
        <div className="quote-fields">
          <section className="panel space-y-5">
            <div>
              <h3 className="text-base font-semibold text-heading">
                Destino del traslado
              </h3>
              <p className="text-sm text-muted">
                Dirección, referencia o coordenadas del destino de cada visita.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="quote-label" className="block text-sm font-medium text-ink">
                Nombre de la cotización (opcional)
              </label>
              <input
                id="quote-label"
                type="text"
                value={quoteLabel}
                onChange={(event) => setQuoteLabel(event.target.value)}
                placeholder="Ej: Visita al cliente"
                aria-describedby="quote-label-hint"
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              <p id="quote-label-hint" className="field-hint">
                Se mostrará en el historial. Si lo dejas vacío, se usará la dirección.
              </p>
            </div>

            <LocationPicker
              id="client-location"
              label="Dirección del cliente"
              value={client}
              center={settings.baseCoordinates ?? undefined}
              onChange={setClient}
              error={fieldErrors.client || undefined}
            />
          </section>

          <section className="panel space-y-5">
            <div>
              <h3 className="text-base font-semibold text-heading">
                Distancia y visitas
              </h3>
              <p className="text-sm text-muted">
                Cada visita suma un trayecto de ida y uno de retorno.
              </p>
            </div>

            <div className="journey-fields">
              <div className="space-y-1">
                <label
                  htmlFor="distance-km"
                  className="block text-sm font-medium text-ink"
                >
                  Distancia de ida (km)
                </label>
                <input
                  id="distance-km"
                  aria-invalid={fieldErrors.distance ? true : undefined}
                  aria-describedby={`distance-mode${fieldErrors.distance ? ' distance-error' : ''}`}
                  type="text"
                  inputMode="decimal"
                  value={distanceKm}
                  onChange={(event) => {
                    routeRequestId.current += 1
                    setDistanceKm(event.target.value)
                    setDistanceSource('manual')
                    setRouteStatus('idle')
                    setRouteDurationMin(null)
                    setRouteError(null)
                  }}
                  placeholder="Ej: 10,5"
                  className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                />

                {fieldErrors.distance ? <p id="distance-error" className="field-error">{fieldErrors.distance}</p> : null}
                <p id="distance-mode" className="field-hint">
                  {distanceSource === 'route' ? 'Distancia calculada por ruta. Puedes ajustarla manualmente.' : 'Distancia manual. Ingresa solo el trayecto de ida.'}
                </p>

                {routeStatus === 'loading' ? (
                  <p role="status" className="text-sm text-muted">Calculando la ruta…</p>
                ) : null}

                {routeStatus === 'error' ? (
                  <p className="text-sm text-warning">{routeError}</p>
                ) : null}

                {routeStatus === 'idle' &&
                routeDurationMin !== null &&
                distanceSource === 'route' ? (
                  <p className="text-sm text-accent">
                    Ruta calculada. Duración aproximada: {routeDurationMin} min.
                  </p>
                ) : null}

                {baseCoordinates && clientCoordinates ? (
                  <button
                    type="button"
                    onClick={() => setRecalculateToken((token) => token + 1)}
                    className="text-sm font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Volver a calcular la ruta
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-ink">
                  Cantidad de visitas
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Quitar una visita"
                    onClick={() => updateVisits(visits - 1)}
                    disabled={visits <= 1}
                    className="h-11 w-11 rounded-lg border border-line-strong text-lg font-semibold text-ink transition hover:bg-subtle"
                  >
                    −
                  </button>
                  <input
                    aria-label="Cantidad de visitas"
                    type="text"
                    inputMode="numeric"
                    value={visitsRaw}
                    onChange={(event) => setVisitsRaw(event.target.value)}
                    onBlur={() => setVisitsRaw(String(visits))}
                    className="w-16 rounded-lg border border-line-strong px-2 py-1.5 text-center text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                  <button
                    type="button"
                    aria-label="Agregar una visita"
                    onClick={() => updateVisits(visits + 1)}
                    disabled={visits >= 99}
                    className="h-11 w-11 rounded-lg border border-line-strong text-lg font-semibold text-ink transition hover:bg-subtle"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Ejemplo: si necesitas ir al destino en dos ocasiones, son 2 visitas.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="quote-summary" aria-label="Resumen de cotización">
          {oneWayKm > 0 ? (
            <QuoteResult
              breakdown={breakdown}
              oneWayKm={oneWayKm}
              visits={visits}
              includedKm={settings.pricing.includedKm}
              minimumFareApplied={minimumFareApplied}
              baseAddress={settings.baseAddress}
              clientAddress={client.address}
              distanceSource={distanceSource}
            />
          ) : (
            <section className="summary-empty">
              <p className="summary-kicker">Resumen del traslado</p>
              <h3>Tu cotización, aquí</h3>
              <p>Completa la distancia de ida para ver el total y el desglose del traslado.</p>
              <div className="summary-placeholder" aria-hidden="true">$ — <span>CLP</span></div>
              <p className="summary-hint">El cálculo se actualiza al cambiar la distancia o las visitas.</p>
            </section>
          )}

          <p className="tariff-note">
            Tarifa actual: mínima {formatCurrency(settings.pricing.minimumFare)} ·{' '}
            {tariffLabel} · retorno{' '}
            {formatCurrency(settings.pricing.emptySurchargePerKm)}/km.
          </p>

          {formError ? (
            <p role="alert" className="feedback feedback-error">
              {formError}
            </p>
          ) : null}

          {success ? (
            <p role="status" className="feedback feedback-success">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving || routeStatus === 'loading'}
            aria-busy={saving || routeStatus === 'loading'}
            className="w-full rounded-xl bg-action px-4 py-3 text-base font-semibold text-on-action shadow-sm transition hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cotización'}
          </button>
          <p className="save-note">{routeStatus === 'loading' ? 'Espera la ruta o ingresa una distancia manual para continuar.' : 'Se guarda en el historial de este navegador.'}</p>
        </aside>
      </form>
    </div>
  )
}
