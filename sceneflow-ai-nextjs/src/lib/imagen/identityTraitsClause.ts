/**
 * One short identity clause for the `[REFERENCES]` legend.
 *
 * Beat action names cast by `person [N]` token only, so without this nothing
 * in the request says what that person looks like and a frame that drifts off
 * the portrait has no text contradicting it. Traits are read from the
 * vision-derived description of the reference image — never from the
 * `ethnicity` field, whose labels ("neutral American") describe casting and
 * accent rather than appearance, and which rendered Gideon as a Caucasian man
 * with straight hair when it leaked into prompt text.
 *
 * Only observable traits are emitted, so the clause agrees with the portrait
 * instead of competing with it, and it belongs in the legend alone: repeating
 * it in the action text is what "no appearance adjectives" exists to prevent.
 */

import {
  buildCharacterHairDescription,
  extractHairStyleFromAppearance,
} from '@/lib/character/characterReferenceAssembly'

/** Roughly one legend line — long enough for five traits, short enough to read as a label. */
export const IDENTITY_TRAITS_WORD_CAP = 18

/**
 * Wider cap for the retry lock, where brevity has already been tried and lost.
 * Every trait the description yields gets stated rather than the first fifteen
 * words' worth.
 */
export const IDENTITY_TRAITS_RETRY_WORD_CAP = 40

/**
 * Modifiers kept when they sit directly before a trait noun. An allowlist,
 * because the window before "skin" is just as likely to hold "beneath his" or
 * "scarred by" as it is to hold a tone.
 */
const SKIN_MODIFIERS = new Set([
  'very', 'warm', 'warmly', 'cool', 'cooler', 'deep', 'deeply', 'rich', 'richly', 'soft',
  'light', 'medium', 'dark', 'darker', 'pale', 'fair', 'brown', 'beige', 'olive', 'bronze',
  'bronzed', 'tan', 'tanned', 'umber', 'sienna', 'golden', 'amber', 'ebony', 'copper',
  'coppery', 'porcelain', 'ivory', 'caramel', 'mahogany', 'honey', 'ruddy', 'freckled',
  'weathered', 'sun', 'tawny', 'sallow', 'russet', 'chestnut', 'walnut', 'almond', 'wheat',
])

const HAIR_MODIFIERS = new Set([
  'tightly', 'loosely', 'closely', 'neatly', 'short', 'shortish', 'long', 'medium', 'cropped',
  'curly', 'curled', 'coiled', 'coily', 'kinky', 'wavy', 'straight', 'braided', 'twisted',
  'thick', 'thin', 'fine', 'dense', 'salt', 'pepper', 'and', 'grey', 'gray', 'graying',
  'greying', 'silver', 'silvered', 'white', 'black', 'brown', 'blonde', 'blond', 'red',
  'auburn', 'ginger', 'chestnut', 'dark', 'light', 'buzzed', 'shaved', 'receding', 'tousled',
  'swept', 'slicked', 'back', 'shoulder', 'chin', 'length', 'natural', 'afro',
])

const FACIAL_HAIR_MODIFIERS = new Set([
  'short', 'full', 'thick', 'thin', 'trimmed', 'neat', 'neatly', 'close', 'cropped',
  'grizzled', 'greying', 'graying', 'grey', 'gray', 'silver', 'white', 'black', 'brown',
  'dark', 'light', 'red', 'salt', 'pepper', 'and', 'patchy', 'scruffy', 'heavy', 'groomed',
  'well', 'untrimmed', 'wiry', 'curly', 'days', 'day', 'unshaven',
])

const SKIN_NOUNS = /\b(skin|complexion)\b/i
const HAIR_NOUNS = /\b(hair)\b/i
const FACIAL_HAIR_NOUNS = /\b(beard|moustache|mustache|goatee|stubble|sideburns)\b/i

/**
 * A hyphenated token ("medium-brown", "salt-and-pepper") is allowed when every
 * part of it is, so compounds do not each need their own entry.
 */
function isAllowedModifier(token: string, allowed: Set<string>): boolean {
  const word = token.toLowerCase().replace(/^[^a-z]+|[^a-z-]+$/g, '')
  if (!word) return false
  return word.split('-').filter(Boolean).every((part) => allowed.has(part))
}

/**
 * Grow a phrase leftward from a trait noun while the preceding words are
 * recognized modifiers, so "his warm medium-brown skin" yields the tone and
 * drops the pronoun.
 */
