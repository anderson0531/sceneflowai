/**
 * Deterministic model-release checks. No model calls and no invented successors.
 */

import type { ModelRegistryEntry } from '@/lib/models/modelRegistry'

export type CatalogSource = 'vertex' | 'gemini_developer' | 'gateway'

export interface ModelCatalogSnapshot {
  source: CatalogSource
  status: 'ok' | 'unavailable'
  error?: string
  modelIds: string[]
}

export type RecommendationAction =
  | 'rename'
  | 'hold'
  | 'workhorse_bump'
  | 'cleanup'
  | 'current'
  | 'unavailable'
  | 'unlisted'
  | 'catalog_only'

export interface ModelRecommendation {
  entryId: string
  action: RecommendationAction
  currentModelId: string
  proposedModelId: string | null
  reason: string
  /** Present when an admin can hand the row to Cursor. */
  cursorPrompt: string | null
  files: string[]
  tests: string[]
}

const OMNI_VERTEX_ID = 'gemini-omni-1.1-flash-preview'
const OMNI_GEMINI_API_ID = 'gemini-omni-1.1-flash'

export function normalizeCatalogModelId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const slash = trimmed.lastIndexOf('/')
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed
}

export function parseCatalogModelIds(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (typeof item === 'string') return normalizeCatalogModelId(item)
        if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
          return normalizeCatalogModelId(item.id)
        }
        if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
          return normalizeCatalogModelId(item.name)
        }
        return ''
      })
      .filter(Boolean)
  }
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>
  for (const key of ['data', 'models', 'publisherModels'] as const) {
    if (key in record) return parseCatalogModelIds(record[key])
  }
  return []
}

export function catalogPageToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const token = (payload as { nextPageToken?: unknown }).nextPageToken
  return typeof token === 'string' && token.trim() ? token : null
}

function catalogSet(catalogs: ModelCatalogSnapshot[], source: CatalogSource): Set<string> | null {
  const catalog = catalogs.find((item) => item.source === source)
  if (!catalog || catalog.status !== 'ok') return null
  return new Set(catalog.modelIds.map(normalizeCatalogModelId).filter(Boolean))
}

function ownSource(entry: ModelRegistryEntry): CatalogSource | null {
  if (entry.analysis !== 'release') return null
  if (entry.api === 'vertex' || entry.api === 'lyria') return 'vertex'
  if (entry.api === 'gemini_developer') return 'gemini_developer'
  return null
}

function gaFlashVersion(modelId: string): number[] | null {
  const match = modelId.match(/^gemini-(\d+(?:\.\d+)?)-flash$/)
  if (!match) return null
  return match[1].split('.').map((part) => Number(part))
}

