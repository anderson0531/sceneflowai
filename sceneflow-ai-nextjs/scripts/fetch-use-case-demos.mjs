#!/usr/bin/env node

/**
 * Fetch Pexels stock clips for landing use case demos, trim/compress, upload to Vercel Blob.
 *
 * Usage:
 *   PEXELS_API_KEY=... BLOB_READ_WRITE_TOKEN=... node scripts/fetch-use-case-demos.mjs
 *   node scripts/fetch-use-case-demos.mjs --dry-run
 *   node scripts/fetch-use-case-demos.mjs --id corporate-ld
 *   node scripts/fetch-use-case-demos.mjs --skip-upload --write-config
 */

import { put } from '@vercel/blob'
import { execFileSync } from 'child_process'
import { config } from 'dotenv'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCES_PATH = join(__dirname, 'use-case-demo-sources.json')
const BLOB_DEMO_BASE = 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com'
const CLIP_SECONDS = 15

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })
config({ path: join(ROOT, '.env.development.local') })

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipUpload = args.includes('--skip-upload')
const writeConfig = args.includes('--write-config')
const writeThumbnails = args.includes('--write-thumbnails')
const posterOnly = args.includes('--poster')
const idFlagIndex = args.indexOf('--id')
const singleId = idFlagIndex >= 0 ? args[idFlagIndex + 1] : null

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    return 'ffmpeg'
  } catch {
    try {
      const out = execFileSync('python3', [
        '-c',
        'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())',
      ]).toString().trim()
      if (out) return out
    } catch {
      /* ignore */
    }
  }
  throw new Error('ffmpeg not found. Install ffmpeg or pip install imageio-ffmpeg.')
}

function pickBestVideoFile(video) {
  const files = video.video_files ?? []
  const horizontal = files.filter((f) => f.width >= f.height && f.file_type === 'video/mp4')
  const candidates = horizontal.length ? horizontal : files.filter((f) => f.file_type === 'video/mp4')
  candidates.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return candidates[0] ?? null
}

async function pexelsHeaders() {
  return PEXELS_API_KEY ? { Authorization: PEXELS_API_KEY } : {}
}

async function searchPexels(query, page = 1) {
  if (!PEXELS_API_KEY) {
    throw new Error(
      `PEXELS_API_KEY is required to search for "${query}". Set pexelsVideoId in use-case-demo-sources.json instead.`
    )
  }

  const url = new URL('https://api.pexels.com/videos/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', '15')
  url.searchParams.set('page', String(page))

  const res = await fetch(url, {
    headers: await pexelsHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Pexels search failed (${res.status}): ${await res.text()}`)
  }

  return res.json()
}

async function fetchVideoById(videoId, attempt = 1, maxAttempts = 12) {
  const res = await fetch(`https://api.pexels.com/videos/videos/${videoId}`, {
    headers: await pexelsHeaders(),
  })
  const data = await res.json()
  if (data.id) return data

  if (attempt < maxAttempts) {
    await sleep(1500 * attempt)
    return fetchVideoById(videoId, attempt + 1, maxAttempts)
  }

  throw new Error(
    data.message ??
      `Pexels video fetch failed (${res.status}). Set PEXELS_API_KEY or choose another pexelsVideoId.`
  )
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, {
    headers: {
      Referer: 'https://www.pexels.com/',
      'User-Agent': 'SceneFlowAI/1.0 (use-case-demo-fetch)',
    },
  })
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  mkdirSync(dirname(destPath), { recursive: true })
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath))
}

function trimVideo(ffmpeg, inputPath, outputPath, seconds = CLIP_SECONDS) {
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i',
      inputPath,
      '-t',
      String(seconds),
      '-vf',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
      '-c:v',
      'libx264',
      '-crf',
      '28',
      '-preset',
      'fast',
      '-an',
      '-movflags',
      '+faststart',
      outputPath,
    ],
    { stdio: 'inherit' }
  )
}

function extractPosterFrame(ffmpeg, videoPath, posterPath) {
  execFileSync(
    ffmpeg,
    ['-y', '-ss', '2', '-i', videoPath, '-frames:v', '1', '-q:v', '2', posterPath],
    { stdio: 'ignore' }
  )
}

function posterBlobPath(entry) {
  return entry.blobPath.replace(/\.mp4$/, '-poster.jpg')
}

