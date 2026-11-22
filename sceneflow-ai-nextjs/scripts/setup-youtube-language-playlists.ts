#!/usr/bin/env npx tsx
/**
 * Create (or sync idempotently) 7 clean regional language playlists on @sceneflowaistudio
 * for EN, ES, PT, HI, ZH, AR, TH, populate them with any published social promo videos,
 * and save the playlist ID mapping to `scripts/social-promo-sources/youtubePlaylists.json`
 * so all future uploads (Spots #2-#6) automatically join their language playlist.
 *
 * Usage:
 *   npx tsx scripts/setup-youtube-language-playlists.ts --env-file ...
 */

import * as dotenv from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOCIAL_PROMO_LOCALES, type SocialPromoLocale } from './social-promo-sources/socialPromoScripts'
import { YOUTUBE_BCP47_MAP } from './social-promo-sources/youtubeMetadata'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PLAYLISTS_MAP_PATH = join(__dirname, 'social-promo-sources', 'youtubePlaylists.json')

dotenv.config({ path: join(ROOT, '.env.local') })
dotenv.config({ path: join(ROOT, '.env.vercel.local') })

export const LANGUAGE_PLAYLIST_SPECS: Record<
  SocialPromoLocale,
  { title: string; description: string; language: string }
> = {
  en: {
    title: 'SceneFlow Studio — Automated 4K Video Production (English)',
    description:
      'Official English showcase, promos, and tutorials for SceneFlow Studio — the automated 4K video production platform with Continuity Vault™ and 100% White-Label Client Portals. Start at https://sceneflowai.studio',
    language: YOUTUBE_BCP47_MAP.en,
  },
  es: {
    title: 'SceneFlow Studio — Producción de Video 4K Automatizada (Español)',
    description:
      'Videos oficiales en español de SceneFlow Studio — plataforma de producción de video 4K automatizada con Bóveda de Continuidad y Portales 100% Marca Blanca. Empieza en https://sceneflowai.studio/?locale=es',
    language: YOUTUBE_BCP47_MAP.es,
  },
  pt: {
    title: 'SceneFlow Studio — Produção de Vídeo 4K Automatizada (Português)',
    description:
      'Vídeos oficiais em português do SceneFlow Studio — plataforma completa de produção de vídeo 4K automatizada com Cofre de Continuidade e Portais 100% com a sua marca. Comece em https://sceneflowai.studio/?locale=pt',
    language: YOUTUBE_BCP47_MAP.pt,
  },
  hi: {
    title: 'SceneFlow Studio — ऑटोमेटेड 4K वीडियो प्रोडक्शन (हिन्दी)',
    description:
      'SceneFlow Studio के आधिकारिक हिन्दी वीडियो — कंटिन्यूटी वॉल्ट और 100% व्हाइट-लेबल क्लाइंट पोर्टल वाला ऑटोमेटेड 4K वीडियो प्रोडक्शन प्लेटफ़ॉर्म। शुरू करें: https://sceneflowai.studio/?locale=hi',
    language: YOUTUBE_BCP47_MAP.hi,
  },
  zh: {
    title: 'SceneFlow Studio — 全自动 4K 商业影视制片 (中文)',
    description:
      'SceneFlow Studio 官方中文视频合集 —— 内置连续性资产库与 100% 白标客户审片门户的全流程自动化 4K 影视制片平台。立即体验：https://sceneflowai.studio/?locale=zh-CN',
    language: YOUTUBE_BCP47_MAP.zh,
  },
  ar: {
    title: 'SceneFlow Studio — إنتاج الفيديو الآلي بدقة 4K (العربية)',
    description:
      'الفيديوهات الرسمية باللغة العربية لمنصة SceneFlow Studio — منصة الإنتاج الآلي بدقة 4K مع خزنة الاستمرارية وبوابات العملاء بعلامتك التجارية 100%. ابدأ الآن: https://sceneflowai.studio/?locale=ar',
    language: YOUTUBE_BCP47_MAP.ar,
  },
  th: {
    title: 'SceneFlow Studio — สตูดิโอผลิตวิดีโอ 4K อัตโนมัติ (ภาษาไทย)',
    description:
      'วิดีโอภาษาไทยอย่างเป็นทางการของ SceneFlow Studio — แพลตฟอร์มผลิตวิดีโอ 4K อัตโนมัติครบวงจร พร้อมคลังล็อกความต่อเนื่องและพอร์ทัลแบรนด์ของคุณ 100% เริ่มเลยที่ https://sceneflowai.studio/?locale=th',
    language: YOUTUBE_BCP47_MAP.th,
  },
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

async function listMyPlaylists(token: string) {
  const out: Array<{ id: string; title: string }> = []
  let pageToken = ''
  do {
    const u = new URL('https://www.googleapis.com/youtube/v3/playlists')
    u.searchParams.set('part', 'snippet')
    u.searchParams.set('mine', 'true')
    u.searchParams.set('maxResults', '50')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) throw new Error(`playlists.list failed (${r.status}): ${await r.text()}`)
    const d = (await r.json()) as {
      nextPageToken?: string
      items?: Array<{ id: string; snippet?: { title?: string } }>
    }
    for (const it of d.items || []) {
      out.push({ id: it.id, title: it.snippet?.title || '' })
    }
    pageToken = d.nextPageToken || ''
  } while (pageToken)
  return out
}

