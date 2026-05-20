import type Series from '@/models/Series'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'

/** Imagen prompt length guard — long bible fields can exceed API limits and return 400. */
export const SERIES_THUMBNAIL_PROMPT_MAX = 2800

const IMAGEN_FILTER_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/cramped/gi, 'cozy'],
  [/worn/gi, 'weathered'],
  [/seedy/gi, 'modest'],
  [/dirty/gi, 'dusty'],
  [/grungy/gi, 'textured'],
  [/sleazy/gi, 'simple'],
  [/intimate/gi, 'close'],
  [/sensual/gi, 'warm'],
  [/violent/gi, 'dramatic'],
  [/blood/gi, 'dramatic red'],
  [/kill/gi, 'confront'],
  [/murder/gi, 'mystery'],
  [/nude/gi, ''],
  [/naked/gi, ''],
]

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

export function sanitizeForImagen(text: string): string {
  let cleaned = text
  for (const [pattern, replacement] of IMAGEN_FILTER_WORD_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement)
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim()
}

export function isImagenContentFilterError(message: string): boolean {
  return (
    message.includes('content policies') ||
    message.includes('filtered') ||
    message.includes('No predictions')
  )
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
    series.logline
      ? `Story: ${sanitizeForImagen(asPromptText(series.logline, 500))}`
      : '',
    protagonist
      ? `Lead character: ${asPromptText(protagonist.name, 80)} (${asPromptText(protagonist.description, 200)})`
      : '',
    mainLocation
      ? `Setting: ${asPromptText(mainLocation.name, 80)} (${asPromptText(mainLocation.visualDescription || mainLocation.description, 200)})`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `Professional cinematic 16:9 streaming series key art thumbnail.
Wide establishing shot with characters in a dynamic scene (not a close-up portrait).

${seriesInfo}

Style: award-winning television marketing still, dramatic lighting, rich environment, high production value, 16:9 landscape, no text or watermarks.`

  return prompt.length <= SERIES_THUMBNAIL_PROMPT_MAX
    ? prompt
    : prompt.slice(0, SERIES_THUMBNAIL_PROMPT_MAX)
}

/** Safer prompt without detailed appearance — used when Imagen filters the full prompt. */
export function buildSeriesThumbnailFallbackPrompt(series: Series): string {
  const bits = [
    series.title ? `Series: ${asPromptText(series.title, 120)}` : '',
    series.genre ? `Genre: ${asPromptText(series.genre, 60)}` : '',
    series.logline
      ? `Premise: ${sanitizeForImagen(asPromptText(series.logline, 400))}`
      : '',
  ]
    .filter(Boolean)
    .join('. ')

  const prompt = `Professional cinematic streaming series poster, 16:9 widescreen. ${bits}. Dynamic wide shot, atmospheric lighting, family-friendly broadcast quality, no text or logos.`
  return prompt.length <= SERIES_THUMBNAIL_PROMPT_MAX
    ? prompt
    : prompt.slice(0, SERIES_THUMBNAIL_PROMPT_MAX)
}

/** Environment-only prompt — last resort when person generation is blocked. */
export function buildSeriesThumbnailMinimalPrompt(series: Series): string {
  const title = asPromptText(series.title, 120) || 'Television series'
  const genre = asPromptText(series.genre, 60)
  return `Cinematic ${genre ? `${genre} ` : ''}television series promotional landscape for "${title}". Wide atmospheric environment, dramatic sky, moody lighting, 16:9, professional color grading, no people, no text, no watermarks.`
}

type ThumbnailImagenOptions = NonNullable<Parameters<typeof generateImageWithGemini>[1]>

export async function generateSeriesThumbnailImage(
  series: Series,
  customPrompt?: string
): Promise<{ base64: string; promptUsed: string; attempt: number }> {
  const attempts: Array<{
    name: string
    prompt: string
    options?: ThumbnailImagenOptions
  }> = []

  if (customPrompt?.trim()) {
    attempts.push({
      name: 'custom',
      prompt: buildSeriesThumbnailPrompt(series, customPrompt),
    })
    attempts.push({
      name: 'fallback',
      prompt: buildSeriesThumbnailFallbackPrompt(series),
    })
  } else {
    attempts.push({
      name: 'full',
      prompt: buildSeriesThumbnailPrompt(series),
    })
    attempts.push({
      name: 'fallback',
      prompt: buildSeriesThumbnailFallbackPrompt(series),
      options: { quality: 'standard' },
    })
    attempts.push({
      name: 'minimal',
      prompt: buildSeriesThumbnailMinimalPrompt(series),
      options: { personGeneration: 'dont_allow', quality: 'fast' },
    })
  }

  let lastError: Error | null = null

  for (let i = 0; i < attempts.length; i++) {
    const { name, prompt, options } = attempts[i]
    try {
      console.log(
        `[Series Thumbnail] Imagen attempt ${i + 1}/${attempts.length} (${name}), chars=${prompt.length}`
      )
      const base64 = await generateImageWithGemini(prompt, {
        aspectRatio: '16:9',
        numberOfImages: 1,
        quality: 'fast',
        ...options,
      })
      return { base64, promptUsed: prompt, attempt: i + 1 }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (!isImagenContentFilterError(lastError.message)) {
        throw lastError
      }
      console.warn(
        `[Series Thumbnail] Attempt ${i + 1} (${name}) blocked:`,
        lastError.message.split('\n')[0]
      )
    }
  }

  throw new Error(
    lastError?.message ||
      'Image generation was blocked by content safety filters. Try simplifying the series logline or use a custom prompt.'
  )
}
