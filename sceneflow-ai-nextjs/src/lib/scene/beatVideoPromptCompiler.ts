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
import {
  formatPerformanceClause,
  parsePerformanceCue,
  resolveBeatDirectedEmotion,
} from '@/lib/scene/performanceCues'
import {
  normalizeSingleCastShotType,
  sanitizeSingleCastListenerPhrasing,
} from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  correctPronounsToGender,
  type CharacterGender,
} from '@/lib/character/visualGender'
import { toCharacterPromptAlias } from '@/lib/character/characterPromptAlias'
import type { SceneBeat, SceneMusicCue } from '@/lib/script/segmentTypes'
import { formatMusicCueSteer } from '@/lib/script/sceneMusicCues'
import {
  compileSceneStateContinuityClause,
  type CumulativeSceneStateAtBeat,
} from '@/lib/scene/sceneStateLedger'
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
  /** Previous beat in running order — incoming screen direction for continuity. */
  previousBeat?: SceneBeat | null
  /** True when this clip continues a split spoken line. */
  continuesSameLine?: boolean
  /** Optional cumulative scene state ledger entry for multi-shot wardrobe/lighting carryover. */
  sceneState?: CumulativeSceneStateAtBeat | null
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
    if (camera?.coveragePhilosophy && !tokenAlreadyInPrompt(String(camera.coveragePhilosophy), videoPrompt)) {
      parts.push(String(camera.coveragePhilosophy))
    }
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

function isSingleCastBeat(beat: SceneBeat): boolean {
  const cast = beat.beatDirection?.castInFrame
  if (Array.isArray(cast)) {
    return cast.map((name) => name.trim()).filter(Boolean).length === 1
  }
  return beat.kind === 'dialogue' && Boolean(beat.character?.trim())
}

export interface ResolvedBeatClipDirection {
  /** Opening visual state at t=0s before the 10s clip action unfolds. */
  startFrame?: string
  /** Temporal motion and action progression across the 10s clip (0s → 10s). */
  clipAction?: string
  /** Directed character performance emotion or atmospheric/cinematic mood & pacing arc. */
  emotion?: string
  /** Terminal settled visual state at t=10s ("End on:") after the clip's action completes. */
  endFrame?: string
}

const LEADING_TIME_LABEL_RE =
  /^(?:(?:0\s*s?\s*[–-]\s*2\s*s\s*(?:\(start\s+frame\))?|2\s*s?\s*[–-]\s*[58]\s*s\s*(?:\(action\))?|5\s*s?\s*[–-]\s*8\s*s\s*(?:\(action\s+progression\))?|8\s*s?\s*[–-]\s*10\s*s\s*(?:\(end\s+frame\))?|start\s+frame|opening\s+frame|clip\s+action(?:\s*\(10s\))?|action\s+progression|action|end\s+frame|end\s+on)\s*:\s*|(?:from\s+t\s*=\s*0\s*s\s+to\s+t\s*=\s*10\s*s|from\s+0\s*s?\s+to\s+10\s*s|at\s+t\s*=\s*(?:0|10)\s*s|by\s+t\s*=\s*10\s*s|at\s+(?:0|10)\s*s)\s*[,:—-]\s*)/i

/**
 * Strip redundant leading temporal or section labels (e.g. "At t=0s,",
 * "From t=0s to t=10s,", "End on:", "Start frame:") so timed clip prompts and
 * UI tiles do not stack duplicate prefixes.
 */
export function stripLeadingTimeLabel(value?: string | null): string {
  let out = (value ?? '').trim()
  if (!out) return ''
  let strippedAny = false
  let prev = ''
  while (out && out !== prev) {
    prev = out
    const next = out.replace(LEADING_TIME_LABEL_RE, '').trim()
    if (next !== out) {
      strippedAny = true
      out = next
    }
  }
  if (strippedAny && out.length > 0 && /^[a-z]/.test(out)) {
    out = out.charAt(0).toUpperCase() + out.slice(1)
  }
  return out
}