function extractTraitPhrase(text: string, noun: RegExp, allowed: Set<string>): string | undefined {
  const match = text.match(noun)
  if (!match || match.index == null) return undefined

  const head = match[0].toLowerCase()
  const before = text.slice(0, match.index).split(/\s+/).filter(Boolean)

  const modifiers: string[] = []
  for (let i = before.length - 1; i >= 0; i -= 1) {
    const token = before[i]
    if (!isAllowedModifier(token, allowed)) break
    modifiers.unshift(token.toLowerCase().replace(/^[^a-z]+|[^a-z-]+$/g, ''))
  }

  while (modifiers.length > 0 && (modifiers[0] === 'and' || modifiers[0] === 'well')) {
    modifiers.shift()
  }
  if (modifiers.length === 0) return undefined

  return `${modifiers.join(' ')} ${head}`
}

/**
 * Heritage terms a portrait actually shows.
 *
 * Read from the vision pass only. The `ethnicity` field is a casting and accent
 * tag — "neutral American" — and never a source here; that is what
 * `ethnicityKeyFeature` exists to block. But a vision description opens with
 * what the portrait looks like ("An East Asian woman in her mid-to-late 40s"),
 * and dropping that left the clause satisfiable by the wrong face: a frame that
 * ignored its identity reference rendered Piper Hayes as a Caucasian woman and
 * still agreed with "warm light-tan complexion, straight shoulder-length black
 * hair, late 40s" (production 2026-09-12).
 */
const ETHNICITY_TERMS = [
  'east asian', 'southeast asian', 'south asian', 'central asian', 'asian',
  'african american', 'afro descendant', 'afro caribbean', 'afro latina', 'afro latino',
  'north african', 'african', 'black',
  'white', 'caucasian',
  'latin american', 'latina', 'latino', 'latinx', 'hispanic',
  'middle eastern', 'arab', 'persian',
  'native american', 'first nations', 'indigenous',
  'pacific islander', 'polynesian', 'melanesian', 'micronesian', 'aboriginal', 'maori',
  'mixed race', 'biracial', 'multiracial',
  'chinese', 'japanese', 'korean', 'vietnamese', 'filipino', 'filipina', 'thai',
  'sri lankan', 'bangladeshi', 'pakistani', 'indian', 'nepali',
  'nigerian', 'ghanaian', 'ethiopian', 'somali', 'kenyan', 'senegalese', 'congolese',
  'puerto rican', 'mexican', 'brazilian', 'colombian', 'cuban', 'dominican',
  'jamaican', 'haitian', 'trinidadian',
  'turkish', 'iranian', 'lebanese', 'syrian', 'egyptian', 'moroccan', 'algerian', 'israeli',
  'mediterranean', 'scandinavian', 'nordic', 'slavic', 'romani',
]

/**
 * Longest first, so "East Asian" wins over "Asian" and "African American" over
 * "African". Spaces match a hyphen too, because the same term is written both
 * ways in one description.
 */
const ETHNICITY_ALTERNATION = [...ETHNICITY_TERMS]
  .sort((a, b) => b.length - a.length)
  .map((term) => term.replace(/ /g, '[- ]'))
  .join('|')

/**
 * A term only counts next to the person it describes. Without this, "straight
 * shoulder-length black hair" reads as an ethnicity of "black".
 */
const PERSON_NOUNS = 'man|woman|male|female|person|adult|figure|guy|lady|gentleman|boy|girl'

const ETHNICITY_BEFORE_PERSON = new RegExp(
  `\\b((?:(?:mixed|part|partly)\\s+)?(?:${ETHNICITY_ALTERNATION})(?:[- ]american)?)\\s+(?:${PERSON_NOUNS})\\b`,
  'i'
)

const ETHNICITY_AS_HERITAGE = new RegExp(
  `\\bof\\s+((?:(?:mixed|part|partly)\\s+)?(?:${ETHNICITY_ALTERNATION})\\s+(?:heritage|descent|ancestry|extraction))\\b`,
  'i'
)

function extractEthnicity(visionDescription: string | null | undefined): string | undefined {
  const text = (visionDescription ?? '').trim()
  if (!text) return undefined

  const match = text.match(ETHNICITY_BEFORE_PERSON) ?? text.match(ETHNICITY_AS_HERITAGE)
  return match?.[1]?.replace(/\s+/g, ' ').trim() || undefined
}

