/**
 * Negative terms for scene and beat frame image generation.
 *
 * Gemini image models have no negative-prompt field, so every term here is
 * appended to the prompt as plain text. A phrase that names the failure it is
 * meant to prevent — "different person", "incorrect ethnicity" — therefore
 * reads as a description of the subject, and lands immediately before the
 * reference images. Identity is held positively instead, by the identity
 * reference image and its lock line; only render medium and layout artifacts
 * are safe to list as exclusions.
 */

export const TYPOGRAPHY_NEGATIVE_TERMS = [
  'text overlay',
  'captions',
  'subtitles',
  'watermark',
]

/**
 * Layout words that prime split-frame output when listed as exclusions
 * (Gemini has no true negative field). Stripped from every beat still list.
 */
export const STRUCTURAL_LAYOUT_PRIME_TERMS = [
  'split-screen',
  'diptych',
  'two-panel',
  'collage',
  'multi-panel',
  '2x2',
  '4-panel',
  'side-by-side',
  'reference sheet',
]

export const ESSENTIAL_QUALITY_NEGATIVE_TERMS = [
  'mannequin geometry',
  'plastic skin',
  'cartoon style',
  '3D render',
  'faceless figures',
  'extra limbs',
  'deformed anatomy',
]

export const MAX_SCENE_IMAGE_NEGATIVE_TERMS = 16

/**
 * Phrases that describe the identity drift they were written to prevent.
 * Stripped from every exclusion list, including additions the prompt
 * intelligence model supplies.
 */
export const IDENTITY_NEGATION_TERMS = [
  'elderly appearance',
  'deeply wrinkled',
  'aged beyond reference',
  'geriatric',
  'wrong age',
  'different facial features',
  'incorrect ethnicity',
  'mismatched appearance',
  'different person',
  'different face',
  'changed appearance',
  'inconsistent character',
  'celebrity likeness',
  'child',
  'teenager',
  'youthful appearance',
  'different hairstyle',
  'wrong ethnicity',
  'wrong skin tone',
]

/**
 * The adult, original-person intent the removed "celebrity likeness, child,
 * teenager" exclusions carried, stated positively so it cannot be read as a
 * description of the subject.
 */
export const ORIGINAL_ADULT_SUBJECT_REQUIREMENT =
  'Every person in frame is an adult original fictional character — not a minor, and not a recognizable public figure or celebrity'

function splitTerms(values: Array<string | null | undefined>): string[] {
  return values
    .flatMap((value) => (value || '').split(','))
    .map((term) => term.trim())
    .filter(Boolean)
}

function isIdentityNegation(term: string): boolean {
  const normalized = term.toLowerCase()
  return IDENTITY_NEGATION_TERMS.some((negation) => normalized.includes(negation))
}

function isStructuralLayoutPrime(term: string): boolean {
  const normalized = term.toLowerCase()
  return STRUCTURAL_LAYOUT_PRIME_TERMS.some((prime) => normalized.includes(prime))
}

/** Drop identity-describing phrases from an exclusion list. */
export function stripIdentityNegationTerms(
  terms: Array<string | null | undefined>
): string[] {
  return splitTerms(terms).filter((term) => !isIdentityNegation(term))
}

/**
 * Assemble the exclusion list for a scene image.
 *
 * `extraTerms` carries the caller's conditional sets (art style, dual
 * reference, diptych, beat anti-pose, model-supplied additions); they are
 * filtered on the same rule as the base list.
 */
export function buildSceneImageNegativePrompt(input: {
  allowTypography?: boolean
  extraTerms?: Array<string | null | undefined>
}): string {
  const terms = stripIdentityNegationTerms([
    ...ESSENTIAL_QUALITY_NEGATIVE_TERMS,
    ...(input.allowTypography ? [] : TYPOGRAPHY_NEGATIVE_TERMS),
    ...(input.extraTerms ?? []),
  ]).filter((term) => !isStructuralLayoutPrime(term))

  const seen = new Set<string>()
  const unique: string[] = []
  for (const term of terms) {
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(term)
    if (unique.length >= MAX_SCENE_IMAGE_NEGATIVE_TERMS) break
  }

  return unique.join(', ')
}
