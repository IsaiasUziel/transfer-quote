import { useEffect, useState, type FormEvent } from 'react'
import { LocationPicker, type LocationValue } from '../../components/LocationPicker'
import type { AppSettings } from './settings'
import { parseNumberInput } from '../../lib/parse-number'

interface SettingsFormProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export function SettingsForm({ settings, onSave }: SettingsFormProps) {
  const [base, setBase] = useState<LocationValue>({
    address: settings.baseAddress,
    coordinates: settings.baseCoordinates,
  })
  const [minimumFare, setMinimumFare] = useState(
    String(settings.pricing.minimumFare),
  )
  const [includedKm, setIncludedKm] = useState(
    String(settings.pricing.includedKm),
  )
  const [tariffPerKm, setTariffPerKm] = useState(
    settings.pricing.tariffPerKm === 0
      ? ''
      : String(settings.pricing.tariffPerKm),
  )
  const [emptySurchargePerKm, setEmptySurchargePerKm] = useState(
    String(settings.pricing.emptySurchargePerKm),
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const timeout = setTimeout(() => setSaved(false), 4000)
    return () => clearTimeout(timeout)
  }, [saved])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const minimumFareValue = parseNumberInput(minimumFare)
    const includedKmValue = parseNumberInput(includedKm)
    const tariffPerKmValue = parseNumberInput(tariffPerKm)
    const emptySurchargeValue = parseNumberInput(emptySurchargePerKm)

    if (minimumFareValue === null || minimumFareValue < 0) {
      setError('Ingresa una tarifa mínima válida.')
      return
    }

    if (includedKmValue === null || includedKmValue < 0) {
      setError('Ingresa una cantidad válida de kilómetros incluidos.')
      return
    }

    if (tariffPerKmValue !== null && tariffPerKmValue < 0) {
      setError('La tarifa por km no puede ser negativa.')
      return
    }

    if (emptySurchargeValue === null || emptySurchargeValue < 0) {
      setError('Ingresa un tarifa por km de retorno válido.')
      return
    }

    setError(null)
    onSave({
      baseAddress: base.address.trim(),
      baseCoordinates: base.coordinates,
      pricing: {
        minimumFare: minimumFareValue,
        includedKm: includedKmValue,
        tariffPerKm: tariffPerKmValue ?? 0,
        emptySurchargePerKm: emptySurchargeValue,
      },
    })
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="page-heading">
        <div><h2>Configura tus traslados</h2><p>Define el punto de partida y las tarifas para tus próximas cotizaciones.</p></div>
      </div>
      <div className="settings-layout">
        <section className="panel space-y-5">
          <div>
            <h3 className="text-base font-semibold text-heading">
              Mi base
            </h3>
            <p className="text-sm text-muted">
              Es el punto de partida de todos los traslados.
            </p>
          </div>

          <LocationPicker
            id="base-location"
            label="Dirección de la base"
            value={base}
            onChange={setBase}
          />

          {!base.coordinates ? (
            <p className="text-sm text-warning">
              Marca tu base en el mapa para calcular rutas automáticamente. Sin
              pin, deberás ingresar la distancia a mano en cada cotización.
            </p>
          ) : null}
        </section>

        <section className="panel space-y-5">
          <div>
            <h3 className="text-base font-semibold text-heading">Tarifas</h3>
            <p className="text-sm text-muted">
              La tarifa por km es opcional. Si la dejas vacía, el tramo de
              distancia no se cobra.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="minimum-fare"
                className="block text-sm font-medium text-ink"
              >
                Tarifa mínima (CLP)
              </label>
              <input
                id="minimum-fare"
                type="text"
                inputMode="numeric"
                value={minimumFare}
                onChange={(event) => setMinimumFare(event.target.value)}
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="included-km"
                className="block text-sm font-medium text-ink"
              >
                Kilómetros incluidos
              </label>
              <input
                id="included-km"
                type="text"
                inputMode="decimal"
                value={includedKm}
                onChange={(event) => setIncludedKm(event.target.value)}
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="tariff-per-km"
                className="block text-sm font-medium text-ink"
              >
                Tarifa por km (CLP)
              </label>
              <input
                id="tariff-per-km"
                type="text"
                inputMode="numeric"
                value={tariffPerKm}
                onChange={(event) => setTariffPerKm(event.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="empty-surcharge"
                className="block text-sm font-medium text-ink"
              >
                Tarifa por km de retorno (CLP)
              </label>
              <input
                id="empty-surcharge"
                type="text"
                inputMode="numeric"
                value={emptySurchargePerKm}
                onChange={(event) =>
                  setEmptySurchargePerKm(event.target.value)
                }
                className="w-full rounded-lg border border-line-strong px-3 py-2 text-base text-heading shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>

          <div className="rounded-lg bg-subtle p-3 text-xs text-muted">
            <p className="font-medium text-ink">Cómo se calcula</p>
            <p className="mt-1">
              Cada visita suma una ida y un retorno. Los kilómetros incluidos
              se descuentan una sola vez del total de ida. El retorno usa su
              propia tarifa por kilómetro. El total nunca baja de la tarifa mínima.
            </p>
          </div>
        </section>

      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error">
          {error}
        </p>
      ) : null}

      <div className="settings-actions">
        <button
          type="submit"
          className="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-action shadow-sm transition hover:bg-action-hover focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          Guardar configuración
        </button>

        {saved ? (
          <span role="status" className="text-sm text-accent">
            Configuración guardada.
          </span>
        ) : null}
      </div>
    </form>
  )
}
