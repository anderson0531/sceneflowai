/**
 * Prompt builders for character identity reference images (Pre-Vis / scene generation).
 */

export const CHARACTER_IDENTITY_REFERENCE_ANCHOR =
  'Photorealistic headshot to be used as a character reference.'

export interface CharacterIdentityReferencePromptInput {
  appearanceDescription: string
  wardrobeDescription?: string | null
}

export interface CharacterForWardrobeResolution {
  defaultWardrobe?: string | null
  wardrobeAccessories?: string | null
  wardrobes?: Array<{
    id?: string
    name?: string
    description?: string
    accessories?: string
    isDefault?: boolean
  }> | null
}

function formatWardrobeLine(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('wearing ')) return trimmed
  if (/^(a|an|the)\s/i.test(trimmed)) return `Wearing ${trimmed}.`
  return `Wearing ${trimmed}.`
}

/** Resolve default wardrobe text from collection or legacy fields. */
export function resolveDefaultWardrobeDescription(
  character: CharacterForWardrobeResolution
): string | undefined {
  const wardrobes = character.wardrobes
  if (Array.isArray(wardrobes) && wardrobes.length > 0) {
    const defaultEntry =
      wardrobes.find((w) => w.isDefault === true) ?? wardrobes[0]
    const parts = [defaultEntry.description?.trim(), defaultEntry.accessories?.trim()].filter(
      Boolean
    ) as string[]
    if (parts.length > 0) return parts.join('. ')
  }

  const legacy = character.defaultWardrobe?.trim()
  if (legacy) {
    const accessories = character.wardrobeAccessories?.trim()
    return accessories ? `${legacy}. ${accessories}` : legacy
  }

  return undefined
}

/** Build appearance text from structured character attributes when vision description is missing. */
export function buildAppearanceDescriptionFromAttributes(character: {
  name?: string
  ethnicity?: string
  keyFeature?: string
  build?: string
  hairColor?: string
  hairStyle?: string
  eyeColor?: string
  expression?: string
  appearanceDescription?: string
  appearance?: string
  description?: string
}): string {
  const existing =
    character.appearanceDescription?.trim() ||
    character.appearance?.trim() ||
    character.description?.trim()
  if (existing) return existing

  const parts: string[] = []
  if (character.ethnicity) parts.push(character.ethnicity)
  if (character.keyFeature) parts.push(character.keyFeature)
  if (character.build) parts.push(character.build)
  if (character.hairColor && character.hairStyle) {
    parts.push(`${character.hairColor} ${character.hairStyle} hair`)
  } else if (character.hairStyle) {
    parts.push(`${character.hairStyle} hair`)
  } else if (character.hairColor) {
    parts.push(`${character.hairColor} hair`)
  }
  if (character.eyeColor) parts.push(`${character.eyeColor} eyes`)
  if (character.expression) parts.push(character.expression)

  if (parts.length > 0) return parts.join(', ')
  return character.name?.trim() || 'Character'
}

export function buildCharacterIdentityReferencePrompt(
  input: CharacterIdentityReferencePromptInput
): string {
  const appearance = input.appearanceDescription.trim()
  const lines = [CHARACTER_IDENTITY_REFERENCE_ANCHOR, '', appearance]

  const wardrobe = input.wardrobeDescription?.trim()
  if (wardrobe) {
    lines.push('', formatWardrobeLine(wardrobe))
  }

  return lines.join('\n')
}

export function buildCharacterIdentityReferencePromptFromCharacter(
  character: CharacterForWardrobeResolution & Parameters<typeof buildAppearanceDescriptionFromAttributes>[0]
): string {
  return buildCharacterIdentityReferencePrompt({
    appearanceDescription: buildAppearanceDescriptionFromAttributes(character),
    wardrobeDescription: resolveDefaultWardrobeDescription(character),
  })
}

export function promptHasIdentityReferenceAnchor(prompt: string): boolean {
  return prompt.includes(CHARACTER_IDENTITY_REFERENCE_ANCHOR)
}
