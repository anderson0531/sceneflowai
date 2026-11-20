#!/usr/bin/env npx tsx
/**
 * Update already-published SceneFlow YouTube videos in-place (`videos.update` + `thumbnails.set`)
 * and/or audit the entire `@sceneflowaistudio` channel for English descriptions & USD currency leaks.
 *
 * Usage:
 *   npx tsx scripts/update-social-promos-youtube.ts --audit-channel --env-file ...
 *   npx tsx scripts/update-social-promos-youtube.ts --spot svc-01 --dry-run
 *   npx tsx scripts/update-social-promos-youtube.ts --spot svc-01 --env-file ...
 *   npx tsx scripts/update-social-promos-youtube.ts --update-file tmp/channel-updates.json --env-file ...
 */

import * as dotenv from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SOCIAL_PROMO_LOCALES,
  type SocialPromoLocale,
  type SocialPromoSpotId,
} from './social-promo-sources/socialPromoScripts'
import {
  SOCIAL_PROMO_YOUTUBE_META,
  YOUTUBE_CATEGORY_ID,
} from './social-promo-sources/youtubeMetadata'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

interface CustomVideoUpdateItem {
  videoId: string
  title?: string
  description?: string
  tags?: string[]
  categoryId?: string
  defaultLanguage?: string
  defaultAudioLanguage?: string
  thumbnailPath?: string
}

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
  const locales: SocialPromoLocale[] = rawLocales
    ? (rawLocales
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter((l): l is SocialPromoLocale =>
          (SOCIAL_PROMO_LOCALES as readonly string[]).includes(l)
        ))
    : [...SOCIAL_PROMO_LOCALES]

  return {
    auditChannel: argv.includes('--audit-channel'),
    spotId: ((get('--spot') || 'svc-01').trim().toLowerCase()) as SocialPromoSpotId,
    updateFile: get('--update-file')?.trim(),
    locales,
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
    throw new Error('Set YOUTUBE_ACCESS_TOKEN (or YOUTUBE_REFRESH_TOKEN + client credentials).')
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
  if (!res.ok) throw new Error(`OAuth token refresh failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('OAuth refresh response missing access_token')
  return data.access_token
}

async function auditChannel(accessToken: string) {
  const chRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!chRes.ok) throw new Error(`channels.list failed (${chRes.status}): ${await chRes.text()}`)
  const chData = (await chRes.json()) as {
    items?: Array<{
      id: string
      snippet?: { title?: string; customUrl?: string }
      contentDetails?: { relatedPlaylists?: { uploads?: string } }
    }>
  }
  const ch = chData.items?.[0]
  if (!ch) throw new Error('No YouTube channel found')
  const uploadsId = ch.contentDetails?.relatedPlaylists?.uploads
  console.log(`Channel: ${ch.snippet?.title} (${ch.id}) ${ch.snippet?.customUrl || ''}`)

  const videoIds: string[] = []
  let pageToken = ''
  do {
    const u = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    u.searchParams.set('part', 'contentDetails')
    u.searchParams.set('playlistId', uploadsId!)
    u.searchParams.set('maxResults', '50')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) throw new Error(`playlistItems.list failed: ${r.status}`)
    const d = (await r.json()) as {
      nextPageToken?: string
      items?: Array<{ contentDetails?: { videoId?: string } }>
    }
    for (const it of d.items || []) {
      if (it.contentDetails?.videoId) videoIds.push(it.contentDetails.videoId)
    }
    pageToken = d.nextPageToken || ''
  } while (pageToken)

  const detailed: Array<{
    id: string
    publishedAt: string
    privacy: string
    title: string
    description: string
    tags: string[]
    categoryId: string
    defaultLanguage: string
    defaultAudioLanguage: string
    thumbUrl: string
    hasUsdInText: boolean
    likelyEnglishDesc: boolean
  }> = []

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const u = new URL('https://www.googleapis.com/youtube/v3/videos')
    u.searchParams.set('part', 'snippet,status')
    u.searchParams.set('id', batch.join(','))
    const r = await fetch(u, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!r.ok) throw new Error(`videos.list failed: ${r.status}`)
    const d = (await r.json()) as { items?: Array<Record<string, any>> }
    for (const item of d.items || []) {
      const s = item.snippet || {}
      const desc = String(s.description || '')
      const title = String(s.title || '')
      const hasUsdInText = /(?<![A-Z])\$[0-9]/.test(`${title}\n${desc}`)
      const likelyEnglishDesc =
        /\b(the|with|your|video|studio|create|start|watch|production|build)\b/i.test(desc) &&
        !/[\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u4E00-\u9FFF]/.test(desc)
      detailed.push({
        id: item.id,
        publishedAt: String(s.publishedAt || '').slice(0, 10),
        privacy: String(item.status?.privacyStatus || ''),
        title,
        description: desc,
        tags: Array.isArray(s.tags) ? s.tags : [],
        categoryId: String(s.categoryId || YOUTUBE_CATEGORY_ID),
        defaultLanguage: String(s.defaultLanguage || ''),
        defaultAudioLanguage: String(s.defaultAudioLanguage || ''),
        thumbUrl: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || '',
        hasUsdInText,
        likelyEnglishDesc,
      })
    }
  }

  const outPath = join(ROOT, 'tmp', 'youtube-channel-audit.json')
  writeFileSync(outPath, JSON.stringify(detailed, null, 2), 'utf8')
  console.log(`\nAudited ${detailed.length} videos -> ${outPath.replace(`${ROOT}/`, '')}\n`)
  for (const v of detailed) {
    const flags = [
      v.hasUsdInText ? 'USD' : '',
      v.likelyEnglishDesc ? 'EN_DESC' : '',
      v.defaultLanguage ? `lang:${v.defaultLanguage}` : 'lang:unset',
      v.defaultAudioLanguage ? `audio:${v.defaultAudioLanguage}` : '',
    ]
      .filter(Boolean)
      .join(' ')
    console.log(`${v.publishedAt} [${v.privacy}] ${v.id} (${flags}) | ${v.title}`)
  }
}

async function updateVideoSnippet(accessToken: string, item: CustomVideoUpdateItem) {
  // Fetch current snippet so we don't clobber fields not specified in item
  const getRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(item.videoId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!getRes.ok) throw new Error(`videos.list(${item.videoId}) failed: ${getRes.status}`)
  const getData = (await getRes.json()) as { items?: Array<{ snippet?: Record<string, any> }> }
  const cur = getData.items?.[0]?.snippet
  if (!cur) throw new Error(`Video not found: ${item.videoId}`)

  const nextSnippet = {
    title: item.title ?? cur.title,
    description: item.description ?? cur.description,
    tags: item.tags ?? cur.tags ?? [],
    categoryId: item.categoryId ?? cur.categoryId ?? YOUTUBE_CATEGORY_ID,
    defaultLanguage: item.defaultLanguage ?? cur.defaultLanguage,
    defaultAudioLanguage: item.defaultAudioLanguage ?? cur.defaultAudioLanguage,
  }

  const putRes = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: item.videoId,
      snippet: nextSnippet,
    }),
  })
  if (!putRes.ok) {
    throw new Error(`videos.update(${item.videoId}) failed (${putRes.status}): ${await putRes.text()}`)
  }
}

async function uploadThumbnail(accessToken: string, videoId: string, thumbPath: string) {
  const buf = readFileSync(thumbPath)
  const mime = thumbPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mime,
        'Content-Length': String(buf.length),
      },
      body: buf,
    }
  )
  if (!res.ok) {
    throw new Error(`thumbnails.set(${videoId}) failed (${res.status}): ${await res.text()}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.auditChannel) {
    const accessToken = await getAccessToken()
    await auditChannel(accessToken)
    return
  }

  let updates: CustomVideoUpdateItem[] = []

  if (args.updateFile) {
    const filePath = resolve(ROOT, args.updateFile)
    updates = JSON.parse(readFileSync(filePath, 'utf8')) as CustomVideoUpdateItem[]
  } else {
    const cfg = SOCIAL_PROMO_YOUTUBE_META[args.spotId]
    if (!cfg) throw new Error(`No YouTube metadata for spot "${args.spotId}"`)
    const logPath = join(__dirname, 'output', `youtube-social-promos-${args.spotId}.json`)
    if (!existsSync(logPath)) throw new Error(`Missing publish log: ${logPath}`)
    const log = JSON.parse(readFileSync(logPath, 'utf8')) as {
      uploads: Record<string, { videoId: string }>
    }
    const thumbDir = join(ROOT, 'tmp', 'social-promos-build', args.spotId, 'thumbnails')

    for (const locale of args.locales) {
      const meta = cfg.locales[locale]
      const v16 = log.uploads[`${locale}-16x9`]
      if (v16?.videoId) {
        updates.push({
          videoId: v16.videoId,
          title: meta.title,
          description: meta.description,
          tags: meta.tags,
          categoryId: YOUTUBE_CATEGORY_ID,
          defaultLanguage: meta.language,
          defaultAudioLanguage: meta.language,
          thumbnailPath: join(thumbDir, `${args.spotId}-${locale}.jpg`),
        })
      }
      const v9 = log.uploads[`${locale}-9x16`]
      if (v9?.videoId) {
        updates.push({
          videoId: v9.videoId,
          title: meta.shortsTitle,
          description: meta.description,
          tags: [...meta.tags, 'Shorts', 'YouTube Shorts'],
          categoryId: YOUTUBE_CATEGORY_ID,
          defaultLanguage: meta.language,
          defaultAudioLanguage: meta.language,
        })
      }
    }
  }

  if (args.dryRun) {
    console.log(`\nDRY RUN — ${updates.length} YouTube video updates queued:\n`)
    for (const u of updates) {
      console.log(`• ${u.videoId} [${u.defaultLanguage || '?'}] ${u.title}`)
      if (u.thumbnailPath) console.log(`  thumb: ${u.thumbnailPath.replace(`${ROOT}/`, '')}`)
    }
    return
  }

  const accessToken = await getAccessToken()
  for (const u of updates) {
    await updateVideoSnippet(accessToken, u)
    let thumbNote = ''
    if (u.thumbnailPath && existsSync(u.thumbnailPath)) {
      await uploadThumbnail(accessToken, u.videoId, u.thumbnailPath)
      thumbNote = ' + thumbnail updated'
    }
    console.log(`  [updated] https://www.youtube.com/watch?v=${u.videoId} (${u.defaultLanguage || '?'})${thumbNote}`)
  }

  console.log(`\nUpdated ${updates.length} videos cleanly!`)
}

main().catch((err) => {
  console.error('\nERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
