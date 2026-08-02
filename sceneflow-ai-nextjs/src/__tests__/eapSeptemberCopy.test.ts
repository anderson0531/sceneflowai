import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import enMessages from '../../messages/en.json'
import {
  EAP_COHORT_LABEL,
  EAP_COHORT_SHORT,
  EAP_MILESTONES,
} from '@/config/landing/eapCopy'
import { FINAL_CTA_COPY, HERO_COPY } from '@/config/landing/valuePropCopy'
import { TWO_MODES_COPY } from '@/config/landing/twoModesCopy'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'

const ROOT = join(process.cwd())
const OUTDATED_PATTERNS = [
  'August 2026',
  'Summer of Production',
  'July 15',
  'July 22',
  'August 1',
  'Application Window Closes',
]

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

describe('EAP September 2026 copy', () => {
  it('centralizes cohort label and September milestones', () => {
    expect(EAP_COHORT_LABEL).toContain('September 2026')
    expect(EAP_COHORT_SHORT).toBe('September 2026 cohort')
    expect(EAP_MILESTONES.length).toBeGreaterThanOrEqual(4)
    expect(EAP_MILESTONES.join('\n')).toContain('September 15, 2026')
    expect(EAP_MILESTONES.join('\n')).toContain('Application window closes')
    for (const milestone of EAP_MILESTONES) {
      expect(milestone).toMatch(/September|Ongoing/)
    }
    for (const pattern of OUTDATED_PATTERNS) {
      expect(EAP_MILESTONES.join('\n')).not.toContain(pattern)
    }
  })

  it('uses dual-mode hero CTAs and $9 in director card / pricing, not hero supporting line', () => {
    expect(HERO_COPY.ctaPrimaryLaunch).toBe('Start with Go Mode')
    expect(HERO_COPY.ctaSecondary).toBe('Explore Director Mode')
    expect(HERO_COPY.ctaSupportingLine).toBe('')
    expect(FINAL_CTA_COPY.cta).toBe('Start with Go Mode')
    expect(TWO_MODES_COPY.director.cta).toContain('$9')
    expect(FINAL_CTA_COPY.subtitle).toContain('$9')
    expect(enMessages.pricing.subtitle).toContain('September')
  })

  it('mirrors hero and final CTA strings in English messages', () => {
    expect(enMessages.hero.ctaPrimaryLaunch).toBe(HERO_COPY.ctaPrimaryLaunch)
    expect(enMessages.hero.ctaSecondary).toBe(HERO_COPY.ctaSecondary)
    expect(enMessages.hero.ctaSupportingLine).toBe(HERO_COPY.ctaSupportingLine)
    expect(enMessages.finalCta.cta).toBe(FINAL_CTA_COPY.cta)
    expect(enMessages.finalCta.subtitle).toContain('$9')
    expect(enMessages.pricing.subtitle).toContain('September')
  })

  it('loads early-access page from centralized eapCopy', () => {
    const page = readSource('src/app/early-access/page.tsx')
    expect(page).toContain("from '@/config/landing/eapCopy'")
    expect(page).toContain('EAP_MILESTONES')
    expect(page).toContain('getSignupUrlForTier')
    for (const pattern of OUTDATED_PATTERNS) {
      expect(page).not.toContain(pattern)
    }
    expect(page).not.toContain('The August 2026 Cohort')
    expect(page).not.toContain('Early Access Application')
  })

  it('renders hero secondary CTA for Director Mode exploration', () => {
    const hero = readSource('src/app/components/HeroSection.tsx')
    expect(hero).toContain("t('ctaSecondary')")
    expect(hero).toContain('scrollToTwoModes')
  })

  it('uses September cohort in EAP emails and qualification', () => {
    for (const relativePath of [
      'src/lib/email/templates/eap/applicationReceived.ts',
      'src/lib/email/templates/eap/applicationApproved.ts',
      'src/lib/email/templates/eap/applicationRejected.ts',
      'src/lib/early-access/aiQualification.ts',
      'src/app/early-access/invite/[token]/page.tsx',
    ]) {
      const source = readSource(relativePath)
      expect(source).toContain('EAP_COHORT_SHORT')
      expect(source).not.toContain('August 2026')
    }
  })

  it('keeps legal support email on sceneflowai.studio', () => {
    expect(LEGAL_SUPPORT_EMAIL).toBe('support@sceneflowai.studio')
    const privacy = readSource('src/app/(legal)/privacy/page.tsx')
    expect(privacy).toContain('LEGAL_SUPPORT_EMAIL')
    expect(privacy).not.toContain('sfai.studio')
  })
})
