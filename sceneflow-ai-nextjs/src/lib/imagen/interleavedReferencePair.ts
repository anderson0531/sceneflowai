/**
 * Interleaved `[REFERENCE: ROLE - token]` captions for Gemini Pro stills.
 *
 * Pro thinking T2I typeset send-index labels (`person [1]`, `prop [3]`) and the
 * `[REFERENCES]` wall onto the frame. Each plate is paired with a short
 * physical descriptor and a role-stable token (`person [1]`, `prop [1]`) so
 * action text and the image beside it use the same name. Flash keeps the
 * structured `[REFERENCES]` still.
 */

import { buildIdentityPromptToken } from '@/lib/imagen/promptOptimizer'
import { buildIdentityTraitsClause } from '@/lib/imagen/identityTraitsClause'
import { formatWardrobeLegendClause } from '@/lib/imagen/structuredStillPrompt'
import { toCharacterPromptAlias } from '@/lib/character/characterPromptAlias'

export const PAIR_DESCRIPTOR_WORD_CAP = 18

export type InterleavedReferencePairRole =
  | 'IDENTITY'
  | 'WARDROBE'
  | 'PROP'
  | 'LOCATION'
  | 'CHARACTER'

export interface InterleavedPairCharacter {
  name: string
  promptToken?: string
  subjectOrdinal?: number
  appearanceDescription?: string | null
  visionDescription?: string | null
  hairStyle?: string
  hairColor?: string
  wardrobeDescription?: string | null
  defaultWardrobe?: string | null
  appearance?: string | null
  wardrobe?: string | null
}

export interface InterleavedPairPlate {
  imageUrl: string
  name?: string
  characterName?: string
  refRole?: string
  role?: string
  propName?: string
  locationName?: string
  promptToken?: string
  propDescription?: string
  subjectOrdinal?: number
}

const SCALE_ESSAY_PATTERN =
  /do not enlarge|set-piece scale|handheld \/ real-world|furniture \/ set-piece|not a second wide subject|environment plate/i

export function clipPairDescriptor(
  text: string,
  wordCap: number = PAIR_DESCRIPTOR_WORD_CAP
): string {
  const first = text.replace(/\s+/g, ' ').trim().split(/[.!?]/)[0]?.trim() || ''
  if (!first) return ''
  return first.split(/\s+/).filter(Boolean).slice(0, wordCap).join(' ')
}

export function formatInterleavedReferencePair(args: {
  role: InterleavedReferencePairRole
  token: string
  descriptor: string
}): string {
  const tag = `[REFERENCE: ${args.role} - ${args.token}]`
  const descriptor = clipPairDescriptor(args.descriptor)
  return descriptor ? `${tag} ${descriptor}` : tag
}

function libraryKindToken(
  promptToken: string | undefined,
  kind: 'person' | 'prop' | 'location'
): string | undefined {
  const token = promptToken?.replace(/\s+/g, ' ').trim()
  if (!token) return undefined
  return new RegExp(`^${kind} \\[\\d+\\]$`, 'i').test(token) ? token : undefined
}

function personTokenFor(
  characterName: string,
  character: InterleavedPairCharacter | undefined,
  subjectOrdinal: number | undefined,
  assigned: Map<string, string>
): string {
  const existing = assigned.get(characterName)
  if (existing) return existing

  const token =
    libraryKindToken(character?.promptToken, 'person') ||
    (character?.subjectOrdinal != null
      ? buildIdentityPromptToken(character.subjectOrdinal)
      : undefined) ||
    (subjectOrdinal != null ? buildIdentityPromptToken(subjectOrdinal) : undefined) ||
    buildIdentityPromptToken(assigned.size + 1)

  assigned.set(characterName, token)
  return token
}

function findCharacter(
  name: string | undefined,
  characters: InterleavedPairCharacter[]
): InterleavedPairCharacter | undefined {
  const needle = (name || '').trim()
  if (!needle) return undefined
  const lower = needle.toLowerCase()
  return characters.find((character) => {
    const full = character.name.trim()
    if (!full) return false
    if (full === needle || lower.includes(full.toLowerCase())) return true
    return lower.includes(toCharacterPromptAlias(full).toLowerCase())
  })
}

function identityDescriptor(
  characterName: string,
  character: InterleavedPairCharacter | undefined
): string {
  const traits = buildIdentityTraitsClause({
    appearanceDescription: character?.appearanceDescription || character?.appearance,
    visionDescription: character?.visionDescription,
    hairStyle: character?.hairStyle,
    hairColor: character?.hairColor,
  })
  return traits
    ? `Facial reference for ${characterName}: ${traits}`
    : `Facial reference for ${characterName}.`
}

function wardrobeDescriptor(character: InterleavedPairCharacter | undefined): string {
  const clause = formatWardrobeLegendClause(
    character?.wardrobeDescription || character?.defaultWardrobe || character?.wardrobe
  )
  return clause ? `Outfit reference: ${clause}` : 'Outfit reference: full-body wardrobe'
}

function objectDescriptor(propName: string, description?: string | null): string {
  const usable =
    description && !SCALE_ESSAY_PATTERN.test(description)
      ? clipPairDescriptor(description)
      : ''
  return usable ? `Object reference: ${usable}` : `Object reference: ${propName}`
}

