/**
 * Promo language streams.
 *
 * The shot plan is shared. Each language gets its own narration, dialogue,
 * titles, and credits. Action shots with no on-screen text keep the source picture.
 */

import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { getPublishingState } from '@/lib/publish/publishingState'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  isLanguageClipTarget,
  isMasterStreamLanguage,
  normalizeStreamLanguage,
} from '@/lib/scene/languageClipVersions'
import {
  createAudienceDefinition,
  loadBlueprintARFromMetadata,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import type {
  PromoFrameAspect,
  PromoTrailerAsset,
  PromoTrailerBeatPlan,
  ProjectPublishingPromo,
} from '@/types/publishingAssets'

export interface PromoBeatClipRequest {
  sceneId: string
  beatId: string
  sceneIndex?: number
  segmentId?: string
  frameUrl?: string
  durationSec?: number
  aspectRatio?: PromoFrameAspect
  /** Set when this shot must be regenerated with translated dialogue. */
  clipLanguage?: string
  beatKind?: string
}

export interface PromoAgentRunRequest {
  beatPlan: PromoTrailerBeatPlan[]
  targetDurationSec: number
  language?: string
  aspectRatio?: PromoFrameAspect
  audienceDefinition?: AudienceDefinition
}

export type PromoLocalizedKind = 'dialogue' | 'title'

export interface PromoShotLocalization {
  beatKind?: string
  beatRole?: string
  cinematicType?: string
  overlayText?: string
}

/**
 * Dialogue, titles, and credits are remade per language.
 * An action shot with no on-screen text stays on the source clip.
 */
export function promoShotLocalizes(shot: PromoShotLocalization): PromoLocalizedKind | null {
  if (shot.beatKind === 'dialogue') return 'dialogue'
  if (shot.overlayText?.trim()) return 'title'
  if (shot.cinematicType === 'title' || shot.cinematicType === 'outro') return 'title'
  if (shot.beatRole === 'title_reveal' || shot.beatRole === 'credit') return 'title'
  return null
}

/** Fill localization from the source shot when the saved plan does not carry it. */
export function readPromoShotLocalization(
  scenes: unknown[],
  beat: PromoShotLocalization & { sceneIndex: number; beatId: string }
): PromoShotLocalization {
  const scene = scenes[beat.sceneIndex]
  const record = scene && typeof scene === 'object' ? (scene as Record<string, unknown>) : undefined
  const source = record
    ? getSceneBeats(record).find((entry) => entry.beatId === beat.beatId)
    : undefined
  const overlay = beat.overlayText?.trim() || source?.overlayText?.trim()
  const cinematicType =
    beat.cinematicType ||
    (typeof record?.cinematicType === 'string' ? record.cinematicType : undefined)
  return {
    beatKind: beat.beatKind || source?.kind,
    beatRole: beat.beatRole || source?.beatRole,
    ...(cinematicType ? { cinematicType } : {}),
    ...(overlay ? { overlayText: overlay } : {}),
  }
}

/** English words a title or credit paints on screen. */
export function promoOnScreenEnglish(shot: {
  overlayText?: string | null
  line?: string | null
  actionDescription?: string | null
}): string {
  return shot.overlayText?.trim() || shot.line?.trim() || shot.actionDescription?.trim() || ''
}

export function promoNarrationWordBudget(durationSec: number): { minWords: number; maxWords: number } {
  const seconds = Math.min(120, Math.max(30, Math.round(durationSec) || 60))
  const target = Math.round(seconds * 0.7)
  return {
    minWords: Math.max(16, target - 10),
    maxWords: target + 10,
  }
}

/**
 * Source language: generate any shot that has no clip.
 * Another language: regenerate dialogue shots that have no language clip,
 * and generate a source clip only when a silent shot has none yet.
 */
export function promoAgentShotNeedsGeneration(args: PromoShotLocalization & {
  language?: string
  hasMasterClip: boolean
  hasLanguageClip: boolean
}): { generate: boolean; dialogue: boolean; localized: boolean } {
  const kind = promoShotLocalizes(args)
  const dialogue = kind === 'dialogue'
  const localized = kind !== null
  if (isLanguageClipTarget(args.language)) {
    if (localized) return { generate: !args.hasLanguageClip, dialogue, localized: true }
    return { generate: !args.hasMasterClip, dialogue: false, localized: false }
  }
  return { generate: !args.hasMasterClip, dialogue: false, localized: false }
}

export function promoLanguageName(language: string): string {
  return getLanguageDisplayName(normalizeStreamLanguage(language))
}

export function promoAssetForLanguage(
  promo: ProjectPublishingPromo | undefined,
  language: string
): PromoTrailerAsset | undefined {
  const code = normalizeStreamLanguage(language)
  const byLang = promo?.trailersByLanguage?.[code]
  if (byLang?.mp4Url) return byLang
  const trailer = promo?.trailer
  if (!trailer?.mp4Url) return undefined
  const trailerLang = normalizeStreamLanguage(trailer.language || 'en')
  if (trailerLang === code) return trailer
  return undefined
}

export function upsertPromoLanguageTrailer(
  promo: ProjectPublishingPromo | undefined,
  asset: PromoTrailerAsset
): ProjectPublishingPromo {
  const language = normalizeStreamLanguage(asset.language || 'en')
  const nextAsset = { ...asset, language }
  const trailersByLanguage = {
    ...(promo?.trailersByLanguage || {}),
    [language]: nextAsset,
  }
  return {
    ...promo,
    trailersByLanguage,
    trailer: isMasterStreamLanguage(language) ? nextAsset : promo?.trailer,
  }
}

/** Audience Resonance definition, then a blank field when the project has none. */
export function seedPromoAudience(metadata: unknown): AudienceDefinition {
  const saved = getPublishingState(metadata).promo?.audienceDefinition
  if (saved?.description?.trim()) return createAudienceDefinition(saved)
  if (metadata && typeof metadata === 'object') {
    const blueprint = loadBlueprintARFromMetadata(metadata as Record<string, unknown>).audienceDefinition
    if (blueprint?.description?.trim()) return blueprint
  }
  const blank = createAudienceDefinition({ source: 'manual', description: 'Audience' })
  return { ...blank, description: '' }
}
