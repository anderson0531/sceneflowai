/**
 * Compile clean Veo video prompts from beats — no SFX/music language.
 */

import { getArtStyleNegativeTerms, getArtStylePromptSuffix } from '@/lib/vision/artStyle'
import { parsePerformanceCue } from '@/lib/scene/performanceCues'
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
    const parsed = parsePerformanceCue(line)
    const cleanLine = parsed.spokenText.replace(/"/g, "'")
    const deliverySuffix = parsed.deliveryProse
      ? ` Delivery: ${parsed.deliveryProse}.`
      : ''
    prompt = `${character} speaks naturally: "${cleanLine}".${deliverySuffix} Subtle facial expression and body language. ${styleSuffix}`
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

  if (entry?.videoPrompt?.trim()) {
    let core = entry.videoPrompt.trim()
    const summary = entry.segmentDirectionSummary?.trim()
    if (summary && !isRedundantSummary(summary, core)) {
      core = normalizePromptJoin(summary, core)
    }
    const hints = sceneDirectionMotionHints(sceneDirection, core)
    if (hints) {
      core = normalizePromptJoin(core, hints)
    }
    return {
      prompt: normalizePromptJoin(core, styleSuffix),
      negativePrompt: `${BASE_NEGATIVES}, ${styleNegative}`,
    }
  }

  if (beat.kind === 'action') {
    const action = beat.actionDescription ?? 'Scene action'
    const hints = sceneDirectionMotionHints(sceneDirection, action)
    const core = hints
      ? normalizePromptJoin(action, hints)
      : normalizePromptJoin(action, 'Natural cinematic motion')
    return {
      prompt: normalizePromptJoin(core, styleSuffix),
      negativePrompt: `${BASE_NEGATIVES}, ${styleNegative}`,
    }
  }

  const fallback = compileBeatVideoPrompt(beat, options)
  const hints = sceneDirectionMotionHints(sceneDirection, fallback.prompt)
  if (!hints) return fallback

  const withoutStyle = fallback.prompt.replace(
    new RegExp(`\\. ${escapeRegExp(styleSuffix)}$`),
    ''
  )
  return {
    prompt: normalizePromptJoin(withoutStyle, hints, styleSuffix),
    negativePrompt: fallback.negativePrompt,
  }
}
