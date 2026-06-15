#!/usr/bin/env npx tsx
/**
 * Generate cinematic "Hear the Story" MP3s for landing use-case examples.
 *
 * Usage:
 *   npx tsx scripts/generate-use-case-stories.ts
 *   npx tsx scripts/generate-use-case-stories.ts entertainment
 *   npx tsx scripts/generate-use-case-stories.ts entertainment/vertical-short-drama
 *
 * Requires GOOGLE_API_KEY or a Vertex service account in .env.local
 */

import { execFileSync } from 'child_process'
import * as dotenv from 'dotenv'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  USE_CASE_STORY_SCRIPTS,
  listUseCaseStoryKeys,
  parseUseCaseStoryKey,
  type UseCaseStoryKey,
} from '../src/config/landing/useCaseStoryScripts'
import type { RoleStoryScript } from '../src/config/landing/roleStoryScripts'
import { resolveFfmpegBinary } from '../src/lib/ffmpeg/resolveFfmpegBinary'
import { synthesizeGeminiFlashMp3 } from '../src/lib/tts/geminiFlashTts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

dotenv.config({ path: join(PROJECT_ROOT, '.env.local') })
dotenv.config({ path: join(PROJECT_ROOT, '.env.vercel.local') })

const OUT_ROOT = join(PROJECT_ROOT, 'public/audio/use-case-story')
const TMP_ROOT = join(PROJECT_ROOT, '.tmp/use-case-stories')
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

async function buildStory(key: UseCaseStoryKey, story: RoleStoryScript) {
  const parsed = parseUseCaseStoryKey(key)
  if (!parsed) throw new Error(`Invalid story key: ${key}`)

  const { categoryId, exampleId } = parsed
  console.log(`\n▶ ${key} — "${story.title}" (${story.lines.length} lines)`)

  const charById = new Map(story.characters.map((c) => [c.id, c]))
  const tmpDir = join(TMP_ROOT, categoryId, exampleId)
  rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })

  const silencePath = join(tmpDir, 'silence.mp3')
  makeSilenceClip(silencePath)

  const segmentInputs: string[] = []
  for (let i = 0; i < story.lines.length; i++) {
    const line = story.lines[i]
    const character = charById.get(line.characterId)
    if (!character) {
      throw new Error(`Unknown characterId "${line.characterId}" in ${key}`)
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

  const outDir = join(OUT_ROOT, categoryId)
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, `${exampleId}.mp3`)
  concatSegments(segmentInputs, outFile)
  console.log(`  → ${outFile}`)
}

function resolveStoryKeys(requested: string[]): UseCaseStoryKey[] {
  if (requested.length === 0) {
    return listUseCaseStoryKeys()
  }

  const keys = new Set<UseCaseStoryKey>()

  for (const arg of requested) {
    if (arg.includes('/')) {
      if (USE_CASE_STORY_SCRIPTS[arg as UseCaseStoryKey]) {
        keys.add(arg as UseCaseStoryKey)
      } else {
        console.warn(`Skipping unknown story key "${arg}"`)
      }
      continue
    }

    const categoryKeys = listUseCaseStoryKeys().filter((k) => k.startsWith(`${arg}/`))
    if (categoryKeys.length === 0) {
      console.warn(`Skipping unknown category "${arg}"`)
      continue
    }
    for (const k of categoryKeys) {
      keys.add(k)
    }
  }

  return listUseCaseStoryKeys().filter((k) => keys.has(k))
}

async function main() {
  mkdirSync(OUT_ROOT, { recursive: true })
  mkdirSync(TMP_ROOT, { recursive: true })

  const storyKeys = resolveStoryKeys(process.argv.slice(2))

  for (const key of storyKeys) {
    await buildStory(key, USE_CASE_STORY_SCRIPTS[key])
  }

  console.log(`\nDone — ${storyKeys.length} use-case story file(s) written under ${OUT_ROOT}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
