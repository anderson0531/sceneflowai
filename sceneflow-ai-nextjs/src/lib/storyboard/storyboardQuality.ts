/**
 * Draft vs Final storyboard image quality.
 *
 * Draft  → eco tier, 1K — fast layout iteration (Express default)
 * Final  → designer tier, 2K — animatic + I2V/FTV production frames
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export type StoryboardQuality = 'draft' | 'final'
export type StoryboardImageTier = StoryboardQuality

export interface StoryboardGenerationParams {
  storyboardQuality: StoryboardQuality
  modelTier: 'eco' | 'designer'
  quality: 'auto' | 'max'
  imageSize: '1K' | '2K'
  imagenQuality: 'fast' | 'standard'
}

export function resolveStoryboardGeneration(opts: {
  storyboardQuality?: StoryboardQuality
  legacyImageQuality?: 'auto' | 'max'
}): StoryboardGenerationParams {
  let storyboardQuality: StoryboardQuality = opts.storyboardQuality ?? 'draft'
  if (!opts.storyboardQuality && opts.legacyImageQuality === 'max') {
    storyboardQuality = 'final'
  }

  if (storyboardQuality === 'final') {
    return {
      storyboardQuality: 'final',
      modelTier: 'designer',
      quality: 'max',
      imageSize: '2K',
      imagenQuality: 'standard',
    }
  }

  return {
    storyboardQuality: 'draft',
    modelTier: 'eco',
    quality: 'auto',
    imageSize: '1K',
    imagenQuality: 'fast',
  }
}

/** Legacy beats without tier are treated as draft. */
export function resolveEffectiveStoryboardTier(
  tier?: StoryboardImageTier | null
): StoryboardImageTier {
  return tier === 'final' ? 'final' : 'draft'
}

export function getFinalPhotorealisticPromptAnchor(artStyle?: string | null): string {
  if ((artStyle || 'photorealistic').trim() !== 'photorealistic') return ''
  return 'live-action cinematography, natural skin texture, no illustration'
}

export interface BeatFrameGenerationContext {
  storyboardQuality?: StoryboardQuality
  finalizeOnly?: boolean
  regenerate?: boolean
}

/** Whether a beat frame should be generated for the current Express pass. */
export function beatFrameNeedsGeneration(
  beat: Pick<SceneBeat, 'storyboardImageUrl' | 'storyboardImageTier'>,
  ctx: BeatFrameGenerationContext
): boolean {
  const url = beat.storyboardImageUrl?.trim()
  const effectiveTier = resolveEffectiveStoryboardTier(beat.storyboardImageTier)
  const targetQuality = ctx.storyboardQuality ?? 'draft'

  if (ctx.regenerate) return true

  if (ctx.finalizeOnly) {
    if (!url) return true
    return effectiveTier !== 'final'
  }

  if (!url) return true
  return effectiveTier !== targetQuality
}

export function dialogueFrameNeedsGeneration(
  line: { storyboardImageUrl?: string; storyboardImageTier?: StoryboardImageTier },
  ctx: BeatFrameGenerationContext
): boolean {
  return beatFrameNeedsGeneration(
    {
      storyboardImageUrl: line.storyboardImageUrl,
      storyboardImageTier: line.storyboardImageTier,
    },
    ctx
  )
}

const DRAFT_FRAME_WARNING =
  'Draft frames detected — Finalize for best animatic and video quality.'

/** Soft warnings when beats have images but are not Final tier. */
export function collectDraftStoryboardFrameWarnings(
  scene: Record<string, unknown> | null | undefined
): string[] {
  if (!scene) return []
  const beats = getSceneBeats(scene)
  const draftWithImage = beats.filter(
    (b) =>
      b.storyboardImageUrl?.trim() &&
      resolveEffectiveStoryboardTier(b.storyboardImageTier) !== 'final'
  )
  if (draftWithImage.length === 0) return []
  return [DRAFT_FRAME_WARNING]
}

export function sceneHasDraftStoryboardFrames(
  scene: Record<string, unknown> | null | undefined
): boolean {
  return collectDraftStoryboardFrameWarnings(scene).length > 0
}

export function countDraftStoryboardFrames(
  scene: Record<string, unknown> | null | undefined
): number {
  if (!scene) return 0
  return getSceneBeats(scene).filter(
    (b) =>
      b.storyboardImageUrl?.trim() &&
      resolveEffectiveStoryboardTier(b.storyboardImageTier) !== 'final'
  ).length
}
