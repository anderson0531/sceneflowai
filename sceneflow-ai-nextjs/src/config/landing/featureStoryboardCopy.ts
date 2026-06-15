/**
 * Platform walkthrough feature cards — translatable strings only.
 * Media URLs live in featureStoryboardMedia.ts
 *
 * Curated 10-video set for Google Startups / Platform Walkthrough (June 2026).
 */
import {
  WORKFLOW_PHASES,
  SCREENING_ROOM_COPY,
} from '@/config/landing/workflowPhaseCopy'

export const FEATURE_STORYBOARD_SECTION = {
  subheading: 'Under the hood — guided clips for technical reviewers',
  chapterHint: 'Expand for series planning, reference continuity, production depth, and trust & safety.',
  expandChapter: 'Show features',
  collapseChapter: 'Hide features',
  underTheHood: 'Under the hood',
} as const

/** Walkthrough card IDs shown on landing (detailed / under-the-hood set). */
export const WALKTHROUGH_CARD_IDS = [1, 9, 10, 5, 7, 11, 14, 16] as const

export const FEATURE_CHAPTERS = [
  {
    id: 'start-here',
    label: 'Start here — plan, continuity, and audience fit',
    cardIds: [1, 9, 10, 5, 7],
    defaultExpanded: false,
  },
  {
    id: 'produce-publish',
    label: 'Produce and publish — Shoot tab to Screening Room',
    cardIds: [11, 14, 16],
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

  return [
    {
      id: 1,
      title: 'Platform Overview',
      description:
        'One studio from idea to publish-ready video. Same pipeline for training, podcasts, news, and cinematic series — approve pre-vis before final render spend.',
      keyFeatures: [
        'Series → Blueprint → Production → Screening Room',
        'Beat-first approval — pre-vis and Beat Frames before F2V',
        'Google Vertex AI generation with native Veo extension chains',
        'Trust & Safety guardrails and signed provenance on delivery',
      ],
      screenshotSlot: 'Insert screenshot: Landing hero + simplified walkthrough strip',
      videoSlot:
        'Insert 01:30 clip: Hero → new project → Blueprint → Production Shoot → Screening Room → Publish',
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
      screenshotSlot: 'Insert screenshot: Production dashboard showing Script tab, Shoot tab, and Pre-Vis',
      videoSlot:
        'Insert 00:60 clip: Lock script → Express Pre-vis per scene → Shoot Footage → Mixer → Streams',
    },
    {
      id: 14,
      title: SCREENING_ROOM_COPY.title,
      description: SCREENING_ROOM_COPY.description,
      keyFeatures: [...SCREENING_ROOM_COPY.keyFeatures],
      screenshotSlot: SCREENING_ROOM_COPY.screenshotSlot,
      videoSlot: SCREENING_ROOM_COPY.videoSlot,
    },
    TRUST_SAFETY_WALKTHROUGH,
  ]
}
