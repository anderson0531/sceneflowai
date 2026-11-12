/**
 * Soften scene text for REF/reference_to_video when reference images already
 * carry identity — avoids re-describing face/body/injury and conflicting with refs.
 */

import { sanitizeFacialFeatureConflicts } from '@/lib/character/sanitizeFacialFeatureConflicts'

const REF_CONFLICT_PHRASES: Record<string, string> = {
  'faint shadowed mark visible on her temple': 'quiet emotional tension in the expression',
  'faint shadowed mark visible on his temple': 'quiet emotional tension in the expression',
  'shadowed mark visible on her temple': 'subtle expression at the temples',
  'shadowed mark visible on his temple': 'subtle expression at the temples',
  'mark visible on her temple': 'subtle detail near the temple',
  'mark visible on his temple': 'subtle detail near the temple',
  'mark forming on her temple': 'subtle detail near the temple',
  'mark forming on his temple': 'subtle detail near the temple',
  'a faint mark forming on her temple': 'a subtle detail near the temple',
  'a faint mark forming on his temple': 'a subtle detail near the temple',
  'mark on her temple': 'detail near the temple',
  'mark on his temple': 'detail near the temple',
  'escalating panic': 'rising tension',
  'crushing weight of the evidence': 'heavy pressure of the evidence',
  'desperate denial collapsing into intense realization': 'firm denial giving way to realization',
  'absolute defeat': 'quiet resignation',
  'desperate denial': 'firm denial',
  'intense inner struggle': 'inner conflict',
  'eyes are heavy with emotion': 'expression shows deep emotion',
  'match face, hair, and skin tone exactly': 'keep the subject consistent with the references',
  'match face, hair, and skin tone': 'keep the subject consistent with the references',
  'bloodshot': 'weary',
  'trembling': 'slightly unsteady',
  'distress': 'tension',
  'distressed': 'emotional',
}

/** Possessive proper-noun → the subject (e.g. "Elara's hands" → "the subject's hands"). */
const POSSESSIVE_NAME_PATTERN = /\b[A-Z][a-zA-Z]*(?:'|\u2019)s\b/g

/** Body-part re-description when refs carry identity. */
const PRONOUN_BODY_PATTERN =
  /\b(Her|His)\s+(eyes|hands|face|temple|temples|arm|arms|body|hair|skin|cheek|cheeks|forehead|lips)\b/gi

/**
 * Static inline wardrobe/costume clauses in prose that often conflict with
 * the attached character/wardrobe reference plate (e.g. ", wearing a tattered coat,").
 */
const INLINE_WARDROBE_CLAUSE_PATTERNS: RegExp[] = [
  /,\s*(?:wearing|dressed in|clad in|outfitted in)\s+[^,.;!?]+(?=[,.;!?])/gi,
  /\b(?:wearing|dressed in|clad in|outfitted in)\s+(?:a|an|his|her|their|the)\s+[^,.;!?]+,\s*/gi,
]

/**
 * Static inline eye/hair color and micro-anatomical facial overrides that conflict
 * with identity reference plates (e.g., masking eyes in shadow or re-sculpting jaw/cheeks).
 */
const INLINE_FACIAL_TRAIT_PATTERNS: RegExp[] = [
  /,\s*with\s+(?:piercing\s+|bright\s+|dark\s+|deep\s+|pale\s+)?(?:blue|green|brown|hazel|amber|gray|grey)\s+eyes(?:\s+and\s+[^,.;!?]+?\s+hair)?(?=[,.;!?])/gi,
  /\bwith\s+(?:piercing\s+|bright\s+|dark\s+|deep\s+|pale\s+)?(?:blue|green|brown|hazel|amber|gray|grey)\s+eyes(?:\s+and\s+[^,.;!?]+?\s+hair)?\b/gi,
  /,?\s*registered through\s+[^.!?]+(?=[.!?]|$)/gi,
  /,?\s*sculpting the hollows of (?:his|her|their|the subject's|person \[\d+\]'s) cheeks\b/gi,
  /,?\s*(?:with\s+)?(?:deep\s+)?(?:charcoal\s+|heavy\s+|dark\s+)?shadows\s+(?:masking|obscuring|hiding)\s+(?:his|her|their|the subject's|person \[\d+\]'s)\s+(?:eyes|face)\b/gi,
]

/**
 * Mask quoted spoken dialogue spans so reference-conflict regexes never mutate
 * spoken words (e.g. "Elara's" -> "the subject's" or "trembling" -> "slightly unsteady").
 */
const SPOKEN_QUOTE_SPAN_RE =
  /"(?:[^"\\\n]|\\.)+"|(?<=[:,\s])'(?:[^'\n]|'(?=[a-zA-Z])){2,}'/g

/**
 * Neutralize scene prompt text before Omni REF assembly.
 * Idempotent-friendly; safe to run on already-softened text.
 */
export function neutralizeReferenceConflictPrompt(scenePrompt: string): string {
  if (!scenePrompt?.trim()) return scenePrompt

  const preservedQuotes: string[] = []
  const maskedInput = scenePrompt.replace(SPOKEN_QUOTE_SPAN_RE, (match) => {
    const idx = preservedQuotes.length
    preservedQuotes.push(match)
    return `__SF_SPOKEN_QUOTE_${idx}__`
  })

  let text = sanitizeFacialFeatureConflicts(maskedInput)

  for (const [phrase, replacement] of Object.entries(REF_CONFLICT_PHRASES)) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    text = text.replace(regex, replacement)
  }

  for (const pattern of INLINE_WARDROBE_CLAUSE_PATTERNS) {
    text = text.replace(pattern, '')
  }

  for (const pattern of INLINE_FACIAL_TRAIT_PATTERNS) {
    text = text.replace(pattern, '')
  }

  text = text.replace(POSSESSIVE_NAME_PATTERN, (match) => {
    if (/^The\b/i.test(match)) return match
    return "the subject's"
  })
  text = text.replace(PRONOUN_BODY_PATTERN, (_, _pronoun, bodyPart) => {
    const part = typeof bodyPart === 'string' ? bodyPart.toLowerCase() : 'body'
    return `The subject's ${part}`
  })

  if (preservedQuotes.length > 0) {
    text = text.replace(/__SF_SPOKEN_QUOTE_(\d+)__/g, (_m, rawIdx) => {
      const idx = Number(rawIdx)
      return preservedQuotes[idx] ?? _m
    })
  }

  return text
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
