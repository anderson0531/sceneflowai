/**
 * Resolve identity vs wardrobe reference URLs and build role-specific consumption instructions.
 */

export const CHARACTER_IDENTITY_REFERENCE_INSTRUCTION =
  'IDENTITY REFERENCE (PRIMARY): Match face, hair, skin tone, age, ethnicity, body proportions, and photorealistic rendering style from this image exactly at all shot distances. ' +
  'This image owns identity and realism — ignore clothing in this image if it differs from the scene wardrobe; outfit comes from the wardrobe reference or text.'

export const EXPRESSION_OVERRIDE_INSTRUCTION =
  'FACIAL EXPRESSION: Do NOT copy the neutral/posed expression from the identity or wardrobe reference. ' +
  'Render the facial expression and emotional state described by the scene/beat direction. ' +
  'Identity references define bone structure, features, skin tone, hair, age, and ethnicity — NOT mood.'

export const WARDROBE_ONLY_REFERENCE_INSTRUCTION =
  'WARDROBE REFERENCE (SECONDARY): Full-body front-facing wardrobe reference — use for outfit colors, fabric, cut, fit, footwear, and accessories ONLY. ' +
  'Do NOT derive face, hair, skin tone, body type, ethnicity, age, or rendering style from this image — identity and photorealism come from the separate identity headshot reference. ' +
  'Do NOT reproduce the neutral gray studio background or reference-sheet layout in the scene.'

/** Legacy mannequin turnaround sheet instruction (back-compat). */
export const LEGACY_MANNEQUIN_WARDROBE_REFERENCE_INSTRUCTION =
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
  /** Scene-matched 16:9 diptych (LEFT=identity close-up, RIGHT=wardrobe full-body) */
  wardrobeDiptychUrl?: string
  hasWardrobeDiptych: boolean
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
  /** When true (default), attach full-body wardrobe URL alongside identity when available. */
  includeWardrobeReferenceImages?: boolean
  /** Attach scene-matched wardrobe diptych (headshotUrl) when available */
  includeWardrobeDiptych?: boolean
}

function trimUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** Consistent hairstyle phrase for frame prompts (character-level, not wardrobe). */
export function buildCharacterHairDescription(character: {
  hairStyle?: string
  hairColor?: string
}): string | undefined {
  const style = character.hairStyle?.trim()
  if (!style) return undefined
  if (style.toLowerCase() === 'bald') return 'bald head'
  const color = character.hairColor?.trim()
  if (color) return `${color} ${style} hair`
  return `${style} hair`
}

const APPEARANCE_HAIR_PATTERNS: Array<{ pattern: RegExp; format: (match: RegExpMatchArray) => string }> = [
  { pattern: /\b(salt[- ]?and[- ]?pepper)\s+hair\b/i, format: (m) => `${m[1]} hair` },
  { pattern: /\b(grey|gray)\s+hair\b/i, format: () => 'grey hair' },
  { pattern: /\b(bald|shaved head)\b/i, format: () => 'bald head' },
  {
    pattern: /\b(dark auburn|auburn|blonde|blond|brown|black|red|dark brown|light brown)\s+(swept[- ]?back|loose|wavy|curly)\b/i,
    format: (m) => `${m[1]} ${m[2]} hair`,
  },
  { pattern: /\b(swept[- ]?back|slicked[- ]?back)\s+(ponytail|bun|updo)\b/i, format: (m) => `${m[1]} ${m[2]}` },
  { pattern: /\b(high|low|tight|messy)\s+(ponytail|bun|updo|topknot)\b/i, format: (m) => `${m[1]} ${m[2]}` },
  { pattern: /\b(ponytail|topknot|updo|bun|pixie cut|bob cut|bob)\b/i, format: (m) => m[1].toLowerCase() },
  { pattern: /\b(loose|long|short|curly|wavy|straight)\s+(waves|curls|hair)\b/i, format: (m) => `${m[1]} ${m[2]}` },
  { pattern: /\b(curly afro|afro)\b/i, format: (m) => m[1].toLowerCase() },
  { pattern: /\b(braids|cornrows|dreadlocks|locs)\b/i, format: (m) => m[1].toLowerCase() },
  { pattern: /\b(swept[- ]?back|slicked[- ]?back)\s+hair\b/i, format: () => 'swept-back hair' },
  { pattern: /\b(short cropped|cropped)\s+hair\b/i, format: () => 'short cropped hair' },
]

/** Extract a concise hair phrase from appearance prose when structured fields are missing. */
export function extractHairStyleFromAppearance(text: string): string | undefined {
  const source = text.trim()
  if (!source) return undefined

  for (const { pattern, format } of APPEARANCE_HAIR_PATTERNS) {
    const match = source.match(pattern)
    if (match) return format(match)
  }

  return undefined
}

