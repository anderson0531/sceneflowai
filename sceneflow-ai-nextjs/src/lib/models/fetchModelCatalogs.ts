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
      `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/global/publishers/google/models`,
      init,
      (pageToken) =>
        `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/global/publishers/google/models?pageToken=${encodeURIComponent(pageToken)}`
    )
    return ok('vertex', ids)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vertex model list failed'
    return unavailable('vertex', message)
  }
}

export async function fetchModelCatalogs(): Promise<ModelCatalogSnapshot[]> {
  return Promise.all([fetchGateway(), fetchGeminiDeveloper(), fetchVertex()])
}
