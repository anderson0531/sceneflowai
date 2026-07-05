import { getAggregatorApiKey, getAggregatorBaseUrl } from './config'
import type { AggregatorModelEntry } from './types'
import { AggregatorHttpError } from './types'

export interface RenderfulCatalogEntry {
  id: string
  name?: string
  type?: string
}

export interface RenderfulCatalogFetchResult {
  type: string
  url: string
  status: number
  topLevelKeys: string[]
  raw: unknown
  parsed: RenderfulCatalogEntry[]
  pageCount: number
}

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000
const catalogCache = new Map<string, { at: number; entries: RenderfulCatalogEntry[] }>()

export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function entryFromUnknown(raw: unknown, fallbackType?: string): RenderfulCatalogEntry | null {
  if (typeof raw === 'string' && raw.trim()) {
    return { id: raw.trim(), type: fallbackType }
  }
  if (!raw || typeof raw !== 'object') return null

  const obj = raw as Record<string, unknown>
  const id =
    (typeof obj.id === 'string' && obj.id.trim()) ||
    (typeof obj.model === 'string' && obj.model.trim()) ||
    (typeof obj.slug === 'string' && obj.slug.trim()) ||
    (typeof obj.model_id === 'string' && obj.model_id.trim()) ||
    ''

  if (!id) return null

  const name =
    (typeof obj.name === 'string' && obj.name.trim()) ||
    (typeof obj.label === 'string' && obj.label.trim()) ||
    (typeof obj.display_name === 'string' && obj.display_name.trim()) ||
    undefined

  const type =
    (typeof obj.type === 'string' && obj.type.trim()) ||
    (typeof obj.generation_type === 'string' && obj.generation_type.trim()) ||
    fallbackType

  return { id, name, type }
}

function extractModelArray(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>

  if (Array.isArray(obj.models)) return obj.models
  if (Array.isArray(obj.data)) return obj.data
  if (Array.isArray(obj.items)) return obj.items
  if (obj.models && typeof obj.models === 'object') {
    const nested = obj.models as Record<string, unknown>
    if (Array.isArray(nested.items)) return nested.items
    if (Array.isArray(nested.data)) return nested.data
  }
  if (obj.data && typeof obj.data === 'object') {
    const nested = obj.data as Record<string, unknown>
    if (Array.isArray(nested.models)) return nested.models
    if (Array.isArray(nested.items)) return nested.items
  }
  return []
}

export function parseCatalogResponse(raw: unknown, fallbackType?: string): RenderfulCatalogEntry[] {
  const items = extractModelArray(raw)
  const entries: RenderfulCatalogEntry[] = []

  for (const item of items) {
    const entry = entryFromUnknown(item, fallbackType)
    if (entry) entries.push(entry)
  }

  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
}

function hasMorePages(raw: unknown, fetchedCount: number, pageSize: number): boolean {
  if (!raw || typeof raw !== 'object') return false
  const obj = raw as Record<string, unknown>

  if (obj.hasMore === true || obj.has_more === true) return true
  if (typeof obj.next === 'string' && obj.next.trim()) return true
  if (typeof obj.next_page === 'string' && obj.next_page.trim()) return true

  const total =
    (typeof obj.total === 'number' && obj.total) ||
    (typeof obj.total_count === 'number' && obj.total_count) ||
    (typeof obj.count === 'number' && obj.total && obj.total > fetchedCount ? obj.total : undefined)

  if (typeof total === 'number' && total > fetchedCount) return true

  const pagination = obj.pagination
  if (pagination && typeof pagination === 'object') {
    const p = pagination as Record<string, unknown>
    const pTotal = typeof p.total === 'number' ? p.total : undefined
    const page = typeof p.page === 'number' ? p.page : undefined
    const pages = typeof p.pages === 'number' ? p.pages : undefined
    if (pTotal != null && pTotal > fetchedCount) return true
    if (page != null && pages != null && page < pages) return true
  }

  // If we got a full page, assume there may be more.
  return fetchedCount >= pageSize
}

function buildModelsUrl(baseUrl: string, type: string, page: number, limit: number): string {
  const url = new URL(`${baseUrl}/models`)
  url.searchParams.set('type', type)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('page', String(page))
  url.searchParams.set('offset', String((page - 1) * limit))
  return url.toString()
}

