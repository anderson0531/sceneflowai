import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import type { EapApplicationRecord } from '@/lib/early-access/applications'

export interface EapAiAssessment {
  recommendedStatus: 'approve' | 'waitlist' | 'reject' | 'needs_review'
  confidence: number
  summary: string
  strengths: string[]
  risks: string[]
  suggestedScores: {
    agencyLead: number
    seriesCreator: number
    techEnthusiast: number
    casualCreator: number
  }
  rationale: string
  model: string
  assessedAt: string
}

const ASSESSMENT_SCHEMA = `{
  "recommendedStatus": "approve" | "waitlist" | "reject" | "needs_review",
  "confidence": number between 0 and 1,
  "summary": string,
  "strengths": string[],
  "risks": string[],
  "suggestedScores": {
    "agencyLead": number 0-5,
    "seriesCreator": number 0-5,
    "techEnthusiast": number 0-5,
    "casualCreator": number 0-5
  },
  "rationale": string
}`

function buildAssessmentPrompt(application: EapApplicationRecord): string {
  return `You are qualifying applicants for SceneFlow AI Studio's Early Access Program (August 2026 cohort).

SceneFlow is a production stack for automated, consistent, global-scale cinema built on Google Cloud and Vertex AI. Ideal cohort members are serious producers who will commit weekly feedback and help shape the product.

QUALIFICATION RUBRIC:
- Strong signals: high monthly video volume, series intent, multilanguage ambition, F2V experience, GCP/Vertex readiness, detailed series concept, feedback commitment ("Yes, I want to shape the future")
- Penalize: "No, I just want to use the tool" without cohort commitment, vague series concept, low production scale
- agencyLead: agency/production shop signals (org name, volume, distribution)
- seriesCreator: series concept quality, narrative ambition, art style breadth
- techEnthusiast: GCP/Vertex comfort, F2V experience, technical bottlenecks
- casualCreator: inverse of serious production intent (higher = more casual, lower is better for EAP)

Respond with JSON only matching this schema:
${ASSESSMENT_SCHEMA}

APPLICATION:
${JSON.stringify(application, null, 2)}`
}

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(5, Math.round(n)))
}

function normalizeStatus(value: unknown): EapAiAssessment['recommendedStatus'] {
  const text = typeof value === 'string' ? value : ''
  if (text === 'approve' || text === 'waitlist' || text === 'reject' || text === 'needs_review') {
    return text
  }
  return 'needs_review'
}

export async function assessEapApplication(
  application: EapApplicationRecord
): Promise<EapAiAssessment> {
  const model = getGeminiTextModel('pro')
  const result = await generateText(buildAssessmentPrompt(application), {
    model,
    responseMimeType: 'application/json',
    temperature: 0.2,
    maxOutputTokens: 2048,
    thinkingLevel: 'low',
  })

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(result.text)
  } catch {
    throw new Error('AI assessment returned invalid JSON')
  }

  const scores = (parsed.suggestedScores as Record<string, unknown>) || {}

  return {
    recommendedStatus: normalizeStatus(parsed.recommendedStatus),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    summary: String(parsed.summary || 'No summary provided'),
    strengths: Array.isArray(parsed.strengths)
      ? parsed.strengths.map(String).slice(0, 8)
      : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String).slice(0, 8) : [],
    suggestedScores: {
      agencyLead: clampScore(scores.agencyLead),
      seriesCreator: clampScore(scores.seriesCreator),
      techEnthusiast: clampScore(scores.techEnthusiast),
      casualCreator: clampScore(scores.casualCreator),
    },
    rationale: String(parsed.rationale || ''),
    model,
    assessedAt: new Date().toISOString(),
  }
}
