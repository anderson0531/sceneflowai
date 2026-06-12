/**
 * Compile clean Veo video prompts from beats — no SFX/music language.
 */

import { getArtStyleNegativeTerms, getArtStylePromptSuffix } from '@/lib/vision/artStyle'
import type { SceneBeat } from '@/lib/script/segmentTypes'
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

function sceneDirectionMotionHints(
  direction?: DetailedSceneDirection | null
): string {
  if (!direction) return ''
  const parts: string[] = []
  const camera = direction.camera
  if (camera?.movement) parts.push(String(camera.movement))
  if (camera?.shots?.[0]) parts.push(String(camera.shots[0]))
  if (direction.lighting?.overallMood) {
    parts.push(String(direction.lighting.overallMood))
  }
  if (direction.talent?.emotionalBeat) {
    parts.push(String(direction.talent.emotionalBeat))
  }
  if (direction.veoOptimization?.motionQuality) {
    parts.push(`${direction.veoOptimization.motionQuality} motion`)
  }
  return parts.filter(Boolean).join(', ')
}

export function compileBeatVideoPrompt(
  beat: SceneBeat,
  options?: {
    artStyleId?: string
    excerpt?: string
  }
): BeatVideoPromptResult {
  const artStyleId = options?.artStyleId ?? 'photorealistic'
  const styleSuffix = getArtStylePromptSuffix(artStyleId)
  const styleNegative = getArtStyleNegativeTerms(artStyleId)
  const line = options?.excerpt ?? beat.line ?? ''

  let prompt = ''
  if (beat.kind === 'action') {
    prompt = `${beat.actionDescription ?? 'Scene action'}. Natural cinematic motion. ${styleSuffix}`
  } else if (beat.kind === 'narration') {
    prompt = `Atmospheric visual scene supporting voiceover mood. Subtle environmental motion. No on-screen text. ${styleSuffix}`
  } else {
    const character = beat.character ?? 'Character'
    const cleanLine = line.replace(/\[[^\]]*\]/g, '').trim()
    prompt = `${character} speaks naturally: "${cleanLine.replace(/"/g, "'")}". Subtle facial expression and body language. ${styleSuffix}`
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
  }
): BeatVideoPromptResult {
  const artStyleId = options?.artStyleId ?? 'photorealistic'
  const styleSuffix = getArtStylePromptSuffix(artStyleId)
  const styleNegative = getArtStyleNegativeTerms(artStyleId)
  const entry = findBundleEntryForBeat(
    beat,
    sceneDirection?.segmentPromptBundle
  )
  const motionHints = sceneDirectionMotionHints(sceneDirection)

  if (entry?.videoPrompt?.trim()) {
    let core = entry.videoPrompt.trim()
    if (entry.segmentDirectionSummary?.trim()) {
      core = `${entry.segmentDirectionSummary.trim()}. ${core}`
    }
    if (motionHints) {
      core = `${core}. ${motionHints}`
    }
    return {
      prompt: `${core}. ${styleSuffix}`.trim(),
      negativePrompt: `${BASE_NEGATIVES}, ${styleNegative}`,
    }
  }

  if (beat.kind === 'action') {
    const action = beat.actionDescription ?? 'Scene action'
    const core = motionHints
      ? `${action}. ${motionHints}`
      : `${action}. Natural cinematic motion`
    return {
      prompt: `${core}. ${styleSuffix}`.trim(),
      negativePrompt: `${BASE_NEGATIVES}, ${styleNegative}`,
    }
  }

  const fallback = compileBeatVideoPrompt(beat, options)
  if (!motionHints) return fallback

  const withoutStyle = fallback.prompt.replace(
    new RegExp(`\\. ${escapeRegExp(styleSuffix)}$`),
    ''
  )
  return {
    prompt: `${withoutStyle}. ${motionHints}. ${styleSuffix}`.trim(),
    negativePrompt: fallback.negativePrompt,
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
