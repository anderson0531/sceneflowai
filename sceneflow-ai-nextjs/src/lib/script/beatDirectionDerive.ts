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
import type { BeatDirection, SceneBeat } from '@/lib/script/segmentTypes'

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

/**
 * Best-effort inference of camera framing hint for THIS beat, prefer scene
 * camera shots array position, else the beat's own shot vocab, else the
 * scene-level framing hint.
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
    const raw = shots[beatIndex] ?? shots[shots.length - 1]
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
 */
export function deriveBeatDirection(
  beat: SceneBeat,
  beatIndex: number,
  scene: Record<string, unknown>
): BeatDirection | undefined {
  const existing = beat.beatDirection ?? {}
  const sceneDirection =
    scene && typeof scene.sceneDirection === 'object' && scene.sceneDirection !== null
      ? (scene.sceneDirection as Record<string, any>)
      : undefined
  const meta = extractDirectionMetadata(sceneDirection)

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
  if (!derived.blocking) {
    const blocking = firstNonEmpty(meta.talentBlocking, beat.actionDescription)
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
    const moment = firstNonEmpty(beat.actionDescription, beat.line)
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
  derived.updatedAt = new Date().toISOString()
  return derived
}

/**
 * Ensure every beat on `scene` has a `beatDirection`. Non-destructive: if a
 * beat already has one, its fields are preserved and only gaps are filled.
 * Returns the (possibly) updated beats array.
 */
export function backfillBeatDirectionsOnScene(scene: Record<string, unknown>): SceneBeat[] {
  const beats = Array.isArray(scene.beats) ? (scene.beats as SceneBeat[]) : []
  return beats.map((beat, index) => {
    const direction = deriveBeatDirection(beat, index, scene)
    return direction ? { ...beat, beatDirection: direction } : beat
  })
}
