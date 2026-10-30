#!/usr/bin/env npx tsx
/**
 * Synthesize multilanguage dubbed narration audio (MP3) for the 4 Key Features
 * Room Overview films:
 *   1. series-desk      ("Series Room")
 *   2. blueprint-board  ("Blueprint Room")
 *   3. production-stage ("Production Stage")
 *   4. screening-room   ("Screening Room")
 *
 * Uses Ana's canonical multilingual voice (CHAR_ANA: EXAVITQu4vr4xnSDxMaL
 * with ElevenLabs v3 across es, pt, hi, zh, ar, th).
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { FEATURE_ROOM_IDS, type FeatureRoomId } from '../src/config/landing/featureRoomMedia'
import {
  ANA_CHARACTER_VOICE,
  FEATURE_ROOM_SCRIPTS,
  type HeroDubLocaleId,
} from '../src/config/landing/featureRoomScripts'
import { synthesizeElevenLabsMp3 } from '../src/lib/elevenlabs/textToSpeech'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

const TARGET_LOCALES: readonly Exclude<HeroDubLocaleId, 'en'>[] = [
  'es',
  'pt',
  'hi',
  'zh',
  'ar',
  'th',
] as const

const OUT_DIR = join(ROOT, 'tmp', 'feature-room-dubs')

type SynthJob = {
  roomId: FeatureRoomId
  locale: Exclude<HeroDubLocaleId, 'en'>
  outPath: string
  text: string
}

async function synthesizeJob(job: SynthJob) {
  console.log(
    `Synthesizing ${job.roomId} [${job.locale}] (${job.text.length} chars) with Ana voice (${ANA_CHARACTER_VOICE.elevenLabsVoiceId})...`
  )
  let buffer: Buffer | null = null
  let lastErr: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      buffer = await synthesizeElevenLabsMp3({
        text: job.text,
        voiceId: ANA_CHARACTER_VOICE.elevenLabsVoiceId,
        modelId: ANA_CHARACTER_VOICE.elevenLabsModelId,
        stability: 0.5,
      })
      break
    } catch (err) {
      lastErr = err
      console.warn(
        `  [retry ${attempt}/4] ${job.roomId}-${job.locale}:`,
        err instanceof Error ? err.message : err
      )
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
  if (!buffer) {
    throw lastErr
  }
  writeFileSync(job.outPath, buffer)
  console.log(`  -> Wrote ${job.outPath} (${buffer.length} bytes)`)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const force = process.argv.includes('--force')

  const jobs: SynthJob[] = []
  for (const roomId of FEATURE_ROOM_IDS) {
    const spec = FEATURE_ROOM_SCRIPTS[roomId]
    for (const locale of TARGET_LOCALES) {
      const outPath = join(OUT_DIR, `${roomId}-${locale}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 2000) {
        console.log(
          `[skip] ${roomId}-${locale}.mp3 already exists (${statSync(outPath).size} bytes)`
        )
        continue
      }
      const beats = spec.beatsByLocale[locale]
      const text = beats.join(' ... ')
      jobs.push({ roomId, locale, outPath, text })
    }
  }

  const concurrency = 2
  let idx = 0
  async function worker() {
    while (idx < jobs.length) {
      const current = jobs[idx++]
      if (!current) break
      await synthesizeJob(current)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  console.log('\nAll 24 Ana multilingual feature room dub MP3s synthesized in', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
