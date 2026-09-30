import {
  KLING_PRICING_SOURCE_URL,
  OMNI_PRICING_SOURCE_URL,
  klingQuotesFromParsed,
  omniQuotesFromParsed,
  parseKlingOmniRatesFromMarkdown,
  parseOmniRatesFromText,
} from './quoteGenerationCredits'

export interface FetchedRateUpdate {
  operation: string
  usdPerUnit: number
  sourceUrl: string
}

export interface FetchedProviderQuotes {
  fetchedAt: string
  updates: FetchedRateUpdate[]
  errors: string[]
}

async function readText(url: string, label: string, errors: string[]): Promise<string> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'text/html, text/plain, text/markdown, */*' },
    })
    if (!response.ok) {
      errors.push(`${label} pricing returned HTTP ${response.status}`)
      return ''
    }
    return await response.text()
  } catch (error) {
    errors.push(`${label} pricing fetch failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    return ''
  }
}

export async function fetchLatestProviderQuotes(): Promise<FetchedProviderQuotes> {
  const errors: string[] = []
  const [omniText, klingText] = await Promise.all([
    readText(OMNI_PRICING_SOURCE_URL, 'Omni', errors),
    readText(KLING_PRICING_SOURCE_URL, 'Kling', errors),
  ])

  const updates: FetchedRateUpdate[] = [
    ...omniQuotesFromParsed(parseOmniRatesFromText(omniText)).map((row) => ({
      ...row,
      sourceUrl: OMNI_PRICING_SOURCE_URL,
    })),
    ...klingQuotesFromParsed(parseKlingOmniRatesFromMarkdown(klingText)).map((row) => ({
      ...row,
      sourceUrl: KLING_PRICING_SOURCE_URL,
    })),
  ]

  if (omniText && !updates.some((row) => row.operation.startsWith('omni_'))) {
    errors.push('Omni pricing page did not include recognizable per-second rates. Enter them manually.')
  }
  if (klingText && !updates.some((row) => row.operation.startsWith('kling_'))) {
    errors.push('Kling pricing page did not include recognizable Omni rates. Enter them manually.')
  }

  return {
    fetchedAt: new Date().toISOString(),
    updates,
    errors,
  }
}
