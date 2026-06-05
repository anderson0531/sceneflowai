/** Core capabilities section — display strings for landing i18n. */

export const CORE_CAPABILITIES_COPY = {
  audienceResonance: {
    badge: 'Intelligence Layer',
    title: 'Audience Resonance Editor',
    description:
      'Know your score before you invest in full renders. Target Audience Resonance scores Blueprint and script with actionable fixes — optimize every beat before Express and video generation.',
    bullets: [
      'Determine your specific target audience',
      'Get real-time score, analysis, and recommendations',
      'One-click fixes to resolve narrative weaknesses',
      'Guided Edit to optimize Episodes, Blueprint, and Script',
    ],
    cta: 'Analyze Your Script',
    howWeScore: {
      toggle: 'How we score',
      title: 'How Audience Resonance works',
      description:
        'Audience Resonance combines narrative-structure analysis (clarity, pacing, emotional arc) with target-persona fit against the audience you define in Blueprint — not vanity metrics or post-publish retention data. Recommendations are tied to specific script sections so you can fix issues before Express or video generation.',
      bullets: [
        'Scores Blueprint and script against your stated target audience',
        'Section-level recommendations — not a black-box “trust us” number',
        'Actionable one-click fixes and guided edit — not just a grade',
        'Run before heavy render spend, not after publish',
      ],
    },
  },
  express: {
    badge: 'Hyper-Speed Production',
    title: 'Sceneflow Express',
    description:
      'Auto-generate storyboards, animatics, and video beats concurrently. Move from script to shareable preview in minutes — then approve Beat Frames before final F2V spend.',
    items: [
      {
        title: 'Express Storyboard',
        desc: 'Review and share audio and video storyboards in minutes vs hours.',
        time: 'Minutes vs Hours',
      },
      {
        title: 'Express Animatics',
        desc: 'Render full Ken Burns animatic scenes with high-end voiceovers instantly.',
        time: 'Minutes vs Hours',
      },
      {
        title: 'Express Video',
        desc: 'Orchestrate concurrent image and video generation—including native Veo extension chains for long dialogue beats.',
        time: 'Minutes vs Days',
      },
    ],
    cta: 'Start Express Rendering',
  },
} as const
