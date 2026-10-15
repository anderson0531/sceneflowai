import { resolveContentIntent, type ContentIntent } from '@/lib/content/contentIntent'

/** Used when neither the Blueprint nor the series stored a tone. */
export const DEFAULT_BLUEPRINT_TONE = 'Cinematic'

function firstText(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return ''
}

function defaultGenre(intent: ContentIntent): string {
  if (intent === 'informational') return 'Documentary'
  if (intent === 'commercial') return 'Commercial'
  if (intent === 'conversational') return 'Conversational'
  return 'Drama'
}

export function resolveRequiredBlueprintFields(input: {
  synopsis?: string
  logline?: string
  genre?: string
  tone?: string
  toneDescription?: string
  contentIntent?: string
  fallbackSynopsis?: string
  fallbackGenre?: string
  fallbackTone?: string
  fallbackIntent?: string
}): {
  synopsis: string
  genre: string
  tone: string
  contentIntent: ContentIntent
} {
  const explicitGenre = firstText(input.genre, input.fallbackGenre)
  const explicitIntent = firstText(input.contentIntent, input.fallbackIntent) as ContentIntent | ''
  const contentIntent = explicitIntent || resolveContentIntent(explicitGenre)
  return {
    synopsis: firstText(input.synopsis, input.logline, input.fallbackSynopsis),
    genre: explicitGenre || defaultGenre(contentIntent),
    tone: firstText(input.toneDescription, input.tone, input.fallbackTone, DEFAULT_BLUEPRINT_TONE),
    contentIntent,
  }
}
