/**
 * Audience Resonance pass over a promo cut.
 * Deterministic findings stay. The model may only add story notes.
 */

import { getGeminiTextModel } from '@/lib/config/modelConfig'
import {
  buildPromoStoryNotesPrompt,
  collectPromoPlanFindings,
  mergePromoStoryNotes,
  parsePromoStoryNotes,
  type PromoPlanFinding,
  type PromoPlanFindingsInput,
} from '@/lib/publish/promoPlanFindings'
import { generateText } from '@/lib/vertexai/gemini'

export interface AnalyzePromoPlanInput extends PromoPlanFindingsInput {
  title?: string
  audienceText?: string
}

function parseModelJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  return JSON.parse(cleaned)
}

/** Review the cut. A model failure still returns the deterministic findings. */
export async function analyzePromoPlan(
  input: AnalyzePromoPlanInput,
  generate: typeof generateText = generateText
): Promise<PromoPlanFinding[]> {
  const findings = collectPromoPlanFindings(input)
  try {
    const result = await generate(
      buildPromoStoryNotesPrompt({
        title: input.title,
        audienceText: input.audienceText,
        blueprintBeats: input.blueprintBeats,
        beatPlan: input.beatPlan,
        findings,
      }),
      {
        model: getGeminiTextModel('flash'),
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        thinkingLevel: 'minimal',
      }
    )
    return mergePromoStoryNotes(findings, parsePromoStoryNotes(parseModelJson(result.text)))
  } catch (error) {
    console.warn('[Promo plan] Analysis notes failed:', error)
    return findings
  }
}
