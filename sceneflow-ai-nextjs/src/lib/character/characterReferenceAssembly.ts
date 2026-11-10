/**
 * Resolve identity vs wardrobe reference URLs and build role-specific consumption instructions.
 */

import { toCharacterPromptAlias } from '@/lib/character/characterPromptAlias'
import { isFaceCloseUpShot } from '@/lib/imagen/stillFramingNormalize'

export const CHARACTER_IDENTITY_REFERENCE_INSTRUCTION =
  'IDENTITY REFERENCE (PRIMARY): This photo is the same person head-to-toe. ' +
  'Match face, hair, skin tone, age, ethnicity, bone structure, and body from it exactly at all shot distances. ' +
  'If the photo shows both a face close-up and a standing figure, both are that person — copy the face from the close-up and body identity from the standing figure. ' +
  'Do not invent a different face. Outfit comes from the wardrobe reference when one is attached, otherwise from this photo. ' +
  'Do not copy the character-card layout into the scene. This image owns identity and photorealism.'

/** Face CU/MCU: the identity plate is a face, not a standing figure or PiP card. */
export const FACE_CLOSE_UP_IDENTITY_REFERENCE_INSTRUCTION =
  'IDENTITY REFERENCE (PRIMARY): This photo is the face plate for this person. ' +
  'Copy bone structure, skin, hair, and likeness from the face close-up in this photo. ' +
  'Do not copy a standing full-length figure or the character-card layout into the scene. ' +
  'Do not invent a different face. Outfit comes from the wardrobe reference when one is attached — garments at the collar and shoulders only. ' +
  'This image owns identity and photorealism.'

export function characterIdentityReferenceInstruction(shotType?: string | null): string {
  return isFaceCloseUpShot(shotType)
    ? FACE_CLOSE_UP_IDENTITY_REFERENCE_INSTRUCTION
    : CHARACTER_IDENTITY_REFERENCE_INSTRUCTION
}

export const EXPRESSION_OVERRIDE_INSTRUCTION =
  'FACIAL EXPRESSION: Do NOT copy the neutral/posed expression from the identity or wardrobe reference. ' +
  'Render the facial expression and emotional state described by the scene/beat direction. ' +
  'Identity references define bone structure, features, skin tone, hair, age, and ethnicity — NOT mood.'

export const WARDROBE_ONLY_REFERENCE_INSTRUCTION =
  'WARDROBE REFERENCE (SECONDARY): Full-body front-facing wardrobe — outfit colors, fabric, cut, fit, footwear, accessories, and visible scene-state marks (bruises, wounds, blood, makeup wear). ' +
  'Garments only — never a different person. Identity, bone structure, and photorealism come from the identity reference. Expression comes from beat direction.'

/** Legacy mannequin turnaround sheet instruction (back-compat). */
export const LEGACY_MANNEQUIN_WARDROBE_REFERENCE_INSTRUCTION =
  'WARDROBE REFERENCE (SECONDARY): This is a 1-row mannequin outfit turnaround sheet. Use the FRONT full-body view for outfit, fabric, color, accessories, AND any visible scene-state marks (bruises, wounds, makeup wear). ' +
  'Do NOT derive bone structure, base likeness, ethnicity, age, or photorealistic rendering style from this sheet — identity and photorealism come from the separate identity reference. ' +
  'Do NOT reproduce the turnaround layout, mannequin form, multi-view sheet, or neutral gray studio background in the scene.'

/** Global priority block injected before per-image lines when dual refs exist. */
export const DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK =
  'DUAL REFERENCE PRIORITY: Identity reference = PRIMARY for the same person — face, hair, skin tone, age, ethnicity, body, and photorealistic rendering at ALL shot distances (wide, medium, close). ' +
  'If that photo includes a face close-up and a standing figure, both are that person — copy the face from the close-up. ' +
  'Wardrobe reference = SECONDARY for outfit colors, fabric, cut, accessories, AND visible scene-state marks on hands/body/face (bruises, wounds, blood, makeup wear) — garments only, never a different person. ' +
  'Facial expression comes from beat direction. Do not copy the character-card layout into the scene.'

