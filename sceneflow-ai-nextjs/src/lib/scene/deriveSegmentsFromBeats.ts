/**
 * Deterministic production segment derivation from approved storyboard beats.
 * Kling-first: one beat = one segment (no Veo extension-chain auto-split).
 */

import {
  estimateSpokenDurationSeconds,
  resolveBeatSpokenDuration,
} from '@/lib/scene/dialogueSegmentSplit'
import { parsePerformanceCue } from '@/lib/scene/performanceCues'
import { KLING_SINGLE_CLIP_MAX_SEC } from '@/lib/kling/types'
import {
  getSceneBeats,
  isBeatExcluded,
  isStoryboardApproved,
} from '@/lib/script/beatMigration'
import { collectDraftStoryboardFrameWarnings } from '@/lib/storyboard/storyboardQuality'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import type { VideoGenerationMethod } from '@/components/vision/scene-production/types'

function mintSegmentId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `seg_${crypto.randomUUID().slice(0, 12)}`
  }
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Snap spoken timeline duration to Kling single-clip bounds (3–15s). */
function snapToKlingDuration(seconds: number): number {
  const rounded = Math.round(seconds)
  return Math.min(KLING_SINGLE_CLIP_MAX_SEC, Math.max(3, rounded))
}

function shortenVisualPrompt(text: string, maxLen = 160): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen).trim()}…`
}

export function buildEndFramePrompt(beat: SceneBeat): string {
  const startVisual =
    beat.storyboardImagePrompt?.trim() ||
    (beat.kind === 'action' ? beat.actionDescription?.trim() : undefined) ||
    beat.line?.replace(/\[[^\]]*\]/g, '').trim()

  if (beat.kind === 'action') {
    if (startVisual) {
      return `Subtle visual progression while preserving composition: ${shortenVisualPrompt(startVisual)}`
    }
    return `Motion completion: ${beat.actionDescription ?? 'subtle camera movement and action progress'}`
  }
  if (beat.kind === 'narration') {
    if (startVisual) {
      return `Subtle environmental motion while preserving composition: ${shortenVisualPrompt(startVisual)}`
    }
    return `Visual progression matching narration mood; subtle environmental motion`
  }
  return `Character completes speaking gesture; subtle expression and body motion`
}

function buildVideoPrompt(beat: SceneBeat, spokenText?: string): string {
  if (beat.kind === 'action') {
    return beat.actionDescription ?? 'Scene action unfolds with natural motion'
  }
  if (beat.kind === 'narration') {
    return `Visual backdrop for narration; atmospheric motion, no on-screen dialogue text`
  }
  const character = beat.character ?? 'Character'
  const rawLine = spokenText ?? beat.line ?? ''
  const parsed = parsePerformanceCue(rawLine)
  const line = parsed.spokenText.replace(/"/g, "'")
  const deliverySuffix = parsed.deliveryProse
    ? ` Delivery: ${parsed.deliveryProse}.`
    : ''
  return `${character} speaks with natural lip sync: "${line}".${deliverySuffix}`
}

function beatToSegment(
  beat: SceneBeat,
  sequenceIndex: number,
  startTime: number,
  opts: {
    duration?: number
    generationMethod?: VideoGenerationMethod
  } = {}
): { segment: SceneSegment; duration: number } {
  const spokenText = beat.line ?? ''
  const duration =
    opts.duration ??
    (beat.kind === 'action'
      ? 8
      : snapToKlingDuration(
          typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
            ? beat.durationSeconds
            : estimateSpokenDurationSeconds(spokenText) || 8
        ))
  const endTime = startTime + duration

  const generationMethod: VideoGenerationMethod = opts.generationMethod ?? 'REF'

  const preVisStartUrl = beat.storyboardImageUrl?.trim() || undefined
  const preVisEndUrl = beat.storyboardEndImageUrl?.trim() || undefined
  const fullyAnchored = !!(preVisStartUrl && preVisEndUrl)

  const segment: SceneSegment = {
    segmentId: mintSegmentId(),
    sequenceIndex,
    startTime,
    endTime,
    status: 'DRAFT',
    assetType: null,
    takes: [],
    segmentDirection: null,
    transitionType: 'CUT',
    ...(preVisStartUrl
      ? {
          startFrameUrl: preVisStartUrl,
          anchorStatus: fullyAnchored
            ? ('fully-anchored' as const)
            : ('start-locked' as const),
        }
      : {}),
    ...(preVisEndUrl ? { endFrameUrl: preVisEndUrl } : {}),
    dialogueLineIds: beat.lineId && beat.kind !== 'action' ? [beat.lineId] : [],
    dialogueLines:
      beat.kind !== 'action' && spokenText
        ? [
            {
              id: beat.lineId ?? beat.beatId,
              character: beat.character ?? '',
              line: spokenText,
            },
          ]
        : [],
    generationMethod,
    references: {
      startFrameUrl: preVisStartUrl,
      endFrameUrl: preVisEndUrl,
      characterIds: beat.characterId ? [beat.characterId] : [],
      sceneRefIds: [],
      objectRefIds: [],
    },
    startFramePrompt: beat.storyboardImagePrompt ?? beat.actionDescription ?? spokenText,
    endFramePrompt: beat.storyboardEndImagePrompt ?? buildEndFramePrompt(beat),
    generatedPrompt: buildVideoPrompt(beat, spokenText),
    action: beat.actionDescription ?? '',
    beatId: beat.beatId,
    veoTimelineContinuation: false,
  }

  return { segment, duration }
}

function appendSegmentsFromBeat(
  beat: SceneBeat,
  segments: SceneSegment[],
  startTime: number,
  sequenceIndex: number,
  scene: Record<string, unknown>,
  language: string
): { startTime: number; sequenceIndex: number } {
  const spokenDuration = resolveBeatSpokenDuration(beat, scene, language)
  const durationOverride =
    beat.kind === 'action'
      ? undefined
      : snapToKlingDuration(
          spokenDuration || estimateSpokenDurationSeconds(beat.line ?? '') || 8
        )

  const { segment, duration } = beatToSegment(beat, sequenceIndex, startTime, {
    duration: durationOverride,
  })
  segments.push(segment)
  return { startTime: startTime + duration, sequenceIndex: sequenceIndex + 1 }
}

export interface DeriveSegmentsResult {
  segments: SceneSegment[]
  errors: string[]
  /** Non-blocking quality notices (e.g. draft storyboard frames). */
  warnings?: string[]
  /** Scene with updated beats (e.g. after split application). */
  updatedScene?: Record<string, unknown>
}

export interface DeriveSegmentsOptions {
  requireApproved?: boolean
  language?: string
  existingSegments?: SceneSegment[]
}

/** Preserve generated/uploaded assets when re-deriving extension timing. */
export function mergeDerivedSegmentsWithExisting(
  newSegments: SceneSegment[],
  existing: SceneSegment[]
): SceneSegment[] {
  if (existing.length === 0) return newSegments

  return newSegments.map((seg) => {
    const partIndex = seg.dialoguePortion?.partIndex ?? 0
    const match = existing.find(
      (existingSeg) =>
        existingSeg.beatId === seg.beatId &&
        (existingSeg.dialoguePortion?.partIndex ?? 0) === partIndex
    )
    if (!match) return seg

    const preservedStart =
      match.startFrameUrl?.trim() ||
      match.references?.startFrameUrl?.trim() ||
      undefined

    return {
      ...seg,
      segmentId: match.segmentId,
      status: match.status ?? seg.status,
      assetType: match.assetType ?? seg.assetType,
      activeAssetUrl: match.activeAssetUrl ?? seg.activeAssetUrl,
      takes: match.takes?.length ? match.takes : seg.takes,
      isUserUpload: match.isUserUpload,
      actualVideoDuration: match.actualVideoDuration ?? seg.actualVideoDuration,
      userEditedPrompt: match.userEditedPrompt ?? seg.userEditedPrompt,
      ...(preservedStart ? { startFrameUrl: preservedStart } : {}),
      references: {
        ...seg.references,
        ...(preservedStart ? { startFrameUrl: preservedStart } : {}),
        ...(match.references?.endFrameUrl
          ? { endFrameUrl: match.references.endFrameUrl }
          : {}),
      },
      endFrameUrl: match.endFrameUrl ?? seg.endFrameUrl,
      watermarkCropPercent: match.watermarkCropPercent ?? seg.watermarkCropPercent,
      videoTrimInSec: match.videoTrimInSec ?? seg.videoTrimInSec,
      videoTrimOutSec: match.videoTrimOutSec ?? seg.videoTrimOutSec,
      mixerBeatIncluded: match.mixerBeatIncluded ?? seg.mixerBeatIncluded,
    }
  })
}

export function deriveSegmentsFromBeats(
  scene: Record<string, unknown>,
  options?: DeriveSegmentsOptions
): DeriveSegmentsResult {
  const errors: string[] = []

  if (options?.requireApproved !== false && !isStoryboardApproved(scene)) {
    errors.push('Pre-vis must be approved before deriving segments')
    return { segments: [], errors }
  }

  const beats = getSceneBeats(scene)
  if (beats.length === 0) {
    errors.push('Scene has no beats')
    return { segments: [], errors }
  }

  const activeBeats = beats.filter((beat) => !isBeatExcluded(beat))
  if (activeBeats.length === 0) {
    errors.push('Scene has no active beats (all beats are excluded)')
    return { segments: [], errors }
  }

  const missingFrames = activeBeats.filter((b) => !b.storyboardImageUrl?.trim())
  if (missingFrames.length > 0) {
    errors.push(
      `${missingFrames.length} beat(s) missing storyboard frames: ${missingFrames.map((b) => b.beatId).join(', ')}`
    )
    return { segments: [], errors }
  }

  const language = options?.language ?? 'en'
  const segments: SceneSegment[] = []
  let startTime = 0
  let sequenceIndex = 0

  for (const beat of activeBeats) {
    const next = appendSegmentsFromBeat(
      beat,
      segments,
      startTime,
      sequenceIndex,
      scene,
      language
    )
    startTime = next.startTime
    sequenceIndex = next.sequenceIndex
  }

  const mergedSegments = options?.existingSegments?.length
    ? mergeDerivedSegmentsWithExisting(segments, options.existingSegments)
    : segments

  const warnings = collectDraftStoryboardFrameWarnings(scene)

  return {
    segments: mergedSegments,
    errors,
    ...(warnings.length ? { warnings } : {}),
  }
}

/**
 * @deprecated Veo dialogue splits removed — delegates to deriveSegmentsFromBeats.
 * extendBeatId is ignored for backward compatibility.
 */
export function applyBeatSplitAndDerive(
  scene: Record<string, unknown>,
  _beatId: string,
  options?: Pick<DeriveSegmentsOptions, 'language' | 'existingSegments'>
): DeriveSegmentsResult {
  return deriveSegmentsFromBeats(scene, options)
}
