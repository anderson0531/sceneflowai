/**
 * Connecting a library object to a beat locks the image and names the object
 * in direction and in any still/clip prompt overrides.
 */

import { normalizeObjectName } from '@/lib/vision/objectBeatUsage'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { BeatDirection, BeatReferenceSelection, SceneBeat } from '@/lib/script/segmentTypes'

export function objectReferenceClause(name: string): string {
  return `Feature ${name.trim()}, matching the object reference.`
}

export function promptMentionsObject(prompt: string, name: string): boolean {
  const needle = normalizeObjectName(name)
  if (!needle) return false
  return normalizeObjectName(prompt).includes(needle)
}

/** Append the object clause only when this text is a non-empty override that omits the name. */
export function withObjectReferenceClause(
  prompt: string | undefined,
  name: string
): string | undefined {
  const text = prompt?.trim()
  if (!text) return prompt
  if (promptMentionsObject(text, name)) return prompt
  const clause = objectReferenceClause(name)
  return `${text.replace(/[.\s]+$/, '')}. ${clause}`
}

/** Remove only the clause this module appends. Other mentions of the name stay. */
export function withoutObjectReferenceClause(
  prompt: string | undefined,
  name: string
): string | undefined {
  if (!prompt) return prompt
  const clause = objectReferenceClause(name)
  const escaped = clause.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const next = prompt
    .replace(new RegExp(`\\s*${escaped}`, 'g'), '')
    .replace(/\s+\./g, '.')
    .replace(/\.\s*\./g, '.')
    .trim()
  return next || undefined
}

function propNamesMatch(left: string, right: string): boolean {
  const key = normalizeObjectName(right)
  return !!key && normalizeObjectName(left) === key
}

function withKeyProp(keyProps: string[] | undefined, name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return keyProps ?? []
  if ((keyProps ?? []).some((prop) => propNamesMatch(prop, trimmed))) return keyProps ?? []
  return [...(keyProps ?? []), trimmed]
}

function withoutKeyProp(keyProps: string[] | undefined, name: string): string[] | undefined {
  const next = (keyProps ?? []).filter((prop) => !propNamesMatch(prop, name))
  return next.length > 0 ? next : undefined
}

function directionWithPromptFields(
  direction: BeatDirection | undefined,
  framePrompt: string | undefined,
  videoPrompt: string | undefined,
  keyProps: string[] | undefined
): BeatDirection {
  const next: BeatDirection = { ...(direction ?? {}) }
  if (keyProps && keyProps.length > 0) next.keyProps = keyProps
  else delete next.keyProps
  if (framePrompt?.trim()) next.framePrompt = framePrompt.trim()
  else delete next.framePrompt
  if (videoPrompt?.trim()) next.videoPrompt = videoPrompt.trim()
  else delete next.videoPrompt
  return next
}

export interface ObjectConnectionInput {
  direction?: BeatDirection
  selection: BeatReferenceSelection
  objectId: string
  objectName: string
  resolvedAt: string
}

export interface ObjectConnectionResult {
  direction: BeatDirection
  selection: BeatReferenceSelection
}

export function connectObjectReference(input: ObjectConnectionInput): ObjectConnectionResult {
  const name = input.objectName.trim()
  const direction = directionWithPromptFields(
    input.direction,
    withObjectReferenceClause(input.direction?.framePrompt, name),
    withObjectReferenceClause(input.direction?.videoPrompt, name),
    withKeyProp(input.direction?.keyProps, name)
  )
  return {
    direction,
    selection: {
      ...input.selection,
      objectRefIds: [...new Set([...input.selection.objectRefIds, input.objectId])],
      source: 'user',
      resolvedAt: input.resolvedAt,
    },
  }
}

export function disconnectObjectReference(input: ObjectConnectionInput): ObjectConnectionResult {
  const name = input.objectName.trim()
  const direction = directionWithPromptFields(
    input.direction,
    withoutObjectReferenceClause(input.direction?.framePrompt, name),
    withoutObjectReferenceClause(input.direction?.videoPrompt, name),
    withoutKeyProp(input.direction?.keyProps, name)
  )
  return {
    direction,
    selection: {
      ...input.selection,
      objectRefIds: input.selection.objectRefIds.filter((id) => id !== input.objectId),
      source: 'user',
      resolvedAt: input.resolvedAt,
    },
  }
}

export function connectLocationReference(
  selection: BeatReferenceSelection,
  locationRefId: string | null,
  locationVersionId: string | null,
  resolvedAt: string
): BeatReferenceSelection {
  return {
    ...selection,
    locationRefId,
    locationVersionId,
    source: 'user',
    resolvedAt,
  }
}

export interface MentionedBeat {
  sceneIndex: number
  sceneNumber: number
  beatId: string
  beatIndex: number
  label: string
  connected: boolean
}

function beatLabel(beat: SceneBeat, beatIndex: number): string {
  const prose = (beat.line || beat.actionDescription || beat.beatDirection?.frozenMoment || '')
    .trim()
    .replace(/\s+/g, ' ')
  const excerpt = prose.length > 72 ? `${prose.slice(0, 69)}…` : prose
  const kind = beat.kind || 'beat'
  return excerpt ? `Beat ${beatIndex + 1} · ${kind} — ${excerpt}` : `Beat ${beatIndex + 1} · ${kind}`
}

/** Beats whose key props, action, or line already name this object. */
export function findBeatsMentioningObject(
  scenes: Array<Record<string, unknown>>,
  objectId: string,
  objectName: string,
  excludeBeatId?: string
): MentionedBeat[] {
  const needle = normalizeObjectName(objectName)
  if (!needle) return []
  const matches: MentionedBeat[] = []
  scenes.forEach((scene, sceneIndex) => {
    const sceneNumber =
      (typeof scene.scene_number === 'number' ? scene.scene_number : undefined) ??
      (typeof scene.sceneNumber === 'number' ? scene.sceneNumber : undefined) ??
      sceneIndex + 1
    const beats = getSceneBeats(scene)
    beats.forEach((beat, beatIndex) => {
      if (!beat?.beatId || beat.beatId === excludeBeatId) return
      const keyProps = beat.beatDirection?.keyProps ?? []
      const namedInProps = keyProps.some((prop) => propNamesMatch(prop, objectName))
      const prose = `${beat.actionDescription ?? ''} ${beat.line ?? ''}`
      if (!namedInProps && !promptMentionsObject(prose, objectName)) return
      const ids = beat.referenceSelection?.objectRefIds ?? []
      matches.push({
        sceneIndex,
        sceneNumber,
        beatId: beat.beatId,
        beatIndex,
        label: beatLabel(beat, beatIndex),
        connected: ids.includes(objectId),
      })
    })
  })
  return matches
}
