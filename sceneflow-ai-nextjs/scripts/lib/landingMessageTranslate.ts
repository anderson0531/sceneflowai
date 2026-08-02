import { batchTranslateWithVertexAI } from '../../src/lib/vertexai/translate'

export const GLOSSARY_TERMS = [
  'SceneFlow AI Studio',
  'SceneFlow AI',
  'SceneFlow',
  'Blueprint Studio',
  'Series Studio',
  'Production Studio',
  'Blueprint',
  'Production Mixer',
  'Beat Frames',
  'Audience Resonance',
  'Screening Room',
  'Reference Library',
  'Final Cut',
  'Premiere',
  'Animatic',
  'Express Pre-vis',
  'Pre-vis',
  'Pre-Visualization Engine',
  'Creative Decision Engine',
  'BYOK',
  'Whop',
  'Explorer',
  'Vertex AI',
  'ElevenLabs',
  'Google Cloud',
  'Gemini Studio',
  'Google Flow',
]

const GLOSSARY_PLACEHOLDER_PREFIX = 'SFAI'
const GLOSSARY_PLACEHOLDER_SUFFIX = 'TERM'
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2'
const MYMEMORY_API = 'https://api.mymemory.translated.net/get'

function glossarySlug(term: string): string {
  return term.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
}

export { glossarySlug }

export function protectGlossary(text: string): { protectedText: string; map: Map<string, string> } {
  const map = new Map<string, string>()
  let protectedText = text
  GLOSSARY_TERMS.forEach((term) => {
    if (!protectedText.includes(term)) return
    const placeholder = `${GLOSSARY_PLACEHOLDER_PREFIX}${glossarySlug(term)}${GLOSSARY_PLACEHOLDER_SUFFIX}`
    map.set(placeholder, term)
    protectedText = protectedText.split(term).join(placeholder)
  })
  return { protectedText, map }
}

function scrubLegacyPlaceholders(text: string): string {
  return text.replace(/__\s*SFTERM_(\d+)\s*__/g, (_, idx) => GLOSSARY_TERMS[Number(idx)] ?? _)
}

export function restoreGlossary(text: string, map: Map<string, string>): string {
  let restored = text
  for (const [placeholder, term] of map) {
    restored = restored.split(placeholder).join(term)
    const slug = glossarySlug(term)
    const fuzzy = new RegExp(`${GLOSSARY_PLACEHOLDER_PREFIX}\\s*${slug}\\s*${GLOSSARY_PLACEHOLDER_SUFFIX}`, 'g')
    restored = restored.replace(fuzzy, term)
  }
  return scrubLegacyPlaceholders(restored)
}

export function flattenMessages(
  obj: unknown,
  prefix = '',
  out: Record<string, string> = {}
): Record<string, string> {
  if (typeof obj === 'string') {
    if (prefix) out[prefix] = obj
    return out
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => flattenMessages(item, `${prefix}.${index}`, out))
    return out
  }
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key
      flattenMessages(value, path, out)
    }
  }
  return out
}

export function unflattenMessages(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {}

  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.')
    let current: Record<string, unknown> | unknown[] = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const nextIsIndex = i + 1 < parts.length && /^\d+$/.test(parts[i + 1])

      if (isLast) {
        if (Array.isArray(current)) {
          current[parseInt(part, 10)] = value
        } else {
          ;(current as Record<string, unknown>)[part] = value
        }
        break
      }

      if (Array.isArray(current)) {
        const idx = parseInt(part, 10)
        if (current[idx] == null) {
          current[idx] = nextIsIndex ? [] : {}
        }
        current = current[idx] as Record<string, unknown> | unknown[]
      } else {
        const rec = current as Record<string, unknown>
        if (rec[part] == null) {
          rec[part] = nextIsIndex ? [] : {}
        }
        current = rec[part] as Record<string, unknown> | unknown[]
      }
    }
  }

  return root
}

