/**
 * Soften scene text for REF/reference_to_video when reference images already
 * carry identity — avoids re-describing face/body/injury and conflicting with refs.
 */

const REF_CONFLICT_PHRASES: Record<string, string> = {
  'faint shadowed mark visible on her temple': 'quiet emotional tension in the expression',
  'faint shadowed mark visible on his temple': 'quiet emotional tension in the expression',
  'shadowed mark visible on her temple': 'subtle expression at the temples',
  'shadowed mark visible on his temple': 'subtle expression at the temples',
  'mark visible on her temple': 'subtle detail near the temple',
  'mark visible on his temple': 'subtle detail near the temple',
  'mark on her temple': 'detail near the temple',
  'mark on his temple': 'detail near the temple',
  'escalating panic': 'rising tension',
  'crushing weight of the evidence': 'heavy pressure of the evidence',
  'desperate denial collapsing into intense realization': 'firm denial giving way to realization',
  'desperate denial': 'firm denial',
  'intense inner struggle': 'inner conflict',
  'eyes are heavy with emotion': 'expression shows deep emotion',
  'match face, hair, and skin tone exactly': 'keep the subject consistent with the references',
  'match face, hair, and skin tone': 'keep the subject consistent with the references',
}

/** Possessive proper-noun → the subject (e.g. "Elara's hands" → "the subject's hands"). */
const POSSESSIVE_NAME_PATTERN = /\b[A-Z][a-zA-Z]*(?:'|\u2019)s\b/g

/** Body-part re-description when refs carry identity. */
const PRONOUN_BODY_PATTERN =
  /\b(Her|His)\s+(eyes|hands|face|temple|temples|arm|arms|body|hair|skin|cheek|cheeks|forehead|lips)\b/gi

/**
 * Neutralize scene prompt text before Omni REF assembly.
 * Idempotent-friendly; safe to run on already-softened text.
 */
export function neutralizeReferenceConflictPrompt(scenePrompt: string): string {
  if (!scenePrompt?.trim()) return scenePrompt

  let text = scenePrompt

  for (const [phrase, replacement] of Object.entries(REF_CONFLICT_PHRASES)) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    text = text.replace(regex, replacement)
  }

  text = text.replace(POSSESSIVE_NAME_PATTERN, "the subject's")
  text = text.replace(PRONOUN_BODY_PATTERN, (_, _pronoun, bodyPart) => {
    const part = typeof bodyPart === 'string' ? bodyPart.toLowerCase() : 'body'
    return `The subject's ${part}`
  })

  return text.replace(/\s{2,}/g, ' ').trim()
}
