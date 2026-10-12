'use client'

import { PrimaryValueBackdrop } from '@/components/landing/PrimaryValueBackdrop'
import { getPrimaryValueMedia } from '@/config/landing/primaryValueMedia'

export const DIRECT_CONTROL_SECTION_ID = 'direct-control'

export function DirectControlSection() {
  return (
    <PrimaryValueBackdrop
      sectionId={DIRECT_CONTROL_SECTION_ID}
      namespace="directControl"
      getMedia={getPrimaryValueMedia}
    />
  )
}

export default DirectControlSection
