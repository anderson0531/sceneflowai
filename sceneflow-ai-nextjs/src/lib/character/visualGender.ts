import { resolveCharacterGender, type CharacterContext } from '@/lib/voiceRecommendation'

export type CharacterGender = 'male' | 'female' | 'non-binary' | 'unspecified'
export type GenderSource = 'ai' | 'user' | 'inferred'

export interface VisualGenderCharacter {
  name?: string
  gender?: string
  genderSource?: GenderSource
  appearanceDescription?: string
  description?: string
  ethnicity?: string
  age?: string | number
  ageRange?: string
  keyFeature?: string
  role?: string
  personality?: string
}

export interface ResolvedVisualGender {
  gender: CharacterGender | null
  source: GenderSource | 'ambiguous'
  /** True when gender should drive prompt builders and pronoun correction. */
  isAuthoritative: boolean
}

const AUTHORITATIVE_GENDERS = new Set<CharacterGender>(['male', 'female', 'non-binary'])

export function normalizeCharacterGender(value?: string): CharacterGender | null {
  if (!value) return null
  const g = value.trim().toLowerCase()
  if (g === 'male' || g === 'm' || g === 'man' || g === 'masculine' || g === 'boy') {
    return 'male'
  }
  if (g === 'female' || g === 'f' || g === 'woman' || g === 'feminine' || g === 'girl') {
    return 'female'
  }
  if (g === 'non-binary' || g === 'nonbinary' || g === 'non binary' || g === 'nb') {
    return 'non-binary'
  }
  if (g === 'unspecified' || g === 'unknown' || g === 'other') {
    return 'unspecified'
  }
  return null
}

export function isFemaleGender(gender?: CharacterGender | null): boolean {
  return gender === 'female'
}

export function genderToSubjectTerm(gender?: CharacterGender | null): string {
  if (gender === 'female') return 'the woman'
  if (gender === 'male') return 'the man'
  return 'the subject'
}

export function getPronounsForGender(gender?: CharacterGender | null): {
  subject: string
  object: string
  possessive: string
  subjectCap: string
  possessiveCap: string
} {
  if (gender === 'female') {
    return {
      subject: 'she',
      object: 'her',
      possessive: 'her',
      subjectCap: 'She',
      possessiveCap: 'Her',
    }
  }
  if (gender === 'male') {
    return {
      subject: 'he',
      object: 'him',
      possessive: 'his',
      subjectCap: 'He',
      possessiveCap: 'His',
    }
  }
  return {
    subject: 'they',
    object: 'them',
    possessive: 'their',
    subjectCap: 'They',
    possessiveCap: 'Their',
  }
}

export function resolveVisualGender(character: VisualGenderCharacter): ResolvedVisualGender {
  if (character.genderSource === 'user') {
    const userGender = normalizeCharacterGender(character.gender)
    if (userGender) {
      return {
        gender: userGender,
        source: 'user',
        isAuthoritative: AUTHORITATIVE_GENDERS.has(userGender),
      }
    }
    return { gender: 'unspecified', source: 'user', isAuthoritative: false }
  }

  const explicit = normalizeCharacterGender(character.gender)
  if (explicit) {
    return {
      gender: explicit,
      source: character.genderSource === 'ai' ? 'ai' : 'ai',
      isAuthoritative: AUTHORITATIVE_GENDERS.has(explicit),
    }
  }

  const context: CharacterContext = {
    name: character.name || 'Unknown',
    role: character.role,
    gender: character.gender,
    age: character.age ?? character.ageRange,
    ethnicity: character.ethnicity,
    personality: character.keyFeature,
    description: character.description || character.appearanceDescription,
  }
  const inferred = resolveCharacterGender(context)
  if (inferred.gender) {
    return {
      gender: inferred.gender,
      source: 'inferred',
      isAuthoritative: false,
    }
  }

  return { gender: null, source: 'ambiguous', isAuthoritative: false }
}

function replacePronoun(
  text: string,
  pattern: RegExp,
  replacement: string
): string {
  return text.replace(pattern, replacement)
}

/**
 * Align pronouns and gendered nouns in prompt text with an authoritative gender.
 * Only call when resolveVisualGender().isAuthoritative is true.
 */
export function correctPronounsToGender(
  text: string,
  gender: CharacterGender,
  options?: { characterName?: string }
): string {
  if (!text?.trim()) return text

  let result = text

  if (gender === 'male') {
    result = replacePronoun(result, /\bShe\b/g, 'He')
    result = replacePronoun(result, /\bshe\b/g, 'he')
    result = replacePronoun(result, /\bHer\b(?=\s+[a-z])/g, 'His')
    result = replacePronoun(result, /\bher\b(?=\s+[a-z])/g, 'his')
    result = replacePronoun(result, /\bHer\b/g, 'Him')
    result = replacePronoun(result, /\bher\b/g, 'him')
    result = replacePronoun(result, /\bHers\b/g, 'His')
    result = replacePronoun(result, /\bhers\b/g, 'his')
    result = replacePronoun(result, /\bWoman\b/g, 'Man')
    result = replacePronoun(result, /\bwoman\b/g, 'man')
    result = replacePronoun(result, /\bFemale\b/g, 'Male')
    result = replacePronoun(result, /\bfemale\b/g, 'male')
  } else if (gender === 'female') {
    result = replacePronoun(result, /\bHe\b/g, 'She')
    result = replacePronoun(result, /\bhe\b/g, 'she')
    result = replacePronoun(result, /\bHis\b(?=\s+[a-z])/g, 'Her')
    result = replacePronoun(result, /\bhis\b(?=\s+[a-z])/g, 'her')
    result = replacePronoun(result, /\bHim\b/g, 'Her')
    result = replacePronoun(result, /\bhim\b/g, 'her')
    result = replacePronoun(result, /\bMan\b/g, 'Woman')
    result = replacePronoun(result, /\bman\b/g, 'woman')
    result = replacePronoun(result, /\bMale\b/g, 'Female')
    result = replacePronoun(result, /\bmale\b/g, 'female')
  } else if (gender === 'non-binary') {
    result = replacePronoun(result, /\bShe\b/g, 'They')
    result = replacePronoun(result, /\bshe\b/g, 'they')
    result = replacePronoun(result, /\bHe\b/g, 'They')
    result = replacePronoun(result, /\bhe\b/g, 'they')
    result = replacePronoun(result, /\bHer\b(?=\s+[a-z])/g, 'Their')
    result = replacePronoun(result, /\bher\b(?=\s+[a-z])/g, 'their')
    result = replacePronoun(result, /\bHis\b(?=\s+[a-z])/g, 'Their')
    result = replacePronoun(result, /\bhis\b(?=\s+[a-z])/g, 'their')
    result = replacePronoun(result, /\bHim\b/g, 'Them')
    result = replacePronoun(result, /\bhim\b/g, 'them')
    result = replacePronoun(result, /\bHer\b/g, 'Them')
    result = replacePronoun(result, /\bher\b/g, 'them')
  }

  if (options?.characterName && (gender === 'non-binary' || gender === 'unspecified')) {
    const name = options.characterName
    result = result.replace(/\bthe subject\b/gi, name)
  }

  return result
}

export function formatGenderLabel(gender?: CharacterGender | null): string {
  if (!gender || gender === 'unspecified') return 'Unspecified'
  if (gender === 'non-binary') return 'Non-binary'
  return gender.charAt(0).toUpperCase() + gender.slice(1)
}