/** Full hair lock phrase for identity-reference prompts. */
export function buildCharacterHairAnchor(character: {
  hairStyle?: string
  hairColor?: string
  appearanceDescription?: string
  visionDescription?: string
}): string | undefined {
  const fromFields = buildCharacterHairDescription({
    hairStyle: character.hairStyle,
    hairColor: character.hairColor,
  })
  const fromAppearance = extractHairStyleFromAppearance(
    character.appearanceDescription || character.visionDescription || ''
  )
  const hairPhrase = fromFields ?? fromAppearance
  if (!hairPhrase) return undefined
  return `${hairPhrase} matching identity reference`
}

const INJURY_FRAMING_PATTERN = /\b(forehead|temple|bruise|contusion|laceration|cut on)\b/i

export function beatActionNeedsHairCompositionLock(text: string): boolean {
  return INJURY_FRAMING_PATTERN.test(text)
}

/** True when beat context needs explicit hair-lock text alongside an identity reference image. */
export function beatFrameNeedsHairLock(sceneContext: string, shotType?: string): boolean {
  return (
    beatActionNeedsHairCompositionLock(sceneContext) ||
    (!!shotType && WIDE_SHOT_KEYWORDS.test(shotType))
  )
}

export const BEAT_FRAME_CANDID_ACTION_CONSTRAINT =
  'Subjects caught mid-action, unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing.'

/** Beat explicitly calls for on-camera address (skip anti-pose negatives). */
export function isExplicitDirectToCameraBeat(beat: {
  line?: string
  actionDescription?: string
} | null | undefined): boolean {
  if (!beat) return false
  const text = [beat.line, beat.actionDescription].filter(Boolean).join(' ')
  return /\bdirect[- ]?to[- ]?camera\b|\baddresses?\s+(the\s+)?camera\b|\blooking\s+at\s+(the\s+)?camera\b/i.test(
    text
  )
}

/** Lock hairstyle when beat describes forehead/temple injuries — prevents unprompted hair restyling. */
export function buildHairCompositionLock(
  beatAction: string,
  personTokens: string[] = ['person [1]']
): string | undefined {
  if (!beatActionNeedsHairCompositionLock(beatAction)) return undefined

  const subjects =
    personTokens.filter((token) => token.includes('[')).join(' and ') || 'person [1]'

  return (
    `Keep ${subjects}'s hairstyle exactly as in the identity reference; ` +
    'do not pull hair back or restyle to expose the forehead; ' +
    'any injury must be visible without changing hair placement.'
  )
}

/** Character-specific negatives when a defined hairstyle should not drift. */
export function buildHairStyleNegativeTerms(
  hairStyle?: string,
  hairDescription?: string
): string[] {
  const style = `${hairStyle || ''} ${hairDescription || ''}`.toLowerCase().trim()
  if (!style || style.includes('bald')) return []

  const negatives = ['different hairstyle']
  const pulledBack = /\b(ponytail|bun|updo|swept back|slicked|pulled back|topknot)\b/i.test(style)
  const loose = /\b(loose|waves|wavy|down|flowing)\b/i.test(style)

  if (!pulledBack) {
    negatives.push('hair pulled back', 'tight bun', 'slicked back hair')
  }
  if (pulledBack) {
    negatives.push('loose hair covering forehead', 'hair down over face')
  }
  if (loose) {
    negatives.push('tight bun', 'hair pulled back')
  }

  return [...new Set(negatives)]
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
    const fallback = (wardrobes as Record<string, unknown>[]).find((w) => w.isDefault === true) ?? null
    if (fallback) {
      const charName = (character.name || charId) as string
      console.warn(
        `[Wardrobe] No scene-specific wardrobe for ${charName} (sceneIndex=${sceneIndex ?? 'unknown'}); falling back to isDefault "${fallback.name ?? fallback.id}"`
      )
      resolved = fallback
    }
  }

  return resolved
}

type WardrobeScenePickerItem = {
  id: string
  sceneNumbers?: number[]
  isDefault?: boolean
}

/** Wardrobes to show in scene pickers (sceneNumbers match, else isDefault, else all). */
export function wardrobesForScene<T extends WardrobeScenePickerItem>(
  character: { wardrobes?: T[] },
  sceneIndex?: number
): T[] {
  const wardrobes = character.wardrobes ?? []
  if (wardrobes.length === 0) return []
  if (sceneIndex === undefined) return wardrobes

  const sceneNum = sceneIndex + 1
  const sceneAssigned = wardrobes.filter(
    (w) => Array.isArray(w.sceneNumbers) && w.sceneNumbers.includes(sceneNum)
  )
  if (sceneAssigned.length > 0) return sceneAssigned

  const defaultWardrobe = wardrobes.find((w) => w.isDefault === true)
  if (defaultWardrobe) return [defaultWardrobe]

  return wardrobes
}

