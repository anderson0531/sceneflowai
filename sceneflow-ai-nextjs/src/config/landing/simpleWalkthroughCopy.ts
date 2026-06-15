/**
 * Simplified 7-step landing walkthrough — subscriber-facing essentials.
 * Media URLs live in simpleWalkthroughMedia.ts
 */

export type SimpleWalkthroughMediaType = 'previs-player' | 'video' | 'screenshot'

export type SimpleWalkthroughStep = {
  id: string
  stepLabel: string
  shortDescription: string
  detailedDescription: string
  media: SimpleWalkthroughMediaType
  /** Optional sub-points (e.g. Shoot: Footage, Mixer, Streams) */
  subPoints?: string[]
  screenshotSlot?: string
}

export const SIMPLE_WALKTHROUGH_HEADER = {
  badge: 'How it works',
  title: 'From concept to publish-ready video',
  titleAccent: 'in seven guided steps',
  subtitle:
    'Start with an idea or script, optimize with Blueprint and Audience Resonance, visualize with Pre-Vis, shoot scene video, test in Screening Room, and publish — all in one studio.',
  tagline: 'Every step is expertly automated. Every step gives you full control.',
  showDetails: 'Show details',
  hideDetails: 'Hide details',
  readyTitle: 'Ready to test the full pipeline?',
  explorerCta: 'Start with Explorer — $9',
} as const

export const SIMPLE_WALKTHROUGH_STEPS: SimpleWalkthroughStep[] = [
  {
    id: 'concept',
    stepLabel: 'Start with your Concept or Existing Script',
    shortDescription:
      'Begin with a natural-language concept or import your screenplay — Fountain, Final Draft, or paste your script.',
    detailedDescription:
      'SceneFlow accepts ideas in plain language or structured script formats. The AI helps expand concepts into treatments and can import existing screenplays so you never start from a blank page.',
    media: 'screenshot',
    screenshotSlot: 'Insert screenshot: New project concept input or script import dialog',
  },
  {
    id: 'blueprint',
    stepLabel: 'Optimize your concept with Blueprint',
    shortDescription:
      'Transform ideas into a structured treatment — logline, beats, characters, and tone — before heavy rendering.',
    detailedDescription:
      'Blueprint automatically crafts a comprehensive story outline. Refine character arcs, plot beats, and narrative tone with intelligent suggestions. Collaborator share links let stakeholders review before Production.',
    media: 'video',
  },
  {
    id: 'audience-resonance',
    stepLabel: 'Optimize your script with Audience Resonance',
    shortDescription:
      'Score your script for target-audience fit and apply scene-by-scene recommendations with one-click fixes.',
    detailedDescription:
      'Audience Resonance (AR) critically analyzes your script against the audience you define. Get section-level scores, actionable recommendations, and Guided Edits — auto-apply fixes per scene or make global script changes from the AR dialog.',
    media: 'video',
  },
  {
    id: 'pre-vis',
    stepLabel: 'Visualize and test with Pre-Visualization',
    shortDescription:
      'Generate dialogue audio and beat frames scene by scene. Share animatics for approval before final video spend.',
    detailedDescription:
      'Pre-Vis Studio generates direction, audio, and beat frames per scene — checkpoints that minimize costly redos when characters or tone change. Share the player for collaboration; the full animatic can be your final deliverable for many projects.',
    media: 'previs-player',
  },
  {
    id: 'shoot',
    stepLabel: 'Shoot your production',
    shortDescription:
      'Generate beat-level video, mix audio and overlays, and export full scene streams — Footage, Mixer, and Streams in one Shoot tab.',
    detailedDescription:
      'The Shoot tab in Production is your on-set: generate video from approved Pre-Vis frames (Footage), fine-tune timing, watermarks, and audio in the Mixer, then render complete scene MP4s in Streams.',
    media: 'video',
    subPoints: [
      'Footage — beat-by-beat video generation from Pre-Vis start and end frames',
      'Mixer — watermark, text overlay, and audio timing per scene',
      'Streams — full rendered scene video (all beats) ready for Screening Room',
    ],
  },
  {
    id: 'screening-room',
    stepLabel: 'Test your production with Screening Room',
    shortDescription:
      'Preview scene videos in sequence, assemble a master MP4, and run shareable screenings with structured feedback.',
    detailedDescription:
      'Screening Room mirrors the Pre-Vis player UX but plays rendered scene streams. Pick Animatic or Video per scene, stitch a master, share /s/ review links, and triage timestamped feedback before publish.',
    media: 'video',
  },
  {
    id: 'publish',
    stepLabel: 'Publish',
    shortDescription:
      'Distribute your master to YouTube, export short-form cuts, and track audience insights from one finishing surface.',
    detailedDescription:
      'From Screening Room, run the YouTube publishing wizard, create social short-form exports, and download distribution bundles. Analytics and reviewer feedback stay in one place — no handoff to separate tools.',
    media: 'video',
  },
]

export const SIMPLE_WALKTHROUGH_UI = {
  screenshot: 'Screenshot',
  video: 'Video',
  expandImage: 'Expand Image',
  closePreview: 'Close Preview',
  openScreenshot: 'Open screenshot',
  openFeatureVideo: 'Open feature video',
} as const