export const FACE_CLOSE_UP_DUAL_REFERENCE_PRIORITY_BLOCK =
  'DUAL REFERENCE PRIORITY: Identity reference = PRIMARY face plate — bone structure, skin, hair, and likeness from the face close-up. ' +
  'Do not copy a standing figure or character-card layout from that photo. ' +
  'Wardrobe reference = SECONDARY for garments at the collar, shoulders, and any visible fabric — never a different person. ' +
  'Facial expression comes from beat direction.'

export function dualReferencePriorityBlock(shotType?: string | null): string {
  return isFaceCloseUpShot(shotType)
    ? FACE_CLOSE_UP_DUAL_REFERENCE_PRIORITY_BLOCK
    : DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK
}

/** Scene-prompt bind paragraph after per-image identity/wardrobe lines. */
export function sceneIdentityBindPreamble(opts: {
  shotType?: string | null
  hasDiptych?: boolean
  hasDual?: boolean
  hasIdentityOnly?: boolean
}): string {
  if (opts.hasDiptych) {
    return (
      'Scene text uses person [N]; identity and wardrobe are bound in [REFERENCES] as person [N] (Name) and must match the labeled character reference.\n\n'
    )
  }
  if (opts.hasDual) {
    if (isFaceCloseUpShot(opts.shotType)) {
      return (
        'In the scene prompt, refer to characters with identity refs using "person [N]" tokens. ' +
        'The identity photo is the face plate — copy bone structure, skin, and hair from the close-up. ' +
        'Do not copy a standing figure or character-card layout. ' +
        'Copy garments from the wardrobe photo at the collar and shoulders. Do not invent a different face.\n\n'
      )
    }
    return (
      'In the scene prompt, refer to characters with identity refs using "person [N]" tokens. The identity photo is the same person head-to-toe (face close-up and standing figure). Copy the face from it; copy garments from the wardrobe photo. Do not invent a different face. Do not copy the character-card layout into the scene.\n\n'
    )
  }
  if (opts.hasIdentityOnly) {
    if (isFaceCloseUpShot(opts.shotType)) {
      return (
        'The identity photo is the face plate — copy bone structure, skin, hair, and likeness from the close-up. ' +
        'Do not copy a standing figure or character-card layout. ' +
        'Outfit comes from wardrobe text in the scene prompt when no wardrobe photo is attached. Do not invent a different face.\n\n'
      )
    }
    return (
      'The identity photo is the same person head-to-toe — copy face, hair, body, and likeness from it. If it shows a face close-up and a standing figure, both are that person. Outfit comes from wardrobe text in the scene prompt when no wardrobe photo is attached. Do not copy the character-card layout into the scene.\n\n'
    )
  }
  return 'The character(s) MUST match the reference image(s) exactly — same face, ethnicity, age, hair, and facial features.\n\n'
}

const WIDE_SHOT_KEYWORDS = /\b(wide|establishing|full[- ]?body|long shot|master shot|extreme wide)\b/i

export function isWideEstablishingShotType(shotType?: string | null): boolean {
  return !!shotType && WIDE_SHOT_KEYWORDS.test(shotType)
}

export const CLOSE_UP_IDENTITY_FRAMING_BLOCK =
  'CLOSE-UP: The face in frame is the identity reference — same bone structure, skin, hair, and likeness from the face close-up in that photo. ' +
  'Keep enough of the face readable that those features can be matched. ' +
  'Wardrobe is garments only at the collar, shoulders, and any visible fabric. ' +
  'Do not invent a different face to fit the pose. Do not pull a standing full-length figure from the identity or wardrobe card.'

/** Extra reinforcement for wide/establishing shots where wardrobe sheets visually dominate. */
export function buildFramingAwareIdentityBlock(shotType?: string): string {
  if (isWideEstablishingShotType(shotType)) {
    return (
      'WIDE/ESTABLISHING SHOT: Characters remain photorealistic humans matching their identity reference at full distance. ' +
      'Outfit colors, garment shapes, and visible scene-state marks come from the wardrobe reference. ' +
      'Continuous wide shot, unbroken single-camera frame, unified 16:9 cinematic perspective.'
    )
  }
  if (isFaceCloseUpShot(shotType)) {
    return CLOSE_UP_IDENTITY_FRAMING_BLOCK
  }
  return ''
}

