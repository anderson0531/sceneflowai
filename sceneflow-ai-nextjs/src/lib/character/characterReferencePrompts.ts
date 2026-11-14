/**
 * Prompt builders for character identity reference images (Pre-Vis / scene generation).
 */

import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'
import {
  composeStandingAppearanceFromAttributes,
  isMinimalAppearanceDescription,
} from '@/lib/character/characterIntelligence'
import {
  buildFamilialVisualContinuityClause,
  type CharacterFamilyRelationship,
} from '@/lib/character/characterFamily'

export const CHARACTER_IDENTITY_REFERENCE_ANCHOR =
  'Photorealistic headshot to be used as a character reference.'

const STYLIZED_IDENTITY_ANCHOR_RE = /^[^\n]+ character identity reference portrait\./i

function buildStylizedIdentityDirectives(artStyle: string): {
  anchor: string
  directives: string
} {
  const spec = buildArtStyleSpecFromValue(artStyle)
  return {
    anchor: `${spec.title} character identity reference portrait.`,
    directives: [
      'Framing: vertical 9:16 portrait, face dominant in frame, eyes in the upper third, head-and-shoulders only — no wide establishing crop.',
      'Expression: neutral relaxed expression, mouth closed, direct eye contact.',
      'Lighting: clear studio key light with crisp catchlights in both eyes; clean readable facial features.',
      'Background: plain neutral gray studio backdrop, no props or distractions.',
      `Style: ${spec.characterRefDirective}`,
    ].join('\n'),
  }
}

/** Shared photographic realism block for identity headshots and enhance-reference. */
export const IDENTITY_PHOTO_REALISM_DIRECTIVES = [
  'Framing: vertical 9:16 portrait, face dominant in frame, eyes in the upper third, head-and-shoulders only — no wide establishing crop.',
  'Expression: neutral relaxed expression, mouth closed, direct eye contact.',
  'Lighting: soft professional key light with natural catchlights in both eyes; even lighting across the face, no harsh shadows.',
  'Lens: 85mm portrait lens look, shallow depth of field, natural skin texture and pores, no plastic smoothing.',
  'Background: plain neutral gray studio backdrop, no props or distractions.',
  'Style: photorealistic human photography only — no illustration, cartoon, CGI, or stylization.',
].join('\n')

export const IDENTITY_ANTI_LIKENESS_DIRECTIVES = [
  'Subject is an original fictional adult — not a celebrity, politician, or public figure.',
  'Do not depict or resemble any known actor or recognizable likeness.',
].join('\n')

export const ENHANCE_IDENTITY_REFERENCE_PREFIX =
  'Refine this portrait into a professional casting headshot. Preserve the exact person in the reference photo — same face shape, bone structure, skin tone, age, ethnicity, and hairstyle.'

/** Polish a generated draft. The written body description wins over the draft photo. */
export const ENHANCE_IDENTITY_FROM_DESCRIPTION_PREFIX =
  'Polish this into a professional casting headshot. The written identity overrides the reference photo wherever they disagree — correct ethnicity, skin tone, age, face shape, hair, and eyes to match the description. The photo is only the starting composition.'

export const IDENTITY_APPEARANCE_LOCK =
  'Identity: depict this description exactly — ethnicity, skin tone, age, face shape, hair, facial hair, and eyes. Do not substitute a different ethnicity or skin tone.'

export type EnhanceIdentitySource = 'description' | 'photo'

/** Body paragraph inside a wrapped identity prompt. A bare appearance string is returned as-is. */
export function identityAppearanceFromPrompt(prompt: string): string {
  const trimmed = prompt.trim()
  let afterAnchor = ''
  if (trimmed.includes(CHARACTER_IDENTITY_REFERENCE_ANCHOR)) {
    afterAnchor = trimmed
      .slice(trimmed.indexOf(CHARACTER_IDENTITY_REFERENCE_ANCHOR) + CHARACTER_IDENTITY_REFERENCE_ANCHOR.length)
      .trim()
  } else {
    const stylizedMatch = trimmed.match(STYLIZED_IDENTITY_ANCHOR_RE)
    if (!stylizedMatch) return trimmed
    afterAnchor = trimmed.slice(stylizedMatch[0].length).trim()
  }
  const lockAt = afterAnchor.indexOf(IDENTITY_APPEARANCE_LOCK)
  const body = (lockAt >= 0 ? afterAnchor.slice(0, lockAt) : afterAnchor).trim()
  return body || trimmed
}

