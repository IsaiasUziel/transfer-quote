import { describe, expect, it } from 'vitest'
import html from '../../../index.html?raw'

const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
if (!bootstrap) throw new Error('Theme bootstrap script is missing')

function runBootstrap(getItem: (key: string) => string | null, systemDark: boolean) {
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } }
  const execute = new Function('window', 'document', 'localStorage', bootstrap!)
  execute(
    { matchMedia: () => ({ matches: systemDark }) },
    { documentElement: root },
    { getItem },
  )
  return root
}

describe('theme initialization before React', () => {
  it.each([
    { saved: 'dark', systemDark: false, expected: 'dark' },
    { saved: 'light', systemDark: true, expected: 'light' },
    { saved: 'system', systemDark: true, expected: 'dark' },
    { saved: null, systemDark: false, expected: 'light' },
    { saved: 'invalid', systemDark: true, expected: 'dark' },
  ])('applies $expected for preference $saved before mounting', ({ saved, systemDark, expected }) => {
    const root = runBootstrap(() => saved, systemDark)
    expect(root.dataset.theme).toBe(expected)
    expect(root.style.colorScheme).toBe(expected)
  })

  it('follows the system when reading storage fails', () => {
    const root = runBootstrap(() => { throw new Error('Storage unavailable') }, true)
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })
})