function compareVersions(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

export function newestGaFlash(modelIds: Iterable<string>): string | null {
  let best: { id: string; version: number[] } | null = null
  for (const id of modelIds) {
    const version = gaFlashVersion(normalizeCatalogModelId(id))
    if (!version) continue
    if (!best || compareVersions(version, best.version) > 0) best = { id: normalizeCatalogModelId(id), version }
  }
  return best?.id ?? null
}

function stableSibling(modelId: string): string | null {
  if (!modelId.endsWith('-preview')) return null
  const sibling = modelId.slice(0, -'-preview'.length)
  return sibling || null
}

function otherApisHave(catalogs: ModelCatalogSnapshot[], own: CatalogSource, modelId: string): CatalogSource | null {
  for (const source of ['vertex', 'gemini_developer', 'gateway'] as const) {
    if (source === own) continue
    const ids = catalogSet(catalogs, source)
    if (ids?.has(modelId)) return source
  }
  return null
}

function sourceLabel(source: CatalogSource): string {
  if (source === 'gemini_developer') return 'Gemini Developer API'
  if (source === 'gateway') return 'Vercel AI Gateway'
  return 'Vertex'
}

function promptBlock(title: string, lines: string[]): string {
  if (lines.length === 0) return ''
  return `${title}:\n${lines.map((line) => `- ${line}`).join('\n')}`
}

function buildCursorPrompt(input: {
  action: RecommendationAction
  entry: ModelRegistryEntry
  proposedModelId: string | null
  reason: string
  doNot?: string
}): string {
  const lines = [
    input.action === 'hold' ? 'Hold this model pin.' : 'Model version recommendation for SceneFlow.',
    '',
    `Action: ${input.action}`,
    `Function: ${input.entry.function}`,
    `Symbol: ${input.entry.symbol}`,
    `Current id: ${input.entry.modelId}`,
    input.proposedModelId ? `Proposed id: ${input.proposedModelId}` : 'Proposed id: none',
    `Reason: ${input.reason}`,
  ]
  if (input.doNot) lines.push('', input.doNot)
  if (input.entry.modelId === OMNI_VERTEX_ID) {
    lines.push(
      '',
      'Prices are still about $0.10/s at 720p. Quota changes only if calls move to the Gemini Developer API. That is a provider migration, not an id edit.'
    )
  }
  const files = promptBlock('Files', input.entry.files)
  const tests = promptBlock('Tests', input.entry.tests)
  if (files) lines.push('', files)
  if (tests) lines.push('', tests)
  lines.push('', 'Do not hot-swap this id in production config. Edit the files above and update the listed tests.')
  return lines.join('\n')
}

function recommendation(
  entry: ModelRegistryEntry,
  action: RecommendationAction,
  reason: string,
  proposedModelId: string | null,
  doNot?: string
): ModelRecommendation {
  const actionable = action === 'rename' || action === 'hold' || action === 'workhorse_bump' || action === 'cleanup'
  return {
    entryId: entry.id,
    action,
    currentModelId: entry.modelId,
    proposedModelId,
    reason,
    cursorPrompt: actionable
      ? buildCursorPrompt({ action, entry, proposedModelId, reason, doNot })
      : null,
    files: entry.files,
    tests: entry.tests,
  }
}

export function analyzeModelReleases(
  entries: ModelRegistryEntry[],
  catalogs: ModelCatalogSnapshot[]
): ModelRecommendation[] {
  const gatewayIds = catalogSet(catalogs, 'gateway')
  const newerFlash = gatewayIds ? newestGaFlash(gatewayIds) : null

  return entries.map((entry) => {
    if (entry.role === 'retired') {
      return recommendation(
        entry,
        'cleanup',
        'Retired constant. It is not live traffic.',
        null,
        `Do not send ${entry.modelId}. Leave the deprecated alias unused or remove remaining call sites.`
      )
    }

    if (entry.analysis === 'catalog_only') {
      return recommendation(entry, 'catalog_only', 'Listed for inventory. Release analysis is not run for this provider.', null)
    }

    const source = ownSource(entry)
    const ownIds = source ? catalogSet(catalogs, source) : null
    const workhorseVersion = entry.id === 'text-workhorse' ? gaFlashVersion(entry.modelId) : null
    if (!source || !ownIds) {
      if (
        workhorseVersion &&
        newerFlash &&
        gaFlashVersion(newerFlash) &&
        compareVersions(gaFlashVersion(newerFlash)!, workhorseVersion) > 0
      ) {
        return recommendation(
          entry,
          'workhorse_bump',
          `Gateway lists a higher GA Flash (${newerFlash}) than ${entry.symbol}.`,
          newerFlash,
          'Bump GEMINI_PRODUCT_MODELS.workhorse and refresh the Gateway fixture. Do not retarget other pins in the same edit.'
        )
      }
      return recommendation(
        entry,
        'unavailable',
        source
          ? `${sourceLabel(source)} model list is unavailable, so this pin is not upgraded.`
          : 'No release catalog is configured for this pin.',
        null
      )
    }

    const sibling = stableSibling(entry.modelId)
    if (sibling && ownIds.has(sibling)) {
      return recommendation(
        entry,
        'rename',
        `${sourceLabel(source)} lists ${sibling}, the id with -preview removed.`,
        sibling,
        `Change ${entry.symbol} only. Do not copy an id from a different API.`
      )
    }

    if (sibling && !ownIds.has(sibling)) {
      const other = otherApisHave(catalogs, source, sibling)
      if (other) {
        const doNot =
          entry.modelId === OMNI_VERTEX_ID
            ? `Do not change VEO_MODELS.omni from ${OMNI_VERTEX_ID}. ${OMNI_GEMINI_API_ID} is the Gemini Developer API id. This pin calls Vertex Interactions.`
            : `Do not change ${entry.symbol} from ${entry.modelId}. ${sibling} is listed on ${sourceLabel(other)}, which is a different API.`
        return recommendation(
          entry,
          'hold',
          `${sourceLabel(other)} lists ${sibling}. ${sourceLabel(source)} does not.`,
          sibling,
          doNot
        )
      }
    }

    if (
      workhorseVersion &&
      newerFlash &&
      gaFlashVersion(newerFlash) &&
      compareVersions(gaFlashVersion(newerFlash)!, workhorseVersion) > 0
    ) {
      return recommendation(
        entry,
        'workhorse_bump',
        `Gateway lists a higher GA Flash (${newerFlash}) than ${entry.symbol}.`,
        newerFlash,
        'Bump GEMINI_PRODUCT_MODELS.workhorse and refresh the Gateway fixture. Do not retarget other pins in the same edit.'
      )
    }

    if (!ownIds.has(entry.modelId)) {
      const currentFlash = gaFlashVersion(entry.modelId)
      if (currentFlash) {
        const successor = newestGaFlash(ownIds)
        if (successor && compareVersions(gaFlashVersion(successor)!, currentFlash) > 0) {
          return recommendation(
            entry,
            'rename',
            `${entry.modelId} is absent from ${sourceLabel(source)}. That list includes the newer GA Flash ${successor}.`,
            successor,
            `Change ${entry.symbol} to the successor on the same API.`
          )
        }
      }
      return recommendation(
        entry,
        'unlisted',
        `${entry.modelId} is absent from ${sourceLabel(source)}, and that list has no successor in the same family.`,
        null
      )
    }

    return recommendation(entry, 'current', `${entry.modelId} is on the ${sourceLabel(source)} list.`, null)
  })
}
