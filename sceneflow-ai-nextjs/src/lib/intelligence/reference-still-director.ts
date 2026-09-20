/**
 * Reference Still Director — Gemini rewrite of a library plate prompt.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildReferenceStillDirectorSystemPrompt,
  buildReferenceStillDirectorUserPrompt,
  ensureReferenceKindAnchor,
  parseReferenceStillDirectorResponse,
  type DirectReferenceStillRequest,
} from '@/lib/intelligence/reference-still-director-fallback'

export type { DirectReferenceStillRequest } from '@/lib/intelligence/reference-still-director-fallback'

export interface DirectReferenceStillResult {
  usedAI: boolean
  prompt: string
  fallbackReason?: string
}

export async function directReferenceStill(
  request: DirectReferenceStillRequest
): Promise<DirectReferenceStillResult> {
  const options: TextGenerationOptions = {
    systemInstruction: buildReferenceStillDirectorSystemPrompt(request.kind),
    temperature: 0.4,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    thinkingLevel: 'high',
    timeoutMs: 90_000,
  }

  const result = await generateText(buildReferenceStillDirectorUserPrompt(request), options)
  let cleanText = result.text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleanText)
  } catch {
    parsed = { prompt: cleanText }
  }

  const prompt = parseReferenceStillDirectorResponse(parsed)
  if (!prompt) {
    return { usedAI: true, prompt: '', fallbackReason: 'director response carried no prompt' }
  }

  return {
    usedAI: true,
    prompt: ensureReferenceKindAnchor(request.kind, prompt),
  }
}
