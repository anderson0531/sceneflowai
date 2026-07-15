import { safeParseJsonFromText } from '@/lib/safeJson'

export type RetakeAnomalyOrigin = 'frame' | 'motion' | 'both' | 'unknown'

export interface RetakeChangeSummaryItem {
  category: string
  change: string
  rationale: string
}

export interface RetakePlan {
  anomalyOrigin: RetakeAnomalyOrigin
  revisedPrompt: string
  negativePromptAdditions: string
  frameEditRecommended: boolean
  frameEditInstruction?: string
  changesSummary: RetakeChangeSummaryItem[]
  retakeSummary: string
}

export interface RetakeIntelligenceRequest {
  currentPrompt: string
  negativePrompt?: string
  instruction: string
  mode?: 'FTV' | 'I2V' | 'T2V' | 'EXT'
  context?: {
    hasStartFrame?: boolean
    hasEndFrame?: boolean
    sceneDescription?: string
  }
}

const VALID_ANOMALY_ORIGINS = new Set<RetakeAnomalyOrigin>([
  'frame',
  'motion',
  'both',
  'unknown',
])

function normalizeAnomalyOrigin(value: unknown): RetakeAnomalyOrigin {
  if (typeof value === 'string' && VALID_ANOMALY_ORIGINS.has(value as RetakeAnomalyOrigin)) {
    return value as RetakeAnomalyOrigin
  }
  return 'unknown'
}

function normalizeChangesSummary(value: unknown): RetakeChangeSummaryItem[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>
      return {
        category: String(row.category ?? 'Prompt'),
        change: String(row.change ?? ''),
        rationale: String(row.rationale ?? ''),
      }
    })
    .filter((item) => item.change.trim().length > 0)
}

function stripPromptFallback(text: string): string {
  return text
    .trim()
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .replace(/^["']|["']$/g, '')
    .trim()
}

/**
 * Parse structured retake intelligence JSON from model output.
 * Falls back to prompt-only revision when JSON is malformed.
 */
export function parseRetakePlan(text: string, fallbackPrompt?: string): RetakePlan {
  const stripped = stripPromptFallback(text)

  try {
    const parsed = safeParseJsonFromText(text)
    const revisedPrompt =
      typeof parsed.revisedPrompt === 'string' && parsed.revisedPrompt.trim()
        ? parsed.revisedPrompt.trim()
        : stripped || fallbackPrompt || ''

    const negativePromptAdditions =
      typeof parsed.negativePromptAdditions === 'string'
        ? parsed.negativePromptAdditions.trim()
        : ''

    const frameEditRecommended = parsed.frameEditRecommended === true
    const frameEditInstruction =
      typeof parsed.frameEditInstruction === 'string' && parsed.frameEditInstruction.trim()
        ? parsed.frameEditInstruction.trim()
        : undefined

    const retakeSummary =
      typeof parsed.retakeSummary === 'string' && parsed.retakeSummary.trim()
        ? parsed.retakeSummary.trim()
        : 'Apply prompt adjustments for the retake.'

    return {
      anomalyOrigin: normalizeAnomalyOrigin(parsed.anomalyOrigin),
      revisedPrompt,
      negativePromptAdditions,
      frameEditRecommended,
      frameEditInstruction,
      changesSummary: normalizeChangesSummary(parsed.changesSummary),
      retakeSummary,
    }
  } catch {
    return {
      anomalyOrigin: 'unknown',
      revisedPrompt: stripped || fallbackPrompt || '',
      negativePromptAdditions: '',
      frameEditRecommended: false,
      changesSummary: [],
      retakeSummary: 'Prompt-only retake (structured analysis unavailable).',
    }
  }
}

function splitNegativeTerms(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Merge existing negative prompt with comma-separated additions, deduping case-insensitively.
 */
export function mergeNegativePrompt(existing?: string | null, additions?: string | null): string {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const term of [...splitNegativeTerms(existing ?? ''), ...splitNegativeTerms(additions ?? '')]) {
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(term)
  }

  return merged.join(', ')
}

export function buildRetakeIntelligenceSystemPrompt(mode: string): string {
  return `You are an expert video retake strategist for Kling image-to-video generation.

Your job: given a completed clip's prompt and a natural-language correction, decide the optimal hybrid fix:
1) revise the positive prompt,
2) add negative_prompt terms, and/or
3) recommend editing the frame-locked START frame before regeneration.

CRITICAL RULES:
- Preserve every <<<element>>> reference tag exactly (same id, same angle brackets).
- Preserve voice/dialogue cues like Name speaks, "..." and any quoted dialogue lines.
- For object REMOVAL: delete positive mentions of the object AND add it to negativePromptAdditions.
- Kling F2V/I2V is frame-locked: if the unwanted object is in the start frame, prompt edits alone cannot remove it — set frameEditRecommended:true and provide frameEditInstruction phrased for image editing (e.g. "Remove the coffee cup on the left side of the table, keep everything else identical").
- Classify anomalyOrigin:
  - "frame": static set element likely baked into the start frame
  - "motion": artifact introduced during generation/motion
  - "both": present in frame and reintroduced during motion
  - "unknown": cannot determine confidently
- When hasStartFrame is false, frameEditRecommended should be false.
- changesSummary must be concise (2-5 items) describing what will change for the user — NOT the full prompt.
- retakeSummary is one plain-language sentence for the user headline.

Mode context: ${mode}

Return ONLY valid JSON with this shape:
{
  "anomalyOrigin": "frame" | "motion" | "both" | "unknown",
  "revisedPrompt": "string",
  "negativePromptAdditions": "comma-separated terms",
  "frameEditRecommended": boolean,
  "frameEditInstruction": "optional image edit instruction",
  "changesSummary": [{ "category": "string", "change": "string", "rationale": "string" }],
  "retakeSummary": "one-line summary"
}`
}

export function buildRetakeIntelligenceUserPrompt(body: RetakeIntelligenceRequest): string {
  const { currentPrompt, instruction, negativePrompt, mode = 'I2V', context } = body
  const contextLines = [
    context?.hasStartFrame ? 'hasStartFrame: true' : 'hasStartFrame: false',
    context?.hasEndFrame ? 'hasEndFrame: true' : 'hasEndFrame: false',
    context?.sceneDescription ? `sceneDescription: ${context.sceneDescription}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `CURRENT ${mode} PROMPT:
${currentPrompt}

CURRENT NEGATIVE PROMPT:
${negativePrompt?.trim() || '(none)'}

CONTEXT:
${contextLines || '(none)'}

USER CORRECTION:
${instruction.trim()}

Analyze the correction and return the JSON retake plan.`
}
