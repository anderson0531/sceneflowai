/**
 * Shot-aligned Narration Cues (`SceneNarrationCue[]`).
 *
 * Parallel to `sceneMusicCues.ts`, narration cues model voiceover as a
 * shot-spanning overlay (`beatStart..beatEnd`) with Cast or Narrator voice
 * assignment, multi-language scripts/audio (`byLanguage`), and temporal
 * alignment modes (`flow`, `intro-freeze`, `outro-freeze`, `slow-mo-fit`, `manual`).
 *
 * Pure client-safe TypeScript — zero server-only imports.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
  type NarrationAlignmentMode,
  type NarrationCueLanguageAudio,
  type SceneBeat,
  type SceneNarrationCue,
  type SceneNarrationCueSource,
} from '@/lib/script/segmentTypes'

export const MAX_NARRATION_CUES = 30
export const NARRATION_WORDS_PER_SECOND = 2.25
export const PROMO_LEGACY_NARRATION_LINE_ID = 'ln_promo_narration_0'
export const LEGACY_SCENE_NARRATION_ORIGIN_ID = 'dialogue-narration'

const ALIGNMENT_MODES: NarrationAlignmentMode[] = [
  'flow',
  'intro-freeze',
  'outro-freeze',
  'slow-mo-fit',
  'manual',
]

const CUE_SOURCES: SceneNarrationCueSource[] = ['ai-director', 'migrated', 'user']

export function buildNarrationCueId(
  beatStart: number,
  beatEnd: number,
  index?: number
): string {
  return index !== undefined
    ? `ncue-${beatStart}-${beatEnd}-${index}`
    : `ncue-${beatStart}-${beatEnd}`
}

export function coerceNarrationAlignmentMode(
  value: unknown,
  fallback: NarrationAlignmentMode = 'flow'
): NarrationAlignmentMode {
  return typeof value === 'string' &&
    (ALIGNMENT_MODES as string[]).includes(value)
    ? (value as NarrationAlignmentMode)
    : fallback
}

/** Deterministic lightweight hash for staleness detection when text/voice/delivery changes. */
export function computeNarrationCueFingerprint(input: {
  text: string
  speakerType: 'narrator' | 'character'
  characterId?: string
  voiceId?: string
  deliveryCue?: string
  language: string
}): string {
  const normalized = [
    input.language.trim().toLowerCase() || 'en',
    input.speakerType,
    (input.characterId ?? '').trim().toLowerCase(),
    (input.voiceId ?? '').trim(),
    (input.deliveryCue ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
    input.text.replace(/\s+/g, ' ').trim(),
  ].join('|')

  let h = 2166136261
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `ncfp_${(h >>> 0).toString(36)}`
}

export function isNarrationCueAudioStale(
  cue: SceneNarrationCue,
  language: string,
  expectedVoiceId?: string
): boolean {
  const lang = language.trim().toLowerCase() || 'en'
  const entry = cue.byLanguage?.[lang]
  if (!entry?.audioUrl?.trim()) return false
  if (!entry.sourceFingerprint) return false
  const currentFp = computeNarrationCueFingerprint({
    text: entry.text || '',
    speakerType: cue.speakerType,
    characterId: cue.characterId,
    voiceId: expectedVoiceId ?? entry.voiceId,
    deliveryCue: cue.deliveryCue,
    language: lang,
  })
  return entry.sourceFingerprint !== currentFp
}

export function countSpeakableWords(text: string | null | undefined): number {
  if (!text) return 0
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return 0
  return cleaned.split(' ').filter(Boolean).length
}

export function estimateNarrationWordsDurationSec(
  text: string | null | undefined,
  wordsPerSecond: number = NARRATION_WORDS_PER_SECOND
): number {
  const words = countSpeakableWords(text)
  if (words <= 0) return 0
  const rate = wordsPerSecond > 0 ? wordsPerSecond : NARRATION_WORDS_PER_SECOND
  return Math.max(1.0, Math.round((words / rate) * 10) / 10)
}

export function formatNarrationCueRange(
  cue: Pick<SceneNarrationCue, 'beatStart' | 'beatEnd'>
): string {
  return cue.beatStart === cue.beatEnd
    ? `Shot ${cue.beatStart + 1}`
    : `Shots ${cue.beatStart + 1}–${cue.beatEnd + 1}`
}

export function beatHasOnCameraDialogue(beat: Partial<SceneBeat> | null | undefined): boolean {
  if (!beat) return false
  return beat.kind === 'dialogue' && typeof beat.line === 'string' && beat.line.trim().length > 0
}

function normalizeDurationSec(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined
  let val = raw
  if (val > 600 && val < 3_600_000) val /= 1000
  if (val > 0 && val < 7200) return Math.round(val * 100) / 100
  return undefined
}

function parseLanguageMap(
  raw: unknown
): Record<string, NarrationCueLanguageAudio> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, NarrationCueLanguageAudio> = {}
  for (const [rawLang, rawEntry] of Object.entries(raw as Record<string, unknown>)) {
    const lang = rawLang.trim().toLowerCase()
    if (!lang || !rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue
    const rec = rawEntry as Record<string, unknown>
    const text = typeof rec.text === 'string' ? rec.text.trim() : ''
    const audioUrl =
      typeof rec.audioUrl === 'string' && rec.audioUrl.trim()
        ? rec.audioUrl.trim()
        : typeof rec.url === 'string' && rec.url.trim()
          ? rec.url.trim()
          : undefined
    if (!text && !audioUrl) continue
    const durationSec = normalizeDurationSec(rec.durationSec ?? rec.duration)
    const provider =
      rec.provider === 'google' || rec.provider === 'elevenlabs'
        ? rec.provider
        : undefined
    out[lang] = {
      text,
      ...(audioUrl ? { audioUrl } : {}),
      ...(durationSec !== undefined ? { durationSec } : {}),
      ...(typeof rec.voiceId === 'string' && rec.voiceId.trim()
        ? { voiceId: rec.voiceId.trim() }
        : {}),
      ...(provider ? { provider } : {}),
      ...(typeof rec.generatedAt === 'string' && rec.generatedAt.trim()
        ? { generatedAt: rec.generatedAt.trim() }
        : {}),
      ...(typeof rec.sourceFingerprint === 'string' && rec.sourceFingerprint.trim()
        ? { sourceFingerprint: rec.sourceFingerprint.trim() }
        : {}),
    }
  }
  return out
}

function resolveSpanFromAnchorsOrBounds(
  rawStart: unknown,
  rawEnd: unknown,
  anchorBeatIds: string[] | undefined,
  beats: SceneBeat[]
): { beatStart: number; beatEnd: number; anchorBeatIds: string[] } | null {
  if (beats.length === 0) {
    const s = Number.isInteger(Number(rawStart)) ? Math.max(0, Number(rawStart)) : 0
    const e = Number.isInteger(Number(rawEnd)) ? Math.max(s, Number(rawEnd)) : s
    return { beatStart: s, beatEnd: e, anchorBeatIds: anchorBeatIds ?? [] }
  }

  const indexById = new Map<string, number>()
  beats.forEach((beat, idx) => {
    if (beat?.beatId) indexById.set(beat.beatId, idx)
  })

  if (anchorBeatIds && anchorBeatIds.length > 0) {
    const matched = anchorBeatIds
      .map((id) => indexById.get(id))
      .filter((idx): idx is number => idx !== undefined)
    if (matched.length > 0) {
      const beatStart = Math.min(...matched)
      const beatEnd = Math.max(...matched)
      return {
        beatStart,
        beatEnd,
        anchorBeatIds: beats
          .slice(beatStart, beatEnd + 1)
          .map((b) => b.beatId)
          .filter(Boolean),
      }
    }
  }

  const parsedStart = Number(rawStart)
  const parsedEnd = Number(rawEnd)
  if (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd)) return null
  const clampedStart = Math.max(0, Math.min(beats.length - 1, Math.floor(parsedStart)))
  const clampedEnd = Math.max(
    clampedStart,
    Math.min(beats.length - 1, Math.floor(parsedEnd))
  )
  return {
    beatStart: clampedStart,
    beatEnd: clampedEnd,
    anchorBeatIds: beats
      .slice(clampedStart, clampedEnd + 1)
      .map((b) => b.beatId)
      .filter(Boolean),
  }
}