export async function fetchRawRenderfulModelsResponse(
  type: string
): Promise<RenderfulCatalogFetchResult> {
  const apiKey = getAggregatorApiKey('renderful')
  if (!apiKey) {
    return {
      type,
      url: '',
      status: 0,
      topLevelKeys: [],
      raw: null,
      parsed: [],
      pageCount: 0,
    }
  }

  const baseUrl = getAggregatorBaseUrl('renderful')
  const limit = 100
  let page = 1
  let pageCount = 0
  const all: RenderfulCatalogEntry[] = []
  let lastRaw: unknown = null
  let lastStatus = 0
  let lastUrl = ''

  while (page <= 50) {
    lastUrl = buildModelsUrl(baseUrl, type, page, limit)
    const res = await fetch(lastUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    lastStatus = res.status
    if (!res.ok) break

    lastRaw = await res.json()
    pageCount += 1
    const parsed = parseCatalogResponse(lastRaw, type)
    if (parsed.length === 0) break

    all.push(...parsed)

    if (!hasMorePages(lastRaw, all.length, limit)) break
    page += 1
  }

  const seen = new Set<string>()
  const deduped = all.filter((entry) => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })

  return {
    type,
    url: lastUrl,
    status: lastStatus,
    topLevelKeys:
      lastRaw && typeof lastRaw === 'object'
        ? Object.keys(lastRaw as Record<string, unknown>)
        : [],
    raw: lastRaw,
    parsed: deduped,
    pageCount,
  }
}

export async function fetchRenderfulCatalog(type: string): Promise<RenderfulCatalogEntry[]> {
  const cached = catalogCache.get(type)
  if (cached && Date.now() - cached.at < MODEL_CACHE_TTL_MS) {
    return cached.entries
  }

  const result = await fetchRawRenderfulModelsResponse(type)
  if (result.parsed.length > 0) {
    catalogCache.set(type, { at: Date.now(), entries: result.parsed })
  }
  return result.parsed
}

export function clearRenderfulCatalogCache(): void {
  catalogCache.clear()
}

export function matchCatalogModel(
  entry: AggregatorModelEntry,
  generationType: string,
  catalog: RenderfulCatalogEntry[]
): string {
  if (
    entry.supportedRenderfulTypes?.length &&
    !entry.supportedRenderfulTypes.includes(generationType)
  ) {
    throw new AggregatorHttpError(
      `${entry.label} is not available for ${generationType} on Renderful. Supported: ${entry.supportedRenderfulTypes.join(', ')}`,
      400,
      'renderful'
    )
  }

  const typeFiltered = catalog.filter((item) => {
    if (!item.type) return true
    return item.type === generationType
  })

  const keywords = entry.matchKeywords.map(normalizeForMatch).filter(Boolean)
  const exclude = (entry.excludeKeywords || []).map(normalizeForMatch).filter(Boolean)

  const scored = typeFiltered
    .map((item) => {
      const haystack = normalizeForMatch(`${item.name || ''} ${item.id}`)
      if (exclude.some((term) => haystack.includes(term))) return null

      const matchedKeywords = keywords.filter((kw) => haystack.includes(kw)).length
      if (matchedKeywords === 0) return null

      let score = matchedKeywords * 10
      if (matchedKeywords === keywords.length) score += 5

      if (entry.qualityTier) {
        const tier = normalizeForMatch(entry.qualityTier)
        if (tier && haystack.includes(tier)) score += 3
      }

      // Prefer entries whose slug encodes the generation type when names are absent.
      const typeHint = normalizeForMatch(generationType)
      if (haystack.includes(typeHint)) score += 2

      return { id: item.id, score }
    })
    .filter((row): row is { id: string; score: number } => row != null)
    .sort((a, b) => b.score - a.score)

  if (scored.length > 0) return scored[0].id

  const sample = typeFiltered
    .slice(0, 12)
    .map((item) => item.name || item.id)
    .join(', ')

  throw new AggregatorHttpError(
    `Renderful has no ${generationType} match for "${entry.label}" (keywords: ${entry.matchKeywords.join(', ')}). Available: ${sample}${
      typeFiltered.length > 12 ? ', …' : ''
    }`,
    400,
    'renderful'
  )
}
