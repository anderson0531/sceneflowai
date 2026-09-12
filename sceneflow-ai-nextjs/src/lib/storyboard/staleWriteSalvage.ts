/**
 * Recover generated media from a script write the timestamp guard rejected.
 *
 * The guard protects the newer script in the database from being reverted by a
 * client holding an older snapshot, and it does that by discarding the whole
 * payload. That is right for text — the stale side's prose, prompts and
 * direction are by definition behind — but wrong for media. A frame or an audio
 * clip in the rejected payload exists because the client actually rendered it,
 * and dropping it costs the user the credits they already spent with no way to
 * tell which asset went missing.
 *
 * So the newer script stays authoritative and this only fills slots it left
 * empty: a media URL is adopted from the rejected payload when the newer side
 * has none for that field.
 *
 * Deliberately scalar-only. Positional arrays (`sfxAudio`) and per-language maps
 * (`dialogueAudio`, `narrationAudio`) would mean inserting entries the newer
 * script does not list, and an entry re-added under an id or index the newer
 * script has since reused is a worse outcome than a lost clip. Those keep the
 * newer script's values untouched.
 */

import { isValidStoryboardMediaUrl } from './mergeSceneMedia'

const SCENE_MEDIA_KEYS = [
  'imageUrl',
  'imageGcsPath',
  'sceneReferenceImageUrl',
  'narrationAudioUrl',
  'descriptionAudioUrl',
  'musicUrl',
] as const

const BEAT_MEDIA_KEYS = [
  'storyboardImageUrl',
  'storyboardImageGcsPath',
  'storyboardEndImageUrl',
  'storyboardEndImageGcsPath',
] as const

const DIALOGUE_MEDIA_KEYS = ['storyboardImageUrl', 'storyboardImageGcsPath'] as const

export interface StaleWriteSalvageResult {
  /** The newer scenes, with empty media slots filled from the rejected payload. */
  scenes: unknown[]
  /** How many media fields were adopted. */
  salvaged: number
  /** Human-readable field paths, for the guard's log line. */
  fields: string[]
}

type Row = Record<string, unknown>

function asRow(value: unknown): Row | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : undefined
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((entry): entry is Row => !!asRow(entry)) : []
}

function sceneKey(scene: Row): string | undefined {
  const id = scene.id ?? scene.sceneId
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

function stringKey(row: Row, field: string): string | undefined {
  const value = row[field]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Copy media URLs from `stale` into a clone of `newer` for keys `newer` lacks.
 * Returns the original `newer` reference when nothing was adopted, so callers
 * can tell an untouched row by identity.
 */
function fillEmptyMediaSlots(
  newer: Row,
  stale: Row | undefined,
  keys: readonly string[],
  path: string,
  fields: string[]
): Row {
  if (!stale) return newer

  let filled: Row | undefined
  for (const key of keys) {
    if (isValidStoryboardMediaUrl(newer[key])) continue
    const recovered = stale[key]
    if (!isValidStoryboardMediaUrl(recovered)) continue
    filled = filled ?? { ...newer }
    filled[key] = recovered.trim()
    fields.push(`${path}.${key}`)
  }
  return filled ?? newer
}

function indexRowsBy(rows: Row[], field: string): Map<string, Row> {
  const byKey = new Map<string, Row>()
  rows.forEach((row) => {
    const key = stringKey(row, field)
    if (key && !byKey.has(key)) byKey.set(key, row)
  })
  return byKey
}

/**
 * Match a row to its counterpart by identity, falling back to position only
 * when neither side carries an id — a positional match between two rows that
 * both have ids and disagree is a different row, not the same one.
 */
function matchRow(
  row: Row,
  idField: string,
  byId: Map<string, Row>,
  rows: Row[],
  index: number
): Row | undefined {
  const id = stringKey(row, idField)
  if (id) return byId.get(id)
  const atIndex = rows[index]
  return atIndex && !stringKey(atIndex, idField) ? atIndex : undefined
}

function salvageScene(newerScene: Row, staleScene: Row, sceneLabel: string, fields: string[]): Row {
  let result = fillEmptyMediaSlots(
    newerScene,
    staleScene,
    SCENE_MEDIA_KEYS,
    sceneLabel,
    fields
  )

  const newerBeats = asRows(newerScene.beats)
  if (newerBeats.length > 0) {
    const staleBeats = asRows(staleScene.beats)
    const staleBeatsById = indexRowsBy(staleBeats, 'beatId')
    let beatsChanged = false
    const mergedBeats = newerBeats.map((beat, index) => {
      const stale = matchRow(beat, 'beatId', staleBeatsById, staleBeats, index)
      const label = `${sceneLabel}.beat[${stringKey(beat, 'beatId') ?? index}]`
      const merged = fillEmptyMediaSlots(beat, stale, BEAT_MEDIA_KEYS, label, fields)
      if (merged !== beat) beatsChanged = true
      return merged
    })
    if (beatsChanged) result = { ...result, beats: mergedBeats }
  }

  const newerDialogue = asRows(newerScene.dialogue)
  if (newerDialogue.length > 0) {
    const staleDialogue = asRows(staleScene.dialogue)
    const staleDialogueById = indexRowsBy(staleDialogue, 'lineId')
    let dialogueChanged = false
    const mergedDialogue = newerDialogue.map((line, index) => {
      const stale = matchRow(line, 'lineId', staleDialogueById, staleDialogue, index)
      const label = `${sceneLabel}.dialogue[${stringKey(line, 'lineId') ?? index}]`
      const merged = fillEmptyMediaSlots(line, stale, DIALOGUE_MEDIA_KEYS, label, fields)
      if (merged !== line) dialogueChanged = true
      return merged
    })
    if (dialogueChanged) result = { ...result, dialogue: mergedDialogue }
  }

  return result
}

/**
 * Fill media slots the newer scenes left empty from the rejected payload.
 *
 * Iterates the newer scenes only: a scene present in the rejected payload but
 * gone from the database was deleted, and resurrecting it is exactly the revert
 * the guard exists to prevent.
 */
export function salvageStaleWriteMedia(
  newerScenes: unknown,
  staleScenes: unknown
): StaleWriteSalvageResult {
  const newer = Array.isArray(newerScenes) ? newerScenes : []
  const stale = Array.isArray(staleScenes) ? staleScenes : []
  if (newer.length === 0 || stale.length === 0) {
    return { scenes: newer, salvaged: 0, fields: [] }
  }

  const staleRows = stale.map((scene) => asRow(scene))
  const staleById = new Map<string, Row>()
  staleRows.forEach((scene) => {
    if (!scene) return
    const key = sceneKey(scene)
    if (key && !staleById.has(key)) staleById.set(key, scene)
  })

  const fields: string[] = []
  let changed = false

  const scenes = newer.map((rawScene, index) => {
    const newerScene = asRow(rawScene)
    if (!newerScene) return rawScene

    const key = sceneKey(newerScene)
    const staleScene = key
      ? staleById.get(key)
      : staleRows[index] && !sceneKey(staleRows[index]!)
        ? staleRows[index]
        : undefined
    if (!staleScene) return rawScene

    const label = `scene[${key ?? index}]`
    const merged = salvageScene(newerScene, staleScene, label, fields)
    if (merged !== newerScene) changed = true
    return merged
  })

  return {
    scenes: changed ? scenes : newer,
    salvaged: fields.length,
    fields,
  }
}