export function normalizeNarrationCueShape(
  cue: SceneNarrationCue,
  beats: SceneBeat[] = []
): SceneNarrationCue {
  const span =
    beats.length > 0
      ? resolveSpanFromAnchorsOrBounds(
          cue.beatStart,
          cue.beatEnd,
          cue.anchorBeatIds,
          beats
        ) ?? {
          beatStart: Math.max(0, cue.beatStart),
          beatEnd: Math.max(cue.beatStart, cue.beatEnd),
          anchorBeatIds: cue.anchorBeatIds ?? [],
        }
      : {
          beatStart: Math.max(0, cue.beatStart),
          beatEnd: Math.max(cue.beatStart, cue.beatEnd),
          anchorBeatIds: cue.anchorBeatIds ?? [],
        }

  const volume =
    typeof cue.volume === 'number' && Number.isFinite(cue.volume)
      ? Math.max(0, Math.min(1.5, Math.round(cue.volume * 100) / 100))
      : undefined

  const introNarrationSec =
    typeof cue.introNarrationSec === 'number' &&
    Number.isFinite(cue.introNarrationSec) &&
    cue.introNarrationSec > 0
      ? Math.min(15, Math.round(cue.introNarrationSec * 10) / 10)
      : undefined

  const startOffsetSec =
    typeof cue.startOffsetSec === 'number' &&
    Number.isFinite(cue.startOffsetSec) &&
    Math.abs(cue.startOffsetSec) >= 0.01
      ? Math.max(-5, Math.min(30, Math.round(cue.startOffsetSec * 100) / 100))
      : undefined

  return {
    cueId: cue.cueId?.trim() || buildNarrationCueId(span.beatStart, span.beatEnd),
    beatStart: span.beatStart,
    beatEnd: span.beatEnd,
    ...(span.anchorBeatIds.length > 0 ? { anchorBeatIds: span.anchorBeatIds } : {}),
    ...(cue.originLineId?.trim() ? { originLineId: cue.originLineId.trim() } : {}),
    speakerType: cue.speakerType === 'character' ? 'character' : 'narrator',
    ...(cue.speakerType === 'character' && cue.characterId?.trim()
      ? { characterId: cue.characterId.trim() }
      : {}),
    ...(cue.characterName?.trim() ? { characterName: cue.characterName.trim() } : {}),
    ...(cue.deliveryCue?.trim() ? { deliveryCue: cue.deliveryCue.trim() } : {}),
    alignmentMode: coerceNarrationAlignmentMode(cue.alignmentMode),
    ...(introNarrationSec !== undefined ? { introNarrationSec } : {}),
    ...(startOffsetSec !== undefined ? { startOffsetSec } : {}),
    ...(volume !== undefined ? { volume } : {}),
    byLanguage: cue.byLanguage ?? {},
    ...(cue.generatedBy ? { generatedBy: cue.generatedBy } : {}),
    ...(cue.updatedAt ? { updatedAt: cue.updatedAt } : {}),
  }
}

