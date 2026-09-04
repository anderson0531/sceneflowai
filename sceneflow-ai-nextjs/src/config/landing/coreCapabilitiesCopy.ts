/** Core capabilities section — display strings for landing i18n. */

export const CORE_CAPABILITIES_COPY = {
  audienceResonance: {
    badge: 'Intelligence Layer',
    title: 'Audience Resonance: build for a culture, not a language code',
    description:
      'Subtitles stretch one video\u2019s reach. SceneFlow lets you name the culture, region, and demographic you are making for, score the story against that audience before you render, and then ship either a dubbed master or a separate high-resonance version per audience.',
    bullets: [
      'Define the audience: eight target regions, plus age, gender, education, and community',
      'Describe culture, faith, and values in your own words — SceneFlow reads the signals',
      'Get a resonance score with section-level fixes before you spend on renders',
      'Dub the master, or produce a distinct version tuned to each audience',
    ],
    cta: 'Analyze Your Script',
    howWeScore: {
      toggle: 'How we score',
      title: 'How Audience Resonance works',
      description:
        'Audience Resonance combines narrative-structure analysis (clarity, pacing, emotional arc) with target-persona fit against the audience you define in Blueprint — not vanity metrics or post-publish retention data. When your audience description carries cultural signals, the analysis adds an authenticity pass over names, dialect, customs, faith, and sensitivities. Recommendations are tied to specific script sections so you can fix issues before Express or video generation.',
      bullets: [
        'Scores Blueprint and script against your stated target audience',
        'Cultural authenticity checks on names, dialect, customs, faith, and sensitivities',
        'Section-level recommendations — not a black-box \u201Ctrust us\u201D number',
        'Run before heavy render spend, not after publish',
      ],
    },
  },
  express: {
    badge: 'Hyper-Speed Production',
    title: 'Sceneflow Express',
    description:
      'Auto-generate pre-vis, animatics, and video beats concurrently. Move from script to shareable preview in minutes — then approve Beat Frames before final F2V spend. Throughput is what makes a version per audience affordable instead of theoretical.',
    items: [
      {
        title: 'Express Pre-vis',
        desc: 'Review and share audio and video pre-vis in minutes vs hours.',
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
