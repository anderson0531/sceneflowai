/** What you can publish, under direction and agents. */

export const PUBLISH_CUT_COPY = {
  eyebrow: 'The cut you publish',
  title: 'Export anywhere. Premiere on SceneFlow when you earn it.',
  subtitle:
    'Export a master and distribute anywhere, or publish finished scenes and chapters directly to {longForm} with vertical trailers cut for {shorts} — picture, music, and narration already in the cut. Localize every release with dubbed audio and regenerated multi-language dialogue and signage clips, vet every draft in the Screening Room before release, and apply to the invite-only SceneFlow Network for funded audience acceleration.',
  localizationCallout: {
    badge: 'Global Production & Native UI',
    title: 'Two layers of localization: direct in your language, ship in theirs.',
    pillars: [
      {
        badge: 'Studio & Site UI · Top 6 Google AI Markets',
        title: 'Direct in your native language',
        description:
          'Navigate the Studio UI and write plain-language story, camera, and beat direction in English, Spanish, Portuguese, Hindi, Simplified Chinese, or Arabic.',
      },
      {
        badge: 'Production Streams · 70+ Languages',
        title: 'Dubbed audio + regenerated dialogue & signage clips',
        description:
          'Go beyond subtitles: generate alternate language streams with voice-cloned dubbing, lip-sync, and shot-regenerated dialogue and in-scene signage clips.',
      },
    ],
  },
  comparison: {
    id: 'publish',
    caption: 'A finished scene or chapter, with music and narration, and the 90-minute master, from one studio.',
  },
  cta: 'Launch Studio ($9)',
} as const
