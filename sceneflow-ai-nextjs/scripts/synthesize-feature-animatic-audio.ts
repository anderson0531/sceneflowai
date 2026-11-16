#!/usr/bin/env npx tsx
/**
 * Stage 1 (Network): Synthesizes high-quality 7-language Studio Narrator (`Charon`)
 * voiceover MP3s for all 39 Key Features (`tmp/feature-animatics-build/vo/<locale>/<icon>.mp3`).
 *
 * Uses Google Cloud Chirp 3: HD (`<bcp47>-Chirp3-HD-Charon`) on Cloud Text-to-Speech v1
 * for broadcast studio quality + high RPM throughput, with automatic per-locale fallback
 * to Gemini Flash TTS (`gemini-Charon`) and ElevenLabs Multilingual v2 if needed.
 *
 * Usage:
 *   npx tsx scripts/synthesize-feature-animatic-audio.ts
 *   npx tsx scripts/synthesize-feature-animatic-audio.ts --locale en,es --force
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  KEY_FEATURE_NARRATED_PAN,
  type FeaturePanLocaleId,
} from '../src/config/landing/keyFeatureNarratedPan'
import { KEY_FEATURE_SUITES } from '../src/config/landing/keyFeatureAnimatics'
import { getVertexAIAuthToken } from '../src/lib/vertexai/client'
import { synthesizeGeminiFlashMp3 } from '../src/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '../src/lib/tts/googleTtsLocale'
import { synthesizeElevenLabsMp3 } from '../src/lib/elevenlabs/textToSpeech'
import { finalizeTextForGeminiTts } from '../src/lib/tts/textOptimizer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

const ALL_LOCALES: readonly FeaturePanLocaleId[] = [
  'en',
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

const CHIRP3_VOICE_BY_LOCALE: Record<
  FeaturePanLocaleId,
  { languageCode: string; name: string }
> = {
  en: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Charon' },
  es: { languageCode: 'es-US', name: 'es-US-Chirp3-HD-Charon' },
  pt: { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Charon' },
  hi: { languageCode: 'hi-IN', name: 'hi-IN-Chirp3-HD-Charon' },
  zh: { languageCode: 'cmn-CN', name: 'cmn-CN-Chirp3-HD-Charon' },
  ar: { languageCode: 'ar-XA', name: 'ar-XA-Chirp3-HD-Charon' },
  th: { languageCode: 'th-TH', name: 'th-TH-Chirp3-HD-Charon' },
}

const FALLBACK_ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'
const chirpUnsupportedLocales = new Set<FeaturePanLocaleId>()

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const localeArg = get('--locale')
  const locales = localeArg
    ? (localeArg.split(',').map((s) => s.trim()).filter(Boolean) as FeaturePanLocaleId[])
    : [...ALL_LOCALES]
  return {
    locales,
    force: argv.includes('--force'),
  }
}

export function buildFullFeatureNarrationText(
  icon: string,
  locale: FeaturePanLocaleId
): string {
  const spec = KEY_FEATURE_NARRATED_PAN[icon]
  if (!spec || spec.beats.length === 0) {
    throw new Error(`Missing KEY_FEATURE_NARRATED_PAN spec for "${icon}"`)
  }
  const parts = spec.beats.map((b) => b.narration[locale]?.trim() || '')
  if (parts.some((p) => p.length < 10)) {
    throw new Error(`Empty/short narration beat for "${icon}" [${locale}]`)
  }
  if (locale === 'th') {
    // Thai lacks sentence-ending periods; comma + spaces create clean inter-beat breath pauses
    return parts.join(',  ')
  }
  return parts.join('  ')
}

async function synthesizeChirp3HdCharonMp3(
  text: string,
  locale: FeaturePanLocaleId
): Promise<Buffer> {
  let accessToken: string | null = null
  try {
    accessToken = await getVertexAIAuthToken()
  } catch {
    accessToken = null
  }
  const apiKey = process.env.GOOGLE_API_KEY?.trim() || null
  if (!accessToken && !apiKey) {
    throw new Error('No Google TTS credentials available')
  }

  const voiceSpec = CHIRP3_VOICE_BY_LOCALE[locale]
  const sanitized = finalizeTextForGeminiTts(text)

  let url = 'https://texttospeech.googleapis.com/v1/text:synthesize'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  } else if (apiKey) {
    url += `?key=${apiKey}`
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      input: { text: sanitized },
      voice: {
        languageCode: voiceSpec.languageCode,
        name: voiceSpec.name,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.98,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Chirp3-HD HTTP ${res.status}: ${errText.slice(0, 260)}`)
  }

  const data = (await res.json()) as { audioContent?: string }
  if (!data.audioContent) {
    throw new Error('Chirp3-HD returned empty audioContent')
  }
  return Buffer.from(data.audioContent, 'base64')
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let idx = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (idx < items.length) {
        const current = items[idx++]
        if (current !== undefined) {
          await worker(current)
        }
      }
    })
  )
}

async function synthesizeFeatureVo(args: {
  icon: string
  locale: FeaturePanLocaleId
  text: string
  outPath: string
  force: boolean
}): Promise<'cached' | 'chirp3' | 'gemini' | '11labs'> {
  if (!args.force && existsSync(args.outPath) && statSync(args.outPath).size >= 6_000) {
    return 'cached'
  }
  mkdirSync(dirname(args.outPath), { recursive: true })

  // 1. Primary: Google Cloud Chirp 3: HD (`Charon` Studio Narrator)
  if (!chirpUnsupportedLocales.has(args.locale)) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const buf = await synthesizeChirp3HdCharonMp3(args.text, args.locale)
        if (buf.length >= 6_000) {
          writeFileSync(args.outPath, buf)
          console.log(
            `  [chirp3-charon] ${args.locale}/${args.icon}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`
          )
          return 'chirp3'
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (/does not exist|not supported|INVALID_ARGUMENT|400|404/i.test(msg)) {
          console.warn(
            `  [chirp3-charon unsupported for ${args.locale}, switching locale to gemini-Charon]: ${msg.slice(0, 140)}`
          )
          chirpUnsupportedLocales.add(args.locale)
          break
        }
        await new Promise((r) => setTimeout(r, 1200 * attempt))
      }
    }
  }

  // 2. Fallback: Gemini 2.5 Flash TTS (`gemini-Charon`) with 12 RPM pacing
  const languageCode = resolveGeminiTtsLanguageCode(args.locale)
  let lastErr: unknown
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const buf = await synthesizeGeminiFlashMp3({
        text: args.text,
        voiceId: 'gemini-Charon',
        languageCode,
        audioType: 'narration',
      })
      if (!buf || buf.length < 6_000) {
        throw new Error(`Gemini TTS buffer too small (${buf?.length ?? 0} bytes)`)
      }
      if (buf.length > 420_000) {
        throw new Error(`Gemini TTS buffer unexpectedly huge (${buf.length} bytes)`)
      }
      writeFileSync(args.outPath, buf)
      console.log(
        `  [gemini-charon] ${args.locale}/${args.icon}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`
      )
      await new Promise((r) => setTimeout(r, 5_300))
      return 'gemini'
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      const isRateLimit = /429|RESOURCE_EXHAUSTED|Quota exceeded/i.test(msg)
      const waitMs = isRateLimit ? 18_000 + attempt * 8_000 : 2_500 * attempt
      console.warn(
        `  [gemini retry ${attempt}/5] ${args.locale}/${args.icon} waiting ${(waitMs / 1000).toFixed(0)}s: ${msg.slice(0, 150)}`
      )
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }

  // 3. Secondary Fallback: ElevenLabs Multilingual v2
  if (process.env.ELEVENLABS_API_KEY) {
    const buf = await synthesizeElevenLabsMp3({
      text: args.text,
      voiceId: FALLBACK_ELEVENLABS_VOICE_ID,
      modelId: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.78,
    })
    writeFileSync(args.outPath, buf)
    console.log(
      `  [11labs] ${args.locale}/${args.icon}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`
    )
    return '11labs'
  }

  throw lastErr
}

async function main() {
  const { locales, force } = parseArgs(process.argv.slice(2))
  const voRoot = join(ROOT, 'tmp', 'feature-animatics-build', 'vo')
  mkdirSync(voRoot, { recursive: true })

  const orderedIcons = KEY_FEATURE_SUITES.flatMap((s) => s.featureIcons)
  console.log(
    `Synthesizing Studio Narrator VO for ${orderedIcons.length} features × ${locales.length} locales (${orderedIcons.length * locales.length} total tracks)...`
  )

  for (const locale of locales) {
    console.log(`\n=== Locale [${locale}] (${orderedIcons.length} features) ===`)
    const tasks = orderedIcons.map((icon) => ({
      icon,
      locale,
      text: buildFullFeatureNarrationText(icon, locale),
      outPath: join(voRoot, locale, `${icon}.mp3`),
    }))

    // Probe the first uncached item so we know if Chirp3-HD is supported for this locale before fanning out
    const firstUncached = tasks.find(
      (t) => force || !existsSync(t.outPath) || statSync(t.outPath).size < 6_000
    )
    if (firstUncached) {
      await synthesizeFeatureVo({ ...firstUncached, force })
    }

    const concurrency = chirpUnsupportedLocales.has(locale) ? 1 : 5
    await runPool(tasks, concurrency, async (task) => {
      await synthesizeFeatureVo({ ...task, force })
    })
  }

  console.log(`\n✓ All ${orderedIcons.length * locales.length} Studio Narrator VO MP3s ready in tmp/feature-animatics-build/vo/`)
}

main().catch((err) => {
  console.error('\n[synthesize-feature-animatic-audio] Fatal error:', err)
  process.exit(1)
})
