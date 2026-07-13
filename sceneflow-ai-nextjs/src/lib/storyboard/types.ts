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
import { getSceneBeats, getStoryboardTimelineBeats, isBeatExcluded } from '@/lib/script/beatMigration'
import type { SceneBeat, BeatOverlayType } from '@/lib/script/segmentTypes'
import { resolveEffectiveStoryboardTier } from '@/lib/storyboard/storyboardQuality'
import { NARRATOR_CHARACTER, NARRATOR_CHARACTER_ID } from '@/lib/script/segmentTypes'
import { generateAliases, toCanonicalName } from '@/lib/character/canonical'
import { resolveStandaloneNarrationUrl } from '@/lib/script/narration'
import { isValidStoryboardMediaUrl } from '@/lib/storyboard/mergeSceneMedia'
import { buildStoryboardMusicClips, resolveSceneMusicFileDuration } from '@/lib/storyboard/musicPlayback'
import { buildBeatAlignedStoryboardSfxClips } from '@/lib/storyboard/sfxPlayback'
import { getBeatOverlayFields } from '@/lib/storyboard/beatCaption'
import { DEFAULT_VEO_CLIP_DURATION } from '@/lib/config/modelConfig'

const NARRATION_CLIP_BUFFER_SEC = 0.5
const DIALOGUE_CLIP_BUFFER_SEC = 0.3
const DEFAULT_CLIP_DURATION_SEC = 3
/** Fade-to-black duration between scenes in playback and animatic export. */
export const SCENE_FADE_TO_BLACK_SEC = 1
/** Silent establishing/action beat hold when no durationSeconds is stored. */
const DEFAULT_ACTION_BEAT_DURATION_SEC = 4

/** Storyboard image fields stored on each dialogue line object. */
export interface DialogueStoryboardFrame {
  storyboardImageUrl?: string
  storyboardImagePrompt?: string
  storyboardImageGcsPath?: string
  storyboardImageTier?: 'draft' | 'final'
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
  /** Optional end frame URL for in-beat cross-dissolve when present. */
  endImageUrl?: string
  startTime: number
  duration: number
  label?: string
  character?: string
  line?: string
  /** English on-screen caption carried from scene.beats[]. */
  overlayText?: string
  overlayType?: BeatOverlayType
  /** True when this is the last beat in a scene (triggers fade-to-black after). */
  isSceneEnd?: boolean
  /** True when this is the first beat in a scene (triggers fade-from-black at start). */
  isSceneStart?: boolean
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
  /** start = primary beat frame; end = optional motion/FTV end frame */
  frameRole?: 'start' | 'end'
  beatId?: string
  /** Index into scene.beats[] for beat-first frame generation */
  beatIndex?: number
  dialogueIndex?: number
  customFrameId?: string
  /** Image stored directly on this beat/line/frame — not a borrowed fallback. */
  ownImageUrl?: string
  /** URL shown in UI (own image, or borrowed establishing shot). */
  displayImageUrl?: string
  /** draft | final — missing tier treated as draft */
  imageTier?: 'draft' | 'final'
  /** Planner-assigned beat role (title_reveal, opening, etc.). */
  beatRole?: string
  /** Planned or generated image prompt for this frame. */
  storyboardImagePrompt?: string
  /** Whether typography is allowed on this beat. */
  allowTypography?: boolean
  isPlaceholder: boolean
  isMissing: boolean
}

function getRawBeatStoryboardUrl(
  scene: Record<string, unknown>,
  beat: SceneBeat
): string | undefined {
  const rawBeats = Array.isArray(scene.beats) ? (scene.beats as SceneBeat[]) : []
  const raw =
    (beat.beatId && rawBeats.find((b) => b.beatId === beat.beatId)) ||
    rawBeats[beat.sequenceIndex ?? -1]
  const url = raw?.storyboardImageUrl?.trim()
  return isValidStoryboardMediaUrl(url) ? url : undefined
}

function getRawBeatStoryboardEndUrl(
  scene: Record<string, unknown>,
  beat: SceneBeat
): string | undefined {
  const rawBeats = Array.isArray(scene.beats) ? (scene.beats as SceneBeat[]) : []
  const raw =
    (beat.beatId && rawBeats.find((b) => b.beatId === beat.beatId)) ||
    rawBeats[beat.sequenceIndex ?? -1]
  const url = raw?.storyboardEndImageUrl?.trim()
  return isValidStoryboardMediaUrl(url) ? url : undefined
}

