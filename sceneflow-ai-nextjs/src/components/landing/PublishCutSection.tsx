'use client'

import { PrimaryValueBackdrop } from '@/components/landing/PrimaryValueBackdrop'
import { getPrimaryValueMedia } from '@/config/landing/primaryValueMedia'

export const PUBLISH_CUT_SECTION_ID = 'publish-cut'

export function PublishCutSection() {
  return (
    <PrimaryValueBackdrop
      sectionId={PUBLISH_CUT_SECTION_ID}
      namespace="publishCut"
      getMedia={getPrimaryValueMedia}
    />
  )
}

export default PublishCutSection
