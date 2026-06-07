/** Extended / continuous scene generation — landing i18n source. */

export const EXTENDED_SCENES_COPY = {
  badge: 'Continuous Beats',
  title: 'Beyond the 8-Second Clip',
  titleAccent: 'Native Veo Extension Chains',
  subtitle:
    'Break the single-clip wall with native Veo extension chains—approve the look first, then chain 7-second steps for monologues, explainers, and dialogue beats.',
  intro:
    'SceneFlow does not promise one unlimited render. It plans long beats as ordered chains: an initial clip up to 8 seconds, then native +7 second extension steps—with beat-first approval before you spend credits.',
  steps: [
    {
      title: '8s initial clip',
      description: 'Frame-to-video or image-to-video from approved Beat Frames locks composition before motion.',
    },
    {
      title: '+7s extension steps',
      description: 'Native Veo EXT continues the same angle and motion—ideal for uninterrupted dialogue within a beat.',
    },
    {
      title: 'Beat-first approval',
      description: 'Long lines auto-split at pre-vis review. You approve frames before the chain renders—not slot-machine regeneration.',
    },
    {
      title: 'Production Mixer finish',
      description: 'Chain segments stitch into scene playback; elastic audio holds cover narration that runs longer than video.',
    },
  ],
  stats: [
    { value: '~15s', label: 'Typical dialogue beat (8s + 1 extension)' },
    { value: '~29s', label: 'Long monologue beat (8s + 3 extensions)' },
    { value: 'Ordered', label: 'Serial generation preserves continuity' },
  ],
  footnote:
    'Extension chains require the primary Google generation path and valid video references between steps (references expire after approximately 48 hours). Each API step remains within Veo duration limits—the total beat length comes from chaining, not a single long render.',
} as const