/** Pre-Vis animatic: resolve start frame URL only; never fall back to end-frame URLs. */
function resolvePreVisStartFrameUrl(
  scene: Record<string, unknown>,
  beat: SceneBeat,
  startSlot?: StoryboardFrameSlot
): string | undefined {
  const startUrl = startSlot?.ownImageUrl ?? startSlot?.displayImageUrl
  if (!startUrl) return undefined

  const beatStartUrl = beat.storyboardImageUrl?.trim()
  const endUrl = getRawBeatStoryboardEndUrl(scene, beat)
  if (!beatStartUrl && endUrl && startUrl === endUrl) {
    return undefined
  }

  return startUrl
}

function buildBeatFrameSlot(
  beat: SceneBeat,
  beatIndex: number,
  scene: Record<string, unknown>,
  frameRole: 'start' | 'end',
  opts: {
    ownImageUrl?: string
    displayImageUrl?: string
    dialogueIndex?: number
    establishingUrl?: string
  }
): StoryboardFrameSlot {
  const baseLabel =
    beat.kind === 'action'
      ? beat.actionDescription?.trim()
        ? `${beat.actionDescription.trim().slice(0, 36)}${beat.actionDescription.trim().length > 36 ? '…' : ''}`
        : 'Action'
      : beat.kind === 'narration'
        ? 'Narrator'
        : String(beat.character || 'Dialogue')

  const roleSuffix = frameRole === 'end' ? ' (End)' : ' (Start)'
  const ownImageUrl = opts.ownImageUrl
  const displayImageUrl = opts.displayImageUrl

  return {
    key: frameRole === 'end' ? `${beat.beatId}-end` : beat.beatId,
    label: `${baseLabel}${roleSuffix}`,
    kind: beat.kind,
    frameRole,
    beatId: beat.beatId,
    beatIndex,
    dialogueIndex: opts.dialogueIndex,
    ownImageUrl,
    displayImageUrl,
    imageTier: ownImageUrl
      ? resolveEffectiveStoryboardTier(
          frameRole === 'end' ? beat.storyboardEndImageTier : beat.storyboardImageTier
        )
      : undefined,
    isPlaceholder: !ownImageUrl && !!displayImageUrl,
    isMissing: !ownImageUrl && !displayImageUrl,
    beatRole: beat.beatRole,
    storyboardImagePrompt:
      frameRole === 'end' ? beat.storyboardEndImagePrompt : beat.storyboardImagePrompt,
    allowTypography: beat.beatRole === 'title_reveal' || beat.beatRole === 'credit',
  }
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
  beatsOverride?: SceneBeat[],
  options?: { startFramesOnly?: boolean }
): StoryboardFrameSlot[] {
  if (!scene) return []

  const startFramesOnly = options?.startFramesOnly !== false
  const beats = beatsOverride ?? getStoryboardTimelineBeats(scene)
  const establishingUrl = getEstablishingFrameUrl(scene)
  const slots: StoryboardFrameSlot[] = []

  if (beats.length > 0) {
    let spokenIdx = 0
    for (let beatIndex = 0; beatIndex < beats.length; beatIndex++) {
      const beat = beats[beatIndex]
      if (isBeatExcluded(beat)) continue
      let ownImageUrl =
        beat.kind === 'action'
          ? getRawBeatStoryboardUrl(scene, beat)
          : isValidStoryboardMediaUrl(beat.storyboardImageUrl)
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

      slots.push(
        buildBeatFrameSlot(beat, beatIndex, scene, 'start', {
          ownImageUrl,
          displayImageUrl,
          dialogueIndex,
          establishingUrl,
        })
      )

      if (!startFramesOnly) {
        const endOwnImageUrl = getRawBeatStoryboardEndUrl(scene, beat)
        slots.push(
          buildBeatFrameSlot(beat, beatIndex, scene, 'end', {
            ownImageUrl: endOwnImageUrl,
            displayImageUrl: endOwnImageUrl,
            dialogueIndex,
          })
        )
      }
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
  withEndImage: number
} {
  const slots = enumerateStoryboardFrameSlots(scene)
  const startSlots = slots.filter((s) => s.frameRole !== 'end')
  const endSlots = slots.filter((s) => s.frameRole === 'end')
  const withImage = startSlots.filter((s) => !!s.ownImageUrl).length
  const withEndImage = endSlots.filter((s) => !!s.ownImageUrl).length
  return {
    withImage,
    total: startSlots.length,
    missing: startSlots.filter((s) => s.isMissing).length,
    placeholders: startSlots.filter((s) => s.isPlaceholder).length,
    withEndImage,
  }
}

/** Frames that still need generation (no dedicated image stored). */
export function countStoryboardFramesNeedingGeneration(
  scene: Record<string, unknown>
): number {
  return enumerateStoryboardFrameSlots(scene).filter((s) => !s.ownImageUrl).length
}

/** True when every start frame lacks a stored image (placeholders do not count). */
export function sceneHasNoOwnedBeatImages(scene: Record<string, unknown>): boolean {
  const startSlots = enumerateStoryboardFrameSlots(scene)
  return startSlots.length > 0 && startSlots.every((s) => !s.ownImageUrl)
}

/** Slots shown in the Scene Express frame checklist (end rows optional). */
export function filterStoryboardSlotsForExpressChecklist(
  slots: StoryboardFrameSlot[],
  options: { includeEndFrames?: boolean } = {}
): StoryboardFrameSlot[] {
  return slots.filter((slot) => {
    if (slot.frameRole === 'end' && !options.includeEndFrames) return false
    return true
  })
}

export function isStoryboardSlotSelected(
  slot: Pick<StoryboardFrameSlot, 'key'>,
  selectedKeys: Set<string>
): boolean {
  return selectedKeys.has(slot.key)
}

/** Count checklist rows that match the current selection set. */
export function countSelectedExpressFrameSlots(
  slots: StoryboardFrameSlot[],
  selectedKeys: Set<string>,
  options: { includeEndFrames?: boolean } = {}
): number {
  return filterStoryboardSlotsForExpressChecklist(slots, options).filter((slot) =>
    isStoryboardSlotSelected(slot, selectedKeys)
  ).length
}

/** Express scope: count start slots, and end slots when includeEndFrames is on. */
export function countExpressFrameScope(
  scene: Record<string, unknown>,
  options: { includeEndFrames?: boolean; regenerate?: boolean } = {}
): number {
  const slots = enumerateStoryboardFrameSlots(scene).filter((s) => {
    if (s.frameRole === 'end' && !options.includeEndFrames) return false
    return true
  })
  if (options.regenerate) {
    return slots.length
  }
  return slots.filter((s) => !s.ownImageUrl).length
}

/** Frames with no image at all (not even a borrowed placeholder). */
export function countMissingStoryboardFrames(scene: Record<string, unknown>): number {
  return enumerateStoryboardFrameSlots(scene).filter((s) => s.isMissing).length
}

/** True when scene has any narration, dialogue, beat, music, or SFX audio for the language. */
export function sceneHasPlayablePreVisAudio(
  scene: Record<string, unknown>,
  language = 'en'
): boolean {
  if (resolveStandaloneNarrationUrl(scene, language)) return true

  const dialogueAudio =
    (scene.dialogueAudio as Record<string, Array<{ audioUrl?: string; url?: string }>> | undefined)?.[
      language
    ] ??
    (scene.dialogueAudio as Record<string, Array<{ audioUrl?: string; url?: string }>> | undefined)?.en ??
    (Array.isArray(scene.dialogueAudio) ? scene.dialogueAudio : [])
  if (
    Array.isArray(dialogueAudio) &&
    dialogueAudio.some((entry) => !!(entry?.audioUrl || entry?.url))
  ) {
    return true
  }

  if (getSceneBeats(scene).some((beat) => !!beat.audioUrl?.trim())) return true

  const musicUrl = scene.musicAudio || (scene.music as { url?: string } | undefined)?.url
  if (typeof musicUrl === 'string' && musicUrl.trim()) return true

  const sfxArray = scene.sfxAudio
  if (Array.isArray(sfxArray) && sfxArray.some((sfx) => !!(typeof sfx === 'string' ? sfx : sfx?.url))) {
    return true
  }

  return false
}

/** True when scene has beat/establishing images or audio suitable for inline pre-vis playback. */
export function sceneHasPlayablePreVisContent(
  scene: Record<string, unknown>,
  language = 'en'
): boolean {
  if (countStoryboardFrameStats(scene).withImage > 0) return true
  if (getEstablishingFrameUrl(scene)) return true
  return sceneHasPlayablePreVisAudio(scene, language)
}

export function countPlayablePreVisScenes(
  scenes: Record<string, unknown>[],
  language = 'en'
): number {
  return scenes.filter((scene) => sceneHasPlayablePreVisContent(scene, language)).length
}

/** Best thumbnail for player scene strip (establishing, then first owned beat/dialogue frame). */
export function getScenePlayableThumbnailUrl(
  scene: Record<string, unknown>
): string | undefined {
  const establishing = getEstablishingFrameUrl(scene)
  if (establishing) return establishing

  const slots = enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: true })
  const startSlots = slots.filter((s) => s.frameRole !== 'end')
  const owned = startSlots.find((s) => s.ownImageUrl)
  if (owned?.ownImageUrl) return owned.ownImageUrl

  const displayed = startSlots.find((s) => s.displayImageUrl && !s.isMissing)
  return displayed?.displayImageUrl
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
  const dynamicValid =
    typeof dynamic === 'number' && dynamic > 0 && !Number.isNaN(dynamic)
  // Use the longer of stored TTS metadata and measured blob duration to avoid cutoff.
  if (stored && dynamicValid) {
    if (dynamic < 0.5) return stored
    return Math.max(stored, dynamic)
  }
  if (stored) return stored
  if (dynamicValid) return dynamic
  return DEFAULT_CLIP_DURATION_SEC
}

