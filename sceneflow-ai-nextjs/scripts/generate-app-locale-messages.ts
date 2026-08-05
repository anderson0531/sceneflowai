#!/usr/bin/env node
/**
 * Machine-translate the English app catalogs into every platform locale.
 *
 * Reuses the landing MT engine (provider chain, chunking, glossary and ICU
 * protection) but translates only keys whose English text changed since the last
 * build, using messages/app/_fingerprints.json. A full re-run of ~1,000 keys
 * across 38 locales is expensive; a typical change touches a handful of keys.
 *
 * Usage:
 *   npx tsx scripts/generate-app-locale-messages.ts
 *   npx tsx scripts/generate-app-locale-messages.ts --locales=es,ja --surfaces=blueprint
 *   npx tsx scripts/generate-app-locale-messages.ts --full --provider=vertex
 */

import { config } from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { APP_SURFACES, type AppSurface } from '../src/i18n/appSurfaces.ts'
import { LOCALES, DEFAULT_LOCALE } from '../src/i18n/locale.ts'
import { mergeMessages } from '../src/i18n/mergeMessages.ts'
import {
  flattenMessages,
  unflattenMessages,
  translateFlatMessages,
  type TranslateProvider,
} from './lib/landingMessageTranslate.ts'
import {
  buildFingerprints,
  changedKeys,
  readEnglishSurface,
  readFingerprints,
} from './build-app-messages.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const APP_MESSAGES_DIR = join(ROOT, 'messages', 'app')
const FINGERPRINT_PATH = join(APP_MESSAGES_DIR, '_fingerprints.json')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

function arg(name: string): string | undefined {
  const match = process.argv.find((value) => value.startsWith(`--${name}=`))
  return match?.split('=')[1]
}

function localePath(locale: string, surface: AppSurface): string {
  return join(APP_MESSAGES_DIR, locale, `${surface}.json`)
}

function readExisting(locale: string, surface: AppSurface): Record<string, unknown> {
  const path = localePath(locale, surface)
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

async function translateSurface(
  locale: string,
  surface: AppSurface,
  provider: TranslateProvider,
  full: boolean,
  previousFingerprints: ReturnType<typeof readFingerprints>
): Promise<{ written: number; skipped: number }> {
  const english = readEnglishSurface(surface)
  const flatEnglish = flattenMessages(english)
  const existing = readExisting(locale, surface)
  const flatExisting = flattenMessages(existing)

  // Translate a key when it is new to this locale, or when its English source
  // changed since the fingerprints were written.
  const changed = full ? null : changedKeys(surface, previousFingerprints)
  const pending: Record<string, string> = {}

  for (const [key, value] of Object.entries(flatEnglish)) {
    const missingHere = flatExisting[key] === undefined
    const englishChanged = changed === null || changed.has(key)
    if (missingHere || englishChanged) pending[key] = value
  }

  const skipped = Object.keys(flatEnglish).length - Object.keys(pending).length

  if (Object.keys(pending).length === 0) {
    return { written: 0, skipped }
  }

  const translatedFlat = await translateFlatMessages(pending, locale, provider)
  const merged = mergeMessages(existing, unflattenMessages(translatedFlat))

  mkdirSync(join(APP_MESSAGES_DIR, locale), { recursive: true })
  writeFileSync(localePath(locale, surface), `${JSON.stringify(merged, null, 2)}\n`)

  return { written: Object.keys(pending).length, skipped }
}

async function main() {
  const provider = (arg('provider') as TranslateProvider) || 'auto'
  const full = process.argv.includes('--full')

  const requestedLocales = arg('locales')?.split(',').map((value) => value.trim())
  const locales = (requestedLocales ?? LOCALES).filter(
    (locale) => locale !== DEFAULT_LOCALE && LOCALES.includes(locale)
  )

  const requestedSurfaces = arg('surfaces')?.split(',').map((value) => value.trim())
  const surfaces = (requestedSurfaces ?? APP_SURFACES).filter((surface): surface is AppSurface =>
    (APP_SURFACES as readonly string[]).includes(surface)
  )

  const previousFingerprints = full ? null : readFingerprints()
  if (!full && !previousFingerprints) {
    console.log('No fingerprints found — treating this as a full run.')
  }

  console.log(
    `Translating ${surfaces.length} surfaces into ${locales.length} locales (provider=${provider}, mode=${full ? 'full' : 'incremental'})`
  )

  let totalWritten = 0

  for (const locale of locales) {
    let localeWritten = 0
    let localeSkipped = 0

    for (const surface of surfaces) {
      try {
        const { written, skipped } = await translateSurface(
          locale,
          surface,
          provider,
          full,
          previousFingerprints
        )
        localeWritten += written
        localeSkipped += skipped
      } catch (error) {
        console.warn(`  ${locale}/${surface}: ${(error as Error).message}`)
      }
    }

    totalWritten += localeWritten
    console.log(
      `  ${locale}: ${localeWritten} translated, ${localeSkipped} already current`
    )
  }

  // Only advance the fingerprints once every locale has caught up, so an aborted
  // run does not mark changed keys as done.
  if (totalWritten > 0 || full) {
    writeFileSync(FINGERPRINT_PATH, `${JSON.stringify(buildFingerprints(), null, 2)}\n`)
    console.log('Updated messages/app/_fingerprints.json')
  }

  console.log(`Done — ${totalWritten} keys translated`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
