/**
 * Deterministic production segment derivation from approved storyboard beats.
 * One beat = one segment unless spoken duration exceeds the Omni 10s clip budget,
 * in which case the line is split across continuation shots (never shortened).
 */

import {
  estimateSpokenDurationSeconds,
  planDialogueLineSplits,
  resolveBeatSpokenDuration,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import { formatPerformanceClause, parsePerformanceCue } from '@/lib/scene/performanceCues'
import { KLING_SINGLE_CLIP_MAX_SEC } from '@/lib/kling/types'
import {
  getSceneBeats,
  isBeatExcluded,
  isStoryboardApproved,
} from '@/lib/script/beatMigration'
import { collectDraftStoryboardFrameWarnings } from '@/lib/storyboard/storyboardQuality'
import { actionFramingFromStoredPrompt } from '@/lib/imagen/structuredStillPrompt'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { SceneSegment } from '@/components/vision/scene-production/types'
import type { VideoGenerationMethod } from '@/components/vision/scene-production/types'
import { unionRowsById } from '@/lib/storyboard/mediaVersions'

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
    actionFramingFromStoredPrompt(beat.storyboardImagePrompt) ||
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

function beatDirectionSummary(beat: SceneBeat): string {
  const d = beat.beatDirection
  if (!d) return ''
  const parts: string[] = []
  if (d.shotType) parts.push(d.shotType)
  if (d.cameraMovement) parts.push(d.cameraMovement)
  if (d.blocking) parts.push(d.blocking)
  if (d.emotion) parts.push(d.emotion)
  return parts.filter(Boolean).join('; ')
}

function buildVideoPrompt(beat: SceneBeat, spokenText?: string): string {
  const summary = beatDirectionSummary(beat)
  const summarySuffix = summary ? ` ${summary}.` : ''
  if (beat.kind === 'action') {
    return `${beat.actionDescription ?? 'Scene action unfolds with natural motion'}${summarySuffix}`
  }
  if (beat.kind === 'narration') {
    return `Visual backdrop for narration; atmospheric motion, no on-screen dialogue text.${summarySuffix}`
  }
  const character = beat.character ?? 'Character'
  const rawLine = spokenText ?? beat.line ?? ''
  const parsed = parsePerformanceCue(rawLine)
  const line = parsed.spokenText.replace(/"/g, "'")
  const deliverySuffix = parsed.deliveryProse
    ? ` Delivery: ${parsed.deliveryProse}.`
    : ''
  const performance = formatPerformanceClause(beat.voiceDirection)
  return `${character} speaks with natural lip sync: "${line}".${deliverySuffix}${performance}${summarySuffix}`
}

function beatToSegment(
  beat: SceneBeat,
  sequenceIndex: number,
  startTime: number,
  opts: {
    duration?: number
    generationMethod?: VideoGenerationMethod
    spokenExcerpt?: string
    dialoguePortion?: SceneSegment['dialoguePortion']
    veoTimelineContinuation?: boolean
    videoChain?: SceneSegment['videoChain']
    transitionType?: SceneSegment['transitionType']
  } = {}
): { segment: SceneSegment; duration: number } {
  const fullSpoken = beat.line ?? ''
  const spokenText = opts.spokenExcerpt ?? fullSpoken
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

  const beatTransition = beat.beatDirection?.transition
  const segmentTransition =
    opts.transitionType ??
    (beatTransition === 'CONTINUE' ? 'CONTINUE' : 'CUT')

  const segment: SceneSegment = {
    segmentId: mintSegmentId(),
    sequenceIndex,
    startTime,
    endTime,
    status: 'DRAFT',
    assetType: null,
    takes: [],
    segmentDirection: null,
    transitionType: segmentTransition,
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
              ...(beat.voiceDirection?.trim()
                ? { voiceDirection: beat.voiceDirection.trim() }
                : {}),
            },
          ]
        : [],
    ...(opts.dialoguePortion ? { dialoguePortion: opts.dialoguePortion } : {}),
    generationMethod,
    references: {
      startFrameUrl: preVisStartUrl,
      endFrameUrl: preVisEndUrl,
      characterIds: beat.characterId ? [beat.characterId] : [],
      sceneRefIds: [],
      objectRefIds: [],
    },
    startFramePrompt:
      actionFramingFromStoredPrompt(beat.storyboardImagePrompt) ||
      beat.actionDescription ||
      spokenText,
    endFramePrompt:
      actionFramingFromStoredPrompt(beat.storyboardEndImagePrompt) || buildEndFramePrompt(beat),
    generatedPrompt: buildVideoPrompt(beat, spokenText),
    action: beat.actionDescription ?? '',
    beatId: beat.beatId,
    veoTimelineContinuation: opts.veoTimelineContinuation ?? false,
    ...(opts.videoChain ? { videoChain: opts.videoChain } : {}),
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
  const spokenText = beat.line ?? ''
  const parts =
    beat.kind !== 'action' && spokenText.trim()
      ? planDialogueLineSplits(spokenText, VEO_DIALOGUE_CLIP_MAX_SEC)
      : []

  if (parts.length > 1) {
    let nextStart = startTime
    let nextIndex = sequenceIndex
    for (const part of parts) {
      const isContinuation = part.partIndex > 0
      const { segment, duration } = beatToSegment(beat, nextIndex, nextStart, {
        duration: Math.min(
          VEO_DIALOGUE_CLIP_MAX_SEC,
          Math.max(4, part.veoDuration)
        ),
        generationMethod: isContinuation ? 'EXT' : 'REF',
        spokenExcerpt: part.excerpt,
        dialoguePortion: {
          lineId: beat.lineId ?? beat.beatId,
          partIndex: part.partIndex,
          partCount: part.partCount,
          excerpt: part.excerpt,
        },
        veoTimelineContinuation: isContinuation,
        videoChain: {
          partIndex: part.partIndex,
          partCount: part.partCount,
          chainMethod: isContinuation ? 'extension' : 'initial',
          ...(isContinuation
            ? { extensionSeconds: part.veoDuration, extensionStep: part.partIndex }
            : {}),
        },
        transitionType: isContinuation
          ? 'CONTINUE'
          : beat.beatDirection?.transition === 'CONTINUE'
            ? 'CONTINUE'
            : 'CUT',
      })
      segments.push(segment)
      nextStart += duration
      nextIndex += 1
    }
    return { startTime: nextStart, sequenceIndex: nextIndex }
  }

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

/** The running order segments have to match: active beats, in beat order. */
export function activeBeatIdOrder(scene: Record<string, unknown>): string[] {
  return getSceneBeats(scene)
    .filter((beat) => !isBeatExcluded(beat))
    .map((beat) => beat.beatId)
}

/** The beat order the segments currently express, de-duplicated across splits. */
function segmentBeatIdOrder(segments: SceneSegment[]): string[] {
  const order: string[] = []
  for (const segment of segments) {
    if (!segment.beatId) continue
    if (order.includes(segment.beatId)) continue
    order.push(segment.beatId)
  }
  return order
}

/**
 * Auto-derive attempt identity. Include and exclude change the active beat
 * list, so each set is allowed its own derive. A scene-only key would keep
 * the Mixer on the shorter list after a beat is included again.
 */
export function productionDeriveAttemptKey(
  sceneId: string,
  scene: Record<string, unknown>
): string {
  return `${sceneId}::${activeBeatIdOrder(scene).join('|')}`
}

/**
 * Whether the segments still run in the beats' order.
 *
 * Set membership is not enough on its own: a beat reorder changes no ids at
 * all, so without this the segment row, its `sequenceIndex` and its timeline
 * keep the order the beats had before the move.
 */
export function segmentOrderMatchesBeats(
  scene: Record<string, unknown>,
  segments: SceneSegment[] | null | undefined
): boolean {
  const existing = segments ?? []
  if (existing.length === 0) return true

  const segmentOrder = segmentBeatIdOrder(existing)
  if (segmentOrder.length === 0) return true

  const beatOrder = activeBeatIdOrder(scene).filter((beatId) =>
    segmentOrder.includes(beatId)
  )
  return beatOrder.join('|') === segmentOrder.join('|')
}

/** Production clips cover every active beat, in beat order. Dialogue splits are allowed. */
export function segmentsAreOnePerActiveBeat(
  scene: Record<string, unknown>,
  segments: SceneSegment[] | null | undefined
): boolean {
  return segmentsCoverActiveBeats(scene, segments)
}

function segmentsCoverActiveBeats(
  scene: Record<string, unknown>,
  segments: SceneSegment[] | null | undefined
): boolean {
  const beatOrder = activeBeatIdOrder(scene)
  const existing = segments ?? []
  if (beatOrder.length === 0) return true
  if (existing.length === 0) return false

  const byBeat = new Map<string, SceneSegment[]>()
  const seenOrder: string[] = []
  for (const segment of existing) {
    if (!segment.beatId || !beatOrder.includes(segment.beatId)) continue
    if (!byBeat.has(segment.beatId)) {
      byBeat.set(segment.beatId, [])
      seenOrder.push(segment.beatId)
    }
    byBeat.get(segment.beatId)!.push(segment)
  }

  if (seenOrder.length !== beatOrder.length) return false
  if (seenOrder.join('|') !== beatOrder.join('|')) return false

  for (const beatId of beatOrder) {
    const parts = [...(byBeat.get(beatId) ?? [])].sort(
      (a, b) => (a.dialoguePortion?.partIndex ?? 0) - (b.dialoguePortion?.partIndex ?? 0)
    )
    if (parts.length === 0) return false
    const partCount = parts[0].dialoguePortion?.partCount ?? 1
    if (partCount <= 1) {
      if (parts.length !== 1) return false
      continue
    }
    if (parts.length !== partCount) return false
    for (let i = 0; i < parts.length; i++) {
      if ((parts[i].dialoguePortion?.partIndex ?? 0) !== i) return false
      if ((parts[i].dialoguePortion?.partCount ?? 1) !== partCount) return false
    }
  }
  return true
}

/**
 * Whether production segments should be rebuilt from beats.
 * A missing still does not block this: the Mixer still needs a row for that beat.
 * Extra clips on the same beat are stale unless they are a well-formed dialogue split.
 */
export function needsProductionDerive(
  scene: Record<string, unknown>,
  segments: SceneSegment[] | null | undefined
): boolean {
  const activeBeats = getSceneBeats(scene).filter((beat) => !isBeatExcluded(beat))
  if (activeBeats.length === 0) return false
  return !segmentsAreOnePerActiveBeat(scene, segments)
}

/**
 * Reorder existing production segments into the beats' running order.
 *
 * This is what a beat reorder needs rather than a re-derive. Every segment
 * already exists and may hold generated video, while a re-derive rewrites
 * prompts and refuses outright on a beat whose storyboard frame is still
 * missing. Segments are matched to their beat by `beatId`, keep their own
 * duration, and have `sequenceIndex` and cumulative timing recomputed.
 *
 * Returns the input untouched when the segments do not correspond to the
 * active beats — a segment with no beat link, or one whose beat is gone, means
 * beats were added or removed and that is a derive, not a reorder.
 */
export function reorderSegmentsToMatchBeats(
  scene: Record<string, unknown>,
  segments: SceneSegment[] | null | undefined
): SceneSegment[] {
  const existing = segments ?? []
  if (existing.length < 2) return existing

  const beatOrder = activeBeatIdOrder(scene)
  const position = new Map(beatOrder.map((beatId, index) => [beatId, index]))
  if (existing.some((seg) => !seg.beatId || !position.has(seg.beatId))) return existing

  const ordered = [...existing].sort((a, b) => {
    const byBeat =
      (position.get(a.beatId as string) ?? 0) - (position.get(b.beatId as string) ?? 0)
    if (byBeat !== 0) return byBeat
    // Several segments on one beat are a dialogue split, whose parts run in
    // their own order inside the beat.
    return (a.dialoguePortion?.partIndex ?? 0) - (b.dialoguePortion?.partIndex ?? 0)
  })

  let startTime = 0
  return ordered.map((segment, index) => {
    const duration = Math.max(0, (segment.endTime ?? 0) - (segment.startTime ?? 0))
    const next: SceneSegment = {
      ...segment,
      sequenceIndex: index,
      startTime,
      endTime: startTime + duration,
    }
    startTime += duration
    return next
  })
}

function existingSegmentScore(segment: SceneSegment): number {
  let score = 0
  if (segment.status === 'COMPLETE' && segment.assetType === 'video' && segment.activeAssetUrl) {
    score += 100
  } else if (segment.activeAssetUrl) {
    score += 40
  }
  if ((segment.takes?.length ?? 0) > 0) score += 10
  if ((segment.dialoguePortion?.partIndex ?? 0) === 0) score += 5
  return score
}

/** One surviving row per beat. Prefer a completed video over the first split. */
function preferExistingSegment(candidates: SceneSegment[]): SceneSegment | undefined {
  if (candidates.length === 0) return undefined
  return [...candidates].sort((a, b) => existingSegmentScore(b) - existingSegmentScore(a))[0]
}

/** Preserve generated/uploaded assets when re-deriving extension timing. */
export function mergeDerivedSegmentsWithExisting(
  newSegments: SceneSegment[],
  existing: SceneSegment[]
): SceneSegment[] {
  if (existing.length === 0) return newSegments

  return newSegments.map((seg) => {
    const partIndex = seg.dialoguePortion?.partIndex ?? 0
    const newPartCount = seg.dialoguePortion?.partCount ?? 1
    const candidates = existing.filter((existingSeg) => existingSeg.beatId === seg.beatId)
    const partMatch =
      newPartCount > 1
        ? existing.find(
            (existingSeg) =>
              existingSeg.beatId === seg.beatId &&
              (existingSeg.dialoguePortion?.partIndex ?? 0) === partIndex
          )
        : undefined
    const match = partMatch ?? preferExistingSegment(candidates)
    if (!match) return seg
    const takes = candidates.reduce(
      (rows, candidate) => unionRowsById(rows, candidate.takes, 'id'),
      seg.takes ?? []
    )

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
      takes,
      currentTakeId: match.currentTakeId || seg.currentTakeId,
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
      // Derived rows are the included beats. A false left from when this beat
      // was excluded must not hide it in the Mixer again.
      mixerBeatIncluded:
        match.mixerBeatIncluded === false
          ? true
          : (match.mixerBeatIncluded ?? seg.mixerBeatIncluded),
    }
  })
}

export function deriveSegmentsFromBeats(
  scene: Record<string, unknown>,
  options?: DeriveSegmentsOptions
): DeriveSegmentsResult {
  const errors: string[] = []

  if (options?.requireApproved === true && !isStoryboardApproved(scene)) {
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
  const warnings = [
    ...collectDraftStoryboardFrameWarnings(scene),
    ...(missingFrames.length > 0
      ? [
          `${missingFrames.length} beat(s) missing storyboard frames: ${missingFrames.map((b) => b.beatId).join(', ')}`,
        ]
      : []),
  ]

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
  const activeIds = new Set(mergedSegments.map((segment) => segment.beatId).filter(Boolean))
  const preservedExcluded: SceneSegment[] = []
  const seenExcluded = new Set<string>()
  for (const beat of beats) {
    if (!isBeatExcluded(beat) || !beat.beatId || activeIds.has(beat.beatId) || seenExcluded.has(beat.beatId)) {
      continue
    }
    const kept = (options?.existingSegments ?? []).find((segment) => segment.beatId === beat.beatId)
    if (!kept) continue
    seenExcluded.add(beat.beatId)
    preservedExcluded.push(kept)
  }

  return {
    segments: [...mergedSegments, ...preservedExcluded],
    errors,
    ...(warnings.length ? { warnings } : {}),
  }
}

/**
 * Split long dialogue at derive time when spoken duration exceeds the Omni 10s clip budget.
 * extendBeatId is ignored for backward compatibility — all spoken beats are considered.
 */
export function applyBeatSplitAndDerive(
  scene: Record<string, unknown>,
  _beatId: string,
  options?: Pick<DeriveSegmentsOptions, 'language' | 'existingSegments'>
): DeriveSegmentsResult {
  return deriveSegmentsFromBeats(scene, options)
}
