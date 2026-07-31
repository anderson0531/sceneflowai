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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function isLocaleSynced(existing: Record<string, unknown>): boolean {
  const showcase = existing.useCasesShowcase as Record<string, unknown> | undefined
  const hero = existing.hero as Record<string, unknown> | undefined
  return Boolean(
    showcase?.cta &&
      hero?.ctaPrimaryLaunch &&
      /\$\s*9|9\s*\$/.test(String(hero.ctaPrimaryLaunch))
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
  const priorityOnly = process.argv.includes('--priority-only')
  const criticalOnly = process.argv.includes('--critical-only')
  const namespaces = criticalOnly
    ? []
    : priorityOnly
      ? PRIORITY_LANDING_NAMESPACES
      : LANDING_NAMESPACES

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
  const localeDelayMs = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--locale-delay-ms='))?.split('=')[1],
    3000
  )

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

  for (const locale of targets) {
    const localePath = join(MESSAGES_DIR, `${locale}.json`)
    if (skipExisting && existsSync(localePath)) {
      const existing = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, unknown>
      if (isLocaleSynced(existing)) {
        console.log(`\n=== ${locale} ===`)
        console.log('  Skipped (landing already synced)')
        continue
      }
    }

    console.log(`\n=== ${locale} ===`)
    try {
      const messages = await syncLocale(en, locale, provider, namespaces, criticalOnly)
      writeFileSync(join(MESSAGES_DIR, `${locale}.json`), `${JSON.stringify(messages, null, 2)}\n`)

      const tierAPath = join(MESSAGES_DIR, 'tier-a', `${locale}.json`)
      reviewedMeta[locale] = {
        tier: (TIER_A_HERO_LOCALES as readonly string[]).includes(locale)
          ? existsSync(tierAPath)
            ? 'A-reviewed'
            : 'A-pending-review'
          : 'B-mt',
        mt: true,
        scope: criticalOnly ? 'landing-critical' : priorityOnly ? 'landing-priority' : 'landing',
      }
      console.log(`Wrote messages/${locale}.json (landing namespaces synced)`)
    } catch (err) {
      console.error(`  Failed for ${locale}: ${(err as Error).message}`)
      process.exit(1)
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
        landingSync: {
          provider,
          scope: priorityOnly ? 'landing-priority-namespaces' : 'landing-namespaces',
          batchSize: batchSize || null,
          batchNumber: batchSize > 0 ? batchNumber : null,
          syncedAt: new Date().toISOString(),
        },
        locales: reviewedMeta,
      },
      null,
      2
    )}\n`
  )
  console.log('\nWrote messages/_reviewed.json')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
