#!/usr/bin/env npx tsx
/**
 * Publish localized SceneFlow Studio Global Social Promo videos + custom 1280×720 thumbnails
 * directly to @sceneflowaistudio (UCSXGf2gMfCRtktBCrFBDc0g) via YouTube Data API v3.
 *
 * Prerequisites:
 *   Set YOUTUBE_REFRESH_TOKEN (or YOUTUBE_ACCESS_TOKEN) in `.env.local` or pass `--env-file`:
 *     node scripts/youtube-oauth-token.mjs --print-url
 *     node scripts/youtube-oauth-token.mjs --code "AUTH_CODE"
 *
 * Usage:
 *   npx tsx scripts/publish-social-promos-youtube.mjs --spot svc-01 --dry-run
 *   npx tsx scripts/publish-social-promos-youtube.mjs --spot svc-01 --privacy public
 *   npx tsx scripts/publish-social-promos-youtube.mjs --spot svc-01 --include-shorts --privacy public
 *   npx tsx scripts/publish-social-promos-youtube.mjs --spot svc-01 --locale en --privacy unlisted
 */

import * as dotenv from 'dotenv'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
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
const OUTPUT_DIR = join(__dirname, 'output')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

interface CliArgs {
  spotId: SocialPromoSpotId
  locales: SocialPromoLocale[]
  privacy: 'public' | 'unlisted' | 'private'
  includeShorts: boolean
  onlyShorts: boolean
  skipExisting: boolean
  dryRun: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string) => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  const extraEnv = get('--env-file')?.trim()
  if (extraEnv && existsSync(extraEnv)) {
    dotenv.config({ path: extraEnv, override: true })
  }
  const spotId = ((get('--spot') || 'svc-01').trim().toLowerCase()) as SocialPromoSpotId
  const rawLocales = get('--locale')
  const locales: SocialPromoLocale[] = rawLocales
    ? (rawLocales
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter((l): l is SocialPromoLocale =>
          (SOCIAL_PROMO_LOCALES as readonly string[]).includes(l)
        ))
    : [...SOCIAL_PROMO_LOCALES]

  const p = (get('--privacy') || process.env.YOUTUBE_PRIVACY_STATUS || 'public').toLowerCase()
  const privacy: 'public' | 'unlisted' | 'private' =
    p === 'unlisted' || p === 'private' ? p : 'public'

  return {
    spotId,
    locales,
    privacy,
    includeShorts: argv.includes('--include-shorts'),
    onlyShorts: argv.includes('--only-shorts'),
    skipExisting: argv.includes('--skip-existing'),
    dryRun: argv.includes('--dry-run'),
  }
}

