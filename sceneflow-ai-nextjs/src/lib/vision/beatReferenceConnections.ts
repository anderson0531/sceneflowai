/**
 * Connecting a library object to a beat locks the image and names the object
 * in direction and in any still/clip prompt overrides.
 */

import { normalizeObjectName } from '@/lib/vision/objectBeatUsage'
import { getSceneBeats } from '@/lib/script/beatMigration'
import { propHeadNoun, propSignificantWords } from '@/lib/script/propNameMatch'
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

/** Picture labels that name one physical object even when the noun differs. */
const PICTURE_NOUNS = ['photo', 'photograph', 'picture', 'portrait', 'snapshot']

function isPictureNoun(word: string): boolean {
  const stem = word.toLowerCase()
  return PICTURE_NOUNS.some((noun) => stem === noun || stem.startsWith(noun))
}

function namesSameObject(left: string, right: string): boolean {
  if (propNamesMatch(left, right)) return false
  const leftHead = propHeadNoun(left)
  const rightHead = propHeadNoun(right)
  if (leftHead && rightHead && leftHead === rightHead) return true
  const leftPicture =
    isPictureNoun(leftHead) || propSignificantWords(left).some(isPictureNoun)
  const rightPicture =
    isPictureNoun(rightHead) || propSignificantWords(right).some(isPictureNoun)
  return leftPicture && rightPicture
}

function replacePropPhrase(
  text: string | undefined,
  from: string,
  to: string
): string | undefined {
  if (!text?.trim() || !from.trim()) return text
  const escaped = from.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\b${escaped}\\b`, 'gi')
  if (!pattern.test(text)) return text
  return text.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), to)
}

/**
 * Point staged prose at a connected library object.
 *
 * A beat often describes the same thing under a generic label ("Sepia
 * photograph") while the library row the user connected is "Framed Photo of
 * Sarah". Generation only attaches the image the action text names, so the
 * generic phrase has to become the library name before the still is rebuilt.
 * Unrelated props, such as a workbench beside the photograph, stay as written.
 */
export function alignDirectionToConnectedObjects(
  direction: BeatDirection | undefined,
  connectedNames: string[]
): BeatDirection | undefined {
  if (!direction) return direction
  const names = connectedNames.map((name) => name.trim()).filter(Boolean)
  if (names.length === 0) return direction

  const connectedKeys = new Set(names.map((name) => normalizeObjectName(name)))
  const keyProps = [...(direction.keyProps ?? [])]
  let frozenMoment = direction.frozenMoment
  let blocking = direction.blocking
  let propInteraction = direction.propInteraction
  const dropped = new Set<string>()

  for (const libraryName of names) {
    const aliases = keyProps.filter(
      (prop) =>
        !connectedKeys.has(normalizeObjectName(prop)) &&
        !dropped.has(normalizeObjectName(prop)) &&
        namesSameObject(prop, libraryName)
    )
    for (const alias of aliases) {
      frozenMoment = replacePropPhrase(frozenMoment, alias, libraryName)
      blocking = replacePropPhrase(blocking, alias, libraryName)
      propInteraction = replacePropPhrase(propInteraction, alias, libraryName)
      dropped.add(normalizeObjectName(alias))
    }
  }

  if (dropped.size === 0) return direction
  const nextProps = keyProps.filter((prop) => !dropped.has(normalizeObjectName(prop)))
  const next: BeatDirection = { ...direction }
  if (frozenMoment !== direction.frozenMoment && frozenMoment) next.frozenMoment = frozenMoment
  if (blocking !== direction.blocking && blocking) next.blocking = blocking
  if (propInteraction !== direction.propInteraction && propInteraction) {
    next.propInteraction = propInteraction
  }
  if (nextProps.length > 0) next.keyProps = nextProps
  else delete next.keyProps
  return next
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
