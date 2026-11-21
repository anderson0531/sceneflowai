#!/usr/bin/env npx tsx
/**
 * Streamlined Master -> YouTube Shorts + Concept 2 Thumbnails + YouTube Publisher
 *
 * Division of labor:
 *   - Creator produces top-quality 16:9 master videos (consistent Charon VO, smooth continuous flow,
 *     steady music bed).
 *   - This script NEVER alters master audio (exact `-c:a copy` stream passthrough — zero ducking/pumping),
 *     NEVER inserts freeze frames, and NEVER deletes existing channel videos.
 *   - Automatically derives 1080×1920 (9:16) YouTube Shorts, generates Concept 2 ("Continuous Timeline Vault")
 *     localized 1280×720 thumbnails, and publishes both 16:9 + 9:16 per language to @sceneflowaistudio.
 *
 * Input options (pick one):
 *   1. Folder of local masters:
 *        --masters-dir tmp/masters/svc-01   (expects en.mp4, es.mp4, pt.mp4, hi.mp4, zh.mp4, ar.mp4, th.mp4)
 *   2. JSON manifest mapping locales to local paths or HTTPS URLs (e.g. Vercel Blob):
 *        --manifest tmp/masters/svc-01.json
 *        {
 *          "spotId": "svc-01",
 *          "masters": {
 *            "en": "https://.../master-en.mp4",
 *            "es": "https://.../master-es.mp4"
 *          }
 *        }
 *
 * Usage:
 *   npx tsx scripts/create-shorts-and-publish-youtube.ts --spot svc-01 --masters-dir tmp/masters/svc-01 --crop blurred --dry-run
 *   npx tsx scripts/create-shorts-and-publish-youtube.ts --spot svc-01 --manifest tmp/masters/svc-01.json --crop center --publish --env-file ...
 */

import * as dotenv from 'dotenv'
import { spawnSync } from 'node:child_process'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import ffmpegStatic from 'ffmpeg-static'
import { generateConcept2Thumbnails } from './generate-social-promo-thumbnails'
import {
  SOCIAL_PROMO_LOCALES,
  type SocialPromoLocale,
  type SocialPromoSpotId,
} from './social-promo-sources/socialPromoScripts'
import {
  SOCIAL_PROMO_YOUTUBE_META,
  YOUTUBE_CATEGORY_ID,
  YOUTUBE_CHANNEL_HANDLE,
  YOUTUBE_CHANNEL_ID,
} from './social-promo-sources/youtubeMetadata'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFMPEG = ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg'
const OUTPUT_DIR = join(__dirname, 'output')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

interface MasterManifestFile {
  spotId?: SocialPromoSpotId
  masters: Partial<Record<SocialPromoLocale, string>>
  titles?: Partial<Record<SocialPromoLocale, string>>
  shortsTitles?: Partial<Record<SocialPromoLocale, string>>
  descriptions?: Partial<Record<SocialPromoLocale, string>>
}

type CropMode = 'center' | 'blurred'

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const extraEnv = get('--env-file')?.trim()
  if (extraEnv && existsSync(extraEnv)) {
    dotenv.config({ path: extraEnv, override: true })
  }

  const rawLocales = get('--locale')
  const localesFilter: SocialPromoLocale[] | null = rawLocales
    ? (rawLocales
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter((l): l is SocialPromoLocale =>
          (SOCIAL_PROMO_LOCALES as readonly string[]).includes(l)
        ))
    : null

  const cropArg = (get('--crop') || 'center').toLowerCase()
  const crop: CropMode = cropArg === 'blurred' ? 'blurred' : 'center'

  const privArg = (get('--privacy') || 'public').toLowerCase()
  const privacy: 'public' | 'unlisted' | 'private' =
    privArg === 'unlisted' || privArg === 'private' ? privArg : 'public'

  return {
    spotId: ((get('--spot') || 'svc-01').trim().toLowerCase()) as SocialPromoSpotId,
    mastersDir: get('--masters-dir')?.trim(),
    manifestPath: get('--manifest')?.trim(),
    localesFilter,
    crop,
    privacy,
    publish: argv.includes('--publish'),
    onlyShorts: argv.includes('--only-shorts'),
    skipShorts: argv.includes('--skip-shorts'),
    dryRun: argv.includes('--dry-run'),
  }
}

