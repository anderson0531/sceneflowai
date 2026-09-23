/**
 * Compile clean Veo video prompts from beats — no SFX/music language.
 *
 * A beat scored by a music cue carries that cue as tonal direction only: what
 * the moment should feel like and how it should move, never what it should
 * sound like. The score is generated separately and mixed under the clip, and
 * a cue spans several beats while each clip is a few seconds, so asking the
 * model for music would seam the score at every cut and bake it in unmixable.
 *
 * The compiled string is one motion direction plus a fidelity close. It names
 * the shot, who may appear, which objects exist, and whether anyone speaks.
 * A second scene-level camera is left off when this beat already has a shot
 * or a move, so the model is not asked to dolly and establish at once.
 */

import { getArtStyleNegativeTerms, getArtStyleVideoPromptSuffix } from '@/lib/vision/artStyle'
import { parsePerformanceCue } from '@/lib/scene/performanceCues'
import {
  correctPronounsToGender,
  type CharacterGender,
} from '@/lib/character/visualGender'
import { toCharacterPromptAlias } from '@/lib/character/characterPromptAlias'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { formatMusicCueSteer } from '@/lib/script/sceneMusicCues'
import type {
  DetailedSceneDirection,
  SceneSegmentPromptBundleEntry,
} from '@/types/scene-direction'

const BASE_NEGATIVES = [
  'blurry',
  'low quality',
  'watermark',
  'text overlay',
  'subtitles',
  'sound effects',
  'foley',
  'music',
  'audio waveform',
  'morphing artifacts',
  'temporal inconsistency',
].join(', ')

const SILENT_NEGATIVES = 'dialogue, talking, lip sync'

export interface BeatVideoPromptResult {
  prompt: string
  negativePrompt: string
}

export interface CompileBeatVideoPromptOptions {
  artStyleId?: string
  excerpt?: string
  characterGender?: CharacterGender | null
  characterName?: string
  /** Cue scoring this beat, if any; enters as tonal direction, never as audio. */
  musicCue?: SceneMusicCue
}

function normalizeLine(text: string): string {
  return text.replace(/\[[^\]]*\]/g, '').trim().toLowerCase()
}

function findBundleEntryForBeat(
  beat: SceneBeat,
  bundle: SceneSegmentPromptBundleEntry[] | undefined
): SceneSegmentPromptBundleEntry | undefined {
  if (!bundle?.length) return undefined

  const lineNorm = normalizeLine(beat.line ?? '')

  if (beat.kind === 'narration') {
    return bundle.find(
      (e) => e.kind === 'narration' && normalizeLine(e.lineText) === lineNorm
    )
  }

  if (beat.kind === 'dialogue') {
    const byLine = bundle.find(
      (e) =>
        e.kind === 'dialogue' &&
        normalizeLine(e.lineText) === lineNorm &&
        (!beat.character ||
          e.character?.toLowerCase() === beat.character.toLowerCase())
    )
    if (byLine) return byLine
  }

  return undefined
}

/** Join prompt segments with single periods; collapse double periods. */
export function normalizePromptJoin(...segments: string[]): string {
  const joined = segments
    .map((s) => s.trim().replace(/\.+$/, ''))
    .filter(Boolean)
    .join('. ')
  return joined.replace(/\.\.+/g, '.').trim()
}

/** True when summary largely duplicates content already in videoPrompt. */
export function isRedundantSummary(summary: string, videoPrompt: string): boolean {
  const s = summary.trim().toLowerCase()
  const v = videoPrompt.trim().toLowerCase()
  if (!s || !v) return false
  if (v.includes(s)) return true
  if (s.includes(v.slice(0, Math.min(48, v.length)))) return true

  const sWords = new Set(s.split(/\s+/).filter((w) => w.length > 3))
  const vWords = new Set(v.split(/\s+/).filter((w) => w.length > 3))
  if (sWords.size === 0) return false
  let overlap = 0
  for (const w of sWords) {
    if (vWords.has(w)) overlap++
  }
  return overlap / sWords.size >= 0.6
}

