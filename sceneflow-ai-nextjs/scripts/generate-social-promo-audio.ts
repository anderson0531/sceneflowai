#!/usr/bin/env npx tsx
/**
 * Automated Google AI Studio Audio Generator for Global Paid Social Promos.
 *
 * Generates all 7-language narration blocks (`en`, `es`, `pt`, `hi`, `zh`, `ar`, `th`)
 * using Google AI Studio's `gemini-3.8-flash-lite-tts` (`generativelanguage.googleapis.com`),
 * converts raw PCM/WAV to broadcast 48kHz stereo MP3 via `ffmpeg-static`, audits each clip's
 * spoken duration against the 10-second Omni 1.2 Flash block window (`<= 9.4s`), and
 * optionally generates 30s instrumental scores via `lyria-3-clip-preview`.
 *
 * Setup:
 *   Add an API key from Google AI Studio (project `gen-lang-client-0842101693`) to `.env.local`:
 *     AI_STUDIO_PROMO_API_KEY=AIza...
 *
 * Usage:
 *   npx tsx scripts/generate-social-promo-audio.ts --spot crt-01,svc-01
 *   npx tsx scripts/generate-social-promo-audio.ts --all --with-music
 *   npx tsx scripts/generate-social-promo-audio.ts --spot crt-01 --locale en,es --voice Charon
 *   npx tsx scripts/generate-social-promo-audio.ts --all --dry-run
 */

import * as dotenv from 'dotenv'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import {
  SOCIAL_PROMO_LOCALES,
  SOCIAL_PROMO_SPOTS,
  type SocialPromoLocale,
  type SocialPromoSpotId,
} from './social-promo-sources/socialPromoScripts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

const DEFAULT_TTS_MODEL = 'gemini-3.8-flash-lite-tts'
const DEFAULT_MUSIC_MODEL = 'lyria-3-clip-preview'
const MAX_SAFE_BLOCK_VO_SEC = 9.4

interface CliArgs {
  spots: SocialPromoSpotId[]
  locales: SocialPromoLocale[]
  ttsModels: string[]
  musicModel: string
  voiceOverride?: string
  withMusic: boolean
  onlyMusic: boolean
  batchBlocks: boolean
  force: boolean
  dryRun: boolean
  delayMs: number
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const allSpotIds = Object.keys(SOCIAL_PROMO_SPOTS) as SocialPromoSpotId[]
  const rawSpots = get('--spot')
  const spots: SocialPromoSpotId[] = argv.includes('--all')
    ? allSpotIds
    : rawSpots
      ? (rawSpots
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s): s is SocialPromoSpotId => s in SOCIAL_PROMO_SPOTS))
      : ['crt-01', 'svc-01']

  const rawLocales = get('--locale')
  const locales: SocialPromoLocale[] = rawLocales
    ? (rawLocales
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter((l): l is SocialPromoLocale =>
          (SOCIAL_PROMO_LOCALES as readonly string[]).includes(l)
        ))
    : [...SOCIAL_PROMO_LOCALES]

  const extraEnvFile = get('--env-file')?.trim()
  if (extraEnvFile && existsSync(extraEnvFile)) {
    dotenv.config({ path: extraEnvFile, override: true })
  }

  const rawModels = get('--model')?.trim()
  const ttsModels = rawModels
    ? rawModels.split(',').map((m) => m.trim()).filter(Boolean)
    : [
        DEFAULT_TTS_MODEL,
        'gemini-3.8-flash-tts',
        'gemini-3.1-flash-tts-preview',
        'gemini-2.5-flash-preview-tts',
      ]

  return {
    spots,
    locales,
    ttsModels,
    musicModel: get('--music-model')?.trim() || DEFAULT_MUSIC_MODEL,
    voiceOverride: get('--voice')?.trim(),
    withMusic: argv.includes('--with-music') || argv.includes('--only-music'),
    onlyMusic: argv.includes('--only-music'),
    batchBlocks: argv.includes('--batch-blocks'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
    delayMs: Math.max(500, Number(get('--delay-ms') || 13500)),
  }
}

function resolveApiKey(): string {
  const key =
    process.env.AI_STUDIO_PROMO_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim()

  if (!key) {
    throw new Error(
      'Missing API key. Create an API key in Google AI Studio (project gen-lang-client-0842101693) and add AI_STUDIO_PROMO_API_KEY=... to .env.local'
    )
  }
  return key
}

