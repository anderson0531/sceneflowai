/**
 * Vertex AI / Cloud Text-to-Speech safety responses do not identify specific words.
 * We parse the generic API message and surface actionable editing guidance.
 *
 * @see https://cloud.google.com/text-to-speech/docs/gemini-tts (safety / blocked generations)
 */

const USAGE_VIOLATION_SUBSTRING = /violates\s+vertex\s+ai'?s\s+usage\s+guidelines/i

/** Extract Google's opaque support reference when present. */
export function extractVertexTtsSupportCode(message: string): string | undefined {
  const m = message.match(/Support\s+codes?:\s*(\d+)/i)
  return m?.[1]
}

export type VertexTtsPolicyViolationPayload = {
  userMessage: string
  tips: string[]
  supportCode?: string
}

/** Editing hints shown when Gemini/Google TTS blocks synthesis (no word-level detail from API). */
export function getVertexTtsPolicyTips(audioType: 'narration' | 'dialogue' | 'description'): string[] {
  const base = [
    'Google does not indicate which exact phrase triggered the filter—small wording changes usually fix it.',
    'Try softer synonyms for metaphors that might sound violent or threatening (e.g. "target", "hunt", "weapon", "kill").',
    'Shorten or split long lines; very stacked bracket cues ([whispering, dread, …]) sometimes correlate with blocks.',
    'After edits, regenerate this line only.',
    'You can send feedback to Google using the support code below if you believe this is a mistake.',
  ]
  if (audioType === 'dialogue') {
    return [
      ...base,
      'For dialogue, keep performance intent in plain prose ("She says quietly…") instead of long bracket tags.',
    ]
  }
  return base
}

export function parseVertexTtsPolicyViolation(
  httpStatus: number,
  responseBody: string,
  audioType: 'narration' | 'dialogue' | 'description'
): VertexTtsPolicyViolationPayload | null {
  if (httpStatus !== 400) return null
  let message = responseBody
  try {
    const j = JSON.parse(responseBody) as { error?: { message?: string } }
    if (j?.error?.message) message = j.error.message
  } catch {
    /* raw text */
  }
  if (!USAGE_VIOLATION_SUBSTRING.test(message)) return null

  const supportCode = extractVertexTtsSupportCode(message)
  const codeSuffix = supportCode ? ` (reference: ${supportCode})` : ''

  const userMessage =
    `This line was blocked by Google's speech safety filters${codeSuffix}. ` +
    `Rephrase slightly and try again—the service does not say which word caused it.`

  return {
    userMessage,
    tips: getVertexTtsPolicyTips(audioType),
    supportCode,
  }
}

export class GoogleTtsBlockedError extends Error {
  readonly payload: VertexTtsPolicyViolationPayload

  constructor(payload: VertexTtsPolicyViolationPayload) {
    super(payload.userMessage)
    this.name = 'GoogleTtsBlockedError'
    this.payload = payload
  }
}
