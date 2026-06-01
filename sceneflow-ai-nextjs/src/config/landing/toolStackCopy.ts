/** Broken Way vs SceneFlow Way — tool stack comparison section. */

export const TOOL_STACK_COPY = {
  badge: 'Sound familiar?',
  title: 'The Broken Way vs the SceneFlow Way',
  subtitle:
    'You should not need five tabs, copy-paste exports, and prompt fatigue just to ship one video.',
  brokenWay: {
    title: 'The Broken Way',
    tagline: 'Fragmented. Manual. Exhausting.',
    tools: [
      { name: 'ChatGPT', category: 'Script drafts' },
      { name: 'Midjourney', category: 'One-off images' },
      { name: 'ElevenLabs', category: 'Manual VO export' },
      { name: 'Premiere', category: 'Manual assembly' },
    ],
    chaosLabel: 'Five tabs. Lost context.',
    painPoints: [
      'Copy-paste between apps',
      'Prompt fatigue and re-generation loops',
      'No audience check before you spend',
      'Version chaos across exports',
    ],
    timeLabel: 'Typical project time',
    timeValue: '2–4 weeks',
  },
  sceneflowWay: {
    title: 'The SceneFlow Way',
    tagline: 'One studio. Approve before you render.',
    stages: [
      { label: 'Blueprint', detail: 'Structured story plan' },
      { label: 'References', detail: 'Consistent characters' },
      { label: 'Production', detail: 'Voice + visuals' },
      { label: 'Publish', detail: 'One master MP4' },
    ],
    syncLabel: 'One project file — no tab juggling',
    benefits: [
      'Guided phases — not prompt engineering',
      'Storyboard approval before video credits',
      'Audience Resonance score before heavy render',
      'Publish-ready master from one studio',
    ],
    timeLabel: 'Typical project time',
    timeValue: '2–4 days',
  },
  comparisonCaption:
    'One studio replaces fragmented prompt tools, manual edits, and multi-platform handoffs',
  comparisonImageAlt:
    'Traditional production overhead vs SceneFlow automated studio — faster concept to publish-ready video',
} as const
