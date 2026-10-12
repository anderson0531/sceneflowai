/**
 * One clipboard document: the three series inputs, then the three hero scripts.
 */

import { EXAMPLE_SERIES_INPUTS, formatSeriesInput } from '@/config/landing/exampleSeriesInputs'
import { HERO_SECTION_SCRIPTS, formatHeroVideoScript } from '@/config/landing/heroSectionScripts'

export function formatFrontPageCopyPack(): string {
  const series = EXAMPLE_SERIES_INPUTS.map(formatSeriesInput).join('\n\n---\n\n')
  const scripts = HERO_SECTION_SCRIPTS.map(formatHeroVideoScript).join('\n\n---\n\n')
  return `SERIES INPUTS\n\n${series}\n\n---\n\nHERO VIDEO SCRIPTS\n\n${scripts}`
}