export function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      out[key] = deepMerge(base[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

export function toGoogleTarget(code: string): string {
  if (code === 'zh-CN' || code === 'zh-TW') return code
  if (code === 'no') return 'no'
  return code.split('-')[0]
}

/** Argos/LibreTranslate language codes differ from our locale selector in a few cases. */
export function toLibreTranslateTarget(code: string): string {
  if (code === 'zh-CN') return 'zh'
  if (code === 'zh-TW') return 'zt'
  if (code === 'no') return 'nb'
  return code.split('-')[0]
}

const LIBRETRANSLATE_URL = (process.env.LIBRETRANSLATE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')

/** Locales without Argos models — translated via deep-translator (Google) instead. */
export const DEEP_TRANSLATOR_LOCALES = new Set(['am', 'yo', 'zu', 'af'])

function shouldSkipTranslation(path: string, value: string): boolean {
  if (path.endsWith('.id')) return true
  if (/^https?:\/\//.test(value)) return true
  if (path.endsWith('ctaSecondaryHref')) return true
  return false
}

export type TranslateProvider =
  | 'auto'
  | 'vertex'
  | 'google-rest'
  | 'mymemory'
  | 'libretranslate'
  | 'deep-translator'

function resolveProvider(requested: TranslateProvider, target?: string): TranslateProvider {
  if (requested !== 'auto') return requested
  if (target && DEEP_TRANSLATOR_LOCALES.has(target)) return 'deep-translator'
  if (process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID) return 'vertex'
  if (process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY) return 'google-rest'
  if (process.env.LIBRETRANSLATE_URL || process.env.USE_LIBRETRANSLATE === '1') return 'libretranslate'
  return 'mymemory'
}

async function translateBatchGoogleRest(
  texts: string[],
  target: string,
  apiKey: string
): Promise<string[]> {
  const protectedEntries = texts.map((t) => protectGlossary(t))
  const q = protectedEntries.map((e) => e.protectedText)
  const response = await fetch(`${GOOGLE_TRANSLATE_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, target: toGoogleTarget(target), source: 'en', format: 'text' }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Translate API ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> }
  }
  const translations = data.data?.translations ?? []

  return texts.map((original, i) => {
    const raw = translations[i]?.translatedText ?? original
    return restoreGlossary(raw, protectedEntries[i].map)
  })
}

async function translateBatchLibreTranslate(texts: string[], target: string): Promise<string[]> {
  const ltTarget = toLibreTranslateTarget(target)
  const results: string[] = []

  for (const text of texts) {
    const { protectedText, map } = protectGlossary(text)
    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: protectedText, source: 'en', target: ltTarget, format: 'text' }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`LibreTranslate ${response.status}: ${err.slice(0, 200)}`)
    }

    const data = (await response.json()) as { translatedText?: string; error?: string }
    if (data.error) {
      throw new Error(`LibreTranslate: ${data.error}`)
    }

    results.push(restoreGlossary(data.translatedText ?? text, map))
    await new Promise((r) => setTimeout(r, 50))
  }

  return results
}

async function translateBatchDeepTranslator(texts: string[], target: string): Promise<string[]> {
  const { spawnSync } = await import('child_process')
  const { dirname, join } = await import('path')
  const { fileURLToPath } = await import('url')
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  const helper = join(scriptDir, 'deepTranslateBatch.py')
  const protectedEntries = texts.map((t) => protectGlossary(t))
  const payload = JSON.stringify({
    target: toGoogleTarget(target),
    texts: protectedEntries.map((e) => e.protectedText),
  })

  const result = spawnSync('python3', [helper], {
    input: payload,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  })

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'deep-translator batch failed')
  }

  const parsed = JSON.parse(result.stdout) as { translations?: string[] }
  if (!parsed.translations || parsed.translations.length !== texts.length) {
    throw new Error('deep-translator returned unexpected batch size')
  }

  return texts.map((original, i) =>
    restoreGlossary(parsed.translations![i] ?? original, protectedEntries[i].map)
  )
}

async function translateBatchMyMemory(texts: string[], target: string): Promise<string[]> {
  const langpair = `en|${toGoogleTarget(target)}`
  const results: string[] = []

  for (const text of texts) {
    const { protectedText, map } = protectGlossary(text)
    let translated = text
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const url = new URL(MYMEMORY_API)
        url.searchParams.set('q', protectedText)
        url.searchParams.set('langpair', langpair)
        url.searchParams.set('de', 'support@sceneflowai.studio')

        const response = await fetch(url.toString())
        if (response.status === 429) {
          const waitMs = 1000 * (attempt + 1)
          console.warn(`  MyMemory rate limited — waiting ${waitMs}ms`)
          await new Promise((r) => setTimeout(r, waitMs))
          continue
        }
        if (!response.ok) {
          throw new Error(`MyMemory API ${response.status}`)
        }

        const data = (await response.json()) as {
          responseData?: { translatedText?: string }
          quotaFinished?: boolean
        }

        if (data.quotaFinished) {
          throw new Error('MyMemory daily quota finished')
        }

        translated = restoreGlossary(data.responseData?.translatedText ?? text, map)
        lastError = null
        break
      } catch (err) {
        lastError = err as Error
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    }

    if (lastError) {
      throw lastError
    }

    results.push(translated)
    await new Promise((r) => setTimeout(r, 650))
  }

  return results
}

export async function translateBatch(
  texts: string[],
  target: string,
  provider: TranslateProvider = 'auto'
): Promise<string[]> {
  const resolved = resolveProvider(provider, target)

  if (resolved === 'vertex') {
    const protectedEntries = texts.map((t) => protectGlossary(t))
    const q = protectedEntries.map((e) => e.protectedText)
    const results = await batchTranslateWithVertexAI(q, toGoogleTarget(target), 'en')
    return results.map((r, i) => restoreGlossary(r.translatedText, protectedEntries[i].map))
  }

  if (resolved === 'google-rest') {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY not configured')
    return translateBatchGoogleRest(texts, target, apiKey)
  }

  if (resolved === 'libretranslate') {
    return translateBatchLibreTranslate(texts, target)
  }

  if (resolved === 'deep-translator') {
    return translateBatchDeepTranslator(texts, target)
  }

  return translateBatchMyMemory(texts, target)
}

export async function translateFlatMessages(
  flat: Record<string, string>,
  target: string,
  provider: TranslateProvider = 'auto',
  chunkSize = 50
): Promise<Record<string, string>> {
  const entries = Object.entries(flat).filter(([path, value]) => !shouldSkipTranslation(path, value))
  const uniqueValues = [...new Set(entries.map(([, v]) => v))]
  const valueCache = new Map<string, string>()

  for (let i = 0; i < uniqueValues.length; i += chunkSize) {
    const chunk = uniqueValues.slice(i, i + chunkSize)
    console.log(
      `  Translating unique strings ${i + 1}-${Math.min(i + chunk.length, uniqueValues.length)} / ${uniqueValues.length}`
    )
    const result = await translateBatch(chunk, target, provider)
    chunk.forEach((original, idx) => {
      valueCache.set(original, result[idx])
    })
    const resolved = resolveProvider(provider, target)
    if (resolved !== 'mymemory' && resolved !== 'libretranslate') {
      await new Promise((r) => setTimeout(r, 400))
    }
  }

  const out: Record<string, string> = { ...flat }
  for (const [path, value] of entries) {
    if (shouldSkipTranslation(path, value)) continue
    out[path] = valueCache.get(value) ?? value
  }
  return out
}

export const LANDING_NAMESPACES = [
  'nav',
  'hero',
  'twoModes',
  'infrastructure',
  'useCasesShowcase',
  'pricing',
  'exitIntent',
  'finalCta',
  'floatingCta',
  'floatingNav',
  'footer',
  'valueProp',
  'productionShowcase',
  'keyFeatures',
  'pipeline',
  'screeningRoom',
] as const

export const PRIORITY_LANDING_NAMESPACES = [
  'nav',
  'hero',
  'twoModes',
  'infrastructure',
  'useCasesShowcase',
  'pricing',
  'exitIntent',
  'finalCta',
  'floatingCta',
  'floatingNav',
  'footer',
] as const

export const CRITICAL_LANDING_PATHS = [
  'hero.ctaPrimaryLaunch',
  'hero.ctaSecondary',
  'hero.ctaSupportingLine',
  'hero.chips.0.label',
  'hero.chips.0.detail',
  'twoModes.title',
  'twoModes.go.cta',
  'twoModes.director.cta',
  'useCasesShowcase.badge',
  'useCasesShowcase.title',
  'useCasesShowcase.subtitle',
  'useCasesShowcase.cta',
  'pricing.title',
  'pricing.subtitle',
  'pricing.explorerHighlight',
  'pricing.trustBadges.0',
  'pricing.trustBadges.1',
  'pricing.trustBadges.2',
  'exitIntent.startNow',
  'finalCta.cta',
  'finalCta.subtitle',
  'finalCta.ctaSecondary',
] as const

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current == null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[part]
  }, obj)
}

export function extractCriticalLandingFlat(en: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {}
  for (const path of CRITICAL_LANDING_PATHS) {
    const value = getAtPath(en, path)
    if (typeof value === 'string') flat[path] = value
  }
  return flat
}

export function extractLandingMessages(
  en: Record<string, unknown>,
  namespaces: readonly string[] = LANDING_NAMESPACES
): Record<string, unknown> {
  const landing: Record<string, unknown> = {}
  for (const ns of namespaces) {
    if (en[ns] != null) landing[ns] = en[ns]
  }
  return landing
}
