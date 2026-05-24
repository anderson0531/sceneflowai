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
  return beats.map((raw, index) => {
    const beat: SceneBeat = {
      ...raw,
      beatId: raw.beatId?.trim() || mintBeatId(),
      sequenceIndex: index,
    }
    return computeSplitFlags(beat)
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

  const actionText = String(
    scene.action ?? scene.visualDescription ?? scene.summary ?? ''
  ).trim()
  const hasEstablishingImage =
    typeof scene.imageUrl === 'string' && scene.imageUrl.trim().length > 0

  if (actionText || hasEstablishingImage) {
    beats.push({
      beatId: mintBeatId(),
      sequenceIndex: seq++,
      kind: 'action',
      actionDescription: actionText || 'Establishing shot',
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

export function getSceneBeats(scene: Record<string, unknown> | null | undefined): SceneBeat[] {
  if (!scene) return []
  if (Array.isArray(scene.beats) && scene.beats.length > 0) {
    return normalizeBeatsForProduction(scene.beats as SceneBeat[])
  }
  return flatSceneToBeats(scene)
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
    if (Array.isArray(scene.beats) && scene.beats.length > 0) continue
    scenes[i] = applyBeatsToScene(scene, flatSceneToBeats(scene))
    migratedSceneCount++
    changed = true
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
