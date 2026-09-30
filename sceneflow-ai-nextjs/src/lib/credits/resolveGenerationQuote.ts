import { findPublishedRate } from './rateCardStore'
import {
  quoteGenerationCredits,
  type GenerationQuote,
  type QuoteGenerationInput,
} from './quoteGenerationCredits'

/**
 * Prefer a published credit_pricing row. Fall back to seeded list prices
 * when the table is empty or the database is unavailable.
 */
export async function resolveGenerationQuote(input: QuoteGenerationInput): Promise<GenerationQuote> {
  const seeded = quoteGenerationCredits(input)
  try {
    const published = await findPublishedRate(seeded.operation)
    if (!published) return seeded
    return quoteGenerationCredits({
      ...input,
      model: input.model || published.model,
      rate: {
        usdPerUnit: published.usdPerUnit,
        markup: published.markup,
        creditsPerUnitOverride: published.creditsPerUnitOverride,
      },
    })
  } catch (error) {
    console.warn('[resolveGenerationQuote] Using seeded rate:', error)
    return seeded
  }
}
