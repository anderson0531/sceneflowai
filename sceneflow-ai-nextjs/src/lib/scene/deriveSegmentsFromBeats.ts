/**
 * Deterministic production segment derivation from approved storyboard beats.
 */

import {
  planDialogueLineSplits,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import { snapToVeoDuration } from '@/lib/scene/veoDuration'
import {
  applyBeatsToScene,
  getSceneBeats,
  isStoryboardApproved,
} from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { SceneSegment } from '@/components/vision/scene-production/types'

function mintSegmentId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `seg_${crypto.randomUUID().slice(0, 12)}`
  }
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function beatDurationSeconds(beat: SceneBeat): number {
  if (typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0) {
    return snapToVeoDuration(beat.durationSeconds)
  }
  if (beat.kind === 'action') return 8
  const spoken = beat.line?.trim() ?? ''
  if (!spoken) return 8
  const parts = planDialogueLineSplits(spoken, VEO_DIALOGUE_CLIP_MAX_SEC)
  return parts[0]?.veoDuration ?? 8
}

function buildEndFramePrompt(beat: SceneBeat): string {
  if (beat.kind === 'action') {
    return `Motion completion: ${beat.actionDescription ?? 'subtle camera movement and action progress'}`
  }
  if (beat.kind === 'narration') {
    return `Visual progression matching narration mood; subtle environmental motion`
  }
  return `Character completes speaking gesture; subtle expression and body motion`
}

function buildVideoPrompt(beat: SceneBeat): string {
  if (beat.kind === 'action') {
    return beat.actionDescription ?? 'Scene action unfolds with natural motion'
  }
  if (beat.kind === 'narration') {
    return `Visual backdrop for narration; atmospheric motion, no on-screen dialogue text`
  }
  const character = beat.character ?? 'Character'
  const line = beat.line ?? ''
  return `${character} speaks with natural lip sync: "${line.replace(/"/g, "'")}"`
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
  } = {}
): { segment: SceneSegment; duration: number } {
  const duration = beatDurationSeconds(beat)
  const endTime = startTime + duration
  const spokenText = opts.excerpt ?? beat.line ?? ''

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
    generationMethod: 'I2V',
    references: {
      startFrameUrl: beat.storyboardImageUrl,
      endFrameUrl: undefined,
      characterIds: beat.characterId ? [beat.characterId] : [],
      sceneRefIds: [],
      objectRefIds: [],
    },
    startFramePrompt: beat.storyboardImagePrompt ?? beat.actionDescription ?? spokenText,
    endFramePrompt: buildEndFramePrompt(beat),
    generatedPrompt: buildVideoPrompt({ ...beat, line: spokenText || beat.line }),
    action: beat.actionDescription ?? '',
    beatId: beat.beatId,
    veoTimelineContinuation: opts.continuation ?? false,
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

export interface DeriveSegmentsResult {
  segments: SceneSegment[]
  errors: string[]
  /** Scene with updated beats (e.g. after split application). */
  updatedScene?: Record<string, unknown>
}

export function deriveSegmentsFromBeats(
  scene: Record<string, unknown>,
  options?: { requireApproved?: boolean }
): DeriveSegmentsResult {
  const errors: string[] = []

  if (options?.requireApproved !== false && !isStoryboardApproved(scene)) {
    errors.push('Storyboard must be approved before deriving segments')
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
    const isSpoken = beat.kind === 'dialogue' || beat.kind === 'narration'
    const shouldSplit =
      isSpoken &&
      beat.needsSplit &&
      beat.splitRecommendation &&
      beat.splitRecommendation.excerpts.length > 1

    if (shouldSplit && beat.splitRecommendation) {
      const { excerpts, partCount } = beat.splitRecommendation
      for (let i = 0; i < excerpts.length; i++) {
        const { segment, duration } = beatToSegment(beat, sequenceIndex, startTime, {
          partIndex: i,
          partCount,
          excerpt: excerpts[i],
          continuation: i > 0,
        })
        segments.push(segment)
        startTime += duration
        sequenceIndex++
      }
    } else {
      const { segment, duration } = beatToSegment(beat, sequenceIndex, startTime)
      segments.push(segment)
      startTime += duration
      sequenceIndex++
    }
  }

  return { segments, errors }
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
