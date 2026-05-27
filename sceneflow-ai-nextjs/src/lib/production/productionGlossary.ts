/**
 * User-facing production terminology — keep UI copy aligned with the beat-first pipeline.
 */

export interface GlossaryTerm {
  term: string
  definition: string
}

export const PRODUCTION_GLOSSARY: Record<string, GlossaryTerm> = {
  beat: {
    term: 'Beat',
    definition: 'A script unit — dialogue, action, or narration — that drives storyboard and video cuts.',
  },
  storyboardFrame: {
    term: 'Storyboard Frame',
    definition: 'Still image for a beat, usually created by Express or the storyboard gallery.',
  },
  beatFrame: {
    term: 'Beat Frame',
    definition: 'Start and end image pair for Frame-to-Video on a beat. Both frames are required before full-motion export.',
  },
  segment: {
    term: 'Beat clip',
    definition: 'Internal production record tied to a beat. In the UI we refer to these as beat clips.',
  },
  sceneReference: {
    term: 'Scene Reference',
    definition: 'Environment or style anchor from the Reference Library — not a storyboard frame.',
  },
  stream: {
    term: 'Stream',
    definition: 'Finished MP4 export (Animatic or Video) for a language and version.',
  },
  screeningRoom: {
    term: 'Screening Room',
    definition: 'Preview (live) — storyboard frames timed with audio before you render an MP4.',
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
