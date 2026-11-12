import { slimPromoProductionState, type PromoShotCatalogInput } from './promoShotCatalog'
import type { PromoSceneRecord } from './buildPromoScene'
import type { PromoPlanFinding } from './promoPlanFindings'
import type { ProjectPublishingState, PromoTrailerBeatPlan } from '@/types/publishingAssets'

/** Safety ceiling well below Vercel's 4.5 MB Serverless Function payload limit. */
export const MAX_PROMO_SCENE_PRODUCTION_STATE_BYTES = 250_000

export interface PromoSceneApiResponse {
  success?: boolean
  error?: string
  action?: string
  beatPlan?: PromoTrailerBeatPlan[]
  totalDurationSec?: number
  targetDurationSec?: number
  source?: string
  analysis?: PromoPlanFinding[]
  promoScene?: PromoSceneRecord
  promoProductionSeed?: Record<string, unknown>
  createNew?: boolean
  deletedPromoId?: string
  publishing?: ProjectPublishingState
  scriptUpdatedAt?: string
  narrationText?: string
  audioUrl?: string
  musicUrl?: string
  generatedByLanguage?: Record<string, { text: string; audioUrl?: string; durationSec?: number }>
  /** Legacy fallback fields if any mock/caller returns full arrays */
  scenes?: unknown[]
  metadata?: Record<string, unknown>
}

export interface PromoServerPersistedDelta {
  scenes?: unknown[]
  promoScene?: PromoSceneRecord
  promoProductionSeed?: Record<string, unknown>
  createNew?: boolean
  deletedPromoId?: string
  publishing?: ProjectPublishingState
  scriptUpdatedAt?: string
}

/**
 * Safely parse the HTTP response body from `/api/publish/promo/scene`.
 *
 * Vercel's edge/function gateway returns plain text (e.g. `"Request Entity Too Large"`
 * on HTTP 413 or HTML/text on 502/504) instead of JSON. Reading text first prevents
 * `SyntaxError: Unexpected token 'R', "Request En"... is not valid JSON` and surfaces
 * a clear, actionable message.
 */
export function parsePromoSceneResponse<T extends PromoSceneApiResponse = PromoSceneApiResponse>(
  status: number,
  rawBody: string,
  fallbackMessage = 'Promo request failed'
): T {
  const trimmed = (rawBody || '').trim()

  if (
    status === 413 ||
    /^request entity too large/i.test(trimmed) ||
    /FUNCTION_PAYLOAD_TOO_LARGE/i.test(trimmed)
  ) {
    throw new Error(
      'Promo request or response exceeded server size limit (HTTP 413). Please refresh and try again.'
    )
  }

  let parsed: unknown = null
  if (trimmed.length > 0) {
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error(`${fallbackMessage} (HTTP ${status})`)
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${fallbackMessage} (HTTP ${status})`)
  }

  const record = parsed as T
  if (status < 200 || status >= 300) {
    const serverError =
      typeof record.error === 'string' && record.error.trim()
        ? record.error.trim()
        : `${fallbackMessage} (HTTP ${status})`
    throw new Error(serverError)
  }

  return record
}

/**
 * Extract only the lightweight fields of the active promo scene (~2–10 KB) so the
 * server can preserve unsaved client promo dialogue/music metadata on rebuild without
 * ever serializing the multi-megabyte story `scenes` array.
 */
export function slimClientPromoSceneForRequest(
  promoScene: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!promoScene || typeof promoScene !== 'object') return undefined

  const slim: Record<string, unknown> = {}
  const scalarKeys = [
    'id',
    'sceneId',
    'promoId',
    'cinematicType',
    'campaignName',
    'campaignPreset',
    'campaignObjective',
    'promoAspect',
    'duration',
    'music',
    'musicAudio',
  ] as const

  for (const key of scalarKeys) {
    if (promoScene[key] !== undefined) {
      slim[key] = promoScene[key]
    }
  }

  if (Array.isArray(promoScene.campaignLanguages)) {
    slim.campaignLanguages = promoScene.campaignLanguages
  }
  if (Array.isArray(promoScene.sceneMusicCues)) {
    slim.sceneMusicCues = promoScene.sceneMusicCues
  }
  if (promoScene.dialogueAudio && typeof promoScene.dialogueAudio === 'object') {
    slim.dialogueAudio = promoScene.dialogueAudio
  }
  if (Array.isArray(promoScene.promoBeatPlan)) {
    slim.promoBeatPlan = promoScene.promoBeatPlan
  }

  return Object.keys(slim).length > 0 ? slim : undefined
}

/**
 * Slim `sceneProductionState` to clip URL/timing pointers for promo planning, and
 * drop it completely if it ever exceeds `maxBytes` (server falls back to DB production).
 */
export function slimPromoProductionStateForRequest(
  state: PromoShotCatalogInput['sceneProductionState'],
  maxBytes: number = MAX_PROMO_SCENE_PRODUCTION_STATE_BYTES
): PromoShotCatalogInput['sceneProductionState'] {
  const slim = slimPromoProductionState(state)
  if (!slim) return undefined
  try {
    if (JSON.stringify(slim).length > maxBytes) {
      return undefined
    }
  } catch {
    return undefined
  }
  return slim
}
