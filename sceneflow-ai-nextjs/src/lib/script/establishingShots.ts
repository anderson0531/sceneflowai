/**
 * Establishing Shot Detection & Injection
 *
 * Ensures that scenes opening in a new location, transitioning between INT and EXT,
 * or jumping significantly in time begin with an explicit Establishing Shot action
 * beat (`kind: 'action'`, `beatRole: 'establishing'`) at Beat 0 so the viewer is
 * spatially oriented before cutting to closer coverage or dialogue.
 *
 * Filmmakers can freely edit, re-direct (`Direct Shot`), exclude (`beat.excluded`),
 * or delete any establishing shot beat in the Production UI.
 */

import { isCinematicBookendScene } from '@/lib/script/cinematicBookends'
import { MAX_BEATS_PER_SCENE } from '@/lib/script/sceneDecomposition'
import type { BeatDirection, SceneBeat, SceneMovement, SceneMusicCue } from '@/lib/script/segmentTypes'

export interface ParsedSceneSlugline {
  raw: string
  intExt?: 'INT' | 'EXT' | 'INT/EXT'
  location: string
  timeOfDay?: string
}

const CONTINUOUS_TIME_TOKENS = new Set([
  'continuous',
  'moments later',
  'moment later',
  'same',
  'same time',
  'seconds later',
  'immediate',
  'immediately',
])

const ESTABLISHING_SHOT_TYPE_RE =
  /\b(establishing|extreme\s+wide|wide\s+establishing|aerial|drone|master\s+wide|wide\s+shot|wide\s+angle|environmental\s+wide)\b/i

const TIGHT_SHOT_TYPE_RE =
  /\b(extreme\s+close|close[-\s]?up|ecu|cu|mcu|medium\s+close|insert(?:\s+shot)?|over[-\s]?the[-\s]?shoulder|ots|macro)\b/i

const ESTABLISHING_PROSE_CUE_RE =
  /\b(establishing|wide\s+shot|extreme\s+wide|aerial|overhead|panorama|panoramic|skyline|exterior\s+of|interior\s+of|sprawling|vast|cavernous|horizon|architecture|corridor|landscape|street\s+below|facility|courtyard|rooftop|hangar|cathedral|warehouse|laboratory|station|plaza|cityscape)\b/i

const TIGHT_PROSE_START_RE =
  /^\s*(extreme\s+close[-\s]?up|close[-\s]?up|tight\s+on|insert\s+on|macro\s+shot\s+on)\b/i

/** Extract plain heading text from a scene's `heading` field (string or `{ text }`). */
export function extractSceneHeadingText(scene: Record<string, unknown> | null | undefined): string {
  if (!scene) return ''
  const raw = scene.heading
  if (typeof raw === 'string') return raw.trim()
  if (raw && typeof raw === 'object' && typeof (raw as { text?: unknown }).text === 'string') {
    return String((raw as { text: string }).text).trim()
  }
  return ''
}

/**
 * Normalize a location string for cross-scene comparison:
 * strips parenthetical tags like `(CONTINUOUS)` or `(PART 2)` and collapses whitespace.
 */