function measureAudioDurationSec(filePath: string): number {
  const probe = spawnSync(
    FFMPEG,
    ['-i', filePath, '-f', 'null', '-'],
    { encoding: 'utf8' }
  )
  const stderr = probe.stderr || ''
  const matches = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)]
  const last = matches.at(-1)
  if (!last) return 0
  return Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3])
}

function encodeRawAudioToBroadcastMp3(args: {
  rawBuffer: Buffer
  mimeType: string
  outMp3Path: string
  isMusic?: boolean
}): number {
  mkdirSync(dirname(args.outMp3Path), { recursive: true })
  const lowerMime = args.mimeType.toLowerCase()
  const isPcm = lowerMime.includes('l16') || lowerMime.includes('pcm')
  const rateMatch = lowerMime.match(/rate=(\d+)/)
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000
  const tmpIn = `${args.outMp3Path}.raw`
  const tmpOut = `${args.outMp3Path}.part.mp3`

  writeFileSync(tmpIn, args.rawBuffer)
  try {
    const inputArgs = isPcm
      ? ['-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', tmpIn]
      : ['-i', tmpIn]

    const audioFilter = args.isMusic
      ? 'loudnorm=I=-16:TP=-1.5:LRA=11'
      : 'highpass=f=65,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-45dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=9'

    const res = spawnSync(
      FFMPEG,
      [
        '-y',
        ...inputArgs,
        '-af',
        audioFilter,
        '-ar',
        '48000',
        '-ac',
        '2',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '192k',
        tmpOut,
      ],
      { encoding: 'utf8' }
    )
    if (res.status !== 0) {
      throw new Error(`ffmpeg encode failed: ${(res.stderr || '').slice(-300)}`)
    }
    renameSync(tmpOut, args.outMp3Path)
    return measureAudioDurationSec(args.outMp3Path)
  } finally {
    if (existsSync(tmpIn)) unlinkSync(tmpIn)
    if (existsSync(tmpOut)) unlinkSync(tmpOut)
  }
}

async function callAiStudioTts(args: {
  apiKey: string
  model: string
  voiceName: string
  text: string
}): Promise<{ buffer: Buffer; mimeType: string }> {
  // Send pure target script text only — gemini-3.8-flash-lite-tts does not accept
  // systemInstruction and will speak inline direction prefixes aloud.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: args.text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: args.voiceName,
            },
          },
        },
      },
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: number; message?: string; status?: string }
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string }
        }>
      }
    }>
  }

  if (!res.ok) {
    throw new Error(
      `AI Studio TTS HTTP ${res.status} (${data.error?.status || 'ERROR'}): ${data.error?.message || 'Unknown error'}`
    )
  }

  const audioPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!audioPart?.inlineData?.data) {
    throw new Error('AI Studio TTS returned no inline audio part')
  }

  return {
    buffer: Buffer.from(audioPart.inlineData.data, 'base64'),
    mimeType: audioPart.inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000',
  }
}

async function callAiStudioLyriaMusic(args: {
  apiKey: string
  model: string
  prompt: string
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: args.prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
      },
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: number; message?: string; status?: string }
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string }
        }>
      }
    }>
  }

  if (!res.ok) {
    throw new Error(
      `AI Studio Lyria HTTP ${res.status}: ${data.error?.message || 'Unknown error'}`
    )
  }

  const audioPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!audioPart?.inlineData?.data) {
    throw new Error('AI Studio Lyria returned no inline audio part')
  }

  return {
    buffer: Buffer.from(audioPart.inlineData.data, 'base64'),
    mimeType: audioPart.inlineData.mimeType || 'audio/mpeg',
  }
}

interface SilenceGap {
  start: number
  end: number
  mid: number
  dur: number
}

function detectSilenceGaps(audioPath: string): { totalDur: number; gaps: SilenceGap[] } {
  const probe = spawnSync(
    FFMPEG,
    ['-i', audioPath, '-af', 'silencedetect=noise=-36dB:d=0.22', '-f', 'null', '-'],
    { encoding: 'utf8' }
  )
  const stderr = probe.stderr || ''
  const timeMatches = [...stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)]
  const lastTime = timeMatches.at(-1)
  const totalDur = lastTime
    ? Number(lastTime[1]) * 3600 + Number(lastTime[2]) * 60 + Number(lastTime[3])
    : 0

  const gaps: SilenceGap[] = []
  let pendingStart: number | null = null
  for (const line of stderr.split('\n')) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/)
    if (startMatch) {
      pendingStart = Number(startMatch[1])
      continue
    }
    const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/)
    if (endMatch && pendingStart !== null) {
      const end = Number(endMatch[1])
      const dur = Number(endMatch[2])
      gaps.push({ start: pendingStart, end, mid: (pendingStart + end) / 2, dur })
      pendingStart = null
    }
  }
  return { totalDur, gaps }
}

