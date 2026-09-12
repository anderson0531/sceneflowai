/**
 * Derive `BeatDirection` for a beat when the LLM did not emit one.
 *
 * Strategy: pull structured signals that already exist (scene direction, beat
 * text, performance cues) and shape them into a `BeatDirection` so downstream
 * prompt builders can rely on the field being present. Marks the result
 * `generatedBy: 'derived'` so LLM-authored records take precedence.
 */

import { extractDirectionMetadata } from '@/lib/intelligence/scene-direction-metadata'
import {
  parsePerformanceCue,
  resolveBeatDirectedEmotion,
} from '@/lib/scene/performanceCues'
import { getSceneMovements, resolveBeatMovement } from '@/lib/script/sceneMovements'
import type { BeatDirection, SceneBeat, SceneMovement } from '@/lib/script/segmentTypes'

function firstNonEmpty(...values: (string | undefined | null)[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed) return trimmed
    }
  }
  return undefined
}

const PROP_MATCH_STOP_WORDS = new Set([
  'that',
  'this',
  'their',
  'with',
  'from',
  'into',
  'onto',
  'inch',
  'inches',
  'foot',
  'feet',
])

/** Distinctive words of a prop label, used to require more than one hit. */
function propMatchWords(propName: string): string[] {
  return propName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !PROP_MATCH_STOP_WORDS.has(word))
}

function collectKeyPropsForBeat(
  beat: SceneBeat,
  scenePropCatalog: string[]
): string[] | undefined {
  if (!scenePropCatalog.length) return undefined
  const text = [
    beat.actionDescription ?? '',
    beat.line ?? '',
    beat.character ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (!text.trim()) return undefined
  const seen = new Set<string>()
  const out: string[] = []
  for (const prop of scenePropCatalog) {
    const trimmed = prop?.trim()
    if (!trimmed) continue
    const propLower = trimmed.toLowerCase()
    if (seen.has(propLower)) continue
    if (text.includes(propLower)) {
      seen.add(propLower)
      out.push(trimmed)
      continue
    }
    // A prop's first word alone is a coincidence, not a reference: "violet"
    // matches every beat mentioning the colour, and a derived key prop is
    // persisted as this beat's directed prop list.
    const words = propMatchWords(propLower)
    if (words.length === 0) continue
    const hits = words.filter((word) => text.includes(word)).length
    if (hits >= 2 || (words.length === 1 && hits === 1)) {
      seen.add(propLower)
      out.push(trimmed)
    }
  }
  return out.length > 0 ? out : undefined
}

function sceneCharacterNames(scene: Record<string, unknown>): string[] {
  const raw = Array.isArray(scene?.characters) ? scene.characters : []
  const names: string[] = []
  for (const entry of raw) {
    const name =
      typeof entry === 'string'
        ? entry
        : typeof (entry as { name?: unknown })?.name === 'string'
          ? ((entry as { name: string }).name)
          : ''
    const trimmed = name.trim()
    if (trimmed && !/^narrator$/i.test(trimmed)) names.push(trimmed)
  }
  return names
}

/**
 * Cast this beat names outright, or undefined when it names nobody.
 *
 * Never returns an empty list. An empty `castInFrame` asserts that the frame
 * has no people in it, and a beat that says "she reaches for the lever" names
 * nobody while plainly having someone in it. Only the LLM contract and the
 * editor, which can see the whole beat, are trusted to assert nobody; a
 * backfill that guessed it would erase cast from every pronoun-only beat.
 */
function collectCastInFrameForBeat(
  beat: SceneBeat,
  scene: Record<string, unknown>
): string[] | undefined {
  const names = sceneCharacterNames(scene)
  if (names.length === 0) return undefined

  if (beat.kind === 'dialogue') {
    const speaker = beat.character?.trim()
    const match = speaker
      ? names.find((name) => name.toLowerCase() === speaker.toLowerCase())
      : undefined
    if (match) return [match]
  }

  const text = [beat.actionDescription ?? '', beat.line ?? '', beat.beatDirection?.blocking ?? '']
    .join(' ')
    .toLowerCase()
  if (!text.trim()) return undefined

  const found = names.filter((name) => text.includes(name.toLowerCase()))
  return found.length > 0 ? found : undefined
}

/**
 * Best-effort inference of camera framing hint for THIS beat, prefer scene
 * camera shots array position, else the beat's own shot vocab, else the
 * scene-level framing hint.
 *
 * When the scene lists fewer shots than it has beats, the overflow beats cycle
 * through the list rather than all inheriting the final shot — a scene that
 * ends on fifteen identical "Close-Up" frames is the shape that made long
 * scenes read as one repeated image.
 */
function inferShotType(
  beat: SceneBeat,
  beatIndex: number,
  sceneDirection: Record<string, any> | undefined,
  fallbackFraming?: string
): string | undefined {
  const shots =
    Array.isArray(sceneDirection?.camera?.shots) && sceneDirection?.camera?.shots.length > 0
      ? (sceneDirection.camera.shots as string[])
      : []
  if (shots.length > 0) {
    const raw = shots[beatIndex] ?? shots[beatIndex % shots.length]
    const trimmed = raw?.trim()
    if (trimmed) return trimmed
  }
  const beatText = (beat.actionDescription ?? beat.line ?? '').toLowerCase()
  if (beatText) {
    if (/extreme close-?up|extreme close/.test(beatText)) return 'Extreme Close-Up'
    if (/insert(?:\s+shot)?/.test(beatText)) return 'Insert Shot'
    if (/over[-\s]?the[-\s]?shoulder|ots/.test(beatText)) return 'Over-the-Shoulder'
    if (/two[-\s]?shot/.test(beatText)) return 'Two-Shot'
    if (/close[-\s]?up|mcu|medium close/.test(beatText)) return 'Medium Close-Up'
    if (/wide|establishing/.test(beatText)) return 'Wide Shot'
    if (/medium/.test(beatText)) return 'Medium Shot'
  }
  return fallbackFraming ? capitalizeShot(fallbackFraming) : undefined
}

function capitalizeShot(input: string): string {
  return input
    .split(/[\s-]+/)
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''
    )
    .join(' ')
    .replace(/Ots/g, 'OTS')
}

