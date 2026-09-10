/**
 * Key features sent beside identity-reference images.
 *
 * Ethnicity text must not fight the portrait. Labels like "neutral American"
 * are accent/casting tags, not a visual ethnicity — leaking them made Gideon
 * render as a Caucasian man with straight hair.
 */

const NON_VISUAL_ETHNICITY =
  /^(neutral|american|british|australian|canadian|irish|scottish|english)\b|\baccent\b/i

export function isNonVisualEthnicityLabel(value: string | undefined | null): boolean {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return true
  return NON_VISUAL_ETHNICITY.test(trimmed)
}

export function hasIdentityReferenceImage(char: {
  referenceImage?: string
  identityReferenceId?: number
  hasReferenceImage?: boolean
}): boolean {
  return Boolean(char.referenceImage || char.identityReferenceId || char.hasReferenceImage)
}

/**
 * Ethnicity belongs on the identity image, not in prompt text, whenever a
 * reference is attached. Non-visual labels are dropped even without a ref.
 */
export function ethnicityKeyFeature(
  ethnicity: string | undefined | null,
  char: {
    referenceImage?: string
    identityReferenceId?: number
    hasReferenceImage?: boolean
  }
): string | undefined {
  const trimmed = ethnicity?.trim()
  if (!trimmed) return undefined
  if (hasIdentityReferenceImage(char)) return undefined
  if (isNonVisualEthnicityLabel(trimmed)) return undefined
  return trimmed
}
