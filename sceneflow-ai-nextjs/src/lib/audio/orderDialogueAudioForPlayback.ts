/**
 * Order dialogue audio for Production Studio Play Audio.
 *
 * Screening Room sequences by scene.beats[] / sequenceIndex. Studio Play Audio
 * previously sorted by URL timestamp (generation time), so regenerated early
 * lines played late. This helper matches beat order when beats exist, otherwise
 * sorts by dialogueIndex.
 */

import { getSceneBeats } from '@/lib/script/beatMigration'
import { resolveDialogueLineAudio } from '@/lib/storyboard/types'

export type DialogueAudioPlaybackEntry = Record<string, unknown> & {
  audioUrl?: string
  url?: string
  startTime?: number
  duration?: number
  dialogueIndex?: number
  lineId?: string
  character?: string
  kind?: string
}

function entryUrl(entry: DialogueAudioPlaybackEntry | null | undefined): string | undefined {
  if (!entry) return undefined
  const url =
    (typeof entry.audioUrl === 'string' && entry.audioUrl.trim()) ||
    (typeof entry.url === 'string' && entry.url.trim()) ||
    undefined
  return url || undefined
}

function dialogueIndexOf(entry: DialogueAudioPlaybackEntry, arrayIndex: number): number {
  return typeof entry.dialogueIndex === 'number' && Number.isFinite(entry.dialogueIndex)
    ? entry.dialogueIndex
    : arrayIndex
}

/** Stable ascending dialogueIndex sort (array index as tie-break). */
export function sortDialogueAudioByDialogueIndex(
  dialogueArray: DialogueAudioPlaybackEntry[]
): DialogueAudioPlaybackEntry[] {
  return dialogueArray
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const dA = dialogueIndexOf(a.entry, a.index)
      const dB = dialogueIndexOf(b.entry, b.index)
      if (dA !== dB) return dA - dB
      return a.index - b.index
    })
    .map(({ entry }) => entry)
}

function findEntryForBeat(
  dialogueArray: DialogueAudioPlaybackEntry[],
  opts: { lineId?: string; dialogueIndex?: number }
): DialogueAudioPlaybackEntry | undefined {
  const withUrl = (predicate: (entry: DialogueAudioPlaybackEntry) => boolean) => {
    for (let i = dialogueArray.length - 1; i >= 0; i--) {
      const entry = dialogueArray[i]
      if (!entry || !predicate(entry)) continue
      if (entryUrl(entry)) return entry
    }
    return undefined
  }

  if (opts.lineId?.trim()) {
    const byLineId = withUrl((entry) => entry.lineId === opts.lineId)
    if (byLineId) return byLineId
  }
  if (typeof opts.dialogueIndex === 'number') {
    const byIndex = withUrl((entry) => entry.dialogueIndex === opts.dialogueIndex)
    if (byIndex) return byIndex
  }
  return undefined
}

function resolveBeatScriptDialogueIndex(
  scene: Record<string, unknown>,
  beat: ReturnType<typeof getSceneBeats>[number],
  spokenCursor: number
): number | undefined {
  const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue : []

  if (beat.lineId?.trim()) {
    const idx = dialogue.findIndex(
      (entry) => (entry as Record<string, unknown>)?.lineId === beat.lineId
    )
    if (idx >= 0) return idx
  }

  if (!beat.lineId?.trim() && spokenCursor >= 0 && spokenCursor < dialogue.length) {
    return spokenCursor
  }

  return undefined
}

/**
 * Return dialogueAudio entries in playback order (beat 1, 2, 3…).
 * Entries without a URL are omitted. Unmatched leftover entries (no beat) are
 * appended in dialogueIndex order so audio is not silently dropped.
 */
export function orderDialogueAudioForPlayback(
  scene: Record<string, unknown>,
  _language: string,
  dialogueArray: DialogueAudioPlaybackEntry[]
): DialogueAudioPlaybackEntry[] {
  const entries = (dialogueArray || []).filter(Boolean) as DialogueAudioPlaybackEntry[]
  if (entries.length === 0) return []

  const beats = getSceneBeats(scene)
  const spokenBeats = beats.filter((beat) => beat.kind === 'dialogue' || beat.kind === 'narration')

  if (spokenBeats.length === 0) {
    return sortDialogueAudioByDialogueIndex(entries).filter((entry) => entryUrl(entry))
  }

  const ordered: DialogueAudioPlaybackEntry[] = []
  const used = new Set<DialogueAudioPlaybackEntry>()
  let spokenCursor = 0

  for (const beat of spokenBeats) {
    const dialogueIndex = resolveBeatScriptDialogueIndex(scene, beat, spokenCursor)
    spokenCursor += 1

    let entry = findEntryForBeat(entries, {
      lineId: beat.lineId,
      dialogueIndex,
    })

    if (!entry && typeof dialogueIndex === 'number') {
      const resolved = resolveDialogueLineAudio(scene, dialogueIndex, _language)
      if (resolved.entry && entryUrl(resolved.entry as DialogueAudioPlaybackEntry)) {
        entry = resolved.entry as DialogueAudioPlaybackEntry
      } else if (resolved.url) {
        entry = {
          audioUrl: resolved.url,
          duration: resolved.duration,
          dialogueIndex,
          lineId: beat.lineId,
          character: beat.character,
        }
      }
    }

    if (!entry && beat.audioUrl?.trim()) {
      entry = {
        audioUrl: beat.audioUrl.trim(),
        dialogueIndex,
        lineId: beat.lineId,
        character: beat.character,
      }
    }

    if (!entry || !entryUrl(entry) || used.has(entry)) continue
    used.add(entry)
    ordered.push(entry)
  }

  const leftovers = sortDialogueAudioByDialogueIndex(
    entries.filter((entry) => !used.has(entry) && entryUrl(entry))
  )
  return [...ordered, ...leftovers]
}
