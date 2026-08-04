import { QueryTypes } from 'sequelize'
import {
  batchTranslateWithVertexAI,
  translateWithVertexAI,
} from '@/lib/vertexai/translate'
import { protectAll, restoreAll } from '@/lib/i18n/glossary'
import { sourceHash } from '@/lib/i18n/contentHash'
import { partitionTranslatable, type FieldKind } from '@/i18n/content/fieldRegistry'
import { DEFAULT_LOCALE } from '@/i18n/locale'

export { sourceHash }

/**
 * The database and the migration helper are imported lazily so this module can
 * be loaded — and the cache-miss path exercised — without connection
 * configuration present.
 */
async function getSequelize() {
  const { sequelize } = await import('@/config/database')
  return sequelize
}

export interface TranslateItem {
  /** Stored field path, used to decide whether the field may be translated. */
  path: string
  text: string
}

export interface TranslatedItem {
  path: string
  text: string
  /** How the value was produced. */
  state: 'source' | 'cached' | 'machine' | 'skipped'
  /** Present when the field was not translatable. */
  kind?: FieldKind
}

export interface TranslateContentOptions {
  items: TranslateItem[]
  targetLocale: string
  sourceLocale?: string
  /** Per-request names to protect, e.g. series bible characters. */
  glossary?: readonly string[]
  /** Upper bound on characters sent to the provider for this request. */
  charBudget?: number
}

export interface TranslateContentResult {
  items: TranslatedItem[]
  stats: {
    requested: number
    skipped: number
    cacheHits: number
    translated: number
    charsSent: number
    budgetExceeded: boolean
  }
}

/** Longest single string sent to the provider. */
const MAX_TEXT_LENGTH = 5000

/** Default per-request character ceiling. */
const DEFAULT_CHAR_BUDGET = 60_000

/** Provider batch size, matching the landing pipeline's chunking. */
const BATCH_SIZE = 32

let tableEnsured = false

async function ensureTableOnce(): Promise<void> {
  if (tableEnsured) return
  try {
    const { ensureContentTranslationsTable } = await import('@/lib/database/migrateI18n')
    await ensureContentTranslationsTable()
  } catch (error) {
    console.warn('[contentTranslator] table check failed:', (error as Error)?.message)
  }
  tableEnsured = true
}

async function readCache(
  hashes: string[],
  targetLocale: string
): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  if (hashes.length === 0) return found

  try {
    const sequelize = await getSequelize()
    const rows = await sequelize.query<{ source_hash: string; translated_text: string }>(
      `SELECT source_hash, translated_text
         FROM content_translations
        WHERE target_locale = :targetLocale
          AND source_hash IN (:hashes)`,
      {
        replacements: { targetLocale, hashes },
        type: QueryTypes.SELECT,
      }
    )
    for (const row of rows) found.set(row.source_hash, row.translated_text)

    if (found.size > 0) {
      // Fire-and-forget: LRU bookkeeping must never delay a render.
      sequelize
        .query(
          `UPDATE content_translations
              SET last_used_at = NOW()
            WHERE target_locale = :targetLocale
              AND source_hash IN (:hashes)`,
          { replacements: { targetLocale, hashes: [...found.keys()] } }
        )
        .catch(() => undefined)
    }
  } catch (error) {
    console.warn('[contentTranslator] cache read failed:', (error as Error)?.message)
  }

  return found
}

