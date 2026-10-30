#!/usr/bin/env npx tsx
/**
 * Synthesize multilanguage dubbed narration audio (MP3) for the 5 hero sequence sections:
 *   1. friction ("The friction we remove")
 *   2. control ("No technical filmmaking required")
 *   3. agent ("Production Agent • Autonomous Studio Builder")
 *   4. cut ("The cut you publish")
 *   5. academy ("SceneFlow Studio Academy & Just-In-Time Training")
 *
 * Uses Ana's canonical multilingual voice (CHAR_ANA: Sarah/Bella EXAVITQu4vr4xnSDxMaL
 * with ElevenLabs v3 across es, pt, hi, zh, ar, th).
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  ANA_CHARACTER_VOICE,
  HERO_SECTION_DUB_BEATS,
  type HeroDubLocaleId,
  type HeroVideoScript,
} from '../src/config/landing/heroSectionScripts'
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

const SECTION_IDS: readonly HeroVideoScript['id'][] = [
  'friction',
  'control',
  'agent',
  'cut',
  'academy',
] as const

const OUT_DIR = join(ROOT, 'tmp', 'hero-sequence-dubs')

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const force = process.argv.includes('--force')

  for (const sectionId of SECTION_IDS) {
    for (const locale of TARGET_LOCALES) {
      const outPath = join(OUT_DIR, `${sectionId}-${locale}.mp3`)
      if (!force && existsSync(outPath) && statSync(outPath).size > 2000) {
        console.log(`[skip] ${sectionId}-${locale}.mp3 already exists (${statSync(outPath).size} bytes)`)
        continue
      }

      const beats = HERO_SECTION_DUB_BEATS[sectionId][locale]
      const text = beats.join(' ... ')
      console.log(`Synthesizing ${sectionId} [${locale}] (${text.length} chars) with Ana voice (${ANA_CHARACTER_VOICE.elevenLabsVoiceId})...`)

      let buffer: Buffer | null = null
      let lastErr: unknown
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          buffer = await synthesizeElevenLabsMp3({
            text,
            voiceId: ANA_CHARACTER_VOICE.elevenLabsVoiceId,
            modelId: ANA_CHARACTER_VOICE.elevenLabsModelId,
            stability: 0.5,
          })
          break
        } catch (err) {
          lastErr = err
          console.warn(`  [retry ${attempt}/4] ${sectionId}-${locale}:`, err instanceof Error ? err.message : err)
          await new Promise((r) => setTimeout(r, 2000 * attempt))
        }
      }
      if (!buffer) {
        throw lastErr
      }

      writeFileSync(outPath, buffer)
      console.log(`  -> Wrote ${outPath} (${buffer.length} bytes)`)
    }
  }

  console.log('\nAll 30 Ana multilingual dub MP3s synthesized in', OUT_DIR)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
