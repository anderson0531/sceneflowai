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

function stripFences(text: string): string {
  return text.replace(/```json\s*|\s*```/g, '').trim()
}

/** Close a cut-off JSON string and the brackets left open around it. */
function repairTruncatedJson(input: string): string {
  let text = input.trim()
  let inString = false
  let escaped = false
  for (const ch of text) {
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') inString = !inString
  }
  if (inString) text += '"'
  text = text.replace(/,\s*"[^"\\]*"\s*:\s*$/, '').replace(/,\s*$/, '')

  const stack: string[] = []
  inString = false
  escaped = false
  for (const ch of text) {
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    else if ((ch === '}' || ch === ']') && stack.length > 0) stack.pop()
  }
  while (stack.length > 0) {
    const open = stack.pop()
    text += open === '{' ? '}' : ']'
  }
  return text
}

function keepTruncatedNotes(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.recommendations)) return raw
  return {
    ...record,
    recommendations: record.recommendations.map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry
      const item = entry as Record<string, unknown>
      if (typeof item.text !== 'string' || !item.text.trim()) return entry
      if (typeof item.category === 'string' && item.category.trim()) return entry
      return { ...item, category: 'blueprint', priority: item.priority ?? 'medium' }
    }),
  }
}

/** Parse story-note JSON, closing a truncated string so the notes are not dropped. */
export function parsePromoAnalysisJson(text: string): unknown {
  const cleaned = stripFences(text)
  const start = cleaned.indexOf('{')
  const slice = start >= 0 ? cleaned.slice(start) : cleaned
  try {
    return JSON.parse(slice)
  } catch {
    return keepTruncatedNotes(JSON.parse(repairTruncatedJson(slice)))
  }
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
    return mergePromoStoryNotes(findings, parsePromoStoryNotes(parsePromoAnalysisJson(result.text)))
  } catch (error) {
    console.warn('[Promo plan] Analysis notes failed:', error)
    return findings
  }
}
