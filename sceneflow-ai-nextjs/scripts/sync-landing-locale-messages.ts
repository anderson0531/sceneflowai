#!/usr/bin/env npx tsx
/**
 * Sync landing page namespaces from messages/en.json into all selector locales.
 * Preserves non-landing keys in each locale file.
 *
 * Usage:
 *   npx tsx scripts/sync-landing-locale-messages.ts
 *   npx tsx scripts/sync-landing-locale-messages.ts --locale es
 *   npx tsx scripts/sync-landing-locale-messages.ts --provider google-rest
 *   npx tsx scripts/sync-landing-locale-messages.ts --provider mymemory
 *   npx tsx scripts/sync-landing-locale-messages.ts --batch-size 15 --batch 1
 *   npx tsx scripts/sync-landing-locale-messages.ts --batch-size 15 --batch 2 --skip-existing
 *   npx tsx scripts/sync-landing-locale-messages.ts --production-showcase-only --locale th
 *   npx tsx scripts/sync-landing-locale-messages.ts --namespaces=productionShowcase --batch-size 10 --batch 1
 *   npx tsx scripts/sync-landing-locale-messages.ts --fill-english --provider=vertex
 *
 * --fill-english translates every catalog string that is missing or still
 * identical to English. Strings that already differ are kept. A failed
 * locale is not written.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { LANDING_TRANSLATE_LANGUAGES } from '../src/config/landingTranslateLanguages'
import { TIER_A_HERO_LOCALES } from '../src/i18n/locale'
import {
  deepMerge,
  extractCriticalLandingFlat,
  extractLandingMessages,
  extractStaleLandingFlat,
  flattenMessages,
  LANDING_NAMESPACES,
  PRIORITY_LANDING_NAMESPACES,
  translateFlatMessages,
  unflattenMessages,
  type TranslateProvider,
} from './lib/landingMessageTranslate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

async function syncLocale(
  en: Record<string, unknown>,
  locale: string,
  provider: TranslateProvider,
  namespaces: readonly string[],
  criticalOnly: boolean
): Promise<Record<string, unknown>> {
  const landingFlat = criticalOnly
    ? extractCriticalLandingFlat(en)
    : flattenMessages(extractLandingMessages(en, namespaces))
  const translatedFlat = await translateFlatMessages(landingFlat, locale, provider)
  const translatedLanding = unflattenMessages(translatedFlat)

  const localePath = join(MESSAGES_DIR, `${locale}.json`)
  const existing = existsSync(localePath)
    ? (JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, unknown>)
    : {}

  const merged = deepMerge(existing, translatedLanding)

  const tierAPath = join(MESSAGES_DIR, 'tier-a', `${locale}.json`)
  if (existsSync(tierAPath)) {
    const overrides = JSON.parse(readFileSync(tierAPath, 'utf8')) as Record<string, unknown>
    return deepMerge(merged, overrides)
  }

  return merged
}

function setAtPath(root: Record<string, unknown>, path: string, value: string) {
  const parts = path.split('.')
  let current: Record<string, unknown> | unknown[] = root
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    const next = parts[i + 1]
    const key: string | number = /^\d+$/.test(part) ? Number(part) : part
    const container = current as Record<string, unknown>
    if (container[key as string] == null) {
      container[key as string] = /^\d+$/.test(next) ? [] : {}
    }
    current = container[key as string] as Record<string, unknown> | unknown[]
  }
  const last = parts[parts.length - 1]
  const lastKey: string | number = /^\d+$/.test(last) ? Number(last) : last
  ;(current as Record<string, unknown>)[lastKey as string] = value
}

/**
 * Overlay translations onto a full English clone so skipped identifiers stay,
 * then restore strings that were already translated.
 */
function applyFill(
  en: Record<string, unknown>,
  existing: Record<string, unknown>,
  translatedFlat: Record<string, string>
): Record<string, unknown> {
  const out = structuredClone(en)
  const enFlat = flattenMessages(en)
  const existingFlat = flattenMessages(existing)
  for (const [path, enValue] of Object.entries(enFlat)) {
    if (translatedFlat[path] !== undefined) {
      setAtPath(out, path, translatedFlat[path])
      continue
    }
    const current = existingFlat[path]
    if (current !== undefined && current !== enValue) {
      setAtPath(out, path, current)
    }
  }
  return out
}

function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current == null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[part]
  }, obj)
}

/**
 * Keep reviewed translations. Drop empty strings and overrides that are still
 * the English source — those are not reviews, and array replacement would
 * wipe a fresh translation of the same section.
 */
