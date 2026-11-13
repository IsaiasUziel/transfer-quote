export type ThemePreference = 'system' | 'light' | 'dark'

// Keep the original namespace to preserve existing browser preferences.
export const THEME_STORAGE_KEY = 'elenis-traslados:theme'
export const DARK_MODE_QUERY = '(prefers-color-scheme: dark)'

export function loadThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Follow the system when browser storage is unavailable.
  }
  return 'system'
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // The selected theme still applies for this session.
  }
}

export function isSystemDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_MODE_QUERY).matches
}

export function subscribeSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DARK_MODE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
