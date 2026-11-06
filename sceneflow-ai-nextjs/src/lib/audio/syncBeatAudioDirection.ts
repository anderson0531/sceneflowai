/**
 * Synchronize shot-level Audio direction (`voiceDirection`, `beatDirection.audioDirection`,
 * and `scene.sfx`) whenever a shot direction is created or updated.
 *
 * Ensures that all three shot direction outputs — Audio direction, Still direction,
 * and Clip direction — update together on every Shot Director / Shot Direction Agent save.
 */

import { stampStaleBeatAudioOnScene } from '@/lib/audio/beatAudioStale'
import { distinctSfxCue } from '@/lib/audio/shotSfxTag'
import {
  extractInlineSfxFromActionText,
  stripInlineSfxLinesFromActionText,
} from '@/lib/script/deriveSfxFromSceneContent'
import { coerceSceneSfxFlatArray, mintSfxId } from '@/lib/script/segmentScript'
import type { SceneBeat } from '@/lib/script/segmentTypes'

function ensureSentenceEnding(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/**
 * Derive an actor-facing vocal delivery brief from the beat's directed emotion
 * and physical staging when an explicit `voiceDirection` has not been set (or
 * when the shot's directed emotion changes).
 */
export function deriveVoiceDirectionFromBeatDirection(beat: SceneBeat): string {
  const dir = beat.beatDirection
  if (!dir) return ''
  const emotion = dir.emotion?.trim()
  const blocking = dir.blocking?.trim()
  if (emotion && blocking) {
    return `${ensureSentenceEnding(emotion)} ${ensureSentenceEnding(blocking)}`
  }
  if (emotion) {
    return ensureSentenceEnding(emotion)
  }
  return ''
}

/**
 * Compose the canonical Audio direction string for a shot:
 * - Spoken beats (`dialogue` / `narration`): vocal delivery (`voiceDirection` or
 *   derived from `beatDirection.emotion` / `blocking`) plus any distinct `audioCue`.
 * - Action beats (`action`): `beatDirection.audioCue`, inline `SFX:` cues, or
 *   the action sound prompt.
 */
export function composeBeatAudioDirection(beat: SceneBeat): string {
  const cue = distinctSfxCue(beat)
  if (beat.kind === 'dialogue' || beat.kind === 'narration') {
    const vocal = beat.voiceDirection?.trim() || deriveVoiceDirectionFromBeatDirection(beat)
    if (vocal && cue && vocal.toLowerCase() !== cue.toLowerCase()) {
      return `${ensureSentenceEnding(vocal)} Sound cue: ${cue}`
    }
    return vocal || cue || ''
  }

  if (cue) return cue
  const inline = extractInlineSfxFromActionText(beat.actionDescription ?? '')
  if (inline.length > 0) return inline.join('; ')
  return stripInlineSfxLinesFromActionText(beat.actionDescription) || ''
}

export interface SyncBeatAudioDirectionOptions {
  /** Beat state prior to applying the new direction patch. */
  previousBeat?: SceneBeat
  /** Explicit vocal delivery override from `StillDirectorPatch.voiceDirection`. */
  voiceDirection?: string
  /** Recompute `audioDirection` even if already present. */
  force?: boolean
}

/**
 * Synchronize `beat.voiceDirection` and `beat.beatDirection.audioDirection`
 * with the beat's current `beatDirection`.
 */
export function syncBeatAudioDirectionToDirection(
  beat: SceneBeat,
  options: SyncBeatAudioDirectionOptions = {}
): SceneBeat {
  const next: SceneBeat = { ...beat }
  const isSpoken = next.kind === 'dialogue' || next.kind === 'narration'

  if (isSpoken) {
    const explicitVoice = options.voiceDirection?.trim()
    if (explicitVoice) {
      next.voiceDirection = explicitVoice
    } else {
      const currentEmotion = next.beatDirection?.emotion?.trim()
      const previousEmotion = options.previousBeat?.beatDirection?.emotion?.trim()
      const emotionChanged =
        Boolean(currentEmotion) &&
        options.previousBeat !== undefined &&
        currentEmotion !== previousEmotion
      const voiceUnmodifiedFromPrevious =
        options.previousBeat === undefined ||
        (next.voiceDirection?.trim() ?? '') === (options.previousBeat.voiceDirection?.trim() ?? '')

      if (currentEmotion && (!next.voiceDirection?.trim() || (emotionChanged && voiceUnmodifiedFromPrevious))) {
        const derived = deriveVoiceDirectionFromBeatDirection(next)
        if (derived) {
          next.voiceDirection = derived
        }
      }
    }
  }

  if (next.beatDirection) {
    const existingAudioDir = next.beatDirection.audioDirection?.trim()
    if (options.force || !existingAudioDir) {
      const composed = composeBeatAudioDirection(next)
      if (composed) {
        next.beatDirection = {
          ...next.beatDirection,
          audioDirection: composed,
        }
      } else if (next.beatDirection.audioDirection !== undefined) {
        const cleaned = { ...next.beatDirection }
        delete cleaned.audioDirection
        next.beatDirection = cleaned
      }
    }
  }

  return next
}

function sceneHasPersistedAudio(scene: Record<string, unknown>): boolean {
  if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object') {
    const values = Array.isArray(scene.dialogueAudio)
      ? scene.dialogueAudio
      : Object.values(scene.dialogueAudio as Record<string, unknown>).flat()
    if (values.some((entry) => entry && typeof entry === 'object' && Boolean((entry as any).audioUrl || (entry as any).url))) {
      return true
    }
  }
  if (scene.narrationAudio && typeof scene.narrationAudio === 'object') {
    if (
      Object.values(scene.narrationAudio as Record<string, unknown>).some(
        (entry) => entry && typeof entry === 'object' && Boolean((entry as any).url)
      )
    ) {
      return true
    }
  }
  if (Array.isArray(scene.sfxAudio) && scene.sfxAudio.some((u) => typeof u === 'string' && u.trim())) {
    return true
  }
  if (
    Array.isArray(scene.sfx) &&
    scene.sfx.some((cue) => cue && typeof cue === 'object' && typeof (cue as any).audioUrl === 'string' && (cue as any).audioUrl.trim())
  ) {
    return true
  }
  return false
}

