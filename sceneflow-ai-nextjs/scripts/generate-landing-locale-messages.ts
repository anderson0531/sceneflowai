#!/usr/bin/env npx tsx
/**
 * Batch-translate messages/en.json to all landing locales via Google Cloud Translation API.
 *
 * Usage:
 *   npx tsx scripts/generate-landing-locale-messages.ts
 *   npx tsx scripts/generate-landing-locale-messages.ts --locale es
 *   npx tsx scripts/generate-landing-locale-messages.ts --provider google-rest
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { LANDING_TRANSLATE_LANGUAGES } from '../src/config/landingTranslateLanguages'
import { TIER_A_HERO_LOCALES } from '../src/i18n/locale'
import {
  deepMerge,
  flattenMessages,
  GLOSSARY_TERMS,
  translateFlatMessages,
  unflattenMessages,
  type TranslateProvider,
} from './lib/landingMessageTranslate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

async function translateLocale(
  en: Record<string, unknown>,
  locale: string,
  provider: TranslateProvider
) {
  const flat = flattenMessages(en)
  const translatedFlat = await translateFlatMessages(flat, locale, provider)
  return unflattenMessages(translatedFlat)
}

async function main() {
  const enPath = join(MESSAGES_DIR, 'en.json')
  if (!existsSync(enPath)) {
    console.error('Missing messages/en.json — run: npx tsx scripts/build-landing-messages.ts')
    process.exit(1)
  }

  const offline = process.argv.includes('--offline')
  const providerArg = process.argv.find((a) => a.startsWith('--provider='))?.split('=')[1]
  const provider = (providerArg ?? 'auto') as TranslateProvider

  if (!offline && provider === 'auto') {
    const hasVertex = Boolean(process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID)
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY
    if (!hasVertex && !apiKey) {
      console.error(
        'Use --offline, --provider=mymemory, or set VERTEX_PROJECT_ID / GOOGLE_TRANSLATE_API_KEY'
      )
      process.exit(1)
    }
  }

  const en = JSON.parse(readFileSync(enPath, 'utf8')) as Record<string, unknown>
  const localeArgIndex = process.argv.indexOf('--locale')
  const onlyLocale = localeArgIndex >= 0 ? process.argv[localeArgIndex + 1] : null

  const targets = onlyLocale
    ? [onlyLocale]
    : LANDING_TRANSLATE_LANGUAGES.map((l) => l.code).filter((c) => c !== 'en')

  mkdirSync(MESSAGES_DIR, { recursive: true })

  const reviewedMeta: Record<string, { tier: string; mt: boolean }> = {}

  for (const locale of targets) {
    console.log(`\n=== ${locale} ===`)
    let messages: Record<string, unknown>
    if (offline) {
      messages = structuredClone(en)
      console.log('  (offline — copied from en.json)')
    } else {
      try {
        messages = await translateLocale(en, locale, provider)
      } catch (err) {
        console.warn(`  MT failed (${(err as Error).message}) — falling back to en copy`)
        messages = structuredClone(en)
      }
    }

    const tierAPath = join(MESSAGES_DIR, 'tier-a', `${locale}.json`)
    if (existsSync(tierAPath)) {
      const overrides = JSON.parse(readFileSync(tierAPath, 'utf8')) as Record<string, unknown>
      messages = deepMerge(messages, overrides)
      console.log('  Applied tier-a overrides')
    }

    writeFileSync(join(MESSAGES_DIR, `${locale}.json`), `${JSON.stringify(messages, null, 2)}\n`)
    reviewedMeta[locale] = {
      tier: (TIER_A_HERO_LOCALES as readonly string[]).includes(locale)
        ? existsSync(tierAPath)
          ? 'A-reviewed'
          : 'A-pending-review'
        : 'B-mt',
      mt: !offline,
    }
    console.log(`Wrote messages/${locale}.json`)
  }

  writeFileSync(
    join(MESSAGES_DIR, '_reviewed.json'),
    `${JSON.stringify({ glossary: GLOSSARY_TERMS, locales: reviewedMeta }, null, 2)}\n`
  )
  console.log('\nWrote messages/_reviewed.json')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
