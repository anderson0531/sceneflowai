/**
 * Music cue director — Gemini rewrite of a cue brief. Does not generate audio.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildMusicCueDirectorSystemPrompt,
  buildMusicCueDirectorUserPrompt,
  parseMusicCueDirectionPatch,
  type MusicCueDirectionPatch,
  type MusicCueDirectorRequest,
} from '@/lib/intelligence/music-cue-director-fallback'

export type {
  MusicCueDirectionPatch,
  MusicCueDirectorRequest,
} from '@/lib/intelligence/music-cue-director-fallback'

export { applyMusicCueDirection } from '@/lib/intelligence/music-cue-director-fallback'

export interface DirectMusicCueResult {
  usedAI: boolean
  patch?: MusicCueDirectionPatch
  fallbackReason?: string
}

export async function directMusicCue(
  request: MusicCueDirectorRequest
): Promise<DirectMusicCueResult> {
  const options: TextGenerationOptions = {
    systemInstruction: buildMusicCueDirectorSystemPrompt(),
    temperature: 0.4,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    thinkingLevel: 'high',
    timeoutMs: 90_000,
  }

  const result = await generateText(buildMusicCueDirectorUserPrompt(request), options)
  let cleanText = result.text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  const patch = parseMusicCueDirectionPatch(JSON.parse(cleanText))
  if (!patch) {
    return { usedAI: true, fallbackReason: 'director response carried no cue' }
  }
  return { usedAI: true, patch }
}