export function parsePersistedNarrationCues(
  raw: unknown,
  beats: SceneBeat[] = []
): SceneNarrationCue[] {
  if (!Array.isArray(raw) || raw.length === 0) return []

  const parsed: SceneNarrationCue[] = []
  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return
    const row = item as Record<string, unknown>
    const anchorBeatIds = Array.isArray(row.anchorBeatIds)
      ? row.anchorBeatIds.filter((id): id is string => typeof id === 'string' && !!id.trim())
      : undefined
    const span = resolveSpanFromAnchorsOrBounds(
      row.beatStart,
      row.beatEnd,
      anchorBeatIds,
      beats
    )
    if (!span) return

    const byLanguage = parseLanguageMap(row.byLanguage)
    // Support flat `text` / `audioUrl` fallback if emitted directly by an LLM or draft payload
    if (Object.keys(byLanguage).length === 0 && typeof row.text === 'string' && row.text.trim()) {
      const lang =
        typeof row.language === 'string' && row.language.trim()
          ? row.language.trim().toLowerCase()
          : 'en'
      const audioUrl =
        typeof row.audioUrl === 'string' && row.audioUrl.trim()
          ? row.audioUrl.trim()
          : undefined
      byLanguage[lang] = {
        text: row.text.trim(),
        ...(audioUrl ? { audioUrl } : {}),
        ...(normalizeDurationSec(row.durationSec) !== undefined
          ? { durationSec: normalizeDurationSec(row.durationSec) }
          : {}),
      }
    }

    const speakerType = row.speakerType === 'character' ? 'character' : 'narrator'
    const generatedBy =
      typeof row.generatedBy === 'string' &&
      (CUE_SOURCES as string[]).includes(row.generatedBy)
        ? (row.generatedBy as SceneNarrationCueSource)
        : 'user'

    parsed.push(
      normalizeNarrationCueShape(
        {
          cueId:
            typeof row.cueId === 'string' && row.cueId.trim()
              ? row.cueId.trim()
              : buildNarrationCueId(span.beatStart, span.beatEnd, index),
          beatStart: span.beatStart,
          beatEnd: span.beatEnd,
          anchorBeatIds: span.anchorBeatIds,
          originLineId: typeof row.originLineId === 'string' ? row.originLineId : undefined,
          speakerType,
          characterId: typeof row.characterId === 'string' ? row.characterId : undefined,
          characterName: typeof row.characterName === 'string' ? row.characterName : undefined,
          deliveryCue: typeof row.deliveryCue === 'string' ? row.deliveryCue : undefined,
          alignmentMode: coerceNarrationAlignmentMode(row.alignmentMode),
          introNarrationSec:
            typeof row.introNarrationSec === 'number' ? row.introNarrationSec : undefined,
          startOffsetSec:
            typeof row.startOffsetSec === 'number' ? row.startOffsetSec : undefined,
          volume: typeof row.volume === 'number' ? row.volume : undefined,
          byLanguage,
          generatedBy,
          updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
        },
        beats
      )
    )
  })

  return parsed
    .sort((a, b) => a.beatStart - b.beatStart || a.beatEnd - b.beatEnd)
    .slice(0, MAX_NARRATION_CUES)
}

