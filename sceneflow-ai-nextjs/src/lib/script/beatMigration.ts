/**
 * Beat-first pipeline migration: flat scenes ↔ ordered beats[] timeline.
 */

import { toCanonicalName } from '@/lib/character/canonical'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'
import {
  estimateSpokenDurationSeconds,
  planDialogueLineSplits,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
  type BeatKind,
  type BeatReferenceSelection,
  type SceneBeat,
  type StoryboardStatus,
} from '@/lib/script/segmentTypes'
import { mintLineId } from '@/lib/script/segmentScript'
import { applyDerivedSfxToScene } from '@/lib/script/deriveSfxFromSceneContent'

const BEAT_MIGRATION_FLAG = 'beatsMigratedAt'
const START_FRAME_ONLY_MIGRATION_FLAG = 'startFrameOnlyMigrationAt'
const BEAT_DURATION_SEC = 8
const MAX_DERIVED_BEATS = 12

/** True when a beat is excluded from image/video/render (audio preserved for spoken beats). */
export function isBeatExcluded(beat: SceneBeat | null | undefined): boolean {
  return beat?.excluded === true
}

type SceneDirectionShape = {
  sceneDescription?: string
  camera?: { shots?: string[]; angle?: string; movement?: string; focus?: string }
  lighting?: {
    overallMood?: string
    timeOfDay?: string
    colorTemperature?: string
    keyLight?: string
  }
  scene?: { location?: string; keyProps?: string[]; atmosphere?: string }
  talent?: { blocking?: string; keyActions?: string[]; emotionalBeat?: string }
  audio?: { priorities?: string; considerations?: string }
}