/**
 * Resolve explicit or derived 10s Clip direction facets (`startFrame`, `clipAction`,
 * `emotion`, `endFrame`) for a beat so both the Shot Director UI and the video
 * prompt compiler have complete 10s clip guidance.
 */
export function resolveBeatClipDirection(
  beat: SceneBeat,
  sceneDirection?: DetailedSceneDirection | null,
  options?: { musicCue?: SceneMusicCue }
): ResolvedBeatClipDirection {
  const direction = beat.beatDirection
  const singleCast = isSingleCastBeat(beat)
  const cleanSingle = (value?: string): string | undefined => {
    const trimmed = stripLeadingTimeLabel(value)
    if (!trimmed) return undefined
    return singleCast ? sanitizeSingleCastListenerPhrasing(trimmed) || undefined : trimmed
  }

  let startFrame = cleanSingle(direction?.startFrame)
  if (!startFrame) {
    const actionText = beat.kind === 'action' ? beat.actionDescription?.trim() : undefined
    const sentences = actionText
      ? actionText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
      : []
    const frozen = stripLeadingTimeLabel(direction?.frozenMoment)
    if (
      sentences.length > 1 &&
      frozen &&
      sentences[0].toLowerCase() !== frozen.toLowerCase()
    ) {
      startFrame = cleanSingle(sentences[0])
    } else {
      startFrame = cleanSingle(frozen)
    }
  }

  const clipAction = cleanSingle(
    direction?.clipAction ||
      (beat.kind === 'action'
        ? beat.actionDescription
        : beat.actionDescription || direction?.blocking)
  )

  const emotion =
    direction?.emotion?.trim() ||
    resolveBeatDirectedEmotion({
      beatLine: beat.line,
      beatAction: beat.actionDescription,
    }) ||
    options?.musicCue?.intent?.trim() ||
    sceneDirection?.talent?.emotionalBeat?.trim() ||
    undefined

  const endFrame = cleanSingle(direction?.endFrame || direction?.frozenMoment)

  return {
    ...(startFrame ? { startFrame } : {}),
    ...(clipAction ? { clipAction } : {}),
    ...(emotion ? { emotion } : {}),
    ...(endFrame ? { endFrame } : {}),
  }
}

function hasExplicitTimedClipDirection(beat: SceneBeat): boolean {
  const d = beat.beatDirection
  if (Boolean(d?.startFrame?.trim() || d?.clipAction?.trim() || d?.endFrame?.trim())) {
    return true
  }
  if (beat.kind === 'action') {
    const resolved = resolveBeatClipDirection(beat)
    if (
      resolved.startFrame &&
      resolved.endFrame &&
      resolved.startFrame.toLowerCase() !== resolved.endFrame.toLowerCase()
    ) {
      return true
    }
  }
  return false
}

/**
 * Build a chronological 10s timed sequence (`0s–2s` start frame → `2s–5s` / `5s–8s`
 * action progression → `8s–10s` end frame) so video models hold the initial state
 * before executing the transition and settling into the terminal state.
 */
export function buildTimedClipSequence(beat: SceneBeat): string | undefined {
  if (!hasExplicitTimedClipDirection(beat)) return undefined
  const resolved = resolveBeatClipDirection(beat)
  const parts: string[] = []

  if (resolved.startFrame) {
    parts.push(`0s–2s (Start frame): ${resolved.startFrame.replace(/\.+$/, '')}`)
  }

  if (resolved.clipAction) {
    const cleanedAction = resolved.clipAction.replace(/\.+$/, '').trim()
    if (/\b2\s*s?\s*[–-]\s*[58]\s*s\b/i.test(cleanedAction)) {
      parts.push(cleanedAction)
    } else {
      const sentences = cleanedAction
        .split(/(?<=[.!?])\s+/)
        .map((s) => stripLeadingTimeLabel(s).replace(/\.+$/, '').trim())
        .filter(Boolean)
      if (sentences.length >= 2) {
        parts.push(`2s–5s (Action): ${sentences[0]}`)
        parts.push(`5s–8s (Action progression): ${sentences.slice(1).join('. ')}`)
      } else if (sentences.length === 1) {
        parts.push(`2s–8s (Action): ${sentences[0]}`)
      }
    }
  }

  if (resolved.endFrame) {
    parts.push(`8s–10s (End frame): End on: ${resolved.endFrame.replace(/\.+$/, '')}`)
  }

  return parts.length > 0 ? normalizePromptJoin(...parts) : undefined
}