function pruneReviewedOverlay(override: unknown, en: Record<string, unknown>, path = ''): unknown {
  if (typeof override === 'string') {
    if (!override.trim()) return undefined
    const source = path ? getAtPath(en, path) : undefined
    if (typeof source === 'string' && override === source) return undefined
    return override
  }
  if (Array.isArray(override)) {
    const pruned = override.map((item, index) =>
      pruneReviewedOverlay(item, en, path ? `${path}.${index}` : String(index))
    )
    if (pruned.some((item) => item === undefined)) return undefined
    return pruned
  }
  if (override && typeof override === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(override)) {
      const childPath = path ? `${path}.${key}` : key
      const pruned = pruneReviewedOverlay(value, en, childPath)
      if (pruned !== undefined) out[key] = pruned
    }
    return Object.keys(out).length > 0 ? out : undefined
  }
  return undefined
}

function applyTierA(locale: string, en: Record<string, unknown>, messages: Record<string, unknown>): Record<string, unknown> {
  const tierAPath = join(MESSAGES_DIR, 'tier-a', `${locale}.json`)
  if (!existsSync(tierAPath)) return messages
  const overrides = JSON.parse(readFileSync(tierAPath, 'utf8')) as Record<string, unknown>
  const pruned = pruneReviewedOverlay(overrides, en)
  if (!pruned || typeof pruned !== 'object') return messages
  console.log('  Applied tier-a overrides')
  return deepMerge(messages, pruned as Record<string, unknown>)
}

