/**
 * Detect when beat TTS/SFX no longer matches the current script prompt.
 * Keeps the old audio URL; callers show a "Prompt changed" indicator.
 */

import { beatContentFingerprint, getSceneBeats } from '@/lib/script/beatMigration'
import { coerceDialogueLineText } from '@/lib/script/segmentScript'
import type { SceneBeat } from '@/lib/script/segmentTypes'

export function audioSourceFingerprintForSpoken(opts: {
  kind?: 'dialogue' | 'narration'
  character?: string
  line?: string
  /**
   * Optional digest of the voice + prompt state the clip was rendered with.
   * Appended only when supplied, so fingerprints written before voice state
   * was tracked stay byte-identical and no existing library is invalidated.
   */
  voiceStateHash?: string
}): string {
  const base = beatContentFingerprint({
    beatId: '',
    sequenceIndex: 0,
    kind: opts.kind === 'narration' ? 'narration' : 'dialogue',
    character: opts.character,
    line: coerceDialogueLineText(opts.line),
  })
  const voiceState = (opts.voiceStateHash ?? '').trim()
  return voiceState ? `${base}||voice:${voiceState}` : base
}

export function audioSourceFingerprintForAction(actionDescription?: string): string {
  return (actionDescription ?? '').trim()
}

const VOICE_STATE_SUFFIX = /\|\|voice:([0-9a-f]+)$/i

function splitVoiceState(fingerprint: string): { content: string; voice: string } {
  const match = VOICE_STATE_SUFFIX.exec(fingerprint)
  if (!match) return { content: fingerprint, voice: '' }
  return {
    content: fingerprint.slice(0, match.index),
    voice: match[1].toLowerCase(),
  }
}

/**
 * Compare a stored fingerprint against the current one.
 *
 * Voice state is only compared when both sides carry it. Most call sites know
 * the script text but not the voice configuration, and treating their
 * content-only fingerprint as a mismatch would mark every clip stale.
 */
export function fingerprintsDiverge(stored: string, current: string): boolean {
  const a = splitVoiceState(stored)
  const b = splitVoiceState(current)
  if (a.content !== b.content) return true
  if (a.voice && b.voice) return a.voice !== b.voice
  return false
}

export function isBeatAudioStale(opts: {
  hasAudio: boolean
  sourceFingerprint?: string | null
  audioStale?: boolean | null
  currentFingerprint: string
}): boolean {
  if (!opts.hasAudio) return false
  const stored = (opts.sourceFingerprint || '').trim()
  if (stored) return fingerprintsDiverge(stored, opts.currentFingerprint)
  return !!opts.audioStale
}

function cloneDialogueAudioMap(dialogueAudio: unknown): Record<string, unknown[]> | unknown[] | null {
  if (!dialogueAudio) return null
  if (Array.isArray(dialogueAudio)) {
    return dialogueAudio.map((entry) =>
      entry && typeof entry === 'object' ? { ...(entry as Record<string, unknown>) } : entry
    )
  }
  if (typeof dialogueAudio === 'object') {
    const next: Record<string, unknown[]> = {}
    for (const [lang, arr] of Object.entries(dialogueAudio as Record<string, unknown>)) {
      if (!Array.isArray(arr)) continue
      next[lang] = arr.map((entry) =>
        entry && typeof entry === 'object' ? { ...(entry as Record<string, unknown>) } : entry
      )
    }
    return next
  }
  return null
}

function markDialogueEntryStale(
  entry: Record<string, unknown>,
  currentFingerprint: string,
  canonicalFingerprint?: string
): void {
  const url = entry.audioUrl || entry.url
  if (typeof url !== 'string' || !url.trim()) return
  const stored = typeof entry.sourceFingerprint === 'string' ? entry.sourceFingerprint.trim() : ''
  if (stored) {
    entry.audioStale = fingerprintsDiverge(stored, currentFingerprint)
    return
  }
  if (canonicalFingerprint && canonicalFingerprint !== currentFingerprint) {
    entry.audioStale = true
  }
}

function patchDialogueEntryForBeat(
  dialogueAudio: Record<string, unknown[]> | unknown[],
  beat: SceneBeat,
  dialogueIndex: number,
  currentFingerprint: string,
  canonicalFingerprint?: string
): void {
  const langs = Array.isArray(dialogueAudio)
    ? [{ lang: 'en', arr: dialogueAudio as unknown[] }]
    : Object.entries(dialogueAudio).map(([lang, arr]) => ({ lang, arr }))

  for (const { arr } of langs) {
    if (!Array.isArray(arr)) continue
    let idx = -1
    if (beat.lineId) {
      idx = arr.findIndex(
        (e) => e && typeof e === 'object' && (e as Record<string, unknown>).lineId === beat.lineId
      )
    }
    if (idx < 0) {
      idx = arr.findIndex(
        (e) =>
          e &&
          typeof e === 'object' &&
          (e as Record<string, unknown>).dialogueIndex === dialogueIndex
      )
    }
    if (idx < 0) continue
    const entry = arr[idx]
    if (!entry || typeof entry !== 'object') continue
    markDialogueEntryStale(entry as Record<string, unknown>, currentFingerprint, canonicalFingerprint)
  }
}

