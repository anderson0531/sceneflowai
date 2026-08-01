#!/usr/bin/env node
/**
 * Publish landing hero commercial dubs to @sceneflowaistudio on YouTube.
 *
 * Usage:
 *   node scripts/publish-hero-videos-youtube.mjs --dry-run
 *   node scripts/publish-hero-videos-youtube.mjs --all --privacy public
 *   node scripts/publish-hero-videos-youtube.mjs --locale en --privacy unlisted
 *   node scripts/publish-hero-videos-youtube.mjs --all --skip-existing
 *
 * Required env (unless --dry-run):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN
 *
 * Optional env:
 *   GOOGLE_API_KEY
 *   YOUTUBE_PRIVACY_STATUS (default: public)
 *   YOUTUBE_CHANNEL_HANDLE (default: sceneflowaistudio)
 */

import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(__dirname, 'output')

config({ path: join(ROOT, '.env.local') })
config({ path: join(ROOT, '.env.vercel.local') })

const ALL_LOCALES = ['en', 'es', 'pt', 'hi', 'zh', 'ar', 'th']
const DEFAULT_CHANNEL_HANDLE = 'sceneflowaistudio'
const DEFAULT_CHANNEL_ID = 'UCSXGf2gMfCRtktBCrFBDc0g'

function parseArgs(argv) {
  let dryRun = false
  let all = false
  let locale = null
  let privacy = process.env.YOUTUBE_PRIVACY_STATUS || 'public'
  let skipExisting = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--all') all = true
    else if (arg === '--skip-existing') skipExisting = true
    else if (arg === '--locale' && argv[i + 1]) locale = argv[++i]
    else if (arg === '--privacy' && argv[i + 1]) privacy = argv[++i]
  }

  if (!all && !locale) all = true
  return { dryRun, all, locale, privacy, skipExisting }
}

function loadBundles() {
  const cliPath = join(__dirname, 'hero-youtube-bundles-cli.ts')
  const result = spawnSync('npx', ['tsx', cliPath], {
    cwd: ROOT,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    throw new Error('Failed to load hero YouTube publish bundles')
  }

  return JSON.parse(result.stdout.trim())
}

async function refreshAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or YOUTUBE_REFRESH_TOKEN'
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
    throw new Error(`OAuth refresh failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  if (!data.access_token) {
    throw new Error('OAuth refresh response missing access_token')
  }

  return data.access_token
}

async function verifyChannel(accessToken) {
  const handle = (process.env.YOUTUBE_CHANNEL_HANDLE || DEFAULT_CHANNEL_HANDLE).replace(/^@/, '')
  const url = new URL('https://www.googleapis.com/youtube/v3/channels')
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('mine', 'true')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`channels.list failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  const channel = data.items?.[0]
  if (!channel) {
    throw new Error('No YouTube channel found for this OAuth token')
  }

  const customUrl = channel.snippet?.customUrl?.replace(/^@/, '')?.toLowerCase()
  const channelId = channel.id
  const title = channel.snippet?.title

  console.log(`Authenticated channel: ${title} (${channelId})`)
  if (customUrl) console.log(`Custom URL: @${customUrl}`)

  const expectedHandle = handle.toLowerCase()
  if (customUrl && customUrl !== expectedHandle) {
    console.warn(
      `Warning: OAuth channel handle @${customUrl} does not match expected @${expectedHandle}`
    )
  }

  if (channelId !== DEFAULT_CHANNEL_ID) {
    console.warn(
      `Warning: channel ID ${channelId} differs from footer default ${DEFAULT_CHANNEL_ID}`
    )
  }

  return { channelId, customUrl, title }
}

async function uploadVideo(accessToken, bundle, privacy) {
  console.log(`\nFetching video: ${bundle.locale} → ${bundle.videoUrl}`)
  const videoRes = await fetch(bundle.videoUrl)
  if (!videoRes.ok) {
    throw new Error(`Video fetch failed (${bundle.locale}): ${videoRes.status}`)
  }

  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())
  console.log(`Uploading ${bundle.locale} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`)

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title: bundle.title,
          description: bundle.description,
          tags: bundle.tags,
          categoryId: bundle.categoryId || '28',
          defaultLanguage: bundle.language,
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  )

  if (!initRes.ok) {
    throw new Error(`Upload init failed (${bundle.locale}): ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error(`Missing upload URL (${bundle.locale})`)

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length),
    },
    body: videoBuffer,
  })

  if (!uploadRes.ok) {
    throw new Error(`Upload failed (${bundle.locale}): ${await uploadRes.text()}`)
  }

  const result = await uploadRes.json()
  const videoId = result.id
  if (!videoId) throw new Error(`No video ID returned (${bundle.locale})`)

  let thumbnailUploaded = false
  if (bundle.thumbnailUrl) {
    try {
      await uploadThumbnail(accessToken, videoId, bundle.thumbnailUrl)
      thumbnailUploaded = true
      console.log(`Thumbnail set for ${bundle.locale}`)
    } catch (err) {
      console.warn(`Thumbnail upload failed for ${bundle.locale}:`, err.message)
    }
  }

  return {
    locale: bundle.locale,
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUploaded,
    title: bundle.title,
    privacyStatus: privacy,
    uploadedAt: new Date().toISOString(),
  }
}

async function uploadThumbnail(accessToken, videoId, thumbnailUrl) {
  const thumbRes = await fetch(thumbnailUrl)
  if (!thumbRes.ok) {
    throw new Error(`Thumbnail fetch failed: ${thumbRes.status}`)
  }

  const contentType = thumbRes.headers.get('content-type') || 'image/jpeg'
  const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer())

  const setRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: thumbBuffer,
    }
  )

  if (!setRes.ok) {
    throw new Error(await setRes.text())
  }
}

async function checkUrlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

function manifestPath() {
  const date = new Date().toISOString().slice(0, 10)
  return join(OUTPUT_DIR, `hero-youtube-publish-${date}.json`)
}

function readManifest() {
  const path = manifestPath()
  if (!existsSync(path)) return { uploads: {} }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeManifest(manifest) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`)
}