function findThreeBlockSplitPoints(
  totalDur: number,
  gaps: SilenceGap[],
  texts: [string, string, string]
): [number, number] | null {
  if (totalDur < 18) return null
  const lens = texts.map((t) => Math.max(1, t.trim().length))
  const totalChars = lens[0]! + lens[1]! + lens[2]!
  const exp1 = (lens[0]! / totalChars) * totalDur
  const exp2 = ((lens[0]! + lens[1]!) / totalChars) * totalDur
  const win = totalDur * 0.16

  const pickBest = (target: number, minTime: number, maxTime: number): SilenceGap | null => {
    const candidates = gaps.filter(
      (g) => g.mid >= minTime && g.mid <= maxTime && g.dur >= 0.32
    )
    if (candidates.length === 0) return null
    // Prefer longest silence gap; tie-break by closeness to expected character ratio
    candidates.sort((a, b) => {
      const scoreA = a.dur * 3.0 - Math.abs(a.mid - target) * 0.12
      const scoreB = b.dur * 3.0 - Math.abs(b.mid - target) * 0.12
      return scoreB - scoreA
    })
    return candidates[0]!
  }

  const g1 = pickBest(exp1, Math.max(5.0, exp1 - win), Math.min(totalDur - 10.0, exp1 + win))
  if (!g1) return null
  const g2 = pickBest(
    exp2,
    Math.max(g1.mid + 5.0, exp2 - win),
    Math.min(totalDur - 5.0, exp2 + win)
  )
  if (!g2) return null

  const d1 = g1.mid
  const d2 = g2.mid - g1.mid
  const d3 = totalDur - g2.mid
  if (d1 < 5.0 || d2 < 5.0 || d3 < 5.0 || d1 > 18.0 || d2 > 18.0 || d3 > 18.0) {
    return null
  }
  return [g1.mid, g2.mid]
}