function environmentDescriptor(locationName: string, description?: string | null): string {
  const usable =
    description && !SCALE_ESSAY_PATTERN.test(description)
      ? clipPairDescriptor(description)
      : ''
  return usable
    ? `Environment reference: ${usable}`
    : `Environment reference: ${locationName}`
}

function plateRole(plate: InterleavedPairPlate): InterleavedReferencePairRole | null {
  if (plate.refRole === 'identity') return 'IDENTITY'
  if (plate.refRole === 'wardrobe') return 'WARDROBE'
  if (plate.refRole === 'wardrobe-diptych') return 'CHARACTER'
  if (plate.propName) return 'PROP'
  if (plate.locationName || plate.role === 'location') return 'LOCATION'
  return inferInterleavedPairRoleFromLabel(plate.name || '')
}

export function inferInterleavedPairRoleFromLabel(
  name: string
): InterleavedReferencePairRole | null {
  const lower = name.toLowerCase()
  if (/\bcharacter reference\b/.test(lower)) return 'CHARACTER'
  if (/\bwardrobe\b/.test(lower) && !/\bidentity\b/.test(lower)) return 'WARDROBE'
  if (/\bidentity\b/.test(lower)) return 'IDENTITY'
  if (/\bprop\b/.test(lower)) return 'PROP'
  if (/\blocation\b/.test(lower)) return 'LOCATION'
  return null
}

/**
 * Caption attached plates in send order. Tokens are role-stable and 1-based
 * among sent people/props/locations — identity and wardrobe of one subject
 * share `person [1]`; the first prop is `prop [1]` even when it is image 3.
 */
export function buildInterleavedReferencePairCaptions(
  plates: InterleavedPairPlate[],
  characterReferences: InterleavedPairCharacter[] = []
): Array<{ imageUrl: string; name: string }> {
  const personTokens = new Map<string, string>()
  let nextProp = 0
  let nextLocation = 0

  return plates.map((plate) => {
    const role = plateRole(plate)
    if (!role) {
      return { imageUrl: plate.imageUrl, name: plate.name || '' }
    }

    if (role === 'IDENTITY' || role === 'WARDROBE' || role === 'CHARACTER') {
      const characterName = plate.characterName || findCharacter(plate.name, characterReferences)?.name
      if (!characterName) {
        return { imageUrl: plate.imageUrl, name: plate.name || '' }
      }
      const character = findCharacter(characterName, characterReferences)
      const token = personTokenFor(
        characterName,
        character,
        plate.subjectOrdinal,
        personTokens
      )
      const descriptor =
        role === 'WARDROBE'
          ? wardrobeDescriptor(character)
          : role === 'CHARACTER'
            ? `Face and full-body wardrobe of ${characterName}.`
            : identityDescriptor(characterName, character)
      return {
        imageUrl: plate.imageUrl,
        name: formatInterleavedReferencePair({ role, token, descriptor }),
      }
    }

    if (role === 'PROP') {
      nextProp += 1
      const propName = plate.propName || plate.name || 'Prop'
      const token =
        libraryKindToken(plate.promptToken, 'prop') || `prop [${nextProp}]`
      return {
        imageUrl: plate.imageUrl,
        name: formatInterleavedReferencePair({
          role,
          token,
          descriptor: objectDescriptor(propName, plate.propDescription),
        }),
      }
    }

    nextLocation += 1
    const locationName = plate.locationName || plate.name || 'Location'
    const token =
      libraryKindToken(plate.promptToken, 'location') || `location [${nextLocation}]`
    return {
      imageUrl: plate.imageUrl,
      name: formatInterleavedReferencePair({
        role,
        token,
        descriptor: environmentDescriptor(locationName),
      }),
    }
  })
}

/**
 * Recaption a loosely labeled segment-frame list (Char_ aliases, `Prop:`)
 * into interleaved pair tags without changing send order.
 */
export function applyInterleavedPairCaptionsToNamedImages(
  images: Array<{ imageUrl: string; name: string }>,
  lookup?: {
    characters?: InterleavedPairCharacter[]
    objects?: Array<{ name: string; description?: string }>
    locations?: Array<{ name: string; description?: string }>
  }
): Array<{ imageUrl: string; name: string }> {
  const characters = lookup?.characters ?? []
  const objects = lookup?.objects ?? []
  const locations = lookup?.locations ?? []

  const plates: InterleavedPairPlate[] = images.map((image) => {
    const role = inferInterleavedPairRoleFromLabel(image.name)
    const character = findCharacter(image.name, characters)
    const object = objects.find((item) =>
      image.name.toLowerCase().includes(item.name.toLowerCase())
    )
    const location = locations.find((item) =>
      image.name.toLowerCase().includes(item.name.toLowerCase())
    )
    return {
      imageUrl: image.imageUrl,
      name: image.name,
      characterName: character?.name,
      refRole:
        role === 'IDENTITY'
          ? 'identity'
          : role === 'WARDROBE'
            ? 'wardrobe'
            : role === 'CHARACTER'
              ? 'wardrobe-diptych'
              : undefined,
      propName: role === 'PROP' ? object?.name || image.name.replace(/^prop:\s*/i, '').trim() : undefined,
      propDescription: object?.description,
      locationName: role === 'LOCATION' ? location?.name || undefined : undefined,
      role: role === 'LOCATION' ? 'location' : undefined,
    }
  })

  return buildInterleavedReferencePairCaptions(plates, characters).map((caption, index) => ({
    imageUrl: caption.imageUrl,
    name: caption.name || images[index]?.name || '',
  }))
}