async function main() {
  const { dryRun, all, locale, privacy, skipExisting } = parseArgs(process.argv.slice(2))
  const bundles = loadBundles()
  const selected = all
    ? bundles
    : bundles.filter((bundle) => bundle.locale === locale)

  if (selected.length === 0) {
    throw new Error(`No publish bundle found for locale "${locale}"`)
  }

  console.log(`Loaded ${selected.length} hero publish bundle(s)`)

  for (const bundle of selected) {
    console.log(`\n--- ${bundle.locale.toUpperCase()} ---`)
    console.log(`Title: ${bundle.title}`)
    console.log(`Video: ${bundle.videoUrl}`)
    console.log(`Thumbnail: ${bundle.thumbnailUrl}`)

    const videoOk = await checkUrlExists(bundle.videoUrl)
    const thumbOk = await checkUrlExists(bundle.thumbnailUrl)
    console.log(`Video reachable: ${videoOk ? 'yes' : 'NO'}`)
    console.log(`Thumbnail reachable: ${thumbOk ? 'yes' : 'NO'}`)

    if (!videoOk) {
      console.warn(`Warning: video URL not reachable for ${bundle.locale}`)
    }
  }

  if (dryRun) {
    console.log('\nDry run complete — no uploads performed.')
    return
  }

  const accessToken = await refreshAccessToken()
  await verifyChannel(accessToken)

  const manifest = readManifest()
  const results = []

  for (const bundle of selected) {
    if (skipExisting && manifest.uploads?.[bundle.locale]?.videoId) {
      console.log(`\nSkipping ${bundle.locale} — already in manifest`)
      results.push(manifest.uploads[bundle.locale])
      continue
    }

    const result = await uploadVideo(accessToken, bundle, privacy)
    results.push(result)
    manifest.uploads = manifest.uploads || {}
    manifest.uploads[bundle.locale] = result
    writeManifest(manifest)
    console.log(`Published ${bundle.locale}: ${result.url}`)
  }

  console.log('\n=== Publish summary ===')
  for (const result of results) {
    console.log(`${result.locale}: ${result.url}`)
  }
  console.log(`Manifest: ${manifestPath()}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