async function listPlaylistVideoIds(token: string, playlistId: string): Promise<Set<string>> {
  const ids = new Set<string>()
  let pageToken = ''
  do {
    const u = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    u.searchParams.set('part', 'contentDetails')
    u.searchParams.set('playlistId', playlistId)
    u.searchParams.set('maxResults', '50')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) break
    const d = (await r.json()) as {
      nextPageToken?: string
      items?: Array<{ contentDetails?: { videoId?: string } }>
    }
    for (const it of d.items || []) {
      if (it.contentDetails?.videoId) ids.add(it.contentDetails.videoId)
    }
    pageToken = d.nextPageToken || ''
  } while (pageToken)
  return ids
}

async function main() {
  const argv = process.argv.slice(2)
  const envIdx = argv.indexOf('--env-file')
  if (envIdx >= 0 && argv[envIdx + 1] && existsSync(argv[envIdx + 1]!)) {
    dotenv.config({ path: argv[envIdx + 1]!, override: true })
  }

  const token = await getAccessToken()
  const existingPlaylists = await listMyPlaylists(token)
  const playlistIds: Record<string, { playlistId: string; title: string; url: string }> = {}

  for (const locale of SOCIAL_PROMO_LOCALES) {
    const spec = LANGUAGE_PLAYLIST_SPECS[locale]
    const match = existingPlaylists.find((p) => p.title.trim() === spec.title.trim())
    let playlistId = match?.id

    if (playlistId) {
      console.log(`  [exists] [${locale}] ${spec.title} (${playlistId})`)
    } else {
      const cRes = await fetch(
        'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              title: spec.title,
              description: spec.description,
              defaultLanguage: spec.language,
            },
            status: { privacyStatus: 'public' },
          }),
        }
      )
      if (!cRes.ok) {
        throw new Error(`playlists.insert(${locale}) failed (${cRes.status}): ${await cRes.text()}`)
      }
      const created = (await cRes.json()) as { id: string }
      playlistId = created.id
      console.log(`  [created] [${locale}] ${spec.title} (${playlistId})`)
    }

    playlistIds[locale] = {
      playlistId,
      title: spec.title,
      url: `https://www.youtube.com/playlist?list=${playlistId}`,
    }
  }

  writeFileSync(PLAYLISTS_MAP_PATH, JSON.stringify(playlistIds, null, 2), 'utf8')
  console.log(`\nSaved playlist map -> ${PLAYLISTS_MAP_PATH.replace(`${ROOT}/`, '')}`)

  // Populate each language playlist with any published SVC-01 videos
  const svc01LogPath = join(__dirname, 'output', 'youtube-social-promos-svc-01.json')
  if (existsSync(svc01LogPath)) {
    const log = JSON.parse(readFileSync(svc01LogPath, 'utf8')) as {
      uploads: Record<string, { videoId: string }>
    }
    for (const locale of SOCIAL_PROMO_LOCALES) {
      const plId = playlistIds[locale]!.playlistId
      const currentVideos = await listPlaylistVideoIds(token, plId)
      for (const aspect of ['16x9', '9x16'] as const) {
        const vid = log.uploads[`${locale}-${aspect}`]?.videoId
        if (!vid || currentVideos.has(vid)) continue
        const addRes = await fetch(
          'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                playlistId: plId,
                resourceId: { kind: 'youtube#video', videoId: vid },
              },
            }),
          }
        )
        if (addRes.ok) {
          console.log(`  [added] ${locale}-${aspect} (${vid}) -> playlist ${plId}`)
        } else {
          console.warn(`  [warn] add ${vid} failed (${addRes.status}): ${await addRes.text()}`)
        }
      }
    }
  }
}

main().catch((err) => {
  console.error('\nERROR:', err instanceof Error ? err.message : err)
  process.exit(1)
})