export interface CharacterIdentityReferencePromptInput {
  appearanceDescription: string
  wardrobeDescription?: string | null
  /** When true, omit wardrobe line (enhance pass uses appearance only). */
  omitWardrobe?: boolean
  /** Global project/series art style ID or custom ArtStyleSpec string. */
  artStyle?: string | null
}

export interface CharacterForWardrobeResolution {
  defaultWardrobe?: string | null
  wardrobeAccessories?: string | null
  wardrobes?: Array<{
    id?: string
    name?: string
    description?: string
    accessories?: string
  }> | null
}

export interface FullBodyWardrobePromptInput {
  characterName: string
  appearanceDescription?: string
  wardrobeDescription?: string
  wardrobeAccessories?: string
  hairAnchor?: string
  /** Scene-state marks (bruises, makeup wear, exhaustion) to bake into the wardrobe image. */
  appearanceNotes?: string
  /** Drawn full-body URL of the base or preceding wardrobe for continuity transitions. */
  baseWardrobeUrl?: string
  /** Description of the base or preceding wardrobe being transitioned from. */
  baseWardrobeDescription?: string
  /** Name of the base or preceding wardrobe (e.g. "Default", "Scene 1"). */
  baseWardrobeName?: string
  /** Global project/series art style ID or custom ArtStyleSpec string. */
  artStyle?: string | null
}

export interface WardrobeTransitionCandidate {
  id?: string
  name?: string
  description?: string
  accessories?: string
  appearanceNotes?: string
  isDefault?: boolean
  sceneNumbers?: number[]
  fullBodyUrl?: string
  headshotUrl?: string
  previewImageUrl?: string
  needsImageRegen?: boolean
  generationPrompt?: string
}

export interface ResolvedAnchorWardrobe {
  baseWardrobeUrl: string
  baseWardrobeName?: string
  baseWardrobeDescription?: string
}

function getDrawnWardrobeFullBodyUrl(w?: WardrobeTransitionCandidate | null): string | undefined {
  if (!w) return undefined
  const url = w.fullBodyUrl?.trim() || w.previewImageUrl?.trim()
  return url || undefined
}

function formatAnchorWardrobeText(w: WardrobeTransitionCandidate): string | undefined {
  const parts = [w.description?.trim(), w.accessories?.trim(), w.appearanceNotes?.trim()].filter(
    Boolean
  ) as string[]
  return parts.length > 0 ? parts.join('. ') : undefined
}

const WARDROBE_TRANSITION_STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'at',
  'with',
  'for',
  'by',
  'from',
  'as',
  'his',
  'her',
  'their',
  'wearing',
  'outfit',
  'look',
  // Transient wear/damage/weather modifiers should not dilute core garment overlap
  'rain',
  'soaked',
  'wet',
  'damp',
  'stained',
  'bloodstained',
  'muddy',
  'dirty',
  'dusty',
  'chalk',
  'torn',
  'ripped',
  'disheveled',
  'rumpled',
  'wrinkled',
  'unbuttoned',
  'loosened',
  'clean',
  'fresh',
  'crisp',
])

