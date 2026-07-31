/** Early Access Program — shared cohort copy for landing, /early-access, emails, and AI qualification. */

export const EAP_COHORT_LABEL = 'September 2026 Early Access Cohort'
export const EAP_COHORT_SHORT = 'September 2026 cohort'

export const EAP_HERO_BADGE = EAP_COHORT_LABEL

export const EAP_HERO_HEADLINE = 'Stop Generating. Start Architecting.'

export const EAP_HERO_DESCRIPTION =
  'Join the SceneFlow Early Access Program — a limited September 2026 cohort with Google-powered intelligence, your choice of Google or Kling generation, consistency controls, multi-language delivery, and Screening Room review. Shape the roadmap as a paid beta partner.'

export const EAP_EXPLORER_NOTE =
  'Prefer low-friction entry? Start with the $9 Explorer plan — full pipeline access with limited credits. Studio onboarding for the September cohort begins mid-month.'

export const EAP_COHORT_SECTION_TITLE = 'The September 2026 Cohort'

export const EAP_MILESTONES = [
  'Early September 2026: Early Access opens — Founding Creator spots available',
  'Mid-September 2026: Cohort onboarding and full studio access begins',
  'Late September / Early October 2026: First Engineering Roundtable with the engineering team',
  'Ongoing: Priority access to new intelligence features',
] as const

export const EAP_WHAT_YOU_WILL_TEST = [
  'Google-powered intelligence: scripting, Audience Resonance, and optimization on Vertex AI — exclusive to Google.',
  'Multi-model generation: choose Google (Imagen/Veo) or Kling for frame and video synthesis, orchestrated on Google Cloud.',
  'Persistent DNA: lock character wardrobes, prop geometry, and location physics across an entire season.',
  'Global Resonance: deploy content in 75+ languages with localized dubbing that maintains emotional tone.',
  'One-Take Accuracy: master the F2V (Frame-to-Video) workflow for scenes with unprecedented control.',
  'Screening Room review: walk pre-vis → animatic → scene video → final master with structured feedback.',
] as const

export const EAP_FOUNDING_CREATOR_BENEFITS = [
  'Higher credit allocation and priority generation queue',
  'Direct feedback channel to founder and engineering',
  'Early access to new intelligence features',
  'Credit carry-over or discount when public pricing launches',
  'Limited cohort — help shape the SceneFlow roadmap',
] as const

export const EAP_JOIN_SECTION_TITLE = 'Join the September Cohort'

export const EAP_JOIN_SECTION_INTRO =
  'Two paths into Early Access: start immediately with Explorer ($9), or reserve Founding Creator access with a short director profile for the September cohort.'

export const EAP_EXPLORER_BOX_TITLE = 'Explorer — $9 one-time'

export const EAP_EXPLORER_BOX_DESCRIPTION =
  'Full pipeline access with limited credits. Checkout now and join the September Early Access cohort as it opens.'

export const EAP_EXPLORER_BOX_CTA = 'Launch Your Studio ($9) — September Cohort'

export const EAP_FOUNDING_FORM_TITLE = 'Founding Creator — reserve your spot'

export const EAP_FOUNDING_FORM_INTRO =
  'Complete a short director profile so we can onboard you when the September cohort opens. Email verification required.'

export function eapWizardStepLabel(step: number, total: number, stepTitle: string): string {
  return `Step ${step} of ${total} — reserve your September cohort spot · ${stepTitle}`
}
