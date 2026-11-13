import { useEffect, useMemo, useRef, useState } from 'react'
import type { Quote } from './domain/types'
import { HistoryList } from './features/history/HistoryList'
import { mergeQuotes } from './features/history/merge-quotes'
import { QuoteForm } from './features/quote/QuoteForm'
import {
  loadSettings,
  saveSettings,
  type AppSettings,
} from './features/settings/settings'
import { SettingsForm } from './features/settings/SettingsForm'
import { IndexedDbQuoteRepository } from './infrastructure/storage/indexeddb'
import { ThemeSwitcher } from './features/theme/ThemeSwitcher'
import { APP_CONFIG } from './config/app'

type Tab = 'quote' | 'history' | 'settings'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'quote', label: 'Cotizar' },
  { id: 'history', label: 'Historial' },
  { id: 'settings', label: 'Ajustes' },
]

function App() {
  const pressedButton = useRef<HTMLButtonElement | null>(null)
  const repository = useMemo(() => new IndexedDbQuoteRepository(), [])
  const [tab, setTab] = useState<Tab>('quote')
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    repository
      .list()
      .then((list) => {
        if (!cancelled) setQuotes(list)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(
            'No se pudo leer el historial local de este navegador.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingQuotes(false)
      })

    return () => {
      cancelled = true
    }
  }, [repository])

  function handleSaveSettings(next: AppSettings) {
    setSettings(next)
    saveSettings(next)
  }

  async function handleSaveQuote(quote: Quote) {
    await repository.save(quote)
    setQuotes((current) => [quote, ...current])
  }

  async function handleDeleteQuote(id: string) {
    await repository.remove(id)
    setQuotes((current) => current.filter((quote) => quote.id !== id))
  }

  async function handleClearHistory() {
    await repository.clear()
    setQuotes([])
  }

  async function handleImportQuotes(imported: Quote[]) {
    const result = mergeQuotes(quotes, imported)
    await Promise.all(
      result.addedQuotes.map((quote) => repository.save(quote)),
    )
    setQuotes(result.quotes)

    return { added: result.addedQuotes.length, skipped: result.skipped }
  }

  function clearPointerFeedback() {
    pressedButton.current?.removeAttribute('data-pointer-pressed')
    pressedButton.current = null
  }

  return (
    <div
      className="app-shell"
      onPointerDown={(event) => {
        clearPointerFeedback()
        if (event.button !== 0) return
        const target = event.target instanceof Element ? event.target.closest('button') : null
        if (!target || target.disabled) return
        pressedButton.current = target
        target.setAttribute('data-pointer-pressed', 'true')
      }}
      onPointerUp={clearPointerFeedback}
      onPointerCancel={clearPointerFeedback}
      onPointerLeave={clearPointerFeedback}
      onKeyDownCapture={clearPointerFeedback}
    >
      <a className="skip-link" href="#main-content">Ir al contenido</a>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h11v11H3zM14 10h4l3 4v3h-7M3 12h5" />
                <circle cx="7" cy="18" r="2" fill="currentColor" stroke="white" />
                <circle cx="18" cy="18" r="2" fill="currentColor" stroke="white" />
              </svg>
            </span>
            <div>
              <h1>{APP_CONFIG.name}</h1>
              <p>Planifica y cotiza tus recorridos</p>
            </div>
          </div>
          <div className="header-controls">
            <nav aria-label="Secciones" className="app-nav">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="app-main">
        {tab === 'quote' ? (
          <QuoteForm
            settings={settings}
            onSaveQuote={handleSaveQuote}
            onGoToSettings={() => setTab('settings')}
          />
        ) : null}

        {tab === 'history' ? (
          <HistoryList
            quotes={quotes}
            loading={loadingQuotes}
            loadError={loadError}
            onDelete={handleDeleteQuote}
            onClear={handleClearHistory}
            onImport={handleImportQuotes}
          />
        ) : null}

        {tab === 'settings' ? (
          <SettingsForm settings={settings} onSave={handleSaveSettings} />
        ) : null}
      </main>

      <footer className="app-footer">
        Historial guardado en este navegador. Mapas y rutas sujetos a la disponibilidad de los servicios configurados.
        <p>
          {APP_CONFIG.osrmUrl ? <><a href="https://project-osrm.org/">Rutas con OSRM</a> · </> : null}
          <a href="https://www.openstreetmap.org/fixthemap">Corregir el mapa</a> ·{' '}
          <a href={`${import.meta.env.BASE_URL}THIRD_PARTY_LICENSES.txt`}>Licencias de terceros</a>
        </p>
      </footer>
    </div>
  )
}

export default App
