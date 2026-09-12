/**
 * Describe what a rejected stale script write would have changed.
 *
 * The stale-write guard logged a character count — `existingChars: 1740130,
 * incomingChars: 1739403` — which says a write was dropped but not what was in
 * it. A 700-character delta across 26 scenes could be one edited line or a
 * scene's worth of frame prompts, and there was no way to tell which from the
 * log. This names the scenes and beats that differ so the next occurrence is
 * diagnosable without reproducing it.
 */

/** Cap so one bad payload cannot produce a log line nobody will read. */
const MAX_REPORTED_SCENES = 8
const MAX_REPORTED_BEATS_PER_SCENE = 6

export type StaleWriteFieldChange =
  | 'prompt'
  | 'promptDirectionKey'
  | 'image'
  | 'direction'
  | 'content'

export interface StaleWriteBeatDiff {
  beatId: string
  changed: StaleWriteFieldChange[]
}

export interface StaleWriteSceneDiff {
  sceneIndex: number
  /** Present when the scene's own prose differs, not just its beats'. */
  sceneFieldsChanged?: string[]
  beats: StaleWriteBeatDiff[]
  beatsOmitted?: number
}

export interface StaleWriteDiff {
  sceneCount: number
  scenesChanged: number
  beatsChanged: number
  promptsChanged: number
  scenes: StaleWriteSceneDiff[]
  scenesOmitted?: number
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function beatsOf(scene: unknown): Array<Record<string, unknown>> {
  const beats = (scene as { beats?: unknown } | undefined)?.beats
  return Array.isArray(beats) ? (beats as Array<Record<string, unknown>>) : []
}

function beatKey(beat: Record<string, unknown>, index: number): string {
  return text(beat.beatId) || `index-${index}`
}

function diffBeat(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): StaleWriteFieldChange[] {
  const changed: StaleWriteFieldChange[] = []

  if (text(existing.storyboardImagePrompt) !== text(incoming.storyboardImagePrompt)) {
    changed.push('prompt')
  }
  if (
    text(existing.storyboardImagePromptDirectionKey) !==
    text(incoming.storyboardImagePromptDirectionKey)
  ) {
    changed.push('promptDirectionKey')
  }
  if (text(existing.storyboardImageUrl) !== text(incoming.storyboardImageUrl)) {
    changed.push('image')
  }
  if (
    JSON.stringify(existing.beatDirection ?? null) !==
    JSON.stringify(incoming.beatDirection ?? null)
  ) {
    changed.push('direction')
  }
  if (
    text(existing.actionDescription) !== text(incoming.actionDescription) ||
    text(existing.line) !== text(incoming.line)
  ) {
    changed.push('content')
  }

  return changed
}

const SCENE_PROSE_FIELDS = [
  'action',
  'visualDescription',
  'narration',
  'sceneDirection',
] as const

function diffSceneFields(existing: unknown, incoming: unknown): string[] {
  const a = (existing ?? {}) as Record<string, unknown>
  const b = (incoming ?? {}) as Record<string, unknown>
  const changed: string[] = []
  for (const field of SCENE_PROSE_FIELDS) {
    const left = typeof a[field] === 'string' ? text(a[field]) : JSON.stringify(a[field] ?? null)
    const right = typeof b[field] === 'string' ? text(b[field]) : JSON.stringify(b[field] ?? null)
    if (left !== right) changed.push(field)
  }
  if (JSON.stringify(a.dialogue ?? null) !== JSON.stringify(b.dialogue ?? null)) {
    changed.push('dialogue')
  }
  return changed
}

export function describeStaleScriptWrite(
  existingScenes: unknown,
  incomingScenes: unknown
): StaleWriteDiff {
  const existing = Array.isArray(existingScenes) ? existingScenes : []
  const incoming = Array.isArray(incomingScenes) ? incomingScenes : []
  const sceneCount = Math.max(existing.length, incoming.length)

  const scenes: StaleWriteSceneDiff[] = []
  let scenesChanged = 0
  let beatsChanged = 0
  let promptsChanged = 0
  let scenesOmitted = 0

  for (let index = 0; index < sceneCount; index++) {
    const existingScene = existing[index]
    const incomingScene = incoming[index]

    const sceneFieldsChanged = diffSceneFields(existingScene, incomingScene)

    // Beats are matched by id, not position: a reorder is not a rewrite, and
    // pairing by index would report every beat after the move as changed.
    const existingBeats = new Map(
      beatsOf(existingScene).map((beat, i) => [beatKey(beat, i), beat])
    )
    const beatDiffs: StaleWriteBeatDiff[] = []
    beatsOf(incomingScene).forEach((incomingBeat, i) => {
      const key = beatKey(incomingBeat, i)
      const existingBeat = existingBeats.get(key)
      if (!existingBeat) {
        beatDiffs.push({ beatId: key, changed: ['content'] })
        return
      }
      const changed = diffBeat(existingBeat, incomingBeat)
      if (changed.length > 0) beatDiffs.push({ beatId: key, changed })
    })

    if (sceneFieldsChanged.length === 0 && beatDiffs.length === 0) continue

    scenesChanged++
    beatsChanged += beatDiffs.length
    promptsChanged += beatDiffs.filter((beat) => beat.changed.includes('prompt')).length

    if (scenes.length >= MAX_REPORTED_SCENES) {
      scenesOmitted++
      continue
    }

    const reportedBeats = beatDiffs.slice(0, MAX_REPORTED_BEATS_PER_SCENE)
    scenes.push({
      sceneIndex: index,
      ...(sceneFieldsChanged.length > 0 ? { sceneFieldsChanged } : {}),
      beats: reportedBeats,
      ...(beatDiffs.length > reportedBeats.length
        ? { beatsOmitted: beatDiffs.length - reportedBeats.length }
        : {}),
    })
  }

  return {
    sceneCount,
    scenesChanged,
    beatsChanged,
    promptsChanged,
    scenes,
    ...(scenesOmitted > 0 ? { scenesOmitted } : {}),
  }
}
