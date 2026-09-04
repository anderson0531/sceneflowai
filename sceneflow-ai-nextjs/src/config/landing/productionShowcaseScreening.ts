/** Public storyboard share slugs for Production Examples Screening Room embeds. Empty = placeholder UI. */

export const PRODUCTION_SHOWCASE_SCREENING_SLUGS: Record<string, string> = {
  drama: 'TheWhiteHouseWaltzAControlledThaw',
  animation: '',
  documentary: '',
  'localization-houston': '',
  'localization-saopaulo': '',
} as const

export type ProductionShowcaseScreeningCardId =
  keyof typeof PRODUCTION_SHOWCASE_SCREENING_SLUGS

export function getProductionShowcaseScreeningSlug(cardId: string): string | null {
  const slug =
    (PRODUCTION_SHOWCASE_SCREENING_SLUGS[cardId] ?? '').trim()
  return slug || null
}
