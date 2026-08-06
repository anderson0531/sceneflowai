import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

vi.mock('@/i18n/server/storyLocale', () => ({
  resolveStoryLocale: vi.fn(),
}))

vi.mock('@/lib/i18n/contentTranslator', () => ({
  translateStrings: vi.fn(),
}))

import { resolveStoryLocale } from '@/i18n/server/storyLocale'
import { translateStrings } from '@/lib/i18n/contentTranslator'
import {
  englishForModel,
  englishForModelBatch,
  resolveRequestStoryLocale,
} from '@/i18n/server/requestLocale'

/** Minimal stand-in for the cookie surface the resolver reads. */
function requestWithCookie(value?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === 'sf-locale' && value ? { name, value } : undefined,
    },
  } as unknown as NextRequest
}

describe('resolveRequestStoryLocale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('falls back to the interface cookie when nothing else resolved', async () => {
    vi.mocked(resolveStoryLocale).mockResolvedValue({
      storyLocale: 'en',
      properNouns: [],
      source: 'default',
    })

    const resolved = await resolveRequestStoryLocale(requestWithCookie('es'))
    expect(resolved.storyLocale).toBe('es')
    expect(resolved.source).toBe('cookie')
  })

  it('never overrides a project or series language with the reader cookie', async () => {
    // A blueprint written in Japanese must keep authoring in Japanese even when
    // the creator is reading the studio in Spanish.
    vi.mocked(resolveStoryLocale).mockResolvedValue({
      storyLocale: 'ja',
      properNouns: [],
      source: 'project',
    })

    const resolved = await resolveRequestStoryLocale(requestWithCookie('es'))
    expect(resolved.storyLocale).toBe('ja')
    expect(resolved.source).toBe('project')
  })

  it('keeps an explicit request value ahead of the cookie', async () => {
    vi.mocked(resolveStoryLocale).mockResolvedValue({
      storyLocale: 'pt',
      properNouns: [],
      source: 'explicit',
    })

    const resolved = await resolveRequestStoryLocale(requestWithCookie('es'), {
      explicit: 'pt',
    })
    expect(resolved.storyLocale).toBe('pt')
  })

  it('ignores an unsupported cookie value', async () => {
    vi.mocked(resolveStoryLocale).mockResolvedValue({
      storyLocale: 'en',
      properNouns: [],
      source: 'default',
    })

    const resolved = await resolveRequestStoryLocale(requestWithCookie('klingon'))
    expect(resolved.storyLocale).toBe('en')
    expect(resolved.source).toBe('default')
  })

  it('passes resolver options through untouched', async () => {
    vi.mocked(resolveStoryLocale).mockResolvedValue({
      storyLocale: 'en',
      properNouns: [],
      source: 'default',
    })

    await resolveRequestStoryLocale(requestWithCookie(), {
      projectId: 'p1',
      userIdOrEmail: 'u1',
      includeProperNouns: false,
    })

    expect(resolveStoryLocale).toHaveBeenCalledWith({
      projectId: 'p1',
      userIdOrEmail: 'u1',
      includeProperNouns: false,
    })
  })
})

describe('englishForModel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a no-op for English so prompts stay byte-identical', async () => {
    expect(await englishForModel('a lone figure on a pier', 'en')).toBe(
      'a lone figure on a pier'
    )
    expect(translateStrings).not.toHaveBeenCalled()
  })

  it('translates a non-English prompt into English for the render models', async () => {
    vi.mocked(translateStrings).mockResolvedValue({
      translations: new Map([['una figura solitaria', 'a lone figure']]),
      cacheHits: new Set(),
      charsSent: 20,
      budgetExceeded: false,
    })

    expect(await englishForModel('una figura solitaria', 'es')).toBe('a lone figure')
  })

  it('forwards the glossary so character names survive', async () => {
    vi.mocked(translateStrings).mockResolvedValue({
      translations: new Map([['Mira en el muelle', 'Mira on the pier']]),
      cacheHits: new Set(),
      charsSent: 10,
      budgetExceeded: false,
    })

    await englishForModel('Mira en el muelle', 'es', ['Mira'])

    expect(translateStrings).toHaveBeenCalledWith(
      expect.objectContaining({
        targetLocale: 'en',
        sourceLocale: 'es',
        glossary: ['Mira'],
      })
    )
  })

  it('returns the source text when the provider fails', async () => {
    vi.mocked(translateStrings).mockRejectedValue(new Error('provider down'))
    expect(await englishForModel('una figura solitaria', 'es')).toBe(
      'una figura solitaria'
    )
  })

  it('leaves empty input alone without calling the provider', async () => {
    expect(await englishForModel('   ', 'es')).toBe('   ')
    expect(await englishForModel(undefined, 'es')).toBe('')
    expect(translateStrings).not.toHaveBeenCalled()
  })
})

describe('englishForModelBatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('preserves order and keeps untranslated entries as source', async () => {
    vi.mocked(translateStrings).mockResolvedValue({
      translations: new Map([['uno', 'one']]),
      cacheHits: new Set(),
      charsSent: 3,
      budgetExceeded: false,
    })

    expect(await englishForModelBatch(['uno', '', 'dos'], 'es')).toEqual([
      'one',
      '',
      'dos',
    ])
  })

  it('sends one batch rather than a call per field', async () => {
    vi.mocked(translateStrings).mockResolvedValue({
      translations: new Map(),
      cacheHits: new Set(),
      charsSent: 0,
      budgetExceeded: false,
    })

    await englishForModelBatch(['uno', 'dos', 'tres'], 'es')
    expect(translateStrings).toHaveBeenCalledTimes(1)
  })

  it('skips the provider entirely when every field is blank', async () => {
    expect(await englishForModelBatch(['', undefined], 'es')).toEqual(['', ''])
    expect(translateStrings).not.toHaveBeenCalled()
  })
})