const AGE_BAND = /\b(early|mid|late)[- ]?((?:20|30|40|50|60|70|80)s)\b/i
const AGE_YEARS = /\b(\d{2})[- ](?:year|years)[- ]old\b/i
const AGE_DECADE = /\b(?:his|her|their)\s+((?:20|30|40|50|60|70|80)s)\b/i

function extractAge(text: string): string | undefined {
  const band = text.match(AGE_BAND)
  if (band) return `${band[1].toLowerCase()} ${band[2]}`

  const years = text.match(AGE_YEARS)
  if (years) return `${years[1]} years old`

  const decade = text.match(AGE_DECADE)
  if (decade) return decade[1]

  return undefined
}

function extractHair(
  text: string,
  character: { hairStyle?: string; hairColor?: string }
): string | undefined {
  if (/\b(bald|shaved head|clean[- ]shaven head)\b/i.test(text)) return 'bald head'

  return (
    extractTraitPhrase(text, HAIR_NOUNS, HAIR_MODIFIERS) ??
    buildCharacterHairDescription(character) ??
    extractHairStyleFromAppearance(text)
  )
}

function extractFacialHair(text: string): string | undefined {
  if (/\bclean[- ]shaven\b/i.test(text)) return 'clean-shaven'
  return extractTraitPhrase(text, FACIAL_HAIR_NOUNS, FACIAL_HAIR_MODIFIERS)
}

function countWords(value: string): number {
  return value.split(/\s+/).filter(Boolean).length
}

/**
 * Heritage, skin, hair, facial hair, age — in that order, because that is the
 * order a mismatch is noticed in, and the cap drops whatever no longer fits.
 * Heritage leads because it is what the validator rejects frames over.
 */
export function buildIdentityTraitsClause(character: {
  appearanceDescription?: string | null
  visionDescription?: string | null
  hairStyle?: string
  hairColor?: string
  wordCap?: number
}): string | undefined {
  const text = (character.visionDescription || character.appearanceDescription || '').trim()
  const hasStructuredHair = Boolean(character.hairStyle?.trim())
  if (!text && !hasStructuredHair) return undefined

  const candidates = [
    extractEthnicity(character.visionDescription),
    extractTraitPhrase(text, SKIN_NOUNS, SKIN_MODIFIERS),
    extractHair(text, character),
    extractFacialHair(text),
    extractAge(text),
  ]

  const cap = character.wordCap ?? IDENTITY_TRAITS_WORD_CAP
  const traits: string[] = []
  let words = 0
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const trait = candidate?.trim().replace(/\s+/g, ' ')
    if (!trait) continue
    const key = trait.toLowerCase()
    if (seen.has(key)) continue
    const length = countWords(trait)
    if (words + length > cap) continue
    seen.add(key)
    traits.push(trait)
    words += length
  }

  return traits.length > 0 ? traits.join(', ') : undefined
}

export interface IdentityEscalationCharacter {
  name?: string
  promptToken?: string
  appearanceDescription?: string | null
  visionDescription?: string | null
  hairStyle?: string
  hairColor?: string
}

/**
 * Stronger identity statement for a likeness retry.
 *
 * Round 0 states traits once, briefly, in the legend, and that is the right
 * default — a long appearance essay competes with the portrait. But once
 * validation reports the frame is a different person, re-sending the same brief
 * clause asks for the same answer. The retry restates the traits at a wider cap
 * and names the four properties the validator actually rejects frames over, so
 * the second attempt is arguing against a specific failure rather than
 * re-rolling the dice.
 */
export function buildIdentityEscalationBlock(
  characters: IdentityEscalationCharacter[]
): string {
  const lines: string[] = []
  const seen = new Set<string>()

  for (const character of characters) {
    const token = character.promptToken?.trim()
    if (!token || seen.has(token)) continue
    const traits = buildIdentityTraitsClause({
      ...character,
      wordCap: IDENTITY_TRAITS_RETRY_WORD_CAP,
    })
    if (!traits) continue
    seen.add(token)
    lines.push(`${token}${character.name ? ` (${character.name})` : ''} must read as: ${traits}.`)
  }

  if (lines.length === 0) return ''
  return [
    'IDENTITY RETRY LOCK — the previous attempt rendered a different person.',
    ...lines,
    'Ethnicity, skin tone, hair texture, and apparent age come from the identity reference image. Do not substitute a different one.',
  ].join('\n')
}
