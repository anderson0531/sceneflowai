/**
 * Assign / re-link a cast character (or Narrator) to a spoken beat + dialogue line.
 * Dual-writes beats[] and dialogue[] via applyBeatsToScene and clears stale line audio.
 */

import { applyBeatsToScene, getSceneBeats } from '@/lib/script/beatMigration'
import {
  NARRATOR_CHARACTER,
  NARRATOR_CHARACTER_ID,
} from '@/lib/script/segmentTypes'

export type AssignableSpeaker =
  | { kind: 'narrator' }
  | { kind: 'character'; id: string; name: string }

export type AssignDialogueSpeakerOptions = {
  /** Prefer beat identity when present. */
  beatId?: string | null
  /** Dialogue array index for the spoken line. */
  dialogueIndex: number
  /** lineId when available (more stable than index). */
  lineId?: string | null
  speaker: AssignableSpeaker
}

function clearDialogueAudioForLine(
  scene: Record<string, unknown>,
  options: { dialogueIndex: number; lineId?: string | null }
): Record<string, unknown> {
  const dialogueAudio = scene.dialogueAudio
  if (!dialogueAudio) return scene

  const shouldClear = (entry: any): boolean => {
    if (!entry || typeof entry !== 'object') return false
    if (options.lineId && entry.lineId === options.lineId) return true
    if (typeof entry.dialogueIndex === 'number' && entry.dialogueIndex === options.dialogueIndex) {
      return true
    }
    return false
  }

  if (Array.isArray(dialogueAudio)) {
    return {
      ...scene,
      dialogueAudio: dialogueAudio.map((entry) =>
        shouldClear(entry) ? { ...entry, audioUrl: undefined, url: undefined } : entry
      ),
    }
  }

  if (typeof dialogueAudio === 'object') {
    const next: Record<string, unknown[]> = {}
    for (const [lang, entries] of Object.entries(dialogueAudio as Record<string, unknown>)) {
      if (!Array.isArray(entries)) {
        next[lang] = entries as unknown as unknown[]
        continue
      }
      next[lang] = entries.map((entry) =>
        shouldClear(entry) ? { ...(entry as object), audioUrl: undefined, url: undefined } : entry
      ) as unknown[]
    }
    return { ...scene, dialogueAudio: next }
  }

  return scene
}

export function resolveSpeakerFields(speaker: AssignableSpeaker): {
  character: string
  characterId: string
  kind: 'narration' | 'dialogue'
} {
  if (speaker.kind === 'narrator') {
    return {
      character: NARRATOR_CHARACTER,
      characterId: NARRATOR_CHARACTER_ID,
      kind: 'narration',
    }
  }
  return {
    character: speaker.name,
    characterId: speaker.id,
    kind: 'dialogue',
  }
}

/**
 * Assign a speaker to one spoken line in a scene.
 * Updates matching beat + dialogue entry, then clears that line's audio URLs.
 */
export function assignDialogueSpeakerToScene(
  scene: Record<string, unknown>,
  options: AssignDialogueSpeakerOptions
): Record<string, unknown> {
  const { beatId, dialogueIndex, lineId, speaker } = options
  const fields = resolveSpeakerFields(speaker)
  const beats = getSceneBeats(scene)

  let spokenCursor = 0
  const nextBeats = beats.map((beat) => {
    if (beat.kind !== 'dialogue' && beat.kind !== 'narration') return beat
    const thisSpokenIndex = spokenCursor
    spokenCursor += 1

    const byBeatId = Boolean(beatId && beat.beatId === beatId)
    const byLineId = Boolean(lineId && beat.lineId === lineId)
    const bySpokenIndex = !beatId && !lineId && thisSpokenIndex === dialogueIndex

    if (!byBeatId && !byLineId && !bySpokenIndex) return beat

    return {
      ...beat,
      character: fields.character,
      characterId: fields.characterId,
      kind: fields.kind,
    }
  })

  let nextScene: Record<string, unknown>
  if (beats.length > 0) {
    nextScene = applyBeatsToScene(scene, nextBeats)
    if (Array.isArray(nextScene.dialogue)) {
      const dialogue = [...(nextScene.dialogue as Array<Record<string, unknown>>)]
      const targetIdx = dialogue.findIndex((d, idx) => {
        if (lineId && d.lineId === lineId) return true
        return idx === dialogueIndex
      })
      if (targetIdx >= 0) {
        dialogue[targetIdx] = {
          ...dialogue[targetIdx],
          character: fields.character,
          characterId: fields.characterId,
          kind: fields.kind,
        }
        nextScene = { ...nextScene, dialogue }
      }
    }
  } else {
    const dialogue = Array.isArray(scene.dialogue)
      ? [...(scene.dialogue as Array<Record<string, unknown>>)]
      : []
    if (dialogue[dialogueIndex]) {
      dialogue[dialogueIndex] = {
        ...dialogue[dialogueIndex],
        character: fields.character,
        characterId: fields.characterId,
        kind: fields.kind,
      }
    }
    nextScene = { ...scene, dialogue }
  }

  return clearDialogueAudioForLine(nextScene, { dialogueIndex, lineId })
}
