#!/usr/bin/env npx tsx
/**
 * Generate role example narration MP3s via Gemini 3.1 TTS (Algenib).
 *
 * Usage: npx tsx scripts/generate-role-example-narration.ts
 * Requires GOOGLE_API_KEY or Vertex service account in .env.local
 */

import * as dotenv from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { ROLE_EXAMPLE_NARRATIONS } from '../src/config/landing/roleExampleNarrationCopy'
import { synthesizeGeminiFlashMp3 } from '../src/lib/tts/geminiFlashTts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

dotenv.config({ path: join(PROJECT_ROOT, '.env.local') })
dotenv.config({ path: join(PROJECT_ROOT, '.env.vercel.local') })

const VOICE_ID = 'gemini-Algenib'
const DIRECTOR_NOTES = 'Clear, intelligent, and engaging'
const OUT_DIR = join(PROJECT_ROOT, 'public/audio/role-example-narration')
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 3000

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function synthesizeWithRetry(text: string): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await synthesizeGeminiFlashMp3({
        text,
        voiceId: VOICE_ID,
        directorNotes: DIRECTOR_NOTES,
      })
    } catch (err) {
      lastError = err
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`  Retry ${attempt}/${RETRY_ATTEMPTS - 1} after error…`)
        await sleep(RETRY_DELAY_MS * attempt)
      }
    }
  }
  throw lastError
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  for (const entry of ROLE_EXAMPLE_NARRATIONS) {
    const outFile = join(OUT_DIR, `${entry.id}.mp3`)
    console.log(`Synthesizing ${entry.id} (${entry.label})…`)
    const buffer = await synthesizeWithRetry(entry.script)
    writeFileSync(outFile, buffer)
    console.log(`  → ${outFile} (${buffer.length} bytes)`)
    await sleep(500)
  }

  console.log(`Done — ${ROLE_EXAMPLE_NARRATIONS.length} role example narration files written.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
