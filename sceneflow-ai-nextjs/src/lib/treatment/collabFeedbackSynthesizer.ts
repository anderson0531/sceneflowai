import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { mapRecommendations } from '@/lib/treatment/blueprintAudienceScorer'
import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'
import type { BlueprintFeedbackSections, BlueprintSessionPayload } from '@/lib/blueprint/shareTypes'

function formatFeedbackForPrompt(
  items: Array<{
    reviewerName: string
    overallScore?: number | null
    sections?: BlueprintFeedbackSections | null
    freeformNotes?: string | null
  }>
): string {
  return items
    .map((f, i) => {
      const parts = [`Reviewer ${i + 1}: ${f.reviewerName}`]
      if (f.overallScore) parts.push(`Overall: ${f.overallScore}/5`)
      if (f.freeformNotes) parts.push(`Notes: ${f.freeformNotes}`)
      if (f.sections) {
        for (const [sec, data] of Object.entries(f.sections)) {
          if (!data) continue
          parts.push(
            `[${sec}] strengths: ${data.strengths || '-'}; concerns: ${data.concerns || '-'}; suggestions: ${data.suggestions || '-'}`
          )
        }
      }
      return parts.join('\n')
    })
    .join('\n\n')
}

export async function synthesizeCollabFeedback(opts: {
  payload: BlueprintSessionPayload
  feedbackRows: Array<{
    reviewerName: string
    overallScore?: number | null
    sections?: BlueprintFeedbackSections | null
    freeformNotes?: string | null
  }>
}): Promise<BlueprintAudienceRecommendation[]> {
  const { payload, feedbackRows } = opts
  const treatment = payload.treatment || {}
  const title = String(treatment.title || 'Untitled')
  const logline = String(treatment.logline || '')
  const synopsis = String(treatment.synopsis || treatment.content || '')

  const audienceCtx = payload.audienceDefinition
    ? JSON.stringify(payload.audienceDefinition, null, 2)
    : 'Not specified'

  const feedbackBlock = formatFeedbackForPrompt(feedbackRows)

  const prompt = `You are a senior story consultant synthesizing collaborator feedback on a film blueprint into actionable revision recommendations.

BLUEPRINT:
Title: ${title}
Logline: ${logline}
Synopsis (excerpt): ${synopsis.slice(0, 2000)}

TARGET AUDIENCE CONTEXT:
${audienceCtx}

COLLABORATOR FEEDBACK:
${feedbackBlock}

Task: Produce 3-8 deduplicated recommendations the owner can apply in a guided blueprint revision tool.

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Short title",
      "text": "Specific actionable recommendation",
      "priority": "critical|high|medium|low",
      "fixSection": "core|story|tone|beats|characters",
      "impactSections": ["story","beats"],
      "intentLabel": "optional short label",
      "pointsDeducted": 8
    }
  ]
}

Rules:
- fixSection = primary section to edit; impactSections = all affected sections
- Merge duplicate themes from multiple reviewers
- Be concrete and production-focused
- pointsDeducted: 1-20 by severity

JSON only.`

  const result = await generateText(prompt, {
    model: 'gemini-2.0-flash',
    temperature: 0.4,
    maxOutputTokens: 4096,
  })

  const parsed = safeParseJsonFromText(result.text) as { recommendations?: unknown[] }
  return mapRecommendations(parsed?.recommendations || [], 0)
}
