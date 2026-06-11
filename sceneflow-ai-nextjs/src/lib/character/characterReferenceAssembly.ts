/**
 * Resolve identity vs wardrobe reference URLs and build role-specific consumption instructions.
 */

export const CHARACTER_IDENTITY_REFERENCE_INSTRUCTION =
  'IDENTITY REFERENCE (PRIMARY): Match face, hair, skin tone, age, ethnicity, body proportions, and photorealistic rendering style from this image exactly at all shot distances. ' +
  'This image owns identity and realism — ignore clothing in this image if it differs from the scene wardrobe; outfit comes from the wardrobe reference or text.'

export const WARDROBE_ONLY_REFERENCE_INSTRUCTION =
  'WARDROBE REFERENCE (SECONDARY): This is a 1-row mannequin outfit turnaround sheet. Use the FRONT full-body view for outfit, fabric, color, and accessories ONLY. ' +
  'Do NOT derive face, hair, skin tone, body type, ethnicity, age, or rendering style from this sheet — identity and photorealism come from the separate identity reference. ' +
  'Do NOT reproduce the turnaround layout, mannequin form, multi-view sheet, or neutral gray studio background in the scene.'

/** Global priority block injected before per-image lines when dual refs exist. */
export const DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK =
  'DUAL REFERENCE PRIORITY: Identity reference = PRIMARY for face, hair, skin, age, ethnicity, body proportions, and photorealistic human rendering at ALL shot distances (wide, medium, close). ' +
  'Wardrobe reference = SECONDARY for outfit colors, fabric, cut, and accessories ONLY. ' +
  'Never adopt mannequin form, faceless figure, turnaround sheet layout, gray studio background, illustration, or cartoon style from the wardrobe image.'

const WIDE_SHOT_KEYWORDS = /\b(wide|establishing|full[- ]?body|long shot|master shot|extreme wide)\b/i

/** Extra reinforcement for wide/establishing shots where wardrobe sheets visually dominate. */
export function buildFramingAwareIdentityBlock(shotType?: string): string {
  if (!shotType || !WIDE_SHOT_KEYWORDS.test(shotType)) {
    return ''
  }
  return (
    'WIDE/ESTABLISHING SHOT: Characters must remain photorealistic humans matching their identity reference at full distance — ' +
    'do NOT let the wardrobe mannequin sheet define body type, face, skin, or rendering style. ' +
    'Extract only outfit colors and garment shapes from the wardrobe reference.'
  )
}

/** Negative prompt terms when dual refs + photorealistic mode. */
export function buildDualReferenceNegativeTerms(): string {
  return [
    'mannequin',
    'faceless figure',
    'turnaround sheet',
    'fashion illustration',
    'cartoon',
    'anime',
    'storyboard sketch',
    'illustrated character',
    '3d render character',
  ].join(', ')
}

export interface CharacterReferencePair {
  identityUrl?: string
  wardrobeUrl?: string
  hasDualReferences: boolean
  /** Wardrobe-only (no portrait): single turnaround drives both via legacy instruction */
  hasWardrobeOnlyReference: boolean
  resolvedWardrobe?: {
    id?: string
    name?: string
    description?: string
    accessories?: string
  } | null
}

export interface ResolveCharacterReferencePairArgs {
  character: Record<string, unknown>
  scene?: Record<string, unknown> | null
  sceneIndex?: number
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
}

function trimUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Resolve scene wardrobe object for a character (override → scene number → default). */
export function resolveWardrobeForCharacter(
  character: Record<string, unknown>,
  scene?: Record<string, unknown> | null,
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>,
  sceneIndex?: number
): Record<string, unknown> | null {
  const wardrobes = character.wardrobes
  if (!Array.isArray(wardrobes) || wardrobes.length === 0) return null

  const charId = (character.id || character.name) as string
  let resolved: Record<string, unknown> | null = null

  const override = characterWardrobes?.find((cw) => cw.characterId === charId)
  if (override?.wardrobeId) {
    resolved =
      (wardrobes as Record<string, unknown>[]).find((w) => w.id === override.wardrobeId) ?? null
  }

  if (!resolved && sceneIndex !== undefined) {
    const sceneNum = sceneIndex + 1
    resolved =
      (wardrobes as Record<string, unknown>[]).find(
        (w) =>
          Array.isArray(w.sceneNumbers) &&
          (w.sceneNumbers as number[]).includes(sceneNum)
      ) ?? null
  }

  if (!resolved && scene && Array.isArray(scene.characterWardrobes) && charId) {
    const sceneOverride = (scene.characterWardrobes as Array<{ characterId: string; wardrobeId: string }>).find(
      (cw) => cw.characterId === charId
    )
    if (sceneOverride?.wardrobeId) {
      resolved =
        (wardrobes as Record<string, unknown>[]).find((w) => w.id === sceneOverride.wardrobeId) ?? null
    }
  }

  if (!resolved) {
    resolved = (wardrobes as Record<string, unknown>[]).find((w) => w.isDefault === true) ?? null
  }

  return resolved
}