/** Shot, movement, blocking, and the rest, as clauses of one direction. */
function directionClauses(beat: SceneBeat, existing: string): string[] {
  const direction = beat.beatDirection
  if (!direction) return []
  const singleCast = isSingleCastBeat(beat)
  const cleanSingle = (value?: string): string | undefined =>
    singleCast ? sanitizeSingleCastListenerPhrasing(value) || undefined : value
  const cleanTimed = (value?: string): string | undefined => {
    const stripped = stripLeadingTimeLabel(value)
    if (!stripped) return undefined
    return cleanSingle(stripped)
  }
  const clauses: string[] = []
  pushClause(clauses, existing, '0s–2s (Start frame)', cleanTimed(direction.startFrame))
  pushClause(clauses, existing, '2s–8s (Action)', cleanTimed(direction.clipAction))
  pushClause(clauses, existing, 'Coverage', direction.coveragePurpose)
  pushClause(clauses, existing, 'Lens', direction.lensEnergy)
  pushClause(clauses, existing, 'Space', cleanSingle(direction.spatialRelationship))
  pushClause(clauses, existing, 'Shot', normalizeSingleCastShotType(direction.shotType, singleCast))
  pushClause(clauses, existing, 'Angle', direction.cameraAngle)
  pushClause(clauses, existing, 'Camera', direction.cameraMovement)
  pushClause(clauses, existing, 'Blocking', cleanSingle(direction.blocking))
  pushClause(clauses, existing, 'Emotion', direction.emotion)
  pushClause(clauses, existing, 'Gaze', cleanSingle(direction.gaze))
  pushClause(clauses, existing, 'Prop interaction', direction.propInteraction)
  const props = direction.keyProps?.map((name) => name.trim()).filter(Boolean) ?? []
  if (props.length > 0) pushClause(clauses, existing, 'Props', props.join(', '))
  pushClause(clauses, existing, 'Lighting', direction.lightingAccent)
  const endText = cleanTimed(direction.endFrame || direction.frozenMoment)
  if (endText && !tokenAlreadyInPrompt(endText, existing)) {
    const endLabel =
      direction.startFrame || direction.clipAction || direction.endFrame
        ? '8s–10s (End frame): End on'
        : 'End on'
    pushClause(clauses, existing, endLabel, endText)
  }
  pushClause(clauses, existing, 'Sound', direction.audioCue)
  return clauses
}

function spokenLineOf(beat: SceneBeat, excerpt?: string): string {
  const raw = excerpt ?? beat.line ?? ''
  return parsePerformanceCue(raw).spokenText.replace(/"/g, "'").trim()
}

function summarizeStatedActionForGuardrail(
  statedAction: string,
  coreText?: string
): string {
  const trimmed = statedAction.trim()
  if (!trimmed) return ''
  if (coreText && tokenAlreadyInPrompt(trimmed, coreText) && trimmed.length > 100) {
    const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0]?.trim()
    if (firstSentence && firstSentence.length >= 16) {
      return firstSentence
    }
  }
  return trimmed
}

/**
 * Who may appear, which objects exist, and whether anyone speaks.
 * Built only from fields this beat actually has.
 */
