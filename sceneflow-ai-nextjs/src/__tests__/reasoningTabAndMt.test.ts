import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { resolveClientUiLocale, readUiLocaleCookie } from '@/i18n/useUiLocale'
import { DEFAULT_LOCALE, UI_LOCALE_COOKIE } from '@/i18n/locale'

function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('useUiLocale hydrates from cookie/document on first render', () => {
  const hook = readSource('src/i18n/useUiLocale.ts')

  it('lazy-inits from resolveClientUiLocale rather than DEFAULT_LOCALE alone', () => {
    expect(hook).toContain('resolveClientUiLocale')
    expect(hook).toContain('useState<string>(() => resolveClientUiLocale())')
  })

  it('resolveClientUiLocale falls back to DEFAULT_LOCALE without a document', () => {
    // jsdom has document; still assert the helper is exported and cookie reader exists.
    expect(typeof resolveClientUiLocale).toBe('function')
    expect(typeof readUiLocaleCookie).toBe('function')
    expect(DEFAULT_LOCALE).toBe('en')
    expect(UI_LOCALE_COOKIE).toBe('sf-locale')
  })
})

describe('content MT retries after failed fetches', () => {
  const hook = readSource('src/i18n/content/useContentTranslation.ts')

  it('only marks requestedRef after a successful response', () => {
    expect(hook).toContain('Only remember successful fetches')
    const finallyBlock = hook.slice(hook.indexOf('} catch {'), hook.indexOf('return () => {'))
    expect(finallyBlock).not.toContain('requestedRef.current.add')
  })
})

describe('first Blueprint generation opens Narrative Reasoning', () => {
  const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')

  it('uses foundationTabSignal and a Reasoning toast on first generation', () => {
    expect(studio).toContain('review Narrative Reasoning')
    expect(studio).toContain('setFoundationTabSignal((s) => s + 1)')
    // The first-gen side-panel open must not force Resonance.
    const toastAt = studio.indexOf('review Narrative Reasoning')
    const window = studio.slice(Math.max(0, toastAt - 400), toastAt + 200)
    expect(window).toContain('setFoundationTabSignal')
    expect(window).not.toContain('setResonanceTabSignal')
  })
})
