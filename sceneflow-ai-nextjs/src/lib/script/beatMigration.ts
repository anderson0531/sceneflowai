/**
 * Beat-first pipeline migration: flat scenes ↔ ordered beats[] timeline.
 */

import { toCanonicalName } from '@/lib/character/canonical'
import {
  estimateSpokenDurationSeconds,
  planDialogueLineSplits,
  VEO_DIALOGUE_CLIP_MAX_SEC,
} from '@/lib/scene/dialogueSegmentSplit'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
  type BeatKind,
  type SceneBeat,
  type StoryboardStatus,
} from '@/lib/script/segmentTypes'
import { mintLineId } from '@/lib/script/segmentScript'

const BEAT_MIGRATION_FLAG = 'beatsMigratedAt'

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

  return beats.map((beat) => {
    if (beat.kind === 'action') {
      const sceneImageUrl = pickStoryboardString(scene.imageUrl)
      const beatImageUrl = pickStoryboardString(beat.storyboardImageUrl)
      // scene.imageUrl is canonical for establishing shots (uploads update it first).
      const storyboardImageUrl = sceneImageUrl || beatImageUrl
      if (!storyboardImageUrl) return beat
      return {
        ...beat,
        storyboardImageUrl,
        storyboardImageGcsPath: pickStoryboardString(
          sceneImageUrl && sceneImageUrl !== beatImageUrl
            ? scene.imageGcsPath
            : undefined,
          beat.storyboardImageGcsPath,
          scene.imageGcsPath
        ),
        storyboardImagePrompt: pickStoryboardString(
          sceneImageUrl && sceneImageUrl !== beatImageUrl
            ? scene.imagePrompt
            : undefined,
          beat.storyboardImagePrompt,
          scene.imagePrompt
        ),
      }
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

function isNarratorBeat(beat: SceneBeat): boolean {
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

/** Copy TTS URLs from dialogue[] / dialogueAudio[] onto beats when beats lack audioUrl. */
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
    if (resolvedDialogueIdx < 0) {
      resolvedDialogueIdx = spokenIdx
    }

    const lineEntry =
      resolvedDialogueIdx >= 0 && resolvedDialogueIdx < dialogue.length
        ? dialogue[resolvedDialogueIdx]
        : undefined

    if (!beat.lineId?.trim()) {
      spokenIdx++
    } else if (resolvedDialogueIdx >= 0) {
      spokenIdx = Math.max(spokenIdx, resolvedDialogueIdx + 1)
    }

    const lineAudioUrl =
      (typeof lineEntry?.audioUrl === 'string' && lineEntry.audioUrl) ||
      (typeof lineEntry?.url === 'string' && lineEntry.url) ||
      undefined
    const lineDuration =
      typeof lineEntry?.duration === 'number'
        ? lineEntry.duration
        : typeof lineEntry?.durationSeconds === 'number'
          ? lineEntry.durationSeconds
          : undefined

    let audioMatch: Record<string, unknown> | undefined
    if (beat.lineId?.trim()) {
      audioMatch = audioEntries.find((entry) => entry?.lineId === beat.lineId)
    }
    if (!audioMatch && isNarratorBeat(beat)) {
      audioMatch = audioEntries.find(
        (entry) =>
          entry?.kind === 'narration' || entry?.characterId === NARRATOR_CHARACTER_ID
      )
    }
    if (!audioMatch && resolvedDialogueIdx >= 0) {
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
      beat.audioUrl?.trim() ||
      lineAudioUrl?.trim() ||
      (typeof audioMatch?.audioUrl === 'string' && audioMatch.audioUrl) ||
      (typeof audioMatch?.url === 'string' && audioMatch.url) ||
      undefined

    if (!audioUrl) return beat

    const durationSeconds =
      beat.durationSeconds ??
      lineDuration ??
      (typeof audioMatch?.duration === 'number' ? audioMatch.duration : undefined)

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

  const beats = allBeats ?? (Array.isArray(scene.beats) ? (scene.beats as SceneBeat[]) : [])
  const nextBeat = beats[1]

  // Any leading action immediately before a spoken beat is excluded from playback/slots.
  if (nextBeat && isSpokenBeatKind(nextBeat.kind)) {
    return true
  }

  if (!desc || desc === 'Establishing shot') return true

  if (fallback && desc === fallback) return true

  if (hasImage && /^establishing(\s*shot)?$/i.test(desc)) return true

  return false
}

/**
 * Convert a legacy flat scene into an ordered beats[] timeline.
 * Order: optional establishing action → standalone narration → dialogue beats.
 */
export function flatSceneToBeats(scene: Record<string, unknown>): SceneBeat[] {
  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    return normalizeBeatsForProduction(scene.beats as SceneBeat[])
  }

  const beats: SceneBeat[] = []
  let seq = 0

  const explicitAction = String(scene.action ?? '').trim()

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

/** Beats used for storyboard frame slots and playback (drops auto-injected leading action). */
export function getStoryboardTimelineBeats(
  scene: Record<string, unknown> | null | undefined
): SceneBeat[] {
  if (!scene) return []
  const beats = getSceneBeats(scene)
  if (beats.length > 0 && isAutoLeadingEstablishingBeat(beats[0], scene, 0, beats)) {
    return beats.slice(1)
  }
  return beats
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
    const hadBeats = Array.isArray(scene.beats) && scene.beats.length > 0
    const baseBeats = hadBeats
      ? normalizeBeatsForProduction(scene.beats as SceneBeat[])
      : flatSceneToBeats(scene)
    const hydratedBeats = hydrateBeatStoryboardMediaFromLegacy(scene, baseBeats)
    const nextScene = applyBeatsToScene(scene, hydratedBeats)
    const sceneChanged = JSON.stringify(scene) !== JSON.stringify(nextScene)
    if (sceneChanged) {
      scenes[i] = nextScene
      changed = true
      if (!hadBeats) migratedSceneCount++
    }
  }

  if (changed) {
    visionPhase[BEAT_MIGRATION_FLAG] = new Date().toISOString()
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

/** Ensure scene has beats — prefer LLM beats[], else derive from legacy fields. */
export function ensureSceneBeats(scene: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    const parsed =
      typeof (scene.beats[0] as Record<string, unknown>)?.kind === 'string'
        ? parseLlmBeats(scene.beats as unknown[])
        : normalizeBeatsForProduction(scene.beats as SceneBeat[])
    return applyBeatsToScene(scene, parsed)
  }
  return applyBeatsToScene(scene, flatSceneToBeats(scene))
}