async function writeCache(
  entries: Array<{ hash: string; text: string }>,
  targetLocale: string,
  sourceLocale: string,
  provider: string
): Promise<void> {
  if (entries.length === 0) return

  try {
    const sequelize = await getSequelize()
    const values = entries
      .map((_, index) => `(:h${index}, :targetLocale, :sourceLocale, :t${index}, :provider, :c${index}, NOW(), NOW())`)
      .join(', ')

    const replacements: Record<string, unknown> = { targetLocale, sourceLocale, provider }
    entries.forEach((entry, index) => {
      replacements[`h${index}`] = entry.hash
      replacements[`t${index}`] = entry.text
      replacements[`c${index}`] = entry.text.length
    })

    await sequelize.query(
      `INSERT INTO content_translations
         (source_hash, target_locale, source_locale, translated_text, provider, char_count, last_used_at, created_at)
       VALUES ${values}
       ON CONFLICT (source_hash, target_locale) DO UPDATE
         SET translated_text = EXCLUDED.translated_text,
             provider        = EXCLUDED.provider,
             last_used_at    = NOW()`,
      { replacements }
    )
  } catch (error) {
    console.warn('[contentTranslator] cache write failed:', (error as Error)?.message)
  }
}

async function translateBatch(
  texts: string[],
  targetLocale: string,
  sourceLocale: string
): Promise<{ results: string[]; provider: string }> {
  if (texts.length === 1) {
    const result = await translateWithVertexAI({
      text: texts[0],
      targetLanguage: targetLocale,
      sourceLanguage: sourceLocale,
    })
    return { results: [result.translatedText], provider: 'vertex' }
  }

  const results = await batchTranslateWithVertexAI(texts, targetLocale, sourceLocale)
  return { results: results.map((r) => r.translatedText), provider: 'vertex' }
}

export interface TranslateStringsResult {
  /** Source text -> translated text. Absent keys were left in the source language. */
  translations: Map<string, string>
  /** Source texts served from the cache. */
  cacheHits: Set<string>
  charsSent: number
  budgetExceeded: boolean
}

/**
 * Cache-first translation of arbitrary strings.
 *
 * The shared core: every caller goes through here so nothing bypasses the cache
 * or the glossary. Field-level policy lives in {@link translateContent}; this
 * function performs no classification and will translate whatever it is given.
 */
export async function translateStrings(options: {
  texts: readonly string[]
  targetLocale: string
  sourceLocale?: string
  glossary?: readonly string[]
  charBudget?: number
}): Promise<TranslateStringsResult> {
  const {
    texts,
    targetLocale,
    sourceLocale = DEFAULT_LOCALE,
    glossary = [],
    charBudget = DEFAULT_CHAR_BUDGET,
  } = options

  const result: TranslateStringsResult = {
    translations: new Map(),
    cacheHits: new Set(),
    charsSent: 0,
    budgetExceeded: false,
  }

  if (targetLocale === sourceLocale) return result

  const unique = [
    ...new Set(
      texts.filter((text) => {
        const trimmed = text?.trim()
        return Boolean(trimmed) && trimmed.length <= MAX_TEXT_LENGTH
      })
    ),
  ]
  if (unique.length === 0) return result

  await ensureTableOnce()

  const hashOf = new Map<string, string>()
  for (const text of unique) hashOf.set(text, sourceHash(text, sourceLocale))

  const cached = await readCache([...new Set(hashOf.values())], targetLocale)

  const misses: Array<{ hash: string; text: string }> = []
  for (const text of unique) {
    const hash = hashOf.get(text)!
    const hit = cached.get(hash)
    if (hit !== undefined) {
      result.translations.set(text, hit)
      result.cacheHits.add(text)
    } else {
      misses.push({ hash, text })
    }
  }

  // Spend the budget on the cheapest strings first, so a truncated request still
  // fills in most of the visible copy instead of one long paragraph.
  misses.sort((a, b) => a.text.length - b.text.length)
  const planned: typeof misses = []
  let charsPlanned = 0
  for (const miss of misses) {
    if (charsPlanned + miss.text.length > charBudget) {
      result.budgetExceeded = true
      continue
    }
    charsPlanned += miss.text.length
    planned.push(miss)
  }

  for (let i = 0; i < planned.length; i += BATCH_SIZE) {
    const chunk = planned.slice(i, i + BATCH_SIZE)
    const protectedChunk = chunk.map((entry) => protectAll(entry.text, glossary))

    let translated: string[]
    let provider = 'vertex'
    try {
      const batch = await translateBatch(
        protectedChunk.map((p) => p.protectedText),
        targetLocale,
        sourceLocale
      )
      translated = batch.results
      provider = batch.provider
    } catch (error) {
      // Leave these strings in the source language. Partially localized content
      // is usable; an exception thrown inside a render path is not.
      console.warn('[contentTranslator] provider failed:', (error as Error)?.message)
      continue
    }

    const toCache: Array<{ hash: string; text: string }> = []

    chunk.forEach((entry, index) => {
      const raw = translated[index]
      if (typeof raw !== 'string' || raw.length === 0) return

      const restored = restoreAll(
        raw,
        protectedChunk[index].glossary,
        protectedChunk[index].icu
      )

      result.translations.set(entry.text, restored)
      result.charsSent += entry.text.length
      toCache.push({ hash: entry.hash, text: restored })
    })

    await writeCache(toCache, targetLocale, sourceLocale, provider)
  }

  return result
}

