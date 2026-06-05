/**
 * Platform walkthrough feature cards — translatable strings only.
 * Media URLs live in featureStoryboardMedia.ts
 *
 * Curated 10-video set for Google Startups / Platform Walkthrough (June 2026).
 */
import {
  WORKFLOW_PHASES,
} from '@/config/landing/workflowPhaseCopy'

export const FEATURE_STORYBOARD_SECTION = {
  subheading: 'Nine guided clips — full pipeline in under 15 minutes',
  chapterHint: 'Start with planning and continuity, then expand to produce and publish.',
  expandChapter: 'Show features',
  collapseChapter: 'Hide features',
  underTheHood: 'Under the hood',
} as const

/** Walkthrough card IDs shown on landing (10 clips). */
export const WALKTHROUGH_CARD_IDS = [1, 9, 10, 5, 7, 11, 12, 13, 16] as const

export const FEATURE_CHAPTERS = [
  {
    id: 'start-here',
    label: 'Start here — plan, continuity, and audience fit',
    cardIds: [1, 9, 10, 5, 7],
    defaultExpanded: true,
  },
  {
    id: 'produce-publish',
    label: 'Produce and publish — beats to master MP4',
    cardIds: [11, 12, 13, 16],
    defaultExpanded: false,
  },
] as const

export type FeatureStoryboardUnderTheHood = {
  title: string
  body: string
  bullets: string[]
}

export type FeatureStoryboardMessageItem = {
  id: number
  title: string
  description: string
  keyFeatures: string[]
  screenshotSlot: string
  videoSlot: string
  underTheHood?: FeatureStoryboardUnderTheHood
}

export const FEATURE_STORYBOARD_UI = {
  screenshot: 'Screenshot',
  video: 'Video',
  featureVideo: 'Feature Video',
  keyFeatures: 'Key features',
  openScreenshot: 'Open screenshot',
  openFeatureVideo: 'Open feature video',
  expandImage: 'Expand Image',
  closePreview: 'Close Preview',
} as const

/** @deprecated Use WALKTHROUGH_CARD_IDS — kept for any legacy imports */
export const FEATURE_DISPLAY_ORDER = [...WALKTHROUGH_CARD_IDS]

const TRUST_SAFETY_WALKTHROUGH = {
  id: 16,
  title: 'Trust & Safety',
  description:
    'Layered guardrails on every generation path: Google Vertex AI safety, Extended Creative Services with Guardrails, optional Studio content validation, and signed provenance on segment video.',
  keyFeatures: [
    'Google-native safety — Vertex Responsible AI on all generation',
    'Guarded fallback — pre-storage review on alternate paths',
    'Studio content validation — policy signals before heavy render',
    'Violation enforcement — documented strikes and suspension thresholds',
    'Signed provenance — content hashes and audit logs at delivery',
  ],
  screenshotSlot: 'Insert screenshot: Trust & Safety landing section or Studio validation panel',
  videoSlot:
    'Insert 00:45 clip: Landing trust tiers → Studio validation signals → guarded-path block → provenance metadata → /trust-safety policy',
} as const

export function buildFeatureStoryboardMessageItems(): FeatureStoryboardMessageItem[] {
  const series = WORKFLOW_PHASES[0]
  const blueprint = WORKFLOW_PHASES[1]
  const production = WORKFLOW_PHASES[2]
  const finalCut = WORKFLOW_PHASES[3]
  const premiere = WORKFLOW_PHASES[4]

  return [
    {
      id: 1,
      title: 'Platform Overview',
      description:
        'One studio from idea to publish-ready video. Same pipeline for training, podcasts, news, and cinematic series — approve storyboards before final render spend.',
      keyFeatures: [
        'Series → Blueprint → Production → Final Cut → Premiere',
        'Beat-first approval — storyboard and Beat Frames before F2V',
        'Google Vertex AI generation with native Veo extension chains',
        'Trust & Safety guardrails and signed provenance on delivery',
      ],
      screenshotSlot: 'Insert screenshot: Landing hero + How It Works pipeline strip',
      videoSlot:
        'Insert 01:30 clip: Hero → new project → Blueprint resonance flash → Production beat-first → Final Cut → Premiere → Trust & Safety',
    },
    {
      id: 9,
      title: 'Series Automation',
      description: series.description,
      keyFeatures: [...series.keyFeatures],
      screenshotSlot: 'Insert screenshot: Series overview with auto-generated episode arcs',
      videoSlot: 'Insert 00:30 clip: Concept expanding into a multi-episode season',
    },
    {
      id: 10,
      title: 'Blueprint Automation',
      description: blueprint.description,
      keyFeatures: [...blueprint.keyFeatures],
      screenshotSlot: 'Insert screenshot: Auto-generated Blueprint with story beats and character arcs',
      videoSlot: 'Insert 00:30 clip: Turning a concept into a structured Blueprint',
    },
    {
      id: 5,
      title: 'Shared Reference Library for Continuity',
      description:
        'Maintain consistent characters, wardrobe, voices, locations, and props across scenes and episodes with reusable references.',
      keyFeatures: [
        'Reusable profiles — characters, wardrobe, voices, locations, and props',
        'Cross-scene application — references flow into every generation',
        'Visual consistency — same faces and tone in Imagen and Veo outputs',
        'Franchise-scale continuity — built for multi-episode series',
      ],
      screenshotSlot: 'Insert screenshot: Reference library showing character and prop continuity',
      videoSlot: 'Insert 00:30 clip: Applying references across multiple scenes',
    },
    {
      id: 7,
      title: 'Audience Resonance Editor',
      description:
        'Determine your target audience to get instant scoring, analysis, and recommendations. Apply one-click fixes or use Guided Edits to perfectly optimize your Episodes, Blueprint, and Script for maximum impact.',
      keyFeatures: [
        'Target-audience scoring — with category breakdown',
        'Section-tied recommendations — fix the right part of your story',
        'One-click fixes and Guided Edit — precise rewrites, not guesswork',
        'Production-ready threshold — know when to invest in full render',
      ],
      screenshotSlot: 'Insert screenshot: Resonance Editor with audience scoring and one-click fixes',
      videoSlot: 'Insert 00:30 clip: Applying guided edits based on audience resonance score',
    },
    {
      id: 11,
      title: 'Production Automation',
      description: production.description,
      keyFeatures: [...production.keyFeatures],
      screenshotSlot: 'Insert screenshot: Production dashboard showing script, Beat Frames, and Mixer',
      videoSlot:
        'Insert 00:60 clip: Lock script → Express storyboard → Beat Frames → EXT chain (+7s) → send stream to Final Cut',
    },
    {
      id: 12,
      title: 'Final Cut Assembly',
      description: finalCut.description,
      keyFeatures: [...finalCut.keyFeatures],
      screenshotSlot: 'Insert screenshot: Final Cut assembly panel with per-scene stream pickers',
      videoSlot: 'Insert 00:30 clip: Picking streams, previewing assembly, and exporting master',
    },
    {
      id: 13,
      title: 'Premiere Distribution',
      description: premiere.description,
      keyFeatures: [
        ...premiere.keyFeatures,
        'Screening Room folded in — /s/ review links before publish',
      ],
      screenshotSlot: 'Insert screenshot: Premiere dashboard with insights and publish wizard',
      videoSlot:
        'Insert 00:45 clip: Master import → screening /s/ link → insights → YouTube wizard or export bundle',
    },
    TRUST_SAFETY_WALKTHROUGH,
  ]
}
