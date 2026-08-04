/**
 * Term protection for machine translation.
 *
 * Two things must survive a round trip through a translation engine untouched:
 *
 *  - **Glossary terms** — product and vendor names. "Blueprint Studio" becoming
 *    "Estudio de planos" makes the UI incoherent with the docs, the marketing
 *    site, and every support conversation.
 *  - **ICU placeholders** — `{count}`, `{count, plural, ...}`. These were
 *    previously sent to MT as plain text with no guard at all; an engine that
 *    reorders or translates the inside of the braces produces a message that
 *    throws at format time rather than merely reading oddly.
 *
 * Both are replaced with tokens that MT engines leave alone, then restored.
 */

/** Product and vendor names that must never be translated. */
export const GLOSSARY_TERMS = [
  'SceneFlow AI Studio',
  'SceneFlow AI',
  'SceneFlow',
  'Blueprint Studio',
  'Series Studio',
  'Production Studio',
  'Blueprint',
  'Production Mixer',
  'Beat Frames',
  'Audience Resonance',
  'Screening Room',
  'Reference Library',
  'Final Cut',
  'Premiere',
  'Animatic',
  'Express Pre-vis',
  'Pre-vis',
  'Pre-Visualization Engine',
  'Creative Decision Engine',
  'BYOK',
  'Whop',
  'Explorer',
  'Vertex AI',
  'ElevenLabs',
  'Google Cloud',
  'Gemini Studio',
  'Google Flow',
]

const GLOSSARY_PLACEHOLDER_PREFIX = 'SFAI'
const GLOSSARY_PLACEHOLDER_SUFFIX = 'TERM'

export function glossarySlug(term: string): string {
  return term.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
}

export interface ProtectedText {
  protectedText: string
  map: Map<string, string>
}

/**
 * Replace glossary terms with placeholders.
 *
 * Longest match first, so "SceneFlow AI Studio" is not shadowed by "SceneFlow".
 * `extraTerms` carries per-request names, e.g. characters and locations from a
 * series bible.
 */
export function protectGlossary(
  text: string,
  extraTerms: readonly string[] = []
): ProtectedText {
  const map = new Map<string, string>()
  let protectedText = text

  const terms = [...new Set([...GLOSSARY_TERMS, ...extraTerms])]
    .filter((term) => term && term.length >= 2)
    .sort((a, b) => b.length - a.length)

  terms.forEach((term) => {
    if (!protectedText.includes(term)) return
    const placeholder = `${GLOSSARY_PLACEHOLDER_PREFIX}${glossarySlug(term)}${GLOSSARY_PLACEHOLDER_SUFFIX}`
    map.set(placeholder, term)
    protectedText = protectedText.split(term).join(placeholder)
  })

  return { protectedText, map }
}

function scrubLegacyPlaceholders(text: string): string {
  return text.replace(/__\s*SFTERM_(\d+)\s*__/g, (_, idx) => GLOSSARY_TERMS[Number(idx)] ?? _)
}

export function restoreGlossary(text: string, map: Map<string, string>): string {
  let restored = text
  for (const [placeholder, term] of map) {
    restored = restored.split(placeholder).join(term)
    // Engines sometimes inject spaces inside the token.
    const fuzzy = new RegExp(
      `${GLOSSARY_PLACEHOLDER_PREFIX}\\s*${glossarySlug(term)}\\s*${GLOSSARY_PLACEHOLDER_SUFFIX}`,
      'g'
    )
    restored = restored.replace(fuzzy, term)
  }
  return scrubLegacyPlaceholders(restored)
}

// ---------------------------------------------------------------------------
// ICU placeholders
// ---------------------------------------------------------------------------

/** Matches a balanced-at-one-level ICU argument, including nested plural bodies. */
const ICU_PATTERN = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g

const ICU_TOKEN_PREFIX = 'SFAIICU'
const ICU_TOKEN_SUFFIX = 'ZZ'

/**
 * Replace ICU arguments with opaque tokens.
 *
 * The token is deliberately alphanumeric with no punctuation: engines split on
 * punctuation and will happily translate or reflow anything that looks like
 * prose.
 */
export function protectIcu(text: string): ProtectedText {
  const map = new Map<string, string>()
  let index = 0

  const protectedText = text.replace(ICU_PATTERN, (match) => {
    const token = `${ICU_TOKEN_PREFIX}${index}${ICU_TOKEN_SUFFIX}`
    map.set(token, match)
    index += 1
    return token
  })

  return { protectedText, map }
}

export function restoreIcu(text: string, map: Map<string, string>): string {
  let restored = text
  for (const [token, original] of map) {
    if (restored.includes(token)) {
      restored = restored.split(token).join(original)
      continue
    }
    // Recover from casing changes and injected spaces.
    const index = token.slice(ICU_TOKEN_PREFIX.length, -ICU_TOKEN_SUFFIX.length)
    const fuzzy = new RegExp(
      `${ICU_TOKEN_PREFIX}\\s*${index}\\s*${ICU_TOKEN_SUFFIX}`,
      'gi'
    )
    restored = restored.replace(fuzzy, original)
  }
  return restored
}

/** Apply both protections. Restore with {@link restoreAll}. */
export function protectAll(
  text: string,
  extraTerms: readonly string[] = []
): { protectedText: string; glossary: Map<string, string>; icu: Map<string, string> } {
  // ICU first: a glossary term inside a plural body would otherwise be
  // double-tokenized.
  const icuPass = protectIcu(text)
  const glossaryPass = protectGlossary(icuPass.protectedText, extraTerms)
  return {
    protectedText: glossaryPass.protectedText,
    glossary: glossaryPass.map,
    icu: icuPass.map,
  }
}

export function restoreAll(
  text: string,
  glossary: Map<string, string>,
  icu: Map<string, string>
): string {
  return restoreIcu(restoreGlossary(text, glossary), icu)
}

/**
 * Count ICU arguments in a string, for verifying a translation kept them all.
 * Returns the sorted list so callers can report exactly what went missing.
 */
export function icuArguments(text: string): string[] {
  return (text.match(ICU_PATTERN) ?? []).sort()
}

/** True when source and translation carry the same ICU arguments. */
export function icuArgumentsMatch(source: string, translated: string): boolean {
  const a = icuArguments(source)
  const b = icuArguments(translated)
  return a.length === b.length && a.every((value, index) => value === b[index])
}
