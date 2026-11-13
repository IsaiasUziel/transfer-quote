import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  isSystemDark,
  loadThemePreference,
  saveThemePreference,
  subscribeSystemTheme,
  type ThemePreference,
} from './theme'

const OPTIONS: Array<{ value: ThemePreference; label: string; path: string }> = [
  { value: 'system', label: 'Sistema', path: 'M3 4h18v12H3zM8 20h8M12 16v4' },
  { value: 'light', label: 'Claro', path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5' },
  { value: 'dark', label: 'Oscuro', path: 'M20.5 13A8.6 8.6 0 0 1 11 3.5 8.7 8.7 0 1 0 20.5 13Z' },
]

export function ThemeSwitcher() {
  const [preference, setPreference] = useState(loadThemePreference)
  const systemDark = useSyncExternalStore(subscribeSystemTheme, isSystemDark, () => false)
  const resolvedTheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  return (
    <fieldset className="theme-switcher">
      <legend className="sr-only">Apariencia</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className="theme-option">
          <input
            className="sr-only"
            type="radio"
            name="theme-preference"
            value={option.value}
            checked={preference === option.value}
            onChange={() => {
              setPreference(option.value)
              saveThemePreference(option.value)
            }}
          />
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d={option.path} />
          </svg>
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
