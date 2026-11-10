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
        badge: 'Studio & Site UI · 7 Global Language Markets',
        title: 'Direct in your native language',
        description:
          'Navigate the Studio UI and write plain-language story, camera, and beat direction in English, Spanish, Portuguese, Hindi, Simplified Chinese, Arabic, or Thai.',
      },
      {
        badge: 'In-Scene Sync Streams · 70+ Languages',
        title: 'True in-scene language sync, stem separation & elastic alignment',
        description:
          'Move far beyond voiceover dubbing: selectively regenerate on-camera dialogue performance and in-scene signage shots while retaining unselected master clips, strip spoken speech from audio stems to preserve generated SFX and score, and align longer translated lines by elastically slowing video up to 1.5x.',
      },
    ],
  },
  comparison: {
    id: 'publish',
    caption: 'A finished scene or chapter, with music and narration, and the 90-minute master, from one studio.',
  },
  cta: 'Launch Studio ($9)',
} as const
