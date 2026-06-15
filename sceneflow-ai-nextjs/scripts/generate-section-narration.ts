#!/usr/bin/env npx tsx
/**
 * Generate landing-page section narration MP3s via Gemini 3.1 TTS (Algenib).
 *
 * Usage: npx tsx scripts/generate-section-narration.ts
 * Requires GOOGLE_API_KEY or Vertex service account in .env.local
 */

import * as dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { SECTION_NARRATIONS } from '../src/config/landing/sectionNarrationCopy'
import { synthesizeGeminiFlashMp3 } from '../src/lib/tts/geminiFlashTts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

dotenv.config({ path: join(PROJECT_ROOT, '.env.local') })
dotenv.config({ path: join(PROJECT_ROOT, '.env.vercel.local') })

const VOICE_ID = 'gemini-Algenib'
const DIRECTOR_NOTES = 'Clear, intelligent, and engaging'
const OUT_DIR = join(PROJECT_ROOT, 'public/audio/section-narration')

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  for (const section of SECTION_NARRATIONS) {
    const outFile = join(OUT_DIR, `${section.id}.mp3`)
    console.log(`Synthesizing ${section.id} (${section.label})…`)
    const buffer = await synthesizeGeminiFlashMp3({
      text: section.script,
      voiceId: VOICE_ID,
      directorNotes: DIRECTOR_NOTES,
    })
    writeFileSync(outFile, buffer)
    console.log(`  → ${outFile} (${buffer.length} bytes)`)
  }

  console.log(`Done — ${SECTION_NARRATIONS.length} section narration files written.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
