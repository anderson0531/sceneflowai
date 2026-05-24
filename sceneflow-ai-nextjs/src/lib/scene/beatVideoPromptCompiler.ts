/**
 * Compile clean Veo video prompts from beats — no SFX/music language.
 */

import { getArtStyleNegativeTerms, getArtStylePromptSuffix } from '@/lib/vision/artStyle'
import type { SceneBeat } from '@/lib/script/segmentTypes'

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
