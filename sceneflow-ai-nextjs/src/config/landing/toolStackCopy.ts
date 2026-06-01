/** Broken Way vs SceneFlow Way — tool stack comparison section. */

export const TOOL_STACK_COPY = {
  badge: 'Sound familiar?',
  title: 'The Broken Way vs the SceneFlow Way',
  subtitle:
    'Experienced producers: stop losing hours to copy-paste across script, image, voice, video, music, and edit tools. New to AI video: one guided studio automates the stack so you ship without learning six separate apps.',
  brokenWay: {
    title: 'The Broken Way',
    tagline: 'Fragmented. Manual. Slot-machine video.',
    tools: [
      { name: 'Script generation', category: 'Drafts without audience validation' },
      { name: 'Image generation', category: 'Frames and stills in a separate tool' },
      { name: 'Voice generation', category: 'Manual voiceover export and re-takes' },
      { name: 'Video generation', category: 'Slot-machine re-rolls — prompt, generate, reject, repeat' },
      { name: 'Music generation', category: 'Separate soundtrack pass' },
      { name: 'Video editing', category: 'Manual assembly, export, and upscaling polish' },
    ],
    chaosLabel: 'Six tabs. Re-roll until something sticks.',
    painPoints: [
      'Copy-paste between generation and edit tools',
      'Slot-machine video generation — re-roll until something sticks',
      'Prompt fatigue and re-generation loops',
      'No audience check before you spend',
      'Version chaos across exports',
    ],
    timeLabel: 'Per video (manual multi-tool stack)',
    timeValue: '4+ hours',
  },
  sceneflowWay: {
    title: 'The SceneFlow Way',
    tagline: 'One studio. Guided automation — or serious throughput if you already know the stack.',
    stages: [
      { label: 'Blueprint', detail: 'Structured story plan' },
      { label: 'References', detail: 'Consistent characters' },
      { label: 'Production', detail: 'Voice + visuals' },
      { label: 'Publish', detail: 'One master MP4' },
    ],
    syncLabel: 'One project file — no tab juggling',
    benefits: [
      'Guided phases — stop tab juggling and context loss',
      'Storyboard approval — stop slot-machine re-rolls before video spend',
      'Audience Resonance score before heavy render',
      'Publish-ready master in 30–60 min, not 4+ hrs',
    ],
    timeLabel: 'Per video (same deliverable)',
    timeValue: '30–60 minutes',
  },
  comparisonCaption:
    'One studio replaces fragmented generation tools, slot-machine video re-rolls, and manual edit assembly',
  comparisonImageAlt:
    'Traditional production overhead vs SceneFlow automated studio — faster concept to publish-ready video',
  costNote:
    'Same AI spend, less wasted time. You pay for models either way — through SceneFlow credits, your own provider account, or BYOK. SceneFlow removes the copy-paste assembly tax so you can ship more videos with the same budget.',
  proofLine:
    'Validated on a residential listing tour: full manual stack 4+ hours → same deliverable in SceneFlow under an hour.',
} as const