function inferGaze(beat: SceneBeat): string | undefined {
  if (beat.kind === 'dialogue' || beat.kind === 'narration') {
    const parsed = parsePerformanceCue(beat.line ?? '')
    if (parsed.addressee) {
      if (/self|herself|himself|themselves|myself/i.test(parsed.addressee)) {
        return 'introspective gaze, minimal eye contact'
      }
      return `toward ${parsed.addressee}`
    }
  }
  const text = beat.actionDescription ?? ''
  const gazeMatch = text.match(/(?:looks?|glances?|stares?|gazes?)\s+(?:at|toward|to)\s+([^,.;]+)/i)
  if (gazeMatch?.[1]) {
    return `toward ${gazeMatch[1].trim()}`
  }
  return undefined
}

/**
 * Derive a BeatDirection for `beat` from scene direction + beat text.
 * Fields present on `existing` (from the LLM or user) are preserved; only gaps
 * get filled from derived signals.
 *
 * Fills prefer signals scoped to this beat, then to the beat's movement, and
 * only then fall back to a scene-wide value. Broadcasting one scene-level
 * blocking or emotion onto every beat gave a 15-beat scene fifteen frames with
 * identical staging notes, which downstream prompt builders then rendered as
 * fifteen variations of the same image.
 */
export function deriveBeatDirection(
  beat: SceneBeat,
  beatIndex: number,
  scene: Record<string, unknown>,
  movements?: SceneMovement[]
): BeatDirection | undefined {
  const existing = beat.beatDirection ?? {}
  const sceneDirection =
    scene && typeof scene.sceneDirection === 'object' && scene.sceneDirection !== null
      ? (scene.sceneDirection as Record<string, any>)
      : undefined
  const meta = extractDirectionMetadata(sceneDirection)
  const arc = movements ?? []
  const resolvedMovement = arc.length > 0 ? resolveBeatMovement(arc, beatIndex) : undefined
  // One keyAction per movement is what the direction pass is asked for, so the
  // movement index selects this beat's action rather than the beat index.
  const movementKeyAction =
    resolvedMovement && Array.isArray(meta.talentKeyActions)
      ? meta.talentKeyActions[resolvedMovement.movement.index]
      : undefined

  const derived: BeatDirection = { ...existing }

  if (!derived.shotType) {
    const shot = inferShotType(beat, beatIndex, sceneDirection, meta.framingHint)
    if (shot) derived.shotType = shot
  }
  if (!derived.cameraAngle) {
    const angle = firstNonEmpty(sceneDirection?.camera?.angle)
    if (angle) derived.cameraAngle = angle
  }
  if (!derived.cameraMovement) {
    const movement = firstNonEmpty(sceneDirection?.camera?.movement)
    if (movement) derived.cameraMovement = movement
  }
  if (!Array.isArray(derived.castInFrame)) {
    const cast = collectCastInFrameForBeat(beat, scene)
    if (cast) derived.castInFrame = cast
  }
  if (!derived.blocking) {
    // The movement's key action is the closest thing to per-beat staging that
    // scene direction offers; the scene-wide blocking is the same sentence for
    // every beat and is only used when this beat has no movement of its own.
    const blocking = firstNonEmpty(movementKeyAction, meta.talentBlocking, beat.actionDescription)
    if (blocking) derived.blocking = blocking
  }
  if (!derived.emotion) {
    const emotion = resolveBeatDirectedEmotion({
      beatLine: beat.line,
      beatAction: beat.actionDescription,
    }) || firstNonEmpty(meta.talentEmotionalBeat)
    if (emotion) derived.emotion = emotion
  }
  if (!derived.gaze) {
    const gaze = inferGaze(beat)
    if (gaze) derived.gaze = gaze
  }
  if (!derived.keyProps || derived.keyProps.length === 0) {
    const props = collectKeyPropsForBeat(beat, meta.keyProps ?? [])
    if (props) derived.keyProps = props
  }
  if (!derived.lightingAccent) {
    const lighting = firstNonEmpty(meta.lightingMood)
    if (lighting) derived.lightingAccent = lighting
  }
  if (!derived.frozenMoment) {
    const moment = firstNonEmpty(beat.actionDescription, beat.line, movementKeyAction)
    if (moment) derived.frozenMoment = moment
  }
  if (!derived.audioCue) {
    const audio = firstNonEmpty(sceneDirection?.audio?.priorities)
    if (audio) derived.audioCue = audio
  }
  if (!derived.transition) {
    derived.transition = 'CUT'
  }

  if (Object.keys(derived).length === 0) return undefined

  const source =
    existing.generatedBy === 'llm' || existing.generatedBy === 'user'
      ? existing.generatedBy
      : 'derived'
  derived.generatedBy = source
  // A pass that filled no gaps keeps the stamp it already had. Re-stamping
  // made the project migration see a change on every run and rewrite every
  // scene it had already migrated.
  derived.updatedAt =
    existing.updatedAt && !directionFieldsChanged(existing, derived)
      ? existing.updatedAt
      : new Date().toISOString()
  return derived
}

/** Compare two directions ignoring the timestamp that records the comparison. */
function directionFieldsChanged(before: BeatDirection, after: BeatDirection): boolean {
  const { updatedAt: _beforeStamp, ...beforeFields } = before
  const { updatedAt: _afterStamp, ...afterFields } = after
  return JSON.stringify(beforeFields) !== JSON.stringify(afterFields)
}

/**
 * Ensure every beat on `scene` has a `beatDirection`. Non-destructive: if a
 * beat already has one, its fields are preserved and only gaps are filled.
 * Returns the (possibly) updated beats array.
 */
export function backfillBeatDirectionsOnScene(scene: Record<string, unknown>): SceneBeat[] {
  const beats = Array.isArray(scene.beats) ? (scene.beats as SceneBeat[]) : []
  if (beats.length === 0) return beats
  const movements = getSceneMovements(scene, beats)
  return beats.map((beat, index) => {
    const direction = deriveBeatDirection(beat, index, scene, movements)
    return direction ? { ...beat, beatDirection: direction } : beat
  })
}