async function fillLocale(
  en: Record<string, unknown>,
  locale: string,
  provider: TranslateProvider,
  previousEn: Record<string, unknown> | null
): Promise<Record<string, unknown>> {
  const localePath = join(MESSAGES_DIR, `${locale}.json`)
  const existing = existsSync(localePath)
    ? (JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, unknown>)
    : {}
  const stale = extractStaleLandingFlat(en, existing, previousEn)
  const staleCount = Object.keys(stale).length
  console.log(`  ${staleCount} strings missing, still English, or changed since the baseline`)
  if (staleCount === 0) return applyTierA(locale, en, existing)

  // Small batches keep the translation model from rewriting one string with
  // facts taken from a neighboring string.
  const translatedFlat = await translateFlatMessages(stale, locale, provider, 8)
  return applyTierA(locale, en, applyFill(en, existing, translatedFlat))
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function parseNamespacesArg(): readonly string[] | null {
  const fromEquals = process.argv.find((a) => a.startsWith('--namespaces='))?.split('=')[1]
  const fromFlag =
    process.argv.includes('--namespaces') && process.argv.indexOf('--namespaces') >= 0
      ? process.argv[process.argv.indexOf('--namespaces') + 1]
      : undefined
  const raw = fromEquals ?? fromFlag
  if (!raw) return null
  return raw.split(',').map((ns) => ns.trim()).filter(Boolean)
}

function isLocaleSynced(existing: Record<string, unknown>, syncScope: string): boolean {
  if (syncScope === 'productionShowcase') {
    const showcase = existing.productionShowcase as Record<string, unknown> | undefined
    const badge = showcase?.badge
    return Boolean(
      badge &&
        typeof badge === 'string' &&
        badge !== 'Production Examples' &&
        Array.isArray(showcase?.cards) &&
        showcase.cards.length === 6
    )
  }

  const showcase = existing.useCasesShowcase as Record<string, unknown> | undefined
  const hero = existing.hero as Record<string, unknown> | undefined
  const launchCta = String(hero?.ctaPrimaryLaunch ?? '')
  return Boolean(
    showcase?.cta &&
      hero?.ctaPrimaryLaunch &&
      !launchCta.includes('Launch Your Studio ($9)')
  )
}

async function main() {
  const enPath = join(MESSAGES_DIR, 'en.json')
  if (!existsSync(enPath)) {
    console.error('Missing messages/en.json')
    process.exit(1)
  }

  const providerArg = process.argv.find((a) => a.startsWith('--provider='))?.split('=')[1]
  const provider = (providerArg ?? 'auto') as TranslateProvider
  const fillEnglish = process.argv.includes('--fill-english')
  const baselineArg = process.argv.find((a) => a.startsWith('--baseline='))?.split('=')[1]
  const previousEn =
    fillEnglish && baselineArg && existsSync(baselineArg)
      ? (JSON.parse(readFileSync(baselineArg, 'utf8')) as Record<string, unknown>)
      : null
  if (fillEnglish && baselineArg && !previousEn) {
    console.error(`Missing baseline catalog: ${baselineArg}`)
    process.exit(1)
  }
  const priorityOnly = process.argv.includes('--priority-only')
  const criticalOnly = process.argv.includes('--critical-only')
  const productionShowcaseOnly = process.argv.includes('--production-showcase-only')
  const customNamespaces = parseNamespacesArg()
  const namespaces = criticalOnly
    ? []
    : customNamespaces
      ? customNamespaces
      : productionShowcaseOnly
        ? (['productionShowcase'] as readonly string[])
        : priorityOnly
          ? PRIORITY_LANDING_NAMESPACES
          : LANDING_NAMESPACES
  const syncScope = fillEnglish
    ? 'fill-english'
    : criticalOnly
      ? 'landing-critical'
      : customNamespaces?.length === 1 && customNamespaces[0] === 'productionShowcase'
        ? 'productionShowcase'
        : productionShowcaseOnly
          ? 'productionShowcase'
          : priorityOnly
            ? 'landing-priority'
            : 'landing'

  const en = JSON.parse(readFileSync(enPath, 'utf8')) as Record<string, unknown>
  const localeArgIndex = process.argv.indexOf('--locale')
  const onlyLocale = localeArgIndex >= 0 ? process.argv[localeArgIndex + 1] : null
  const skipExisting = process.argv.includes('--skip-existing')
  const batchSize = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--batch-size='))?.split('=')[1] ??
      (process.argv.includes('--batch-size')
        ? process.argv[process.argv.indexOf('--batch-size') + 1]
        : undefined),
    0
  )
  const batchNumber = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--batch='))?.split('=')[1] ??
      (process.argv.includes('--batch') ? process.argv[process.argv.indexOf('--batch') + 1] : undefined),
    1
  )
  const localeDelayArg = process.argv.find((a) => a.startsWith('--locale-delay-ms='))?.split('=')[1]
  const localeDelayMs =
    localeDelayArg === undefined
      ? 3000
      : Number.isFinite(Number(localeDelayArg)) && Number(localeDelayArg) >= 0
        ? Math.floor(Number(localeDelayArg))
        : 3000

  let targets = onlyLocale
    ? [onlyLocale]
    : LANDING_TRANSLATE_LANGUAGES.map((l) => l.code).filter((c) => c !== 'en')

  if (batchSize > 0) {
    const start = (batchNumber - 1) * batchSize
    const end = start + batchSize
    targets = targets.slice(start, end)
    console.log(
      `Batch ${batchNumber}: locales ${start + 1}-${Math.min(end, start + targets.length)} (${targets.length} codes)`
    )
    if (targets.length === 0) {
      console.log('No locales in this batch — increase batch number or reduce batch size.')
      return
    }
  }

  mkdirSync(MESSAGES_DIR, { recursive: true })

  const reviewedMeta: Record<string, { tier: string; mt: boolean; scope: string }> = {}
  const failedLocales: string[] = []

  for (const locale of targets) {
    const localePath = join(MESSAGES_DIR, `${locale}.json`)
    if (skipExisting && existsSync(localePath)) {
      const existing = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, unknown>
      if (isLocaleSynced(existing, syncScope)) {
        console.log(`\n=== ${locale} ===`)
        console.log(`  Skipped (${syncScope} already synced)`)
        continue
      }
    }

    console.log(`\n=== ${locale} ===`)
    try {
      const messages = fillEnglish
        ? await fillLocale(en, locale, provider, previousEn)
        : await syncLocale(en, locale, provider, namespaces, criticalOnly)
      writeFileSync(join(MESSAGES_DIR, `${locale}.json`), `${JSON.stringify(messages, null, 2)}\n`)

      const tierAPath = join(MESSAGES_DIR, 'tier-a', `${locale}.json`)
      reviewedMeta[locale] = {
        tier: (TIER_A_HERO_LOCALES as readonly string[]).includes(locale)
          ? existsSync(tierAPath)
            ? 'A-reviewed'
            : 'A-pending-review'
          : 'B-mt',
        mt: true,
        scope: syncScope,
      }
      console.log(`Wrote messages/${locale}.json (landing namespaces synced)`)
    } catch (err) {
      failedLocales.push(locale)
      console.error(`  Failed for ${locale} (left unchanged): ${(err as Error).message}`)
    }

    if (localeDelayMs > 0) {
      console.log(`  Cooling down ${localeDelayMs}ms before next locale...`)
      await new Promise((r) => setTimeout(r, localeDelayMs))
    }
  }

  const reviewedPath = join(MESSAGES_DIR, '_reviewed.json')
  const existingReviewed = existsSync(reviewedPath)
    ? (JSON.parse(readFileSync(reviewedPath, 'utf8')) as Record<string, unknown>)
    : {}

  writeFileSync(
    reviewedPath,
    `${JSON.stringify(
      {
        ...existingReviewed,
        ...(fillEnglish
          ? {
              landingFill: {
                provider,
                scope: syncScope,
                batchSize: batchSize || null,
                batchNumber: batchSize > 0 ? batchNumber : null,
                syncedAt: new Date().toISOString(),
              },
            }
          : {
              productionShowcaseSync: {
                provider,
                scope: syncScope,
                namespaces: criticalOnly ? [] : [...namespaces],
                batchSize: batchSize || null,
                batchNumber: batchSize > 0 ? batchNumber : null,
                syncedAt: new Date().toISOString(),
              },
            }),
        locales: {
          ...((existingReviewed.locales as Record<string, unknown> | undefined) ?? {}),
          ...reviewedMeta,
        },
      },
      null,
      2
    )}\n`
  )
  console.log('\nWrote messages/_reviewed.json')
  if (failedLocales.length > 0) {
    console.error(`Failed locales: ${failedLocales.join(', ')}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
