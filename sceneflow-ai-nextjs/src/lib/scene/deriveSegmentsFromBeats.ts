/**
 * Deterministic production segment derivation from approved storyboard beats.
 */

import {
  estimateSpokenDurationSeconds,
  planDialogueLineSplits,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import { snapToVeoDuration } from '@/lib/scene/veoDuration'
import {
  planContinuousDialogueBeat,
  shouldAutoSplitForExtensionChain,
  type VeoChainPartPlan,
} from '@/lib/scene/veoExtensionChain'
import {
  applyBeatsToScene,
  getSceneBeats,
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
  const line = (spokenText ?? beat.line ?? '').replace(/"/g, "'")
  return `${character} speaks with natural lip sync: "${line}"`
}

function beatToSegment(
  beat: SceneBeat,
  sequenceIndex: number,
  startTime: number,
  opts: {
    partIndex?: number
    partCount?: number
    excerpt?: string
    continuation?: boolean
    duration?: number
    generationMethod?: VideoGenerationMethod
    chainPart?: VeoChainPartPlan
  } = {}
): { segment: SceneSegment; duration: number } {
  const spokenText = opts.excerpt ?? beat.line ?? ''
  const duration =
    opts.duration ??
    opts.chainPart?.timelineSeconds ??
    (beat.kind === 'action'
      ? 8
      : snapToVeoDuration(
          typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
            ? beat.durationSeconds
            : estimateSpokenDurationSeconds(spokenText) || 8
        ))
  const endTime = startTime + duration

  const generationMethod: VideoGenerationMethod =
    opts.generationMethod ??
    opts.chainPart?.method ??
    'I2V'

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
    transitionType: opts.continuation ? 'CONTINUE' : 'CUT',
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
    veoTimelineContinuation: opts.continuation ?? false,
    ...(opts.chainPart
      ? {
          videoChain: {
            partIndex: opts.chainPart.partIndex,
            partCount: opts.chainPart.partCount,
            chainMethod: opts.chainPart.chainMethod,
            extensionSeconds:
              opts.chainPart.chainMethod === 'extension' ? 7 : undefined,
            extensionStep: opts.chainPart.extensionStep,
          },
        }
      : {}),
    ...(opts.partCount && opts.partCount > 1
      ? {
          dialoguePortion: {
            lineId: beat.lineId ?? beat.beatId,
            partIndex: opts.partIndex ?? 0,
            partCount: opts.partCount,
            excerpt: spokenText,
          },
        }
      : {}),
  }

  return { segment, duration }
}

function resolveSplitExcerpts(beat: SceneBeat): string[] | null {
  if (beat.splitRecommendation && beat.splitRecommendation.excerpts.length > 1) {
    return beat.splitRecommendation.excerpts
  }
  const line = beat.line?.trim()
  if (!line) return null
  if (!shouldAutoSplitForExtensionChain(line, beat.durationSeconds)) {
    return null
  }
  const chain = planContinuousDialogueBeat(line)
  if (chain.parts.length <= 1) return null
  return chain.parts.map((p) => p.excerpt)
}

function appendSegmentsFromBeat(
  beat: SceneBeat,
  segments: SceneSegment[],
  startTime: number,
  sequenceIndex: number
): { startTime: number; sequenceIndex: number } {
  const isSpoken = beat.kind === 'dialogue' || beat.kind === 'narration'
  const line = beat.line?.trim() ?? ''

  if (isSpoken && line && shouldAutoSplitForExtensionChain(line, beat.durationSeconds)) {
    const chain = planContinuousDialogueBeat(line)
    for (const part of chain.parts) {
      const { segment, duration } = beatToSegment(beat, sequenceIndex, startTime, {
        partIndex: part.partIndex,
        partCount: part.partCount,
        excerpt: part.excerpt,
        continuation: part.partIndex > 0,
        duration: part.timelineSeconds,
        generationMethod: part.method,
        chainPart: part,
      })
      segments.push(segment)
      startTime += duration
      sequenceIndex++
    }
    return { startTime, sequenceIndex }
  }

  const manualExcerpts =
    beat.needsSplit && beat.splitRecommendation
      ? beat.splitRecommendation.excerpts
      : resolveSplitExcerpts(beat)

  if (manualExcerpts && manualExcerpts.length > 1) {
    const chain = planContinuousDialogueBeat(line)
    const parts =
      chain.parts.length === manualExcerpts.length
        ? chain.parts
        : chain.parts.slice(0, manualExcerpts.length)
    for (let i = 0; i < manualExcerpts.length; i++) {
      const part = parts[i]
      const excerpt = manualExcerpts[i]
      const { segment, duration } = beatToSegment(beat, sequenceIndex, startTime, {
        partIndex: i,
        partCount: manualExcerpts.length,
        excerpt,
        continuation: i > 0,
        duration: part?.timelineSeconds,
        generationMethod: part?.method ?? (i > 0 ? 'EXT' : 'I2V'),
        chainPart: part,
      })
      segments.push(segment)
      startTime += duration
      sequenceIndex++
    }
    return { startTime, sequenceIndex }
  }

  const { segment, duration } = beatToSegment(beat, sequenceIndex, startTime)
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

export function deriveSegmentsFromBeats(
  scene: Record<string, unknown>,
  options?: { requireApproved?: boolean }
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

  const missingFrames = beats.filter((b) => !b.storyboardImageUrl?.trim())
  if (missingFrames.length > 0) {
    errors.push(
      `${missingFrames.length} beat(s) missing storyboard frames: ${missingFrames.map((b) => b.beatId).join(', ')}`
    )
    return { segments: [], errors }
  }

  const segments: SceneSegment[] = []
  let startTime = 0
  let sequenceIndex = 0

  for (const beat of beats) {
    const next = appendSegmentsFromBeat(beat, segments, startTime, sequenceIndex)
    startTime = next.startTime
    sequenceIndex = next.sequenceIndex
  }

  const warnings = collectDraftStoryboardFrameWarnings(scene)

  return { segments, errors, ...(warnings.length ? { warnings } : {}) }
}

/** Apply a dialogue split to beats and re-derive segments. */
export function applyBeatSplitAndDerive(
  scene: Record<string, unknown>,
  beatId: string
): DeriveSegmentsResult {
  const beats = getSceneBeats(scene)
  const beat = beats.find((b) => b.beatId === beatId)
  if (!beat || !beat.line) {
    return { segments: [], errors: ['Beat not found or has no dialogue'] }
  }
  const parts = planDialogueLineSplits(beat.line, VEO_DIALOGUE_CLIP_MAX_SEC)
  if (parts.length <= 1) {
    return deriveSegmentsFromBeats(scene)
  }
  const updatedBeats = beats.map((b) =>
    b.beatId === beatId
      ? {
          ...b,
          needsSplit: true,
          splitRecommendation: {
            partCount: parts.length,
            excerpts: parts.map((p) => p.excerpt),
          },
        }
      : b
  )
  const updatedScene = applyBeatsToScene(scene, updatedBeats)
  const result = deriveSegmentsFromBeats(updatedScene)
  return { ...result, updatedScene }
}