/**
 * Synchronize scene-level audio state (`scene.sfx` cues and stale audio flags)
 * after a shot's direction has been updated.
 */
export function syncSceneAudioDirectionForBeat(
  scene: Record<string, unknown>,
  beat: SceneBeat,
  previousScene?: Record<string, unknown>
): Record<string, unknown> {
  let nextScene: Record<string, unknown> = { ...scene }
  const cueText = distinctSfxCue(beat)
  const hasExistingSfxArray = Array.isArray(nextScene.sfx)
  const rawList = coerceSceneSfxFlatArray(nextScene.sfx)

  const existingIdx = rawList.findIndex(
    (item) =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      (item as Record<string, unknown>).sourceBeatId === beat.beatId
  )

  if (cueText) {
    const nextList = [...rawList]
    if (existingIdx >= 0) {
      const current = nextList[existingIdx] as Record<string, unknown>
      if (current.description !== cueText) {
        nextList[existingIdx] = {
          ...current,
          description: cueText,
        }
        nextScene = { ...nextScene, sfx: nextList }
      }
    } else if (hasExistingSfxArray) {
      const sfxIndex = nextList.length
      nextList.push({
        description: cueText,
        sourceBeatId: beat.beatId,
        ...(beat.lineId?.trim() ? { sourceLineId: beat.lineId.trim() } : {}),
        sfxId: mintSfxId(),
        legacyIndex: sfxIndex,
      })
      nextScene = { ...nextScene, sfx: nextList }
    }
  } else if (beat.kind === 'action' && existingIdx >= 0) {
    const actionFallback = stripInlineSfxLinesFromActionText(beat.actionDescription)
    if (actionFallback) {
      const nextList = [...rawList]
      const current = nextList[existingIdx] as Record<string, unknown>
      if (current.description !== actionFallback) {
        nextList[existingIdx] = {
          ...current,
          description: actionFallback,
        }
        nextScene = { ...nextScene, sfx: nextList }
      }
    }
  }

  if (sceneHasPersistedAudio(nextScene)) {
    nextScene = stampStaleBeatAudioOnScene(previousScene, nextScene)
  }

  return nextScene
}