export function normalizeLocationKey(location: string): string {
  return location
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(part\s+\d+|cont'?d|continuous)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse a screenplay slugline (`INT. SUBTERRANEAN VAULT - NIGHT`) into
 * `{ intExt, location, timeOfDay }`.
 */
export function parseSceneSlugline(headingInput: string | undefined | null): ParsedSceneSlugline {
  const raw = (headingInput || '').trim()
  if (!raw) {
    return { raw: '', location: '' }
  }

  // Match optional leading INT./EXT./I/E prefix
  const prefixMatch = raw.match(
    /^\s*(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.?|EXT\.?)\s+([\s\S]+)$/i
  )

  let intExt: 'INT' | 'EXT' | 'INT/EXT' | undefined
  let remainder = raw

  if (prefixMatch) {
    const prefix = prefixMatch[1].toUpperCase().replace(/\s+/g, '')
    if (prefix.includes('/') || prefix.startsWith('I/E')) {
      intExt = 'INT/EXT'
    } else if (prefix.startsWith('EXT')) {
      intExt = 'EXT'
    } else {
      intExt = 'INT'
    }
    remainder = prefixMatch[2].trim()
  }

  // Split on the last ` - ` or ` — ` or ` – ` for time of day
  const dashParts = remainder.split(/\s+[-–—]\s+/)
  if (dashParts.length >= 2) {
    const timeCandidate = dashParts[dashParts.length - 1].trim()
    const locationPart = dashParts.slice(0, -1).join(' - ').trim()
    return {
      raw,
      ...(intExt ? { intExt } : {}),
      location: normalizeLocationKey(locationPart),
      ...(timeCandidate ? { timeOfDay: timeCandidate.toLowerCase().trim() } : {}),
    }
  }

  return {
    raw,
    ...(intExt ? { intExt } : {}),
    location: normalizeLocationKey(remainder),
  }
}

/**
 * Determine whether `timeB` represents a significant temporal jump from `timeA`
 * at the same location (e.g. `DAY` -> `NIGHT`, `NIGHT` -> `DAWN`, `YEARS LATER`).
 */
function isSignificantTimeJump(timeA?: string, timeB?: string): boolean {
  if (!timeA || !timeB) return false
  const normA = timeA.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const normB = timeB.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normA || !normB || normA === normB) return false
  if (CONTINUOUS_TIME_TOKENS.has(normB)) return false
  for (const token of CONTINUOUS_TIME_TOKENS) {
    if (normB.includes(token)) return false
  }
  return true
}

/**
 * True when `scene` opens in a new location, transitions INT <-> EXT, or makes
 * a non-continuous time jump compared to `prevScene` (or is the first main
 * narrative scene in the script).
 *
 * Skips cinematic bookends (`title`, `outro`) and split continuation parts
 * (`scenePartIndex > 0` produced by `splitOversizedScenes`).
 */
export function doesSceneRequireEstablishingShot(
  scene: Record<string, unknown> | null | undefined,
  prevScene?: Record<string, unknown> | null,
  sceneIndex = 0
): boolean {
  if (!scene || typeof scene !== 'object') return false
  if (isCinematicBookendScene(scene)) return false
  if (scene.cinematicType === 'promo') return false

  // Continuation splits (Scene 1B, 1C) stay inside the already-established room
  if (typeof scene.scenePartIndex === 'number' && scene.scenePartIndex > 0) {
    return false
  }

  const currentHeading = extractSceneHeadingText(scene)
  const currentParsed = parseSceneSlugline(currentHeading)

  // First main narrative scene (or immediately following a title bookend)
  if (!prevScene || isCinematicBookendScene(prevScene) || sceneIndex === 0) {
    return true
  }

  const prevHeading = extractSceneHeadingText(prevScene)
  const prevParsed = parseSceneSlugline(prevHeading)

  // If current scene has a parsed location and it differs from previous scene's location
  if (currentParsed.location && prevParsed.location) {
    if (currentParsed.location !== prevParsed.location) {
      return true
    }
    // Same location name, but moved between INTERIOR and EXTERIOR
    if (
      currentParsed.intExt &&
      prevParsed.intExt &&
      currentParsed.intExt !== prevParsed.intExt
    ) {
      return true
    }
    // Same location name, but a significant time jump (e.g. DAY -> NIGHT)
    if (isSignificantTimeJump(prevParsed.timeOfDay, currentParsed.timeOfDay)) {
      return true
    }
    return false
  }

  // Fallback when one heading couldn't be parsed: compare raw headings
  if (currentHeading && prevHeading) {
    return currentHeading.toLowerCase() !== prevHeading.toLowerCase()
  }

  return false
}

/**
 * True when `beat` is already acting as an establishing / spatial-orientation
 * action beat.
 */
export function isBeatEstablishingShot(beat: SceneBeat | null | undefined, isFirstBeat = false): boolean {
  if (!beat || beat.kind !== 'action') return false

  if (beat.beatRole === 'establishing' || beat.beatRole === 'opening') {
    return true
  }

  const shotType = beat.beatDirection?.shotType?.trim() || ''
  if (shotType && ESTABLISHING_SHOT_TYPE_RE.test(shotType)) {
    return true
  }

  const purpose = beat.beatDirection?.coveragePurpose?.trim() || ''
  if (purpose && /\b(establish|orient|geography|spatial\s+geography|new\s+location)\b/i.test(purpose)) {
    if (!shotType || !TIGHT_SHOT_TYPE_RE.test(shotType)) {
      return true
    }
  }

  const desc = [beat.actionDescription || '', beat.beatDirection?.frozenMoment || '']
    .join(' ')
    .trim()

  if (!desc) return false

  // If the beat is explicitly framed as a tight close-up or insert, it is not an establishing shot
  if (shotType && TIGHT_SHOT_TYPE_RE.test(shotType)) {
    return false
  }
  if (TIGHT_PROSE_START_RE.test(desc)) {
    return false
  }

  if (ESTABLISHING_PROSE_CUE_RE.test(desc)) {
    return true
  }

  // When Beat 0 is an action beat with no tight shotType, treat it as an opening
  // establishing beat so we tag and preserve it rather than injecting a second action beat.
  if (isFirstBeat && desc.length >= 20) {
    return true
  }

  return false
}

/**
 * Format a clean, human-readable location title from a screenplay heading.
 */
function formatLocationLabelFromHeading(heading: string): {
  locationLabel: string
  timeLabel?: string
  isExterior: boolean
} {
  const trimmed = heading.trim()
  if (!trimmed) {
    return { locationLabel: 'the new location', isExterior: false }
  }
  const isExterior = /^\s*(EXT\.?|INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?)/i.test(trimmed)
  const withoutPrefix = trimmed
    .replace(/^\s*(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.?|EXT\.?)\s+/i, '')
    .trim()

  const dashParts = withoutPrefix.split(/\s+[-–—]\s+/)
  const rawLocation = (dashParts[0] || withoutPrefix)
    .replace(/\([^)]*\)/g, '')
    .trim()
  const rawTime = dashParts.length >= 2 ? dashParts[dashParts.length - 1].trim() : undefined

  const locationLabel = rawLocation ? rawLocation : 'the setting'
  const timeLabel =
    rawTime && !CONTINUOUS_TIME_TOKENS.has(rawTime.toLowerCase()) ? rawTime.toLowerCase() : undefined

  return { locationLabel, timeLabel, isExterior }
}

