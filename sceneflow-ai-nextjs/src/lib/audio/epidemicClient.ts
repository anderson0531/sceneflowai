export interface EpidemicSearchResult {
  id: string
  title: string
  description?: string
  durationSec?: number
  bpm?: number
  tags?: string[]
  previewUrl?: string
  assetUrl?: string
}

interface EpidemicSearchResponse {
  items?: Array<{
    id: string
    title?: string
    description?: string
    duration?: number
    bpm?: number
    tags?: string[]
    previewUrl?: string
    assetUrl?: string
  }>
}

interface EpidemicLicenseResponse {
  url?: string
  licensedUrl?: string
  assetUrl?: string
}

function getConfig() {
  const apiKey = process.env.EPIDEMIC_API_KEY
  const baseUrl = process.env.EPIDEMIC_API_BASE_URL
  if (!apiKey || !baseUrl) {
    throw new Error('Epidemic API not configured (EPIDEMIC_API_KEY / EPIDEMIC_API_BASE_URL)')
  }
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, '') }
}

export async function searchEpidemicSfx(query: string, limit = 8): Promise<EpidemicSearchResult[]> {
  const { apiKey, baseUrl } = getConfig()

  const response = await fetch(`${baseUrl}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      type: 'sfx',
      limit,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Epidemic search failed (${response.status}): ${text}`)
  }

  const data = (await response.json()) as EpidemicSearchResponse
  const items = Array.isArray(data.items) ? data.items : []
  return items.map((item) => ({
    id: item.id,
    title: item.title || item.id,
    description: item.description,
    durationSec: item.duration,
    bpm: item.bpm,
    tags: item.tags || [],
    previewUrl: item.previewUrl,
    assetUrl: item.assetUrl,
  }))
}

export async function licenseEpidemicSfx(assetId: string, projectId?: string): Promise<string> {
  const { apiKey, baseUrl } = getConfig()

  const response = await fetch(`${baseUrl}/license`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      assetId,
      projectId,
      usage: 'sfx',
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Epidemic license failed (${response.status}): ${text}`)
  }

  const data = (await response.json()) as EpidemicLicenseResponse
  const resolvedUrl = data.licensedUrl || data.assetUrl || data.url
  if (!resolvedUrl) {
    throw new Error('Epidemic license response missing asset URL')
  }
  return resolvedUrl
}