async function processPoster(exampleId, entry, ffmpeg) {
  console.log(`\n=== poster: ${exampleId} ===`)
  const tmpDir = join(ROOT, '.tmp/use-case-demos')
  const trimmedPath = join(tmpDir, `${exampleId}.mp4`)
  const posterPath = join(tmpDir, `${exampleId}-poster.jpg`)
  const posterBlob = posterBlobPath(entry)

  if (dryRun) {
    console.log(`  blob: ${posterBlob}`)
    return { exampleId, posterUrl: `${BLOB_DEMO_BASE}/${posterBlob}`, skipped: true }
  }

  if (!existsSync(trimmedPath)) {
    throw new Error(`Missing ${trimmedPath} — run full fetch first`)
  }

  extractPosterFrame(ffmpeg, trimmedPath, posterPath)
  let posterUrl
  if (skipUpload) {
    const localPublicPath = join(ROOT, 'public', posterBlob)
    mkdirSync(dirname(localPublicPath), { recursive: true })
    writeFileSync(localPublicPath, readFileSync(posterPath))
    posterUrl = `${BLOB_DEMO_BASE}/${posterBlob}`
  } else {
    if (!BLOB_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN required unless --skip-upload')
    const buffer = readFileSync(posterPath)
    const blob = await put(posterBlob, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
      token: BLOB_TOKEN,
      allowOverwrite: true,
    })
    posterUrl = blob.url
  }
  console.log(`  Poster: ${posterUrl}`)
  return { exampleId, posterUrl, categoryId: entry.categoryId }
}

async function processEntry(exampleId, entry, sources, ffmpeg) {
  console.log(`\n=== ${exampleId} (${entry.label}) ===`)

  if (dryRun) {
    console.log(`  query: ${entry.pexelsQuery}`)
    console.log(`  blob:  ${entry.blobPath}`)
    return { exampleId, blobUrl: `${BLOB_DEMO_BASE}/${entry.blobPath}`, skipped: true }
  }

  let video
  let directUrl = entry.directDownloadUrl

  if (entry.pexelsVideoId && !directUrl && !PEXELS_API_KEY) {
    throw new Error(
      `Set directDownloadUrl for ${exampleId} or add PEXELS_API_KEY. Run resolve via browser or pexels.com/download/video/{id}/`
    )
  }

  if (directUrl) {
    video = {
      id: entry.pexelsVideoId,
      url: entry.pexelsUrl ?? `https://www.pexels.com/video/${entry.pexelsVideoId}/`,
      user: { name: entry.pexelsAuthor ?? 'Pexels Contributor' },
      video_files: [{ link: directUrl, file_type: 'video/mp4', width: 1920, height: 1080 }],
    }
  } else if (entry.pexelsVideoId) {
    video = await fetchVideoById(entry.pexelsVideoId)
  } else {
    const data = await searchPexels(entry.pexelsQuery)
    video = data.videos?.find((v) => pickBestVideoFile(v)) ?? data.videos?.[0]
  }

  if (!video) {
    throw new Error(`No Pexels results for "${entry.pexelsQuery}"`)
  }

  const file = pickBestVideoFile(video)
  if (!file?.link) {
    throw new Error(`No suitable MP4 file for video ${video.id}`)
  }

  entry.pexelsVideoId = video.id
  entry.pexelsUrl = video.url
  entry.pexelsAuthor = video.user?.name ?? null

  console.log(`  Pexels: ${video.url} (by ${entry.pexelsAuthor ?? 'unknown'})`)

  const tmpDir = join(ROOT, '.tmp/use-case-demos')
  const rawPath = join(tmpDir, `${exampleId}-raw.mp4`)
  const trimmedPath = join(tmpDir, `${exampleId}.mp4`)
  const localPublicPath = join(ROOT, 'public', entry.blobPath)

  await downloadFile(file.link, rawPath)
  trimVideo(ffmpeg, rawPath, trimmedPath)

  let blobUrl
  if (skipUpload) {
    mkdirSync(dirname(localPublicPath), { recursive: true })
    writeFileSync(localPublicPath, readFileSync(trimmedPath))
    blobUrl = `/${entry.blobPath.replace(/^demo\//, 'demo/')}`
    console.log(`  Local: public/${entry.blobPath}`)
  } else {
    if (!BLOB_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is required unless --skip-upload')
    }
    const buffer = readFileSync(trimmedPath)
    const blob = await put(entry.blobPath, buffer, {
      access: 'public',
      contentType: 'video/mp4',
      token: BLOB_TOKEN,
      allowOverwrite: true,
    })
    blobUrl = blob.url
    console.log(`  Blob: ${blobUrl}`)
  }

  return { exampleId, blobUrl, entry }
}

