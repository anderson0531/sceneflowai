/**
 * User-facing production terminology — shots are the production unit.
 * Blueprint Beats stay a separate story-structure term.
 */

export interface GlossaryTerm {
  term: string
  definition: string
}

export const PRODUCTION_GLOSSARY: Record<string, GlossaryTerm> = {
  beat: {
    term: 'Shot',
    definition: 'A script unit — dialogue, action, or narration — that drives pre-vis and video cuts.',
  },
  storyboardFrame: {
    term: 'Pre-vis Frame',
    definition: 'Still image for a shot, usually created by Express or the pre-vis gallery.',
  },
  beatFrame: {
    term: 'Shot Frame',
    definition: 'Start and end image pair for Frame-to-Video on a shot. Both frames are required before full-motion export.',
  },
  segment: {
    term: 'Shot clip',
    definition: 'Internal production record tied to a shot. In the UI we refer to these as shot clips.',
  },
  sceneReference: {
    term: 'Scene Reference',
    definition: 'Environment or style anchor from the Reference Library — not a pre-vis frame.',
  },
  stream: {
    term: 'Stream',
    definition: 'Finished MP4 export (Animatic or Video) for a language and version.',
  },
  screeningRoom: {
    term: 'Screening Room',
    definition: 'Preview (live) — pre-vis frames timed with audio before you render an MP4.',
  },
  productionStreams: {
    term: 'Production Streams',
    definition: 'Export (MP4) — finished renders you review, share, or send to Final Cut.',
  },
}

export function glossaryTooltip(key: keyof typeof PRODUCTION_GLOSSARY): string {
  const entry = PRODUCTION_GLOSSARY[key]
  return `${entry.term}: ${entry.definition}`
}
