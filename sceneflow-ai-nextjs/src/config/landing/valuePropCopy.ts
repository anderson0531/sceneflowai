/**
 * Canonical value proposition copy for the live landing page.
 */

export const HERO_COPY = {
  headline: 'Stop juggling five AI tabs. One studio takes you from idea to publish-ready video.',
  subheadline:
    'One guided studio from idea to publish-ready master. See your pre-vis before you pay for final video — approve the look instead of burning credits on guess-and-check generations. SceneFlow automates the busywork — script, pre-vis, voice, and assembly — while you stay in control of every beat.',
  audienceMicroLine:
    'Built for creators who want results, and teams who want to see how it works.',
  ctaSecondary: "Watch the 'What's Possible'",
  ctaToolStack: 'See how it replaces your tool stack',
} as const

export const AUDIENCE_PATH_MODES = {
  automate: {
    label: 'Automate it',
    description: 'Guided workflow — approve pre-vis, ship faster',
  },
  engine: {
    label: 'Show me the engine',
    description: 'Architecture, BYOK, and platform depth',
  },
} as const

export const VP_STRIP_PILLS = [
  { label: 'One Studio', detail: 'Concept to publish in one place' },
  { label: 'Approve Before Final Video', detail: 'Review pre-vis beats before you render' },
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
      '16:9 YouTube TV drama',
      '9:16 vertical mobile drama',
      'Animated web series',
      'YouTube & episodic series',
      'Video podcasts & show clips',
      'Documentaries & docuseries',
      'Sports recaps & commentary',
    ],
    defaultCategoryId: 'entertainment',
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
      'Video memoir packages',
      'Legacy & tribute videos',
      'Voice-cloned narration',
      'White-label studio templates',
      'Real estate & hospitality tours',
      'Subscription video services',
    ],
    defaultCategoryId: 'knowledge',
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
  intro:
    'No guess-and-check generations. You preview and approve the look before SceneFlow spends credits on final video.',
  description:
    'SceneFlow structures visual approval at every step: Express Pre-vis for review, Beat Frames to lock composition, then F2V per beat. You refine the look before burning credits on drift and hallucinations.',
  steps: [
    'Express Pre-vis — share audio-visual beats for review in minutes',
    'Beat Frames — lock start/end composition with Reference Library continuity',
    'F2V per beat — generate video from approved frames, not blind prompts',
    'Continuous EXT chain — native +7s extension steps for long dialogue beats',
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
  ],
} as const

export const HOW_IT_WORKS_HEADER = {
  title: 'From concept to publish-ready video',
  titleAccent: 'One guided pipeline',
  subtitle:
    'Series is optional. The core path is Blueprint → Production → Final Cut → Premiere — pre-vis, animatic, video, and master MP4 tiers along the way.',
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
    'Run concept → pre-vis → video → master MP4 in one studio. Start with the $9 Explorer plan and see the beat-first workflow in action.',
  cta: 'Launch Your Studio for $9',
} as const

/** Payment processor — name consistently for MoR compliance */
export const PAYMENT_PROCESSOR_NAME = 'Whop'

export const MOR_FOOTER_LINE =
  'Secure payments, tax calculation, and compliance are handled by Whop, our Merchant of Record, on behalf of Life Focus, LLC.'
