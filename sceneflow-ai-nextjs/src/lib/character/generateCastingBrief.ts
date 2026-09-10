import { generateText } from '@/lib/vertexai/gemini'
import {
  buildCastingBriefDirectorPrompt,
  parseCastingBriefDirectorResponse,
  type CastingBriefDirectorRequest,
  type CastingBriefDirectorResult,
} from '@/lib/character/buildCastingBriefDirectorPrompt'

/** The model answered, but not with a usable brief. Distinct from a call failure. */
export class CastingBriefParseError extends Error {
  constructor(readonly raw: string, cause: unknown) {
    super('Failed to parse casting brief response')
    this.name = 'CastingBriefParseError'
    this.cause = cause
  }
}

/**
 * Generate a Casting Brief in-process.
 *
 * Shared by the generate-casting-brief route and the Reference Express worker,
 * which has no session and so cannot go through the route.
 */
export async function generateCastingBrief(
  request: CastingBriefDirectorRequest
): Promise<CastingBriefDirectorResult> {
  const prompt = buildCastingBriefDirectorPrompt(request)
  console.log(
    '[Generate Casting Brief] Processing request for:',
    request.characterName,
    request.recommendMode ? '(recommend mode)' : '(director notes)',
  )

  const result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  })

  try {
    return parseCastingBriefDirectorResponse(result.text)
  } catch (parseError) {
    throw new CastingBriefParseError(result.text, parseError)
  }
}
