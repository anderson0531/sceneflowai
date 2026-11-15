#!/usr/bin/env npx tsx
/**
 * Stage 1 (Network): Downloads Google Flow / Vercel Blob video clips + music MP3
 * and synthesizes all 7-language Studio Narrator VO MP3 cues for a Video Business
 * vertical (`memoir`, `realestate`, `training`, `brand`).
 *
 * Usage:
 *   npx tsx scripts/fetch-video-service-assets.ts --vertical memoir
 */

import * as dotenv from 'dotenv'
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import {
  VIDEO_SERVICE_PROMO_SCRIPTS,
} from '../src/config/landing/videoServicePromoScripts'
import type {
  FeaturePanLocaleId,
  VideoServiceVerticalId,
} from '../src/config/landing/videoServicesNarratedPan'
import { synthesizeElevenLabsMp3 } from '../src/lib/elevenlabs/textToSpeech'
import { synthesizeGeminiFlashMp3 } from '../src/lib/tts/geminiFlashTts'
import { resolveGeminiTtsLanguageCode } from '../src/lib/tts/googleTtsLocale'

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

const FALLBACK_FLOW_API_HOST = 'https://aisandbox-pa.googleapis.com'
const FALLBACK_FLOW_API_KEY = 'AIzaSyDSjGxWlo68HcGt6mbaIq9YbkKhFQnt3sk'
const FALLBACK_ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB' // Adam

export interface VerticalSourceManifest {
  verticalId: VideoServiceVerticalId
  narratorVoiceId?: string
  narratorDirectorNotes?: string
  watermarkAlreadyInClips?: boolean
  musicUrl: string
  sharedBlocks: Record<string, string>
  localizedBlocks: Record<string, Partial<Record<FeaturePanLocaleId, string>>>
}

let cachedFlowConfig: { apiHost: string; apiKey: string } | null = null

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  return {
    vertical: (get('--vertical') || 'memoir') as VideoServiceVerticalId,
    forceTts: argv.includes('--force-tts'),
    forceClips: argv.includes('--force-clips'),
  }
}

export function extractSpokenTextFromVoSpec(rawVo: string): string {
  const trimmed = rawVo.trim()
  // Strip prefix like `VO (4.0s–9.4s): ` or `Narrator VO (3.9s–9.4s): ` or `VO: `
  const withoutPrefix = trimmed.replace(/^(?:Narrator\s+)?VO(?:\s*\([^)]*\))?\s*:\s*/i, '').trim()
  // Strip outer ASCII or curly quotes
  const unquoted = withoutPrefix
    .replace(/^"([\s\S]*)"$/, '$1')
    .replace(/^“([\s\S]*)”$/, '$1')
    .trim()
  return unquoted
}

function extractFlowShareId(url: string): string | null {
  const m = url.trim().match(/flow\.google\.com\/shared\/video\/([0-9a-fA-F-]{16,64})/)
  return m ? m[1]! : null
}

async function resolveFlowClientConfig(sampleShareUrl: string): Promise<{ apiHost: string; apiKey: string }> {
  if (cachedFlowConfig) return cachedFlowConfig
  try {
    const res = await fetch(sampleShareUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
    })
    if (res.ok) {
      const html = await res.text()
      const keyMatch = html.match(/"K21R3e"\s*:\s*"([^"]+)"/)
      const hostMatch = html.match(/"hCQbU"\s*:\s*"([^"]+)"/)
      cachedFlowConfig = {
        apiKey: keyMatch?.[1] || FALLBACK_FLOW_API_KEY,
        apiHost: hostMatch?.[1] || FALLBACK_FLOW_API_HOST,
      }
      return cachedFlowConfig
    }
  } catch {
    // Fall back to known public Flow config
  }
  cachedFlowConfig = {
    apiKey: FALLBACK_FLOW_API_KEY,
    apiHost: FALLBACK_FLOW_API_HOST,
  }
  return cachedFlowConfig
}

async function resolveDownloadUrl(sourceUrl: string): Promise<string> {
  const shareId = extractFlowShareId(sourceUrl)
  if (!shareId) return sourceUrl

  const { apiHost, apiKey } = await resolveFlowClientConfig(sourceUrl)
  const endpoint = `${apiHost}/v1/flowMedia/${encodeURIComponent(shareId)}:getSharedMedia?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Referer: 'https://flow.google.com/',
      Origin: 'https://flow.google.com',
    },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Flow getSharedMedia failed (${res.status}) for ${shareId}: ${errText.slice(0, 240)}`)
  }
  const data = (await res.json()) as {
    primaryMedia?: {
      video?: {
        generatedVideo?: { fifeUrl?: string }
        userUploadedVideo?: { fifeUrl?: string; url?: string }
        servingUrls?: { gcsUrls?: { videoUrl?: string } }
        fifeUrl?: string
        url?: string
      }
    }
  }
  const v = data.primaryMedia?.video
  const directUrl =
    v?.servingUrls?.gcsUrls?.videoUrl ||
    v?.generatedVideo?.fifeUrl ||
    v?.userUploadedVideo?.fifeUrl ||
    v?.userUploadedVideo?.url ||
    v?.fifeUrl ||
    v?.url

  if (!directUrl) {
    throw new Error(`No videoUrl/fifeUrl found in Flow getSharedMedia response for ${shareId}`)
  }
  return directUrl
}