function tokenAlreadyInPrompt(token: string, videoPrompt: string): boolean {
  const t = token.trim().toLowerCase()
  const v = videoPrompt.toLowerCase()
  if (!t) return true
  return v.includes(t)
}

function beatDirectsCamera(beat: SceneBeat): boolean {
  const direction = beat.beatDirection
  return Boolean(direction?.shotType?.trim() || direction?.cameraMovement?.trim())
}

function sceneDirectionMotionHints(
  direction: DetailedSceneDirection | null | undefined,
  videoPrompt: string,
  omitCamera: boolean
): string {
  if (!direction) return ''
  const parts: string[] = []
  const camera = direction.camera
  if (!omitCamera) {
    if (camera?.movement && !tokenAlreadyInPrompt(String(camera.movement), videoPrompt)) {
      parts.push(String(camera.movement))
    }
    if (camera?.shots?.[0] && !tokenAlreadyInPrompt(String(camera.shots[0]), videoPrompt)) {
      parts.push(String(camera.shots[0]))
    }
  }
  if (
    direction.lighting?.overallMood &&
    !tokenAlreadyInPrompt(String(direction.lighting.overallMood), videoPrompt)
  ) {
    parts.push(String(direction.lighting.overallMood))
  }
  // Omit talent.emotionalBeat — often trigger salad and duplicates mood in videoPrompt
  if (
    direction.veoOptimization?.motionQuality &&
    !tokenAlreadyInPrompt(String(direction.veoOptimization.motionQuality), videoPrompt)
  ) {
    parts.push(`${direction.veoOptimization.motionQuality} motion`)
  }
  return parts.slice(0, 2).filter(Boolean).join(', ')
}

function pushClause(clauses: string[], existing: string, label: string, value?: string) {
  const piece = value?.trim()
  if (!piece) return
  if (tokenAlreadyInPrompt(piece, existing)) return
  const clause = `${label}: ${piece}`
  if (tokenAlreadyInPrompt(clause, existing)) return
  clauses.push(clause)
}

/** Shot, movement, blocking, and the rest, as clauses of one direction. */
function directionClauses(beat: SceneBeat, existing: string): string[] {
  const direction = beat.beatDirection
  if (!direction) return []
  const clauses: string[] = []
  pushClause(clauses, existing, 'Shot', direction.shotType)
  pushClause(clauses, existing, 'Angle', direction.cameraAngle)
  pushClause(clauses, existing, 'Camera', direction.cameraMovement)
  pushClause(clauses, existing, 'Blocking', direction.blocking)
  pushClause(clauses, existing, 'Emotion', direction.emotion)
  pushClause(clauses, existing, 'Gaze', direction.gaze)
  pushClause(clauses, existing, 'Prop interaction', direction.propInteraction)
  const props = direction.keyProps?.map((name) => name.trim()).filter(Boolean) ?? []
  if (props.length > 0) pushClause(clauses, existing, 'Props', props.join(', '))
  pushClause(clauses, existing, 'Lighting', direction.lightingAccent)
  pushClause(clauses, existing, 'End on', direction.frozenMoment)
  pushClause(clauses, existing, 'Sound', direction.audioCue)
  return clauses
}

