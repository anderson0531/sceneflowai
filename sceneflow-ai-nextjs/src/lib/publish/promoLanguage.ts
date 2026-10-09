/**
 * Promo language streams.
 *
 * The shot plan is shared. Each language gets its own narration and, for
 * shots that speak, its own clip. Silent shots keep the source picture.
 */

import { getLanguageDisplayName } from '@/lib/publish/buildLanguageAudioTrack'
import { getPublishingState } from '@/lib/publish/publishingState'
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
export function promoAgentShotNeedsGeneration(args: {
  beatKind?: string
  language?: string
  hasMasterClip: boolean
  hasLanguageClip: boolean
}): { generate: boolean; dialogue: boolean } {
  const dialogue = args.beatKind === 'dialogue'
  if (isLanguageClipTarget(args.language)) {
    if (dialogue) return { generate: !args.hasLanguageClip, dialogue: true }
    return { generate: !args.hasMasterClip, dialogue: false }
  }
  return { generate: !args.hasMasterClip, dialogue: false }
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
