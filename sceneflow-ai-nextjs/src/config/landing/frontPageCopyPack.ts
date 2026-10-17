/**
 * One clipboard document: hero landing copy, production example blurbs,
 * the three series inputs, and the three hero video scripts.
 */

import { DIRECT_CONTROL_COPY } from '@/config/landing/directControlCopy'
import { EXAMPLE_SERIES_INPUTS, formatSeriesInput } from '@/config/landing/exampleSeriesInputs'
import { HERO_SECTION_SCRIPTS, formatHeroVideoScript } from '@/config/landing/heroSectionScripts'
import { PRODUCTION_SHOWCASE_COPY } from '@/config/landing/productionShowcaseCopy'
import { PUBLISH_CUT_COPY } from '@/config/landing/publishCutCopy'
import { TWO_MODES_COPY } from '@/config/landing/twoModesCopy'
import { interpolateDestinations } from '@/lib/network/destinations'

type PrimaryValueCopy = {
  eyebrow: string
  title: string
  subtitle: string
  comparison?: { caption: string }
  cta?: string
}

function formatPrimaryValueSection(copy: PrimaryValueCopy, subtitle?: string): string {
  const lines = [copy.eyebrow, copy.title, subtitle ?? copy.subtitle]
  if (copy.comparison?.caption) {
    lines.push('', `Video caption: ${copy.comparison.caption}`)
  }
  if (copy.cta) {
    lines.push('', `CTA: ${copy.cta}`)
  }
  return lines.join('\n')
}

function formatProductionExamplesIntro(): string {
  const { badge, title, titleAccent, subtitle, subtitleTagline, screeningRoomInstruction } =
    PRODUCTION_SHOWCASE_COPY
  return [
    badge,
    `${title} ${titleAccent}`.trim(),
    subtitle,
    subtitleTagline,
    '',
    screeningRoomInstruction,
  ].join('\n')
}

const EXAMPLE_CARD_IDS = ['animation', 'documentary', 'training'] as const

function formatProductionExampleCards(): string {
  return PRODUCTION_SHOWCASE_COPY.cards
    .filter((card) => (EXAMPLE_CARD_IDS as readonly string[]).includes(card.id))
    .map((card) => `${card.title}\n${card.subtitle}`)
    .join('\n\n')
}

export function formatFrontPageCopyPack(): string {
  const heroLanding = [
    formatPrimaryValueSection(TWO_MODES_COPY),
    formatPrimaryValueSection(DIRECT_CONTROL_COPY),
    formatPrimaryValueSection(PUBLISH_CUT_COPY, interpolateDestinations(PUBLISH_CUT_COPY.subtitle, 'en')),
  ].join('\n\n---\n\n')

  const production = [
    formatProductionExamplesIntro(),
    '',
    '---',
    '',
    formatProductionExampleCards(),
  ].join('\n')

  const series = EXAMPLE_SERIES_INPUTS.map(formatSeriesInput).join('\n\n---\n\n')
  const scripts = HERO_SECTION_SCRIPTS.map(formatHeroVideoScript).join('\n\n---\n\n')

  return [
    'HERO LANDING COPY (friction, control, cut)',
    '',
    heroLanding,
    '',
    '---',
    '',
    'PRODUCTION EXAMPLES (section + three cards)',
    '',
    production,
    '',
    '---',
    '',
    'SERIES INPUTS (Create Series paste pack)',
    '',
    series,
    '',
    '---',
    '',
    'HERO VIDEO SCRIPTS (narration / picture / settle)',
    '',
    scripts,
  ].join('\n')
}
