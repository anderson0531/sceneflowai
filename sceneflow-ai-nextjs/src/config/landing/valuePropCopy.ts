/**
 * Canonical value proposition copy for the live landing page.
 */

export const HERO_COPY = {
  headline: 'From concept to publish-ready video — one automated studio.',
  subheadline:
    'No prompt stacks or tool hopping. Guided Blueprint → Production → Final Cut → Premiere. Review storyboard beats and Beat Frames before generating final video — fewer blind regenerations.',
  pipelineLine: 'Blueprint → Production → Final Cut → Premiere',
  ctaPrimary: 'Test the Full Pipeline — $9',
  ctaSecondary: "Watch the 'What's Possible' Reel",
} as const

export const VP_STRIP_PILLS = [
  { label: 'One Platform', detail: 'Concept to publish in one studio' },
  { label: 'Beat-First Video', detail: 'Approve visuals before F2V render' },
  { label: 'Audience Resonance', detail: 'Optimize story before heavy spend' },
  { label: 'Publish-Ready Output', detail: 'Master MP4 + distribution bundles' },
] as const

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
export const PAYMENT_PROCESSOR_NAME = 'Paddle'

export const MOR_FOOTER_LINE =
  'Secure payments, tax calculation, and compliance are handled by Paddle, our Merchant of Record, on behalf of Life Focus, LLC.'