/** Negative prompt terms when dual refs + photorealistic mode. */
export function buildDualReferenceNegativeTerms(): string {
  return ['mannequin', 'faceless figure', 'fashion illustration', 'cartoon', 'anime'].join(', ')
}

export interface CharacterReferencePair {
  identityUrl?: string
  wardrobeUrl?: string
  /** Scene-matched 16:9 combined card or leftover LEFT|RIGHT sheet */
  wardrobeDiptychUrl?: string
  hasWardrobeDiptych: boolean
  /** True when wardrobeDiptychUrl is a stored PiP, not a leftover two-panel sheet. */
  hasStoredCombinedCharacterRef: boolean
  hasDualReferences: boolean
  /** Wardrobe-only (no portrait): single turnaround drives both via legacy instruction */
  hasWardrobeOnlyReference: boolean
  resolvedWardrobe?: {
    id?: string
    name?: string
    description?: string
    accessories?: string
    appearanceNotes?: string
    needsImageRegen?: boolean
  } | null
}

export interface ResolveCharacterReferencePairArgs {
  character: Record<string, unknown>
  scene?: Record<string, unknown> | null
  sceneIndex?: number
  characterWardrobes?: Array<{ characterId: string; wardrobeId: string }>
  /**
   * When true, attach full-body wardrobe URL alongside identity when available.
   * Defaults to false so Stills and Clips receive only the crisp facial identity
   * portrait plus a consistent wardrobe text description (full-body wardrobe
   * renders lack close-up facial definition and dilute likeness).
   */
  includeWardrobeReferenceImages?: boolean
  /** Attach stored PiP combinedCharacterRefUrl (opt-in only; off by default). */
  includeWardrobeDiptych?: boolean
}

const DANGLING_WARDROBE_TAIL_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'with',
  'without',
  'over',
  'under',
  'beneath',
  'in',
  'on',
  'of',
  'for',
  'to',
  'from',
  'by',
  'at',
  'into',
  'wearing',
  'dressed',
  'outfitted',
  'clad',
  'featuring',
  'including',
  'topped',
  'paired',
  'layered',
])

const NARRATIVE_WARDROBE_PARENTHETICAL_RE =
  /\s*\([^)]*\b(?:scene|scenes|act|beat|episode|chapter|which|who|whom|whose|that\s+(?:he|she|they)|removes?|removed|takes?\s+off|uses?|used\s+to|tourniquet|later|earlier|eventually|previously|formerly|inherited|given|stolen|flashback)\b[^)]*\)/gi

const FOOTWEAR_ONLY_SENTENCE_RE =
  /^(?:[a-z0-9/-]+(?:,\s*|\s+)){0,5}(?:boots|work\s+boots|combat\s+boots|shoes|sneakers|loafers|heels|sandals|footwear|greaves|spats|slippers|oxfords|brogues)(?:\s+(?:on\s+(?:his|her|their)\s+feet|with\s+[^.]+))?$/i

const CONJOINED_LOWER_LEGWEAR_RE =
  /\s+\band\s+(?:[a-z0-9/-]+,\s*)*(?:[a-z0-9/-]+\s+){0,4}(?:trousers|pants|jeans|slacks|leggings|shorts|chinos|breeches|culottes|work\s+pants|cargo\s+pants)\b/gi

function sanitizeWardrobeTextPart(raw: string, upperBodyOnly?: boolean): string {
  let cleaned = raw
    .replace(NARRATIVE_WARDROBE_PARENTHETICAL_RE, '')
    .replace(/^(?:wearing|dressed in|outfitted in|clad in)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (upperBodyOnly && cleaned) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+|\.\s+/)
      .map((s) => s.replace(/[.!?]+$/g, '').trim())
      .filter(Boolean)
      .filter((s) => !FOOTWEAR_ONLY_SENTENCE_RE.test(s))
      .map((s) => s.replace(CONJOINED_LOWER_LEGWEAR_RE, '').trim())
      .filter(Boolean)
    cleaned = sentences.join('. ')
  }

  return cleaned
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/[.;,\s]+$/g, '')
    .trim()
}