/** Resolve wardrobe id for a character in the current scene (override → sceneNumbers → scene override → default). */
export function resolveWardrobeIdForCharacterInScene(
  character: Record<string, unknown>,
  scene?: Record<string, unknown> | null,
  sceneIndex?: number,
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
): string | undefined {
  const resolved = resolveWardrobeForCharacter(character, scene, characterWardrobes, sceneIndex)
  const id = resolved?.id
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

export function resolveCharacterReferencePair(
  args: ResolveCharacterReferencePairArgs
): CharacterReferencePair {
  const {
    character,
    scene,
    sceneIndex,
    characterWardrobes,
    includeWardrobeReferenceImages = true,
    includeWardrobeDiptych = false,
  } = args
  const identityUrl = trimUrl(character.referenceImage)
  const resolvedWardrobe = resolveWardrobeForCharacter(
    character,
    scene,
    characterWardrobes,
    sceneIndex
  )
  const fullBodyUrl = trimUrl(resolvedWardrobe?.fullBodyUrl)

  // Face-first dual ref: dedicated identity headshot + full-body wardrobe image.
  const wardrobeUrl =
    includeWardrobeReferenceImages && identityUrl && fullBodyUrl
      ? fullBodyUrl
      : undefined

  // Diptych fallback when no dedicated full-body wardrobe image exists.
  const wardrobeDiptychUrl =
    includeWardrobeDiptych && identityUrl && !fullBodyUrl
      ? trimUrl(resolvedWardrobe?.headshotUrl)
      : undefined
  const hasWardrobeDiptych = !!wardrobeDiptychUrl

  const hasDualReferences = !!(identityUrl && wardrobeUrl)
  const hasWardrobeOnlyReference = false

  return {
    identityUrl,
    wardrobeUrl,
    wardrobeDiptychUrl,
    hasWardrobeDiptych,
    hasDualReferences,
    hasWardrobeOnlyReference,
    resolvedWardrobe: resolvedWardrobe
      ? {
          id: resolvedWardrobe.id as string | undefined,
          name: resolvedWardrobe.name as string | undefined,
          description: resolvedWardrobe.description as string | undefined,
          accessories: resolvedWardrobe.accessories as string | undefined,
          appearanceNotes: resolvedWardrobe.appearanceNotes as string | undefined,
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
  return `Wardrobe reference${idx}: ${characterName} (full-body outfit)`
}

export function buildWardrobeDiptychReferenceLabel(characterName: string): string {
  return `Diptych ref: ${characterName} — LEFT=identity face, RIGHT=wardrobe outfit`
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

export const BEAT_FRAME_ANTI_POSE_NEGATIVE_PROMPT =
  'posing for camera, looking at camera, direct eye contact with lens, staged studio portrait, headshot, red carpet pose, hands at sides neutral stance'

export function buildIdentityReferencePromptLine(
  characterName: string,
  referenceIndex: number,
  personTokenIndex?: number
): string {
  const personBinding =
    personTokenIndex != null ? ` = person [${personTokenIndex}]` : ` for ${characterName}`
  return `- Reference image ${referenceIndex}: IDENTITY REFERENCE${personBinding}\n  ${CHARACTER_IDENTITY_REFERENCE_INSTRUCTION}`
}

export function buildWardrobeReferencePromptLine(
  characterName: string,
  referenceIndex: number,
  identityReferenceIndex?: number
): string {
  const binding =
    identityReferenceIndex != null
      ? ` for ${characterName}: apply this outfit ONLY to person [${identityReferenceIndex}] (${characterName}); do not apply to any other character`
      : ` for ${characterName}`
  return `- Reference image ${referenceIndex}: WARDROBE REFERENCE${binding}\n  ${WARDROBE_ONLY_REFERENCE_INSTRUCTION}`
}

/** Multi-character wardrobe binding summary for beat-frame gemini prompts. */
export function buildWardrobeBindingSummary(
  bindings: Array<{
    characterName: string
    subjectOrdinal: number
    identitySendIndex: number
    wardrobeSendIndex?: number
    isDiptych?: boolean
  }>
): string {
  if (bindings.length < 2) return ''

  const parts = bindings
    .map((entry) => {
      if (entry.isDiptych) {
        return `person [${entry.subjectOrdinal}] = ${entry.characterName}: face/identity from diptych Ref [${entry.identitySendIndex}] (LEFT panel), outfit from diptych Ref [${entry.identitySendIndex}] (RIGHT panel)`
      }
      if (entry.wardrobeSendIndex != null) {
        return `person [${entry.subjectOrdinal}] = ${entry.characterName}: face/identity from Ref [${entry.identitySendIndex}], outfit from Ref [${entry.wardrobeSendIndex}]`
      }
      return `person [${entry.subjectOrdinal}] = ${entry.characterName}: face/identity from Ref [${entry.identitySendIndex}]`
    })
    .filter((part): part is string => !!part)

  if (parts.length < 2) return ''
  return (
    `SUBJECT BINDING:\n${parts.map((part) => `- ${part}`).join('\n')}\n` +
    'Each person [N] must match ONLY their paired refs. Never swap identity or wardrobe between people.'
  )
}
