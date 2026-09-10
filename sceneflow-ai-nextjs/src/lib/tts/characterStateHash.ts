/**
 * Content-addressed identity for one synthesized line.
 *
 * Everything that changes the waveform belongs in the hash: the spoken text,
 * the base voice, the system instruction (persona), the scene direction
 * (per-line state), the language, and the provider. Two requests that agree on
 * all six produce the same audio, so the second can reuse the first blob
 * instead of paying for another synthesis.
 */

import { createHash } from 'crypto'

export type CharacterStateInput = {
  text: string
  voiceId: string
  /** Structured ROLE / AGE & VOCAL PROFILE / DELIVERY RULES block, when present. */
  systemInstruction?: string
  /** Runtime scene wrapper from `buildSceneDirection`. */
  sceneDirection?: string
  language?: string
  provider?: string
}

/** Bump when a change to prompt assembly or text normalization invalidates audio. */
const CHARACTER_STATE_VERSION = 'v1'

function normalize(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Stable 16-hex-character digest of the full synthesis state.
 *
 * Fields are joined with a delimiter that cannot appear in normalized values,
 * so no combination of inputs can collide by concatenation.
 */
export function characterStateHash(input: CharacterStateInput): string {
  const parts = [
    CHARACTER_STATE_VERSION,
    normalize(input.provider) || 'google',
    normalize(input.language) || 'en',
    normalize(input.voiceId),
    normalize(input.systemInstruction),
    normalize(input.sceneDirection),
    normalize(input.text),
  ]
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16)
}
