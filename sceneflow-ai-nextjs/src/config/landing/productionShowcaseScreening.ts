/** Public storyboard share slugs for Production Examples Screening Room embeds. Empty = placeholder UI. */

export const PRODUCTION_SHOWCASE_SCREENING_SLUGS = {
  drama: '',
  animation: '',
  podcast: '',
  training: '',
} as const

export type ProductionShowcaseScreeningCardId =
  keyof typeof PRODUCTION_SHOWCASE_SCREENING_SLUGS

export function getProductionShowcaseScreeningSlug(cardId: string): string | null {
  const slug =
    PRODUCTION_SHOWCASE_SCREENING_SLUGS[
      cardId as ProductionShowcaseScreeningCardId
    ]?.trim() ?? ''
  return slug || null
}