async function synthesizeLocaleBatched(args: {
  apiKey: string
  models: string[]
  exhaustedModels: Set<string>
  voiceName: string
  locale: SocialPromoLocale
  texts: [string, string, string]
  outPaths: [string, string, string]
  delayMs: number
}): Promise<{ durations: [number, number, number]; modelUsed: string } | null> {
  const combinedText = `${args.texts[0]}\n\n\n${args.texts[1]}\n\n\n${args.texts[2]}`
  let rawAudio: { buffer: Buffer; mimeType: string } | null = null
  let modelUsed = ''
  let lastErr: unknown

  for (const model of args.models) {
    if (args.exhaustedModels.has(model)) continue
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        rawAudio = await callAiStudioTts({
          apiKey: args.apiKey,
          model,
          voiceName: args.voiceName,
          text: combinedText,
        })
        modelUsed = model
        break
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        if (/HTTP 40[13]|API key not valid|outstanding balance/i.test(msg)) throw err
        if (/per day limit exceeded|limit:\s*0|retry in \d+h|retry in [3-9]\d+m/i.test(msg)) {
          console.warn(`  [model quota exhausted] ${model} — rolling over to next model`)
          args.exhaustedModels.add(model)
          break
        }
        const retrySecMatch = msg.match(/retry in\s+(\d+(?:\.\d+)?)s/i)
        const waitMs = retrySecMatch
          ? Math.ceil((Number(retrySecMatch[1]) + 2) * 1000)
          : /429|RESOURCE_EXHAUSTED|quota/i.test(msg)
            ? 20_000 + attempt * 10_000
            : 2_500 * attempt
        console.warn(
          `  [retry ${attempt}/5] ${model} ${args.locale} (batch) waiting ${(waitMs / 1000).toFixed(0)}s -> ${msg.slice(0, 150)}`
        )
        await new Promise((r) => setTimeout(r, waitMs))
      }
    }
    if (rawAudio) break
  }

  if (!rawAudio) {
    throw lastErr || new Error('All configured Gemini TTS models exhausted their Free Tier daily quota')
  }

  await new Promise((r) => setTimeout(r, args.delayMs))

  const dir = dirname(args.outPaths[0])
  mkdirSync(dir, { recursive: true })
  const tmpRaw = join(dir, `.batch-${args.locale}.raw`)
  const tmpWav = join(dir, `.batch-${args.locale}.wav`)
  writeFileSync(tmpRaw, rawAudio.buffer)

  try {
    const lowerMime = rawAudio.mimeType.toLowerCase()
    const isPcm = lowerMime.includes('l16') || lowerMime.includes('pcm')
    const rateMatch = lowerMime.match(/rate=(\d+)/)
    const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000
    const inputArgs = isPcm
      ? ['-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', tmpRaw]
      : ['-i', tmpRaw]

    const toWav = spawnSync(
      FFMPEG,
      ['-y', ...inputArgs, '-ar', '48000', '-ac', '2', tmpWav],
      { encoding: 'utf8' }
    )
    if (toWav.status !== 0) return null

    const { totalDur, gaps } = detectSilenceGaps(tmpWav)
    const cuts = findThreeBlockSplitPoints(totalDur, gaps, args.texts)
    if (!cuts) {
      console.warn(
        `  [batch split uncertain] ${args.locale} (dur=${totalDur.toFixed(2)}s, gaps=${gaps.length}) — falling back to 3 individual block calls`
      )
      return null
    }

    const [cut1, cut2] = cuts
    const spans: Array<[number, number]> = [
      [0, cut1],
      [cut1, cut2],
      [cut2, totalDur],
    ]
    const durations: number[] = []
    for (let i = 0; i < 3; i++) {
      const [start, end] = spans[i]!
      const outPath = args.outPaths[i]!
      const tmpOut = `${outPath}.part.mp3`
      const slice = spawnSync(
        FFMPEG,
        [
          '-y',
          '-ss',
          start.toFixed(3),
          '-to',
          end.toFixed(3),
          '-i',
          tmpWav,
          '-af',
          'highpass=f=65,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-45dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=9',
          '-ar',
          '48000',
          '-ac',
          '2',
          '-c:a',
          'libmp3lame',
          '-b:a',
          '192k',
          tmpOut,
        ],
        { encoding: 'utf8' }
      )
      if (slice.status !== 0) return null
      renameSync(tmpOut, outPath)
      durations.push(measureAudioDurationSec(outPath))
    }

    return {
      durations: [durations[0]!, durations[1]!, durations[2]!],
      modelUsed,
    }
  } finally {
    if (existsSync(tmpRaw)) unlinkSync(tmpRaw)
    if (existsSync(tmpWav)) unlinkSync(tmpWav)
  }
}

