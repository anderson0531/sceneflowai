#!/usr/bin/env npx tsx
/**
 * Offline locale translation for landing messages.
 * Uses Google Cloud Translation API (GOOGLE_TRANSLATE_API_KEY / GOOGLE_API_KEY).
 *
 * Usage:
 *   npx tsx scripts/offline-translate-locale.ts --locale th
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2'

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const LOCALE_GOOGLE: Record<string, string> = { th: 'th', es: 'es' }
const BATCH_SIZE = 50

const GLOSSARY_TERMS = [
  'SceneFlow AI Studio', 'SceneFlow AI', 'SceneFlow', 'Blueprint', 'Production Mixer',
  'Beat Frames', 'Audience Resonance', 'Screening Room', 'Reference Library',
  'Final Cut', 'Premiere', 'Animatic', 'Express storyboard', 'BYOK', 'Whop', 'Explorer',
  'Vertex AI', 'ElevenLabs', 'Google Cloud', 'Gemini Studio', 'Google Flow',
  'Imagen 4', 'Veo 3.1', 'Ken Burns', 'F2V', 'MP4', 'TTS', 'GDPR', 'AES-256', 'CDN', 'YouTube',
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

function flattenMessages(obj: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (typeof obj === 'string') {
    if (prefix) out[prefix] = obj
    return out
  }
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index)
      if (typeof value === 'string') out[path] = value
      else if (value && typeof value === 'object') flattenMessages(value, path, out)
    })
    return out
  }
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      flattenMessages(value, prefix ? `${prefix}.${key}` : key, out)
    }
  }
  return out
}

function deepMerge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const out = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out
}

function shouldSkipKey(key: string, value: string): boolean {
  if (key.endsWith('.id')) return true
  if (/^https?:\/\//.test(value)) return true
  return false
}

function applyTranslations(obj: unknown, prefix: string, valueMap: Map<string, string>): unknown {
  if (typeof obj === 'string') {
    if (shouldSkipKey(prefix, obj)) return obj
    return valueMap.get(obj) ?? obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const path = prefix ? `${prefix}.${index}` : String(index)
      return typeof item === 'string'
        ? shouldSkipKey(path, item) ? item : valueMap.get(item) ?? item
        : applyTranslations(item, path, valueMap)
    })
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      out[key] = applyTranslations(value, prefix ? `${prefix}.${key}` : key, valueMap)
    }
    return out
  }
  return obj
}

async function translateBatchGoogle(
  texts: string[],
  target: string,
  apiKey: string
): Promise<string[]> {
  const protectedEntries = texts.map((t) => protectGlossary(t))
  const q = protectedEntries.map((e) => e.protectedText)

  const response = await fetch(`${GOOGLE_TRANSLATE_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, target, source: 'en', format: 'text' }),
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

async function main() {
  const localeArg = process.argv.find((a) => a.startsWith('--locale='))?.split('=')[1]
    ?? (process.argv.includes('--locale') ? process.argv[process.argv.indexOf('--locale') + 1] : null)

  if (!localeArg || !LOCALE_GOOGLE[localeArg]) {
    console.error('Usage: npx tsx scripts/offline-translate-locale.ts --locale th')
    process.exit(1)
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error('Set GOOGLE_TRANSLATE_API_KEY or GOOGLE_API_KEY in .env.local')
    process.exit(1)
  }

  const enPath = join(MESSAGES_DIR, 'en.json')
  if (!existsSync(enPath)) {
    console.error('Run npm run i18n:build-en first')
    process.exit(1)
  }

  const en = JSON.parse(readFileSync(enPath, 'utf8')) as Record<string, unknown>
  const enFlat = flattenMessages(en)
  const uniqueValues = [...new Set(
    Object.entries(enFlat)
      .filter(([k, v]) => !shouldSkipKey(k, v))
      .map(([, v]) => v)
  )]

  console.log(`Batch-translating ${uniqueValues.length} unique strings to ${localeArg}...`)

  const valueCache: Record<string, string> = {}
  for (let i = 0; i < uniqueValues.length; i += BATCH_SIZE) {
    const chunk = uniqueValues.slice(i, i + BATCH_SIZE)
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(uniqueValues.length / BATCH_SIZE)} (${chunk.length} strings)`)
    const translated = await translateBatchGoogle(chunk, LOCALE_GOOGLE[localeArg], apiKey)
    chunk.forEach((original, idx) => {
      valueCache[original] = translated[idx]
    })
    await new Promise((r) => setTimeout(r, 300))
  }

  const valueMap = new Map(Object.entries(valueCache))
  let result = applyTranslations(en, '', valueMap) as Record<string, unknown>

  const tierAPath = join(MESSAGES_DIR, 'tier-a', `${localeArg}.json`)
  if (existsSync(tierAPath)) {
    result = deepMerge(result, JSON.parse(readFileSync(tierAPath, 'utf8')))
    console.log('Applied tier-a overrides')
  }

  writeFileSync(join(MESSAGES_DIR, `${localeArg}.json`), `${JSON.stringify(result, null, 2)}\n`)

  let translatedCount = 0
  const thFlat = flattenMessages(result)
  for (const [k, v] of Object.entries(enFlat)) {
    if (!shouldSkipKey(k, v) && thFlat[k] !== v) translatedCount++
  }
  console.log(`Wrote messages/${localeArg}.json (${translatedCount} translated leaf strings)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