/** Same lookup path as Scene Beats UI — dialogue index is the primary key. */
export function resolveDialogueLineAudio(
  scene: Record<string, unknown>,
  dialogueIndex: number,
  language: string
): {
  url?: string
  duration?: number
  entry?: Record<string, unknown>
} {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const line = dialogue[dialogueIndex] as Record<string, unknown> | undefined
  if (!line) return {}

  const character = getDialogueLineCharacter(line)
  const lineId = typeof line.lineId === 'string' ? line.lineId : undefined

  const audioEntry = findDialogueAudioForLine(scene, {
    language,
    lineId,
    dialogueIndex,
    character,
  }) as Record<string, unknown> | null

  const url =
    extractDialogueAudioEntryUrl(audioEntry) ??
    (typeof line.audioUrl === 'string' && line.audioUrl.trim()
      ? line.audioUrl.trim()
      : undefined) ??
    (typeof line.url === 'string' && line.url.trim() ? line.url.trim() : undefined)

  const duration =
    (typeof audioEntry?.duration === 'number' ? audioEntry.duration : undefined) ??
    (typeof line.duration === 'number' ? line.duration : undefined) ??
    (typeof line.durationSeconds === 'number' ? line.durationSeconds : undefined)

  return {
    url,
    duration,
    entry: audioEntry ?? undefined,
  }
}