async function downloadFileWithRetry(sourceUrl: string, destPath: string, minBytes = 10_000, force = false) {
  if (!force && existsSync(destPath) && statSync(destPath).size >= minBytes) {
    console.log(`  [cached] ${destPath.replace(`${ROOT}/`, '')} (${(statSync(destPath).size / (1024 * 1024)).toFixed(2)} MB)`)
    return
  }
  mkdirSync(dirname(destPath), { recursive: true })

  let lastErr: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const directUrl = await resolveDownloadUrl(sourceUrl)
      const res = await fetch(directUrl, {
        headers: {
          Referer: 'https://flow.google.com/',
          'User-Agent': 'SceneFlowAI-VideoServiceBuilder/1.0',
        },
      })
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status} downloading ${directUrl.slice(0, 100)}`)
      }
      const tmpPath = `${destPath}.part`
      await pipeline(Readable.fromWeb(res.body as any), createWriteStream(tmpPath))
      const size = statSync(tmpPath).size
      if (size < minBytes) {
        throw new Error(`Downloaded file unexpectedly small (${size} bytes)`)
      }
      const { renameSync } = await import('node:fs')
      renameSync(tmpPath, destPath)
      console.log(`  [downloaded] ${destPath.replace(`${ROOT}/`, '')} (${(size / (1024 * 1024)).toFixed(2)} MB)`)
      return
    } catch (err) {
      lastErr = err
      console.warn(`  [retry ${attempt}/4] ${destPath.replace(`${ROOT}/`, '')}:`, err instanceof Error ? err.message : err)
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr
}

async function synthesizeCueWithRetry(args: {
  text: string
  locale: FeaturePanLocaleId
  voiceId: string
  directorNotes?: string
  outPath: string
  force?: boolean
}) {
  if (!args.force && existsSync(args.outPath) && statSync(args.outPath).size > 2_000) {
    return
  }
  mkdirSync(dirname(args.outPath), { recursive: true })

  const languageCode = resolveGeminiTtsLanguageCode(args.locale)
  let lastErr: unknown
  let omitDirectorNotes = false
  for (let attempt = 1; attempt <= 7; attempt++) {
    try {
      const buf = await synthesizeGeminiFlashMp3({
        text: args.text,
        voiceId: args.voiceId,
        languageCode,
        audioType: 'narration',
        directorNotes: omitDirectorNotes ? undefined : args.directorNotes,
      })
      if (!buf || buf.length < 1_000) {
        throw new Error(`Gemini TTS returned empty/tiny buffer (${buf?.length ?? 0} bytes)`)
      }
      // Guard against rare Gemini TTS style-prompt leakage (speaking directorNotes aloud doubles MP3 > 58 KB)
      if (buf.length > 58_000) {
        omitDirectorNotes = true
        throw new Error(
          `Gemini TTS buffer unexpectedly long (${(buf.length / 1024).toFixed(1)} KB > 58 KB; likely prompt leakage) — retrying without directorNotes`
        )
      }
      writeFileSync(args.outPath, buf)
      console.log(`  [tts] ${args.locale} -> ${args.outPath.replace(`${ROOT}/`, '')} (${(buf.length / 1024).toFixed(1)} KB)`)
      // Pace ~5.3s after each synthesized cue to stay cleanly below Vertex 12 RPM quota
      await new Promise((r) => setTimeout(r, 5_300))
      return
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      const isRateLimit = /429|RESOURCE_EXHAUSTED|Quota exceeded/i.test(msg)
      const backoffMs = isRateLimit ? 20_000 + attempt * 10_000 : 2_500 * attempt
      console.warn(
        `  [tts retry ${attempt}/7] ${args.locale} (${languageCode}) waiting ${(backoffMs / 1000).toFixed(0)}s:`,
        msg.slice(0, 180)
      )
      await new Promise((r) => setTimeout(r, backoffMs))
    }
  }

  // Fallback to ElevenLabs multilingual v2 only if non-rate-limit error & quota exists
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      console.warn(`  [tts fallback -> ElevenLabs] ${args.locale}`)
      const buf = await synthesizeElevenLabsMp3({
        text: args.text,
        voiceId: FALLBACK_ELEVENLABS_VOICE_ID,
        modelId: 'eleven_multilingual_v2',
        stability: 0.48,
        similarityBoost: 0.78,
      })
      writeFileSync(args.outPath, buf)
      console.log(`  [tts-11labs] ${args.locale} -> ${args.outPath.replace(`${ROOT}/`, '')} (${(buf.length / 1024).toFixed(1)} KB)`)
      return
    } catch (fallbackErr) {
      console.warn(
        `  [tts-11labs fallback failed]`,
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
      )
    }
  }

  throw lastErr
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

async function main() {
  const { vertical, forceTts, forceClips } = parseArgs(process.argv.slice(2))
  const manifestPath = resolve(ROOT, 'scripts', 'video-service-sources', `${vertical}.json`)
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as VerticalSourceManifest
  const script = VIDEO_SERVICE_PROMO_SCRIPTS[vertical]
  if (!script) {
    throw new Error(`Unknown vertical "${vertical}" in VIDEO_SERVICE_PROMO_SCRIPTS`)
  }

  const buildRoot = join(ROOT, 'tmp', 'video-services-build', vertical)
  const clipsDir = join(buildRoot, 'clips')
  const voDir = join(buildRoot, 'vo')
  mkdirSync(clipsDir, { recursive: true })
  mkdirSync(voDir, { recursive: true })

  console.log(`\n=== [1/3] Downloading background music for [${vertical}] ===`)
  await downloadFileWithRetry(manifest.musicUrl, join(buildRoot, 'music.mp3'), 50_000, forceClips)

  console.log(`\n=== [2/3] Downloading shared & localized video clips for [${vertical}] ===`)
  const clipTasks: Array<{ url: string; dest: string }> = []

  for (const [blockStr, url] of Object.entries(manifest.sharedBlocks)) {
    const pad = String(Number(blockStr)).padStart(2, '0')
    clipTasks.push({
      url,
      dest: join(clipsDir, `block-${pad}.mp4`),
    })
  }

  for (const [blockStr, byLocale] of Object.entries(manifest.localizedBlocks)) {
    const pad = String(Number(blockStr)).padStart(2, '0')
    for (const loc of ALL_LOCALES) {
      const url = byLocale[loc]
      if (!url) {
        throw new Error(`Missing URL for localized block ${blockStr} [${loc}] in ${manifestPath}`)
      }
      clipTasks.push({
        url,
        dest: join(clipsDir, `block-${pad}-${loc}.mp4`),
      })
    }
  }

  await runPool(clipTasks, 4, async (task) => {
    await downloadFileWithRetry(task.url, task.dest, 100_000, forceClips)
  })

  console.log(`\n=== [3/3] Synthesizing 7-language Studio Narrator VO (${script.blocks.length * ALL_LOCALES.length} cues) ===`)
  const voiceId = manifest.narratorVoiceId || 'gemini-Charon'
  const directorNotes =
    manifest.narratorDirectorNotes ||
    'Warm, grounded, authoritative executive studio narrator. Clear broadcast diction, unhurried cadence, engaging storytelling.'

  const ttsTasks: Array<{
    locale: FeaturePanLocaleId
    blockNumber: number
    text: string
    outPath: string
  }> = []

  for (const loc of ALL_LOCALES) {
    for (const block of script.blocks) {
      const cue = block.localizedCues[loc]
      if (!cue?.narrationVo) {
        throw new Error(`Missing narrationVo for ${vertical} block ${block.blockNumber} [${loc}]`)
      }
      const spokenText = extractSpokenTextFromVoSpec(cue.narrationVo)
      const pad = String(block.blockNumber).padStart(2, '0')
      ttsTasks.push({
        locale: loc,
        blockNumber: block.blockNumber,
        text: spokenText,
        outPath: join(voDir, loc, `block-${pad}.mp3`),
      })
    }
  }

  // Run TTS sequentially (concurrency 1) with built-in 5.3s spacing to stay under Vertex 12 RPM
  await runPool(ttsTasks, 1, async (task) => {
    await synthesizeCueWithRetry({
      text: task.text,
      locale: task.locale,
      voiceId,
      directorNotes,
      outPath: task.outPath,
      force: forceTts,
    })
  })

  console.log(`\n✓ All clips, score, and 7-language VO cues ready in ${buildRoot.replace(`${ROOT}/`, '')}`)
}

main().catch((err) => {
  console.error('\n[fetch-video-service-assets] Fatal error:', err)
  process.exit(1)
})
