#!/usr/bin/env npx tsx
/**
 * Generate cinematic "Hear the Story" MP3s for the landing audience personas.
 *
 * Each persona story (see src/config/landing/roleStoryScripts.ts) is synthesized
 * line-by-line so every character keeps its own Gemini voice and every line gets
 * its own voice-acting direction. The per-line segments are then stitched into a
 * single MP3 (with short silence gaps for pacing) via ffmpeg.
 *
 * Usage: npx tsx scripts/generate-role-stories.ts [personaId ...]
 * Requires GOOGLE_API_KEY or a Vertex service account in .env.local
 */

import { execFileSync } from 'child_process'
import * as dotenv from 'dotenv'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  ROLE_STORY_SCRIPTS,
  type RoleStoryScript,
} from '../src/config/landing/roleStoryScripts'
import type { UseCasePersonaId } from '../src/config/landing/useCasePersonasCopy'
import { resolveFfmpegBinary } from '../src/lib/ffmpeg/resolveFfmpegBinary'
import { synthesizeGeminiFlashMp3 } from '../src/lib/tts/geminiFlashTts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

dotenv.config({ path: join(PROJECT_ROOT, '.env.local') })
dotenv.config({ path: join(PROJECT_ROOT, '.env.vercel.local') })

const OUT_DIR = join(PROJECT_ROOT, 'public/audio/role-story')
const TMP_ROOT = join(PROJECT_ROOT, '.tmp/role-stories')
const SILENCE_SECONDS = 0.4
const NORMALIZED_RATE = 44100
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 3000

const FFMPEG = resolveFfmpegBinary()

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function synthesizeLineWithRetry(params: {
  text: string
  voiceId: string
  profile: string
  directorNote: string
  audioType: 'narration' | 'dialogue'
}): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await synthesizeGeminiFlashMp3({
        text: params.text,
        voiceId: params.voiceId,
        directorNotes: params.profile,
        deliveryCues: [params.directorNote],
        audioType: params.audioType,
      })
    } catch (err) {
      lastError = err
      if (attempt < RETRY_ATTEMPTS) {
        console.warn(`    retry ${attempt}/${RETRY_ATTEMPTS - 1} after error…`)
        await sleep(RETRY_DELAY_MS * attempt)
      }
    }
  }
  throw lastError
}

function makeSilenceClip(outPath: string) {
  execFileSync(
    FFMPEG,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `anullsrc=channel_layout=mono:sample_rate=${NORMALIZED_RATE}`,
      '-t',
      String(SILENCE_SECONDS),
      '-c:a',
      'libmp3lame',
      '-q:a',
      '9',
      outPath,
    ],
    { stdio: 'ignore' }
  )
}

/**
 * Concatenate segments via the ffmpeg concat filter, normalizing every input to a
 * common sample rate / channel layout so segments from different Gemini voices mix
 * cleanly. `inputs` is the ordered list of mp3 paths (line + silence segments).
 */
function concatSegments(inputs: string[], outPath: string) {
  const args: string[] = ['-y']
  for (const input of inputs) {
    args.push('-i', input)
  }
  const filterParts = inputs.map(
    (_, i) =>
      `[${i}:a]aresample=${NORMALIZED_RATE},aformat=sample_fmts=s16:channel_layouts=mono[a${i}]`
  )
  const concatInputs = inputs.map((_, i) => `[a${i}]`).join('')
  const filter = `${filterParts.join(';')};${concatInputs}concat=n=${inputs.length}:v=0:a=1[out]`
  args.push(
    '-filter_complex',
    filter,
    '-map',
    '[out]',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    outPath
  )
  execFileSync(FFMPEG, args, { stdio: 'ignore' })
}

async function buildStory(personaId: UseCasePersonaId, story: RoleStoryScript) {
  console.log(`\n▶ ${personaId} — "${story.title}" (${story.lines.length} lines)`)
  const charById = new Map(story.characters.map((c) => [c.id, c]))
  const tmpDir = join(TMP_ROOT, personaId)
  rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })

  const silencePath = join(tmpDir, 'silence.mp3')
  makeSilenceClip(silencePath)

  const segmentInputs: string[] = []
  for (let i = 0; i < story.lines.length; i++) {
    const line = story.lines[i]
    const character = charById.get(line.characterId)
    if (!character) {
      throw new Error(`Unknown characterId "${line.characterId}" in ${personaId}`)
    }
    console.log(`  [${i + 1}/${story.lines.length}] ${character.name} (${character.voiceId})`)
    const buffer = await synthesizeLineWithRetry({
      text: line.text,
      voiceId: character.voiceId,
      profile: character.profile,
      directorNote: line.directorNote,
      audioType: line.kind,
    })
    const segPath = join(tmpDir, `${String(i).padStart(3, '0')}.mp3`)
    writeFileSync(segPath, buffer)
    if (segmentInputs.length > 0) {
      segmentInputs.push(silencePath)
    }
    segmentInputs.push(segPath)
    await sleep(400)
  }

  const outFile = join(OUT_DIR, `${personaId}.mp3`)
  concatSegments(segmentInputs, outFile)
  console.log(`  → ${outFile}`)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(TMP_ROOT, { recursive: true })

  const requested = process.argv.slice(2) as UseCasePersonaId[]
  const personaIds = (
    requested.length > 0 ? requested : (Object.keys(ROLE_STORY_SCRIPTS) as UseCasePersonaId[])
  ).filter((id) => {
    if (!ROLE_STORY_SCRIPTS[id]) {
      console.warn(`Skipping unknown persona "${id}"`)
      return false
    }
    return true
  })

  for (const personaId of personaIds) {
    await buildStory(personaId, ROLE_STORY_SCRIPTS[personaId])
  }

  console.log(`\nDone — ${personaIds.length} role story file(s) written to ${OUT_DIR}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