/**
 * Build a clean, consistent wardrobe description from a resolved scene wardrobe
 * (or legacy character defaultWardrobe) for identity-first Clips and Stills.
 * Strips narrative plot parentheticals and avoids chopping mid-clause.
 */
export function formatConsistentWardrobeDescription(
  wardrobe?: {
    description?: string | null
    accessories?: string | null
    appearanceNotes?: string | null
  } | null,
  fallback?: {
    defaultWardrobe?: string | null
    wardrobeAccessories?: string | null
  } | null,
  options?: {
    wordCap?: number
    includeAppearanceNotes?: boolean
    /** Omit standalone footwear and lower-legwear on Close-Up / Medium Close-Up shots. */
    upperBodyOnly?: boolean
  }
): string | undefined {
  const wordCap = options?.wordCap ?? 38
  const primaryDesc = wardrobe?.description?.trim() || fallback?.defaultWardrobe?.trim() || ''
  const primaryAcc = wardrobe?.accessories?.trim() || fallback?.wardrobeAccessories?.trim() || ''
  const notes = options?.includeAppearanceNotes ? wardrobe?.appearanceNotes?.trim() || '' : ''

  const cleanedParts = [primaryDesc, primaryAcc, notes]
    .map((part) => sanitizeWardrobeTextPart(part, options?.upperBodyOnly))
    .filter(Boolean)

  if (cleanedParts.length === 0) return undefined

  const combined = cleanedParts.join(', ')
  const words = combined.split(/\s+/).filter(Boolean)
  if (words.length <= wordCap) {
    return combined.replace(/[.;,\s]+$/g, '').trim() || undefined
  }

  const sliced = words.slice(0, wordCap)
  while (sliced.length > 6) {
    const lastClean = sliced[sliced.length - 1]
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
      .toLowerCase()
    if (!DANGLING_WARDROBE_TAIL_WORDS.has(lastClean)) break
    sliced.pop()
  }

  return sliced.join(' ').replace(/[.;,\s]+$/g, '').trim() || undefined
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

/**
 * Anti-pose constraint for beat frames.
 *
 * The point is that nobody is performing for the lens. The earlier wording said
 * "caught mid-action", which asked for a moment of movement one line below the
 * still prompt's own "No camera motion." — and the model resolved the conflict
 * by rendering several positions of the same body at once. "Absorbed in the
 * action" keeps the candid intent without requesting motion.
 */
export const BEAT_FRAME_CANDID_ACTION_CONSTRAINT =
  'Subjects absorbed in the action and unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing.'

/** Face CU already *is* a headshot scale; banning the word fights identity lock. */
export const BEAT_FRAME_CANDID_ACTION_CONSTRAINT_FACE_CLOSE_UP =
  'Subjects absorbed in the action and unaware of the camera — no posing, no lens eye-contact, no turnaround framing.'

export function beatFrameCandidActionConstraint(shotType?: string | null): string {
  return isFaceCloseUpShot(shotType)
    ? BEAT_FRAME_CANDID_ACTION_CONSTRAINT_FACE_CLOSE_UP
    : BEAT_FRAME_CANDID_ACTION_CONSTRAINT
}

/**
 * Earlier wordings of the line above.
 *
 * An assembled still is stored on the beat and re-parsed on the next
 * generation, so a prompt written before the rewording still carries the old
 * literal. Without it here, that line reads back as beat action and gets
 * re-wrapped in `Action/Framing:` once per regeneration.
 */
export const LEGACY_BEAT_FRAME_CANDID_ACTION_CONSTRAINTS = [
  'Subjects caught mid-action, unaware of the camera — no posing, no lens eye-contact, no headshot or turnaround framing.',
] as const

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

function matchesCharacterKey(
  candidateId: unknown,
  character: Record<string, unknown>
): boolean {
  const needle = typeof candidateId === 'string' ? candidateId.trim().toLowerCase() : ''
  if (!needle) return false
  const id = typeof character.id === 'string' ? character.id.trim().toLowerCase() : ''
  const name = typeof character.name === 'string' ? character.name.trim().toLowerCase() : ''
  return (Boolean(id) && id === needle) || (Boolean(name) && name === needle)
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

  const override = characterWardrobes?.find((cw) => matchesCharacterKey(cw.characterId, character))
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
      (cw) => matchesCharacterKey(cw.characterId, character)
    )
    if (sceneOverride?.wardrobeId) {
      resolved =
        (wardrobes as Record<string, unknown>[]).find((w) => w.id === sceneOverride.wardrobeId) ?? null
    }
  }

  if (!resolved) {
    const fallback = (wardrobes as Record<string, unknown>[])[0] ?? null
    if (fallback) {
      const charName = (character.name || charId) as string
      const warnKey = `${charName}:${sceneIndex ?? 'unknown'}:${String(fallback.id ?? fallback.name ?? '')}`
      if (!warnedWardrobeFallbacks.has(warnKey)) {
        warnedWardrobeFallbacks.add(warnKey)
        console.warn(
          `[Wardrobe] No scene-specific wardrobe for ${charName} (sceneIndex=${sceneIndex ?? 'unknown'}); falling back to first wardrobe "${fallback.name ?? fallback.id}"`
        )
      }
      resolved = fallback
    }
  }

  return resolved
}

