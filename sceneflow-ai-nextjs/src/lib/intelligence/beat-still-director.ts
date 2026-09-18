/**
 * Still Director — Gemini rewrite of beat still Action/Framing.
 */

import 'server-only'

import { generateText, type TextGenerationOptions } from '@/lib/vertexai/gemini'
import {
  buildStillDirectorSystemPrompt,
  buildStillDirectorUserPrompt,
  mergeDirectOverlaysIntoPatch,
  parseStillDirectorBeats,
  type DirectBeatStillRequest,
  type StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'

export type {
  DirectBeatStillRequest,
  StillDirectorPatch,
} from '@/lib/intelligence/beat-still-director-fallback'

export {
  applyStillDirectorPatch,
  applyStillDirectorPatchToScene,
  applyPolicyComplianceToPatch,
  isPlannerAuthoredDirectionSource,
  isProtectedStillDirectionSource,
  mergeDirectOverlaysIntoPatch,
  previewActionFramingFromPatch,
  shouldRunStillDirectorAuto,
  shouldSkipStillDirectorAuto,
} from '@/lib/intelligence/beat-still-director-fallback'

export interface DirectBeatStillResult {
  usedAI: boolean
  patches: Array<{
    beatIndex: number
    beatId?: string
    patch: StillDirectorPatch
  }>
  fallbackReason?: string
}

export async function directBeatStills(
  request: DirectBeatStillRequest
): Promise<DirectBeatStillResult> {
  if (request.beats.length === 0) {
    return { usedAI: false, patches: [], fallbackReason: 'no beats to direct' }
  }

  const options: TextGenerationOptions = {
    systemInstruction: buildStillDirectorSystemPrompt(),
    temperature: 0.4,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
    thinkingLevel: 'high',
    timeoutMs: 120_000,
  }

  const result = await generateText(buildStillDirectorUserPrompt(request), options)
  let cleanText = result.text.trim()
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  const parsed = parseStillDirectorBeats(JSON.parse(cleanText))
  if (parsed.length === 0) {
    return { usedAI: true, patches: [], fallbackReason: 'director response carried no beats' }
  }

  const byIndex = new Map<number, StillDirectorPatch>()
  const byId = new Map<string, StillDirectorPatch>()
  for (const entry of parsed) {
    const patch = mergeDirectOverlaysIntoPatch(entry.patch, request.overlay)
    if (typeof entry.beatIndex === 'number') byIndex.set(entry.beatIndex, patch)
    if (entry.beatId) byId.set(entry.beatId, patch)
  }

  const patches = request.beats.map((entry, i) => {
    const patch =
      (entry.beat.beatId ? byId.get(entry.beat.beatId) : undefined) ??
      byIndex.get(entry.beatIndex) ??
      byIndex.get(i) ??
      mergeDirectOverlaysIntoPatch({}, request.overlay)
    return {
      beatIndex: entry.beatIndex,
      beatId: entry.beat.beatId,
      patch,
    }
  })

  return { usedAI: true, patches }
}
