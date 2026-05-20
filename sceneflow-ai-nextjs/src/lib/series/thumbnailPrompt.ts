import type Series from '@/models/Series'

/** Imagen prompt length guard — long bible fields can exceed API limits and return 400. */
export const SERIES_THUMBNAIL_PROMPT_MAX = 2800

export function asPromptText(value: unknown, maxLen = 500): string {
  if (value == null) return ''
  const text = typeof value === 'string' ? value.trim() : String(value).trim()
  if (!text) return ''
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`
}

export function cloneSeriesMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  try {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>
  } catch {
    return { ...(metadata as Record<string, unknown>) }
  }
}

export function assertSeriesImageGenConfigured(): string | null {
  if (!process.env.VERTEX_PROJECT_ID && !process.env.GCP_PROJECT_ID) {
    return 'Image generation is not configured (VERTEX_PROJECT_ID or GCP_PROJECT_ID required).'
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()) {
    return 'Storage credentials are not configured (GOOGLE_APPLICATION_CREDENTIALS_JSON required).'
  }
  return null
}

export function buildSeriesThumbnailPrompt(series: Series, customPrompt?: string): string {
  if (customPrompt?.trim()) {
    const trimmed = customPrompt.trim()
    return trimmed.length <= SERIES_THUMBNAIL_PROMPT_MAX
      ? trimmed
      : trimmed.slice(0, SERIES_THUMBNAIL_PROMPT_MAX)
  }

  const bible = series.production_bible
  const protagonist =
    bible?.characters?.find((c) => c.id === bible?.protagonist?.characterId) ||
    bible?.characters?.[0]
  const mainLocation = bible?.locations?.[0]

  const seriesInfo = [
    series.title ? `Series Title: ${series.title}` : '',
    series.genre ? `Genre: ${series.genre}` : '',
    series.logline ? `Action/Concept: ${asPromptText(series.logline, 600)}` : '',
    protagonist
      ? `Main Subject: ${asPromptText(protagonist.name, 80)} - ${asPromptText(protagonist.appearance || protagonist.description, 400)}`
      : '',
    mainLocation
      ? `Setting/Location: ${asPromptText(mainLocation.name, 80)} - ${asPromptText(mainLocation.visualDescription || mainLocation.description, 400)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Create an engaging, illustrative, and highly cinematic 16:9 thumbnail image for a TV series.
DO NOT generate a simple headshot or portrait. The image MUST depict an active scene illustrating the core concept.

Series Details:
${seriesInfo}

CRITICAL INSTRUCTIONS:
- Create a dynamic, active scene based on the Action/Concept.
- The Main Subject must be situated within the Setting/Location.
- Show the character engaged in the narrative, not just staring at the camera.
- Professional TV series poster quality, suitable for streaming platform thumbnail display
- Cinematic lighting with high contrast and dramatic shadows
- Wide angle cinematic framing (environmental context is important)
- 16:9 landscape aspect ratio
- No text, titles, or watermarks on the image
- Photorealistic or stylized based on genre appropriateness`

  return prompt.length <= SERIES_THUMBNAIL_PROMPT_MAX
    ? prompt
    : prompt.slice(0, SERIES_THUMBNAIL_PROMPT_MAX)
}
