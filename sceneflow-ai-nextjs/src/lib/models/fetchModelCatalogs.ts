/**
 * Structured model-list fetches for admin release analysis.
 * HTML docs are not scraped.
 */

import { getVertexAIAuthToken } from '@/lib/vertexai/client'
import {
  catalogPageToken,
  parseCatalogModelIds,
  type CatalogSource,
  type ModelCatalogSnapshot,
} from '@/lib/models/modelReleaseAnalyzer'

const FETCH_TIMEOUT_MS = 15_000
const MAX_PAGES = 5

async function readJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function collectPages(
  firstUrl: string,
  init: RequestInit | undefined,
  nextUrl: (token: string) => string
): Promise<string[]> {
  const ids: string[] = []
  let url = firstUrl
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await readJson(url, init)
    ids.push(...parseCatalogModelIds(payload))
    const token = catalogPageToken(payload)
    if (!token) break
    url = nextUrl(token)
  }
  return ids
}

function unavailable(source: CatalogSource, error: string): ModelCatalogSnapshot {
  return { source, status: 'unavailable', error, modelIds: [] }
}

function ok(source: CatalogSource, modelIds: string[]): ModelCatalogSnapshot {
  return { source, status: 'ok', modelIds }
}

async function fetchGateway(): Promise<ModelCatalogSnapshot> {
  try {
    const ids = await collectPages('https://ai-gateway.vercel.sh/v1/models', undefined, (token) =>
      `https://ai-gateway.vercel.sh/v1/models?pageToken=${encodeURIComponent(token)}`
    )
    return ok('gateway', ids)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gateway model list failed'
    return unavailable('gateway', message)
  }
}

async function fetchGeminiDeveloper(): Promise<ModelCatalogSnapshot> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return unavailable('gemini_developer', 'GEMINI_API_KEY is not set')
  }
  try {
    const ids = await collectPages(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
      undefined,
      (token) =>
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100&pageToken=${encodeURIComponent(token)}`
    )
    return ok('gemini_developer', ids)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini model list failed'
    return unavailable('gemini_developer', message)
  }
}

async function fetchVertex(): Promise<ModelCatalogSnapshot> {
  const project = process.env.VERTEX_PROJECT_ID?.trim()
  if (!project) {
    return unavailable('vertex', 'VERTEX_PROJECT_ID is not set')
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()) {
    return unavailable('vertex', 'GOOGLE_APPLICATION_CREDENTIALS_JSON is not set')
  }
  try {
    const token = await getVertexAIAuthToken()
    const init: RequestInit = { headers: { Authorization: `Bearer ${token}` } }
    const ids = await collectPages(
      'https://aiplatform.googleapis.com/v1beta1/publishers/google/models?pageSize=200',
      init,
      (pageToken) =>
        `https://aiplatform.googleapis.com/v1beta1/publishers/google/models?pageSize=200&pageToken=${encodeURIComponent(pageToken)}`
    )
    return ok('vertex', ids)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vertex model list failed'
    return unavailable('vertex', message)
  }
}

export interface RichCatalogModel {
  /** Full Gateway ID (e.g. 'google/gemini-3.8-flash' or 'anthropic/claude-sonnet-4.6') */
  id: string
  /** Normalized short ID (e.g. 'gemini-3.8-flash') */
  shortId: string
  provider: string
  contextWindow?: number
  maxOutputTokens?: number
  /** USD per 1M input tokens */
  inputPer1MUsd?: number
  /** USD per 1M cached input tokens */
  cachedInputPer1MUsd?: number
  /** USD per 1M output tokens */
  outputPer1MUsd?: number
  tags?: string[]
}

function parsePerMillionPrice(raw: unknown): number | undefined {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return undefined
  // Gateway pricing fields may be USD-per-token (e.g. 0.0000003) or USD-per-1M-tokens.
  // Any positive number < 0.01 is per-token; multiply by 1,000,000.
  if (n > 0 && n < 0.01) return Number((n * 1_000_000).toFixed(4))
  return Number(n.toFixed(4))
}

/**
 * Parse rich model metadata (pricing + context window) from Vercel AI Gateway `/v1/models`.
 */
export function parseRichGatewayModels(payload: unknown): RichCatalogModel[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as any).data)
      ? (payload as any).data
      : []

  const results: RichCatalogModel[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const rawId = typeof item.id === 'string' ? item.id.trim() : ''
    if (!rawId) continue
    const slash = rawId.indexOf('/')
    const provider = slash > 0 ? rawId.slice(0, slash).toLowerCase() : String(item.owned_by || 'unknown').toLowerCase()
    const shortId = slash > 0 ? rawId.slice(slash + 1) : rawId
    const pricing = (item.pricing && typeof item.pricing === 'object' ? item.pricing : {}) as Record<string, unknown>

    results.push({
      id: rawId,
      shortId,
      provider,
      contextWindow: Number.isFinite(Number(item.context_window)) ? Number(item.context_window) : undefined,
      maxOutputTokens: Number.isFinite(Number(item.max_tokens)) ? Number(item.max_tokens) : undefined,
      inputPer1MUsd: parsePerMillionPrice(pricing.input ?? pricing.prompt),
      cachedInputPer1MUsd: parsePerMillionPrice(pricing.input_cache_read ?? pricing.cached_input),
      outputPer1MUsd: parsePerMillionPrice(pricing.output ?? pricing.completion),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
    })
  }
  return results
}

export async function fetchRichGatewayCatalog(): Promise<{
  status: 'ok' | 'unavailable'
  error?: string
  models: RichCatalogModel[]
}> {
  try {
    const payload = await readJson('https://ai-gateway.vercel.sh/v1/models')
    return { status: 'ok', models: parseRichGatewayModels(payload) }
  } catch (error) {
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Rich Gateway catalog fetch failed',
      models: [],
    }
  }
}

export async function fetchModelCatalogs(): Promise<ModelCatalogSnapshot[]> {
  return Promise.all([fetchGateway(), fetchGeminiDeveloper(), fetchVertex()])
}