export function beatVideoFidelityClose(
  beat: SceneBeat,
  options?: { spokenLine?: string; coreText?: string }
): string {
  const parts: string[] = []
  const cast = beat.beatDirection?.castInFrame
  const singleCast = isSingleCastBeat(beat)
  if (Array.isArray(cast)) {
    const names = cast.map((name) => name.trim()).filter(Boolean)
    parts.push(
      names.length === 0
        ? 'No people in frame'
        : names.length === 1
          ? `Only these people are visible: ${names[0]}. No other people, no foreground silhouette or back of another person's head (any listener is off-camera out of frame)`
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

  const rawStatedAction = stripLeadingTimeLabel(
    beat.kind === 'action'
      ? beat.beatDirection?.clipAction || beat.actionDescription
      : beat.beatDirection?.blocking || beat.actionDescription
  )
  const statedAction = singleCast
    ? sanitizeSingleCastListenerPhrasing(rawStatedAction)
    : rawStatedAction
  if (hasExplicitTimedClipDirection(beat)) {
    parts.push(
      'Hold the 0s–2s start state before initiating the 2s–8s progression, and settle cleanly into the 8s–10s end frame without inventing unstated events or extra cuts'
    )
  }
  if (statedAction) {
    const guardrailAction = summarizeStatedActionForGuardrail(statedAction, options?.coreText)
    if (guardrailAction) {
      parts.push(`The only action is: ${guardrailAction.replace(/\.+$/, '')}`)
    }
  }

  if (beat.kind === 'dialogue' || beat.kind === 'narration') {
    const line = (options?.spokenLine ?? spokenLineOf(beat)).trim()
    if (line) {
      parts.push(`The only spoken line is: "${line}"`)
    } else if (beat.kind === 'narration') {
      parts.push('No spoken dialogue')
    }
  } else {
    parts.push('No spoken dialogue')
  }

  return parts.join('. ')
}

function hasSpokenDialogue(beat: SceneBeat, excerpt?: string): boolean {
  if (beat.kind === 'dialogue') return true
  if (beat.kind === 'narration') return Boolean(spokenLineOf(beat, excerpt).trim())
  return false
}

function videoNegatives(beat: SceneBeat, styleNegative: string): string {
  const silent = hasSpokenDialogue(beat) ? '' : `, ${SILENT_NEGATIVES}`
  const singleCastNegatives = isSingleCastBeat(beat)
    ? ', over-the-shoulder foreground person, back of second person head, unreferenced listener in frame'
    : ''
  return `${BASE_NEGATIVES}, ${styleNegative}${silent}${singleCastNegatives}`
}

function leadForBeat(beat: SceneBeat, options?: CompileBeatVideoPromptOptions): string {
  if (beat.kind === 'action') {
    const timed = buildTimedClipSequence(beat)
    if (timed) return timed
    return (
      stripLeadingTimeLabel(beat.beatDirection?.clipAction) ||
      beat.actionDescription?.trim() ||
      'Scene action'
    )
  }
  if (beat.kind === 'narration') {
    const parsed = parsePerformanceCue(options?.excerpt ?? beat.line ?? '')
    let cleanLine = parsed.spokenText.replace(/"/g, "'").trim()
    const rawSpeaker = beat.character?.trim()
    const hasCustomSpeaker = Boolean(
      rawSpeaker &&
        rawSpeaker.toUpperCase() !== 'NARRATOR' &&
        rawSpeaker.toUpperCase() !== 'VOICEOVER'
    )
    if (cleanLine && options?.characterGender) {
      cleanLine = correctPronounsToGender(cleanLine, options.characterGender, {
        characterName: options.characterName ?? (rawSpeaker || 'Narrator'),
      })
    }
    const delivery = parsed.deliveryProse ? ` Delivery: ${parsed.deliveryProse}` : ''
    const performance = formatPerformanceClause(beat.voiceDirection)
    const customAction =
      beat.actionDescription?.trim() &&
      beat.actionDescription.trim() !== 'Promo trailer voice-over'
        ? beat.actionDescription.trim()
        : undefined
    const baseVisual =
      customAction ||
      'Atmospheric visual scene supporting voiceover mood. Subtle environmental motion. No on-screen text'
    if (!cleanLine) {
      return baseVisual
    }
    if (hasCustomSpeaker && rawSpeaker) {
      const speakerAlias = toCharacterPromptAlias(rawSpeaker)
      return `${baseVisual}. ${speakerAlias} speaks: "${cleanLine}".${delivery}${performance}`
    }
    return `${baseVisual}. Voiceover narration: "${cleanLine}".${delivery}${performance}`
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
  const performance = formatPerformanceClause(beat.voiceDirection)
  return `${speakerAlias} speaks naturally: "${cleanLine}".${delivery}${performance}`
}

function incomingContinuityClause(
  options?: CompileBeatVideoPromptOptions,
  currentBeat?: SceneBeat
): string {
  if (options?.continuesSameLine) {
    return 'Continues the same spoken line and eyeline from the previous shot without resetting blocking'
  }
  const ledgerClause = compileSceneStateContinuityClause(options?.sceneState)
  const prev = options?.previousBeat
  if (!prev) return ledgerClause
  const parts: string[] = []
  const prevShot = prev.beatDirection?.shotType?.trim()
  if (prevShot) parts.push(`Incoming continuity from ${prevShot}`)
  const currentCast = currentBeat?.beatDirection?.castInFrame
  const prevCast = Array.isArray(prev.beatDirection?.castInFrame)
    ? prev.beatDirection.castInFrame.map((name) => name.trim()).filter(Boolean)
    : []
  const sharedCast = Array.isArray(currentCast)
    ? prevCast.filter((name) =>
        currentCast.some((curr) => curr.trim().toLowerCase() === name.toLowerCase())
      )
    : prevCast
  if (sharedCast.length) parts.push(`same people already in frame: ${sharedCast.join(', ')}`)
  const currentProps = currentBeat?.beatDirection?.keyProps
  const prevProps = Array.isArray(prev.beatDirection?.keyProps)
    ? prev.beatDirection.keyProps.map((name) => name.trim()).filter(Boolean)
    : []
  const sharedProps =
    Array.isArray(currentProps) && currentProps.length === 0 ? [] : prevProps
  if (sharedProps.length) parts.push(`props remain: ${sharedProps.join(', ')}`)
  if (ledgerClause) parts.push(ledgerClause)
  return parts.join('. ')
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
  continuity?: string
}): BeatVideoPromptResult {
  let core = args.core.trim()
  if (args.steer && !tokenAlreadyInPrompt(args.steer, core)) {
    core = normalizePromptJoin(core, args.steer)
  }
  if (args.continuity && !tokenAlreadyInPrompt(args.continuity, core)) {
    core = normalizePromptJoin(core, args.continuity)
  }
  const fidelity = beatVideoFidelityClose(args.beat, {
    spokenLine: args.spokenLine,
    coreText: core,
  })
  if (fidelity && !tokenAlreadyInPrompt(fidelity, core)) {
    core = normalizePromptJoin(core, fidelity)
  }
  const performance = formatPerformanceClause(args.beat.voiceDirection).trim()
  if (performance && !/performance:/i.test(core)) {
    core = normalizePromptJoin(core, performance)
  }
  const isWideLandscapeShot = /\b(?:wide|establish|aerial|long\s+shot|master)\b/i.test(
    args.beat.beatDirection?.shotType || ''
  )
  const rawStyle = args.styleSuffix.trim()
  const style = isWideLandscapeShot
    ? rawStyle.replace(/\bshallow depth of field\b/gi, 'deep depth of field')
    : rawStyle
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
  const spokenLine = hasSpokenDialogue(beat, options?.excerpt)
    ? spokenLineOf(beat, options?.excerpt)
    : undefined
  const core = withMotionWhenUnstated(beat, leadForBeat(beat, options))
  return finishVideoPrompt({
    core,
    beat,
    steer,
    styleSuffix,
    styleNegative,
    spokenLine,
    continuity: incomingContinuityClause(options, beat),
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
 * Detect when a cached compiler-generated `beatDirection.videoPrompt` is out of sync
 * with the beat's current Shot Director / 10s Clip direction fields.
 * Genuine manual overrides (which lack compiler fidelity guardrails) are preserved.
 */
export function isStaleSavedVideoPrompt(
  beat: SceneBeat,
  stored: string,
  spokenLine?: string
): boolean {
  const trimmed = stored.trim()
  if (!trimmed) return true

  if (
    beat.kind === 'narration' &&
    Boolean(spokenLine?.trim()) &&
    (/no spoken dialogue/i.test(trimmed) ||
      !trimmed.includes(spokenLine!.trim().slice(0, Math.min(24, spokenLine!.trim().length))))
  ) {
    return true
  }

  const d = beat.beatDirection
  if (
    Array.isArray(d?.castInFrame) &&
    d.castInFrame.length === 0 &&
    /same people already in frame:/i.test(trimmed)
  ) {
    return true
  }

  const isCompilerGenerated =
    /\b(?:No spoken dialogue|The only spoken line is:|The only action is:|End on:|photorealistic,\s*cinematic motion)/i.test(
      trimmed
    )
  if (!isCompilerGenerated) {
    return false
  }

  if (
    /\b(?:wide|establish|aerial|long\s+shot|master)\b/i.test(d?.shotType || '') &&
    /\bshallow depth of field\b/i.test(trimmed)
  ) {
    return true
  }

  const cleanStart = stripLeadingTimeLabel(d?.startFrame)
  const cleanClipAction = stripLeadingTimeLabel(d?.clipAction)
  const cleanEnd = stripLeadingTimeLabel(d?.endFrame)
  const cleanFrozen = stripLeadingTimeLabel(d?.frozenMoment)

  if (
    hasExplicitTimedClipDirection(beat) &&
    !/0s[–-]2s\s*\(Start frame\):/i.test(trimmed) &&
    !/2s[–-][58]s\s*\(Action\):/i.test(trimmed)
  ) {
    return true
  }

  if (cleanStart && !tokenAlreadyInPrompt(cleanStart.slice(0, 48), trimmed)) {
    return true
  }
  if (cleanClipAction && !tokenAlreadyInPrompt(cleanClipAction.slice(0, 48), trimmed)) {
    return true
  }
  if (cleanEnd && !tokenAlreadyInPrompt(cleanEnd.slice(0, 48), trimmed)) {
    return true
  }
  if (
    !cleanEnd &&
    cleanFrozen &&
    !tokenAlreadyInPrompt(cleanFrozen.slice(0, 48), trimmed)
  ) {
    return true
  }
  if (
    beat.kind !== 'dialogue' &&
    !cleanClipAction &&
    beat.actionDescription?.trim() &&
    !tokenAlreadyInPrompt(beat.actionDescription.slice(0, 48), trimmed)
  ) {
    return true
  }
  if (d?.cameraMovement?.trim() && !tokenAlreadyInPrompt(d.cameraMovement, trimmed)) {
    return true
  }
  if (d?.blocking?.trim() && !tokenAlreadyInPrompt(d.blocking.slice(0, 48), trimmed)) {
    return true
  }
  if (d?.emotion?.trim() && !tokenAlreadyInPrompt(d.emotion, trimmed)) {
    return true
  }

  return false
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
  const spokenLine = hasSpokenDialogue(beat, options?.excerpt)
    ? spokenLineOf(beat, options?.excerpt)
    : undefined
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
    continuity: incomingContinuityClause(options, beat),
  })
}

/**
 * Clip prompt from the current beat.
 *
 * A saved `beatDirection.videoPrompt` is the clip text unless it is a stale
 * auto-compiled prompt. Otherwise user, planner, and director writes compile
 * one motion direction from the beat. A scene-bundle videoPrompt is the core
 * only when this beat has no such write.
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
  const spokenLine = hasSpokenDialogue(beat, options?.excerpt)
    ? spokenLineOf(beat, options?.excerpt)
    : undefined
  const stored = beat.beatDirection?.videoPrompt?.trim()
  if (stored && !isStaleSavedVideoPrompt(beat, stored, spokenLine)) {
    const continuity = incomingContinuityClause(options, beat)
    let prompt =
      continuity && !tokenAlreadyInPrompt(continuity, stored)
        ? normalizePromptJoin(stored, continuity)
        : stored
    const performance = formatPerformanceClause(beat.voiceDirection).trim()
    if (performance && !/performance:/i.test(prompt)) {
      prompt = normalizePromptJoin(prompt, performance)
    }
    return {
      prompt,
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
      continuity: incomingContinuityClause(options, beat),
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
    continuity: incomingContinuityClause(options, beat),
  })
}
