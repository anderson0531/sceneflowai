/**
 * Video Director — Gemini rewrite of a beat's video prompt.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildVideoDirectorSystemPrompt,
  buildVideoDirectorUserPrompt,
  parseVideoDirectorPrompt,
  type VideoDirectorMode,
} from '@/lib/intelligence/beat-video-director-fallback'

export type { VideoDirectorMode } from '@/lib/intelligence/beat-video-director-fallback'

export {
  applyVideoDirectorPromptToProduction,
  applyVideoDirectorPromptToSegment,
  parseVideoDirectorPrompt,
  resolveCurrentVideoPrompt,
} from '@/lib/intelligence/beat-video-director-fallback'

export interface DirectBeatVideoRequest {
  mode: VideoDirectorMode
  currentPrompt: string
  userDirection?: string
  beatLabel?: string
  actionFraming?: string
  scoreSteer?: string
}

export interface DirectBeatVideoResult {
  usedAI: boolean
  videoPrompt: string
  fallbackReason?: string
}

export async function directBeatVideo(
  request: DirectBeatVideoRequest
): Promise<DirectBeatVideoResult> {
  const options: TextGenerationOptions = {
    systemInstruction: buildVideoDirectorSystemPrompt(),
    temperature: 0.4,
    maxOutputTokens: 2048,
    thinkingLevel: 'high',
    timeoutMs: 120_000,
  }

  const result = await generateText(buildVideoDirectorUserPrompt(request), options)
  const videoPrompt = parseVideoDirectorPrompt(result.text)
  if (!videoPrompt) {
    return {
      usedAI: true,
      videoPrompt: request.currentPrompt.trim(),
      fallbackReason: 'director response carried no prompt',
    }
  }
  return { usedAI: true, videoPrompt }
}
