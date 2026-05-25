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
import { getSceneBeats, getStoryboardTimelineBeats } from '@/lib/script/beatMigration'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import { NARRATOR_CHARACTER, NARRATOR_CHARACTER_ID } from '@/lib/script/segmentTypes'
import { toCanonicalName } from '@/lib/character/canonical'
import { resolveStandaloneNarrationUrl } from '@/lib/script/narration'
import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'

const NARRATION_CLIP_BUFFER_SEC = 0.5
const DIALOGUE_CLIP_BUFFER_SEC = 0.3
const DEFAULT_CLIP_DURATION_SEC = 3
/** Silent establishing/action beat hold when no durationSeconds is stored. */
const DEFAULT_ACTION_BEAT_DURATION_SEC = 4

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
  beatId?: string
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
  scene: Record<string, unknown> | null | undefined,
  beatsOverride?: SceneBeat[]
): StoryboardFrameSlot[] {
  if (!scene) return []

  const beats = beatsOverride ?? getStoryboardTimelineBeats(scene)
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
          ? beat.actionDescription?.trim()
            ? `${beat.actionDescription.trim().slice(0, 36)}${beat.actionDescription.trim().length > 36 ? '…' : ''}`
            : 'Action'
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

function getDialogueAudioEntries(
  scene: Record<string, unknown>,
  language: string
): Array<Record<string, unknown>> {
  const da = scene.dialogueAudio
  if (!da) return []
  if (Array.isArray(da)) return da as Array<Record<string, unknown>>
  if (typeof da !== 'object') return []
  const langArr = (da as Record<string, unknown>)[language]
  if (Array.isArray(langArr)) return langArr as Array<Record<string, unknown>>
  const enArr = (da as Record<string, unknown>).en
  if (Array.isArray(enArr)) return enArr as Array<Record<string, unknown>>
  return []
}

function isNarratorBeat(beat: {
  kind?: string
  character?: string
  characterId?: string
}): boolean {
  if (beat.kind === 'narration') return true
  if (beat.characterId === NARRATOR_CHARACTER_ID) return true
  if (
    beat.character &&
    toCanonicalName(beat.character) === toCanonicalName(NARRATOR_CHARACTER)
  ) {
    return true
  }
  return false
}

function findDialogueAudioEntryForBeat(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  language: string,
  dialogueIndex?: number
): Record<string, unknown> | undefined {
  const entries = getDialogueAudioEntries(scene, language)
  if (beat.lineId?.trim()) {
    const byLineId = entries.find((entry) => entry?.lineId === beat.lineId)
    if (byLineId) return byLineId
  }
  if (typeof dialogueIndex === 'number') {
    const byIndex = entries.find((entry) => entry?.dialogueIndex === dialogueIndex)
    if (byIndex) return byIndex
  }
  if (isNarratorBeat(beat)) {
    const narratorEntry = entries.find(
      (entry) =>
        entry?.kind === 'narration' || entry?.characterId === NARRATOR_CHARACTER_ID
    )
    if (narratorEntry) return narratorEntry
  }
  if (beat.character?.trim()) {
    const canonical = toCanonicalName(beat.character)
    const byCharacter = entries.find((entry) => {
      if (typeof entry?.character !== 'string') return false
      if (toCanonicalName(entry.character) !== canonical) return false
      if (typeof dialogueIndex === 'number' && typeof entry.dialogueIndex === 'number') {
        return entry.dialogueIndex === dialogueIndex
      }
      return typeof entry.dialogueIndex !== 'number'
    })
    if (byCharacter) return byCharacter
  }
  return undefined
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
  spokenDialogueIdx: number,
  language: string
): number | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  if (beat.lineId?.trim()) {
    const idx = dialogue.findIndex(
      (entry) => (entry as Record<string, unknown>)?.lineId === beat.lineId
    )
    if (idx >= 0) return idx
    const audioEntry = findDialogueAudioEntryForBeat(scene, beat, language)
    if (typeof audioEntry?.dialogueIndex === 'number') {
      return audioEntry.dialogueIndex
    }
    return undefined
  }
  if (spokenDialogueIdx >= 0 && spokenDialogueIdx < dialogue.length) return spokenDialogueIdx
  return spokenDialogueIdx >= 0 ? spokenDialogueIdx : undefined
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

/** Resolve spoken-beat audio from dialogueAudio / dialogue line (source of truth after TTS regen), then beat fields. */
function resolveBeatVoiceUrl(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  dialogueIndex: number | undefined,
  language: string
): string | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const line =
    typeof dialogueIndex === 'number' && dialogueIndex >= 0
      ? (dialogue[dialogueIndex] as Record<string, unknown> | undefined)
      : undefined
  const character = beat.character || getDialogueLineCharacter(line)

  const audioEntry =
    (findDialogueAudioForLine(scene, {
      language,
      lineId: beat.lineId,
      ...(typeof dialogueIndex === 'number' ? { dialogueIndex } : {}),
      character,
    }) as Record<string, unknown> | null) ??
    findDialogueAudioEntryForBeat(scene, beat, language, dialogueIndex) ??
    null

  const fromDialogueAudio =
    (typeof audioEntry?.audioUrl === 'string' && audioEntry.audioUrl) ||
    (typeof audioEntry?.url === 'string' && audioEntry.url) ||
    undefined
  if (fromDialogueAudio?.trim()) return fromDialogueAudio.trim()

  const fromLine =
    line &&
    (!beat.lineId?.trim() || line.lineId === beat.lineId) &&
    ((typeof line.audioUrl === 'string' && line.audioUrl) ||
      (typeof line.url === 'string' && line.url) ||
      undefined)
  if (typeof fromLine === 'string' && fromLine.trim()) return fromLine.trim()

  const fromBeat = beat.audioUrl?.trim()
  if (fromBeat) return fromBeat

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
  const audioEntry =
    (findDialogueAudioForLine(scene, {
      language,
      lineId: beat.lineId,
      ...(typeof dialogueIndex === 'number' ? { dialogueIndex } : {}),
      character: beat.character || getDialogueLineCharacter(line),
    }) as Record<string, unknown> | null) ??
    findDialogueAudioEntryForBeat(scene, beat, language, dialogueIndex) ??
    null

  const storedDuration =
    (typeof audioEntry?.duration === 'number' ? audioEntry.duration : undefined) ??
    (typeof line?.duration === 'number' ? line.duration : undefined) ??
    (typeof line?.durationSeconds === 'number' ? line.durationSeconds : undefined) ??
    beat.durationSeconds

  if (isNarratorBeat(beat) && storedDuration == null) {
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

/** Stable fingerprint of scene audio URLs — detects TTS regen without scene object identity changing. */
export function buildStoryboardAudioRevision(
  scene: Record<string, unknown> | null | undefined,
  language: string
): string {
  if (!scene) return ''

  const parts: string[] = []

  const descriptionUrl =
    (scene.descriptionAudio as Record<string, { url?: string }> | undefined)?.[language]?.url ||
    (scene.descriptionAudio as Record<string, { url?: string }> | undefined)?.en?.url ||
    (typeof scene.descriptionAudioUrl === 'string' ? scene.descriptionAudioUrl : undefined)
  if (descriptionUrl) parts.push(`desc:${descriptionUrl}`)

  const narrationUrl = resolveStandaloneNarrationUrl(scene, language)
  if (narrationUrl) parts.push(`narr:${narrationUrl}`)

  const dialogueAudio =
    (scene.dialogueAudio as Record<string, Array<Record<string, unknown>>> | undefined)?.[
      language
    ] ??
    (scene.dialogueAudio as Record<string, Array<Record<string, unknown>>> | undefined)?.en ??
    (Array.isArray(scene.dialogueAudio) ? (scene.dialogueAudio as Array<Record<string, unknown>>) : [])
  if (Array.isArray(dialogueAudio)) {
    dialogueAudio.forEach((entry, index) => {
      if (!entry) return
      const url =
        (typeof entry.audioUrl === 'string' && entry.audioUrl) ||
        (typeof entry.url === 'string' && entry.url) ||
        ''
      if (url) parts.push(`da:${index}:${url}:${entry.duration ?? ''}`)
    })
  }

  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  dialogue.forEach((line, index) => {
    const entry = line as Record<string, unknown>
    const url =
      (typeof entry.audioUrl === 'string' && entry.audioUrl) ||
      (typeof entry.url === 'string' && entry.url) ||
      ''
    if (url) parts.push(`dl:${index}:${url}`)
  })

  for (const beat of getSceneBeats(scene)) {
    if (beat.audioUrl?.trim()) {
      parts.push(`beat:${beat.beatId}:${beat.audioUrl.trim()}:${beat.durationSeconds ?? ''}`)
    }
  }

  if (typeof scene.musicAudio === 'string' && scene.musicAudio) {
    parts.push(`music:${scene.musicAudio}`)
  }

  const sfx = scene.sfxAudio
  if (Array.isArray(sfx)) {
    sfx.forEach((entry, index) => {
      const url = typeof entry === 'string' ? entry : (entry as { url?: string })?.url
      if (url) parts.push(`sfx:${index}:${url}`)
    })
  }

  return parts.join('|')
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
    const { voiceClips } = buildBeatFirstPlaybackTimeline(scene, language, dynamicDurations)
    if (voiceClips.length > 0 || getSceneBeats(scene).some((b) => b.kind === 'action')) {
      return voiceClips
    }
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

function resolveActionBeatDuration(beat: ReturnType<typeof getSceneBeats>[number]): number {
  if (typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0) {
    return beat.durationSeconds
  }
  return DEFAULT_ACTION_BEAT_DURATION_SEC
}

/** Rebase playback times so the first voice clip starts at t=0. */
function alignPlaybackTimelineToFirstVoice(
  voiceClips: StoryboardAudioClip[],
  visualFrames: StoryboardVisualFrame[]
): { voiceClips: StoryboardAudioClip[]; visualFrames: StoryboardVisualFrame[] } {
  if (voiceClips.length === 0 || visualFrames.length === 0) {
    return { voiceClips, visualFrames }
  }

  const offset = voiceClips[0]?.startTime ?? 0
  if (Math.abs(offset) <= 0.001) {
    return {
      voiceClips,
      visualFrames: visualFrames.map((frame, index) => ({
        ...frame,
        duration:
          index < visualFrames.length - 1
            ? visualFrames[index + 1].startTime - frame.startTime
            : frame.duration,
      })),
    }
  }

  const rebaseTime = (time: number) => Math.max(0, time - offset)
  const alignedClips = voiceClips.map((clip) => ({
    ...clip,
    startTime: rebaseTime(clip.startTime),
  }))
  const alignedFrames = visualFrames.map((frame) => ({
    ...frame,
    startTime: rebaseTime(frame.startTime),
  }))

  return {
    voiceClips: alignedClips,
    visualFrames: alignedFrames.map((frame, index) => ({
      ...frame,
      duration:
        index < alignedFrames.length - 1
          ? alignedFrames[index + 1].startTime - frame.startTime
          : frame.duration,
    })),
  }
}

/**
 * Beat-first playback: one visual frame per scene beat (including silent action beats),
 * with voice clips starting after each preceding action beat's hold time.
 */
export function buildBeatFirstPlaybackTimeline(
  scene: Record<string, unknown>,
  language: string,
  dynamicDurations: Record<string, number> = {}
): { voiceClips: StoryboardAudioClip[]; visualFrames: StoryboardVisualFrame[] } {
  const beats = getStoryboardTimelineBeats(scene)
  const slots = enumerateStoryboardFrameSlots(scene, beats)
  const slotByBeatId = new Map(
    slots.filter((slot) => slot.beatId).map((slot) => [slot.beatId!, slot])
  )

  let currentStartTime = 0
  let spokenDialogueIdx = 0
  const voiceClips: StoryboardAudioClip[] = []
  const windows: Array<{
    beatId: string
    kind: string
    startTime: number
    duration: number
    imageUrl?: string
    label: string
    character?: string
    line?: string
    dialogueIndex?: number
    clipId: string
  }> = []

  for (const beat of beats) {
    const slot = slotByBeatId.get(beat.beatId)
    const imageUrl = slot?.ownImageUrl ?? slot?.displayImageUrl

    if (beat.kind === 'action') {
      const duration = resolveActionBeatDuration(beat)
      windows.push({
        beatId: beat.beatId,
        kind: 'action',
        startTime: currentStartTime,
        duration,
        imageUrl,
        label: 'Action',
        line: beat.actionDescription,
        clipId: `action-${beat.beatId}`,
      })
      currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
      continue
    }

    const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
    const dialogueIndex = resolveBeatDialogueIndex(scene, beat, spokenDialogueIdx, language)
    const effectiveDialogueIndex =
      typeof dialogueIndex === 'number'
        ? dialogueIndex
        : !beat.lineId?.trim() &&
            spokenDialogueIdx >= 0 &&
            spokenDialogueIdx < dialogue.length
          ? spokenDialogueIdx
          : undefined
    if (typeof effectiveDialogueIndex === 'number') {
      spokenDialogueIdx = Math.max(spokenDialogueIdx, effectiveDialogueIndex + 1)
    }

    const url = resolveBeatVoiceUrl(scene, beat, effectiveDialogueIndex, language)
    const isNarration = isNarratorBeat(beat)
    const clipId = beatVoiceClipId(beat, effectiveDialogueIndex)

    if (!url) {
      const duration = DEFAULT_CLIP_DURATION_SEC
      windows.push({
        beatId: beat.beatId,
        kind: beat.kind,
        startTime: currentStartTime,
        duration,
        imageUrl,
        label: isNarration ? 'Narrator' : beat.character || 'Dialogue',
        character: beat.character,
        line: beat.line,
        dialogueIndex: effectiveDialogueIndex,
        clipId,
      })
      currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
      continue
    }

    const duration = resolveBeatVoiceDuration(
      url,
      beat,
      scene,
      effectiveDialogueIndex,
      language,
      dynamicDurations
    )

    voiceClips.push({
      id: clipId,
      url,
      startTime: currentStartTime,
      duration,
      type: 'dialogue',
      label: isNarration ? 'Narrator' : beat.character || `Dialogue ${(effectiveDialogueIndex ?? spokenDialogueIdx) + 1}`,
      dialogueIndex: effectiveDialogueIndex,
      beatId: beat.beatId,
    })

    windows.push({
      beatId: beat.beatId,
      kind: beat.kind,
      startTime: currentStartTime,
      duration,
      imageUrl,
      label: isNarration ? 'Narrator' : beat.character || 'Dialogue',
      character: beat.character,
      line: beat.line,
      dialogueIndex: effectiveDialogueIndex,
      clipId,
    })

    currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
  }

  const visualFrames: StoryboardVisualFrame[] = windows.map((win, index) => ({
    clipId: win.clipId,
    beatId: win.beatId,
    frameType: win.kind === 'action' ? 'establishing' : 'dialogue',
    dialogueIndex: win.dialogueIndex,
    imageUrl: win.imageUrl,
    startTime: win.startTime,
    duration:
      index < windows.length - 1
        ? windows[index + 1].startTime - win.startTime
        : win.duration,
    label: win.label,
    character: win.character,
    line: win.line,
  }))

  return alignPlaybackTimelineToFirstVoice(voiceClips, visualFrames)
}

/**
 * Map audio clips to visual frames. Non-voice clips (description/narration) use
 * establishing; dialogue clips use per-line images with fallback.
 */
export function buildStoryboardVisualTimeline(
  scene: Record<string, unknown> | null | undefined,
  audioClips: StoryboardAudioClip[],
  options?: { language?: string; dynamicDurations?: Record<string, number> }
): StoryboardVisualFrame[] {
  if (!scene) return []

  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(
      scene,
      options?.language ?? 'en',
      options?.dynamicDurations ?? {}
    )
    if (visualFrames.length > 0) return visualFrames
  }

  if (audioClips.length === 0) return []

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

  // Hold the last frame that has started (including through trailing buffer).
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
    return buildStoryboardVisualTimeline(scene, audioClips, {
      language: 'en',
    })
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
