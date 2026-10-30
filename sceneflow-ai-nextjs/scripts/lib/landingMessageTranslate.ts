import { batchTranslateWithVertexAI } from '../../src/lib/vertexai/translate'
import {
  GLOSSARY_TERMS,
  glossarySlug,
  icuArgumentsMatch,
  protectAll,
  restoreAll,
  restoreGlossary as restoreGlossaryTerms,
} from '../../src/lib/i18n/glossary'

export { GLOSSARY_TERMS, glossarySlug }

const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2'
const MYMEMORY_API = 'https://api.mymemory.translated.net/get'

export interface ProtectedEntry {
  protectedText: string
  map: Map<string, string>
  icu: Map<string, string>
  original: string
}

/**
 * Shield glossary terms *and* ICU arguments before sending text to a provider.
 *
 * ICU protection is the addition here: `{count, plural, ...}` used to be sent as
 * plain prose, so an engine was free to translate or reorder the inside of the
 * braces and produce a message that throws at format time rather than merely
 * reading oddly.
 */
export function protectGlossary(text: string): ProtectedEntry {
  const { protectedText, glossary, icu } = protectAll(text)
  return { protectedText, map: glossary, icu, original: text }
}

/**
 * Restore protected spans. When the ICU map is supplied, a translation that lost
 * or mangled an argument is rejected in favour of the English source: a wrong
 * language is a cosmetic problem, a broken ICU message is a crash.
 */
export function restoreGlossary(
  text: string,
  map: Map<string, string>,
  entry?: Pick<ProtectedEntry, 'icu' | 'original'>
): string {
  if (!entry) return restoreGlossaryTerms(text, map)

  const restored = restoreAll(text, map, entry.icu)
  if (!icuArgumentsMatch(entry.original, restored)) {
    console.warn(
      `[i18n] dropping translation with mangled ICU arguments: ${entry.original.slice(0, 60)}`
    )
    return entry.original
  }
  return restored
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

/** Identifiers, hashes, and endonyms that must stay byte-for-byte. */
const STRUCTURAL_LEAVES = new Set([
  'id',
  'icon',
  'hash',
  'nativeLabel',
  'media',
  'number',
  'ratio',
  'flag',
])

export function shouldSkipTranslation(path: string, value: string): boolean {
  if (path === 'keyFeatures.subtitle') return true
  const leaf = path.split('.').pop() ?? ''
  if (STRUCTURAL_LEAVES.has(leaf)) return true
  if (leaf.endsWith('Href') || leaf === 'href') return true
  if (/^https?:\/\//.test(value)) return true
  if (value.startsWith('#') || value.startsWith('/')) return true
  return false
}

/**
 * English strings a locale is still showing: the key is missing, or the stored
 * value is still the English source. Existing translations (value differs) stay.
 */
export function extractStaleLandingFlat(
  en: Record<string, unknown>,
  existing: Record<string, unknown>,
  previousEn?: Record<string, unknown> | null
): Record<string, string> {
  const enFlat = flattenMessages(en)
  const existingFlat = flattenMessages(existing)
  const previousFlat = previousEn ? flattenMessages(previousEn) : null
  const stale: Record<string, string> = {}
  for (const [path, value] of Object.entries(enFlat)) {
    if (shouldSkipTranslation(path, value)) continue
    const current = existingFlat[path]
    // A previous English catalog marks copy that changed after the last
    // translation. Those locales still hold the old sentence, so they are
    // stale even when the text is no longer identical to today's English.
    const englishChanged =
      previousFlat != null && previousFlat[path] !== undefined && previousFlat[path] !== value
    const untouchedSinceBaseline =
      previousFlat != null && previousFlat[path] === value && current !== undefined
    if (current === undefined || englishChanged || (!untouchedSinceBaseline && current === value)) {
      stale[path] = value
    }
  }
  return stale
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
    return restoreGlossary(raw, protectedEntries[i].map, protectedEntries[i])
  })
}

async function translateBatchLibreTranslate(texts: string[], target: string): Promise<string[]> {
  const ltTarget = toLibreTranslateTarget(target)
  const results: string[] = []

  for (const text of texts) {
    const entry = protectGlossary(text)
    const { protectedText, map } = entry
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

    results.push(restoreGlossary(data.translatedText ?? text, map, entry))
    await new Promise((r) => setTimeout(r, 50))
  }

  return results
}

let anyNetworkSuccess = false

