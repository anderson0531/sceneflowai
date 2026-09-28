/** Friction comparison and the four landing stages under the hero. */

export const TWO_MODES_COPY = {
  eyebrow: 'The friction we remove',
  title: 'One pipeline. Not a stack of tools.',
  subtitle:
    'SceneFlow replaces single-clip generators and a pile of separate docs, editors, and re-renders. Build the series or the 90-minute master, then publish a scene or a chapter when you are ready to earn.',
  comingSoon: 'Coming soon',
  comparison: {
    id: 'comparison',
    caption: 'Fragmented tools beside one SceneFlow pipeline.',
  },
  retired: [
    {
      id: 'no-prompt',
      title: 'No prompt engineering',
      body: 'Describe action, tone, and why a character moves. SceneFlow formats the model inputs.',
      caption: 'Direct in story language.',
    },
    {
      id: 'no-stitch',
      title: 'No manual clip stitching',
      body: 'Stop dragging loose clips into another editor. Scenes, chapters, and the master assemble in the Screening Room.',
      caption: 'Scenes and chapters assemble in the Screening Room.',
    },
    {
      id: 'no-preproduction',
      title: 'No disconnected pre-production',
      body: 'Casting, the film treatment, and the beat sheet come from the Blueprint Board and stay in sync downstream.',
      caption: 'The film treatment and its beats.',
    },
  ],
  stages: [
    {
      id: 'series-desk',
      title: 'Series Desk',
      body: 'For a series or franchise. Lock recurring faces, voices, wardrobe, and locations, and pass season continuity into each episode. A single film can start on the Blueprint Board.',
      caption: 'Series Desk — one cast across episodes.',
    },
    {
      id: 'blueprint-board',
      title: 'Blueprint Board',
      body: 'Where the film treatment lives. A sentence or a full brief becomes motivations and a beat sheet. Audience Resonance scores story, pacing, and tone for the audience you named before you spend credits. The Intelligent Assistant revises dialogue without throwing away the visual foundation. Beats exist only here.',
      caption: 'Blueprint Board — beats live in the treatment.',
    },
    {
      id: 'production-stage',
      title: 'Production Stage',
      body: 'Each Blueprint beat becomes a chapter. Dialogue, sound, and shots generate together, a few stills and clips at a time, so a scene can finish before the master does. Full production runs five stills or clips at once. Direct camera, blocking, and transitions in story language. Approved Pre-Vis shots become motion on Google Vertex and Veo. 4K is on Pro and Studio.',
      caption: 'Production Stage — a chapter of shots.',
    },
    {
      id: 'screening-room',
      title: 'Screening Room',
      body: 'Ken Burns Pre-Vis with multi-character dialogue, environmental sound, and score. Switch among Pre-Vis shots, scenes, chapters, the master, and promo. Ship a 3–5 minute scene or an 8–12 minute chapter from the locked timeline, or hold them for the 90-minute master. Cutdowns and teasers come off that same timeline. Review native-language and dubbed streams in 70+ languages inside the player.',
      caption: 'Screening Room — screen it, then ship a scene.',
    },
  ],
  earn: {
    id: 'earn',
    title: 'Earn on a scene. Finish the master when it pays.',
    body: 'A series or a 90-minute master can run about 500 shots. Shipping that master in one pass is a lot for a YouTube budget, and still inexpensive next to a traditional independent film. Publish a 3–5 minute scene or an 8–12 minute chapter from the same locked cast and world, then keep going.',
    caption: 'Ship a scene or a chapter. Finish the master when it pays.',
  },
  languages: {
    id: 'languages',
    body: 'Direct the studio in your language. This site is in 39 languages. Ship dialogue, dubs, or lip-sync for 70+ languages, with Audience Resonance checking the culture you named before you spend on pictures.',
    caption: 'Direct in your language. Ship in theirs.',
  },
  cta: 'Launch Studio ($9)',
} as const
