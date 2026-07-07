/**
 * Rule-based one-line guidance for video generation failures (Footage beat cards).
 */

const CONTENT_POLICY_MARKERS = [
  'content policy',
  'content safety',
  'safety filter',
  'blocked',
  'prohibited',
  'usage guidelines',
  'rai media filtered',
  'rai filter',
  'violat',
  'filtered by',
  'prompt was blocked',
  'mix of references',
]

const QUOTA_MARKERS = [
  'quota',
  'rate limit',
  'resource_exhausted',
  '429',
  'too many requests',
  'busy',
]

function matchesAny(low: string, markers: string[]): boolean {
  return markers.some((m) => low.includes(m))
}

/**
 * Returns a single actionable CTA for the user, or null when there is no error.
 */
export function buildVideoErrorGuidance(error?: string | null): string | null {
  const trimmed = error?.trim()
  if (!trimmed) return null

  const low = trimmed.toLowerCase()

  if (matchesAny(low, CONTENT_POLICY_MARKERS)) {
    return "Blocked by Google's content policy — switch to the Multiplatform (Kling) provider in Advanced settings and regenerate."
  }

  if (matchesAny(low, QUOTA_MARKERS)) {
    return 'The video service is busy — wait a moment and retry, or switch to the Multiplatform (Kling) provider.'
  }

  return 'Generation failed — refine your Prompt Direction or try the Multiplatform (Kling) provider in Advanced settings.'
}