export function mintBeatId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `bt_${crypto.randomUUID().slice(0, 12)}`
  }
  return `bt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function isSpokenBeatKind(kind: BeatKind): boolean {
  return kind === 'dialogue' || kind === 'narration'
}

function computeSplitFlags(beat: SceneBeat): SceneBeat {
  if (!isSpokenBeatKind(beat.kind) || !beat.line?.trim()) return beat
  const estimated = estimateSpokenDurationSeconds(beat.line)
  if (estimated <= VEO_DIALOGUE_CLIP_MAX_SEC) {
    return { ...beat, needsSplit: false, splitRecommendation: undefined }
  }
  const parts = planDialogueLineSplits(beat.line, VEO_DIALOGUE_CLIP_MAX_SEC)
  return {
    ...beat,
    needsSplit: parts.length > 1,
    splitRecommendation:
      parts.length > 1
        ? { partCount: parts.length, excerpts: parts.map((p) => p.excerpt) }
        : undefined,
  }
}

/** Assign stable beatIds, sequenceIndex, and split flags. */
export function normalizeBeatsForProduction(beats: SceneBeat[]): SceneBeat[] {
  const seenBeatIds = new Set<string>()
  return beats.map((raw, index) => {
    let beatId = raw.beatId?.trim() || mintBeatId()
    if (seenBeatIds.has(beatId)) {
      beatId = mintBeatId()
    }
    seenBeatIds.add(beatId)
    const beat: SceneBeat = {
      ...raw,
      beatId,
      sequenceIndex: index,
    }
    return computeSplitFlags(beat)
  })
}

function pickStoryboardString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

/**
 * Copy storyboard media from legacy scene fields into beats when beats lack URLs.
 * Covers projects where images were generated on dialogue[] / imageUrl before beats[] existed.
 */
export function hydrateBeatStoryboardMediaFromLegacy(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): SceneBeat[] {
  const dialogue = Array.isArray(scene.dialogue)
    ? (scene.dialogue as Array<Record<string, unknown>>)
    : []
  let dialogueIdx = 0

  return beats.map((beat, beatIndex) => {
    if (beat.kind === 'action') {
      const beatImageUrl = pickStoryboardString(beat.storyboardImageUrl)
      if (beatImageUrl) {
        return {
          ...beat,
          storyboardImageUrl: beatImageUrl,
          storyboardImageGcsPath: pickStoryboardString(
            beat.storyboardImageGcsPath,
            scene.imageGcsPath
          ),
          storyboardImagePrompt: pickStoryboardString(
            beat.storyboardImagePrompt,
            scene.imagePrompt
          ),
        }
      }

      // scene.imageUrl applies only to legacy auto-establishing beat 0.
      if (beatIndex === 0 && isAutoLeadingEstablishingBeat(beat, scene, 0, beats)) {
        const sceneImageUrl = pickStoryboardString(scene.imageUrl)
        if (sceneImageUrl) {
          return {
            ...beat,
            storyboardImageUrl: sceneImageUrl,
            storyboardImageGcsPath: pickStoryboardString(
              scene.imageGcsPath,
              beat.storyboardImageGcsPath
            ),
            storyboardImagePrompt: pickStoryboardString(
              scene.imagePrompt,
              beat.storyboardImagePrompt
            ),
          }
        }
      }

      return beat
    }

    if (!isSpokenBeatKind(beat.kind)) return beat

    const lineEntry = beat.lineId?.trim()
      ? dialogue.find((entry) => entry?.lineId === beat.lineId)
      : dialogue[dialogueIdx]

    if (!beat.lineId?.trim()) {
      dialogueIdx++
    }

    if (!lineEntry) return beat

    const lineImageUrl = pickStoryboardString(lineEntry.storyboardImageUrl)
    const beatImageUrl = pickStoryboardString(beat.storyboardImageUrl)
    // dialogue[].storyboardImageUrl wins when uploads/generation dual-write to legacy first.
    const storyboardImageUrl = lineImageUrl || beatImageUrl
    if (!storyboardImageUrl) return beat

    return {
      ...beat,
      storyboardImageUrl,
      storyboardImageGcsPath: pickStoryboardString(
        lineImageUrl && lineImageUrl !== beatImageUrl
          ? lineEntry.storyboardImageGcsPath
          : undefined,
        beat.storyboardImageGcsPath,
        lineEntry.storyboardImageGcsPath
      ),
      storyboardImagePrompt: pickStoryboardString(
        lineImageUrl && lineImageUrl !== beatImageUrl
          ? lineEntry.storyboardImagePrompt
          : undefined,
        beat.storyboardImagePrompt,
        lineEntry.storyboardImagePrompt
      ),
    }
  })
}

function getDialogueAudioEntries(
  scene: Record<string, unknown>,
  language = 'en'
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

export function isNarratorBeat(beat: SceneBeat): boolean {
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

/** Copy TTS URLs from dialogue[] / dialogueAudio[] onto beats (dialogueAudio wins over stale beat.audioUrl). */
export function hydrateBeatAudioFromLegacy(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): SceneBeat[] {
  const dialogue = Array.isArray(scene.dialogue)
    ? (scene.dialogue as Array<Record<string, unknown>>)
    : []
  const audioEntries = getDialogueAudioEntries(scene, 'en')
  let spokenIdx = 0

  return beats.map((beat) => {
    if (beat.kind === 'action' || !isSpokenBeatKind(beat.kind)) return beat

    let resolvedDialogueIdx = beat.lineId?.trim()
      ? dialogue.findIndex((entry) => entry?.lineId === beat.lineId)
      : spokenIdx
    if (resolvedDialogueIdx < 0 && !beat.lineId?.trim()) {
      resolvedDialogueIdx = spokenIdx
    }

    const lineEntry =
      resolvedDialogueIdx >= 0 && resolvedDialogueIdx < dialogue.length
        ? dialogue[resolvedDialogueIdx]
        : undefined
    const lineMatchesBeat =
      !!lineEntry &&
      (!beat.lineId?.trim() || lineEntry?.lineId === beat.lineId)

    if (!beat.lineId?.trim()) {
      spokenIdx++
    } else if (resolvedDialogueIdx >= 0) {
      spokenIdx = Math.max(spokenIdx, resolvedDialogueIdx + 1)
    }

    const lineAudioUrl = lineMatchesBeat
      ? (typeof lineEntry?.audioUrl === 'string' && lineEntry.audioUrl) ||
        (typeof lineEntry?.url === 'string' && lineEntry.url) ||
        undefined
      : undefined
    const lineDuration = lineMatchesBeat
      ? typeof lineEntry?.duration === 'number'
        ? lineEntry.duration
        : typeof lineEntry?.durationSeconds === 'number'
          ? lineEntry.durationSeconds
          : undefined
      : undefined

    let audioMatch: Record<string, unknown> | undefined
    if (beat.lineId?.trim()) {
      for (let i = audioEntries.length - 1; i >= 0; i--) {
        const entry = audioEntries[i]
        if (entry?.lineId !== beat.lineId) continue
        const entryUrl =
          (typeof entry.audioUrl === 'string' && entry.audioUrl) ||
          (typeof entry.url === 'string' && entry.url) ||
          undefined
        if (entryUrl?.trim()) {
          audioMatch = entry
          break
        }
      }
    }
    if (!audioMatch && isNarratorBeat(beat)) {
      audioMatch = audioEntries.find(
        (entry) =>
          entry?.kind === 'narration' || entry?.characterId === NARRATOR_CHARACTER_ID
      )
    }
    if (!audioMatch && resolvedDialogueIdx >= 0 && lineMatchesBeat) {
      audioMatch = audioEntries.find(
        (entry) =>
          typeof entry?.dialogueIndex === 'number' && entry.dialogueIndex === resolvedDialogueIdx
      )
    }
    if (!audioMatch && beat.character?.trim()) {
      const canonical = toCanonicalName(beat.character)
      audioMatch = audioEntries.find((entry) => {
        if (typeof entry?.character !== 'string') return false
        if (toCanonicalName(entry.character) !== canonical) return false
        if (typeof entry.dialogueIndex === 'number' && resolvedDialogueIdx >= 0) {
          return entry.dialogueIndex === resolvedDialogueIdx
        }
        return true
      })
    }

    const audioUrl =
      lineAudioUrl?.trim() ||
      (typeof audioMatch?.audioUrl === 'string' && audioMatch.audioUrl) ||
      (typeof audioMatch?.url === 'string' && audioMatch.url) ||
      beat.audioUrl?.trim() ||
      undefined

    if (!audioUrl) return beat

    const durationSeconds =
      lineDuration ??
      (typeof audioMatch?.duration === 'number' ? audioMatch.duration : undefined) ??
      beat.durationSeconds

    if (beat.audioUrl?.trim() === audioUrl && beat.durationSeconds === durationSeconds) {
      return beat
    }

    return {
      ...beat,
      audioUrl,
      ...(durationSeconds != null ? { durationSeconds } : {}),
    }
  })
}

function dialogueEntryToBeat(
  entry: Record<string, unknown>,
  sequenceIndex: number
): SceneBeat {
  const kind: BeatKind =
    entry.kind === 'narration' || entry.characterId === NARRATOR_CHARACTER_ID
      ? 'narration'
      : 'dialogue'
  const lineId =
    typeof entry.lineId === 'string' && entry.lineId.trim()
      ? entry.lineId.trim()
      : mintLineId()
  return {
    beatId: mintBeatId(),
    sequenceIndex,
    kind,
    character: String(entry.character ?? (kind === 'narration' ? NARRATOR_CHARACTER : '')),
    characterId:
      typeof entry.characterId === 'string'
        ? entry.characterId
        : kind === 'narration'
          ? NARRATOR_CHARACTER_ID
          : undefined,
    line: String(entry.line ?? entry.text ?? ''),
    voiceDirection:
      typeof entry.voiceDirection === 'string' ? entry.voiceDirection : undefined,
    lineId,
    storyboardImageUrl:
      typeof entry.storyboardImageUrl === 'string' ? entry.storyboardImageUrl : undefined,
    storyboardImagePrompt:
      typeof entry.storyboardImagePrompt === 'string'
        ? entry.storyboardImagePrompt
        : undefined,
    storyboardImageGcsPath:
      typeof entry.storyboardImageGcsPath === 'string'
        ? entry.storyboardImageGcsPath
        : undefined,
    audioUrl:
      typeof entry.audioUrl === 'string'
        ? entry.audioUrl
        : typeof (entry as { url?: string }).url === 'string'
          ? (entry as { url: string }).url
          : undefined,
    durationSeconds:
      typeof entry.duration === 'number'
        ? entry.duration
        : typeof entry.durationSeconds === 'number'
          ? entry.durationSeconds
          : undefined,
  }
}

/** Scene-direction / summary fallback text used for legacy action beats (not scene.action). */
export function deriveSceneActionFallbackText(scene: Record<string, unknown>): string {
  const sceneDirection = scene.sceneDirection as
    | { talent?: { blocking?: string }; sceneDescription?: string }
    | undefined
  return String(
    sceneDirection?.talent?.blocking ??
      sceneDirection?.sceneDescription ??
      scene.visualDescription ??
      scene.summary ??
      ''
  ).trim()
}

function isNarratorDialogueLine(line: Record<string, unknown> | undefined): boolean {
  if (!line) return false
  if (line.kind === 'narration') return true
  if (line.characterId === NARRATOR_CHARACTER_ID) return true
  if (
    typeof line.character === 'string' &&
    toCanonicalName(line.character) === toCanonicalName(NARRATOR_CHARACTER)
  ) {
    return true
  }
  return false
}

function beatAlignsWithDialogueLine(
  beat: SceneBeat,
  line: Record<string, unknown> | undefined
): boolean {
  if (!line) return false
  if (beat.lineId?.trim() && beat.lineId === line.lineId) return true
  if (isNarratorBeat(beat) && isNarratorDialogueLine(line)) return true
  if (
    beat.character &&
    typeof line.character === 'string' &&
    toCanonicalName(beat.character) === toCanonicalName(line.character)
  ) {
    return true
  }
  return false
}

/** True when the first beat is a migration-injected establishing action, not a scripted beat. */
export function isAutoLeadingEstablishingBeat(
  beat: SceneBeat,
  scene: Record<string, unknown>,
  beatIndex: number,
  allBeats?: SceneBeat[]
): boolean {
  if (beatIndex !== 0 || beat.kind !== 'action') return false

  const desc = String(beat.actionDescription ?? '').trim()
  const fallback = deriveSceneActionFallbackText(scene)
  const hasImage = typeof scene.imageUrl === 'string' && scene.imageUrl.trim().length > 0

  if (!desc || desc === 'Establishing shot') return true

  if (fallback && desc === fallback) return true

  if (hasImage && /^establishing(\s*shot)?$/i.test(desc)) return true

  return false
}

function getSceneDirection(scene: Record<string, unknown>): SceneDirectionShape | undefined {
  const raw = scene.sceneDirection
  return raw && typeof raw === 'object' ? (raw as SceneDirectionShape) : undefined
}

/** Target beat count from scene duration (~8s per beat). */
export function computeTargetBeatCount(scene: Record<string, unknown>): number {
  const duration =
    typeof scene.duration === 'number' && scene.duration > 0 ? scene.duration : BEAT_DURATION_SEC
  return Math.min(MAX_DERIVED_BEATS, Math.max(1, Math.round(duration / BEAT_DURATION_SEC)))
}

function isCreditsScene(scene: Record<string, unknown>): boolean {
  if (scene.cinematicType === 'outro') return true
  const heading = String(scene.heading ?? '').toLowerCase()
  return (
    heading.includes('credits') ||
    heading.includes('outro') ||
    heading.includes('end title')
  )
}

/** Smarter beat target — avoids duration padding on dialogue/title scenes. */
export function computeTargetBeatCountForScene(scene: Record<string, unknown>): number {
  const existing = tryParseExistingBeats(scene)
  if (existing.length > 0) return existing.length

  const direction = getSceneDirection(scene)
  const shots = Array.isArray(direction?.camera?.shots)
    ? direction!.camera!.shots!.filter((s) => String(s).trim()).length
    : 0

  if (isTitleOrCinematicScene(scene) || isCreditsScene(scene)) {
    if (shots > 0) return Math.min(shots, 4)
    const duration =
      typeof scene.duration === 'number' && scene.duration > 0 ? scene.duration : 20
    return Math.min(4, Math.max(2, Math.round(duration / BEAT_DURATION_SEC)))
  }

  const legacyBeats = buildLegacyBeats(scene)
  const spokenCount = legacyBeats.filter((b) => isSpokenBeatKind(b.kind)).length
  if (spokenCount > 0) {
    if (shots > legacyBeats.length) return Math.min(shots, MAX_DERIVED_BEATS)
    return legacyBeats.length
  }

  const durationBased = computeTargetBeatCount(scene)
  if (shots > 0) return Math.min(shots, durationBased, MAX_DERIVED_BEATS)
  return durationBased
}

function pickIndexedItem<T>(items: T[], beatIndex: number, totalBeats: number): T | undefined {
  if (items.length === 0) return undefined
  if (items.length >= totalBeats) return items[beatIndex]
  const idx = Math.floor((beatIndex / totalBeats) * items.length)
  return items[Math.min(idx, items.length - 1)]
}

function buildLightingCue(direction: SceneDirectionShape | undefined, visualDescription: string): string {
  const parts: string[] = []
  if (direction?.lighting?.overallMood) parts.push(direction.lighting.overallMood)
  if (direction?.lighting?.timeOfDay) parts.push(direction.lighting.timeOfDay)
  if (direction?.lighting?.colorTemperature) parts.push(direction.lighting.colorTemperature)
  if (visualDescription) parts.push(visualDescription)
  return parts.join(', ').trim()
}

function buildSetContext(direction: SceneDirectionShape | undefined): string {
  const parts: string[] = []
  if (direction?.scene?.location) parts.push(direction.scene.location)
  if (direction?.scene?.atmosphere) parts.push(direction.scene.atmosphere)
  const props = direction?.scene?.keyProps
  if (Array.isArray(props) && props.length > 0) {
    parts.push(`Props: ${props.slice(0, 3).join(', ')}`)
  }
  return parts.filter(Boolean).join('. ').trim()
}

/** Derive action beats from sceneDirection / visual fields for action-only scenes. */
export function deriveActionBeatsFromDirection(
  scene: Record<string, unknown>,
  targetBeats: number,
  startIndex = 0
): SceneBeat[] {
  const direction = getSceneDirection(scene)
  const visualDescription = String(scene.visualDescription ?? '').trim()
  const sceneDescription = String(direction?.sceneDescription ?? '').trim()
  const shots = Array.isArray(direction?.camera?.shots)
    ? direction!.camera!.shots!.map((s) => String(s).trim()).filter(Boolean)
    : []
  const keyActions = Array.isArray(direction?.talent?.keyActions)
    ? direction!.talent!.keyActions!.map((s) => String(s).trim()).filter(Boolean)
    : []
  const blocking = String(direction?.talent?.blocking ?? '').trim()
  const emotionalBeat = String(direction?.talent?.emotionalBeat ?? '').trim()
  const setContext = buildSetContext(direction)
  const lightingCue = buildLightingCue(direction, visualDescription)
  const sentences = sceneDescription
    ? sceneDescription.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 8)
    : []

  const totalSpan = startIndex + targetBeats
  const beats: SceneBeat[] = []
  for (let i = 0; i < targetBeats; i++) {
    const globalIndex = startIndex + i
    const shot =
      shots.length >= totalSpan
        ? shots[globalIndex]
        : pickIndexedItem(shots, globalIndex, totalSpan) ?? 'Medium shot'
    const keyAction = pickIndexedItem(keyActions, globalIndex, totalSpan)
    const momentParts: string[] = []
    if (keyAction) momentParts.push(keyAction)
    else if (blocking && i === Math.floor(targetBeats / 2)) momentParts.push(blocking)
    else if (sentences.length >= totalSpan) {
      momentParts.push(sentences[globalIndex])
    } else if (sentences.length > 0) {
      momentParts.push(pickIndexedItem(sentences, globalIndex, totalSpan) ?? sceneDescription)
    } else if (sceneDescription) {
      momentParts.push(sceneDescription)
    } else if (blocking) momentParts.push(blocking)
    if (emotionalBeat && globalIndex === totalSpan - 1) momentParts.push(emotionalBeat)

    let momentText = momentParts.join(' ').trim() || 'Scene action unfolds'
    const prev = beats[beats.length - 1]
    if (prev?.actionDescription && prev.actionDescription.includes(momentText) && momentText.length < 40) {
      momentText = `${momentText} (${shot})`
    }

    const isBookendBeat = globalIndex === 0 || globalIndex === totalSpan - 1
    const actionParts = [`${shot}: ${momentText}`]
    if (setContext && isBookendBeat) actionParts.push(setContext)
    if (lightingCue && isBookendBeat) actionParts.push(lightingCue)

    beats.push({
      beatId: mintBeatId(),
      sequenceIndex: globalIndex,
      kind: 'action',
      actionDescription: actionParts.join('. ').replace(/\.\s*\./g, '.').trim(),
      storyboardImageUrl:
        globalIndex === 0 && typeof scene.imageUrl === 'string' ? scene.imageUrl : undefined,
      storyboardImagePrompt:
        globalIndex === 0 && typeof scene.imagePrompt === 'string' ? scene.imagePrompt : undefined,
      storyboardImageGcsPath:
        globalIndex === 0 && typeof scene.imageGcsPath === 'string' ? scene.imageGcsPath : undefined,
    })
  }

  return normalizeBeatsForProduction(beats)
}

function needsDirectionBeatExpansion(
  legacyBeats: SceneBeat[],
  scene: Record<string, unknown>,
  targetBeats: number
): boolean {
  if (legacyBeats.length === 0) return true

  const existing = tryParseExistingBeats(scene)
  if (existing.length > 0 && existing.length >= targetBeats) return false

  const spoken = legacyBeats.filter((b) => isSpokenBeatKind(b.kind))
  if (spoken.length > 0) {
    const direction = getSceneDirection(scene)
    const shotCount = direction?.camera?.shots?.length ?? 0
    return shotCount > legacyBeats.length
  }

  if (legacyBeats.length === 1 && legacyBeats[0].kind === 'action') {
    const direction = getSceneDirection(scene)
    const hasRichDirection =
      (direction?.camera?.shots?.length ?? 0) > 1 ||
      (direction?.talent?.keyActions?.length ?? 0) > 1 ||
      !!direction?.sceneDescription
    return hasRichDirection && targetBeats > 1
  }
  return legacyBeats.length < targetBeats
}

function appendDirectionActionBeats(
  existing: SceneBeat[],
  scene: Record<string, unknown>,
  targetBeats: number
): SceneBeat[] {
  const needed = Math.max(0, targetBeats - existing.length)
  if (needed === 0) return existing
  const extra = deriveActionBeatsFromDirection(scene, needed, existing.length)
  const merged = [
    ...existing,
    ...extra.map((beat, offset) => ({
      ...beat,
      sequenceIndex: existing.length + offset,
    })),
  ]
  return normalizeBeatsForProduction(merged)
}

/**
 * Derive beats from scene content when beats[] is missing or invalid.
 * Uses legacy fields first, then sceneDirection for duration-sized action timelines.
 */
export function deriveBeatsFromSceneContent(scene: Record<string, unknown>): SceneBeat[] {
  const existing = tryParseExistingBeats(scene)
  if (existing.length > 0) {
    return existing
  }

  const targetBeats = computeTargetBeatCountForScene(scene)
  const legacyBeats = buildLegacyBeats(scene)

  if (needsDirectionBeatExpansion(legacyBeats, scene, targetBeats)) {
    const spoken = legacyBeats.filter((b) => isSpokenBeatKind(b.kind))
    if (spoken.length > 0) {
      return appendDirectionActionBeats(legacyBeats, scene, targetBeats)
    }
    return deriveActionBeatsFromDirection(scene, targetBeats)
  }

  return legacyBeats
}

function tryParseExistingBeats(scene: Record<string, unknown>): SceneBeat[] {
  if (!Array.isArray(scene.beats) || scene.beats.length === 0) return []
  const parsed =
    typeof (scene.beats[0] as Record<string, unknown>)?.kind === 'string'
      ? parseLlmBeats(scene.beats as unknown[])
      : normalizeBeatsForProduction(scene.beats as SceneBeat[])
  return parsed.filter((beat) => {
    if (beat.kind === 'action') return !!beat.actionDescription?.trim()
    return !!beat.line?.trim()
  })
}

/**
 * Build beats from legacy flat fields (action, narration, dialogue).
 * Does not read scene.beats[].
 */
function buildLegacyBeats(scene: Record<string, unknown>): SceneBeat[] {
  const beats: SceneBeat[] = []
  let seq = 0

  const direction = getSceneDirection(scene)
  const explicitAction = String(
    scene.action ?? scene.visualDescription ?? direction?.sceneDescription ?? ''
  ).trim()

  if (explicitAction) {
    beats.push({
      beatId: mintBeatId(),
      sequenceIndex: seq++,
      kind: 'action',
      actionDescription: explicitAction,
      storyboardImageUrl:
        typeof scene.imageUrl === 'string' ? scene.imageUrl : undefined,
      storyboardImagePrompt:
        typeof scene.imagePrompt === 'string' ? scene.imagePrompt : undefined,
      storyboardImageGcsPath:
        typeof scene.imageGcsPath === 'string' ? scene.imageGcsPath : undefined,
    })
  }

  const narrationText = String(scene.narration ?? '').trim()
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []
  const hasNarratorInDialogue = dialogue.some(
    (d: Record<string, unknown>) =>
      d?.kind === 'narration' || d?.characterId === NARRATOR_CHARACTER_ID
  )

  if (narrationText && !hasNarratorInDialogue) {
    beats.push({
      beatId: mintBeatId(),
      sequenceIndex: seq++,
      kind: 'narration',
      character: NARRATOR_CHARACTER,
      characterId: NARRATOR_CHARACTER_ID,
      line: narrationText,
      lineId: mintLineId(),
    })
  }

  for (const raw of dialogue) {
    beats.push(dialogueEntryToBeat(raw as Record<string, unknown>, seq++))
  }

  return normalizeBeatsForProduction(beats)
}

/**
 * Convert a legacy flat scene into an ordered beats[] timeline.
 * Order: optional establishing action → standalone narration → dialogue beats.
 */
export function flatSceneToBeats(scene: Record<string, unknown>): SceneBeat[] {
  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    return normalizeBeatsForProduction(scene.beats as SceneBeat[])
  }
  return buildLegacyBeats(scene)
}

/** Sync legacy dialogue[] / narration from beats for backward compatibility. */
export function beatsToLegacyFields(beats: SceneBeat[]): {
  dialogue: Array<Record<string, unknown>>
  narration?: string
  action?: string
} {
  const dialogue: Array<Record<string, unknown>> = []
  let narration: string | undefined
  const actionParts: string[] = []

  for (const beat of beats) {
    if (beat.kind === 'action') {
      if (beat.actionDescription?.trim()) {
        actionParts.push(beat.actionDescription.trim())
      }
      continue
    }
    if (beat.kind === 'narration') {
      if (beat.line?.trim()) narration = beat.line.trim()
      dialogue.push({
        lineId: beat.lineId ?? mintLineId(),
        character: beat.character ?? NARRATOR_CHARACTER,
        characterId: beat.characterId ?? NARRATOR_CHARACTER_ID,
        line: beat.line ?? '',
        kind: 'narration',
        voiceDirection: beat.voiceDirection,
        storyboardImageUrl: beat.storyboardImageUrl,
        storyboardImagePrompt: beat.storyboardImagePrompt,
        storyboardImageGcsPath: beat.storyboardImageGcsPath,
        audioUrl: beat.audioUrl,
        duration: beat.durationSeconds,
      })
      continue
    }
    dialogue.push({
      lineId: beat.lineId ?? mintLineId(),
      character: beat.character ?? '',
      characterId: beat.characterId,
      line: beat.line ?? '',
      kind: 'dialogue',
      voiceDirection: beat.voiceDirection,
      storyboardImageUrl: beat.storyboardImageUrl,
      storyboardImagePrompt: beat.storyboardImagePrompt,
      storyboardImageGcsPath: beat.storyboardImageGcsPath,
      audioUrl: beat.audioUrl,
      duration: beat.durationSeconds,
    })
  }

  return {
    dialogue,
    narration,
    action: actionParts.length > 0 ? actionParts.join('\n\n') : undefined,
  }
}

/** Apply beats to a scene object and dual-write legacy fields. */
export function applyBeatsToScene(
  scene: Record<string, unknown>,
  beats: SceneBeat[]
): Record<string, unknown> {
  const normalized = normalizeBeatsForProduction(beats)
  const legacy = beatsToLegacyFields(normalized)
  return {
    ...scene,
    beats: normalized,
    dialogue: legacy.dialogue,
    ...(legacy.narration !== undefined ? { narration: legacy.narration } : {}),
    ...(legacy.action !== undefined ? { action: legacy.action } : {}),
  }
}

/** Persist establishing / scene-card image to scene.imageUrl and the action beat. */
export function applyEstablishingImageToScene(
  scene: Record<string, unknown>,
  imageUrl: string,
  extras?: { imagePrompt?: string; imageGcsPath?: string }
): Record<string, unknown> {
  const beats = getSceneBeats(scene).map((beat) =>
    beat.kind === 'action'
      ? {
          ...beat,
          storyboardImageUrl: imageUrl,
          ...(extras?.imageGcsPath
            ? { storyboardImageGcsPath: extras.imageGcsPath }
            : {}),
          ...(extras?.imagePrompt
            ? { storyboardImagePrompt: extras.imagePrompt }
            : {}),
        }
      : beat
  )
  return applyBeatsToScene(
    {
      ...scene,
      imageUrl,
      ...(extras?.imagePrompt ? { imagePrompt: extras.imagePrompt } : {}),
      ...(extras?.imageGcsPath ? { imageGcsPath: extras.imageGcsPath } : {}),
    },
    beats
  )
}

/** Persist a dialogue-line storyboard image to beats[] and dialogue[]. */
export function applyDialogueStoryboardImageToScene(
  scene: Record<string, unknown>,
  dialogueIndex: number,
  imageUrl: string,
  extras?: { imagePrompt?: string; imageGcsPath?: string }
): Record<string, unknown> {
  const dialogue = Array.isArray(scene.dialogue)
    ? (scene.dialogue as Array<Record<string, unknown>>)
    : []
  const targetLineId =
    typeof dialogue[dialogueIndex]?.lineId === 'string'
      ? dialogue[dialogueIndex].lineId.trim()
      : undefined

  let spokenIdx = 0
  const beats = getSceneBeats(scene).map((beat) => {
    if (beat.kind === 'action') return beat

    let matches = false
    if (targetLineId && beat.lineId === targetLineId) {
      matches = true
    } else if (!targetLineId) {
      const resolvedIdx = beat.lineId?.trim()
        ? dialogue.findIndex((entry) => entry?.lineId === beat.lineId)
        : spokenIdx
      matches = resolvedIdx === dialogueIndex
    }

    if (!beat.lineId?.trim()) {
      spokenIdx++
    }

    if (!matches) return beat
    return {
      ...beat,
      storyboardImageUrl: imageUrl,
      ...(extras?.imageGcsPath
        ? { storyboardImageGcsPath: extras.imageGcsPath }
        : {}),
      ...(extras?.imagePrompt
        ? { storyboardImagePrompt: extras.imagePrompt }
        : {}),
    }
  })

  return applyBeatsToScene(scene, beats)
}

export interface BeatStoryboardImageExtras {
  imagePrompt?: string
  imageGcsPath?: string
  imageTier?: 'draft' | 'final'
  frameRole?: 'start' | 'end'
}

/** Persist a beat-index storyboard image to beats[] and legacy dialogue[]. */
export function applyBeatStoryboardImageToScene(
  scene: Record<string, unknown>,
  beatIndex: number,
  imageUrl: string,
  extras?: BeatStoryboardImageExtras
): Record<string, unknown> {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return scene

  const frameRole = extras?.frameRole ?? 'start'

  if (frameRole === 'end') {
    beats[beatIndex] = {
      ...beats[beatIndex],
      storyboardEndImageUrl: imageUrl,
      ...(extras?.imageTier ? { storyboardEndImageTier: extras.imageTier } : {}),
      ...(extras?.imageGcsPath
        ? { storyboardEndImageGcsPath: extras.imageGcsPath }
        : {}),
      ...(extras?.imagePrompt
        ? { storyboardEndImagePrompt: extras.imagePrompt }
        : {}),
    }
    return applyBeatsToScene(scene, beats)
  }

  beats[beatIndex] = {
    ...beats[beatIndex],
    storyboardImageUrl: imageUrl,
    ...(extras?.imageTier ? { storyboardImageTier: extras.imageTier } : {}),
    ...(extras?.imageGcsPath
      ? { storyboardImageGcsPath: extras.imageGcsPath }
      : {}),
    ...(extras?.imagePrompt
      ? { storyboardImagePrompt: extras.imagePrompt }
      : {}),
  }

  const updated = applyBeatsToScene(scene, beats)
  if (beatIndex === 0 && beats[0]?.kind === 'action') {
    return {
      ...updated,
      imageUrl,
      ...(extras?.imagePrompt ? { imagePrompt: extras.imagePrompt } : {}),
      ...(extras?.imageGcsPath ? { imageGcsPath: extras.imageGcsPath } : {}),
    }
  }
  return updated
}

/** Remove the optional end frame from a beat. */
export function clearBeatStoryboardEndImageFromScene(
  scene: Record<string, unknown>,
  beatIndex: number
): Record<string, unknown> {
  const beats = getSceneBeats(scene)
  if (!beats[beatIndex]) return scene

  const { storyboardEndImageUrl, storyboardEndImagePrompt, storyboardEndImageGcsPath, storyboardEndImageTier, ...rest } =
    beats[beatIndex]
  beats[beatIndex] = rest as SceneBeat

  return applyBeatsToScene(scene, beats)
}

/** Persist user-verified reference selection on a beat by beatId. */
export function applyBeatReferenceSelectionToScene(
  scene: Record<string, unknown>,
  beatId: string,
  selection: BeatReferenceSelection
): Record<string, unknown> {
  const beats = getSceneBeats(scene)
  const beatIndex = beats.findIndex((b) => b.beatId === beatId)
  if (beatIndex < 0) return scene

  beats[beatIndex] = {
    ...beats[beatIndex],
    referenceSelection: {
      ...selection,
      resolvedAt: selection.resolvedAt || new Date().toISOString(),
    },
  }

  return applyBeatsToScene(scene, beats)
}

/** Apply Express SSE / manual storyboard image updates to a single scene. */
export function applyExpressStoryboardImageToScene(
  scene: Record<string, unknown>,
  params: {
    imageUrl: string
    beatIndex?: number
    dialogueIndex?: number
    imageTier?: 'draft' | 'final'
    imagePrompt?: string
    imageGcsPath?: string
    frameRole?: 'start' | 'end'
  }
): Record<string, unknown> {
  const { imageUrl, beatIndex, dialogueIndex, imageTier, imagePrompt, imageGcsPath, frameRole } =
    params

  if (typeof beatIndex === 'number') {
    return {
      ...applyBeatStoryboardImageToScene(scene, beatIndex, imageUrl, {
        imagePrompt,
        imageGcsPath,
        imageTier,
        frameRole,
      }),
      storyboardStatus: 'pending_review',
    }
  }

  if (typeof dialogueIndex === 'number') {
    const dialogue = [...(Array.isArray(scene.dialogue) ? (scene.dialogue as unknown[]) : [])]
    const line = dialogue[dialogueIndex] as Record<string, unknown> | undefined
    if (line) {
      dialogue[dialogueIndex] = {
        ...line,
        storyboardImageUrl: imageUrl,
        ...(imageTier ? { storyboardImageTier: imageTier } : {}),
        ...(imagePrompt ? { storyboardImagePrompt: imagePrompt } : {}),
        ...(imageGcsPath ? { storyboardImageGcsPath: imageGcsPath } : {}),
      }
    }
    return { ...scene, dialogue, storyboardStatus: 'pending_review' }
  }

  return {
    ...scene,
    imageUrl,
    ...(imagePrompt ? { imagePrompt } : {}),
    ...(imageGcsPath ? { imageGcsPath } : {}),
  }
}

/** Stable fingerprint of beat script text for pre-vis invalidation. */
export function beatContentFingerprint(beat: SceneBeat): string {
  if (beat.kind === 'action') {
    return (beat.actionDescription ?? '').trim()
  }
  const character = (beat.character ?? '').trim().toUpperCase()
  const line = (beat.line ?? '').trim()
  return `${beat.kind}|${character}|${line}`
}

function beatMatchKey(beat: SceneBeat, index: number): string {
  const character = (beat.character ?? '').trim().toUpperCase()
  return `${index}|${beat.kind}|${character}`
}

export interface ReconcileBeatsResult {
  beats: SceneBeat[]
  /** Fingerprints before reconciliation keyed by beatId. */
  priorFingerprints: Map<string, string>
  /** Fingerprints after reconciliation keyed by beatId. */
  newFingerprints: Map<string, string>
}

/**
 * Reconcile existing beats with current script fields (heading, action, dialogue).
 * Preserves beatIds and storyboard media when beat text is unchanged.
 */
export function reconcileBeatsWithScriptContent(
  scene: Record<string, unknown>
): ReconcileBeatsResult {
  const existing = getSceneBeats(scene)
  const derived = deriveBeatsFromSceneContent(scene)

  const priorFingerprints = new Map<string, string>()
  for (const beat of existing) {
    priorFingerprints.set(beat.beatId, beatContentFingerprint(beat))
  }

  const existingByKey = new Map<string, SceneBeat>()
  existing.forEach((beat, index) => {
    existingByKey.set(beatMatchKey(beat, index), beat)
  })

  const reconciled: SceneBeat[] = derived.map((derivedBeat, index) => {
    const key = beatMatchKey(derivedBeat, index)
    const match = existingByKey.get(key)

    if (match) {
      return {
        ...match,
        sequenceIndex: index,
        kind: derivedBeat.kind,
        actionDescription: derivedBeat.actionDescription,
        character: derivedBeat.character,
        characterId: derivedBeat.characterId ?? match.characterId,
        line: derivedBeat.line,
        lineId: derivedBeat.lineId ?? match.lineId,
      }
    }

    return {
      ...derivedBeat,
      beatId: mintBeatId(),
      sequenceIndex: index,
    }
  })

  const normalized = normalizeBeatsForProduction(reconciled)
  const newFingerprints = new Map<string, string>()
  for (const beat of normalized) {
    newFingerprints.set(beat.beatId, beatContentFingerprint(beat))
  }

  return { beats: normalized, priorFingerprints, newFingerprints }
}

function beatFingerprintChanged(
  beat: SceneBeat,
  priorFingerprints: Map<string, string>,
  newFingerprints: Map<string, string>
): boolean {
  const prior = priorFingerprints.get(beat.beatId)
  const next = newFingerprints.get(beat.beatId)
  if (prior === undefined || next === undefined) return true
  return prior !== next
}

function clearBeatStoryboardFrames(beat: SceneBeat): SceneBeat {
  const next = { ...beat }
  delete next.storyboardImageUrl
  delete next.storyboardImageGcsPath
  delete next.storyboardImagePrompt
  delete next.storyboardImageTier
  delete next.storyboardEndImageUrl
  delete next.storyboardEndImageGcsPath
  delete next.storyboardEndImagePrompt
  delete next.storyboardEndImageTier
  return next
}

/**
 * After a scene edit, align beats[] with revised flat script fields and clear
 * storyboard frames for beats whose content changed.
 */
export function reconcileSceneBeatsFromScript(
  scene: Record<string, unknown>,
  originalScene: Record<string, unknown>
): Record<string, unknown> {
  const { beats, priorFingerprints, newFingerprints } = reconcileBeatsWithScriptContent(scene)
  let working = applyBeatsToScene(scene, beats)

  const updatedBeats = getSceneBeats(working).map((beat) => {
    if (!beatFingerprintChanged(beat, priorFingerprints, newFingerprints)) {
      return beat
    }
    return clearBeatStoryboardFrames(beat)
  })
  working = applyBeatsToScene(working, updatedBeats)

  const priorAction = String(originalScene.action ?? originalScene.visualDescription ?? '').trim()
  const nextAction = String(working.action ?? working.visualDescription ?? '').trim()
  if (priorAction !== nextAction || !priorFingerprints.size) {
    delete working.imageUrl
    delete working.imageGcsPath
    delete working.imagePrompt
    delete working.imageGeneratedAt
  }

  return working
}

export function getSceneBeats(scene: Record<string, unknown> | null | undefined): SceneBeat[] {
  if (!scene) return []
  const beats =
    Array.isArray(scene.beats) && scene.beats.length > 0
      ? normalizeBeatsForProduction(scene.beats as SceneBeat[])
      : flatSceneToBeats(scene)
  return hydrateBeatAudioFromLegacy(
    scene,
    hydrateBeatStoryboardMediaFromLegacy(scene, beats)
  )
}

/** Beats used for storyboard frame slots and playback (full beat timeline). */
export function getStoryboardTimelineBeats(
  scene: Record<string, unknown> | null | undefined
): SceneBeat[] {
  if (!scene) return []
  return getSceneBeats(scene)
}

/** Map gallery timeline slot or beatId to raw getSceneBeats() index. */
export function resolveRawBeatIndex(
  scene: Record<string, unknown>,
  params: { beatId: string } | { timelineBeatIndex: number }
): number | undefined {
  const beats = getSceneBeats(scene)

  if ('beatId' in params) {
    const idx = beats.findIndex((beat) => beat.beatId === params.beatId)
    return idx >= 0 ? idx : undefined
  }

  const timelineBeat = getStoryboardTimelineBeats(scene)[params.timelineBeatIndex]
  if (!timelineBeat?.beatId) return undefined

  const idx = beats.findIndex((beat) => beat.beatId === timelineBeat.beatId)
  return idx >= 0 ? idx : undefined
}

export function getStoryboardStatus(
  scene: Record<string, unknown> | null | undefined
): StoryboardStatus {
  const status = scene?.storyboardStatus
  if (status === 'approved' || status === 'pending_review' || status === 'none') {
    return status
  }
  return 'none'
}

export function isStoryboardApproved(scene: Record<string, unknown> | null | undefined): boolean {
  return getStoryboardStatus(scene) === 'approved'
}

export function sceneBeatsNeedStoryboard(scene: Record<string, unknown>): boolean {
  const beats = getSceneBeats(scene)
  return beats.some((b) => !b.storyboardImageUrl?.trim())
}

export function isProjectBeatsMigrated(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  const visionPhase = (metadata as Record<string, unknown>).visionPhase
  if (!visionPhase || typeof visionPhase !== 'object') return false
  const flag = (visionPhase as Record<string, unknown>)[BEAT_MIGRATION_FLAG]
  return typeof flag === 'string' && flag.length > 0
}

export interface MigrateBeatsResult {
  metadata: Record<string, unknown>
  migratedSceneCount: number
  changed: boolean
}

/** Idempotent: ensure every scene has beats[] derived from legacy fields. */
export function migrateProjectToBeats(metadata: unknown): MigrateBeatsResult {
  const empty: MigrateBeatsResult = {
    metadata: (metadata && typeof metadata === 'object'
      ? JSON.parse(JSON.stringify(metadata))
      : {}) as Record<string, unknown>,
    migratedSceneCount: 0,
    changed: false,
  }
  if (!metadata || typeof metadata !== 'object') return empty

  const cloned = JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>
  const visionPhase = cloned.visionPhase as Record<string, unknown> | undefined
  if (!visionPhase) return empty

  const scriptRoot = visionPhase.script as Record<string, unknown> | undefined
  const nested = scriptRoot?.script as Record<string, unknown> | undefined
  const scenes = (nested?.scenes ?? scriptRoot?.scenes) as unknown[]
  if (!Array.isArray(scenes) || scenes.length === 0) return empty

  let migratedSceneCount = 0
  let changed = false

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] as Record<string, unknown>
    const parsed = tryParseExistingBeats(scene)
    const hadValidBeats = parsed.length > 0
    const baseBeats = hadValidBeats ? parsed : deriveBeatsFromSceneContent(scene)
    const hydratedBeats = hydrateBeatStoryboardMediaFromLegacy(scene, baseBeats)
    const nextScene = applyDerivedSfxToScene(
      applyBeatsToScene(scene, hydratedBeats),
      hydratedBeats
    )
    const sceneChanged = JSON.stringify(scene) !== JSON.stringify(nextScene)
    if (sceneChanged) {
      scenes[i] = nextScene
      changed = true
      if (!hadValidBeats && baseBeats.length > 0) migratedSceneCount++
    }
  }

  if (changed) {
    visionPhase[BEAT_MIGRATION_FLAG] = new Date().toISOString()
  }

  return { metadata: cloned, migratedSceneCount, changed }
}

/** Promote legacy end frames to start when missing; strip all storyboardEndImage* fields. */
export function migrateSceneBeatsToStartFrameOnly(
  scene: Record<string, unknown>
): Record<string, unknown> {
  const beats = getSceneBeats(scene)
  if (beats.length === 0) return scene

  let changed = false
  const nextBeats = beats.map((beat) => {
    const startUrl = pickStoryboardString(beat.storyboardImageUrl)
    const endUrl = pickStoryboardString(beat.storyboardEndImageUrl)
    const hasEndFields =
      !!endUrl ||
      !!pickStoryboardString(beat.storyboardEndImageGcsPath) ||
      !!pickStoryboardString(beat.storyboardEndImagePrompt) ||
      beat.storyboardEndImageTier != null

    if (!hasEndFields) return beat

    changed = true
    const {
      storyboardEndImageUrl: _endUrl,
      storyboardEndImageGcsPath: _endGcs,
      storyboardEndImagePrompt: _endPrompt,
      storyboardEndImageTier: _endTier,
      ...rest
    } = beat

    if (!startUrl && endUrl) {
      return {
        ...rest,
        storyboardImageUrl: endUrl,
        ...(pickStoryboardString(beat.storyboardEndImageGcsPath)
          ? { storyboardImageGcsPath: pickStoryboardString(beat.storyboardEndImageGcsPath) }
          : {}),
        ...(pickStoryboardString(beat.storyboardEndImagePrompt)
          ? { storyboardImagePrompt: pickStoryboardString(beat.storyboardEndImagePrompt) }
          : {}),
        ...(beat.storyboardEndImageTier
          ? { storyboardImageTier: beat.storyboardEndImageTier }
          : {}),
      }
    }

    return rest as SceneBeat
  })

  if (!changed) return scene
  return applyBeatsToScene(scene, nextBeats)
}

/** Idempotent: one start frame per beat across all script scenes. */
export function migrateProjectBeatsToStartFrameOnly(metadata: unknown): MigrateBeatsResult {
  const empty: MigrateBeatsResult = {
    metadata: (metadata && typeof metadata === 'object'
      ? JSON.parse(JSON.stringify(metadata))
      : {}) as Record<string, unknown>,
    migratedSceneCount: 0,
    changed: false,
  }
  if (!metadata || typeof metadata !== 'object') return empty

  const cloned = JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>
  const visionPhase = cloned.visionPhase as Record<string, unknown> | undefined
  if (!visionPhase) return empty

  const scriptRoot = visionPhase.script as Record<string, unknown> | undefined
  const nested = scriptRoot?.script as Record<string, unknown> | undefined
  const scenes = (nested?.scenes ?? scriptRoot?.scenes) as unknown[]
  if (!Array.isArray(scenes) || scenes.length === 0) return empty

  let migratedSceneCount = 0
  let changed = false

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] as Record<string, unknown>
    const nextScene = migrateSceneBeatsToStartFrameOnly(scene)
    if (JSON.stringify(scene) !== JSON.stringify(nextScene)) {
      scenes[i] = nextScene
      changed = true
      migratedSceneCount++
    }
  }

  if (changed) {
    visionPhase[START_FRAME_ONLY_MIGRATION_FLAG] = new Date().toISOString()
  }

  return { metadata: cloned, migratedSceneCount, changed }
}

/** Match beat characters to project character ids. */
export function embedCharacterIdsInSceneBeats(
  scene: Record<string, unknown>,
  characters: Array<{ id?: string; name?: string }>
): Record<string, unknown> {
  const beats = getSceneBeats(scene).map((beat) => {
    if (beat.kind === 'action' || !beat.character) return beat
    const canonical = toCanonicalName(beat.character)
    const match = characters.find(
      (c) => c.name && toCanonicalName(c.name) === canonical
    )
    if (!match) return beat
    return {
      ...beat,
      characterId: match.id,
      character: match.name?.toUpperCase() ?? beat.character,
    }
  })
  return applyBeatsToScene(scene, beats)
}

export function isBeatFirstPipelineEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_BEAT_FIRST_PIPELINE?.trim().toLowerCase()
  if (v === 'false' || v === '0' || v === 'no') return false
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem('BEAT_FIRST_PIPELINE')
      if (stored === 'false') return false
      if (stored === 'true') return true
    } catch {
      /* ignore */
    }
  }
  const serverV = process.env.BEAT_FIRST_PIPELINE?.trim().toLowerCase()
  if (serverV === 'false' || serverV === '0' || serverV === 'no') return false
  return true
}

/** Parse beats[] from LLM script output into normalized SceneBeat[]. */
export function parseLlmBeats(raw: unknown[]): SceneBeat[] {
  const beats: SceneBeat[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const b = item as Record<string, unknown>
    const kind = b.kind as BeatKind | undefined
    if (kind !== 'dialogue' && kind !== 'action' && kind !== 'narration') continue

    const beat: SceneBeat = {
      beatId: typeof b.beatId === 'string' ? b.beatId : mintBeatId(),
      sequenceIndex: beats.length,
      kind,
    }

    if (kind === 'action') {
      beat.actionDescription = String(
        b.actionDescription ?? b.description ?? b.action ?? ''
      ).trim()
    } else {
      beat.character = String(b.character ?? (kind === 'narration' ? NARRATOR_CHARACTER : ''))
      beat.characterId =
        typeof b.characterId === 'string'
          ? b.characterId
          : kind === 'narration'
            ? NARRATOR_CHARACTER_ID
            : undefined
      beat.line = String(b.line ?? b.text ?? '').trim()
      beat.voiceDirection =
        typeof b.voiceDirection === 'string' ? b.voiceDirection : undefined
      beat.lineId =
        typeof b.lineId === 'string' && b.lineId.trim() ? b.lineId.trim() : mintLineId()
    }

    beats.push(beat)
  }
  return normalizeBeatsForProduction(beats)
}

/** Ensure scene has beats — prefer valid beats[], else derive from scene content. */
export function ensureSceneBeats(scene: Record<string, unknown>): Record<string, unknown> {
  const parsed = tryParseExistingBeats(scene)
  const beats = parsed.length > 0 ? parsed : deriveBeatsFromSceneContent(scene)
  const withBeats = applyBeatsToScene(scene, beats)
  return applyDerivedSfxToScene(withBeats, beats)
}