/**
 * Extract the first environmental/spatial sentence from `visualDescription` or `action`
 * when available, avoiding tight close-up descriptions.
 */
function extractEnvironmentalLeadSentence(scene: Record<string, unknown>): string | undefined {
  const dir =
    scene.sceneDirection && typeof scene.sceneDirection === 'object'
      ? (scene.sceneDirection as Record<string, any>)
      : undefined

  const dirLocation = typeof dir?.scene?.location === 'string' ? dir.scene.location.trim() : ''
  const dirAtmosphere = typeof dir?.scene?.atmosphere === 'string' ? dir.scene.atmosphere.trim() : ''
  const dirLighting = typeof dir?.lighting?.overallMood === 'string' ? dir.lighting.overallMood.trim() : ''

  const visualDesc =
    typeof scene.visualDescription === 'string' ? scene.visualDescription.trim() : ''
  if (visualDesc) {
    const firstSentence = visualDesc.split(/(?<=[.!?])\s+/)[0]?.trim()
    if (firstSentence && firstSentence.length >= 20 && !TIGHT_PROSE_START_RE.test(firstSentence)) {
      return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`
    }
  }

  if (dirLocation) {
    const parts = [dirLocation]
    if (dirAtmosphere) parts.push(`with ${dirAtmosphere.toLowerCase()} atmosphere`)
    if (dirLighting) parts.push(`under ${dirLighting.toLowerCase()} lighting`)
    return `${parts.join(', ')}.`
  }

  return undefined
}

/**
 * Build a grounded, cinematic Establishing Shot (`kind: 'action'`, `beatRole: 'establishing'`)
 * for a scene that changed location without one.
 */
export function buildEstablishingActionBeatForScene(
  scene: Record<string, unknown>,
  mintId?: () => string
): SceneBeat {
  const heading = extractSceneHeadingText(scene)
  const { locationLabel, timeLabel, isExterior } = formatLocationLabelFromHeading(heading)
  const environmentalLead = extractEnvironmentalLeadSentence(scene)

  const planePrefix = isExterior ? 'Wide exterior establishing shot' : 'Wide establishing shot'
  const timePhrase = timeLabel ? ` (${timeLabel})` : ''

  const actionDescription = environmentalLead
    ? /^wide|establishing/i.test(environmentalLead)
      ? environmentalLead
      : `${planePrefix} of ${locationLabel}${timePhrase}. ${environmentalLead}`
    : `${planePrefix} of ${locationLabel}${timePhrase}, anchoring the architecture, spatial geography, lighting, and atmosphere of the environment before the scene's action unfolds.`

  const frozenMoment = environmentalLead
    ? `Wide architectural establishing frame of ${locationLabel}${timePhrase}: ${environmentalLead}`
    : `Wide architectural establishing frame of ${locationLabel}${timePhrase}, revealing the full spatial layout, depth, and atmospheric lighting of the setting.`

  const beatId = mintId
    ? mintId()
    : `bt_est_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const beatDirection: BeatDirection = {
    shotType: isExterior ? 'Extreme Wide Establishing Shot' : 'Wide Establishing Shot',
    coveragePurpose:
      'Establish the new location geography, spatial scale, and atmosphere to orient the viewer before cutting to closer coverage.',
    lensEnergy: 'Measured establishing hold with subtle camera drift',
    spatialRelationship: `Full environmental view of ${locationLabel}, establishing foreground-to-background depth and spatial layout.`,
    cameraAngle: isExterior ? 'High Wide Angle' : 'Eye-Level Wide',
    cameraMovement: 'Slow establishing drift',
    castInFrame: [],
    frozenMoment,
    transition: 'CUT',
    generatedBy: 'planner',
    updatedAt: new Date().toISOString(),
  }

  return {
    beatId,
    sequenceIndex: 0,
    kind: 'action',
    beatRole: 'establishing',
    movementIndex: 0,
    durationSeconds: 4,
    actionDescription,
    beatDirection,
  }
}

/**
 * Upgrade an existing Beat 0 action beat with `beatRole: 'establishing'` and
 * establishing camera metadata when it opens a new location.
 */
function tagExistingBeatAsEstablishing(beat: SceneBeat, scene: Record<string, unknown>): SceneBeat {
  const heading = extractSceneHeadingText(scene)
  const { locationLabel, isExterior } = formatLocationLabelFromHeading(heading)
  const existingDir = beat.beatDirection ?? {}
  const existingShot = existingDir.shotType?.trim() || ''

  const shouldUpgradeShotType =
    !existingShot ||
    (!ESTABLISHING_SHOT_TYPE_RE.test(existingShot) && !TIGHT_SHOT_TYPE_RE.test(existingShot))

  const nextDirection: BeatDirection = {
    ...existingDir,
    shotType: shouldUpgradeShotType
      ? isExterior
        ? 'Extreme Wide Establishing Shot'
        : 'Wide Establishing Shot'
      : existingShot,
    coveragePurpose:
      existingDir.coveragePurpose?.trim() ||
      `Establish the spatial geography and atmosphere of ${locationLabel} before cutting to closer coverage.`,
    generatedBy: existingDir.generatedBy ?? 'planner',
    updatedAt: existingDir.updatedAt ?? new Date().toISOString(),
  }

  return {
    ...beat,
    beatRole: beat.beatRole || 'establishing',
    beatDirection: nextDirection,
  }
}

/**
 * Shift persisted `sceneMovements` and `sceneMusicCues` beat index ranges when
 * a new Beat 0 establishing shot is prepended at index 0.
 */
function shiftMovementsAndCuesForPrependedBeat(scene: Record<string, unknown>): {
  sceneMovements?: SceneMovement[]
  sceneMusicCues?: SceneMusicCue[]
} {
  const result: { sceneMovements?: SceneMovement[]; sceneMusicCues?: SceneMusicCue[] } = {}

  if (Array.isArray(scene.sceneMovements) && scene.sceneMovements.length > 0) {
    result.sceneMovements = (scene.sceneMovements as SceneMovement[]).map((m, idx) => ({
      ...m,
      beatStart: idx === 0 ? 0 : (typeof m.beatStart === 'number' ? m.beatStart + 1 : 0),
      beatEnd: typeof m.beatEnd === 'number' ? m.beatEnd + 1 : 0,
    }))
  }

  if (Array.isArray(scene.sceneMusicCues) && scene.sceneMusicCues.length > 0) {
    result.sceneMusicCues = (scene.sceneMusicCues as SceneMusicCue[]).map((cue) => ({
      ...cue,
      beatStart: typeof cue.beatStart === 'number' && cue.beatStart > 0 ? cue.beatStart + 1 : 0,
      beatEnd: typeof cue.beatEnd === 'number' ? cue.beatEnd + 1 : 0,
    }))
  }

  return result
}

export interface EnsureSceneEstablishingResult {
  scene: Record<string, unknown>
  /** True when a new Beat 0 establishing shot was prepended. */
  injected: boolean
  /** True when an existing Beat 0 action beat was tagged with `beatRole: 'establishing'`. */
  tagged: boolean
}

/**
 * Ensure `scene` has an opening Establishing Shot beat (`beats[0]`) when it
 * introduces a new location, switches INT/EXT, or jumps in time relative to `prevScene`.
 *
 * - If Beat 0 is already an establishing/wide action beat, tags it with
 *   `beatRole: 'establishing'` and preserves all authored content.
 * - If Beat 0 starts directly on dialogue/narration or a tight close-up/insert,
 *   prepends a grounded Establishing Shot action beat at `beats[0]`.
 */
export function ensureSceneHasEstablishingShot(
  scene: Record<string, unknown>,
  prevScene?: Record<string, unknown> | null,
  sceneIndex = 0,
  options?: { allowExceedMaxBeats?: boolean }
): EnsureSceneEstablishingResult {
  if (!doesSceneRequireEstablishingShot(scene, prevScene, sceneIndex)) {
    return { scene, injected: false, tagged: false }
  }

  const beats = Array.isArray(scene.beats) ? (scene.beats as SceneBeat[]) : []
  if (beats.length === 0) {
    return { scene, injected: false, tagged: false }
  }

  const firstBeat = beats[0]

  // Case 1: Beat 0 is already an establishing or opening wide action beat
  if (isBeatEstablishingShot(firstBeat, true)) {
    const taggedFirst = tagExistingBeatAsEstablishing(firstBeat, scene)
    const changed = JSON.stringify(firstBeat) !== JSON.stringify(taggedFirst)
    if (!changed) {
      return { scene, injected: false, tagged: false }
    }
    const nextBeats = [taggedFirst, ...beats.slice(1)]
    return {
      scene: {
        ...scene,
        beats: nextBeats,
      },
      injected: false,
      tagged: true,
    }
  }

  // Case 2: Beat 0 is spoken (dialogue/narration) or a tight close-up/insert on a location change
  if (!options?.allowExceedMaxBeats && beats.length >= MAX_BEATS_PER_SCENE) {
    return { scene, injected: false, tagged: false }
  }

  const establishingBeat = buildEstablishingActionBeatForScene(scene)
  const nextBeats: SceneBeat[] = [
    establishingBeat,
    ...beats.map((b, idx) => ({
      ...b,
      sequenceIndex: idx + 1,
    })),
  ]

  const shifted = shiftMovementsAndCuesForPrependedBeat(scene)
  const existingAction = typeof scene.action === 'string' ? scene.action.trim() : ''
  const nextAction = existingAction
    ? `${establishingBeat.actionDescription}\n\n${existingAction}`
    : establishingBeat.actionDescription

  return {
    scene: {
      ...scene,
      beats: nextBeats,
      action: nextAction,
      ...(shifted.sceneMovements ? { sceneMovements: shifted.sceneMovements } : {}),
      ...(shifted.sceneMusicCues ? { sceneMusicCues: shifted.sceneMusicCues } : {}),
    },
    injected: true,
    tagged: false,
  }
}

export interface EnsureScriptEstablishingResult<T extends Record<string, unknown>> {
  scenes: T[]
  injectedCount: number
  taggedCount: number
}

/**
 * Walk all scenes in a script and ensure every scene that changes location
 * (or opens the narrative) begins with an Establishing Shot beat at `beats[0]`.
 */
export function ensureEstablishingShotsAcrossScenes<T extends Record<string, unknown>>(
  scenes: T[],
  options?: { allowExceedMaxBeats?: boolean }
): EnsureScriptEstablishingResult<T> {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return { scenes: [], injectedCount: 0, taggedCount: 0 }
  }

  let injectedCount = 0
  let taggedCount = 0
  const out: T[] = []

  for (let i = 0; i < scenes.length; i++) {
    const prev = i > 0 ? out[i - 1] : null
    const res = ensureSceneHasEstablishingShot(scenes[i], prev, i, options)
    if (res.injected) injectedCount++
    if (res.tagged) taggedCount++
    out.push(res.scene as T)
  }

  return {
    scenes: out,
    injectedCount,
    taggedCount,
  }
}