async function getAccessToken(): Promise<string> {
  const direct = process.env.YOUTUBE_ACCESS_TOKEN?.trim()
  if (direct) return direct

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim()

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing YOUTUBE_REFRESH_TOKEN (or YOUTUBE_ACCESS_TOKEN). Run `node scripts/youtube-oauth-token.mjs --print-url` to authorize @sceneflowaistudio.'
    )
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new Error(`OAuth token refresh failed (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error('OAuth refresh response missing access_token')
  }
  return data.access_token
}

async function verifyChannel(accessToken: string) {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('mine', 'true')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`channels.list failed (${res.status}): ${await res.text()}`)
  }
  const data = (await res.json()) as {
    items?: Array<{ id: string; snippet?: { title?: string; customUrl?: string } }>
  }
  const channel = data.items?.[0]
  if (!channel) throw new Error('No YouTube channel found for this OAuth token')

  const customUrl = channel.snippet?.customUrl?.replace(/^@/, '')?.toLowerCase()
  console.log(`Authenticated channel: ${channel.snippet?.title} (${channel.id}) @${customUrl || '?'}`)
  if (channel.id !== YOUTUBE_CHANNEL_ID) {
    console.warn(
      `Warning: Channel ID ${channel.id} differs from expected @${YOUTUBE_CHANNEL_HANDLE} (${YOUTUBE_CHANNEL_ID})`
    )
  }
  return { channelId: channel.id, customUrl, title: channel.snippet?.title || '' }
}

async function uploadThumbnailFromFile(accessToken: string, videoId: string, thumbPath: string) {
  const thumbBuffer = readFileSync(thumbPath)
  const setRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': String(thumbBuffer.length),
      },
      body: thumbBuffer,
    }
  )
  if (!setRes.ok) {
    throw new Error(`thumbnails.set failed (${setRes.status}): ${await setRes.text()}`)
  }
}

async function addVideoToLanguagePlaylist(
  accessToken: string,
  locale: SocialPromoLocale,
  videoId: string
) {
  const plMapPath = join(__dirname, 'social-promo-sources', 'youtubePlaylists.json')
  if (!existsSync(plMapPath)) return
  try {
    const map = JSON.parse(readFileSync(plMapPath, 'utf8')) as Record<
      string,
      { playlistId?: string }
    >
    const playlistId = map[locale]?.playlistId
    if (!playlistId) return
    const res = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: 'youtube#video', videoId },
        },
      }),
    })
    if (res.ok) {
      console.log(`  [playlist] Added to [${locale}] playlist (${playlistId})`)
    }
  } catch {
    // Non-fatal playlist assignment error
  }
}

async function uploadLocalVideo(args: {
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
  const videoBuffer = readFileSync(args.videoPath)
  console.log(
    `\nUploading ${args.label}: "${args.title}" (${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB)...`
  )

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
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
  if (!uploadUrl) throw new Error(`Missing resumable upload location (${args.label})`)

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length),
    },
    body: videoBuffer,
  })
  if (!putRes.ok) {
    throw new Error(`Video bytes upload failed (${args.label}): ${await putRes.text()}`)
  }

  const uploaded = (await putRes.json()) as { id?: string }
  if (!uploaded.id) throw new Error(`Missing video ID in YouTube response (${args.label})`)

  let thumbnailUploaded = false
  if (args.thumbnailPath && existsSync(args.thumbnailPath)) {
    try {
      await uploadThumbnailFromFile(args.accessToken, uploaded.id, args.thumbnailPath)
      thumbnailUploaded = true
      console.log(`  [thumbnail] Set custom 1280×720 thumbnail`)
    } catch (err) {
      console.warn(
        `  [thumbnail warn] ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  const watchUrl = `https://www.youtube.com/watch?v=${uploaded.id}`
  console.log(`  [live] ${watchUrl} (${args.privacy})`)
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
  const cfg = SOCIAL_PROMO_YOUTUBE_META[args.spotId]
  if (!cfg) {
    throw new Error(`No YouTube metadata configured for spot "${args.spotId}"`)
  }

  const spotOutDir = join(ROOT, 'tmp', 'social-promos-build', args.spotId, 'out')
  const spotThumbDir = join(ROOT, 'tmp', 'social-promos-build', args.spotId, 'thumbnails')

  const variants: Array<{
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

  for (const locale of args.locales) {
    const meta = cfg.locales[locale]
    if (!args.onlyShorts) {
      variants.push({
        key: `${locale}-16x9`,
        locale,
        aspect: '16x9',
        videoPath: join(spotOutDir, `${args.spotId}-${locale}-16x9.mp4`),
        thumbnailPath: join(spotThumbDir, `${args.spotId}-${locale}.jpg`),
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        language: meta.language,
      })
    }
    if (args.includeShorts || args.onlyShorts) {
      variants.push({
        key: `${locale}-9x16`,
        locale,
        aspect: '9x16',
        videoPath: join(spotOutDir, `${args.spotId}-${locale}-9x16.mp4`),
        thumbnailPath: null, // YouTube Shorts auto-select frame; custom 16:9 thumbs are for widescreen
        title: meta.shortsTitle,
        description: meta.description,
        tags: [...meta.tags, 'Shorts', 'YouTube Shorts'],
        language: meta.language,
      })
    }
  }

  // Verify every required local file exists before making any API call
  for (const v of variants) {
    if (!existsSync(v.videoPath) || statSync(v.videoPath).size < 100_000) {
      throw new Error(`Missing video file: ${v.videoPath.replace(`${ROOT}/`, '')}`)
    }
    if (v.thumbnailPath && (!existsSync(v.thumbnailPath) || statSync(v.thumbnailPath).size < 10_000)) {
      throw new Error(`Missing thumbnail file: ${v.thumbnailPath.replace(`${ROOT}/`, '')}`)
    }
  }

  if (args.dryRun) {
    console.log(`\nDRY RUN — YouTube publish plan for ${args.spotId.toUpperCase()} (@${YOUTUBE_CHANNEL_HANDLE})`)
    console.log(`Privacy: ${args.privacy} · Category: ${YOUTUBE_CATEGORY_ID} (Science & Tech) · SyntheticMedia: true\n`)
    for (const v of variants) {
      const sizeMb = (statSync(v.videoPath).size / (1024 * 1024)).toFixed(2)
      console.log(`• [${v.key}] ${v.title}`)
      console.log(`  Video     : ${v.videoPath.replace(`${ROOT}/`, '')} (${sizeMb} MB)`)
      console.log(`  Thumbnail : ${v.thumbnailPath ? v.thumbnailPath.replace(`${ROOT}/`, '') : '(Shorts auto-frame)'}`)
      console.log(`  Language  : ${v.language} · Tags (${v.tags.length}): ${v.tags.slice(0, 5).join(', ')}...`)
    }
    console.log(`\nTotal videos queued: ${variants.length}`)
    return
  }

  const accessToken = await getAccessToken()
  const channel = await verifyChannel(accessToken)

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const logPath = join(OUTPUT_DIR, `youtube-social-promos-${args.spotId}.json`)
  let existing: { channel?: unknown; uploads: Record<string, unknown> } = { uploads: {} }
  if (existsSync(logPath)) {
    try {
      existing = JSON.parse(readFileSync(logPath, 'utf8'))
    } catch {
      existing = { uploads: {} }
    }
  }

  for (const v of variants) {
    if (args.skipExisting && existing.uploads?.[v.key]) {
      console.log(`Skipping ${v.key} (already published)`)
      continue
    }
    const result = await uploadLocalVideo({
      accessToken,
      videoPath: v.videoPath,
      thumbnailPath: v.thumbnailPath,
      title: v.title,
      description: v.description,
      tags: v.tags,
      language: v.language,
      privacy: args.privacy,
      label: `${args.spotId}/${v.key}`,
    })
    await addVideoToLanguagePlaylist(accessToken, v.locale, result.videoId)
    existing.channel = channel
    existing.uploads[v.key] = result
    writeFileSync(logPath, JSON.stringify(existing, null, 2), 'utf8')
    await new Promise((r) => setTimeout(r, 2500))
  }

  console.log(`\nSaved publish log -> ${logPath.replace(`${ROOT}/`, '')}`)
}

main().catch((err) => {
  console.error('\nERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