const warnedWardrobeFallbacks = new Set<string>()

type WardrobeScenePickerItem = {
  id: string
  sceneNumbers?: number[]
}

/** Wardrobes to show in scene pickers (sceneNumbers match, else all looks). */
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

  return wardrobes
}

/** Resolve wardrobe id for a character in the current scene (override → sceneNumbers → scene override → first). */
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
  } = args
  // Default to PiP combined reference (face close-up badge + scene-assigned wardrobe)
  // unless the caller explicitly requests discrete dual slots (`includeWardrobeReferenceImages: true`
  // without `includeWardrobeDiptych`) or identity-only (`includeWardrobeReferenceImages: false`).
  const explicitDualOnly =
    args.includeWardrobeReferenceImages === true && args.includeWardrobeDiptych === undefined
  const explicitIdentityOnly =
    args.includeWardrobeReferenceImages === false && !args.includeWardrobeDiptych
  const includeWardrobeDiptych =
    args.includeWardrobeDiptych ?? (!explicitDualOnly && !explicitIdentityOnly)
  const includeWardrobeReferenceImages =
    args.includeWardrobeReferenceImages ?? includeWardrobeDiptych
  const identityUrl = trimUrl(character.referenceImage)
  const resolvedWardrobe = resolveWardrobeForCharacter(
    character,
    scene,
    characterWardrobes,
    sceneIndex
  )
  const fullBodyUrl = trimUrl(resolvedWardrobe?.fullBodyUrl)
  const wardrobeStaleWithFullBody =
    resolvedWardrobe?.needsImageRegen === true && Boolean(fullBodyUrl)
  const storedCombinedUrl =
    includeWardrobeDiptych && !wardrobeStaleWithFullBody
      ? trimUrl(resolvedWardrobe?.combinedCharacterRefUrl)
      : undefined

  // PiP-first by default: attach the stored combined card (face inset + scene wardrobe)
  // when available; otherwise attach both identity portrait + full-body wardrobe so Stills
  // can compose & persist the PiP card and Clips still receive both face and outfit.
  const allowWardrobeImageSlots = Boolean(includeWardrobeReferenceImages || includeWardrobeDiptych)
  const wardrobeUrl =
    !storedCombinedUrl && allowWardrobeImageSlots && identityUrl && fullBodyUrl
      ? fullBodyUrl
      : undefined

  // Leftover LEFT|RIGHT sheet only when wardrobe image slots are opted in and no full-body exists.
  const leftoverSheetUrl =
    !storedCombinedUrl && allowWardrobeImageSlots && identityUrl && !fullBodyUrl
      ? trimUrl(resolvedWardrobe?.headshotUrl)
      : undefined
  const wardrobeDiptychUrl = storedCombinedUrl || leftoverSheetUrl
  const hasWardrobeDiptych = !!wardrobeDiptychUrl
  const hasStoredCombinedCharacterRef = !!storedCombinedUrl

  const hasDualReferences = !!(identityUrl && wardrobeUrl)
  const hasWardrobeOnlyReference = false

  return {
    identityUrl,
    wardrobeUrl,
    wardrobeDiptychUrl,
    hasWardrobeDiptych,
    hasStoredCombinedCharacterRef,
    hasDualReferences,
    hasWardrobeOnlyReference,
    resolvedWardrobe: resolvedWardrobe
      ? {
          id: resolvedWardrobe.id as string | undefined,
          name: resolvedWardrobe.name as string | undefined,
          description: resolvedWardrobe.description as string | undefined,
          accessories: resolvedWardrobe.accessories as string | undefined,
          appearanceNotes: resolvedWardrobe.appearanceNotes as string | undefined,
          needsImageRegen:
            resolvedWardrobe.needsImageRegen === true ? true : undefined,
        }
      : null,
  }
}

