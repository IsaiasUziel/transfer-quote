import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeSwitcher } from './ThemeSwitcher'
import { THEME_STORAGE_KEY } from './theme'

let systemDark = false
const listeners = new Set<() => void>()

function changeSystemTheme(dark: boolean) {
  systemDark = dark
  act(() => { listeners.forEach((listener) => listener()) })
}

beforeEach(() => {
  localStorage.clear()
  listeners.clear()
  systemDark = false
  delete document.documentElement.dataset.theme
  document.documentElement.style.removeProperty('color-scheme')
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: systemDark,
    addEventListener: (_event: string, listener: () => void) => { listeners.add(listener) },
    removeEventListener: (_event: string, listener: () => void) => { listeners.delete(listener) },
  })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ThemeSwitcher', () => {
  it('defaults to the system theme and follows changes immediately', () => {
    render(<ThemeSwitcher />)

    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    changeSystemTheme(true)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    changeSystemTheme(false)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('persists a manual preference across mounts and ignores system changes', () => {
    const view = render(<ThemeSwitcher />)
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }))

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    changeSystemTheme(true)
    changeSystemTheme(false)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    view.unmount()
    render(<ThemeSwitcher />)
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('can force light mode and return to the system preference', () => {
    systemDark = true
    render(<ThemeSwitcher />)
    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    changeSystemTheme(false)
    changeSystemTheme(true)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    fireEvent.click(screen.getByRole('radio', { name: 'Sistema' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('falls back to the system for an invalid saved preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid')
    systemDark = true
    render(<ThemeSwitcher />)

    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('keeps switching themes when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    render(<ThemeSwitcher />)
    fireEvent.click(screen.getByRole('radio', { name: 'Oscuro' }))

    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('releases the system listener when unmounted', () => {
    const view = render(<ThemeSwitcher />)
    expect(listeners.size).toBe(1)
    view.unmount()
    expect(listeners.size).toBe(0)
  })
})
