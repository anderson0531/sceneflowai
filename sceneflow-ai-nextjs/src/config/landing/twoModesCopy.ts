/** Two-mode comparison section — Director and Go on the landing page. */

export const TWO_MODES_COPY = {
  title: 'Two modes at every step. One long-form pipeline.',
  subtitle:
    'Hundreds of tools will hand you a five-second clip and hope you like it. SceneFlow gives you a choice at every step of the pipeline: direct it yourself, or let the studio run it. Both read from the same locked references, so continuity holds either way.',
  director: {
    name: 'SceneFlow Studio',
    subtitle: 'Director Mode',
    badge: 'Built for long-form',
    tagline: 'Where features and series actually get made.',
    points: [
      'Hold pacing, emotion, and continuity across a 120-minute feature or a full season.',
      'Direct in plain language against locked references — no prompt engineering, no copy-pasting between tool stacks.',
      'Step in at any point in the pipeline: Blueprint, Production, or Screening Room.',
      'Fine-tune visuals, character emotion, dialogue timing, and music beat by beat.',
      'Complete pre-visualization and master production workflow.',
    ],
    cta: 'Launch Studio ($9)',
  },
  go: {
    name: 'SceneFlow Go',
    badge: 'Fastest way to test an idea',
    tagline: 'Prototype the episode before you commit to it.',
    points: [
      'Generate the structural backbone of an entire episode in under 10 minutes.',
      'Enter a concept or script, click Go, and come back to a finished animatic.',
      'Automatically handles Blueprint, structure, references, frames, audio, and assembly.',
      'Hand the result to Director Mode the moment you want the wheel.',
    ],
    cta: 'Try Go Mode',
  },
} as const