export function buildIdentityReferenceLabel(
  characterName: string,
  referenceIndex?: number
): string {
  const idx = referenceIndex != null ? ` ${referenceIndex}` : ''
  return `Identity reference${idx}: ${toCharacterPromptAlias(characterName)}`
}

export function buildWardrobeReferenceLabel(
  characterName: string,
  referenceIndex?: number
): string {
  const idx = referenceIndex != null ? ` ${referenceIndex}` : ''
  return `Wardrobe reference${idx}: ${toCharacterPromptAlias(characterName)} (full-body outfit)`
}

export function buildWardrobeDiptychReferenceLabel(characterName: string): string {
  return `Character reference: ${toCharacterPromptAlias(characterName)} — face and full-body wardrobe`
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

/**
 * Positive statement of the constraint the removed identity negatives
 * ("different person", "incorrect ethnicity") were written to enforce. A
 * negative term is indistinguishable from a subject description to an image
 * model; an equality statement is not.
 */
export function buildIdentityLockLine(
  characterName: string,
  referenceIndex: number,
  personTokenIndex?: number
): string {
  const subject = personTokenIndex != null ? `person [${personTokenIndex}]` : characterName
  return (
    `IDENTITY LOCK: ${subject} is the exact same individual shown in Reference image ${referenceIndex} — ` +
    'same skin tone, same hair texture and color, same facial bone structure, same age.'
  )
}

/**
 * `label` lets the caller reuse the exact label attached to the image part, so
 * the wrapper line and the image name the reference identically.
 */
export function buildIdentityReferencePromptLine(
  characterName: string,
  referenceIndex: number,
  personTokenIndex?: number,
  label?: string,
  shotType?: string | null
): string {
  const personBinding =
    personTokenIndex != null ? ` = person [${personTokenIndex}]` : ` for ${characterName}`
  const heading = label ?? `Reference image ${referenceIndex}: IDENTITY REFERENCE${personBinding}`
  return (
    `- ${heading}\n` +
    `  ${characterIdentityReferenceInstruction(shotType)}\n` +
    `  ${buildIdentityLockLine(characterName, referenceIndex, personTokenIndex)}`
  )
}

export function buildWardrobeReferencePromptLine(
  characterName: string,
  referenceIndex: number,
  identityReferenceIndex?: number,
  label?: string
): string {
  const binding =
    identityReferenceIndex != null
      ? ` for ${characterName}: apply this outfit ONLY to person [${identityReferenceIndex}] (${characterName}); do not apply to any other character`
      : ` for ${characterName}`
  const heading = label
    ? `${label}${
        identityReferenceIndex != null
          ? ` — apply this outfit ONLY to person [${identityReferenceIndex}] (${characterName})`
          : ''
      }`
    : `Reference image ${referenceIndex}: WARDROBE REFERENCE${binding}`
  return `- ${heading}\n  ${WARDROBE_ONLY_REFERENCE_INSTRUCTION}`
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
        return `person [${entry.subjectOrdinal}] = ${entry.characterName}: face and outfit from Ref [${entry.identitySendIndex}]`
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
