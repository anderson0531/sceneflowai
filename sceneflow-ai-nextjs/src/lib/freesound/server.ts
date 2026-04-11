/**
 * Server-only Freesound API helpers (Token auth).
 * Full original-file download requires OAuth2; we use preview MP3 for in-app import.
 */

const FREESOUND_BASE = 'https://freesound.org/apiv2'

export function getFreesoundApiKey(): string | null {
  const k = process.env.FREESOUND_API_KEY?.trim()
  return k || null
}

export type FreesoundSearchResult = {
  id: number
  name: string
  username: string
  duration: number
  license: string
}

export type FreesoundSoundDetail = FreesoundSearchResult & {
  previews?: Record<string, string>
}

async function freesoundFetchJson(path: string, params: Record<string, string>): Promise<unknown> {
  const key = getFreesoundApiKey()
  if (!key) {
    throw new Error('FREESOUND_API_KEY is not configured')
  }
  const url = new URL(`${FREESOUND_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Token ${key}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Freesound HTTP ${res.status}: ${text.slice(0, 240)}`)
  }
  return res.json()
}

export async function freesoundTextSearch(
  query: string,
  page: number,
  pageSize: number
): Promise<{
  results: FreesoundSearchResult[]
  count: number
  next: string | null
  previous: string | null
}> {
  const q = query.trim() || 'sound'
  const data = (await freesoundFetchJson('/search/', {
    query: q,
    page: String(Math.max(1, page)),
    page_size: String(Math.min(150, Math.max(1, pageSize))),
    fields: 'id,name,username,duration,license',
  })) as {
    results: FreesoundSearchResult[]
    count: number
    next: string | null
    previous: string | null
  }
  return {
    results: Array.isArray(data.results) ? data.results : [],
    count: typeof data.count === 'number' ? data.count : 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
  }
}

export async function freesoundGetSound(soundId: number): Promise<FreesoundSoundDetail> {
  const data = (await freesoundFetchJson(`/sounds/${soundId}/`, {
    fields: 'id,name,username,duration,license,previews',
  })) as FreesoundSoundDetail
  return data
}

/** Fetch preview MP3 bytes (HQ if available). Uses API token when fetching Freesound hosts. */
export async function freesoundFetchPreviewMp3(soundId: number): Promise<{
  buffer: Buffer
  contentType: string
}> {
  const detail = await freesoundGetSound(soundId)
  const previews = detail.previews || {}
  const previewUrl =
    previews['preview-hq-mp3'] ||
    previews['preview-lq-mp3'] ||
    previews['preview-hq-ogg'] ||
    previews['preview-lq-ogg']
  if (!previewUrl || typeof previewUrl !== 'string') {
    throw new Error('No preview available for this sound')
  }
  const key = getFreesoundApiKey()
  const res = await fetch(previewUrl, {
    headers: key ? { Authorization: `Token ${key}` } : {},
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Preview fetch failed ${res.status}: ${text.slice(0, 120)}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'audio/mpeg'
  return { buffer: Buffer.from(arrayBuffer), contentType }
}

/** Plain-text credit line for manifests (no HTML). */
export function buildFreesoundCreditLine(detail: FreesoundSoundDetail): string {
  const name = detail.name || 'Sound'
  const user = detail.username || 'unknown'
  const lic = detail.license ? ` License: ${detail.license}.` : ''
  return `${name} by ${user}.${lic} Source: Freesound (preview). Sound ID ${detail.id}.`
}
