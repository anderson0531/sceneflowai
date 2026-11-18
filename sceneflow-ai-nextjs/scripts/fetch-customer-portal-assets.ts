#!/usr/bin/env npx tsx
/**
 * Stage 1 (Network): Downloads the Customer & Provider Experience Film assets
 * listed in `scripts/video-service-sources/customer-portal.json` into `tmp/customer-portal-build/`:
 *   - `tmp/customer-portal-build/music.mp3`
 *   - `tmp/customer-portal-build/clips/01.mp4` ... `08.mp4` (from Google Flow share URLs)
 *   - `tmp/customer-portal-build/vo/en.wav` ... `th.wav` (7 combined 16-beat Studio Narrator WAVs)
 */

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import type { FeaturePanLocaleId } from '../src/config/landing/customerPortalAnimaticCopy'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const FALLBACK_FLOW_API_HOST = 'https://aisandbox-pa.googleapis.com'
const FALLBACK_FLOW_API_KEY = 'AIzaSyDSjGxWlo68HcGt6mbaIq9YbkKhFQnt3sk'

let cachedFlowConfig: { apiHost: string; apiKey: string } | null = null

interface CustomerPortalSourceManifest {
  musicUrl: string
  storyClips: Record<string, { beatNumber: number; url: string }>
  narrationWavByLocale: Record<FeaturePanLocaleId, string>
  narrationPatchWavByLocale?: Partial<Record<FeaturePanLocaleId, string>>
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
    /* fall back */
  }
  cachedFlowConfig = { apiKey: FALLBACK_FLOW_API_KEY, apiHost: FALLBACK_FLOW_API_HOST }
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
    throw new Error(`No direct videoUrl found for Flow shareId ${shareId}`)
  }
  return directUrl
}

async function downloadFileWithRetry(
  sourceUrl: string,
  destPath: string,
  minBytes = 20_000,
  force = false
) {
  if (!force && existsSync(destPath) && statSync(destPath).size >= minBytes) {
    console.log(
      `  [cached] ${destPath.replace(`${ROOT}/`, '')} (${(statSync(destPath).size / (1024 * 1024)).toFixed(2)} MB)`
    )
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
          'User-Agent': 'SceneFlowAI-CustomerPortalBuilder/1.0',
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
      renameSync(tmpPath, destPath)
      console.log(
        `  [downloaded] ${destPath.replace(`${ROOT}/`, '')} (${(size / (1024 * 1024)).toFixed(2)} MB)`
      )
      return
    } catch (err) {
      lastErr = err
      console.warn(
        `  [retry ${attempt}/4] ${destPath.replace(`${ROOT}/`, '')}:`,
        err instanceof Error ? err.message : err
      )
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let idx = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (idx < items.length) {
        const cur = items[idx++]
        if (cur !== undefined) await worker(cur)
      }
    })
  )
}

async function main() {
  const force = process.argv.includes('--force')
  const manifestPath = join(ROOT, 'scripts', 'video-service-sources', 'customer-portal.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CustomerPortalSourceManifest

  const buildRoot = join(ROOT, 'tmp', 'customer-portal-build')
  const clipsDir = join(buildRoot, 'clips')
  const voDir = join(buildRoot, 'vo')
  mkdirSync(clipsDir, { recursive: true })
  mkdirSync(voDir, { recursive: true })

  console.log('=== [1/3] Downloading Music Score ===')
  await downloadFileWithRetry(manifest.musicUrl, join(buildRoot, 'music.mp3'), 50_000, force)

  console.log('=== [2/3] Downloading 8 Google Flow Story Clips ===')
  const clipTasks = Object.entries(manifest.storyClips)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([clipIdxStr, entry]) => ({
      url: entry.url,
      dest: join(clipsDir, `${String(Number(clipIdxStr)).padStart(2, '0')}.mp4`),
    }))
  await runPool(clipTasks, 4, async (t) => {
    await downloadFileWithRetry(t.url, t.dest, 100_000, force)
  })

  console.log('=== [3/3] Downloading 7 Combined 16-Beat Narration WAVs ===')
  const voTasks = Object.entries(manifest.narrationWavByLocale).map(([loc, url]) => ({
    url,
    dest: join(voDir, `${loc}.wav`),
  }))
  await runPool(voTasks, 4, async (t) => {
    await downloadFileWithRetry(t.url, t.dest, 100_000, force)
  })

  if (manifest.narrationPatchWavByLocale) {
    const patchTasks = Object.entries(manifest.narrationPatchWavByLocale)
      .filter(([, url]) => Boolean(url))
      .map(([loc, url]) => ({
        url: url!,
        dest: join(voDir, `${loc}-patch.wav`),
      }))
    await runPool(patchTasks, 2, async (t) => {
      await downloadFileWithRetry(t.url, t.dest, 100_000, force)
    })
  }

  console.log('\n✓ All 16 Customer Portal Film assets downloaded into tmp/customer-portal-build/')
}

main().catch((err) => {
  console.error('[fetch-customer-portal-assets] Error:', err)
  process.exit(1)
})