function characterNamesMatch(a: string, b: string): boolean {
  const canonicalA = toCanonicalName(a)
  const canonicalB = toCanonicalName(b)
  if (canonicalA === canonicalB) return true
  const aliasesA = new Set(generateAliases(canonicalA).map(toCanonicalName))
  return aliasesA.has(canonicalB)
}

function isNarratorDialogueEntry(entry: Record<string, unknown> | undefined): boolean {
  if (!entry) return false
  if (entry.kind === 'narration') return true
  if (entry.characterId === NARRATOR_CHARACTER_ID) return true
  if (
    typeof entry.character === 'string' &&
    toCanonicalName(entry.character) === toCanonicalName(NARRATOR_CHARACTER)
  ) {
    return true
  }
  return false
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

function extractDialogueAudioEntryUrl(
  entry: Record<string, unknown> | null | undefined
): string | undefined {
  if (!entry) return undefined
  const url =
    (typeof entry.audioUrl === 'string' && entry.audioUrl) ||
    (typeof entry.url === 'string' && entry.url) ||
    undefined
  return url?.trim() || undefined
}

function findDialogueAudioEntryForBeat(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  language: string,
  dialogueIndex?: number
): Record<string, unknown> | undefined {
  const entries = getDialogueAudioEntries(scene, language)
  const pickLastWithUrl = (
    predicate: (entry: Record<string, unknown>) => boolean
  ): Record<string, unknown> | undefined => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      if (!entry || !predicate(entry)) continue
      if (extractDialogueAudioEntryUrl(entry)) return entry
    }
    return undefined
  }

  if (beat.lineId?.trim()) {
    const byLineId = pickLastWithUrl((entry) => entry?.lineId === beat.lineId)
    if (byLineId) return byLineId
  }
  if (typeof dialogueIndex === 'number') {
    const byIndex = pickLastWithUrl(
      (entry) => entry?.dialogueIndex === dialogueIndex
    )
    if (byIndex) return byIndex
  }
  if (isNarratorBeat(beat)) {
    const narratorEntry = pickLastWithUrl((entry) => isNarratorDialogueEntry(entry))
    if (narratorEntry) return narratorEntry
  }
  if (beat.character?.trim()) {
    const canonical = toCanonicalName(beat.character)
    const byCharacter = pickLastWithUrl((entry) => {
      if (typeof entry?.character !== 'string') return false
      if (
        !characterNamesMatch(entry.character, beat.character!) &&
        toCanonicalName(entry.character) !== canonical
      ) {
        return false
      }
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
  }
  if (isNarratorBeat(beat)) {
    const narratorIdx = dialogue.findIndex((entry) =>
      isNarratorDialogueEntry(entry as Record<string, unknown>)
    )
    if (narratorIdx >= 0) return narratorIdx
  }
  if (spokenDialogueIdx >= 0 && spokenDialogueIdx < dialogue.length) {
    if (!beat.lineId?.trim()) return spokenDialogueIdx

    const line = dialogue[spokenDialogueIdx] as Record<string, unknown> | undefined
    if (!line) return undefined
    if (line.lineId === beat.lineId) return spokenDialogueIdx
    if (isNarratorBeat(beat) && isNarratorDialogueEntry(line)) return spokenDialogueIdx
    if (
      beat.character?.trim() &&
      typeof line.character === 'string' &&
      characterNamesMatch(line.character, beat.character)
    ) {
      return spokenDialogueIdx
    }
  }
  return undefined
}

function beatVoiceClipId(
  beat: ReturnType<typeof getSceneBeats>[number],
  _dialogueIndex: number | undefined
): string {
  return `beat-${beat.beatId}`
}

/** Resolve spoken-beat audio from dialogueAudio / dialogue line (source of truth after TTS regen), then beat fields. */
function resolveBeatVoiceUrl(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  dialogueIndex: number | undefined,
  language: string
): string | undefined {
  if (typeof dialogueIndex === 'number' && dialogueIndex >= 0) {
    const fromDialogue = resolveDialogueLineAudio(scene, dialogueIndex, language)
    if (fromDialogue.url) return fromDialogue.url
  }

  const audioEntry = findDialogueAudioEntryForBeat(scene, beat, language, dialogueIndex) ?? null
  const fromDialogueAudio = extractDialogueAudioEntryUrl(audioEntry)
  if (fromDialogueAudio) return fromDialogueAudio

  const fromBeat = beat.audioUrl?.trim()
  if (fromBeat) return fromBeat

  if (isNarratorBeat(beat)) {
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
  let storedDuration: number | undefined

  if (typeof dialogueIndex === 'number' && dialogueIndex >= 0) {
    const fromDialogue = resolveDialogueLineAudio(scene, dialogueIndex, language)
    storedDuration = fromDialogue.duration
  }

  if (storedDuration == null) {
    const audioEntry =
      findDialogueAudioEntryForBeat(scene, beat, language, dialogueIndex) ?? null
    storedDuration =
      (typeof audioEntry?.duration === 'number' ? audioEntry.duration : undefined) ??
      beat.durationSeconds
  }

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
      if (url) parts.push(`da:${index}:${url}`)
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
      parts.push(`beat:${beat.beatId}:${beat.audioUrl.trim()}`)
    }
    parts.push(`beat-music:${beat.beatId}:${beat.musicEnabled === true ? '1' : '0'}`)
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

/** Stable fingerprint of beat/establishing storyboard images — detects regen without audio changes. */
export function buildStoryboardVisualRevision(
  scene: Record<string, unknown> | null | undefined
): string {
  if (!scene) return ''

  const parts: string[] = []

  const establishingUrl =
    typeof scene.imageUrl === 'string' ? scene.imageUrl.trim() : ''
  if (establishingUrl) parts.push(`est:${establishingUrl}`)

  for (const beat of getSceneBeats(scene)) {
    const url = beat.storyboardImageUrl?.trim()
    if (url) parts.push(`beat:${beat.beatId}:${url}`)
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

export interface BeatFirstPlaybackOptions {
  /** Pre-Vis animatic: start frame only, 10s hold when no voice audio. */
  preVisAnimatic?: boolean
}

function resolveActionBeatDuration(
  beat: ReturnType<typeof getSceneBeats>[number],
  preVisAnimatic?: boolean
): number {
  if (typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0) {
    return beat.durationSeconds
  }
  return preVisAnimatic ? DEFAULT_VEO_CLIP_DURATION : DEFAULT_ACTION_BEAT_DURATION_SEC
}

function resolveSilentBeatDuration(preVisAnimatic?: boolean): number {
  return preVisAnimatic ? DEFAULT_VEO_CLIP_DURATION : DEFAULT_CLIP_DURATION_SEC
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

/** Extend voice clip windows to match visual frame span (includes inter-beat buffer). */
function extendVoiceClipsToVisualFrameDuration(
  voiceClips: StoryboardAudioClip[],
  visualFrames: StoryboardVisualFrame[]
): StoryboardAudioClip[] {
  return voiceClips.map((clip) => {
    const frame = visualFrames.find((f) => f.clipId === clip.id)
    if (frame && frame.duration > clip.duration) {
      return { ...clip, duration: frame.duration }
    }
    return clip
  })
}

/**
 * Beat-first playback: one visual frame per scene beat (including silent action beats),
 * with voice clips starting after each preceding action beat's hold time.
 */
export function buildBeatFirstPlaybackTimeline(
  scene: Record<string, unknown>,
  language: string,
  dynamicDurations: Record<string, number> = {},
  options?: BeatFirstPlaybackOptions
): { voiceClips: StoryboardAudioClip[]; visualFrames: StoryboardVisualFrame[] } {
  const preVisAnimatic = options?.preVisAnimatic === true
  const beats = getStoryboardTimelineBeats(scene)
  const slots = enumerateStoryboardFrameSlots(scene, beats, {
    startFramesOnly: preVisAnimatic,
  })
  const startSlotByBeatId = new Map(
    slots.filter((slot) => slot.beatId && slot.frameRole !== 'end').map((slot) => [slot.beatId!, slot])
  )
  const endSlotByBeatId = new Map(
    slots.filter((slot) => slot.beatId && slot.frameRole === 'end').map((slot) => [slot.beatId!, slot])
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
    endImageUrl?: string
    isSceneEnd?: boolean
    label: string
    character?: string
    line?: string
    dialogueIndex?: number
    clipId: string
    overlayText?: string
    overlayType?: BeatOverlayType
  }> = []

  for (let beatIdx = 0; beatIdx < beats.length; beatIdx++) {
    const beat = beats[beatIdx]
    if (isBeatExcluded(beat)) {
      if (beat.kind !== 'action') {
        const effectiveDialogueIndex = resolveBeatDialogueIndex(
          scene,
          beat,
          spokenDialogueIdx,
          language
        )
        spokenDialogueIdx = Math.max(
          spokenDialogueIdx + 1,
          typeof effectiveDialogueIndex === 'number' ? effectiveDialogueIndex + 1 : 0
        )
        const url = resolveBeatVoiceUrl(scene, beat, effectiveDialogueIndex, language)
        if (url) {
          const isNarration = isNarratorBeat(beat)
          const clipId = beatVoiceClipId(beat, effectiveDialogueIndex)
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
            label: isNarration
              ? 'Narrator'
              : beat.character || `Dialogue ${(effectiveDialogueIndex ?? spokenDialogueIdx) + 1}`,
            dialogueIndex: effectiveDialogueIndex,
            beatId: beat.beatId,
          })
          currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
        }
      }
      continue
    }
    const slot = startSlotByBeatId.get(beat.beatId)
    const endSlot = endSlotByBeatId.get(beat.beatId)
    const imageUrl = preVisAnimatic
      ? resolvePreVisStartFrameUrl(scene, beat, slot)
      : slot?.ownImageUrl ?? slot?.displayImageUrl
    const endImageUrl = preVisAnimatic ? undefined : endSlot?.ownImageUrl
    const isSceneEnd = beatIdx === beats.length - 1

    if (beat.kind === 'action') {
      const duration = resolveActionBeatDuration(beat, preVisAnimatic)
      const overlay = getBeatOverlayFields(beat)
      windows.push({
        beatId: beat.beatId,
        kind: 'action',
        startTime: currentStartTime,
        duration,
        imageUrl,
        endImageUrl,
        isSceneEnd,
        label: 'Action',
        line: beat.actionDescription,
        clipId: `action-${beat.beatId}`,
        ...overlay,
      })
      currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
      continue
    }

    const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
    const effectiveDialogueIndex = resolveBeatDialogueIndex(
      scene,
      beat,
      spokenDialogueIdx,
      language
    )

    // Advance dialogue cursor for every spoken beat to stay aligned with scene.dialogue[].
    spokenDialogueIdx = Math.max(
      spokenDialogueIdx + 1,
      typeof effectiveDialogueIndex === 'number' ? effectiveDialogueIndex + 1 : 0
    )

    const url = resolveBeatVoiceUrl(scene, beat, effectiveDialogueIndex, language)
    const isNarration = isNarratorBeat(beat)
    const clipId = beatVoiceClipId(beat, effectiveDialogueIndex)

    if (!url) {
      const duration = resolveSilentBeatDuration(preVisAnimatic)
      const overlay = getBeatOverlayFields(beat)
      windows.push({
        beatId: beat.beatId,
        kind: beat.kind,
        startTime: currentStartTime,
        duration,
        imageUrl,
        endImageUrl,
        isSceneEnd,
        label: isNarration ? 'Narrator' : beat.character || 'Dialogue',
        character: beat.character,
        line: beat.line,
        dialogueIndex: effectiveDialogueIndex,
        clipId,
        ...overlay,
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
      endImageUrl,
      isSceneEnd,
      label: isNarration ? 'Narrator' : beat.character || 'Dialogue',
      character: beat.character,
      line: beat.line,
      dialogueIndex: effectiveDialogueIndex,
      clipId,
      ...getBeatOverlayFields(beat),
    })

    currentStartTime += duration + DIALOGUE_CLIP_BUFFER_SEC
  }

  const visualFrames: StoryboardVisualFrame[] = windows.map((win, index) => ({
    clipId: win.clipId,
    beatId: win.beatId,
    frameType: win.kind === 'action' ? 'establishing' : 'dialogue',
    dialogueIndex: win.dialogueIndex,
    imageUrl: win.imageUrl,
    endImageUrl: win.endImageUrl,
    startTime: win.startTime,
    duration:
      index < windows.length - 1
        ? windows[index + 1].startTime - win.startTime
        : win.duration + (win.isSceneEnd ? SCENE_FADE_TO_BLACK_SEC : 0),
    label: win.label,
    character: win.character,
    line: win.line,
    overlayText: win.overlayText,
    overlayType: win.overlayType,
    isSceneEnd: win.isSceneEnd,
    isSceneStart: index === 0,
  }))

  return {
    voiceClips: extendVoiceClipsToVisualFrameDuration(voiceClips, visualFrames),
    visualFrames,
  }
}

/**
 * Map audio clips to visual frames. Non-voice clips (description/narration) use
 * establishing; dialogue clips use per-line images with fallback.
 */
export function buildStoryboardVisualTimeline(
  scene: Record<string, unknown> | null | undefined,
  audioClips: StoryboardAudioClip[],
  options?: {
    language?: string
    dynamicDurations?: Record<string, number>
    preVisAnimatic?: boolean
  }
): StoryboardVisualFrame[] {
  if (!scene) return []

  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const { visualFrames } = buildBeatFirstPlaybackTimeline(
      scene,
      options?.language ?? 'en',
      options?.dynamicDurations ?? {},
      { preVisAnimatic: options?.preVisAnimatic }
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

/** In-beat crossfade timing shared by player and cloud animatic export. */
export const IN_BEAT_CROSSFADE_START_FRACTION = 0.35
export const IN_BEAT_CROSSFADE_MAX_SEC = 1.5

export interface ProjectAnimaticRenderSegment {
  segmentId: string
  sceneIndex: number
  beatId?: string
  imageUrl: string
  startTime: number
  duration: number
}

export interface ProjectAnimaticAudioClip {
  url: string
  startTime: number
  duration: number
  volume?: number
  type?: 'narration' | 'dialogue' | 'music' | 'sfx'
}

export interface ProjectAnimaticTimeline {
  totalDuration: number
  segments: ProjectAnimaticRenderSegment[]
  audioClips: ProjectAnimaticAudioClip[]
}

export interface ProjectAnimaticTimelineOptions {
  /** Pre-Vis animatic: start frame only, 10s hold when no voice audio. */
  preVisAnimatic?: boolean
  /** URL of a solid black image inserted between scenes for fade-to-black. */
  interSceneFadeUrl?: string
  /** Duration of each inter-scene black segment (default SCENE_FADE_TO_BLACK_SEC). */
  interSceneFadeSec?: number
}

/**
 * Full-project animatic timeline — mirrors Pre-Vis player ordering, durations,
 * and per-scene fade-to-black extension on the last beat.
 */
export function buildProjectAnimaticTimeline(
  scenes: Record<string, unknown>[],
  language: string,
  dynamicDurations: Record<string, number> = {},
  options?: ProjectAnimaticTimelineOptions
): ProjectAnimaticTimeline {
  const preVisAnimatic = options?.preVisAnimatic === true
  const interSceneFadeUrl = options?.interSceneFadeUrl
  const interSceneFadeSec = options?.interSceneFadeSec ?? SCENE_FADE_TO_BLACK_SEC

  let globalOffset = 0
  const segments: ProjectAnimaticRenderSegment[] = []
  const audioClips: ProjectAnimaticAudioClip[] = []

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex]
    const { voiceClips, visualFrames } = buildBeatFirstPlaybackTimeline(
      scene,
      language,
      dynamicDurations,
      { preVisAnimatic }
    )

    const sceneDuration =
      visualFrames.length > 0
        ? visualFrames[visualFrames.length - 1].startTime +
          visualFrames[visualFrames.length - 1].duration
        : 0

    for (const clip of voiceClips) {
      if (!clip.url) continue
      audioClips.push({
        url: clip.url,
        startTime: globalOffset + clip.startTime,
        duration: clip.duration,
        volume: 1,
        type: clip.type === 'dialogue' ? 'dialogue' : 'narration',
      })
    }

    const musicFileDuration = resolveSceneMusicFileDuration(scene, dynamicDurations)
    for (const clip of buildStoryboardMusicClips(
      scene,
      visualFrames,
      sceneDuration,
      musicFileDuration
    )) {
      audioClips.push({
        url: clip.url,
        startTime: globalOffset + clip.startTime,
        duration: clip.duration,
        volume: 0.15,
        type: 'music',
      })
    }

    const voiceEndTime =
      voiceClips.length > 0
        ? voiceClips[voiceClips.length - 1].startTime + voiceClips[voiceClips.length - 1].duration
        : undefined

    for (const clip of buildBeatAlignedStoryboardSfxClips(scene, visualFrames, {
      voiceEndTime,
      sceneDuration,
      dynamicDurations,
    })) {
      audioClips.push({
        url: clip.url,
        startTime: globalOffset + clip.startTime,
        duration: clip.duration,
        volume: 1,
        type: 'sfx',
      })
    }

    for (const frame of visualFrames) {
      if (!frame.imageUrl) continue
      const frameStart = globalOffset + frame.startTime
      const frameDuration = frame.duration

      if (frame.endImageUrl) {
        const crossfadeDur = Math.min(IN_BEAT_CROSSFADE_MAX_SEC, frameDuration * 0.25)
        const startDur = Math.max(0.5, frameDuration * IN_BEAT_CROSSFADE_START_FRACTION)
        const endDur = Math.max(0.5, frameDuration - startDur + crossfadeDur)
        segments.push({
          segmentId: `s${sceneIndex}-${frame.clipId}-start`,
          sceneIndex,
          beatId: frame.beatId,
          imageUrl: frame.imageUrl,
          startTime: frameStart,
          duration: startDur,
        })
        segments.push({
          segmentId: `s${sceneIndex}-${frame.clipId}-end`,
          sceneIndex,
          beatId: frame.beatId,
          imageUrl: frame.endImageUrl,
          startTime: frameStart + startDur - crossfadeDur,
          duration: endDur,
        })
      } else {
        segments.push({
          segmentId: `s${sceneIndex}-${frame.clipId}`,
          sceneIndex,
          beatId: frame.beatId,
          imageUrl: frame.imageUrl,
          startTime: frameStart,
          duration: frameDuration,
        })
      }
    }

    globalOffset += sceneDuration

    if (interSceneFadeUrl && sceneIndex < scenes.length - 1) {
      segments.push({
        segmentId: `s${sceneIndex}-fade`,
        sceneIndex,
        imageUrl: interSceneFadeUrl,
        startTime: globalOffset,
        duration: interSceneFadeSec,
      })
      globalOffset += interSceneFadeSec
    }
  }

  return {
    totalDuration: globalOffset,
    segments,
    audioClips,
  }
}