function markSfxCueStale(
  cue: Record<string, unknown>,
  currentFingerprint: string,
  canonicalFingerprint?: string
): void {
  const stored = typeof cue.sourceFingerprint === 'string' ? cue.sourceFingerprint.trim() : ''
  if (stored) {
    cue.audioStale = fingerprintsDiverge(stored, currentFingerprint)
    return
  }
  if (canonicalFingerprint && canonicalFingerprint !== currentFingerprint) {
    cue.audioStale = true
  }
}

/**
 * Set `audioStale` on dialogue/narration/SFX that still have URLs when beat
 * text diverges from the clip's stored fingerprint (or from canonical text
 * when the fingerprint is missing). Does not clear URLs.
 */
export function stampStaleBeatAudioOnScene(
  canonical: Record<string, unknown> | undefined,
  scene: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...scene }
  const beats = getSceneBeats(next)
  const canonicalById = new Map(
    (canonical ? getSceneBeats(canonical) : []).map((b) => [b.beatId, b])
  )

  const dialogueLines: Array<Record<string, unknown>> = Array.isArray(next.dialogue)
    ? (next.dialogue as Array<Record<string, unknown>>)
    : []
  let spokenCursor = 0

  const clonedDialogue = cloneDialogueAudioMap(next.dialogueAudio)
  if (clonedDialogue) next.dialogueAudio = clonedDialogue

  if (next.narrationAudio && typeof next.narrationAudio === 'object') {
    const cloned: Record<string, unknown> = {}
    for (const [lang, entry] of Object.entries(next.narrationAudio as Record<string, unknown>)) {
      cloned[lang] =
        entry && typeof entry === 'object' ? { ...(entry as Record<string, unknown>) } : entry
    }
    next.narrationAudio = cloned
  }

  if (Array.isArray(next.sfx)) {
    next.sfx = (next.sfx as unknown[]).map((cue) =>
      cue && typeof cue === 'object' && !Array.isArray(cue)
        ? { ...(cue as Record<string, unknown>) }
        : cue
    )
  }

  for (const beat of beats) {
    const canonicalBeat = canonicalById.get(beat.beatId)
    const canonicalFp = canonicalBeat ? beatContentFingerprint(canonicalBeat) : undefined

    if (beat.kind === 'dialogue' || beat.kind === 'narration') {
      const currentFp = beatContentFingerprint(beat)
      let dialogueIndex = spokenCursor
      if (beat.lineId?.trim()) {
        const byLineId = dialogueLines.findIndex((entry) => entry?.lineId === beat.lineId)
        if (byLineId >= 0) dialogueIndex = byLineId
      }
      spokenCursor = Math.max(spokenCursor + 1, dialogueIndex + 1)

      if (clonedDialogue) {
        patchDialogueEntryForBeat(
          clonedDialogue as Record<string, unknown[]> | unknown[],
          beat,
          dialogueIndex,
          currentFp,
          canonicalFp
        )
      }

      const narrationText = String(next.narration ?? '').trim()
      const isSceneNarration =
        beat.kind === 'narration' &&
        narrationText &&
        coerceDialogueLineText(beat.line).trim() === narrationText
      if (isSceneNarration && next.narrationAudio && typeof next.narrationAudio === 'object') {
        for (const entry of Object.values(next.narrationAudio as Record<string, unknown>)) {
          if (!entry || typeof entry !== 'object') continue
          const rec = entry as Record<string, unknown>
          const url = rec.url
          if (typeof url !== 'string' || !url.trim()) continue
          markDialogueEntryStale(rec, currentFp, canonicalFp)
        }
      }
      continue
    }

    if (beat.kind === 'action' && Array.isArray(next.sfx)) {
      const currentFp = audioSourceFingerprintForAction(beat.actionDescription)
      for (const cue of next.sfx as unknown[]) {
        if (!cue || typeof cue !== 'object' || Array.isArray(cue)) continue
        const rec = cue as Record<string, unknown>
        if (rec.sourceBeatId !== beat.beatId) continue
        markSfxCueStale(rec, currentFp, canonicalFp)
      }
    }
  }

  return next
}

export function actionBeatSfxIsStale(
  scene: Record<string, unknown>,
  beat: Pick<SceneBeat, 'beatId' | 'actionDescription' | 'kind'>,
  hasAudio: boolean
): boolean {
  if (!hasAudio || beat.kind !== 'action') return false
  const currentFingerprint = audioSourceFingerprintForAction(beat.actionDescription)
  const list = Array.isArray(scene.sfx) ? scene.sfx : []
  const cue = list.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (item as Record<string, unknown>).sourceBeatId === beat.beatId
  ) as { sourceFingerprint?: string; audioStale?: boolean } | undefined
  return isBeatAudioStale({
    hasAudio,
    sourceFingerprint: cue?.sourceFingerprint,
    audioStale: cue?.audioStale,
    currentFingerprint,
  })
}