async function synthesizeBlockWithRetry(args: {
  apiKey: string
  models: string[]
  exhaustedModels: Set<string>
  voiceName: string
  locale: SocialPromoLocale
  text: string
  outMp3Path: string
  force: boolean
  delayMs: number
}): Promise<{ durationSec: number; status: 'cached' | 'generated'; modelUsed: string }> {
  if (!args.force && existsSync(args.outMp3Path) && statSync(args.outMp3Path).size > 4_000) {
    const dur = measureAudioDurationSec(args.outMp3Path)
    return { durationSec: dur, status: 'cached', modelUsed: 'cached' }
  }

  let lastErr: unknown

  for (const model of args.models) {
    if (args.exhaustedModels.has(model)) continue

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const { buffer, mimeType } = await callAiStudioTts({
          apiKey: args.apiKey,
          model,
          voiceName: args.voiceName,
          text: args.text,
        })

        const durationSec = encodeRawAudioToBroadcastMp3({
          rawBuffer: buffer,
          mimeType,
          outMp3Path: args.outMp3Path,
        })

        await new Promise((r) => setTimeout(r, args.delayMs))
        return { durationSec, status: 'generated', modelUsed: model }
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        const isFatalAuth = /HTTP 40[13]|API key not valid|outstanding balance/i.test(msg)
        if (isFatalAuth) throw err
        const isModelQuotaExhausted =
          /per day limit exceeded|limit:\s*0|retry in \d+h|retry in [3-9]\d+m/i.test(msg)
        if (isModelQuotaExhausted) {
          console.warn(`  [model quota exhausted] ${model} — rolling over to next model`)
          args.exhaustedModels.add(model)
          break
        }
        const retrySecMatch = msg.match(/retry in\s+(\d+(?:\.\d+)?)s/i)
        const isRateLimit = /429|RESOURCE_EXHAUSTED|quota/i.test(msg)
        const waitMs = retrySecMatch
          ? Math.ceil((Number(retrySecMatch[1]) + 2) * 1000)
          : isRateLimit
            ? 20_000 + attempt * 10_000
            : 2_500 * attempt
        console.warn(
          `  [retry ${attempt}/5] ${model} ${args.locale} waiting ${(waitMs / 1000).toFixed(0)}s -> ${msg.slice(0, 150)}`
        )
        await new Promise((r) => setTimeout(r, waitMs))
      }
    }
  }

  throw lastErr || new Error('All configured Gemini TTS models exhausted their Free Tier daily quota')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.spots.length === 0) {
    throw new Error('No valid spots selected. Use --spot crt-01,svc-01 or --all')
  }

  console.log(`\nSceneFlow Global Social Promo Audio Generator`)
  console.log(`  TTS Models: ${args.ttsModels.join(' -> ')}`)
  console.log(`  Spots     : ${args.spots.join(', ')}`)
  console.log(`  Locales   : ${args.locales.join(', ')}`)
  console.log(`  Music     : ${args.withMusic ? args.musicModel : 'disabled (pass --with-music to enable)'}`)
  console.log(`  Dry Run   : ${args.dryRun}\n`)

  const totalVoBlocks = args.onlyMusic ? 0 : args.spots.length * args.locales.length * 3
  const totalMusicTracks = args.withMusic ? args.spots.length : 0

  if (args.dryRun) {
    for (const spotId of args.spots) {
      const spot = SOCIAL_PROMO_SPOTS[spotId]
      const voice = args.voiceOverride || spot.defaultVoice
      console.log(`[DRY RUN] ${spot.id.toUpperCase()} (${spot.track}) · voice=${voice} · ${spot.title}`)
      if (!args.onlyMusic) {
        for (const locale of args.locales) {
          for (const block of spot.blocks) {
            const outPath = join(
              ROOT,
              'tmp',
              'social-promos-build',
              spot.id,
              'vo',
              locale,
              `block-0${block.blockNumber}.mp3`
            )
            console.log(
              `  VO [${locale}] block-0${block.blockNumber} (${block.vo[locale].length} chars) -> ${outPath.replace(`${ROOT}/`, '')}`
            )
          }
        }
      }
      if (args.withMusic) {
        const musicPath = join(ROOT, 'tmp', 'social-promos-build', spot.id, 'music', 'score-30s.mp3')
        console.log(`  MUSIC -> ${musicPath.replace(`${ROOT}/`, '')}`)
      }
    }
    console.log(`\nDry run complete: ${totalVoBlocks} VO blocks + ${totalMusicTracks} music tracks planned.`)
    return
  }

  const apiKey = resolveApiKey()
  const exhaustedModels = new Set<string>()
  const warnings: string[] = []

  for (const spotId of args.spots) {
    const spot = SOCIAL_PROMO_SPOTS[spotId]
    const voice = args.voiceOverride || spot.defaultVoice
    const spotDir = join(ROOT, 'tmp', 'social-promos-build', spot.id)
    const audit: Record<string, Record<string, { file: string; durationSec: number; fits10s: boolean; modelUsed: string }>> = {}

    console.log(`\n=== ${spot.id.toUpperCase()} — ${spot.title} (voice: ${voice}) ===`)

    if (!args.onlyMusic) {
      for (const locale of args.locales) {
        audit[locale] = {}
        const blockPaths: [string, string, string] = [
          join(spotDir, 'vo', locale, 'block-01.mp3'),
          join(spotDir, 'vo', locale, 'block-02.mp3'),
          join(spotDir, 'vo', locale, 'block-03.mp3'),
        ]
        const allMissingOrForce =
          args.force || blockPaths.every((p) => !existsSync(p) || statSync(p).size <= 4_000)

        if (args.batchBlocks && allMissingOrForce) {
          const batched = await synthesizeLocaleBatched({
            apiKey,
            models: args.ttsModels,
            exhaustedModels,
            voiceName: voice,
            locale,
            texts: [
              spot.blocks[0].vo[locale],
              spot.blocks[1].vo[locale],
              spot.blocks[2].vo[locale],
            ],
            outPaths: blockPaths,
            delayMs: args.delayMs,
          })
          if (batched) {
            for (let i = 0; i < 3; i++) {
              const dur = batched.durations[i]!
              const fits10s = dur <= MAX_SAFE_BLOCK_VO_SEC
              const flag = fits10s ? 'OK' : `LONG (> ${MAX_SAFE_BLOCK_VO_SEC}s)`
              if (!fits10s) {
                warnings.push(
                  `${spot.id} [${locale}] block-0${i + 1}: ${dur.toFixed(2)}s (> ${MAX_SAFE_BLOCK_VO_SEC}s)`
                )
              }
              console.log(
                `  [batched:${batched.modelUsed}] ${spot.id}/${locale}/block-0${i + 1}.mp3 — ${dur.toFixed(2)}s [${flag}]`
              )
              audit[locale][`block-0${i + 1}`] = {
                file: blockPaths[i]!.replace(`${ROOT}/`, ''),
                durationSec: Number(dur.toFixed(2)),
                fits10s,
                modelUsed: `${batched.modelUsed}:batched`,
              }
            }
            continue
          }
        }

        for (const block of spot.blocks) {
          const outMp3Path = join(spotDir, 'vo', locale, `block-0${block.blockNumber}.mp3`)
          const result = await synthesizeBlockWithRetry({
            apiKey,
            models: args.ttsModels,
            exhaustedModels,
            voiceName: voice,
            locale,
            text: block.vo[locale],
            outMp3Path,
            force: args.force,
            delayMs: args.delayMs,
          })

          const fits10s = result.durationSec <= MAX_SAFE_BLOCK_VO_SEC
          const flag = fits10s ? 'OK' : `LONG (> ${MAX_SAFE_BLOCK_VO_SEC}s)`
          if (!fits10s) {
            warnings.push(
              `${spot.id} [${locale}] block-0${block.blockNumber}: ${result.durationSec.toFixed(2)}s (> ${MAX_SAFE_BLOCK_VO_SEC}s)`
            )
          }
          console.log(
            `  [${result.status}:${result.modelUsed}] ${spot.id}/${locale}/block-0${block.blockNumber}.mp3 — ${result.durationSec.toFixed(2)}s [${flag}]`
          )
          audit[locale][`block-0${block.blockNumber}`] = {
            file: outMp3Path.replace(`${ROOT}/`, ''),
            durationSec: Number(result.durationSec.toFixed(2)),
            fits10s,
            modelUsed: result.modelUsed,
          }
        }
      }

      mkdirSync(spotDir, { recursive: true })
      writeFileSync(
        join(spotDir, 'vo-audit.json'),
        JSON.stringify(
          {
            spotId: spot.id,
            ttsModels: args.ttsModels,
            voice,
            generatedAt: new Date().toISOString(),
            blocks: audit,
          },
          null,
          2
        )
      )
    }

    if (args.withMusic) {
      const musicPath = join(spotDir, 'music', 'score-30s.mp3')
      if (!args.force && existsSync(musicPath) && statSync(musicPath).size > 20_000) {
        const dur = measureAudioDurationSec(musicPath)
        console.log(`  [cached] ${spot.id}/music/score-30s.mp3 — ${dur.toFixed(2)}s`)
      } else {
        console.log(`  [music] Generating 30s score for ${spot.id} via ${args.musicModel}...`)
        const { buffer, mimeType } = await callAiStudioLyriaMusic({
          apiKey,
          model: args.musicModel,
          prompt: spot.musicPrompt,
        })
        const dur = encodeRawAudioToBroadcastMp3({
          rawBuffer: buffer,
          mimeType,
          outMp3Path: musicPath,
          isMusic: true,
        })
        console.log(`  [generated] ${spot.id}/music/score-30s.mp3 — ${dur.toFixed(2)}s`)
        await new Promise((r) => setTimeout(r, args.delayMs))
      }
    }
  }

  console.log('\nDone!')
  if (warnings.length > 0) {
    console.log('\nTiming warnings (blocks slightly longer than 9.4s — assembler will auto-extend freeze frame cleanly):')
    for (const w of warnings) console.log(`  - ${w}`)
  }
}

main().catch((err) => {
  console.error('\nERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
