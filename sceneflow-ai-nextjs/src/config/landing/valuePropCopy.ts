/**
 * Canonical value proposition copy for the live landing page.
 */

export const HERO_COPY = {
  headline: 'Make professional video without a production team or a dozen apps.',
  subheadline:
    'One guided studio from idea to publish-ready master. See your storyboard before you pay for final video — approve the look instead of burning credits on guess-and-check generations.',
  ctaSecondary: "Watch the 'What's Possible'",
} as const

export const VP_STRIP_PILLS = [
  { label: 'One Studio', detail: 'Concept to publish in one place' },
  { label: 'Approve Before Final Video', detail: 'Review storyboard beats before you render' },
  { label: 'Test Your Story First', detail: 'Know what lands before heavy spend' },
  { label: 'Publish-Ready Output', detail: 'Master MP4 + distribution bundles' },
] as const

export const AUDIENCE_PATHS = [
  {
    id: 'creator',
    hash: 'use-cases-creator',
    label: 'Creator',
    outcome: 'Ship on schedule — stop rebuilding in every tool',
    useCases: [
      'YouTube & episodic series',
      'Video podcasts & show clips',
      'Hyper-local & JIT news',
      'Documentaries & docuseries',
      'How-to & skill channels',
      'Sports recaps & commentary',
    ],
    defaultCategoryId: 'jit',
    icon: 'video' as const,
  },
  {
    id: 'team',
    hash: 'use-cases-team',
    label: 'In-house team',
    outcome: 'Replace slow vendor cycles — control brand and budget',
    useCases: [
      'Corporate L&D & compliance',
      'Internal comms & town halls',
      'Product explainers for sales',
      'HR recruitment & culture',
      'K-12 / higher-ed lessons',
      'Public health & safety updates',
    ],
    defaultCategoryId: 'knowledge',
    icon: 'building' as const,
  },
  {
    id: 'productionShop',
    hash: 'use-cases-production-shop',
    label: 'Production shop',
    outcome: 'Productize a niche with repeatable intake → delivery',
    useCases: [
      'Real estate listing tours',
      'Corporate training for clients',
      'Education & course modules',
      'Documentary production',
      'Hospitality & tourism guides',
      'Local news as a service',
    ],
    defaultCategoryId: 'property',
    icon: 'film' as const,
  },
  {
    id: 'agency',
    hash: 'use-cases-agency',
    label: 'Agency',
    outcome: 'Faster pitches and scalable client delivery',
    useCases: [
      'Client pitch pre-viz',
      'Product launch campaigns',
      'Case studies & testimonials',
      'Event & conference promos',
      'Multi-language campaigns',
      'Property marketing for clients',
    ],
    defaultCategoryId: 'b2b',
    icon: 'briefcase' as const,
  },
] as const

export function getAudiencePathByPersonaId(personaId: string) {
  return AUDIENCE_PATHS.find((path) => path.id === personaId)
}

export function getDefaultCategoryIdForPersona(personaId: string): string {
  return getAudiencePathByPersonaId(personaId)?.defaultCategoryId ?? 'property'
}

export const INSTITUTIONAL_ROI = {
  title: 'Replace vendor shoots with predictable in-house production',
  subtitle:
    'Comms, L&D, and marketing teams of 1–5 can ship same-week video without agency retainers or open-ended edit cycles.',
  comparisons: [
    {
      label: 'Traditional vendor shoot + edit',
      cost: '$5,000–$15,000',
      timeline: '4–8 weeks',
    },
    {
      label: 'SceneFlow in-house workflow',
      cost: '$50–$500 in credits',
      timeline: 'Same week',
    },
  ],
  bullets: [
    'Brand-safe templates and approval before final render',
    'Budget caps with visible credit spend per project',
    'No crew days, no edit back-and-forth on every revision',
  ],
  ctaPrimary: 'Book a team walkthrough',
  ctaSecondary: 'See pricing',
} as const

export const ONE_TAKE_PIPELINE = {
  title: 'Beat-First Video Pipeline',
  subtitle: 'Approve before you render — not slot-machine regeneration',
  description:
    'SceneFlow structures visual approval at every step: Express storyboard for review, Beat Frames to lock composition, then F2V per beat. You refine the look before burning credits on drift and hallucinations.',
  steps: [
    'Express storyboard — share audio-visual beats for review in minutes',
    'Beat Frames — lock start/end composition with Reference Library continuity',
    'F2V per beat — generate video from approved frames, not blind prompts',
    'Production Mixer — timing, audio, and stream export to Final Cut assembly',
  ],
} as const

export const WHY_SCENEFLOW = {
  title: 'Why SceneFlow vs prompt-and-generate tools',
  subtitle: 'Gemini Studio and Google Flow excel at clips. SceneFlow bundles the full production workflow.',
  rows: [
    {
      them: 'Prompt + clip generation in isolation',
      us: 'Structured phases with editable baselines at each step',
    },
    {
      them: 'Manual consistency across sessions',
      us: 'Reference Library + Beat Frames lock visuals before video',
    },
    {
      them: 'No audience validation workflow',
      us: 'Audience Resonance before render; Screening Room before publish',
    },
    {
      them: 'No production pipeline or handoff',
      us: 'Script → streams → assembly → distribution in one app',
    },
    {
      them: 'Complex model and settings surface',
      us: 'Guided Studio UX with credits and BYOK guardrails',
    },
  ],
} as const

export const HOW_IT_WORKS_HEADER = {
  title: 'From concept to publish-ready video',
  titleAccent: 'One guided pipeline',
  subtitle:
    'Series is optional. The core path is Blueprint → Production → Final Cut → Premiere — storyboard, animatic, video, and master MP4 tiers along the way.',
  tagline: 'Every step is expertly automated. Every step gives you full control.',
} as const

export const SLOT_MACHINE_HEADER = {
  title: 'Production speed without the overhead',
  subtitle:
    'Replace fragmented prompt tools and manual assembly with one automated studio — from first concept to publish-ready master.',
} as const

export const FINAL_CTA_COPY = {
  title: 'Ready to test the full pipeline?',
  subtitle:
    'Run concept → storyboard → video → master MP4 in one studio. Start with the $9 Explorer plan and see the beat-first workflow in action.',
  cta: 'Launch Your Studio for $9',
} as const

/** Payment processor — name consistently for MoR compliance */
export const PAYMENT_PROCESSOR_NAME = 'Whop'

export const MOR_FOOTER_LINE =
  'Secure payments, tax calculation, and compliance are handled by Whop, our Merchant of Record, on behalf of Life Focus, LLC.'
