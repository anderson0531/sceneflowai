export type NarrativeReasoningNarrationInput = {
  character_focus?: string
  story_strengths?: string
  user_adjustments?: string
  key_decisions?: Array<{ decision?: string; why?: string; impact?: string }>
}

const PLACEHOLDER_PATTERNS = [
  /^not provided by ai\.?$/i,
  /^regenerate the treatment to see ai reasoning\.?$/i,
]

function str(value: unknown): string {
  if (typeof value !== 'string') return value != null ? String(value).trim() : ''
  return value.trim()
}

function isSubstantiveText(value: unknown): boolean {
  const trimmed = str(value)
  if (!trimmed) return false
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/** Build speakable narrative-reasoning text for TTS in the Reasoning tab. */
export function buildNarrativeReasoningNarrationText(
  reasoning: NarrativeReasoningNarrationInput | null | undefined
): string {
  if (!reasoning) return ''

  const sections: string[] = []

  if (isSubstantiveText(reasoning.character_focus)) {
    sections.push(`Character Focus. ${str(reasoning.character_focus)}`)
  }

  const decisions = Array.isArray(reasoning.key_decisions) ? reasoning.key_decisions : []
  const decisionParts = decisions
    .map((decision, index) => {
      const title = str(decision?.decision)
      const why = str(decision?.why)
      const impact = str(decision?.impact)
      if (!title && !why && !impact) return ''

      const ordinal =
        index === 0 ? 'First' : index === 1 ? 'Second' : index === 2 ? 'Third' : `${index + 1}`
      const chunks = [`${ordinal}: ${title || 'Decision'}`]
      if (why) chunks.push(`Why: ${why}`)
      if (impact) chunks.push(`Impact: ${impact}`)
      return chunks.join(' ')
    })
    .filter(Boolean)

  if (decisionParts.length > 0) {
    sections.push(`Key Creative Decisions. ${decisionParts.join(' ')}`)
  }

  if (isSubstantiveText(reasoning.story_strengths)) {
    sections.push(`Story Strengths. ${str(reasoning.story_strengths)}`)
  }

  if (isSubstantiveText(reasoning.user_adjustments)) {
    sections.push(`Want Different Emphasis. ${str(reasoning.user_adjustments)}`)
  }

  return sections.join('\n\n').trim()
}
