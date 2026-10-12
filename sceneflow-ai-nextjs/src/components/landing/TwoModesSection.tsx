'use client'

import { PrimaryValueBackdrop } from '@/components/landing/PrimaryValueBackdrop'
import { getTwoModesMedia } from '@/config/landing/twoModesMedia'

export const TWO_MODES_SECTION_ID = 'two-modes'

/** Legacy hashes that now land on the consolidated pipeline section. */
export const TWO_MODES_HASH_ALIASES = [
  'core-capabilities',
  'audience-resonance',
  'pre-vis-engine',
] as const

export function TwoModesSection() {
  return (
    <PrimaryValueBackdrop
      sectionId={TWO_MODES_SECTION_ID}
      namespace="twoModes"
      hashAliases={TWO_MODES_HASH_ALIASES}
      getMedia={getTwoModesMedia}
    />
  )
}

export default TwoModesSection