function collectDialogueAudioByLanguage(
  scene: Record<string, unknown>
): Record<string, Array<Record<string, unknown>>> {
  const raw = scene.dialogueAudio
  if (!raw) return {}
  if (Array.isArray(raw)) {
    return {
      en: raw.filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === 'object' && !Array.isArray(entry)
      ),
    }
  }
  if (typeof raw === 'object') {
    const out: Record<string, Array<Record<string, unknown>>> = {}
    for (const [lang, arr] of Object.entries(raw as Record<string, unknown>)) {
      if (!Array.isArray(arr)) continue
      out[lang.trim().toLowerCase()] = arr.filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === 'object' && !Array.isArray(entry)
      )
    }
    return out
  }
  return {}
}

/**
 * Derive non-destructive `SceneNarrationCue[]` from legacy Promo `ln_promo_narration_0`,
 * legacy `scene.narration` / `scene.narrationAudio`, or scripted `kind: 'narration'` beats.
 */
export function deriveLegacyOrPromoNarrationCues(
  scene: Record<string, unknown> | null | undefined,
  beatsInput?: SceneBeat[]
): SceneNarrationCue[] {
  if (!scene) return []
  const beats = beatsInput ?? getSceneBeats(scene)
  if (beats.length === 0) return []

  const dialogueAudioByLang = collectDialogueAudioByLanguage(scene)

  // 1. Legacy Promo single-blob narration (`ln_promo_narration_0`) -> span across Promo cut!
  const promoByLanguage: Record<string, NarrationCueLanguageAudio> = {}
  const promoBeatIdx = beats.findIndex(
    (b) => b.lineId === PROMO_LEGACY_NARRATION_LINE_ID
  )

  for (const [lang, entries] of Object.entries(dialogueAudioByLang)) {
    const promoEntry = entries.find(
      (e) =>
        e.lineId === PROMO_LEGACY_NARRATION_LINE_ID ||
        (scene.cinematicType === 'promo' &&
          (e.kind === 'narration' ||
            String(e.character || '')
              .trim()
              .toUpperCase() === NARRATOR_CHARACTER))
    )
    if (!promoEntry) continue
    const audioUrl =
      typeof promoEntry.audioUrl === 'string' && promoEntry.audioUrl.trim()
        ? promoEntry.audioUrl.trim()
        : typeof promoEntry.url === 'string' && promoEntry.url.trim()
          ? promoEntry.url.trim()
          : undefined
    const text =
      (typeof promoEntry.line === 'string' && promoEntry.line.trim()) ||
      (promoBeatIdx >= 0 && beats[promoBeatIdx]?.line?.trim()) ||
      (typeof scene.narration === 'string' ? scene.narration.trim() : '')
    if (!text && !audioUrl) continue
    promoByLanguage[lang] = {
      text,
      ...(audioUrl ? { audioUrl } : {}),
      ...(normalizeDurationSec(promoEntry.duration ?? promoEntry.durationSeconds) !==
      undefined
        ? {
            durationSec: normalizeDurationSec(
              promoEntry.duration ?? promoEntry.durationSeconds
            ),
          }
        : {}),
      ...(typeof promoEntry.voiceId === 'string' && promoEntry.voiceId.trim()
        ? { voiceId: promoEntry.voiceId.trim() }
        : {}),
    }
  }

  if (promoBeatIdx >= 0 && !promoByLanguage.en && beats[promoBeatIdx]?.line?.trim()) {
    promoByLanguage.en = {
      text: beats[promoBeatIdx].line!.trim(),
      ...(beats[promoBeatIdx].audioUrl?.trim()
        ? { audioUrl: beats[promoBeatIdx].audioUrl!.trim() }
        : {}),
    }
  }

  if (Object.keys(promoByLanguage).length > 0) {
    const promoMix =
      scene.promoAudioMix && typeof scene.promoAudioMix === 'object'
        ? (scene.promoAudioMix as { narrationStartShotKey?: string })
        : undefined
    const startKey = promoMix?.narrationStartShotKey?.trim()
    let startIdx = Math.max(0, promoBeatIdx)
    if (startKey) {
      const matchedIdx = beats.findIndex(
        (b) =>
          b.beatId === startKey ||
          (b as unknown as { sourceBeatId?: string }).sourceBeatId === startKey
      )
      if (matchedIdx >= 0) startIdx = matchedIdx
    }
    const endIdx = beats.length - 1
    return [
      normalizeNarrationCueShape(
        {
          cueId: 'ncue-promo-migrated-0',
          beatStart: startIdx,
          beatEnd: endIdx,
          originLineId: PROMO_LEGACY_NARRATION_LINE_ID,
          speakerType: 'narrator',
          characterName: NARRATOR_CHARACTER,
          alignmentMode: 'flow',
          volume: 1,
          byLanguage: promoByLanguage,
          generatedBy: 'migrated',
        },
        beats
      ),
    ]
  }

  // 2. Scripted `kind: 'narration'` beats (Documentary, Video Memoir, Narrative V.O.)
  const scriptedCues: SceneNarrationCue[] = []
  beats.forEach((beat, idx) => {
    if (beat.kind !== 'narration') return
    const text = beat.line?.trim() || ''
    const lineId = beat.lineId?.trim()
    const byLanguage: Record<string, NarrationCueLanguageAudio> = {}

    for (const [lang, entries] of Object.entries(dialogueAudioByLang)) {
      const matched = lineId
        ? entries.find((e) => e.lineId === lineId)
        : entries.find(
            (e) =>
              e.kind === 'narration' &&
              typeof e.dialogueIndex === 'number' &&
              e.dialogueIndex === idx
          )
      if (!matched) continue
      const audioUrl =
        typeof matched.audioUrl === 'string' && matched.audioUrl.trim()
          ? matched.audioUrl.trim()
          : typeof matched.url === 'string' && matched.url.trim()
            ? matched.url.trim()
            : undefined
      const localizedText =
        (typeof matched.line === 'string' && matched.line.trim()) ||
        (typeof matched.text === 'string' && matched.text.trim()) ||
        (lang === 'en' ? text : '')
      if (!localizedText && !audioUrl) continue
      byLanguage[lang] = {
        text: localizedText,
        ...(audioUrl ? { audioUrl } : {}),
        ...(normalizeDurationSec(matched.duration ?? matched.durationSeconds) !==
        undefined
          ? {
              durationSec: normalizeDurationSec(
                matched.duration ?? matched.durationSeconds
              ),
            }
          : {}),
        ...(typeof matched.voiceId === 'string' && matched.voiceId.trim()
          ? { voiceId: matched.voiceId.trim() }
          : {}),
      }
    }

    if (!byLanguage.en && (text || beat.audioUrl?.trim())) {
      byLanguage.en = {
        text,
        ...(beat.audioUrl?.trim() ? { audioUrl: beat.audioUrl.trim() } : {}),
        ...(normalizeDurationSec(beat.durationSeconds) !== undefined
          ? { durationSec: normalizeDurationSec(beat.durationSeconds) }
          : {}),
      }
    }

    if (Object.keys(byLanguage).length === 0) return

    const isCustomCharacter =
      Boolean(beat.characterId && beat.characterId !== NARRATOR_CHARACTER_ID) ||
      Boolean(
        beat.character &&
          beat.character.trim().toUpperCase() !== NARRATOR_CHARACTER
      )

    scriptedCues.push(
      normalizeNarrationCueShape(
        {
          cueId: lineId ? `ncue-${lineId}` : buildNarrationCueId(idx, idx, idx),
          beatStart: idx,
          beatEnd: idx,
          originLineId: lineId,
          speakerType: isCustomCharacter ? 'character' : 'narrator',
          characterId: isCustomCharacter ? beat.characterId : undefined,
          characterName: beat.character || NARRATOR_CHARACTER,
          deliveryCue: beat.voiceDirection,
          alignmentMode: 'flow',
          volume: 1,
          byLanguage,
          generatedBy: 'migrated',
        },
        beats
      )
    )
  })

  if (scriptedCues.length > 0) {
    return scriptedCues
  }

  // 3. Legacy scene-level `narration` / `narrationAudio`
  const sceneNarrationByLang: Record<string, NarrationCueLanguageAudio> = {}
  const rawNarrAudio = scene.narrationAudio
  if (rawNarrAudio && typeof rawNarrAudio === 'object' && !Array.isArray(rawNarrAudio)) {
    for (const [lang, entry] of Object.entries(rawNarrAudio as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
      const rec = entry as Record<string, unknown>
      const url = typeof rec.url === 'string' && rec.url.trim() ? rec.url.trim() : undefined
      const text =
        (typeof rec.text === 'string' && rec.text.trim()) ||
        (lang === 'en' && typeof scene.narration === 'string' ? scene.narration.trim() : '')
      if (!url && !text) continue
      sceneNarrationByLang[lang.trim().toLowerCase()] = {
        text,
        ...(url ? { audioUrl: url } : {}),
        ...(normalizeDurationSec(rec.duration) !== undefined
          ? { durationSec: normalizeDurationSec(rec.duration) }
          : {}),
      }
    }
  }
  const legacyUrl =
    typeof scene.narrationAudioUrl === 'string' && scene.narrationAudioUrl.trim()
      ? scene.narrationAudioUrl.trim()
      : undefined
  const legacyText =
    typeof scene.narration === 'string' && scene.narration.trim()
      ? scene.narration.trim()
      : ''
  if (!sceneNarrationByLang.en && (legacyUrl || legacyText)) {
    sceneNarrationByLang.en = {
      text: legacyText,
      ...(legacyUrl ? { audioUrl: legacyUrl } : {}),
    }
  }

  if (Object.keys(sceneNarrationByLang).length > 0) {
    return [
      normalizeNarrationCueShape(
        {
          cueId: 'ncue-scene-legacy-0',
          beatStart: 0,
          beatEnd: beats.length - 1,
          originLineId: LEGACY_SCENE_NARRATION_ORIGIN_ID,
          speakerType: 'narrator',
          characterName: NARRATOR_CHARACTER,
          alignmentMode: 'flow',
          volume: 1,
          byLanguage: sceneNarrationByLang,
          generatedBy: 'migrated',
        },
        beats
      ),
    ]
  }

  return []
}

/**
 * Authoritative narration cues for a scene:
 * 1. Persisted `scene.sceneNarrationCues` (respecting an intentional clear via `narrationCuesAuthoritative === true`)
 * 2. Non-destructive migration from Promo `ln_promo_narration_0`, scripted `kind: 'narration'` beats, or legacy `narrationAudio`.
 */
export function getSceneNarrationCues(
  scene: Record<string, unknown> | null | undefined,
  beatsInput?: SceneBeat[]
): SceneNarrationCue[] {
  if (!scene) return []
  const beats = beatsInput ?? getSceneBeats(scene)
  if (Array.isArray(scene.sceneNarrationCues)) {
    const persisted = parsePersistedNarrationCues(scene.sceneNarrationCues, beats)
    if (persisted.length > 0 || scene.narrationCuesAuthoritative === true) {
      return persisted
    }
  }
  return deriveLegacyOrPromoNarrationCues(scene, beats)
}

/**
 * Persist updated `SceneNarrationCue[]` onto a scene object cleanly.
 */
export function applySceneNarrationCues(
  scene: Record<string, unknown>,
  cues: SceneNarrationCue[],
  beatsInput?: SceneBeat[]
): Record<string, unknown> {
  const beats = beatsInput ?? getSceneBeats(scene)
  const normalized = cues
    .map((cue) => normalizeNarrationCueShape(cue, beats))
    .slice(0, MAX_NARRATION_CUES)

  return {
    ...scene,
    sceneNarrationCues: normalized,
    narrationCuesAuthoritative: true,
  }
}

/**
 * Returns `lineId`s that are owned by `SceneNarrationCue[]` so `A1 Dialogue`
 * does not double-play or freeze Shot 1 on narration overlays.
 */
export function getNarrationOwnedLineIds(
  scene: Record<string, unknown> | null | undefined,
  beatsInput?: SceneBeat[]
): Set<string> {
  const owned = new Set<string>([PROMO_LEGACY_NARRATION_LINE_ID])
  if (!scene) return owned
  const cues = getSceneNarrationCues(scene, beatsInput)
  for (const cue of cues) {
    if (cue.originLineId?.trim()) {
      owned.add(cue.originLineId.trim())
    }
  }
  return owned
}

/**
 * Collect all languages present across `SceneNarrationCue.byLanguage`.
 * Accepts either a scene object or a resolved `SceneNarrationCue[]` array.
 */
export function getNarrationCueLanguages(
  sceneOrCues: Record<string, unknown> | SceneNarrationCue[] | null | undefined,
  opts?: { requireAudio?: boolean }
): string[] {
  if (!sceneOrCues) return []
  const cues = Array.isArray(sceneOrCues)
    ? sceneOrCues
    : getSceneNarrationCues(sceneOrCues)
  const langs = new Set<string>()
  for (const cue of cues) {
    for (const [lang, entry] of Object.entries(cue.byLanguage || {})) {
      if (opts?.requireAudio) {
        if (entry?.audioUrl?.trim()) langs.add(lang)
      } else if (entry?.text?.trim() || entry?.audioUrl?.trim()) {
        langs.add(lang)
      }
    }
  }
  return Array.from(langs).sort()
}
