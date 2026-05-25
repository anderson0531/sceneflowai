/**
 * Storyboard frame types and helpers for dialogue-line visual cuts.
 *
 * Establishing frame: scene.imageUrl (narration/description)
 * Dialogue frames: scene.dialogue[i].storyboardImageUrl
 */

import {
  dialogueLineIdForIndex,
  findDialogueAudioForLine,
} from '@/components/vision/scene-production/audioTrackBuilder'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { resolveStandaloneNarrationUrl } from '@/lib/script/narration'
import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'

const NARRATION_CLIP_BUFFER_SEC = 0.5
const DIALOGUE_CLIP_BUFFER_SEC = 0.3
const DEFAULT_CLIP_DURATION_SEC = 3

/** Storyboard image fields stored on each dialogue line object. */
export interface DialogueStoryboardFrame {
  storyboardImageUrl?: string
  storyboardImagePrompt?: string
  storyboardImageGcsPath?: string
}

export type StoryboardFrameType = 'establishing' | 'dialogue' | 'custom'

/** User-managed custom storyboard cut (independent of script dialogue). */
export interface SceneStoryboardFrame {
  id: string
  label?: string
  character?: string
  line?: string
  imageUrl?: string
  imagePrompt?: string
  imageGcsPath?: string
  durationSec?: number
  order: number
}

/** Flat frame entry for exports and reports. */
export interface FlatStoryboardFrame {
  sceneNumber: number
  frameType: StoryboardFrameType
  dialogueIndex?: number
  customFrameId?: string
  imageUrl?: string
  visualDescription?: string
  shotType?: string
  cameraAngle?: string
  lighting?: string
  duration?: number
  character?: string
  line?: string
  label?: string
}

/** Minimal audio clip shape used to build the visual timeline. */
export interface StoryboardAudioClip {
  id: string
  url?: string
  startTime: number
  duration: number
  type: 'narration' | 'dialogue' | 'description' | 'music' | 'sfx'
  label?: string
  /** Script dialogue line index (matches scene.dialogue[i]). */
  dialogueIndex?: number
  /** Beat-first scenes: links clip to scene.beats[]. */
  beatId?: string
}

/** A single visual frame in playback order, aligned to an audio clip window. */
export interface StoryboardVisualFrame {
  clipId: string
  frameType: StoryboardFrameType
  dialogueIndex?: number
  imageUrl?: string
  startTime: number
  duration: number
  label?: string
  character?: string
  line?: string
}

