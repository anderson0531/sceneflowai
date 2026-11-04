/**
 * Clip Frame Bookend Director — Gemini pass that takes a shot's compiled Clips prompt
 * as input and generates aligned Start Frame (t=0s) and End Frame (t=T) still prompts.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildClipBookendDirectorSystemPrompt,
  buildClipBookendDirectorUserPrompt,
  parseClipBookendDirectorResponse,
  type ClipBookendDirectorRequest,
  type ClipBookendPrompts,
} from '@/lib/intelligence/clip-frame-bookend-director-fallback'
import { buildEndFramePrompt, buildStartFramePrompt } from '@/lib/scene/deriveSegmentsFromBeats'

export type {
  ClipBookendDirectorRequest,
  ClipBookendPrompts,
} from '@/lib/intelligence/clip-frame-bookend-director-fallback'

export interface DirectClipFrameBookendsResult extends ClipBookendPrompts {
  usedAI: boolean
  fallbackReason?: string
}

interface BookendCacheEntry {
  result: DirectClipFrameBookendsResult
  timestamp: number
}

const bookendCache = new Map<string, BookendCacheEntry>()
const BOOKEND_CACHE_TTL_MS = 10 * 60 * 1000
const inFlightBookendRequests = new Map<string, Promise<DirectClipFrameBookendsResult>>()

function getCacheKey(request: ClipBookendDirectorRequest): string {
  return `${request.clipPrompt.trim()}|${(request.shotStillPrompt || '').trim()}`
}

export async function directClipFrameBookends(
  request: ClipBookendDirectorRequest
): Promise<DirectClipFrameBookendsResult> {
  const clipPrompt = request.clipPrompt?.trim() || ''
  const fallbackStart = request.beat
    ? buildStartFramePrompt(request.beat, { clipPrompt })
    : clipPrompt
  const fallbackEnd = request.beat
    ? buildEndFramePrompt(request.beat, { clipPrompt })
    : clipPrompt

  if (!clipPrompt) {
    return {
      startFramePrompt: fallbackStart,
      endFramePrompt: fallbackEnd,
      usedAI: false,
      fallbackReason: 'empty clip prompt',
    }
  }

  const key = getCacheKey(request)
  const cached = bookendCache.get(key)
  if (cached && Date.now() - cached.timestamp < BOOKEND_CACHE_TTL_MS) {
    return cached.result
  }

  const existingInFlight = inFlightBookendRequests.get(key)
  if (existingInFlight) {
    return existingInFlight
  }

  const promise = (async (): Promise<DirectClipFrameBookendsResult> => {
    try {
      const options: TextGenerationOptions = {
        systemInstruction: buildClipBookendDirectorSystemPrompt(),
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        thinkingLevel: 'low',
        timeoutMs: 45_000,
      }

      const response = await generateText(buildClipBookendDirectorUserPrompt(request), options)
      let cleanText = response.text.trim()
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      const parsed = parseClipBookendDirectorResponse(JSON.parse(cleanText), request)
      if (!parsed) {
        return {
          startFramePrompt: fallbackStart,
          endFramePrompt: fallbackEnd,
          usedAI: false,
          fallbackReason: 'model response failed bookend validation',
        }
      }

      const result: DirectClipFrameBookendsResult = {
        startFramePrompt: parsed.startFramePrompt,
        endFramePrompt: parsed.endFramePrompt,
        usedAI: true,
      }

      if (bookendCache.size > 100) {
        const oldestKey = bookendCache.keys().next().value
        if (oldestKey) bookendCache.delete(oldestKey)
      }
      bookendCache.set(key, { result, timestamp: Date.now() })
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[directClipFrameBookends] Falling back to deterministic bookend prompts: ${message}`)
      return {
        startFramePrompt: fallbackStart,
        endFramePrompt: fallbackEnd,
        usedAI: false,
        fallbackReason: message,
      }
    } finally {
      inFlightBookendRequests.delete(key)
    }
  })()

  inFlightBookendRequests.set(key, promise)
  return promise
}
