/**
 * Canonical workflow phase copy for landing page sections.
 * Derived from workflowGuideConfig + onboarding tours.
 */

export interface WorkflowPhaseCopy {
  id: string
  stepLabel: string
  optional?: boolean
  subtitle: string
  description: string
  keySteps: string[]
  keyFeatures: string[]
}

export const WORKFLOW_PHASES: WorkflowPhaseCopy[] = [
  {
    id: 'series',
    stepLabel: 'Series',
    optional: true,
    subtitle: 'Showrunner Engine',
    description:
      'Define your universe once and generate cohesive multi-episode arcs. Shared Reference Library keeps characters and tone aligned across the season.',
    keySteps: [
      'Define universe — characters, tone, and season arc',
      'Auto-generate episode outlines across the season',
      'Sync into Blueprint and Production per episode',
    ],
    keyFeatures: [
      'Define your universe once — characters, tone, and season arc',
      'Cohesive episode outlines — auto-generated across the season',
      'Continuity tracking — multi-episode seasons in alignment',
      'Series-to-episode sync — into Blueprint Studio and Production',
    ],
  },
  {
    id: 'blueprint',
    stepLabel: 'Blueprint',
    subtitle: 'Story Development',
    description:
      'Transform concepts into structured treatments with logline, beats, characters, and tone. Run Audience Resonance and collaborate before heavy rendering.',
    keySteps: [
      'Generate → Review → Iterate → Start Production',
      'Audience Resonance scoring with 80+ target',
      'Collaborator share links and export (PDF, Doc, PPTX)',
    ],
    keyFeatures: [
      'Generate → Review → Iterate → Start Production workflow',
      'Concept to structure in minutes — logline, beats, characters, and tone',
      'Audience Resonance scoring with 80+ target before Production',
      'Collaborator share links — feedback synthesis into guided revision',
    ],
  },
  {
    id: 'production',
    stepLabel: 'Production',
    subtitle: 'Script to Streams',
    description:
      'Script and Action tabs guide Foundation → Pre-vis → Production → Final Cut. Express Pre-vis, Beat Frames, Mixer, and MP4 streams — no tool switching.',
    keySteps: [
      'Lock script, voices, and scene audio',
      'Express Pre-vis — gallery and share for review',
      'Beat Frames → Director Console → Render Stream',
      'Send finished streams to Final Cut',
    ],
    keyFeatures: [
      'Foundation — script, voices, scene audio, lock script',
      'Express Pre-vis — direction and frames in minutes; gallery and share',
      'Beat Frames and continuous EXT chains — long dialogue via native +7s extensions',
      'Production Streams — review outputs, re-render stale beats, send to Final Cut',
    ],
  },
  {
    id: 'final-cut',
    stepLabel: 'Final Cut',
    subtitle: 'Stream Assembly',
    description:
      'Stitch finished Production streams into one master MP4. Pick Animatic or Video and language per scene — no timeline editing; creative changes stay in Production Mixer.',
    keySteps: [
      'Pick streams per scene — preset or custom mix',
      'Preview full program in script order',
      'Export one master MP4 for Premiere',
    ],
    keyFeatures: [
      'Per-scene stream pick — Animatic, Video, language, version',
      'Assembly presets — All Video, Hybrid, Custom mix',
      'No timeline editing — creative changes stay in Production Mixer',
      'One-click master export — stitched MP4 for Premiere',
    ],
  },
  {
    id: 'premiere',
    stepLabel: 'Premiere',
    subtitle: 'Distribution Hub',
    description:
      'Screen your master with audience analytics, then publish to YouTube with localized metadata or export bundles for Shorts, Reels, and TikTok.',
    keySteps: [
      'Create screening and share /s/ link',
      'Review Scoring, engagement, and visual insights',
      'YouTube wizard or export bundle',
    ],
    keyFeatures: [
      'Shareable Screening Room — /s/ links with scoring and optional engagement analytics (viewer consent)',
      'Insights dashboard — Scoring, Biometric, and Visual tabs',
      'YouTube wizard — thumbnail, localized title/description, SceneFlow CTA',
      'Export bundles and vertical short-form clip plans',
    ],
  },
]

export const SCREENING_ROOM_COPY = {
  title: 'Audience Review and Analytics',
  description:
    'Private /s/ share links for stakeholders — manual scores, structured feedback, and optional engagement analytics with viewer consent. Used in Premiere before publish and for Production pre-vis preview.',
  keyFeatures: [
    'Private review sessions — secure /s/ share links for stakeholders',
    'Structured audience feedback — ratings and open items',
    'Optional engagement analytics — with viewer consent before capture',
    'Iterate from real data — refine Blueprint and script from reviewer insights',
  ],
  screenshotSlot: 'Insert screenshot: Screening Room analytics and reviewer feedback panel',
  screenshotUrl:
    'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-19%20at%2018.29.48.png',
  videoSlot: 'Insert 00:30 clip: Hosting a review session and gathering engagement data',
} as const

export const BEAT_FIRST_CARD = {
  id: 15,
  title: 'Beat-First Video Pipeline',
  description:
    'Approve pre-vis beats and Beat Frames before F2V — fewer blind regenerations from hallucination and visual drift. One structured path from review to final clip.',
  keyFeatures: [
    'Express Pre-vis for review — share beats before heavy render',
    'Beat Frames lock composition — Reference Library continuity',
    'F2V per beat — generate video from approved frames',
    'Continuous EXT chains — native +7s steps for long dialogue within a beat',
    'Mixer timing and streams — export to Final Cut assembly',
  ],
  screenshotSlot: 'Insert screenshot: Beat Frames and pre-vis approval before video generation',
  videoSlot: 'Insert 00:30 clip: Approving beats, locking frames, then generating F2V clips',
} as const

export function getPhaseById(id: string): WorkflowPhaseCopy | undefined {
  return WORKFLOW_PHASES.find((p) => p.id === id)
}