async function translateSingleGoogleGtx(text: string, target: string): Promise<string> {
  if (!text.trim()) return text
  const endpoints = [
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(target)}&dt=t`,
    `https://translate.googleapis.com/translate_a/single?client=at&sl=en&tl=${encodeURIComponent(target)}&dt=t`,
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=${encodeURIComponent(target)}`,
  ]
  const body = new URLSearchParams({ q: text }).toString()
  let delay = 1200
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = endpoints[attempt % endpoints.length]
    let res: Response
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          'User-Agent': 'Mozilla/5.0',
        },
        body,
        signal: AbortSignal.timeout(10000),
      })
      anyNetworkSuccess = true
    } catch (err) {
      if (!anyNetworkSuccess || attempt === 5) throw err
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 10000)
      continue
    }
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, 10000)
      continue
    }
    if (!res.ok) {
      if (attempt < 5) {
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw new Error(`GTX HTTP ${res.status}`)
    }
    const payload = (await res.json()) as unknown
    if (Array.isArray(payload)) {
      if (typeof payload[0] === 'string') {
        return payload[0]
      }
      if (Array.isArray(payload[0])) {
        if (typeof payload[0][0] === 'string' && payload[0].length === 1) {
          return payload[0][0]
        }
        return (payload[0] as Array<unknown>)
          .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
          .join('')
      }
    }
    throw new Error('Unexpected GTX payload')
  }
  throw new Error('GTX single HTTP 429')
}

const GTX_BATCH_DELIM = '\n[[999888]]\n'
const GTX_BATCH_SPLIT_RE = /\s*(?:\[\s*\[\s*999888\s*\]\s*\]|【\s*【\s*999888\s*】\s*】|\[\s*999888\s*\])\s*/

async function translateJoinedGoogleGtx(texts: string[], target: string): Promise<string[]> {
  if (texts.length === 1) {
    return [await translateSingleGoogleGtx(texts[0], target)]
  }
  const joined = texts.join(GTX_BATCH_DELIM)
  const translatedJoined = await translateSingleGoogleGtx(joined, target)
  const parts = translatedJoined.split(GTX_BATCH_SPLIT_RE)
  if (parts.length === texts.length) {
    return parts.map((p) => p.trim())
  }
  // If delimiter count mismatched, split in half recursively
  if (texts.length > 2) {
    const mid = Math.ceil(texts.length / 2)
    const left = await translateJoinedGoogleGtx(texts.slice(0, mid), target)
    await new Promise((r) => setTimeout(r, 150))
    const right = await translateJoinedGoogleGtx(texts.slice(mid), target)
    return [...left, ...right]
  }
  const out: string[] = []
  for (const t of texts) {
    out.push(await translateSingleGoogleGtx(t, target))
    await new Promise((r) => setTimeout(r, 150))
  }
  return out
}

async function translateBatchDeepTranslator(texts: string[], target: string): Promise<string[]> {
  const tl = toGoogleTarget(target)
  const protectedEntries = texts.map((t) => protectGlossary(t))
  const results = new Array<string>(texts.length)

  const MAX_ITEMS = 35
  const MAX_CHARS = 4000
  const batches: Array<Array<{ index: number; text: string }>> = []
  let current: Array<{ index: number; text: string }> = []
  let size = 0

  for (let i = 0; i < protectedEntries.length; i++) {
    const text = protectedEntries[i].protectedText
    if (!text.trim()) {
      results[i] = texts[i]
      continue
    }
    if (current.length > 0 && (current.length >= MAX_ITEMS || size + text.length + 14 > MAX_CHARS)) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push({ index: i, text })
    size += text.length + 14
  }
  if (current.length > 0) batches.push(current)

  for (const batch of batches) {
    try {
      const translated = await translateJoinedGoogleGtx(
        batch.map((b) => b.text),
        tl
      )
      for (let j = 0; j < batch.length; j++) {
        const idx = batch[j].index
        const entry = protectedEntries[idx]
        results[idx] = restoreGlossary(translated[j] || texts[idx], entry.map, entry)
      }
      await new Promise((r) => setTimeout(r, 200))
    } catch (err) {
      const msg = (err as Error).message || String(err)
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        throw err
      }
      throw err
    }
  }

  return results
}

async function translateBatchMyMemory(texts: string[], target: string): Promise<string[]> {
  const langpair = `en|${toGoogleTarget(target)}`
  const results: string[] = []

  for (const text of texts) {
    const entry = protectGlossary(text)
    const { protectedText, map } = entry
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

        translated = restoreGlossary(data.responseData?.translatedText ?? text, map, entry)
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
    try {
      const protectedEntries = texts.map((t) => protectGlossary(t))
      const q = protectedEntries.map((e) => e.protectedText)
      const results = await batchTranslateWithVertexAI(q, toGoogleTarget(target), 'en')
      return results.map((r, i) =>
        restoreGlossary(r.translatedText, protectedEntries[i].map, protectedEntries[i])
      )
    } catch (err) {
      console.warn(
        `  [translateBatch] Vertex failed for ${target} (${(err as Error).message}); falling back to Google GTX NMT`
      )
      return translateBatchDeepTranslator(texts, target)
    }
  }

  if (resolved === 'google-rest') {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) return translateBatchDeepTranslator(texts, target)
    try {
      return await translateBatchGoogleRest(texts, target, apiKey)
    } catch {
      return translateBatchDeepTranslator(texts, target)
    }
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
  chunkSize = 150
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
      await new Promise((r) => setTimeout(r, resolved === 'vertex' ? 50 : 400))
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
  'directControl',
  'productionAgent',
  'publishCut',
  'studioAcademy',
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
  'trustSafeguard',
  'forFilmmakers',
] as const

export const PRIORITY_LANDING_NAMESPACES = [
  'nav',
  'hero',
  'twoModes',
  'directControl',
  'publishCut',
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
  'twoModes.cta',
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
