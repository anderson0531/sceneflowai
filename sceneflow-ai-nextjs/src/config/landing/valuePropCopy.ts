/**
 * Canonical value proposition copy for the live landing page.
 */

export const HERO_COPY = {
  eyebrow: 'The first AI pipeline for long-form video and series',
  availabilityBadge: 'Full access opens November 2026',
  headline: 'Build Worlds. Not Just Clips.',
  subheadline:
    'Don\u2019t settle for isolated generations. SceneFlow maintains character continuity, persistent environments, and complex narratives from your first scene to your hundredth \u2014 then ships it as a multi-language master.',
  ctaPrimaryLaunch: 'Start Your Production',
  ctaSupportingLine: '',
  ctaSecondary: 'Explore How It Works',
  ctaToolStack: 'See how it replaces your tool stack',
} as const

export const HERO_VALUE_CHIPS = [
  {
    label: 'Persistent Continuity',
    detail: 'The Reference Library locks faces, wardrobe, voices, and locations through scene 100.',
  },
  {
    label: 'Direct Before You Render',
    detail: 'Lock a feature-length animatic on low-cost beat frames, then pay for high-res.',
  },
  {
    label: 'Built for Every Audience',
    detail: 'Produce, dub, and tune for each culture and region in 70+ languages.',
  },
] as const

/** Launch-notification capture — shared by the hero and the final CTA. */
export const NOTIFY_COPY = {
  heading: 'Get notified when access opens',
  description:
    'Studio access opens in November 2026. Leave your email and we\u2019ll tell you the day it does.',
  placeholder: 'you@studio.com',
  submit: 'Notify me',
  submitting: 'Sending\u2026',
  successTitle: 'You\u2019re on the list.',
  successBody: 'We\u2019ll email you as soon as November access opens. Nothing else.',
  errorEmpty: 'Enter your email so we can reach you.',
  errorInvalid: 'That email doesn\u2019t look right. Check it and try again.',
  errorGeneric: 'Something went wrong. Try again in a moment.',
  privacy: 'One email at launch. No spam, unsubscribe anytime.',
} as const

export const HERO_PIPELINE_STEPS = ['Blueprint', 'Production', 'Screening Room'] as const

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
    narrative:
      'You have the story, but every episode means re-exporting assets, re-prompting in new tabs, and hoping continuity holds. SceneFlow connects Series Studio, Blueprint Studio, and Production Studio in one studio — so you approve the look in pre-vis, generate scene by scene, and ship consistent episodes on schedule instead of rebuilding from scratch.',
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
    narrative:
      'Internal video requests pile up while agency quotes stretch timelines and brand guidelines drift in every revision round. SceneFlow puts L&D, comms, and product explainers in one guided workflow — your team owns the script, pre-vis, and master output without renting a studio or waiting on vendors.',
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
    narrative:
      'Custom video work is profitable until every client becomes a one-off — new tools, new handoffs, and margins that vanish in rework. SceneFlow turns your niche into a product: repeatable intake, white-label templates, voice-cloned narration, and a clear path from brief to delivered MP4.',
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
    narrative:
      'Winning the pitch means showing the idea — not describing it — but pre-viz and localization eat the margin before the contract is signed. SceneFlow gets client-ready pre-viz in front of stakeholders fast, then scales delivery across campaigns and 70+ languages without rebuilding the pipeline per account.',
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
  {
    id: 'filmProduction',
    hash: 'use-cases-film-production',
    label: 'Film Production',
    outcome: 'Script to an interactive animatic you can screen and test before you shoot',
    narrative:
      'Previz and audience testing used to mean weeks of storyboards, temp VO, and expensive guesswork before cameras roll. SceneFlow takes your script to an interactive animatic with Express pre-vis — optimize with Audience Resonance, screen it in the Screening Room, and commit budget only when the story lands.',
    useCases: [
      'Feature & indie previz',
      'Investor pitch animatics',
      'Audience Resonance optimization',
      '70+ language pre-vis',
      'Script import & export (MDX, FDX)',
      'Screening Room audience tests',
    ],
    defaultCategoryId: 'entertainment',
    icon: 'clapperboard' as const,
  },
] as const

export function getAudiencePathByPersonaId(personaId: string) {
  return AUDIENCE_PATHS.find((path) => path.id === personaId)
}

export function getDefaultCategoryIdForPersona(personaId: string): string {
  return getAudiencePathByPersonaId(personaId)?.defaultCategoryId ?? 'property'
}

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
    'Production Mixer — timing, audio, and stream export to Screening Room',
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
    'Series is optional. The core path is Blueprint Studio → Production Studio → Screening Room — pre-vis, animatic, scene video, and master MP4 along the way.',
  tagline: 'Every step is expertly automated. Every step gives you full control.',
} as const

export const SLOT_MACHINE_HEADER = {
  title: 'Stop pulling the lever. Start running a production.',
  subtitle:
    'Clip generators re-roll the dice on every prompt — new face, new room, new voice. SceneFlow reads every shot from the same locked references, so scene 100 still matches scene 1.',
} as const

export const FINAL_CTA_COPY = {
  title: 'Built for the stories that have to hold.',
  subtitle:
    'Full access opens November 2026. Leave your email and we\u2019ll tell you the day it does — or start directing now from the $9 Explorer plan.',
  cta: 'Explore plans',
  ctaSecondary: 'See how it works',
  ctaSecondaryHref: '#key-features',
} as const

/** Payment processor — name consistently for MoR compliance */
export const PAYMENT_PROCESSOR_NAME = 'Whop'

export const MOR_FOOTER_LINE =
  'Secure payments, tax calculation, and compliance are handled by Whop, our Merchant of Record, on behalf of Life Focus, LLC.'