function spokenLineOf(beat: SceneBeat, excerpt?: string): string {
  const raw = excerpt ?? beat.line ?? ''
  return parsePerformanceCue(raw).spokenText.replace(/"/g, "'").trim()
}

/**
 * Who may appear, which objects exist, and whether anyone speaks.
 * Built only from fields this beat actually has.
 */
export function beatVideoFidelityClose(
  beat: SceneBeat,
  options?: { spokenLine?: string }
): string {
  const parts: string[] = []
  const cast = beat.beatDirection?.castInFrame
  if (Array.isArray(cast)) {
    const names = cast.map((name) => name.trim()).filter(Boolean)
    parts.push(
      names.length === 0
        ? 'No people in frame'
        : `Only these people are visible: ${names.join(', ')}. No other people`
    )
  }

  const props = beat.beatDirection?.keyProps
  if (Array.isArray(props)) {
    const names = props.map((name) => name.trim()).filter(Boolean)
    parts.push(
      names.length === 0
        ? 'Do not add objects'
        : `Only these objects: ${names.join(', ')}. Do not add other objects`
    )
  }

  const statedAction = (
    beat.kind === 'action'
      ? beat.actionDescription
      : beat.beatDirection?.blocking || beat.actionDescription
  )?.trim()
  if (statedAction) {
    parts.push(`The only action is: ${statedAction.replace(/\.+$/, '')}`)
  }

  if (beat.kind === 'dialogue') {
    const line = (options?.spokenLine ?? spokenLineOf(beat)).trim()
    if (line) parts.push(`The only spoken line is: "${line}"`)
  } else {
    parts.push('No spoken dialogue')
  }

  return parts.join('. ')
}

function videoNegatives(beat: SceneBeat, styleNegative: string): string {
  const silent = beat.kind === 'dialogue' ? '' : `, ${SILENT_NEGATIVES}`
  return `${BASE_NEGATIVES}, ${styleNegative}${silent}`
}

function leadForBeat(beat: SceneBeat, options?: CompileBeatVideoPromptOptions): string {
  if (beat.kind === 'action') {
    return beat.actionDescription?.trim() || 'Scene action'
  }
  if (beat.kind === 'narration') {
    return 'Atmospheric visual scene supporting voiceover mood. Subtle environmental motion. No on-screen text'
  }

  const character = beat.character ?? 'Character'
  const speakerAlias = toCharacterPromptAlias(character)
  const parsed = parsePerformanceCue(options?.excerpt ?? beat.line ?? '')
  let cleanLine = parsed.spokenText.replace(/"/g, "'")
  if (options?.characterGender) {
    cleanLine = correctPronounsToGender(cleanLine, options.characterGender, {
      characterName: options.characterName ?? character,
    })
  }
  const delivery = parsed.deliveryProse ? ` Delivery: ${parsed.deliveryProse}` : ''
  return `${speakerAlias} speaks naturally: "${cleanLine}".${delivery}`
}

function withMotionWhenUnstated(beat: SceneBeat, core: string): string {
  if (beat.kind === 'dialogue') return core
  if (beat.beatDirection?.cameraMovement?.trim()) return core
  if (/cinematic motion/i.test(core)) return core
  return normalizePromptJoin(core, 'Natural cinematic motion')
}

function finishVideoPrompt(args: {
  core: string
  beat: SceneBeat
  steer: string
  styleSuffix: string
  styleNegative: string
  spokenLine?: string
}): BeatVideoPromptResult {
  let core = args.core.trim()
  if (args.steer && !tokenAlreadyInPrompt(args.steer, core)) {
    core = normalizePromptJoin(core, args.steer)
  }
  const fidelity = beatVideoFidelityClose(args.beat, { spokenLine: args.spokenLine })
  if (fidelity && !tokenAlreadyInPrompt(fidelity, core)) {
    core = normalizePromptJoin(core, fidelity)
  }
  const style = args.styleSuffix.trim()
  const prompt =
    style && !tokenAlreadyInPrompt(style, core) ? normalizePromptJoin(core, style) : core
  return {
    prompt,
    negativePrompt: videoNegatives(args.beat, args.styleNegative),
  }
}

function applySceneHints(
  core: string,
  beat: SceneBeat,
  sceneDirection?: DetailedSceneDirection | null
): string {
  const hints = sceneDirectionMotionHints(sceneDirection, core, beatDirectsCamera(beat))
  return hints ? normalizePromptJoin(core, hints) : core
}

export function compileBeatVideoPrompt(
  beat: SceneBeat,
  options?: CompileBeatVideoPromptOptions
): BeatVideoPromptResult {
  const artStyleId = options?.artStyleId ?? 'photorealistic'
  const styleSuffix = getArtStyleVideoPromptSuffix(artStyleId)
  const styleNegative = getArtStyleNegativeTerms(artStyleId)
  const steer = formatMusicCueSteer(options?.musicCue)
  const spokenLine = beat.kind === 'dialogue' ? spokenLineOf(beat, options?.excerpt) : undefined
  const core = withMotionWhenUnstated(beat, leadForBeat(beat, options))
  return finishVideoPrompt({
    core,
    beat,
    steer,
    styleSuffix,
    styleNegative,
    spokenLine,
  })
}

const DIRECTION_OWNED_SOURCES = new Set(['user', 'planner', 'director'])

/**
 * A Frame Direction save, the beat editor, and the planner write `generatedBy`.
 * Those records are the clip's source. An older scene-bundle video prompt is
 * only the core when direction was not written for this beat.
 */
export function beatDirectionOwnsVideoPrompt(beat: SceneBeat): boolean {
  const source = beat.beatDirection?.generatedBy
  return !!source && DIRECTION_OWNED_SOURCES.has(source)
}

/**
 * Motion prompt for a beat whose direction is the source of truth.
 * Still generation keeps its own frozen-frame composer.
 */
function compileOwnedBeatVideoPrompt(
  beat: SceneBeat,
  sceneDirection: DetailedSceneDirection | null | undefined,
  options: CompileBeatVideoPromptOptions | undefined,
  styleSuffix: string,
  styleNegative: string,
  steer: string
): BeatVideoPromptResult {
  const spokenLine = beat.kind === 'dialogue' ? spokenLineOf(beat, options?.excerpt) : undefined
  const lead = leadForBeat(beat, options)
  const clauses = directionClauses(beat, lead)
  let core = clauses.length > 0 ? normalizePromptJoin(lead, clauses.join('. ')) : lead
  core = withMotionWhenUnstated(beat, core)
  core = applySceneHints(core, beat, sceneDirection)
  return finishVideoPrompt({
    core,
    beat,
    steer,
    styleSuffix,
    styleNegative,
    spokenLine,
  })
}

/**
 * Clip prompt from the current beat.
 *
 * A saved `beatDirection.videoPrompt` is the clip text. Otherwise user,
 * planner, and director writes compile one motion direction from the beat.
 * A scene-bundle videoPrompt is the core only when this beat has no such write.
 */
export function compileBeatVideoPromptFromDirection(
  beat: SceneBeat,
  sceneDirection?: DetailedSceneDirection | null,
  options?: CompileBeatVideoPromptOptions
): BeatVideoPromptResult {
  const artStyleId = options?.artStyleId ?? 'photorealistic'
  const styleSuffix = getArtStyleVideoPromptSuffix(artStyleId)
  const styleNegative = getArtStyleNegativeTerms(artStyleId)
  const steer = formatMusicCueSteer(options?.musicCue)
  const stored = beat.beatDirection?.videoPrompt?.trim()
  if (stored) {
    return {
      prompt: stored,
      negativePrompt: videoNegatives(beat, styleNegative),
    }
  }

  if (beatDirectionOwnsVideoPrompt(beat)) {
    return compileOwnedBeatVideoPrompt(
      beat,
      sceneDirection,
      options,
      styleSuffix,
      styleNegative,
      steer
    )
  }

  const spokenLine = beat.kind === 'dialogue' ? spokenLineOf(beat, options?.excerpt) : undefined
  const entry = findBundleEntryForBeat(beat, sceneDirection?.segmentPromptBundle)

  if (entry?.videoPrompt?.trim()) {
    let core = entry.videoPrompt.trim()
    const summary = entry.segmentDirectionSummary?.trim()
    if (summary && !isRedundantSummary(summary, core)) {
      core = normalizePromptJoin(summary, core)
    }
    const clauses = directionClauses(beat, core)
    if (clauses.length > 0) core = normalizePromptJoin(core, clauses.join('. '))
    core = withMotionWhenUnstated(beat, core)
    core = applySceneHints(core, beat, sceneDirection)
    return finishVideoPrompt({
      core,
      beat,
      steer,
      styleSuffix,
      styleNegative,
      spokenLine,
    })
  }

  const lead = leadForBeat(beat, options)
  const clauses = directionClauses(beat, lead)
  let core = clauses.length > 0 ? normalizePromptJoin(lead, clauses.join('. ')) : lead
  core = withMotionWhenUnstated(beat, core)
  core = applySceneHints(core, beat, sceneDirection)
  return finishVideoPrompt({
    core,
    beat,
    steer,
    styleSuffix,
    styleNegative,
    spokenLine,
  })
}