export function resolveCharacterReferencePair(
  args: ResolveCharacterReferencePairArgs
): CharacterReferencePair {
  const { character, scene, sceneIndex, characterWardrobes } = args
  const identityUrl = trimUrl(character.referenceImage)
  const resolvedWardrobe = resolveWardrobeForCharacter(
    character,
    scene,
    characterWardrobes,
    sceneIndex
  )
  const fullBodyUrl = trimUrl(resolvedWardrobe?.fullBodyUrl)
  const portraitUrl = trimUrl(resolvedWardrobe?.portraitUrl as string | undefined)
  let wardrobeUrl = fullBodyUrl

  if (!wardrobeUrl && resolvedWardrobe && portraitUrl) {
    console.warn(
      `[CharacterRef] Wardrobe "${resolvedWardrobe.name ?? resolvedWardrobe.id ?? 'unknown'}" missing fullBodyUrl — falling back to portraitUrl (turnaround preferred for outfit consistency)`
    )
    wardrobeUrl = portraitUrl
  } else if (resolvedWardrobe && !fullBodyUrl) {
    console.warn(
      `[CharacterRef] Wardrobe "${resolvedWardrobe.name ?? resolvedWardrobe.id ?? 'unknown'}" has no fullBodyUrl — dual identity/wardrobe split may be incomplete`
    )
  }

  const hasDualReferences = !!(identityUrl && wardrobeUrl)
  const hasWardrobeOnlyReference = !!(!identityUrl && wardrobeUrl)

  return {
    identityUrl,
    wardrobeUrl,
    hasDualReferences,
    hasWardrobeOnlyReference,
    resolvedWardrobe: resolvedWardrobe
      ? {
          id: resolvedWardrobe.id as string | undefined,
          name: resolvedWardrobe.name as string | undefined,
          description: resolvedWardrobe.description as string | undefined,
          accessories: resolvedWardrobe.accessories as string | undefined,
        }
      : null,
  }
}

export function buildIdentityReferenceLabel(
  characterName: string,
  referenceIndex?: number
): string {
  const idx = referenceIndex != null ? ` ${referenceIndex}` : ''
  return `Identity reference${idx}: ${characterName}`
}

export function buildWardrobeReferenceLabel(
  characterName: string,
  referenceIndex?: number
): string {
  const idx = referenceIndex != null ? ` ${referenceIndex}` : ''
  return `Wardrobe reference${idx}: ${characterName} (1-row mannequin outfit sheet)`
}

export function buildDualReferenceLabels(
  characterName: string,
  identityIndex?: number,
  wardrobeIndex?: number
): { identityLabel: string; wardrobeLabel: string } {
  return {
    identityLabel: buildIdentityReferenceLabel(characterName, identityIndex),
    wardrobeLabel: buildWardrobeReferenceLabel(characterName, wardrobeIndex),
  }
}

export function buildIdentityReferencePromptLine(
  characterName: string,
  referenceIndex: number
): string {
  return `- Reference image ${referenceIndex}: IDENTITY REFERENCE for ${characterName}\n  ${CHARACTER_IDENTITY_REFERENCE_INSTRUCTION}`
}

export function buildWardrobeReferencePromptLine(
  characterName: string,
  referenceIndex: number
): string {
  return `- Reference image ${referenceIndex}: WARDROBE REFERENCE for ${characterName}\n  ${WARDROBE_ONLY_REFERENCE_INSTRUCTION}`
}
