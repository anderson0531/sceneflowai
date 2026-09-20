import { NextRequest, NextResponse } from 'next/server'
import { put, head } from '@vercel/blob'
import {
  HERO_VIDEO_LOCALES,
  HERO_VIDEO_WEB_1080P_PATHS,
  HERO_VIDEO_WEB_WEBM_PATHS,
  type HeroVideoLocaleId,
} from '@/config/landing/heroVideoLocales'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Git history commit that holds the 1080p encodes from the live 4K masters. */
const ENCODE_COMMIT = '1c619110d87b41638b2e1f2fd427983791a86132'
const GITHUB_VIDEO_BASE = `https://raw.githubusercontent.com/anderson0531/sceneflowai/${ENCODE_COMMIT}/sceneflow-ai-nextjs/public/videos`

function authorize(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal'
  return req.headers.get('x-internal-job') === secret
}

async function copyToBlob(sourceUrl: string, blobPath: string, contentType: string) {
  const existing = await head(blobPath).catch(() => null)
  if (existing) {
    return { blobPath, skipped: true, url: existing.url }
  }

  const res = await fetch(sourceUrl)
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${sourceUrl}`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType,
    allowOverwrite: true,
    addRandomSuffix: false,
  })
  return { blobPath, skipped: false, url: blob.url, bytes: buffer.length }
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN missing' }, { status: 503 })
  }

  const localeParam = req.nextUrl.searchParams.get('locale')
  const locales = (localeParam
    ? HERO_VIDEO_LOCALES.filter((locale) => locale.id === localeParam)
    : HERO_VIDEO_LOCALES) as Array<{ id: HeroVideoLocaleId }>

  if (localeParam && locales.length === 0) {
    return NextResponse.json({ error: `Unknown locale: ${localeParam}` }, { status: 400 })
  }

  const results = []
  for (const locale of locales) {
    const id = locale.id
    results.push(
      await copyToBlob(
        `${GITHUB_VIDEO_BASE}/hero-${id}.mp4`,
        HERO_VIDEO_WEB_1080P_PATHS[id],
        'video/mp4'
      )
    )
    results.push(
      await copyToBlob(
        `${GITHUB_VIDEO_BASE}/hero-${id}.webm`,
        HERO_VIDEO_WEB_WEBM_PATHS[id],
        'video/webm'
      )
    )
  }

  return NextResponse.json({ ok: true, results })
}