async function resolveMasterFile(source: string, cachePath: string): Promise<string> {
  const trimmed = source.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    const abs = isAbsolute(trimmed) ? trimmed : resolve(ROOT, trimmed)
    if (!existsSync(abs)) throw new Error(`Master video not found: ${abs}`)
    return abs
  }
  if (existsSync(cachePath) && statSync(cachePath).size > 50_000) {
    console.log(`  [cached master] ${cachePath.replace(`${ROOT}/`, '')}`)
    return cachePath
  }
  mkdirSync(dirname(cachePath), { recursive: true })
  const res = await fetch(trimmed)
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} downloading master: ${trimmed}`)
  }
  const part = `${cachePath}.part`
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(part))
  renameSync(part, cachePath)
  console.log(`  [downloaded master] ${cachePath.replace(`${ROOT}/`, '')}`)
  return cachePath
}

function probeMedia(filePath: string): { durationSec: number; audioCodec: string } {
  const res = spawnSync(FFMPEG, ['-i', filePath, '-f', 'null', '-'], { encoding: 'utf8' })
  const stderr = res.stderr || ''
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  const durationSec = durMatch
    ? Number(durMatch[1]) * 3600 + Number(durMatch[2]) * 60 + Number(durMatch[3])
    : 30
  const acMatch = stderr.match(/Audio:\s*([a-zA-Z0-9_]+)/)
  const audioCodec = (acMatch?.[1] || '').toLowerCase()
  return { durationSec, audioCodec }
}

/**
 * Derive a broadcast-grade 1080×1920 (9:16) YouTube Short directly from a 16:9 master:
 *   - Preserves exact master audio (`-c:a copy` when AAC, or transparent 256k AAC fallback)
 *     with ZERO ducking, ZERO pumping, and ZERO freeze frames.
 *   - Supports:
 *       `center`: crisp full-bleed 9:16 center punch-in (`1080×1920`).
 *       `blurred`: uncropped full-width `16:9` master centered over a rich dark blurred canvas.
 */
function buildShortFromMaster(args: {
  masterPath: string
  outShortPath: string
  crop: CropMode
  label: string
}) {
  mkdirSync(dirname(args.outShortPath), { recursive: true })
  const { durationSec, audioCodec } = probeMedia(args.masterPath)

  // Keep master audio untouched: exact stream copy when already AAC, otherwise transparent 256k AAC
  const audioArgs =
    audioCodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '256k', '-ar', '48000']

  const videoArgs =
    args.crop === 'blurred'
      ? [
          '-filter_complex',
          '[0:v]split=2[bg][fg];' +
            '[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=26:8,eq=brightness=-0.16:saturation=1.15[bg_blur];' +
            '[fg]scale=1080:-2[fg_fit];' +
            '[bg_blur][fg_fit]overlay=(W-w)/2:(H-h)/2,format=yuv420p[vout]',
          '-map',
          '[vout]',
          '-map',
          '0:a:0?',
        ]
      : [
          '-vf',
          'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p',
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
        ]

  // YouTube Shorts require <= 60s for vertical feed eligibility (preserve exact duration if <= 60s)
  const trimArgs = durationSec > 59.5 ? ['-t', '59.5'] : []

  const ff = spawnSync(
    FFMPEG,
    [
      '-y',
      '-i',
      args.masterPath,
      ...videoArgs,
      ...trimArgs,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '16',
      ...audioArgs,
      '-movflags',
      '+faststart',
      args.outShortPath,
    ],
    { encoding: 'utf8' }
  )

  if (ff.status !== 0) {
    throw new Error(`ffmpeg Short build failed (${args.label}):\n${(ff.stderr || '').slice(-600)}`)
  }
  console.log(
    `  [Short ${args.crop}] ${args.outShortPath.replace(`${ROOT}/`, '')} (${Math.min(durationSec, 59.5).toFixed(1)}s, audio:${audioCodec === 'aac' ? 'copy' : 'aac-256k'})`
  )
}

async function getAccessToken(): Promise<string> {
  const direct = process.env.YOUTUBE_ACCESS_TOKEN?.trim()
  if (direct) return direct
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim()
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing YOUTUBE_REFRESH_TOKEN or client credentials.')
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const d = (await res.json()) as { access_token?: string }
  if (!res.ok || !d.access_token) {
    throw new Error(`OAuth token refresh failed (${res.status}): ${JSON.stringify(d)}`)
  }
  return d.access_token
}

async function uploadVideoToYouTube(args: {
  accessToken: string
  videoPath: string
  thumbnailPath: string | null
  title: string
  description: string
  tags: string[]
  language: string
  privacy: 'public' | 'unlisted' | 'private'
  label: string
}) {
  const buf = readFileSync(args.videoPath)
  console.log(
    `\nUploading ${args.label}: "${args.title}" (${(buf.length / (1024 * 1024)).toFixed(2)} MB)...`
  )

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(buf.length),
      },
      body: JSON.stringify({
        snippet: {
          title: args.title,
          description: args.description,
          tags: args.tags,
          categoryId: YOUTUBE_CATEGORY_ID,
          defaultLanguage: args.language,
          defaultAudioLanguage: args.language,
        },
        status: {
          privacyStatus: args.privacy,
          selfDeclaredMadeForKids: false,
          embeddable: true,
          publicStatsViewable: true,
          containsSyntheticMedia: true,
        },
      }),
    }
  )
  if (!initRes.ok) {
    throw new Error(`Upload init failed (${args.label}): ${await initRes.text()}`)
  }
  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error(`Missing upload location (${args.label})`)

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(buf.length),
    },
    body: buf,
  })
  if (!putRes.ok) {
    throw new Error(`Video bytes upload failed (${args.label}): ${await putRes.text()}`)
  }
  const uploaded = (await putRes.json()) as { id?: string }
  if (!uploaded.id) throw new Error(`Missing video ID (${args.label})`)

  let thumbnailUploaded = false
  if (args.thumbnailPath && existsSync(args.thumbnailPath)) {
    const tBuf = readFileSync(args.thumbnailPath)
    const tRes = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(uploaded.id)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          'Content-Type': 'image/jpeg',
          'Content-Length': String(tBuf.length),
        },
        body: tBuf,
      }
    )
    if (tRes.ok) {
      thumbnailUploaded = true
      console.log(`  [thumbnail] Set Concept 2 Continuity Vault 1280×720 thumbnail`)
    } else {
      console.warn(`  [thumbnail warn] ${tRes.status} ${await tRes.text()}`)
    }
  }

  const watchUrl = `https://www.youtube.com/watch?v=${uploaded.id}`
  console.log(`  [live] ${watchUrl} (${args.language}, ${args.privacy})`)
  return {
    videoId: uploaded.id,
    url: watchUrl,
    title: args.title,
    language: args.language,
    privacyStatus: args.privacy,
    thumbnailUploaded,
    uploadedAt: new Date().toISOString(),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let manifest: MasterManifestFile = { spotId: args.spotId, masters: {} }
  if (args.manifestPath) {
    const abs = resolve(ROOT, args.manifestPath)
    manifest = JSON.parse(readFileSync(abs, 'utf8')) as MasterManifestFile
  } else if (args.mastersDir) {
    const dir = resolve(ROOT, args.mastersDir)
    for (const loc of SOCIAL_PROMO_LOCALES) {
      const candidates = [
        join(dir, `${loc}.mp4`),
        join(dir, `${args.spotId}-${loc}.mp4`),
        join(dir, `${args.spotId}-${loc}-16x9.mp4`),
      ]
      const hit = candidates.find((p) => existsSync(p))
      if (hit) manifest.masters[loc] = hit
    }
  } else {
    throw new Error('Provide either --masters-dir <dir> or --manifest <json>.')
  }

  const spotId = (manifest.spotId || args.spotId) as SocialPromoSpotId
  const cfg = SOCIAL_PROMO_YOUTUBE_META[spotId]
  if (!cfg) {
    throw new Error(`No YouTube metadata configured for spot "${spotId}" in youtubeMetadata.ts`)
  }

  const targetLocales = (args.localesFilter || [...SOCIAL_PROMO_LOCALES]).filter((l) =>
    Boolean(manifest.masters[l])
  )
  if (targetLocales.length === 0) {
    throw new Error('No master videos matched the requested locales.')
  }

  const workDir = join(ROOT, 'tmp', 'youtube-master-pipeline', spotId)
  const cacheDir = join(workDir, 'masters')
  const shortsDir = join(workDir, 'shorts')
  const thumbDir = join(workDir, 'thumbnails')

  console.log(`\n=== Master -> Shorts + Concept 2 Thumbnails (${spotId.toUpperCase()}) ===`)
  console.log(`Locales: ${targetLocales.join(', ')} · Crop: ${args.crop} · Publish: ${args.publish}`)

  // 1. Generate Concept 2 ("Continuous Timeline Vault") localized 1280×720 thumbnails
  const thumbs = await generateConcept2Thumbnails({
    outDir: thumbDir,
    prefix: spotId,
    locales: targetLocales,
  })

  // 2. Resolve masters & derive untouched-audio 9:16 Shorts
  const queue: Array<{
    key: string
    locale: SocialPromoLocale
    aspect: '16x9' | '9x16'
    videoPath: string
    thumbnailPath: string | null
    title: string
    description: string
    tags: string[]
    language: string
  }> = []

  for (const locale of targetLocales) {
    const masterPath = await resolveMasterFile(
      manifest.masters[locale]!,
      join(cacheDir, `${spotId}-${locale}-master.mp4`)
    )
    const meta = cfg.locales[locale]
    const title = manifest.titles?.[locale] || meta.title
    const shortsTitle = manifest.shortsTitles?.[locale] || meta.shortsTitle
    const description = manifest.descriptions?.[locale] || meta.description

    if (!args.onlyShorts) {
      queue.push({
        key: `${locale}-16x9`,
        locale,
        aspect: '16x9',
        videoPath: masterPath,
        thumbnailPath: thumbs[locale]!,
        title,
        description,
        tags: meta.tags,
        language: meta.language,
      })
    }

    if (!args.skipShorts) {
      const outShortPath = join(shortsDir, `${spotId}-${locale}-short-9x16.mp4`)
      buildShortFromMaster({
        masterPath,
        outShortPath,
        crop: args.crop,
        label: `${spotId}/${locale}`,
      })
      queue.push({
        key: `${locale}-9x16`,
        locale,
        aspect: '9x16',
        videoPath: outShortPath,
        thumbnailPath: null,
        title: shortsTitle,
        description,
        tags: [...meta.tags, 'Shorts', 'YouTube Shorts'],
        language: meta.language,
      })
    }
  }

  if (args.dryRun || !args.publish) {
    console.log(`\nREADY TO PUBLISH (${queue.length} videos for @${YOUTUBE_CHANNEL_HANDLE}):`)
    for (const item of queue) {
      const mb = (statSync(item.videoPath).size / (1024 * 1024)).toFixed(2)
      console.log(`• [${item.key}] (${item.language}) ${item.title} — ${mb} MB`)
      if (item.thumbnailPath) {
        console.log(`  thumb: ${item.thumbnailPath.replace(`${ROOT}/`, '')}`)
      }
    }
    if (!args.publish) {
      console.log('\nAdd `--publish --env-file ...` when ready to upload live to YouTube.')
    }
    return
  }

  // 3. Publish cleanly to YouTube (ZERO deletions!)
  const accessToken = await getAccessToken()
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const logPath = join(OUTPUT_DIR, `youtube-published-${spotId}.json`)
  const published: Record<string, unknown> = {}

  for (const item of queue) {
    published[item.key] = await uploadVideoToYouTube({
      accessToken,
      videoPath: item.videoPath,
      thumbnailPath: item.thumbnailPath,
      title: item.title,
      description: item.description,
      tags: item.tags,
      language: item.language,
      privacy: args.privacy,
      label: `${spotId}/${item.key}`,
    })
    writeFileSync(
      logPath,
      JSON.stringify(
        {
          channelId: YOUTUBE_CHANNEL_ID,
          handle: YOUTUBE_CHANNEL_HANDLE,
          spotId,
          uploads: published,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    )
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(`\nPublished ${queue.length} videos -> ${logPath.replace(`${ROOT}/`, '')}`)
}

main().catch((err) => {
  console.error('\nERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