/**
 * Translate a batch of stored content fields, cache-first.
 *
 * Only `display` fields are translated. Everything else is returned unchanged
 * with the reason attached, so callers can render the correct affordance rather
 * than silently showing English and leaving the user to wonder why.
 */
export async function translateContent(
  options: TranslateContentOptions
): Promise<TranslateContentResult> {
  const {
    items,
    targetLocale,
    sourceLocale = DEFAULT_LOCALE,
    glossary = [],
    charBudget = DEFAULT_CHAR_BUDGET,
  } = options

  const stats = {
    requested: items.length,
    skipped: 0,
    cacheHits: 0,
    translated: 0,
    charsSent: 0,
    budgetExceeded: false,
  }

  if (targetLocale === sourceLocale) {
    return {
      items: items.map((item) => ({ ...item, state: 'source' as const })),
      stats,
    }
  }

  const { translatable, skipped } = partitionTranslatable(items)
  stats.skipped = skipped.length

  const output = new Map<string, TranslatedItem>()
  for (const item of skipped) {
    output.set(item.path, { path: item.path, text: item.text, state: 'skipped', kind: item.kind })
  }

  const translation = await translateStrings({
    texts: translatable.map((item) => item.text),
    targetLocale,
    sourceLocale,
    glossary,
    charBudget,
  })

  stats.charsSent = translation.charsSent
  stats.budgetExceeded = translation.budgetExceeded

  for (const item of translatable) {
    const translated = translation.translations.get(item.text)
    if (translated === undefined) {
      output.set(item.path, { path: item.path, text: item.text, state: 'source' })
      continue
    }
    const fromCache = translation.cacheHits.has(item.text)
    if (fromCache) stats.cacheHits += 1
    else stats.translated += 1
    output.set(item.path, {
      path: item.path,
      text: translated,
      state: fromCache ? 'cached' : 'machine',
    })
  }

  return {
    items: items.map(
      (item) => output.get(item.path) ?? { path: item.path, text: item.text, state: 'source' }
    ),
    stats,
  }
}

/**
 * Cache-backed single-string translation for the legacy `/api/translate/*`
 * endpoints, which pass raw text with no field path.
 *
 * Those endpoints serve delivery-language work (dub lines, captions, narration)
 * rather than interface localization, so field classification does not apply —
 * but they should still share the cache and the glossary.
 */
export async function translateRawText(
  text: string,
  targetLocale: string,
  sourceLocale = DEFAULT_LOCALE,
  glossary: readonly string[] = []
): Promise<string> {
  const { translations } = await translateStrings({
    texts: [text],
    targetLocale,
    sourceLocale,
    glossary,
  })
  return translations.get(text) ?? text
}

export async function translateRawTexts(
  texts: readonly string[],
  targetLocale: string,
  sourceLocale = DEFAULT_LOCALE,
  glossary: readonly string[] = []
): Promise<string[]> {
  const { translations } = await translateStrings({
    texts,
    targetLocale,
    sourceLocale,
    glossary,
  })
  return texts.map((text) => translations.get(text) ?? text)
}