function extractCoreGarmentTokens(w: WardrobeTransitionCandidate): Set<string> {
  const raw = `${w.description || ''} ${w.accessories || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
  return new Set(
    raw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !WARDROBE_TRANSITION_STOP_WORDS.has(t))
  )
}

/**
 * Determine whether `target` is genuinely a continuity/state transition of `anchor`
 * (e.g. rain-soaked or chalk-stained version of the same coat/trousers) rather than
 * an unrelated new costume. Attaching an unrelated outfit as Reference Image 2 with
 * `WARDROBE CONTINUITY & TRANSITION LOCK` causes Gemini Image to clone the old outfit.
 */
export function isWardrobeContinuityTransition(
  anchor: WardrobeTransitionCandidate,
  target: WardrobeTransitionCandidate
): boolean {
  const targetText = `${target.description || ''} ${target.accessories || ''}`.trim()
  if (
    /\b(same\s+(?:outfit|clothes|garments|suit|coat|jacket|shirt|dress|uniform)|over\s+(?:his|her|their)\s+(?:default|earlier|previous|baseline))\b/i.test(
      targetText
    )
  ) {
    return true
  }

  const anchorTokens = extractCoreGarmentTokens(anchor)
  const targetTokens = extractCoreGarmentTokens(target)
  if (anchorTokens.size === 0 || targetTokens.size === 0) return false

  let shared = 0
  for (const token of targetTokens) {
    if (anchorTokens.has(token)) shared++
  }

  const minSize = Math.min(anchorTokens.size, targetTokens.size)
  const overlapRatio = shared / minSize
  return shared >= 2 && overlapRatio >= 0.4
}

/**
 * Resolve the best drawn baseline or preceding wardrobe reference for a wardrobe transition.
 * - Only attaches a preceding/default wardrobe when `targetWardrobe` is an actual garment
 *   continuity transition of that outfit (shared core garments), so distinct new costumes
 *   are generated cleanly from the identity portrait alone (`refs=1`).
 * - When regenerating a single existing wardrobe solely to apply `appearanceNotes` (and not
 *   marked `needsImageRegen` or overridden via `generationPrompt`), anchors to its own
 *   `fullBodyUrl` so the underlying garment stays consistent.
 */
export function resolveAnchorWardrobeForTransition(
  wardrobes: ReadonlyArray<WardrobeTransitionCandidate> | null | undefined,
  targetWardrobe: WardrobeTransitionCandidate | null | undefined
): ResolvedAnchorWardrobe | undefined {
  if (!Array.isArray(wardrobes) || wardrobes.length === 0 || !targetWardrobe) {
    return undefined
  }

  if (targetWardrobe.generationPrompt?.trim()) {
    return undefined
  }

  const targetId = targetWardrobe.id
  const targetIndex = targetId ? wardrobes.findIndex((w) => w.id === targetId) : -1
  const targetScenes = Array.isArray(targetWardrobe.sceneNumbers)
    ? targetWardrobe.sceneNumbers.filter((n) => typeof n === 'number' && Number.isFinite(n))
    : []
  const minTargetScene = targetScenes.length > 0 ? Math.min(...targetScenes) : undefined

  const otherDrawn = wardrobes.filter(
    (w, idx) =>
      (targetId ? w.id !== targetId : idx !== targetIndex) &&
      Boolean(getDrawnWardrobeFullBodyUrl(w)) &&
      isWardrobeContinuityTransition(w, targetWardrobe)
  )

  if (otherDrawn.length > 0) {
    // 1. If target is tied to specific scene numbers, pick the closest preceding drawn wardrobe by scene number
    if (minTargetScene !== undefined) {
      let bestPreceding: WardrobeTransitionCandidate | undefined
      let bestMaxScene = -Infinity
      for (const candidate of otherDrawn) {
        const candidateScenes = Array.isArray(candidate.sceneNumbers)
          ? candidate.sceneNumbers.filter((n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n <= minTargetScene)
          : []
        if (candidateScenes.length > 0) {
          const maxScene = Math.max(...candidateScenes)
          if (maxScene >= bestMaxScene) {
            bestMaxScene = maxScene
            bestPreceding = candidate
          }
        }
      }
      if (bestPreceding) {
        const url = getDrawnWardrobeFullBodyUrl(bestPreceding)!
        return {
          baseWardrobeUrl: url,
          baseWardrobeName: bestPreceding.name?.trim() || undefined,
          baseWardrobeDescription: formatAnchorWardrobeText(bestPreceding),
        }
      }
    }

    // 2. If target appears after an earlier drawn wardrobe in list order (and target is not the explicit default),
    // pick the immediately preceding compatible drawn wardrobe
    if (!targetWardrobe.isDefault && targetIndex > 0) {
      for (let i = targetIndex - 1; i >= 0; i--) {
        const candidate = wardrobes[i]
        const url = getDrawnWardrobeFullBodyUrl(candidate)
        if (url && isWardrobeContinuityTransition(candidate, targetWardrobe)) {
          return {
            baseWardrobeUrl: url,
            baseWardrobeName: candidate.name?.trim() || undefined,
            baseWardrobeDescription: formatAnchorWardrobeText(candidate),
          }
        }
      }
    }

    // 3. Fall back to the default or first compatible drawn wardrobe (when target itself is not default)
    if (!targetWardrobe.isDefault) {
      const defaultDrawn = otherDrawn.find((w) => w.isDefault) || otherDrawn[0]
      if (defaultDrawn) {
        const url = getDrawnWardrobeFullBodyUrl(defaultDrawn)!
        return {
          baseWardrobeUrl: url,
          baseWardrobeName: defaultDrawn.name?.trim() || undefined,
          baseWardrobeDescription: formatAnchorWardrobeText(defaultDrawn),
        }
      }
    }
  }

  // 4. Same wardrobe being updated solely with scene continuity / appearance notes (not a stale outfit change):
  // anchor to its own drawn fullBodyUrl
  const selfUrl = getDrawnWardrobeFullBodyUrl(targetWardrobe)
  if (selfUrl && !targetWardrobe.needsImageRegen && targetWardrobe.appearanceNotes?.trim()) {
    return {
      baseWardrobeUrl: selfUrl,
      baseWardrobeName: targetWardrobe.name?.trim() || undefined,
      baseWardrobeDescription: [
        targetWardrobe.description?.trim(),
        targetWardrobe.accessories?.trim(),
      ]
        .filter(Boolean)
        .join('. ') || undefined,
    }
  }

  return undefined
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
    const defaultEntry = wardrobes[0]
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
  age?: string | number
  ageRange?: string
  gender?: string
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
  familyRelationships?: CharacterFamilyRelationship[]
}): string {
  const familyClause = buildFamilialVisualContinuityClause(character)
  const appendFamily = (base: string): string => {
    if (!familyClause) return base
    if (base.toLowerCase().includes('familial lineage:')) return base
    return `${base.replace(/\.*\s*$/, '.')} ${familyClause}`
  }

  const explicitAppearanceDesc = character.appearanceDescription?.trim()
  if (
    explicitAppearanceDesc &&
    !/^(character from script|character appearing in scene\b|visual look|look|not specified)$/i.test(
      explicitAppearanceDesc
    )
  ) {
    return appendFamily(explicitAppearanceDesc)
  }

  const explicitAppearance = character.appearance?.trim()
  if (explicitAppearance && !isMinimalAppearanceDescription(explicitAppearance)) {
    return appendFamily(explicitAppearance)
  }

  const composedFromStructured = composeStandingAppearanceFromAttributes(character)
  if (composedFromStructured) {
    return composedFromStructured
  }

  if (
    explicitAppearance &&
    !/^(character from script|visual look|look|not specified)$/i.test(explicitAppearance)
  ) {
    return appendFamily(explicitAppearance)
  }

  const desc = character.description?.trim()
  if (desc && !isMinimalAppearanceDescription(desc)) {
    return appendFamily(desc)
  }

  return 'an original adult with a unique, unrecognizable face'
}

export function buildCharacterIdentityReferencePrompt(
  input: CharacterIdentityReferencePromptInput
): string {
  const appearance = input.appearanceDescription.trim()
  const rawStyle = input.artStyle?.trim()
  const isDefaultPhotoreal = !rawStyle || rawStyle === 'photorealistic'
  const isLiveAction = isDefaultPhotoreal || isPhotorealisticArtStyle(rawStyle)

  let anchor = CHARACTER_IDENTITY_REFERENCE_ANCHOR
  let styleDirectives = IDENTITY_PHOTO_REALISM_DIRECTIVES
  if (!isLiveAction && rawStyle) {
    const stylized = buildStylizedIdentityDirectives(rawStyle)
    anchor = stylized.anchor
    styleDirectives = stylized.directives
  } else if (!isDefaultPhotoreal && rawStyle) {
    const spec = buildArtStyleSpecFromValue(rawStyle)
    styleDirectives = `${IDENTITY_PHOTO_REALISM_DIRECTIVES}\nGlobal Art Style grade: ${spec.stylePrompt}.`
  }

  const lines = [
    anchor,
    '',
    appearance,
    '',
    IDENTITY_APPEARANCE_LOCK,
    '',
    IDENTITY_ANTI_LIKENESS_DIRECTIVES,
    '',
    styleDirectives,
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
  character: CharacterForWardrobeResolution & Parameters<typeof buildAppearanceDescriptionFromAttributes>[0],
  artStyle?: string | null
): string {
  return buildCharacterIdentityReferencePrompt({
    appearanceDescription: buildAppearanceDescriptionFromAttributes(character),
    wardrobeDescription: resolveDefaultWardrobeDescription(character),
    artStyle,
  })
}

export interface CharacterLikenessFields {
  id?: string
  name?: string
  age?: string | number | null
  referenceImage?: string | null
  likenessSourceType?: 'none' | 'character' | 'upload' | string | null
  likenessCharacterId?: string | null
  likenessImageUrl?: string | null
  likenessTransformNote?: string | null
}

export interface ResolvedCharacterLikeness {
  likenessReferenceImageUrl?: string
  likenessTransformNote?: string
  donorCharacterId?: string
  donorCharacterName?: string
}

/**
 * Resolve optional reference likeness image (either uploaded reference photo or another
 * cast character's portrait) without coupling character lifecycles or overwriting portraits.
 */
export function resolveCharacterLikenessInput(
  character: CharacterLikenessFields | null | undefined,
  allCharacters: CharacterLikenessFields[] = [],
  selfId?: string
): ResolvedCharacterLikeness {
  if (!character) return {}
  const mode = (character.likenessSourceType || '').trim().toLowerCase()
  const note = character.likenessTransformNote?.trim() || undefined
  const resolvedSelfId = selfId || character.id || ''

  if (mode === 'upload') {
    const uploadUrl = character.likenessImageUrl?.trim()
    if (uploadUrl) {
      return {
        likenessReferenceImageUrl: uploadUrl,
        likenessTransformNote: note,
      }
    }
    return {}
  }

  if (mode === 'character') {
    const targetDonorId = character.likenessCharacterId?.trim()
    if (!targetDonorId || (resolvedSelfId && targetDonorId === resolvedSelfId)) {
      return {}
    }
    const donor = allCharacters.find((c, idx) => {
      const candidateId = c?.id || `char-${idx}`
      return candidateId === targetDonorId
    })
    const donorImg = donor?.referenceImage?.trim()
    if (donorImg) {
      return {
        likenessReferenceImageUrl: donorImg,
        likenessTransformNote: note,
        donorCharacterId: targetDonorId,
        donorCharacterName: donor?.name?.trim() || undefined,
      }
    }
  }

  return {}
}

export interface LikenessGuidedIdentityPromptInput {
  characterName?: string | null
  appearanceDescription: string
  likenessTransformNote?: string | null
  targetAge?: string | number | null
  wardrobeDescription?: string | null
  artStyle?: string | null
}

export interface LikenessGuidedIdentityPromptResult {
  prompt: string
  negativeTerms: string[]
}

const CLEAN_SHAVEN_INTENT_RE =
  /\b(?:no|not|without|zero|free\s+of|lack(?:ing)?)\s+(?:any\s+)?(?:facial\s+hair|beard|mustache|moustache|stubble|goatee)\b|\b(?:clean[- ]shaven|beardless|smooth[- ]shaven)\b/i

function extractNumericTargetAge(...sources: Array<string | number | null | undefined>): number | null {
  for (const src of sources) {
    if (typeof src === 'number' && Number.isFinite(src) && src > 0 && src < 120) {
      return src
    }
    if (typeof src !== 'string' || !src.trim()) continue
    const explicit = src.match(
      /\b(?:age[d]?\s*(\d{1,3})|(\d{1,3})\s*(?:-|\s)?\s*(?:year[s]?[-\s]*old|yo|yrs?))\b/i
    )
    if (explicit) {
      const n = Number(explicit[1] || explicit[2])
      if (n > 0 && n < 120) return n
    }
    if (/^\d{1,3}$/.test(src.trim())) {
      const n = Number(src.trim())
      if (n > 0 && n < 120) return n
    }
    const trailingNameAge = src.trim().match(/\s(\d{1,2})\s*$/)
    if (trailingNameAge) {
      const n = Number(trailingNameAge[1])
      if (n >= 4 && n <= 99) return n
    }
  }
  return null
}

function sanitizeReferenceTransformTextForRai(text: string, numericAge: number | null): string {
  let out = text
    // Fix common natural-language typo "not facial hair" -> "no facial hair"
    .replace(/\bnot\s+facial\s+hair\b/gi, 'no facial hair')
    .replace(/\bboys?\b/gi, 'young man')
    .replace(/\bgirls?\b/gi, 'young woman')

  if (numericAge !== null && numericAge >= 14 && numericAge < 20) {
    out = out
      .replace(
        /\b(?:a\s+|an\s+)?(?:age[d]?\s*)?\d{1,2}\s*(?:-|\s)?\s*(?:year[s]?[-\s]*old|yo|yrs?)\b/gi,
        'youthful collegiate young-adult'
      )
      .replace(/\b(?:teen|teenage|teenager|adolescent|minor|underage|high[\s-]*school\w*)\b/gi, 'youthful collegiate')
  } else if (numericAge !== null && numericAge < 14) {
    out = out
      .replace(/\b(?:minor|underage)\b/gi, 'young')
  }

  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Build a portrait generation prompt anchored to a Subject Likeness Reference Image
 * (either an uploaded photo or another cast character's portrait) while explicitly
 * overriding age, hairstyle, and facial hair where specified.
 */
export function buildLikenessGuidedIdentityPrompt(
  input: LikenessGuidedIdentityPromptInput
): LikenessGuidedIdentityPromptResult {
  const rawStyle = input.artStyle?.trim()
  const isDefaultPhotoreal = !rawStyle || rawStyle === 'photorealistic'
  const isLiveAction = isDefaultPhotoreal || isPhotorealisticArtStyle(rawStyle)

  let anchor = CHARACTER_IDENTITY_REFERENCE_ANCHOR
  let styleDirectives = IDENTITY_PHOTO_REALISM_DIRECTIVES
  if (!isLiveAction && rawStyle) {
    const stylized = buildStylizedIdentityDirectives(rawStyle)
    anchor = stylized.anchor
    styleDirectives = stylized.directives
  } else if (!isDefaultPhotoreal && rawStyle) {
    const spec = buildArtStyleSpecFromValue(rawStyle)
    styleDirectives = `${IDENTITY_PHOTO_REALISM_DIRECTIVES}\nGlobal Art Style grade: ${spec.stylePrompt}.`
  }

  const rawNote = input.likenessTransformNote?.trim() || ''
  const rawAppearance = input.appearanceDescription?.trim() || ''
  const numericAge = extractNumericTargetAge(
    input.targetAge,
    rawNote,
    input.characterName,
    rawAppearance
  )

  const wantsCleanShaven =
    CLEAN_SHAVEN_INTENT_RE.test(rawNote) || CLEAN_SHAVEN_INTENT_RE.test(rawAppearance)

  const safeNote = rawNote ? sanitizeReferenceTransformTextForRai(rawNote, numericAge) : ''
  const safeAppearance = sanitizeReferenceTransformTextForRai(rawAppearance, numericAge)

  const ageStageClause =
    numericAge !== null && numericAge >= 15 && numericAge < 20
      ? 'Depict at a fresh, youthful collegiate young-adult life stage with smooth unlined skin, lean youthful jawline, and zero middle-aged facial lines.'
      : numericAge !== null && numericAge >= 20
        ? `Depict strictly at biological age ${numericAge}.`
        : ''

  const cleanShavenClause = wantsCleanShaven
    ? 'FACIAL HAIR OVERRIDE: Render with a completely clean-shaven, smooth jawline, chin, and upper lip — strictly zero beard, zero mustache, zero goatee, zero stubble, and zero five-o’clock shadow, completely removing any facial hair visible in Reference Image [1].'
    : ''

  const negativeTerms: string[] = []
  if (wantsCleanShaven) {
    negativeTerms.push(
      'beard',
      'mustache',
      'goatee',
      'stubble',
      "five o'clock shadow",
      'facial hair'
    )
  }
  if (numericAge !== null && numericAge < 26) {
    negativeTerms.push(
      'deep wrinkles',
      "crow's feet",
      'receding hairline',
      'gray hair',
      'middle-aged'
    )
  }

  const lines: string[] = [
    anchor,
    '',
    'Subject Identity Anchor (Reference Image [1]): Preserve the exact underlying genetic facial identity of the person in Reference Image [1] — identical cranial and facial bone structure, eye shape, eye color, eye spacing, nose bridge and nostril contour, lip proportions, ear shape, skin tone, and heritage.',
    '',
    'Life-Stage & Styling Transformation (OVERRIDES Reference Image [1]): Reference Image [1] shows this individual at a different age or styling. Do NOT copy the age, skin wrinkles, hairline/hairstyle, or facial hair from Reference Image [1] wherever they differ from the target character specification below.',
  ]

  if (safeNote) {
    lines.push('', `Requested Transformation from Reference [1]: ${safeNote}.`)
  }
  if (ageStageClause) {
    lines.push(ageStageClause)
  }
  if (cleanShavenClause) {
    lines.push(cleanShavenClause)
  }
  if (safeAppearance) {
    lines.push('', `Target Character Appearance: ${safeAppearance}`)
  }

  const wardrobe = input.wardrobeDescription?.trim()
  if (wardrobe) {
    lines.push('', `Attire: ${wardrobe}`)
  }

  lines.push('', styleDirectives)

  return {
    prompt: lines.join('\n'),
    negativeTerms,
  }
}

/** Prompt for enhance-reference / auto-enhance pass (reference-anchored refinement). */
export function buildEnhanceIdentityReferencePrompt(input: {
  characterName: string
  appearanceDescription: string
  wardrobeDescription?: string | null
  subjectDescription?: string
  /** description: written body wins. photo: keep the person already in the picture. */
  identitySource?: EnhanceIdentitySource
  artStyle?: string | null
}): string {
  const appearance = input.appearanceDescription.trim()
  const fromDescription = input.identitySource === 'description'
  const rawStyle = input.artStyle?.trim()
  const isLiveAction = !rawStyle || rawStyle === 'photorealistic' || isPhotorealisticArtStyle(rawStyle)

  const subjectLine = fromDescription
    ? `Subject: ${appearance}`
    : input.subjectDescription?.trim()
      ? `Subject: ${input.subjectDescription}.`
      : isLiveAction
        ? 'Subject: the exact person shown in the reference photo.'
        : 'Subject: the exact character shown in the reference image.'

  const prefixLine = isLiveAction
    ? fromDescription
      ? ENHANCE_IDENTITY_FROM_DESCRIPTION_PREFIX
      : ENHANCE_IDENTITY_REFERENCE_PREFIX
    : fromDescription
      ? `Polish this into a clean character reference portrait in ${buildArtStyleSpecFromValue(rawStyle).title}. The written identity overrides the draft image wherever they disagree.`
      : `Refine this character reference portrait in ${buildArtStyleSpecFromValue(rawStyle).title}. Preserve the exact character design, facial features, age, ethnicity, and hairstyle.`

  const lines = [
    prefixLine,
    '',
    subjectLine,
  ]
  if (!fromDescription && appearance) {
    lines.push('', appearance)
  }

  const styleDirectives = isLiveAction
    ? IDENTITY_PHOTO_REALISM_DIRECTIVES
    : buildStylizedIdentityDirectives(rawStyle!).directives

  lines.push(
    '',
    IDENTITY_ANTI_LIKENESS_DIRECTIVES,
    '',
    styleDirectives,
    '',
    fromDescription
      ? 'Correct ethnicity, skin tone, age, face shape, hair, and eyes to the written identity. The reference photo is only the starting composition.'
      : isLiveAction
        ? 'Transform lighting to bright professional studio quality while keeping facial features identical to the reference.'
        : 'Refine studio lighting and linework/shading clarity while keeping facial features and art style identical to the reference.',
  )

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

  const rawStyle = input.artStyle?.trim()
  const isDefaultPhotoreal = !rawStyle || rawStyle === 'photorealistic'
  const isLiveAction = isDefaultPhotoreal || isPhotorealisticArtStyle(rawStyle)
  const spec = !isDefaultPhotoreal && rawStyle ? buildArtStyleSpecFromValue(rawStyle) : undefined

  const lines = isLiveAction
    ? [
        FULL_BODY_WARDROBE_REFERENCE_ANCHOR,
        '',
        `Character: ${input.characterName}. Same real person as the attached identity reference photo — match face exactly.`,
        '',
        'Pose: full-length front-facing standing pose, relaxed neutral stance, head to feet visible including footwear.',
        'Hands: empty and visible at the sides. The subject holds, carries, or wears NO props — no tools, weapons, bags, documents, books, phones, cups, or objects of any kind. This image is copied as costume into every downstream frame, so anything held here appears in scenes that never directed it.',
        'Framing: single subject centered, entire outfit visible with no cropping at ankles or head.',
        'Background: plain neutral gray studio backdrop matching the identity headshot.',
        'Lighting: soft even studio lighting, photorealistic human photography.',
        spec
          ? `Style: photorealistic only (${spec.stylePrompt}) — no illustration, mannequin, faceless figure, or turnaround sheet layout.`
          : 'Style: photorealistic only — no illustration, mannequin, faceless figure, or turnaround sheet layout.',
      ]
    : [
        `${spec!.title} full-body wardrobe reference for cinematic character consistency.`,
        '',
        `Character: ${input.characterName}. Exact same character design and face as the attached identity reference — match facial features, proportions, and ${spec!.title} art style exactly.`,
        '',
        'Pose: full-length front-facing standing pose, relaxed neutral stance, head to feet visible including footwear.',
        'Hands: empty and visible at the sides. The subject holds, carries, or wears NO props — no tools, weapons, bags, documents, books, phones, cups, or objects of any kind. This image is copied as costume into every downstream frame, so anything held here appears in scenes that never directed it.',
        'Framing: single subject centered, entire outfit visible with no cropping at ankles or head.',
        'Background: plain neutral gray studio backdrop matching the identity headshot.',
        `Lighting: clean even studio lighting matching ${spec!.title}.`,
        `Style: ${spec!.characterRefDirective} No mannequin, faceless figure, turnaround sheet layout, or live-action human photography.`,
      ]

  if (input.hairAnchor?.trim()) {
    lines.push(`Hairstyle (match identity reference): ${input.hairAnchor.trim()}.`)
  }

  if (input.appearanceDescription?.trim()) {
    lines.push(`Identity notes: ${input.appearanceDescription.trim()}.`)
  }

  if (input.baseWardrobeUrl?.trim()) {
    const baseLabel = input.baseWardrobeName?.trim()
      ? ` (${input.baseWardrobeName.trim()})`
      : ''
    const baseDesc = input.baseWardrobeDescription?.trim()
      ? ` Baseline outfit for reference: ${input.baseWardrobeDescription.trim()}.`
      : ''
    lines.push(
      '',
      `WARDROBE CONTINUITY & TRANSITION LOCK: Reference Image 1 is the Character Identity portrait (facial likeness lock). Reference Image 2 is the Character's Baseline/Preceding Wardrobe full-body reference${baseLabel}.${baseDesc}`,
      'Maintain strict garment cut, fabric texture, color palette, fit, footwear, and body-proportion continuity with Reference Image 2 wherever the outfit overlaps or transitions from the baseline look, applying ONLY the directed wardrobe/state modifications below rather than inventing a new costume from scratch.'
    )
  }

  if (wardrobeParts.length) {
    lines.push('', `Outfit: ${wardrobeParts.join('. ')}.`)
  }

  if (input.appearanceNotes?.trim()) {
    lines.push(
      '',
      `Scene appearance / continuity marks (paint onto body, hands, and face as visible): ${input.appearanceNotes.trim()}.`,
      'Preserve these visible injuries, makeup wear, and exhaustion marks on the wardrobe reference — they are the source of truth for downstream frames.'
    )
  }

  lines.push(
    '',
    isLiveAction
      ? 'The face must match the attached identity reference exactly for bone structure and likeness.'
      : `The face and art style must match the attached identity reference exactly in ${spec!.title}.`,
    'This image is the wardrobe source of truth for outfit AND any visible scene marks (bruises, wounds, makeup wear) in downstream frames.'
  )

  return lines.join('\n')
}

export function promptHasIdentityReferenceAnchor(prompt: string): boolean {
  return (
    prompt.includes(CHARACTER_IDENTITY_REFERENCE_ANCHOR) ||
    STYLIZED_IDENTITY_ANCHOR_RE.test(prompt.trim())
  )
}
