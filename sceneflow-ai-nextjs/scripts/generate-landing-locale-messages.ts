#!/usr/bin/env npx tsx
/**
 * Batch-translate messages/en.json to all landing locales via Google Cloud Translation API.
 *
 * Usage:
 *   npx tsx scripts/generate-landing-locale-messages.ts
 *   npx tsx scripts/generate-landing-locale-messages.ts --locale es
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { LANDING_TRANSLATE_LANGUAGES } from '../src/config/landingTranslateLanguages'
import { TIER_A_HERO_LOCALES } from '../src/i18n/locale'
import { batchTranslateWithVertexAI } from '../src/lib/vertexai/translate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const GLOSSARY_TERMS = [
  'SceneFlow AI Studio',
  'SceneFlow AI',
  'SceneFlow',
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

const GLOSSARY_PLACEHOLDER_PREFIX = '⟦SFTERM'
const GLOSSARY_PLACEHOLDER_SUFFIX = '⟧'

function protectGlossary(text: string): { protectedText: string; map: Map<string, string> } {
  const map = new Map<string, string>()
  let protectedText = text
  GLOSSARY_TERMS.forEach((term, index) => {
    const placeholder = `${GLOSSARY_PLACEHOLDER_PREFIX}${index}${GLOSSARY_PLACEHOLDER_SUFFIX}`
    map.set(placeholder, term)
    protectedText = protectedText.split(term).join(placeholder)
  })
  return { protectedText, map }
}

function restoreGlossary(text: string, map: Map<string, string>): string {
  let restored = text
  for (const [placeholder, term] of map) {
    restored = restored.split(placeholder).join(term)
  }
  return restored
}

function flattenMessages(
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

function unflattenMessages(flat: Record<string, string>): Record<string, unknown> {
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

function toGoogleTarget(code: string): string {
  if (code === 'zh-CN' || code === 'zh-TW') return code
  if (code === 'no') return 'no'
  return code.split('-')[0]
}

async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const protectedEntries = texts.map((t) => protectGlossary(t))
  const q = protectedEntries.map((e) => e.protectedText)
  const targetCode = toGoogleTarget(target)
  const results = await batchTranslateWithVertexAI(q, targetCode, 'en')
  return results.map((r, i) => restoreGlossary(r.translatedText, protectedEntries[i].map))
}

async function translateLocale(en: Record<string, unknown>, locale: string) {
  const flat = flattenMessages(en)
  const keys = Object.keys(flat)
  const values = keys.map((k) => flat[k])
  const CHUNK = 50
  const translated: string[] = []

  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK)
    console.log(`  Translating strings ${i + 1}-${Math.min(i + chunk.length, values.length)} / ${values.length}`)
    const result = await translateBatch(chunk, locale)
    translated.push(...result)
    await new Promise((r) => setTimeout(r, 400))
  }

  const outFlat: Record<string, string> = {}
  keys.forEach((k, i) => {
    outFlat[k] = translated[i]
  })
  return unflattenMessages(outFlat)
}

async function main() {
  const enPath = join(MESSAGES_DIR, 'en.json')
  if (!existsSync(enPath)) {
    console.error('Missing messages/en.json — run: npx tsx scripts/build-landing-messages.ts')
    process.exit(1)
  }

  const offline = process.argv.includes('--offline')
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY
  const hasVertex = Boolean(process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID)
  if (!offline && !hasVertex && !apiKey) {
    console.error('Use --offline, or set VERTEX_PROJECT_ID / GOOGLE_TRANSLATE_API_KEY')
    process.exit(1)
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
        messages = await translateLocale(en, locale)
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

function deepMerge(
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

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
