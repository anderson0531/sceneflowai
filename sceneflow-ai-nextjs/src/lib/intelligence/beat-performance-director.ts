/**
 * Beat performance director — Gemini rewrite of one line or one action description.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildBeatPerformanceSystemPrompt,
  buildBeatPerformanceUserPrompt,
  parseBeatPerformancePatch,
  type BeatPerformancePatch,
  type BeatPerformanceRequest,
} from '@/lib/intelligence/beat-performance-director-fallback'

export type {
  BeatPerformanceMode,
  BeatPerformancePatch,
  BeatPerformanceRequest,
} from '@/lib/intelligence/beat-performance-director-fallback'

export {
  applyBeatPerformanceDirectorToScene,
  previewPerformanceRewrite,
} from '@/lib/intelligence/beat-performance-director-fallback'

export interface DirectBeatPerformanceResult {
  usedAI: boolean
  patch?: BeatPerformancePatch
  fallbackReason?: string
}

export async function directBeatPerformance(
  request: BeatPerformanceRequest
): Promise<DirectBeatPerformanceResult> {
  const options: TextGenerationOptions = {
    systemInstruction: buildBeatPerformanceSystemPrompt(),
    temperature: 0.4,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    thinkingLevel: 'high',
    timeoutMs: 120_000,
  }

  const result = await generateText(buildBeatPerformanceUserPrompt(request), options)
  let cleanText = result.text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  const patch = parseBeatPerformancePatch(
    JSON.parse(cleanText),
    request.beat,
    request.scene,
    request.catalog
  )
  if (!patch) {
    return { usedAI: true, fallbackReason: 'director response carried no beat' }
  }
  return { usedAI: true, patch }
}
