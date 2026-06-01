/**
 * Platform walkthrough feature cards — translatable strings only.
 * Media URLs live in featureStoryboardMedia.ts
 */
import {
  SCREENING_ROOM_COPY,
  WORKFLOW_PHASES,
} from '@/config/landing/workflowPhaseCopy'

export const FEATURE_STORYBOARD_SECTION = {
  subheading: 'Explore the platform — start with essentials',
  chapterHint: 'Four things to know today. Expand chapters when you want the full picture.',
  expandChapter: 'Show features',
  collapseChapter: 'Hide features',
  underTheHood: 'Under the hood',
} as const

export const FEATURE_CHAPTERS = [
  {
    id: 'essentials',
    label: 'Start here — what you get on day one',
    cardIds: [1, 3, 4, 6],
    defaultExpanded: true,
  },
  {
    id: 'quality',
    label: 'Make it land with your audience',
    cardIds: [5, 7, 8, 9],
    defaultExpanded: false,
  },
  {
    id: 'production',
    label: 'From approved beats to published master',
    cardIds: [10, 11, 12, 13, 14],
    defaultExpanded: false,
  },
  {
    id: 'advanced',
    label: 'For teams who want billing and governance',
    cardIds: [2],
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

export function buildFeatureStoryboardMessageItems(): FeatureStoryboardMessageItem[] {
  return [
    {
      id: 1,
      title: 'Intuitive UX + Full Creator Control',
      description:
        'Start fast with guided automation, then edit every generated output so teams keep creative control without losing speed.',
      keyFeatures: [
        'Guided Studio workflow — from concept to export in one place',
        'Edit every AI-generated beat, character, and line in place',
        'Treatment variants — side-by-side compare for creative direction',
        'Blueprint Collaborate — share links, section audio, and structured reviewer feedback',
      ],
      screenshotSlot: 'Insert screenshot: Blueprint editor with editable generated sections',
      videoSlot: 'Insert 00:30 clip: UX flow from concept to editable output',
    },
    {
      id: 2,
      title: 'Credit Budget & Cost Control',
      description:
        'Track credit usage in real time and set guardrails before expensive generation runs.',
      keyFeatures: [
        'Real-time credit usage — by project and operation',
        'Production guardrails — before costly generation runs',
        'Transparent rate cards — for TTS, video, and intelligence',
        'Budget visibility — for teams and solo creators',
      ],
      underTheHood: {
        title: 'Under the hood',
        body: 'For production teams with existing cloud contracts:',
        bullets: [
          'Vertex AI BYOK — enterprise billing and governance',
          'Provider toggles in the credit calculator',
          'Transparent platform rate cards alongside your keys',
        ],
      },
      screenshotSlot: 'Insert screenshot: credit usage panel and BYOK settings',
      videoSlot: 'Insert 00:30 clip: budget dashboard and key configuration',
    },
    {
      id: 3,
      title: 'Any Concept, One Production Workflow',
      description:
        'Use one reliable pipeline for training, podcasts, news, home sales videos, and cinematic content.',
      keyFeatures: [
        'One pipeline — podcast, news, training, real estate, and cinematic formats',
        'Project templates — Studio adapts to your source material',
        'Same Blueprint → Script → Production path — regardless of genre',
        'No tool-switching — from ideation through delivery',
      ],
      screenshotSlot:
        'Insert screenshot: Split-view or grid showing Podcast, News, Real Estate, and Cinematic templates feeding into one unified SceneFlow pipeline UI.',
      videoSlot:
        'Insert 00:30 clip: "Start with any source material..." clicking New Project -> Podcast (UI adapts to audio), then showing split screen of News & Cinematic projects converging into the Blueprint editor.',
    },
    {
      id: 4,
      title: 'Smart Automation with Precision Edit Control',
      description:
        'The SceneFlow platform uses intelligence to automatically generate a professional baseline (series, blueprint, script, production prompts, and edits) while providing intelligent dialogs that give you full edit control with built-in guardrails.',
      keyFeatures: [
        'AI baselines in one pass — series, blueprint, script, and production prompts',
        'Intelligent edit dialogs — guardrails, not blind rewrites',
        'Accept, refine, or reject — every suggestion stays under your control',
        'Human-in-the-loop — at every phase of production',
      ],
      screenshotSlot: 'Insert screenshot: Intelligent dialog showing baseline generation with edit controls',
      videoSlot: 'Insert 00:30 clip: AI baseline generation followed by user making precise edits',
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
      id: 6,
      title: 'Express Generation Engine',
      description:
        'Auto-generate images and video segments concurrently. Express Storyboard lets you review and share audio-visual storyboards in minutes. Express Animatics renders full Ken Burns scenes in minutes, while Express Video delivers final video scenes in minutes instead of days.',
      keyFeatures: [
        'Concurrent generation — images and video across scenes at once',
        'Express Storyboard — shareable audio-visual previews in minutes',
        'Express Animatics — Ken Burns motion from stills',
        'Express Video — scene-level clips in minutes, not days',
      ],
      screenshotSlot: 'Insert screenshot: Express generation dashboard with Animatics and Video progress',
      videoSlot: 'Insert 00:30 clip: Concurrent generation turning script into animatic then final video',
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
      id: 8,
      title: 'Adaptive Translation (70+ Languages)',
      description:
        'Localize content at scale while preserving narrative intent and timeline alignment for multilingual delivery.',
      keyFeatures: [
        '70+ languages — narration, dialogue, and copy at scale',
        'Narrative intent preserved — meaning and timing stay aligned',
        'Multi-language audio tracks — on the scene timeline',
        'Export-ready packages — per locale for distribution',
      ],
      screenshotSlot: 'Insert screenshot: Multi-language timeline and translation settings',
      videoSlot: 'Insert 00:30 clip: Instantly localizing a scene into multiple languages',
    },
    {
      id: 9,
      title: 'Series Automation',
      description: WORKFLOW_PHASES[0].description,
      keyFeatures: [...WORKFLOW_PHASES[0].keyFeatures],
      screenshotSlot: 'Insert screenshot: Series overview with auto-generated episode arcs',
      videoSlot: 'Insert 00:30 clip: Concept expanding into a multi-episode season',
    },
    {
      id: 10,
      title: 'Blueprint Automation',
      description: WORKFLOW_PHASES[1].description,
      keyFeatures: [...WORKFLOW_PHASES[1].keyFeatures],
      screenshotSlot: 'Insert screenshot: Auto-generated Blueprint with story beats and character arcs',
      videoSlot: 'Insert 00:30 clip: Turning a concept into a structured Blueprint',
    },
    {
      id: 11,
      title: 'Production Automation',
      description: WORKFLOW_PHASES[2].description,
      keyFeatures: [...WORKFLOW_PHASES[2].keyFeatures],
      screenshotSlot: 'Insert screenshot: Production dashboard showing script, Beat Frames, and Mixer',
      videoSlot: 'Insert 00:30 clip: Foundation, Express storyboard, Beat Frames, and stream export',
    },
    {
      id: 12,
      title: 'Final Cut Assembly',
      description: WORKFLOW_PHASES[3].description,
      keyFeatures: [...WORKFLOW_PHASES[3].keyFeatures],
      screenshotSlot: 'Insert screenshot: Final Cut assembly panel with per-scene stream pickers',
      videoSlot: 'Insert 00:30 clip: Picking streams, previewing assembly, and exporting master',
    },
    {
      id: 13,
      title: 'Premiere Distribution',
      description: WORKFLOW_PHASES[4].description,
      keyFeatures: [...WORKFLOW_PHASES[4].keyFeatures],
      screenshotSlot: 'Insert screenshot: Premiere dashboard with insights and publish wizard',
      videoSlot: 'Insert 00:30 clip: Screening insights, YouTube wizard, and export bundles',
    },
    {
      id: 14,
      title: SCREENING_ROOM_COPY.title,
      description: SCREENING_ROOM_COPY.description,
      keyFeatures: [...SCREENING_ROOM_COPY.keyFeatures],
      screenshotSlot: SCREENING_ROOM_COPY.screenshotSlot,
      videoSlot: SCREENING_ROOM_COPY.videoSlot,
    },
  ]
}

export const FEATURE_DISPLAY_ORDER = [1, 3, 4, 6, 5, 7, 8, 9, 10, 11, 12, 13, 14, 2]
