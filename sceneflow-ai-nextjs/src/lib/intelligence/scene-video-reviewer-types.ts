/**
 * Multimodal Scene Video Reviewer — Client-Safe Types & Pure Helpers
 *
 * Provides types and pure transformation helpers for reviewing rendered scene MP4s
 * and/or shot clips from both an Audience (AR Score) and Director perspective,
 * detecting visual/temporal/script anomalies, and routing optional recommendations
 * to either the Shot Director (beat direction + frame/video prompts) or the
 * Scene Director (script, dialogue, pacing, structural revision).
 */

import type { StillDirectorPatch } from '@/lib/intelligence/beat-still-director-fallback'
import type { ProjectLookbook } from '@/lib/intelligence/project-lookbook-fallback'
import { getSceneBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import {
  directionFromDirectorPatch,
  freshBeatReferenceSelection,
  saveDirectorPatchToScenes,
} from '@/lib/vision/saveBeatDirection'

// ============================================================================
// Core Review Enums & Types
// ============================================================================

export type SceneVideoReviewSourceMode = 'auto' | 'rendered_mp4' | 'shot_clips'

export type ResolvedReviewSource = 'rendered_mp4' | 'shot_clips' | 'hybrid' | 'keyframes_only'

export type AnomalyCategory =
  | 'identity_drift'
  | 'wardrobe_mismatch'
  | 'prop_inconsistency'
  | 'axis_180_violation'
  | 'morphing_artifact'
  | 'frozen_motion'
  | 'gibberish_text'
  | 'lighting_jump'
  | 'script_deviation'
  | 'audio_sync_mismatch'
  | 'framing_clipping'

export type AnomalySeverity = 'critical' | 'major' | 'minor'

export type AnomalyOrigin = 'frame' | 'motion' | 'both' | 'script' | 'audio'

export type RecommendationTarget = 'shot_director' | 'scene_director'

export type RecommendationCategory =
  | 'visual_prompt'
  | 'camera_blocking'
  | 'continuity_fix'
  | 'motion_retake'
  | 'script_pacing'
  | 'dialogue_polish'
  | 'audio_sync'

export interface PerspectiveDimension {
  id: string
  name: string
  score: number // 0-100
  weight?: number
  feedback: string
}

export interface AudiencePerspectiveReview {
  /** Audience Resonance (AR) Score (0-100) */
  arScore: number
  summary: string
  emotionalArcAssessment: string
  narrativeClarity: string
  pacingAndMomentum: string
   dimensions: PerspectiveDimension[]
}

export interface DirectorPerspectiveReview {
  /** Director Execution & Compliance Score (0-100) */
  directorScore: number
  summary: string
  scriptComplianceScore: number // 0-100
  continuityScore: number // 0-100
  technicalExecutionScore: number // 0-100
  coverageAndBlockingNotes: string
  dimensions: PerspectiveDimension[]
}

export interface SceneVideoAnomaly {
  id: string
  shotNumber?: number // 1-based shot index
  beatId?: string
  segmentId?: string
  timecode?: string // e.g. "00:04 - 00:08"
  category: AnomalyCategory
  severity: AnomalySeverity
  origin: AnomalyOrigin
  title: string
  description: string
  evidence: string
}

export interface ShotReviewAssessment {
  shotNumber: number // 1-based
  beatId?: string
  segmentId?: string
  timecodeRange?: string
  score: number // 0-100
  status: 'pass' | 'warning' | 'fail'
  scriptComplianceScore: number // 0-100
  scriptComplianceNote: string
  visualQualityNote: string
  continuityNote: string
  hasVideoClip: boolean
  hasKeyframe: boolean
  anomalyIds: string[]
}

export interface SceneVideoRecommendation {
  id: string
  title: string
  description: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
  /** Estimated Audience Resonance (AR) score gain when applied */
  estimatedArImpact: number
  /** Where this recommendation should be applied */
  target: RecommendationTarget
  category: RecommendationCategory
  /** 1-based shot number when target === 'shot_director' */
  shotNumber?: number
  beatId?: string
  segmentId?: string
  timecode?: string
  /** Ready-to-run natural language instruction for Shot Director or Scene Director */
  directorInstruction: string
  /**
   * Structured Shot Director patch when target === 'shot_director'.
   * Saving this via saveDirectorPatchToScenes updates beatDirection and
   * automatically recomposes both framePrompt (storyboardImagePrompt) and videoPrompt.
   */
  shotPatch?: StillDirectorPatch
  /** Additional negative prompt tokens to suppress motion/visual artifacts on the shot */
  negativePromptAdditions?: string
  /** Optional clip motion guidance note appended to or refining video generation */
  videoMotionGuidance?: string
  /** Whether the start keyframe should be regenerated after updating Shot Direction */
  regenerateKeyframeRecommended?: boolean
  /** Suggested revision depth when target === 'scene_director' */
  revisionDepth?: 'light' | 'moderate' | 'deep'
  /** Client state tracking whether the user has applied this recommendation */
  applied?: boolean
  appliedAt?: string
}

export interface SceneVideoReviewResult {
  sceneId: string
  sceneNumber: number
  sceneHeading?: string
  reviewedSource: ResolvedReviewSource
  reviewedStreamId?: string
  reviewedStreamLabel?: string
  reviewedVideoUrl?: string
  reviewedClipCount: number
  totalShotCount: number
  reviewedKeyframeCount: number
  referencePlateCount: number
  modelId: string
  generatedAt: string
  /** Audience Resonance (AR) Score (0-100) */
  arScore: number
  /** Previous AR score from prior review on this scene, if any */
  previousArScore?: number
  /** Director Score (0-100) */
  directorScore: number
  /** Composite overall production quality score (0-100) */
  overallScore: number
  executiveSummary: string
  audiencePerspective: AudiencePerspectiveReview
  directorPerspective: DirectorPerspectiveReview
  shotBreakdown: ShotReviewAssessment[]
  anomalies: SceneVideoAnomaly[]
  recommendations: SceneVideoRecommendation[]
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

const PATCH_STRING_KEYS = [
  'actionFraming',
  'actionDescription',
  'shotType',
  'cameraAngle',
  'frozenMoment',
  'blocking',
  'gaze',
  'emotion',
  'propInteraction',
  'lightingAccent',
  'cameraMovement',
  'audioCue',
] as const

/**
 * Normalize a raw object into a valid `StillDirectorPatch`, dropping empty fields.
 */
export function normalizeRecommendationShotPatch(
  raw: unknown
): StillDirectorPatch | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const source = raw as Record<string, unknown>
  const patch: StillDirectorPatch = {}
  let hasField = false

  for (const key of PATCH_STRING_KEYS) {
    const val = source[key]
    if (typeof val === 'string' && val.trim().length > 0) {
      patch[key] = val.trim()
      hasField = true
    }
  }

  if (typeof source.transition === 'string') {
    const upper = source.transition.trim().toUpperCase()
    if (['CUT', 'CONTINUE', 'DISSOLVE', 'FADE', 'MATCH_CUT'].includes(upper)) {
      patch.transition = upper as StillDirectorPatch['transition']
      hasField = true
    }
  }

  if (Array.isArray(source.castInFrame)) {
    const cast = source.castInFrame
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
    if (cast.length > 0) {
      patch.castInFrame = cast
      hasField = true
    }
  }

  if (Array.isArray(source.keyProps)) {
    const props = source.keyProps
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
    if (props.length > 0) {
      patch.keyProps = props
      hasField = true
    }
  }

  return hasField ? patch : undefined
}

/**
 * Merge two `StillDirectorPatch` objects (e.g., AI-refined patch over recommendation's baseline patch).
 */
export function mergeShotDirectorPatches(
  base: StillDirectorPatch | undefined,
  override: StillDirectorPatch | undefined
): StillDirectorPatch {
  if (!base && !override) return {}
  if (!base) return { ...override }
  if (!override) return { ...base }
  const merged: StillDirectorPatch = { ...base }
  for (const key of PATCH_STRING_KEYS) {
    const val = override[key]
    if (typeof val === 'string' && val.trim().length > 0) {
      merged[key] = val.trim()
    }
  }
  if (override.transition) merged.transition = override.transition
  if (Array.isArray(override.castInFrame) && override.castInFrame.length > 0) {
    merged.castInFrame = override.castInFrame
  }
  if (Array.isArray(override.keyProps) && override.keyProps.length > 0) {
    merged.keyProps = override.keyProps
  }
  return merged
}

/**
 * Resolve the target `SceneBeat` for a recommendation by `beatId`, `segmentId`, or 1-based `shotNumber`.
 */
export function resolveBeatForRecommendation(
  scene: Record<string, unknown> | undefined,
  recommendation: Pick<SceneVideoRecommendation, 'beatId' | 'segmentId' | 'shotNumber'>,
  segments?: Array<{ segmentId: string; beatId?: string; sequenceIndex?: number }>
): { beat: SceneBeat; beatIndex: number } | null {
  if (!scene) return null
  const beats = getSceneBeats(scene)
  if (beats.length === 0) return null

  if (recommendation.beatId) {
    const idx = beats.findIndex((b) => b.beatId === recommendation.beatId)
    if (idx >= 0) return { beat: beats[idx], beatIndex: idx }
  }

  if (recommendation.segmentId && Array.isArray(segments)) {
    const seg = segments.find((s) => s.segmentId === recommendation.segmentId)
    if (seg?.beatId) {
      const idx = beats.findIndex((b) => b.beatId === seg.beatId)
      if (idx >= 0) return { beat: beats[idx], beatIndex: idx }
    }
  }

  const activeBeats = beats
    .map((beat, beatIndex) => ({ beat, beatIndex }))
    .filter(({ beat }) => !isBeatExcluded(beat))

  if (typeof recommendation.shotNumber === 'number' && recommendation.shotNumber >= 1) {
    const targetActive = activeBeats[recommendation.shotNumber - 1]
    if (targetActive) return targetActive
    const fallbackIdx = recommendation.shotNumber - 1
    if (beats[fallbackIdx]) return { beat: beats[fallbackIdx], beatIndex: fallbackIdx }
  }

  return null
}

/**
 * Apply one or more Shot Director recommendations onto `scenes`, updating `beatDirection`,
 * `storyboardImagePrompt` (`framePrompt`), and `segment.videoPrompt` via `saveDirectorPatchToScenes`.
 * Also merges any `negativePromptAdditions` onto matching scene segments.
 */
export function applyShotDirectorRecommendationsToScenes(args: {
  scenes: any[]
  sceneIdx: number
  recommendations: Array<{
    recommendation: SceneVideoRecommendation
    resolvedPatch?: StillDirectorPatch
  }>
  characters: Array<{ id?: string; name: string; referenceImage?: string; type?: string }>
  locationReferences: Array<{ id: string }>
  objectReferences: Array<{ id: string; name: string }>
  promptComposition?: { artStyleAnchor?: string; lookbook?: ProjectLookbook }
  segments?: Array<{ segmentId: string; beatId?: string; sequenceIndex?: number }>
}): {
  scenes: any[]
  appliedIds: string[]
  updatedBeatIds: string[]
  segmentPromptUpdates: Array<{
    segmentId: string
    beatId: string
    videoPrompt?: string
    negativePrompt?: string
  }>
} {
  let workingScenes = Array.isArray(args.scenes) ? [...args.scenes] : []
  const appliedIds: string[] = []
  const updatedBeatIds: string[] = []
  const segmentPromptUpdates: Array<{
    segmentId: string
    beatId: string
    videoPrompt?: string
    negativePrompt?: string
  }> = []

  if (!workingScenes[args.sceneIdx]) {
    return { scenes: workingScenes, appliedIds, updatedBeatIds, segmentPromptUpdates }
  }

  for (const item of args.recommendations) {
    const { recommendation, resolvedPatch } = item
    if (recommendation.target !== 'shot_director') continue

    const scene = workingScenes[args.sceneIdx]
    const resolved = resolveBeatForRecommendation(scene, recommendation, args.segments)
    if (!resolved) continue

    const { beat } = resolved
    const effectivePatch = mergeShotDirectorPatches(recommendation.shotPatch, resolvedPatch)

    // Ensure if only directorInstruction was provided without structured fields,
    // we still fold it into blocking or actionFraming so direction updates deterministically.
    if (
      Object.keys(effectivePatch).length === 0 &&
      recommendation.directorInstruction.trim().length > 0
    ) {
      effectivePatch.blocking = recommendation.directorInstruction.trim()
    }

    if (Object.keys(effectivePatch).length === 0) continue

    const directedBeat: SceneBeat = {
      ...beat,
      actionDescription:
        effectivePatch.actionDescription?.trim() || beat.actionDescription,
      beatDirection: directionFromDirectorPatch(beat.beatDirection, effectivePatch),
    }

    workingScenes = saveDirectorPatchToScenes({
      scenes: workingScenes,
      sceneIdx: args.sceneIdx,
      beatId: beat.beatId,
      patch: effectivePatch,
      generatedBy: 'director',
      referenceSelection: freshBeatReferenceSelection({
        scene,
        beat: directedBeat,
        sceneIdx: args.sceneIdx,
        characters: args.characters,
        locationReferences: args.locationReferences,
        objectReferences: args.objectReferences,
      }),
      objectReferences: args.objectReferences,
      promptComposition: args.promptComposition,
    })

    // Check updated scene segments and merge negativePromptAdditions if provided
    const updatedScene = workingScenes[args.sceneIdx]
    const updatedBeats = getSceneBeats(updatedScene)
    const updatedBeat = updatedBeats.find((b) => b.beatId === beat.beatId)
    const updatedVideoPrompt =
      updatedBeat?.beatDirection?.videoPrompt?.trim() || undefined

    const negAdditions = recommendation.negativePromptAdditions?.trim()
    if (Array.isArray(updatedScene?.segments)) {
      const nextSegments = updatedScene.segments.map((seg: any) => {
        if (seg?.beatId !== beat.beatId && seg?.segmentId !== recommendation.segmentId) {
          return seg
        }
        const existingNeg = typeof seg.negativePrompt === 'string' ? seg.negativePrompt.trim() : ''
        const mergedNeg = negAdditions
          ? existingNeg
            ? existingNeg.includes(negAdditions)
              ? existingNeg
              : `${existingNeg}, ${negAdditions}`
            : negAdditions
          : existingNeg || undefined
        const nextVideoPrompt = updatedVideoPrompt || seg.videoPrompt
        segmentPromptUpdates.push({
          segmentId: seg.segmentId,
          beatId: beat.beatId,
          videoPrompt: nextVideoPrompt,
          negativePrompt: mergedNeg,
        })
        return {
          ...seg,
          ...(nextVideoPrompt ? { videoPrompt: nextVideoPrompt } : {}),
          ...(mergedNeg ? { negativePrompt: mergedNeg } : {}),
        }
      })
      workingScenes[args.sceneIdx] = {
        ...updatedScene,
        segments: nextSegments,
      }
    } else if (Array.isArray(args.segments)) {
      const matchSeg = args.segments.find(
        (s) => s.beatId === beat.beatId || s.segmentId === recommendation.segmentId
      )
      if (matchSeg) {
        segmentPromptUpdates.push({
          segmentId: matchSeg.segmentId,
          beatId: beat.beatId,
          videoPrompt: updatedVideoPrompt,
          negativePrompt: negAdditions,
        })
      }
    }

    appliedIds.push(recommendation.id)
    if (!updatedBeatIds.includes(beat.beatId)) {
      updatedBeatIds.push(beat.beatId)
    }
  }

  return {
    scenes: workingScenes,
    appliedIds,
    updatedBeatIds,
    segmentPromptUpdates,
  }
}

/**
 * Format human-readable category labels for anomalies and recommendations.
 */
export const ANOMALY_CATEGORY_LABELS: Record<AnomalyCategory, string> = {
  identity_drift: 'Character Identity Drift',
  wardrobe_mismatch: 'Wardrobe Continuity',
  prop_inconsistency: 'Prop Inconsistency',
  axis_180_violation: '180° Axis / Eyeline Violation',
  morphing_artifact: 'Morphing / Anatomy Artifact',
  frozen_motion: 'Dead / Frozen Motion',
  gibberish_text: 'Hallucinated Text / Signage',
  lighting_jump: 'Lighting / Exposure Jump',
  script_deviation: 'Script / Action Deviation',
  audio_sync_mismatch: 'Audio / Lip-Sync Drift',
  framing_clipping: 'Framing / Subject Clipping',
}

export const RECOMMENDATION_CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  visual_prompt: 'Visual & Frame Prompt',
  camera_blocking: 'Camera & Blocking',
  continuity_fix: 'Continuity & References',
  motion_retake: 'Motion & Clip Retake',
  script_pacing: 'Script & Pacing',
  dialogue_polish: 'Dialogue Polish',
  audio_sync: 'Audio & Timing Sync',
}
