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
    subtitle: 'Script to Screening Room',
    description:
      'Script and Shoot tabs guide Foundation → Pre-Vis → Footage → Mixer → Streams. Scene-by-scene checkpoints minimize redos; Screening Room handles preview, assembly, and publishing.',
    keySteps: [
      'Lock script, voices, and scene audio',
      'Pre-Vis scene by scene — gallery and share for review',
      'Shoot tab — Footage → Mixer → Streams per scene',
      'Screening Room — preview, assemble master, publish',
    ],
    keyFeatures: [
      'Foundation — script, voices, scene audio, Audience Resonance',
      'Pre-Vis — direction, audio, and beat frames per scene with share links',
      'Shoot — Footage, Mixer, and Streams without leaving Production',
      'Screening Room — scene preview, master assembly, screenings, and YouTube publish',
    ],
  },
  {
    id: 'screening-room',
    stepLabel: 'Screening Room',
    subtitle: 'Preview · Assemble · Publish',
    description:
      'One finishing surface inside Production: preview scene videos, stitch streams into a master MP4, run shareable screenings with analytics, and publish to YouTube or export bundles.',
    keySteps: [
      'Preview rendered scene streams in sequence',
      'Assemble master — pick Animatic or Video per scene',
      'Create screening and share /s/ link',
      'Review insights and publish to YouTube',
    ],
    keyFeatures: [
      'Scene-video playback — mirrors Pre-Vis player UX with rendered streams',
      'Assembly presets — All Video, Hybrid, or custom per-scene mix',
      'Shareable screenings — /s/ links with scoring and structured feedback',
      'YouTube wizard, short-form exports, and distribution bundles',
    ],
  },
]

export const SCREENING_ROOM_COPY = {
  title: 'Screening Room',
  description:
    'Preview scene videos, assemble a master, and publish — all from Production. Private /s/ share links for stakeholders with structured feedback and optional engagement analytics.',
  keyFeatures: [
    'Scene-video preview — play rendered streams in sequence',
    'Master assembly — pick Animatic or Video per scene and render one MP4',
    'Shareable screenings — secure /s/ links with scoring and feedback triage',
    'Publish — YouTube wizard, short-form exports, and distribution bundles',
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
    'Mixer timing and streams — open Screening Room to assemble and publish',
  ],
  screenshotSlot: 'Insert screenshot: Beat Frames and pre-vis approval before video generation',
  videoSlot: 'Insert 00:30 clip: Approving beats, locking frames, then generating F2V clips',
} as const

export function getPhaseById(id: string): WorkflowPhaseCopy | undefined {
  return WORKFLOW_PHASES.find((p) => p.id === id)
}
