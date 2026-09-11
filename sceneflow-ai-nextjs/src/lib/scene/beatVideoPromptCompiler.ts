/**
 * Compile clean Veo video prompts from beats — no SFX/music language.
 *
 * A beat scored by a music cue carries that cue as tonal direction only: what
 * the moment should feel like and how it should move, never what it should
 * sound like. The score is generated separately and mixed under the clip, and
 * a cue spans several beats while each clip is a few seconds, so asking the
 * model for music would seam the score at every cut and bake it in unmixable.
 */

import { getArtStyleNegativeTerms, getArtStylePromptSuffix } from '@/lib/vision/artStyle'
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

export interface BeatVideoPromptResult {
  prompt: string
  negativePrompt: string
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

function sceneDirectionMotionHints(
  direction?: DetailedSceneDirection | null,
  videoPrompt?: string
): string {
  if (!direction) return ''
  const prompt = videoPrompt ?? ''
  const parts: string[] = []
  const camera = direction.camera
  if (camera?.movement && !tokenAlreadyInPrompt(String(camera.movement), prompt)) {
    parts.push(String(camera.movement))
  }
  if (camera?.shots?.[0] && !tokenAlreadyInPrompt(String(camera.shots[0]), prompt)) {
    parts.push(String(camera.shots[0]))
  }
  if (
    direction.lighting?.overallMood &&
    !tokenAlreadyInPrompt(String(direction.lighting.overallMood), prompt)
  ) {
    parts.push(String(direction.lighting.overallMood))
  }
  // Omit talent.emotionalBeat — often trigger salad and duplicates mood in videoPrompt
  if (
    direction.veoOptimization?.motionQuality &&
    !tokenAlreadyInPrompt(String(direction.veoOptimization.motionQuality), prompt)
  ) {
    parts.push(`${direction.veoOptimization.motionQuality} motion`)
  }
  return parts.slice(0, 2).filter(Boolean).join(', ')
}

/**
 * Beat-scoped hints derived from `beat.beatDirection` (shot/movement/blocking).
 * Prefer these over scene-wide motion hints because they are authored for
 * THIS beat.
 */
function beatDirectionMotionHints(
  beat: SceneBeat,
  videoPrompt?: string
): string {
  const d = beat.beatDirection
  if (!d) return ''
  const prompt = videoPrompt ?? ''
  const parts: string[] = []
  if (d.cameraMovement && !tokenAlreadyInPrompt(d.cameraMovement, prompt)) {
    parts.push(d.cameraMovement)
  }
  if (d.shotType && !tokenAlreadyInPrompt(d.shotType, prompt)) {
    parts.push(d.shotType)
  }
  if (d.blocking && !tokenAlreadyInPrompt(d.blocking, prompt)) {
    parts.push(d.blocking)
  }
  if (d.emotion && !tokenAlreadyInPrompt(d.emotion, prompt)) {
    parts.push(d.emotion)
  }
  return parts.slice(0, 3).filter(Boolean).join(', ')
}

export function compileBeatVideoPrompt(
  beat: SceneBeat,
  options?: {
    artStyleId?: string
    excerpt?: string
    characterGender?: CharacterGender | null
    characterName?: string
    /** Cue scoring this beat, if any; enters as tonal direction, never as audio. */
    musicCue?: SceneMusicCue
  }
): BeatVideoPromptResult {
  const artStyleId = options?.artStyleId ?? 'photorealistic'
  const styleSuffix = getArtStylePromptSuffix(artStyleId)
  const styleNegative = getArtStyleNegativeTerms(artStyleId)
  const line = options?.excerpt ?? beat.line ?? ''
  const steer = formatMusicCueSteer(options?.musicCue)
  const steerSuffix = steer ? `${steer}. ` : ''

  let prompt = ''
  if (beat.kind === 'action') {
    prompt = `${beat.actionDescription ?? 'Scene action'}. Natural cinematic motion. ${steerSuffix}${styleSuffix}`
  } else if (beat.kind === 'narration') {
    prompt = `Atmospheric visual scene supporting voiceover mood. Subtle environmental motion. No on-screen text. ${steerSuffix}${styleSuffix}`
  } else {
    const character = beat.character ?? 'Character'
    const speakerAlias = toCharacterPromptAlias(character)
    const parsed = parsePerformanceCue(line)
    let cleanLine = parsed.spokenText.replace(/"/g, "'")
    if (options?.characterGender) {
      cleanLine = correctPronounsToGender(cleanLine, options.characterGender, {
        characterName: options.characterName ?? character,
      })
    }
    const deliverySuffix = parsed.deliveryProse
      ? ` Delivery: ${parsed.deliveryProse}.`
      : ''
    prompt = `${speakerAlias} speaks naturally: "${cleanLine}".${deliverySuffix} Subtle facial expression and body language. ${steerSuffix}${styleSuffix}`
  }

  const negativePrompt = `${BASE_NEGATIVES}, ${styleNegative}`

  return { prompt: prompt.trim(), negativePrompt }
}

/**
 * Prefer scene direction segmentPromptBundle video prompts; fall back to beat compiler.
 */
export function compileBeatVideoPromptFromDirection(
  beat: SceneBeat,
  sceneDirection?: DetailedSceneDirection | null,
  options?: {
    artStyleId?: string
    excerpt?: string
    /** Cue scoring this beat, if any; enters as tonal direction, never as audio. */
    musicCue?: SceneMusicCue
  }
): BeatVideoPromptResult {
  const artStyleId = options?.artStyleId ?? 'photorealistic'
  const styleSuffix = getArtStylePromptSuffix(artStyleId)
  const styleNegative = getArtStyleNegativeTerms(artStyleId)
  const steer = formatMusicCueSteer(options?.musicCue)
  const entry = findBundleEntryForBeat(
    beat,
    sceneDirection?.segmentPromptBundle
  )

  if (entry?.videoPrompt?.trim()) {
    let core = entry.videoPrompt.trim()
    const summary = entry.segmentDirectionSummary?.trim()
    if (summary && !isRedundantSummary(summary, core)) {
      core = normalizePromptJoin(summary, core)
    }
    const beatHints = beatDirectionMotionHints(beat, core)
    if (beatHints) core = normalizePromptJoin(core, beatHints)
    const hints = sceneDirectionMotionHints(sceneDirection, core)
    if (hints) core = normalizePromptJoin(core, hints)
    return {
      prompt: normalizePromptJoin(core, steer, styleSuffix),
      negativePrompt: `${BASE_NEGATIVES}, ${styleNegative}`,
    }
  }

  if (beat.kind === 'action') {
    const action = beat.actionDescription ?? 'Scene action'
    const beatHints = beatDirectionMotionHints(beat, action)
    let core = beatHints ? normalizePromptJoin(action, beatHints) : action
    const hints = sceneDirectionMotionHints(sceneDirection, core)
    core = hints
      ? normalizePromptJoin(core, hints)
      : normalizePromptJoin(core, 'Natural cinematic motion')
    return {
      prompt: normalizePromptJoin(core, steer, styleSuffix),
      negativePrompt: `${BASE_NEGATIVES}, ${styleNegative}`,
    }
  }

  // The fallback already carries the steer, so it is stripped along with the
  // style suffix and re-joined in order rather than appearing twice.
  const fallback = compileBeatVideoPrompt(beat, options)
  const beatHints = beatDirectionMotionHints(beat, fallback.prompt)
  const hints = sceneDirectionMotionHints(sceneDirection, fallback.prompt)
  if (!beatHints && !hints) return fallback

  const tail = steer ? `\\. ${escapeRegExp(steer)}\\. ` : '\\. '
  const withoutStyle = fallback.prompt.replace(
    new RegExp(`${tail}${escapeRegExp(styleSuffix)}$`),
    ''
  )
  return {
    prompt: normalizePromptJoin(withoutStyle, beatHints, hints, steer, styleSuffix),
    negativePrompt: fallback.negativePrompt,
  }
}
