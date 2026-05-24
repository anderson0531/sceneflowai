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

/** Count frames with images for gallery badge. */
export function countStoryboardFrameStats(scene: Record<string, unknown>): {
  withImage: number
  total: number
} {
  const establishing = getEstablishingFrameUrl(scene) ? 1 : 0
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const dialogueTotal = dialogue.length
  const dialogueWithImage = dialogue.filter(
    (d: Record<string, unknown>) =>
      typeof d?.storyboardImageUrl === 'string' && d.storyboardImageUrl.trim()
  ).length
  const custom = getOrderedStoryboardFrames(scene)
  const customWithImage = custom.filter((f) => f.imageUrl?.trim()).length
  return {
    withImage: establishing + dialogueWithImage + customWithImage,
    total: establishing + dialogueTotal + custom.length,
  }
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

  // Beat-first: spoken beats only (dialogue + narration)
  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const beats = getSceneBeats(scene)
    const clips: StoryboardAudioClip[] = []
    let currentStartTime = 0

    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i]
      if (beat.kind === 'action') continue

      const url = beat.audioUrl?.trim()
      if (!url) continue

      const duration = resolveVoiceClipDuration(
        url,
        beat.durationSeconds,
        dynamicDurations
      )
      const isNarration = beat.kind === 'narration'

      clips.push({
        id: isNarration ? `beat-narration-${i}` : beat.lineId ?? `beat-${i}`,
        url,
        startTime: currentStartTime,
        duration,
        type: 'dialogue',
        label: isNarration ? 'Narrator' : beat.character || `Dialogue ${i + 1}`,
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

/**
 * Map audio clips to visual frames. Non-voice clips (description/narration) use
 * establishing; dialogue clips use per-line images with fallback.
 */
export function buildStoryboardVisualTimeline(
  scene: Record<string, unknown> | null | undefined,
  audioClips: StoryboardAudioClip[]
): StoryboardVisualFrame[] {
  if (!scene || audioClips.length === 0) return []

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const establishingUrl = getEstablishingFrameUrl(scene)
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
      frames.push({
        clipId: clip.id,
        frameType: 'dialogue',
        dialogueIndex,
        imageUrl:
          typeof dialogueIndex === 'number'
            ? getDialogueFrameUrl(scene, dialogueIndex)
            : establishingUrl,
        startTime: clip.startTime,
        duration: clip.duration,
        label: clip.label,
        character: getDialogueLineCharacter(d),
        line: getDialogueLineText(d),
      })
    } else {
      // description / narration → establishing
      frames.push({
        clipId: clip.id,
        frameType: 'establishing',
        imageUrl: establishingUrl,
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

  // Buffer gap between clips: hold the last frame that has started
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
  scene: Record<string, unknown> | null | undefined
): StoryboardVisualFrame[] {
  const beats = Array.isArray(scene?.beats) ? (scene!.beats as Array<Record<string, unknown>>) : []
  if (beats.length === 0) return []

  let startTime = 0
  const frames: StoryboardVisualFrame[] = []

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]
    const kind = beat.kind as string | undefined
    const duration =
      typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
        ? beat.durationSeconds
        : DEFAULT_CLIP_DURATION_SEC
    const imageUrl =
      typeof beat.storyboardImageUrl === 'string' ? beat.storyboardImageUrl : undefined

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
      character: typeof beat.character === 'string' ? beat.character : undefined,
      line:
        kind === 'action'
          ? String(beat.actionDescription || '')
          : String(beat.line || ''),
    })
    startTime += duration + DIALOGUE_CLIP_BUFFER_SEC
  }

  return frames
}