function createStoryboardFrameId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `sbf_${crypto.randomUUID().slice(0, 12)}`
  }
  return `sbf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Custom frames sorted by order. */
export function getOrderedStoryboardFrames(
  scene: Record<string, unknown> | null | undefined
): SceneStoryboardFrame[] {
  const frames = Array.isArray(scene?.storyboardFrames) ? scene!.storyboardFrames : []
  return [...(frames as SceneStoryboardFrame[])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/** Append a new custom frame; returns the new frame (mutates scene in place). */
export function appendStoryboardFrame(
  scene: Record<string, unknown>,
  partial?: Partial<Omit<SceneStoryboardFrame, 'id' | 'order'>>
): SceneStoryboardFrame {
  const existing = getOrderedStoryboardFrames(scene)
  const nextOrder =
    existing.length > 0 ? Math.max(...existing.map((f) => f.order ?? 0)) + 1 : 0
  const frame: SceneStoryboardFrame = {
    id: createStoryboardFrameId(),
    order: nextOrder,
    label: partial?.label ?? `Frame ${nextOrder + 1}`,
    ...partial,
  }
  if (!Array.isArray(scene.storyboardFrames)) {
    scene.storyboardFrames = []
  }
  ;(scene.storyboardFrames as SceneStoryboardFrame[]).push(frame)
  return frame
}

/** Remove a custom frame by id; returns true if removed (mutates scene in place). */
export function removeStoryboardFrame(
  scene: Record<string, unknown>,
  frameId: string
): boolean {
  const arr = scene.storyboardFrames
  if (!Array.isArray(arr)) return false
  const before = arr.length
  scene.storyboardFrames = (arr as SceneStoryboardFrame[]).filter((f) => f.id !== frameId)
  return (scene.storyboardFrames as SceneStoryboardFrame[]).length < before
}

/** Find a custom frame by id. */
export function findStoryboardFrame(
  scene: Record<string, unknown> | null | undefined,
  frameId: string
): SceneStoryboardFrame | undefined {
  return getOrderedStoryboardFrames(scene).find((f) => f.id === frameId)
}

/** One storyboard cut in display/generation order. */
export interface StoryboardFrameSlot {
  key: string
  label: string
  kind: 'action' | 'dialogue' | 'narration' | 'custom'
  beatId?: string
  dialogueIndex?: number
  customFrameId?: string
  /** Image stored directly on this beat/line/frame — not a borrowed fallback. */
  ownImageUrl?: string
  /** URL shown in UI (own image, or borrowed establishing shot). */
  displayImageUrl?: string
  isPlaceholder: boolean
  isMissing: boolean
}

function resolveDialogueIndexForBeatSlot(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  spokenBeatIndex: number
): number | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  if (beat.lineId?.trim()) {
    const idx = dialogue.findIndex(
      (entry) => (entry as Record<string, unknown>)?.lineId === beat.lineId
    )
    if (idx >= 0) return idx
  }
  if (spokenBeatIndex >= 0 && spokenBeatIndex < dialogue.length) return spokenBeatIndex
  return spokenBeatIndex >= 0 ? spokenBeatIndex : undefined
}

function getOwnDialogueStoryboardUrl(
  scene: Record<string, unknown>,
  dialogueIndex: number
): string | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const entry = dialogue[dialogueIndex] as Record<string, unknown> | undefined
  const flatUrl = entry?.storyboardImageUrl
  if (isValidStoryboardMediaUrl(flatUrl)) return flatUrl.trim()
  return findSegmentDialogueStoryboardUrl(scene, dialogueIndex)
}

/** Ordered storyboard slots with explicit own vs placeholder image state. */
export function enumerateStoryboardFrameSlots(
  scene: Record<string, unknown> | null | undefined
): StoryboardFrameSlot[] {
  if (!scene) return []

  const beats = getSceneBeats(scene)
  const establishingUrl = getEstablishingFrameUrl(scene)
  const slots: StoryboardFrameSlot[] = []

  if (beats.length > 0) {
    let spokenIdx = 0
    for (const beat of beats) {
      let ownImageUrl = isValidStoryboardMediaUrl(beat.storyboardImageUrl)
        ? beat.storyboardImageUrl!.trim()
        : undefined
      let dialogueIndex: number | undefined

      if (beat.kind !== 'action') {
        dialogueIndex = resolveDialogueIndexForBeatSlot(scene, beat, spokenIdx)
        spokenIdx++
        if (!ownImageUrl && typeof dialogueIndex === 'number') {
          ownImageUrl = getOwnDialogueStoryboardUrl(scene, dialogueIndex)
        }
      }

      let displayImageUrl = ownImageUrl
      if (!displayImageUrl && beat.kind === 'action') {
        displayImageUrl = establishingUrl
      }
      if (!displayImageUrl && beat.kind !== 'action' && typeof dialogueIndex === 'number') {
        displayImageUrl = getStoryboardFrameUrlForDialogueIndex(scene, dialogueIndex)
      }

      const label =
        beat.kind === 'action'
          ? 'Establishing'
          : beat.kind === 'narration'
            ? 'Narrator'
            : String(beat.character || 'Dialogue')

      slots.push({
        key: beat.beatId,
        label,
        kind: beat.kind,
        beatId: beat.beatId,
        dialogueIndex,
        ownImageUrl,
        displayImageUrl,
        isPlaceholder: !ownImageUrl && !!displayImageUrl,
        isMissing: !ownImageUrl && !displayImageUrl,
      })
    }

    for (const frame of getOrderedStoryboardFrames(scene)) {
      const ownImageUrl = isValidStoryboardMediaUrl(frame.imageUrl)
        ? frame.imageUrl!.trim()
        : undefined
      slots.push({
        key: frame.id,
        label: frame.label || 'Custom frame',
        kind: 'custom',
        customFrameId: frame.id,
        ownImageUrl,
        displayImageUrl: ownImageUrl,
        isPlaceholder: false,
        isMissing: !ownImageUrl,
      })
    }

    return slots
  }

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const hasStandaloneNarration =
    !!String(scene.narration ?? '').trim() &&
    !dialogue.some(
      (d: Record<string, unknown>) =>
        d?.kind === 'narration' || d?.characterId === 'narrator'
    )

  if (establishingUrl || dialogue.length === 0 || hasStandaloneNarration) {
    const ownImageUrl = establishingUrl
    slots.push({
      key: 'establishing',
      label: hasStandaloneNarration ? 'Narration' : 'Establishing',
      kind: 'action',
      ownImageUrl,
      displayImageUrl: ownImageUrl,
      isPlaceholder: false,
      isMissing: !ownImageUrl,
    })
  }

  dialogue.forEach((raw, dialogueIndex) => {
    const line = raw as Record<string, unknown>
    const ownImageUrl = getOwnDialogueStoryboardUrl(scene, dialogueIndex)
    const displayImageUrl =
      ownImageUrl ?? getStoryboardFrameUrlForDialogueIndex(scene, dialogueIndex)
    const character = getDialogueLineCharacter(line)
    const lineText = getDialogueLineText(line)
    slots.push({
      key: `dialogue-${dialogueIndex}`,
      label: `${character}${lineText ? `: ${lineText.slice(0, 24)}${lineText.length > 24 ? '…' : ''}` : ''}`,
      kind:
        line.kind === 'narration' || line.characterId === 'narrator'
          ? 'narration'
          : 'dialogue',
      dialogueIndex,
      ownImageUrl,
      displayImageUrl,
      isPlaceholder: !ownImageUrl && !!displayImageUrl,
      isMissing: !ownImageUrl && !displayImageUrl,
    })
  })

  for (const frame of getOrderedStoryboardFrames(scene)) {
    const ownImageUrl = isValidStoryboardMediaUrl(frame.imageUrl)
      ? frame.imageUrl!.trim()
      : undefined
    slots.push({
      key: frame.id,
      label: frame.label || 'Custom frame',
      kind: 'custom',
      customFrameId: frame.id,
      ownImageUrl,
      displayImageUrl: ownImageUrl,
      isPlaceholder: false,
      isMissing: !ownImageUrl,
    })
  }

  return slots
}

/** Count frames with images for gallery badge. */
export function countStoryboardFrameStats(scene: Record<string, unknown>): {
  withImage: number
  total: number
  missing: number
  placeholders: number
} {
  const slots = enumerateStoryboardFrameSlots(scene)
  const withImage = slots.filter((s) => !!s.ownImageUrl).length
  return {
    withImage,
    total: slots.length,
    missing: slots.filter((s) => s.isMissing).length,
    placeholders: slots.filter((s) => s.isPlaceholder).length,
  }
}

/** Frames that still need generation (no dedicated image stored). */
export function countStoryboardFramesNeedingGeneration(
  scene: Record<string, unknown>
): number {
  return enumerateStoryboardFrameSlots(scene).filter((s) => !s.ownImageUrl).length
}

/** Frames with no image at all (not even a borrowed placeholder). */
export function countMissingStoryboardFrames(scene: Record<string, unknown>): number {
  return enumerateStoryboardFrameSlots(scene).filter((s) => s.isMissing).length
}

function getDialogueLineText(d: Record<string, unknown> | null | undefined): string {
  if (!d) return ''
  return String(d.line ?? d.text ?? '')
}

function getDialogueLineCharacter(d: Record<string, unknown> | null | undefined): string {
  if (!d) return ''
  return String(d.character ?? '')
}

/** Parse dialogue index from clip id like "dialogue-0". */
export function parseDialogueIndexFromClipId(clipId: string): number | undefined {
  const match = /^dialogue-(\d+)$/.exec(clipId)
  if (!match) return undefined
  const idx = parseInt(match[1], 10)
  return Number.isFinite(idx) ? idx : undefined
}

/** Establishing frame URL for narration/description. */
export function getEstablishingFrameUrl(scene: Record<string, unknown> | null | undefined): string | undefined {
  const url = scene?.imageUrl
  return isValidStoryboardMediaUrl(url) ? url.trim() : undefined
}

function findSegmentDialogueStoryboardUrl(
  scene: Record<string, unknown>,
  dialogueIndex: number
): string | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const flatLine = dialogue[dialogueIndex] as Record<string, unknown> | undefined
  const lineId = typeof flatLine?.lineId === 'string' ? flatLine.lineId : undefined

  const segments = Array.isArray(scene.segments) ? scene.segments : []
  let positionalIdx = 0
  for (const seg of segments) {
    const segDialogue = Array.isArray((seg as Record<string, unknown>).dialogue)
      ? ((seg as Record<string, unknown>).dialogue as Record<string, unknown>[])
      : []
    for (const line of segDialogue) {
      if (line?.kind === 'narration') continue
      if (lineId && line?.lineId === lineId) {
        const url = line.storyboardImageUrl
        if (isValidStoryboardMediaUrl(url)) return url.trim()
      }
      if (!lineId && positionalIdx === dialogueIndex) {
        const url = line?.storyboardImageUrl
        if (isValidStoryboardMediaUrl(url)) return url.trim()
      }
      positionalIdx++
    }
  }
  return undefined
}

/** Per-dialogue frame URL with fallback to establishing. */
export function getDialogueFrameUrl(
  scene: Record<string, unknown> | null | undefined,
  dialogueIndex: number
): string | undefined {
  if (!scene) return undefined

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const entry = dialogue[dialogueIndex] as Record<string, unknown> | undefined
  const flatUrl = entry?.storyboardImageUrl
  if (isValidStoryboardMediaUrl(flatUrl)) return flatUrl.trim()

  const segmentUrl = findSegmentDialogueStoryboardUrl(scene, dialogueIndex)
  if (segmentUrl) return segmentUrl

  return getEstablishingFrameUrl(scene)
}

function resolveVoiceClipDuration(
  url: string,
  storedDuration: unknown,
  dynamicDurations: Record<string, number>
): number {
  const dynamic = dynamicDurations[url]
  const stored =
    typeof storedDuration === 'number' && storedDuration > 0 ? storedDuration : undefined
  // Ignore poisoned short dynamic values from legacy 404 handlers when metadata has duration.
  if (typeof dynamic === 'number' && dynamic > 0) {
    if (stored && dynamic < 0.5) return stored
    return dynamic
  }
  if (stored) return stored
  return DEFAULT_CLIP_DURATION_SEC
}

function getSpokenBeats(scene: Record<string, unknown>): ReturnType<typeof getSceneBeats> {
  return getSceneBeats(scene).filter((b) => b.kind !== 'action')
}

/** Resolve storyboard image for a script dialogue index, including beat-first storage. */
export function getStoryboardFrameUrlForDialogueIndex(
  scene: Record<string, unknown>,
  dialogueIndex: number
): string | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const line = dialogue[dialogueIndex] as Record<string, unknown> | undefined

  const flatUrl = line?.storyboardImageUrl
  if (isValidStoryboardMediaUrl(flatUrl)) return flatUrl.trim()

  const segmentUrl = findSegmentDialogueStoryboardUrl(scene, dialogueIndex)
  if (segmentUrl) return segmentUrl

  const spokenBeats = getSpokenBeats(scene)
  if (line?.lineId && typeof line.lineId === 'string') {
    const beat = spokenBeats.find((b) => b.lineId === line.lineId)
    if (isValidStoryboardMediaUrl(beat?.storyboardImageUrl)) {
      return beat!.storyboardImageUrl!.trim()
    }
  }

  const beat = spokenBeats[dialogueIndex]
  if (isValidStoryboardMediaUrl(beat?.storyboardImageUrl)) {
    return beat!.storyboardImageUrl!.trim()
  }

  return getEstablishingFrameUrl(scene)
}

function isFoldedNarrationDuplicate(
  entry: Record<string, unknown>,
  url: string,
  narrationUrl: string | undefined
): boolean {
  return (
    (entry.kind === 'narration' || entry.characterId === 'narrator') &&
    !!narrationUrl &&
    url === narrationUrl
  )
}

function resolveBeatDialogueIndex(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  spokenDialogueIdx: number
): number | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  if (beat.lineId?.trim()) {
    const idx = dialogue.findIndex(
      (entry) => (entry as Record<string, unknown>)?.lineId === beat.lineId
    )
    if (idx >= 0) return idx
    return undefined
  }
  if (spokenDialogueIdx >= 0 && spokenDialogueIdx < dialogue.length) return spokenDialogueIdx
  return undefined
}

function beatVoiceClipId(
  beat: ReturnType<typeof getSceneBeats>[number],
  dialogueIndex: number | undefined
): string {
  if (typeof dialogueIndex === 'number' && dialogueIndex >= 0) {
    return dialogueLineIdForIndex(dialogueIndex)
  }
  return `beat-${beat.beatId}`
}

/** Resolve spoken-beat audio from beat fields, dialogue line, or dialogueAudio (legacy storage). */
function resolveBeatVoiceUrl(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  dialogueIndex: number | undefined,
  language: string
): string | undefined {
  const fromBeat = beat.audioUrl?.trim()
  if (fromBeat) return fromBeat

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const line =
    typeof dialogueIndex === 'number' && dialogueIndex >= 0
      ? (dialogue[dialogueIndex] as Record<string, unknown> | undefined)
      : undefined
  const character = beat.character || getDialogueLineCharacter(line)

  const audioEntry = findDialogueAudioForLine(scene, {
    language,
    lineId: beat.lineId,
    ...(typeof dialogueIndex === 'number' ? { dialogueIndex } : {}),
    character,
  }) as Record<string, unknown> | null

  const fromDialogueAudio =
    (typeof audioEntry?.audioUrl === 'string' && audioEntry.audioUrl) ||
    (typeof audioEntry?.url === 'string' && audioEntry.url) ||
    undefined
  if (fromDialogueAudio?.trim()) return fromDialogueAudio.trim()

  const fromLine =
    (typeof line?.audioUrl === 'string' && line.audioUrl) ||
    (typeof line?.url === 'string' && line.url) ||
    undefined
  if (fromLine?.trim()) return fromLine.trim()

  if (beat.kind === 'narration') {
    const standalone = resolveStandaloneNarrationUrl(scene, language)
    if (standalone?.trim()) return standalone.trim()
  }

  return undefined
}

function resolveBeatVoiceDuration(
  url: string,
  beat: ReturnType<typeof getSceneBeats>[number],
  scene: Record<string, unknown>,
  dialogueIndex: number | undefined,
  language: string,
  dynamicDurations: Record<string, number>
): number {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const line =
    typeof dialogueIndex === 'number' && dialogueIndex >= 0
      ? (dialogue[dialogueIndex] as Record<string, unknown> | undefined)
      : undefined
  const audioEntry = findDialogueAudioForLine(scene, {
    language,
    lineId: beat.lineId,
    ...(typeof dialogueIndex === 'number' ? { dialogueIndex } : {}),
    character: beat.character || getDialogueLineCharacter(line),
  }) as Record<string, unknown> | null

  const storedDuration =
    beat.durationSeconds ??
    (typeof audioEntry?.duration === 'number' ? audioEntry.duration : undefined) ??
    (typeof line?.duration === 'number' ? line.duration : undefined) ??
    (typeof line?.durationSeconds === 'number' ? line.durationSeconds : undefined)

  if (beat.kind === 'narration' && storedDuration == null) {
    const narrationAudio = scene.narrationAudio as
      | Record<string, { duration?: number }>
      | undefined
    const langEntry = narrationAudio?.[language] ?? narrationAudio?.en
    if (typeof langEntry?.duration === 'number') {
      return resolveVoiceClipDuration(url, langEntry.duration, dynamicDurations)
    }
    if (typeof scene.narrationDuration === 'number') {
      return resolveVoiceClipDuration(url, scene.narrationDuration, dynamicDurations)
    }
  }

  return resolveVoiceClipDuration(url, storedDuration, dynamicDurations)
}

/**
 * Build sequential voice clips (description → narration → dialogue) for storyboard playback.
 * Dialogue clip IDs use script dialogueIndex (not dialogueAudio array position).
 */
export function buildStoryboardVoiceClips(
  scene: Record<string, unknown> | null | undefined,
  language: string,
  dynamicDurations: Record<string, number> = {}
): StoryboardAudioClip[] {
  if (!scene) return []

  // Beat-first: spoken beats only (dialogue + narration), aligned to script dialogue indices.
  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const beats = getSceneBeats(scene)
    const clips: StoryboardAudioClip[] = []
    let currentStartTime = 0
    let spokenDialogueIdx = 0

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i]
      if (beat.kind === 'action') continue

      let dialogueIndex = resolveBeatDialogueIndex(scene, beat, spokenDialogueIdx)
      if (typeof dialogueIndex === 'number') {
        spokenDialogueIdx = Math.max(spokenDialogueIdx, dialogueIndex + 1)
      }

      const url = resolveBeatVoiceUrl(scene, beat, dialogueIndex, language)
      if (!url) continue

      const duration = resolveBeatVoiceDuration(
        url,
        beat,
        scene,
        dialogueIndex,
        language,
        dynamicDurations
      )
      const isNarration = beat.kind === 'narration'

      clips.push({
        id: beatVoiceClipId(beat, dialogueIndex),
        url,
        startTime: currentStartTime,
        duration,
        type: 'dialogue',
        label: isNarration ? 'Narrator' : beat.character || `Dialogue ${(dialogueIndex ?? spokenDialogueIdx) + 1}`,
        dialogueIndex,
        beatId: beat.beatId,
      })
      currentStartTime +=
        duration + (isNarration ? NARRATION_CLIP_BUFFER_SEC : DIALOGUE_CLIP_BUFFER_SEC)
    }

    if (clips.length > 0) return clips
  }

  const clips: StoryboardAudioClip[] = []
  let currentStartTime = 0

  const descriptionUrl =
    (scene.descriptionAudio as Record<string, { url?: string }> | undefined)?.[language]?.url ||
    (scene.descriptionAudio as Record<string, { url?: string }> | undefined)?.en?.url ||
    (typeof scene.descriptionAudioUrl === 'string' ? scene.descriptionAudioUrl : undefined)

  if (descriptionUrl) {
    const descriptionDuration = resolveVoiceClipDuration(
      descriptionUrl,
      (scene.descriptionAudio as Record<string, { duration?: number }> | undefined)?.[language]
        ?.duration ||
        (scene.descriptionAudio as Record<string, { duration?: number }> | undefined)?.en
          ?.duration ||
        scene.descriptionDuration,
      dynamicDurations
    )
    clips.push({
      id: 'description',
      url: descriptionUrl,
      startTime: currentStartTime,
      duration: descriptionDuration,
      type: 'description',
      label: 'Description',
    })
    currentStartTime += descriptionDuration + NARRATION_CLIP_BUFFER_SEC
  }

  const narrationUrl = resolveStandaloneNarrationUrl(scene, language)

  if (narrationUrl) {
    const narrationDuration = resolveVoiceClipDuration(
      narrationUrl,
      (scene.narrationAudio as Record<string, { duration?: number }> | undefined)?.[language]
        ?.duration ||
        (scene.narrationAudio as Record<string, { duration?: number }> | undefined)?.en?.duration ||
        scene.narrationDuration,
      dynamicDurations
    )
    clips.push({
      id: 'narration',
      url: narrationUrl,
      startTime: currentStartTime,
      duration: narrationDuration,
      type: 'narration',
      label: 'Narration',
    })
    currentStartTime += narrationDuration + NARRATION_CLIP_BUFFER_SEC
  }

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const scheduledDialogueKeys = new Set<string>()

  for (let i = 0; i < dialogue.length; i++) {
    const line = dialogue[i] as Record<string, unknown>
    const lineId = typeof line.lineId === 'string' ? line.lineId : undefined
    const character = typeof line.character === 'string' ? line.character : undefined
    const lineKey = lineId ?? `idx:${i}`

    const audioEntry = findDialogueAudioForLine(scene, {
      language,
      lineId,
      dialogueIndex: i,
      character,
    }) as Record<string, unknown> | null

    const url =
      (audioEntry &&
        ((typeof audioEntry.audioUrl === 'string' && audioEntry.audioUrl) ||
          (typeof audioEntry.url === 'string' && audioEntry.url))) ||
      (typeof line.audioUrl === 'string' && line.audioUrl) ||
      (typeof line.url === 'string' && line.url) ||
      undefined

    if (!url) continue

    const meta = audioEntry ?? line
    if (isFoldedNarrationDuplicate(meta, url, narrationUrl)) continue
    if (descriptionUrl && url === descriptionUrl) continue
    if (narrationUrl && url === narrationUrl) continue
    if (scheduledDialogueKeys.has(lineKey)) continue
    scheduledDialogueKeys.add(lineKey)

    const duration = resolveVoiceClipDuration(
      url,
      audioEntry?.duration ?? line.duration,
      dynamicDurations
    )
    const isNarrator =
      line.kind === 'narration' ||
      meta.kind === 'narration' ||
      line.characterId === 'narrator' ||
      meta.characterId === 'narrator'

    clips.push({
      id: dialogueLineIdForIndex(i),
      url,
      startTime: currentStartTime,
      duration,
      type: 'dialogue',
      label: isNarrator ? 'Narrator' : character || `Dialogue ${i + 1}`,
      dialogueIndex: i,
    })
    currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
  }

  return clips
}

function resolveBeatSlotImageUrl(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  dialogueIndex?: number
): string | undefined {
  if (isValidStoryboardMediaUrl(beat.storyboardImageUrl)) {
    return beat.storyboardImageUrl!.trim()
  }
  if (typeof dialogueIndex === 'number') {
    return getStoryboardFrameUrlForDialogueIndex(scene, dialogueIndex)
  }
  return getEstablishingFrameUrl(scene)
}

/** Beat-first visual cuts: one frame per spoken beat, images from beat slots (not dialogue index). */
function buildBeatFirstStoryboardVisualTimeline(
  scene: Record<string, unknown>,
  audioClips: StoryboardAudioClip[]
): StoryboardVisualFrame[] {
  const beats = getSceneBeats(scene)
  const voiceClips = audioClips.filter(
    (clip) => clip.type !== 'music' && clip.type !== 'sfx'
  )
  if (voiceClips.length === 0) return []

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const frames: StoryboardVisualFrame[] = []
  let clipIdx = 0

  for (const beat of beats) {
    if (beat.kind === 'action') continue

    const clip = voiceClips[clipIdx]
    if (!clip) break

    const d =
      typeof clip.dialogueIndex === 'number'
        ? (dialogue[clip.dialogueIndex] as Record<string, unknown> | undefined)
        : undefined

    frames.push({
      clipId: clip.id,
      frameType: 'dialogue',
      dialogueIndex: clip.dialogueIndex,
      imageUrl: resolveBeatSlotImageUrl(scene, beat, clip.dialogueIndex),
      startTime: clip.startTime,
      duration: clip.duration,
      label: clip.label,
      character: beat.character || getDialogueLineCharacter(d),
      line: String(beat.line || getDialogueLineText(d)),
    })
    clipIdx++
  }

  return frames
}

/**
 * Map audio clips to visual frames. Non-voice clips (description/narration) use
 * establishing; dialogue clips use per-line images with fallback.
 */
export function buildStoryboardVisualTimeline(
  scene: Record<string, unknown> | null | undefined,
  audioClips: StoryboardAudioClip[]
): StoryboardVisualFrame[] {
  if (!scene || audioClips.length === 0) return []

  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const beatFirst = buildBeatFirstStoryboardVisualTimeline(scene, audioClips)
    if (beatFirst.length > 0) return beatFirst
  }

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const establishingUrl = getEstablishingFrameUrl(scene)
  const spokenBeats = getSpokenBeats(scene)
  let spokenBeatCursor = 0
  const frames: StoryboardVisualFrame[] = []

  for (const clip of audioClips) {
    if (clip.type === 'music' || clip.type === 'sfx') continue

    if (clip.type === 'dialogue') {
      const dialogueIndex =
        typeof clip.dialogueIndex === 'number'
          ? clip.dialogueIndex
          : parseDialogueIndexFromClipId(clip.id)
      const d =
        typeof dialogueIndex === 'number'
          ? (dialogue[dialogueIndex] as Record<string, unknown> | undefined)
          : undefined

      let imageUrl: string | undefined
      if (typeof dialogueIndex === 'number') {
        imageUrl = getStoryboardFrameUrlForDialogueIndex(scene, dialogueIndex)
      } else if (spokenBeats.length > 0) {
        const beat = spokenBeats[spokenBeatCursor]
        spokenBeatCursor++
        imageUrl =
          (isValidStoryboardMediaUrl(beat?.storyboardImageUrl)
            ? beat!.storyboardImageUrl!.trim()
            : undefined) ?? establishingUrl
      } else {
        imageUrl = establishingUrl
      }

      frames.push({
        clipId: clip.id,
        frameType: 'dialogue',
        dialogueIndex,
        imageUrl,
        startTime: clip.startTime,
        duration: clip.duration,
        label: clip.label,
        character: getDialogueLineCharacter(d),
        line: getDialogueLineText(d),
      })
    } else {
      // Legacy standalone description / narration → establishing (action beat when present)
      const actionBeat = getSceneBeats(scene).find((b) => b.kind === 'action')
      frames.push({
        clipId: clip.id,
        frameType: 'establishing',
        imageUrl:
          (isValidStoryboardMediaUrl(actionBeat?.storyboardImageUrl)
            ? actionBeat!.storyboardImageUrl!.trim()
            : undefined) ?? establishingUrl,
        startTime: clip.startTime,
        duration: clip.duration,
        label: clip.label,
      })
    }
  }

  return frames
}

/** Resolve the active visual frame at a given playhead time (holds previous frame in inter-clip gaps). */
export function getCurrentStoryboardVisualFrame(
  frames: StoryboardVisualFrame[],
  currentTime: number
): StoryboardVisualFrame | undefined {
  if (frames.length === 0) return undefined

  for (const frame of frames) {
    if (currentTime >= frame.startTime && currentTime < frame.startTime + frame.duration) {
      return frame
    }
  }

  // Inter-clip buffer gap: show the upcoming frame so silence lands on the next beat image.
  for (let i = 0; i < frames.length - 1; i++) {
    const frameEnd = frames[i].startTime + frames[i].duration
    const next = frames[i + 1]
    if (currentTime >= frameEnd && currentTime < next.startTime) {
      return next
    }
  }

  // After last frame ends, hold final frame
  let held: StoryboardVisualFrame | undefined
  for (const frame of frames) {
    if (currentTime >= frame.startTime) {
      held = frame
    } else {
      break
    }
  }
  return held ?? frames[0]
}

/**
 * Flatten a scene into export/report frames: establishing + one per dialogue line.
 */
export function flattenSceneToStoryboardFrames(
  scene: Record<string, unknown>,
  sceneNumber: number
): FlatStoryboardFrame[] {
  const result: FlatStoryboardFrame[] = []
  const establishingUrl = getEstablishingFrameUrl(scene)
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []

  if (establishingUrl || !dialogue.length) {
    result.push({
      sceneNumber,
      frameType: 'establishing',
      imageUrl: establishingUrl,
      visualDescription: String(
        scene.visualDescription ?? scene.action ?? scene.summary ?? ''
      ),
      shotType: scene.shotType as string | undefined,
      cameraAngle: scene.cameraAngle as string | undefined,
      lighting: scene.lighting as string | undefined,
      duration: scene.duration as number | undefined,
    })
  }

  dialogue.forEach((raw, idx) => {
    const d = raw as Record<string, unknown>
    const imageUrl = getDialogueFrameUrl(scene, idx)
    result.push({
      sceneNumber,
      frameType: 'dialogue',
      dialogueIndex: idx,
      imageUrl,
      visualDescription: getDialogueLineText(d),
      character: getDialogueLineCharacter(d),
      line: getDialogueLineText(d),
      shotType: scene.shotType as string | undefined,
      cameraAngle: scene.cameraAngle as string | undefined,
      lighting: scene.lighting as string | undefined,
    })
  })

  getOrderedStoryboardFrames(scene).forEach((frame) => {
    result.push({
      sceneNumber,
      frameType: 'custom',
      customFrameId: frame.id,
      imageUrl: frame.imageUrl,
      label: frame.label,
      character: frame.character,
      line: frame.line,
      visualDescription: frame.label ?? frame.line ?? '',
      duration: frame.durationSec,
      shotType: scene.shotType as string | undefined,
      cameraAngle: scene.cameraAngle as string | undefined,
      lighting: scene.lighting as string | undefined,
    })
  })

  return result
}

/** Build visual timeline from beats when scene.beats[] is populated. */
export function buildBeatStoryboardVisualTimeline(
  scene: Record<string, unknown> | null | undefined,
  audioClips?: StoryboardAudioClip[]
): StoryboardVisualFrame[] {
  if (audioClips && audioClips.length > 0) {
    return buildStoryboardVisualTimeline(scene, audioClips)
  }

  const beats = getSceneBeats(scene)
  if (beats.length === 0) return []

  let startTime = 0
  const frames: StoryboardVisualFrame[] = []

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const kind = beat.kind
    const duration =
      typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
        ? beat.durationSeconds
        : DEFAULT_CLIP_DURATION_SEC
    const imageUrl = beat.storyboardImageUrl

    frames.push({
      clipId: `beat-${i}`,
      frameType: kind === 'action' ? 'establishing' : 'dialogue',
      imageUrl,
      startTime,
      duration,
      label:
        kind === 'action'
          ? 'Action'
          : kind === 'narration'
            ? 'Narration'
            : String(beat.character || 'Dialogue'),
      character: beat.character,
      line:
        kind === 'action'
          ? String(beat.actionDescription || '')
          : String(beat.line || ''),
    })
    startTime += duration + DIALOGUE_CLIP_BUFFER_SEC
  }

  return frames
}
