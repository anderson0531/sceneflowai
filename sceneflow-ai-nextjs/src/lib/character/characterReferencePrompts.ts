/**
 * Prompt builders for character identity reference images (Pre-Vis / scene generation).
 */

export const CHARACTER_IDENTITY_REFERENCE_ANCHOR =
  'Photorealistic headshot to be used as a character reference.'

/** Shared photographic realism block for identity headshots and enhance-reference. */
export const IDENTITY_PHOTO_REALISM_DIRECTIVES = [
  'Framing: tight head-and-shoulders portrait, face centered, eye-level camera.',
  'Expression: neutral relaxed expression, mouth closed, direct eye contact.',
  'Lighting: soft professional key light with natural catchlights in both eyes; even skin tone, no harsh shadows.',
  'Lens: 85mm portrait lens look, shallow depth of field, natural skin texture and pores, no plastic smoothing.',
  'Background: plain neutral gray studio backdrop, no props or distractions.',
  'Style: photorealistic human photography only — no illustration, cartoon, CGI, or stylization.',
].join('\n')

export const ENHANCE_IDENTITY_REFERENCE_PREFIX =
  'Refine this portrait into a professional casting headshot. Preserve the exact person in the reference photo — same face shape, bone structure, skin tone, age, ethnicity, and hairstyle.'

export interface CharacterIdentityReferencePromptInput {
  appearanceDescription: string
  wardrobeDescription?: string | null
  /** When true, omit wardrobe line (enhance pass uses appearance only). */
  omitWardrobe?: boolean
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

export interface FullBodyWardrobePromptInput {
  characterName: string
  appearanceDescription?: string
  wardrobeDescription?: string
  wardrobeAccessories?: string
  hairAnchor?: string
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
  const lines = [
    CHARACTER_IDENTITY_REFERENCE_ANCHOR,
    '',
    appearance,
    '',
    IDENTITY_PHOTO_REALISM_DIRECTIVES,
  ]

  if (!input.omitWardrobe) {
    const wardrobe = input.wardrobeDescription?.trim()
    if (wardrobe) {
      lines.push('', formatWardrobeLine(wardrobe))
    }
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

/** Prompt for enhance-reference / auto-enhance pass (reference-anchored refinement). */
export function buildEnhanceIdentityReferencePrompt(input: {
  characterName: string
  appearanceDescription: string
  wardrobeDescription?: string | null
  subjectDescription?: string
}): string {
  const appearance = input.appearanceDescription.trim()
  const subjectLine = input.subjectDescription?.trim()
    ? `Subject: ${input.subjectDescription}.`
    : `Subject: ${input.characterName}, the exact person shown in the reference photo.`

  const lines = [
    ENHANCE_IDENTITY_REFERENCE_PREFIX,
    '',
    subjectLine,
    '',
    appearance,
    '',
    IDENTITY_PHOTO_REALISM_DIRECTIVES,
    '',
    'Transform lighting to bright professional studio quality while keeping facial features identical to the reference.',
  ]

  const wardrobe = input.wardrobeDescription?.trim()
  if (wardrobe) {
    lines.push('', formatWardrobeLine(wardrobe))
  }

  return lines.join('\n')
}

export const FULL_BODY_WARDROBE_REFERENCE_ANCHOR =
  'Photorealistic full-body wardrobe reference for cinematic character consistency.'

/** Full-body front-facing wardrobe image prompt (identity face attached as reference). */
export function buildFullBodyWardrobePrompt(input: FullBodyWardrobePromptInput): string {
  const wardrobeParts = [input.wardrobeDescription?.trim(), input.wardrobeAccessories?.trim()].filter(
    Boolean
  ) as string[]

  const lines = [
    FULL_BODY_WARDROBE_REFERENCE_ANCHOR,
    '',
    `Character: ${input.characterName}. Same real person as the attached identity reference photo — match face exactly.`,
    '',
    'Pose: full-length front-facing standing pose, relaxed neutral stance, head to feet visible including footwear.',
    'Framing: single subject centered, entire outfit visible with no cropping at ankles or head.',
    'Background: plain neutral gray studio backdrop matching the identity headshot.',
    'Lighting: soft even studio lighting, photorealistic human photography.',
    'Style: photorealistic only — no illustration, mannequin, faceless figure, or turnaround sheet layout.',
  ]

  if (input.hairAnchor?.trim()) {
    lines.push(`Hairstyle (match identity reference): ${input.hairAnchor.trim()}.`)
  }

  if (input.appearanceDescription?.trim()) {
    lines.push(`Identity notes: ${input.appearanceDescription.trim()}.`)
  }

  if (wardrobeParts.length) {
    lines.push('', `Outfit: ${wardrobeParts.join('. ')}.`)
  }

  lines.push(
    '',
    'The face must match the attached identity reference exactly. This image is used for wardrobe/outfit fidelity only in downstream frames.'
  )

  return lines.join('\n')
}

export function promptHasIdentityReferenceAnchor(prompt: string): boolean {
  return prompt.includes(CHARACTER_IDENTITY_REFERENCE_ANCHOR)
}
