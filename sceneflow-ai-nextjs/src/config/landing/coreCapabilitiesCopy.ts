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
        'Audience Resonance combines narrative-structure analysis (clarity, pacing, emotional arc) with target-persona fit against the audience you define in Blueprint — not vanity metrics or post-publish retention data. When your audience description carries cultural signals, the analysis adds an authenticity pass over names, dialect, customs, faith, and sensitivities. Recommendations are tied to specific script sections so you can fix issues before agents run video generation.',
      bullets: [
        'Scores Blueprint and script against your stated target audience',
        'Cultural authenticity checks on names, dialect, customs, faith, and sensitivities',
        'Section-level recommendations — not a black-box \u201Ctrust us\u201D number',
        'Run before heavy render spend, not after publish',
      ],
    },
  },
  express: {
    badge: 'Intelligent Production',
    title: 'SceneFlow Agents',
    description:
      'Audio Agent, Frame Agent, and Video Agent compose expert prompts from beat direction, attach the right references, and generate in parallel. A scene can take several minutes because the agent is doing specialist work — then you approve Beat Frames before you spend on motion video.',
    items: [
      {
        title: 'Pre-vis Agent',
        desc: 'Fully voiced, scored beat frames per scene, prompted from locked direction and ready to share in the Screening Room.',
        time: 'Quality first',
      },
      {
        title: 'Video Agent',
        desc: 'Per-scene motion video generated after Pre-Vis approval, as native-language streams or a lower-cost dub, with scene-level edits.',
        time: 'Approve, then render',
      },
      {
        title: 'Delivery Agent',
        desc: 'Assemble the ProRes 4K master and auto-publish to YouTube or download the bundle.',
        time: 'Ship the cut',
      },
    ],
    cta: 'Run Production Agents',
  },
} as const