async function main() {
  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'))
  const ids = singleId ? [singleId] : Object.keys(sources)

  if (!dryRun && !PEXELS_API_KEY) {
    const needsSearch = ids.some((id) => !sources[id]?.pexelsVideoId)
    const needsDirect = ids.some((id) => sources[id]?.pexelsVideoId && !sources[id]?.directDownloadUrl)
    if (needsSearch) {
      console.error(
        'PEXELS_API_KEY is required for entries without pexelsVideoId. Get one at https://www.pexels.com/api/'
      )
      process.exit(1)
    }
    if (needsDirect) {
      console.error(
        'PEXELS_API_KEY or directDownloadUrl required. Resolve URLs via https://www.pexels.com/download/video/{id}/'
      )
      process.exit(1)
    }
    console.log('No PEXELS_API_KEY — using directDownloadUrl entries.')
  }

  const ffmpeg = dryRun ? null : resolveFfmpeg()
  const results = []

  for (const exampleId of ids) {
    const entry = sources[exampleId]
    if (!entry) {
      console.error(`Unknown example id: ${exampleId}`)
      process.exit(1)
    }

    try {
      const result = posterOnly
        ? await processPoster(exampleId, entry, ffmpeg)
        : await processEntry(exampleId, entry, sources, ffmpeg)
      results.push(result)
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
      results.push({ exampleId, error: err.message })
    }

    if (!dryRun) await sleep(250)
  }

  writeFileSync(SOURCES_PATH, `${JSON.stringify(sources, null, 2)}\n`)

  console.log('\n--- Summary ---')
  for (const r of results) {
    if (r.error) {
      console.log(`${r.exampleId}: FAILED — ${r.error}`)
    } else if (r.skipped) {
      console.log(`${r.exampleId}: dry-run`)
    } else {
      console.log(`${r.exampleId}: ${r.blobUrl}`)
    }
  }

  if (writeConfig && !dryRun && !posterOnly) {
    const configPath = join(ROOT, 'src/config/landing/useCaseExamples.ts')
    let configSrc = readFileSync(configPath, 'utf8')
    let patched = 0

    for (const r of results) {
      if (!r.blobUrl || r.error) continue
      const entry = sources[r.exampleId]
      const videoSrc = skipUpload ? `${BLOB_DEMO_BASE}/${entry.blobPath}` : r.blobUrl
      const blockPattern = new RegExp(
        `(id: '${r.exampleId.replace(/'/g, "\\'")}',[\\s\\S]*?description:[\\s\\S]*?)(\\n\\s*\\},)`,
        'm'
      )
      if (configSrc.includes(`id: '${r.exampleId}'`) && !configSrc.match(new RegExp(`id: '${r.exampleId}'[\\s\\S]*?videoSrc:`))) {
        const replacement = `$1\n        videoSrc: '${videoSrc}'$2`
        const next = configSrc.replace(blockPattern, replacement)
        if (next !== configSrc) {
          configSrc = next
          patched++
        }
      }
    }

    if (patched > 0) {
      writeFileSync(configPath, configSrc)
      console.log(`\nPatched videoSrc for ${patched} examples in useCaseExamples.ts`)
    }
  }

  if (writeThumbnails && !dryRun) {
    const configPath = join(ROOT, 'src/config/landing/useCaseExamples.ts')
    let configSrc = readFileSync(configPath, 'utf8')
    let patched = 0

    for (const r of results) {
      if (!r.posterUrl || r.error) continue
      const categoryId = r.categoryId ?? sources[r.exampleId]?.categoryId
      if (!categoryId) continue
      const pattern = new RegExp(
        `(ex\\('${categoryId}', \\{\\s*id: '${r.exampleId.replace(/'/g, "\\'")}',[\\s\\S]*?)(\\n\\s*\\}\\),)`,
        'm'
      )
      if (configSrc.includes(`id: '${r.exampleId}'`) && !configSrc.match(new RegExp(`id: '${r.exampleId}'[\\s\\S]*?thumbnailSrc:`))) {
        const replacement = `$1\n        thumbnailSrc: '${r.posterUrl}'$2`
        const next = configSrc.replace(pattern, replacement)
        if (next !== configSrc) {
          configSrc = next
          patched++
        }
      }
    }

    if (patched > 0) {
      writeFileSync(configPath, configSrc)
      console.log(`\nPatched thumbnailSrc for ${patched} examples in useCaseExamples.ts`)
    }
  }

  const failures = results.filter((r) => r.error)
  if (failures.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
