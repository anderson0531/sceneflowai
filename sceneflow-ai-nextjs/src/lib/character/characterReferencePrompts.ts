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
import { extractSamePersonAgeStage } from '@/lib/character/ageStageContinuity'

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

/** Extract trailing `Wearing ...` or `Attire: ...` wardrobe directive from a built identity prompt. */
export function extractWardrobeFromIdentityPrompt(prompt: string): string | undefined {
  const trimmed = prompt.trim()
  if (!trimmed) return undefined
  const lockAt = trimmed.indexOf(IDENTITY_APPEARANCE_LOCK)
  const tail = lockAt >= 0 ? trimmed.slice(lockAt) : trimmed
  const lines = tail
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    const wearingMatch = line.match(/^Wearing\s+(.+?)\.?$/i)
    if (wearingMatch?.[1]?.trim()) {
      return wearingMatch[1].trim()
    }
    const attireMatch = line.match(/^(?:Wardrobe\s*\/\s*Attire[^:]*|Attire|Outfit)\s*:\s*(.+?)\.?$/i)
    if (attireMatch?.[1]?.trim()) {
      return attireMatch[1]
        .trim()
        .replace(/^Do NOT copy clothing from [^.]+\.\s*Dress the subject in:\s*/i, '')
        .trim()
    }
  }
  return undefined
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

export type LikenessRelationMode = 'auto' | 'same_person' | 'family_blend'

export interface CharacterLikenessFields {
  id?: string
  name?: string
  role?: string | null
  type?: string | null
  age?: string | number | null
  gender?: string | null
  subject?: string | null
  keyFeature?: string | null
  description?: string | null
  appearance?: string | null
  appearanceDescription?: string | null
  samePersonGroupId?: string | null
  familyRelationships?: CharacterFamilyRelationship[] | null
  referenceImage?: string | null
  likenessSourceType?: 'none' | 'character' | 'upload' | 'blend' | string | null
  likenessMode?: LikenessRelationMode | string | null
  likenessCharacterId?: string | null
  likenessCharacterName?: string | null
  likenessImageUrl?: string | null
  secondaryLikenessCharacterId?: string | null
  secondaryLikenessCharacterName?: string | null
  secondaryLikenessImageUrl?: string | null
  likenessTransformNote?: string | null
}

export interface ResolvedLikenessDonor {
  imageUrl: string
  sourceType: 'character' | 'upload'
  characterId?: string
  characterName?: string
  /** Age-scrubbed display name for multimodal bindings (e.g. "Arthur" from "Arthur 78"). */
  cleanLabel: string
  gender?: string
}

export interface DetectedTraitDonorCandidate {
  index: number
  characterId: string
  characterName: string
  cleanLabel: string
  referenceImage?: string
  gender?: string
}

export interface ResolvedCharacterLikeness {
  likenessReferenceImageUrl?: string
  likenessTransformNote?: string
  donorCharacterId?: string
  donorCharacterName?: string
  likenessMode?: 'same_person' | 'family_blend'
  donors?: ResolvedLikenessDonor[]
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Strip life-stage suffixes (e.g. `"Arthur 78"` -> `"Arthur"`, `"Eleanor (Age 75)"` -> `"Eleanor"`)
 * so donor labels never inject older age numbers into target age extraction or Gemini prompts.
 */
export function cleanLikenessDonorBaseLabel(
  rawName?: string | null,
  fallbackIndex = 1
): string {
  const trimmed = (rawName || '').trim()
  if (!trimmed) return `Donor ${fallbackIndex}`
  const stage = extractSamePersonAgeStage(trimmed)
  const base = (stage.baseName || trimmed)
    .replace(/\s*\(\s*(?:Age\s*)?\d{1,3}\s*\)\s*$/i, '')
    .replace(/\s+\d{1,3}\s*$/, '')
    .trim()
  return base || trimmed
}

function extractSimpleFirstName(rawName: string): string {
  const cleaned = rawName.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?|capt\.?|lt\.?)\s+/i, '').trim()
  return cleaned.split(/\s+/)[0] || cleaned
}

function areSamePersonLikenessEntries(
  a?: CharacterLikenessFields | null,
  b?: CharacterLikenessFields | null
): boolean {
  if (!a || !b) return false
  const gA = (a.samePersonGroupId || '').trim().toLowerCase()
  const gB = (b.samePersonGroupId || '').trim().toLowerCase()
  if (gA && gB && gA === gB) return true
  const sA = extractSamePersonAgeStage((a.name || '').trim())
  const sB = extractSamePersonAgeStage((b.name || '').trim())
  const bA = sA.baseName.trim().toLowerCase()
  const bB = sB.baseName.trim().toLowerCase()
  return Boolean(bA && bB && bA === bB && (sA.isAgeVariant || sB.isAgeVariant))
}

/**
 * Detect cast members explicitly cited as physical/genetic trait donors in a character's
 * Transform Note, appearance, or description — e.g.:
 *   `"Warm 44-year-old adult daughter inheriting Arthur’s hazel eyes and Eleanor’s cheekbones"`
 *
 * Ordered by first text mention (`Arthur` -> `[1]`, `Eleanor` -> `[2]`) and deduplicated across
 * same-person age variants (preferring drawn portraits and older/base life-stage anchors).
 */
export function detectTraitDonorCandidatesFromProse(
  character: CharacterLikenessFields | null | undefined,
  allCharacters: CharacterLikenessFields[] = [],
  selfId?: string
): DetectedTraitDonorCandidate[] {
  if (!character || !Array.isArray(allCharacters) || allCharacters.length === 0) return []

  const prose = [
    character.likenessTransformNote,
    character.appearanceDescription,
    character.appearance,
    character.description,
    character.keyFeature,
    character.subject,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join('. ')
  if (!prose) return []

  const resolvedSelfId = (selfId || character.id || '').trim()
  const selfNameLower = (character.name || '').trim().toLowerCase()

  // Group first names by same-person identity so "Arthur 78" + "Arthur 26" still resolve "Arthur" uniquely
  const firstNamePersonGroups = new Map<string, Set<string>>()
  const firstNamePrimaryIndex = new Map<string, number>()
  const firstNamePrimaryRank = new Map<string, number>()

  allCharacters.forEach((cand, idx) => {
    const name = (cand?.name || '').trim()
    if (!name || cand?.type === 'narrator' || cand?.role === 'narrator' || cand?.type === 'description') {
      return
    }
    const stage = extractSamePersonAgeStage(name)
    const cleanBase = cleanLikenessDonorBaseLabel(name, idx + 1)
    const firstUpper = extractSimpleFirstName(cleanBase).toUpperCase()
    const personKey =
      (cand?.samePersonGroupId || '').trim().toLowerCase() ||
      cleanBase.toLowerCase()
    if (firstUpper.length >= 2 && personKey) {
      let set = firstNamePersonGroups.get(firstUpper)
      if (!set) {
        set = new Set<string>()
        firstNamePersonGroups.set(firstUpper, set)
      }
      set.add(personKey)
      const rank =
        (cand?.referenceImage?.trim() ? 1000 : 0) +
        (!stage.isAgeVariant ? 200 : stage.numericAge ?? 0)
      const prevRank = firstNamePrimaryRank.get(firstUpper)
      if (prevRank === undefined || rank > prevRank) {
        firstNamePrimaryRank.set(firstUpper, rank)
        firstNamePrimaryIndex.set(firstUpper, idx)
      }
    }
  })

  const matched: Array<DetectedTraitDonorCandidate & { matchOffset: number; personKey: string }> = []

  allCharacters.forEach((cand, idx) => {
    const candName = (cand?.name || '').trim()
    if (!candName || cand?.type === 'narrator' || cand?.role === 'narrator' || cand?.type === 'description') {
      return
    }
    const canonicalId = cand?.id || String(idx)
    const legacyId = cand?.id || `char-${idx}`
    if (
      (resolvedSelfId && (canonicalId === resolvedSelfId || legacyId === resolvedSelfId)) ||
      (!resolvedSelfId && selfNameLower && candName.toLowerCase() === selfNameLower)
    ) {
      return
    }
    if (areSamePersonLikenessEntries(character, cand)) return

    const cleanLabel = cleanLikenessDonorBaseLabel(candName, idx + 1)
    const first = extractSimpleFirstName(cleanLabel)
    const firstUpper = first.toUpperCase()
    const personKey =
      (cand?.samePersonGroupId || '').trim().toLowerCase() ||
      cleanLabel.toLowerCase()

    const tokensToTry: string[] = [candName]
    if (cleanLabel.toLowerCase() !== candName.toLowerCase() && firstNamePrimaryIndex.get(firstUpper) === idx) {
      tokensToTry.push(cleanLabel)
    }
    if (
      first.length >= 3 &&
      first.toLowerCase() !== cleanLabel.toLowerCase() &&
      firstNamePersonGroups.get(firstUpper)?.size === 1 &&
      firstNamePrimaryIndex.get(firstUpper) === idx
    ) {
      tokensToTry.push(first)
    }

    for (const token of tokensToTry) {
      const esc = escapeRegexLiteral(token)
      const patterns = [
        new RegExp(`\\binherit(?:s|ing|ed)?\\b[^.;\\n]{0,140}?\\b(${esc})(?:'s|’s|\\b)`, 'i'),
        new RegExp(
          `\\b(${esc})(?:'s|’s)\\s+(?:[a-z-]+\\s+){0,2}(?:eyes|cheekbones|jaw|jawline|smile|nose|brow|forehead|chin|dimples|freckles|curls|hair|complexion|bone\\s+structure|facial\\s+structure|features|likeness)\\b`,
          'i'
        ),
        new RegExp(`\\b(?:blend(?:ing|s)?\\s+(?:of\\s+)?|resembl(?:es|ing)\\s+)[^.;\\n]{0,70}?\\b(${esc})\\b`, 'i'),
      ]

      let earliestOffset = Infinity
      for (const re of patterns) {
        const m = re.exec(prose)
        if (m) {
          const subOffset = m[0].toLowerCase().lastIndexOf(token.toLowerCase())
          const exactOffset = m.index + (subOffset >= 0 ? subOffset : 0)
          if (exactOffset < earliestOffset) earliestOffset = exactOffset
        }
      }

      if (Number.isFinite(earliestOffset)) {
        matched.push({
          index: idx,
          characterId: canonicalId,
          characterName: candName,
          cleanLabel,
          referenceImage: cand?.referenceImage?.trim() || undefined,
          gender: cand?.gender?.trim() || undefined,
          matchOffset: earliestOffset,
          personKey,
        })
        break
      }
    }
  })

  matched.sort((a, b) => a.matchOffset - b.matchOffset)
  const seenPersons = new Set<string>()
  const deduped: DetectedTraitDonorCandidate[] = []
  for (const item of matched) {
    if (seenPersons.has(item.personKey)) continue
    seenPersons.add(item.personKey)
    const { matchOffset: _m, personKey: _p, ...cleanItem } = item
    deduped.push(cleanItem)
    if (deduped.length >= 3) break
  }
  return deduped
}

function findDonorCharacterByIdOrName(
  allCharacters: CharacterLikenessFields[],
  donorId?: string | null,
  donorName?: string | null,
  resolvedSelfId?: string,
  selfNameLower?: string
): { donor: CharacterLikenessFields; index: number; canonicalId: string } | null {
  const targetDonorId = (donorId || '').trim()
  const targetDonorNameLower = (donorName || '').trim().toLowerCase()
  if (!targetDonorId && !targetDonorNameLower) return null

  let matchedIndex = -1
  if (targetDonorId) {
    matchedIndex = allCharacters.findIndex((c, idx) => {
      const canonicalId = c?.id || String(idx)
      const legacyId = c?.id || `char-${idx}`
      return canonicalId === targetDonorId || legacyId === targetDonorId
    })
  }
  if (matchedIndex < 0 && targetDonorNameLower) {
    matchedIndex = allCharacters.findIndex(
      (c) => (c?.name || '').trim().toLowerCase() === targetDonorNameLower
    )
  }
  if (matchedIndex < 0 && targetDonorId) {
    const idAsNameLower = targetDonorId.toLowerCase()
    matchedIndex = allCharacters.findIndex(
      (c) => (c?.name || '').trim().toLowerCase() === idAsNameLower
    )
  }
  if (matchedIndex < 0) return null

  const donor = allCharacters[matchedIndex]
  const donorCanonicalId = donor?.id || String(matchedIndex)
  const donorLegacyId = donor?.id || `char-${matchedIndex}`
  const donorNameTrimmed = (donor?.name || '').trim()

  if (
    (resolvedSelfId &&
      (donorCanonicalId === resolvedSelfId || donorLegacyId === resolvedSelfId)) ||
    (!resolvedSelfId && selfNameLower && donorNameTrimmed.toLowerCase() === selfNameLower)
  ) {
    return null
  }

  return { donor, index: matchedIndex, canonicalId: donorCanonicalId }
}

const FAMILY_OFFSPRING_OR_KIN_CUE_RE =
  /\b(?:daughter|son|child|offspring|firstborn|granddaughter|grandson|grandchild|sister|brother|twin|sibling|niece|nephew|cousin|inherit(?:s|ing|ed)?|family\s+resemblance|parent(?:s)?)\b/i

function inferGenderToken(
  explicitGender?: string | null,
  ...proseSources: Array<string | null | undefined>
): 'female' | 'male' | null {
  const g = (explicitGender || '').trim().toLowerCase()
  if (/^(female|woman|girl|f|she|her)$/.test(g)) return 'female'
  if (/^(male|man|boy|m|he|him)$/.test(g)) return 'male'

  const combined = proseSources
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ')
  if (!combined) return null

  const hasFemaleNoun =
    /\b(?:daughter|woman|female|mother|mom|mama|matriarch|sister|granddaughter|grandmother|girl|actress|bride|wife)\b/i.test(
      combined
    )
  const hasMaleNoun =
    /\b(?:son|man|male|father|dad|papa|patriarch|brother|grandson|grandfather|boy|actor|groom|husband)\b/i.test(
      combined
    )
  if (hasFemaleNoun && !hasMaleNoun) return 'female'
  if (hasMaleNoun && !hasFemaleNoun) return 'male'
  return null
}

function resolveEffectiveLikenessRelationMode(input: {
  explicitRelationMode?: string | null
  donorCount: number
  isSamePersonPair: boolean
  targetGender: 'female' | 'male' | null
  donorGenders: Array<'female' | 'male' | null>
  combinedText: string
  hasBiologicalKinshipToDonor: boolean
}): 'same_person' | 'family_blend' {
  const modeClean = (input.explicitRelationMode || '').trim().toLowerCase()
  if (input.donorCount >= 2 || modeClean === 'family_blend') {
    return 'family_blend'
  }
  if (modeClean === 'same_person') {
    return 'same_person'
  }
  if (input.isSamePersonPair) {
    return 'same_person'
  }
  if (input.hasBiologicalKinshipToDonor || FAMILY_OFFSPRING_OR_KIN_CUE_RE.test(input.combinedText)) {
    return 'family_blend'
  }
  const primaryDonorGender = input.donorGenders[0] ?? null
  if (
    input.targetGender &&
    primaryDonorGender &&
    input.targetGender !== primaryDonorGender
  ) {
    return 'family_blend'
  }
  return 'same_person'
}

/**
 * Resolve optional reference likeness image(s) — single-donor same-person transformation
 * (e.g. `Arthur 78 -> Arthur 26` or uploaded selfie -> younger self) OR 1–2+ donor
 * family trait inheritance (e.g. `Arthur + Eleanor -> Claire 44`).
 *
 * Matches both `resolveCharacterId` (`c?.id || String(idx)`) and legacy `char-${idx}` IDs,
 * plus case-insensitive `likenessCharacterName` fallback and automatic prose trait-donor
 * inference when `likenessSourceType` was not explicitly set to `'none'`.
 */
export function resolveCharacterLikenessInput(
  character: CharacterLikenessFields | null | undefined,
  allCharacters: CharacterLikenessFields[] = [],
  selfId?: string
): ResolvedCharacterLikeness {
  if (!character) return {}
  const explicitSource = (character.likenessSourceType || '').trim().toLowerCase()
  if (explicitSource === 'none') return {}

  const hasPrimaryCastRef = Boolean(
    character.likenessCharacterId?.trim() || character.likenessCharacterName?.trim()
  )
  const hasSecondaryCastRef = Boolean(
    character.secondaryLikenessCharacterId?.trim() ||
      character.secondaryLikenessCharacterName?.trim()
  )
  const hasPrimaryUpload = Boolean(character.likenessImageUrl?.trim())
  const hasSecondaryUpload = Boolean(character.secondaryLikenessImageUrl?.trim())

  const mode =
    explicitSource === 'character' || explicitSource === 'upload' || explicitSource === 'blend'
      ? explicitSource
      : hasPrimaryCastRef || hasSecondaryCastRef
        ? 'character'
        : hasPrimaryUpload || hasSecondaryUpload
          ? 'upload'
          : 'auto'

  const resolvedSelfId = (selfId || character.id || '').trim()
  const selfNameLower = (character.name || '').trim().toLowerCase()
  const explicitNote = character.likenessTransformNote?.trim() || undefined

  const donors: ResolvedLikenessDonor[] = []
  const matchedCastRecords: CharacterLikenessFields[] = []
  const seenUrls = new Set<string>()
  const pushDonor = (entry: ResolvedLikenessDonor) => {
    const url = entry.imageUrl.trim()
    if (!url || seenUrls.has(url)) return
    seenUrls.add(url)
    donors.push({ ...entry, imageUrl: url })
  }

  // 1. Primary donor slot
  if (mode === 'upload') {
    const uploadUrl = character.likenessImageUrl?.trim()
    if (uploadUrl) {
      pushDonor({
        imageUrl: uploadUrl,
        sourceType: 'upload',
        cleanLabel: 'Reference Donor 1',
      })
    }
  } else if (mode === 'character' || mode === 'blend') {
    const primaryMatch = findDonorCharacterByIdOrName(
      allCharacters,
      character.likenessCharacterId,
      character.likenessCharacterName,
      resolvedSelfId,
      selfNameLower
    )
    if (primaryMatch?.donor?.referenceImage?.trim()) {
      matchedCastRecords.push(primaryMatch.donor)
      const donorNameTrimmed = primaryMatch.donor.name?.trim() || undefined
      pushDonor({
        imageUrl: primaryMatch.donor.referenceImage.trim(),
        sourceType: 'character',
        characterId: primaryMatch.canonicalId,
        characterName: donorNameTrimmed,
        cleanLabel: cleanLikenessDonorBaseLabel(donorNameTrimmed, 1),
        gender: primaryMatch.donor.gender?.trim() || undefined,
      })
    } else if (mode === 'blend' && character.likenessImageUrl?.trim()) {
      pushDonor({
        imageUrl: character.likenessImageUrl.trim(),
        sourceType: 'upload',
        cleanLabel: 'Reference Donor 1',
      })
    }
  }

  // 2. Secondary donor slot (e.g. 2nd parent/relative in Cast OR 2nd uploaded parent photo)
  if (hasSecondaryCastRef) {
    const secondaryMatch = findDonorCharacterByIdOrName(
      allCharacters,
      character.secondaryLikenessCharacterId,
      character.secondaryLikenessCharacterName,
      resolvedSelfId,
      selfNameLower
    )
    if (secondaryMatch?.donor?.referenceImage?.trim()) {
      matchedCastRecords.push(secondaryMatch.donor)
      const secNameTrimmed = secondaryMatch.donor.name?.trim() || undefined
      pushDonor({
        imageUrl: secondaryMatch.donor.referenceImage.trim(),
        sourceType: 'character',
        characterId: secondaryMatch.canonicalId,
        characterName: secNameTrimmed,
        cleanLabel: cleanLikenessDonorBaseLabel(secNameTrimmed, donors.length + 1),
        gender: secondaryMatch.donor.gender?.trim() || undefined,
      })
    }
  }
  if (hasSecondaryUpload && character.secondaryLikenessImageUrl?.trim()) {
    pushDonor({
      imageUrl: character.secondaryLikenessImageUrl.trim(),
      sourceType: 'upload',
      cleanLabel: `Reference Donor ${donors.length + 1}`,
    })
  }

  // 3. Automatic prose trait-donor resolution when user wrote e.g.
  // "Claire 44: Warm 44-year-old adult daughter inheriting Arthur's hazel eyes and Eleanor's cheekbones"
  // without manually configuring the Reference Likeness panel (and did not set likenessSourceType='none').
  let usedImplicitProseDonors = false
  if (
    donors.length === 0 &&
    !hasPrimaryCastRef &&
    !hasSecondaryCastRef &&
    !hasPrimaryUpload &&
    !hasSecondaryUpload
  ) {
    const proseCandidates = detectTraitDonorCandidatesFromProse(
      character,
      allCharacters,
      resolvedSelfId
    )
    for (const cand of proseCandidates) {
      if (cand.referenceImage) {
        const donorRec = allCharacters[cand.index]
        if (donorRec) matchedCastRecords.push(donorRec)
        pushDonor({
          imageUrl: cand.referenceImage,
          sourceType: 'character',
          characterId: cand.characterId,
          characterName: cand.characterName,
          cleanLabel: cand.cleanLabel,
          gender: cand.gender,
        })
        usedImplicitProseDonors = true
      }
    }
  }

  if (donors.length === 0) {
    return {}
  }

  const fallbackProseNote = usedImplicitProseDonors
    ? character.appearanceDescription?.trim() ||
      character.appearance?.trim() ||
      character.description?.trim() ||
      undefined
    : undefined
  const effectiveNote = explicitNote || fallbackProseNote

  const combinedText = [
    effectiveNote,
    character.appearanceDescription,
    character.appearance,
    character.description,
  ]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join('. ')

  const isSamePersonPair =
    donors.length === 1 &&
    matchedCastRecords.length === 1 &&
    areSamePersonLikenessEntries(character, matchedCastRecords[0])

  const hasBioKinship =
    Array.isArray(character.familyRelationships) &&
    character.familyRelationships.some(
      (r) =>
        r.biological &&
        donors.some(
          (d) =>
            (d.characterId && r.relatedCharacterId === d.characterId) ||
            (d.characterName &&
              r.relatedCharacterName.trim().toLowerCase() === d.characterName.trim().toLowerCase())
        )
    )

  const targetGender = inferGenderToken(
    character.gender,
    character.name,
    effectiveNote,
    character.appearanceDescription,
    character.description
  )
  const donorGenders = donors.map((d, idx) =>
    inferGenderToken(
      d.gender,
      d.characterName,
      matchedCastRecords[idx]?.appearanceDescription,
      matchedCastRecords[idx]?.description
    )
  )

  const resolvedRelationMode = usedImplicitProseDonors
    ? 'family_blend'
    : resolveEffectiveLikenessRelationMode({
        explicitRelationMode: character.likenessMode,
        donorCount: donors.length,
        isSamePersonPair,
        targetGender,
        donorGenders,
        combinedText,
        hasBiologicalKinshipToDonor: Boolean(hasBioKinship),
      })

  const primary = donors[0]!
  return {
    likenessReferenceImageUrl: primary.imageUrl,
    likenessTransformNote: effectiveNote,
    donorCharacterId: primary.characterId,
    donorCharacterName: primary.characterName,
    likenessMode: resolvedRelationMode,
    donors,
  }
}

export interface LikenessDonorPromptSpec {
  characterName?: string | null
  cleanLabel?: string | null
  gender?: string | null
}

export interface LikenessGuidedIdentityPromptInput {
  characterName?: string | null
  donorCharacterName?: string | null
  donors?: LikenessDonorPromptSpec[] | null
  likenessMode?: LikenessRelationMode | string | null
  targetGender?: string | null
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

const SMILE_OR_EXPRESSION_INTENT_RE =
  /\b(?:warm|gentle|soft|broad|bright|slight|subtle|friendly|confident|easy|open|joyful|radiant|charismatic)?\s*(?:smile|smiling|grin|grinning|beam|beaming)\b|\bsmil(?:e|ing)\b|\b(?:warm|kind|gentle|joyful|affectionate)\s+(?:\d{1,3}[-\s]*year[-\s]*old\s+)?(?:adult\s+|young\s+)?(?:expression|demeanor|daughter|son|woman|man|mother|father|person)\b/i

const WANTS_GRAY_OR_WHITE_HAIR_RE =
  /\b(?:gray|grey|silver|white|salt[-\s]*and[-\s]*pepper|platinum|frosted)\s+(?:hair|locks|curls|waves|temples|streaks|strands|afro|bob|bun|braids)\b/i

const WANTS_RECEDING_OR_BALD_RE =
  /\b(?:receding\s+hairline|balding|bald|shaved\s+head|thinning\s+hair)\b/i

/**
 * Strip donor-character age references like `"of Arthur 78"` or `"from Arthur (Age 78)"`
 * before scanning free text for the TARGET age or sending text to Gemini Image, so the
 * donor's older age number (`78`) never leaks into target age extraction or visual tokens.
 */
function stripDonorAgeReferencesFromNote(
  text: string,
  donorCharacterName?: string | null,
  extraDonorSpecs?: LikenessDonorPromptSpec[] | null,
  keepDistinctDonorNames = false
): string {
  if (!text) return ''
  let out = text

  const specs =
    Array.isArray(extraDonorSpecs) && extraDonorSpecs.length > 0
      ? extraDonorSpecs
      : donorCharacterName?.trim()
        ? [{ characterName: donorCharacterName.trim() }]
        : []

  specs.forEach((spec, idx) => {
    const rawName = (spec.characterName || '').trim()
    const cleanLabel =
      (spec.cleanLabel || '').trim() || cleanLikenessDonorBaseLabel(rawName, idx + 1)
    const refTag = `Reference Image [${idx + 1}]`

    if (keepDistinctDonorNames) {
      // Family blend: strip trailing age numbers from donor names ("Arthur 78" -> "Arthur")
      // AND bind clean donor names to their exact multimodal slot ("Arthur's" -> "Arthur's (Reference Image [1])")
      if (rawName && rawName.toLowerCase() !== cleanLabel.toLowerCase()) {
        const escapedRaw = escapeRegexLiteral(rawName)
        out = out.replace(new RegExp(`\\b${escapedRaw}\\b`, 'gi'), cleanLabel)
      }
      if (cleanLabel && !/^Donor\s+\d+$/i.test(cleanLabel) && !/^Reference Donor/i.test(cleanLabel)) {
        const escapedClean = escapeRegexLiteral(cleanLabel)
        // Strip any inline "<CleanLabel> 78" or "<CleanLabel> (Age 78)" age tokens
        out = out.replace(
          new RegExp(
            `\\b(${escapedClean})\\s*(?:\\(\\s*(?:Age\\s*)?\\d{1,3}\\s*\\)|\\bAge\\s*\\d{1,3}\\b|\\s+\\d{1,3}\\b)`,
            'gi'
          ),
          '$1'
        )
        // Annotate possessive ("Arthur's" -> "Arthur's (Reference Image [1])") or bare name if not already tagged
        out = out.replace(
          new RegExp(`\\b(${escapedClean}(?:'s|’s))(?!\\s*\\(Reference Image)`, 'gi'),
          `$1 (${refTag})`
        )
        out = out.replace(
          new RegExp(`\\b(${escapedClean})(?!'s|’s|\\s*\\(Reference Image)`, 'gi'),
          `$1 (${refTag})`
        )
      }
    } else if (rawName) {
      const escapedDonor = escapeRegexLiteral(rawName)
      out = out.replace(
        new RegExp(`\\b(?:of|from|as|like|than)\\s+${escapedDonor}\\b`, 'gi'),
        `of the person in ${refTag}`
      )
      out = out.replace(
        new RegExp(`\\b${escapedDonor}\\b`, 'gi'),
        `the person in ${refTag}`
      )
    }
  })

  if (!keepDistinctDonorNames) {
    // Generic pattern: "version of Arthur 78", "version of Arthur (Age 78)", "from John Miller 65"
    out = out.replace(
      /\b(version\s+(?:of|from)|likeness\s+(?:of|from)|based\s+on|younger\s+version\s+of|older\s+version\s+of)\s+(?!the\b|reference\b|this\b)([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3})\s*(?:\(\s*(?:Age\s*)?\d{1,3}\s*\)|\bAge\s*\d{1,3}\b|\s+\d{1,3}\b)/g,
      '$1 the person in Reference Image [1]'
    )
  }
  return out
}

function extractNumericTargetAge(...sources: Array<string | number | null | undefined>): number | null {
  for (const src of sources) {
    if (typeof src === 'number' && Number.isFinite(src) && src > 0 && src < 120) {
      return src
    }
    if (typeof src !== 'string' || !src.trim()) continue
    const stageParsed = extractSamePersonAgeStage(src.trim())
    if (stageParsed.isAgeVariant && stageParsed.numericAge && stageParsed.numericAge > 0 && stageParsed.numericAge < 120) {
      return stageParsed.numericAge
    }
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

function sanitizeReferenceTransformTextForRai(
  text: string,
  numericAge: number | null,
  donorCharacterName?: string | null,
  donorSpecs?: LikenessDonorPromptSpec[] | null,
  keepDistinctDonorNames = false
): string {
  let out = stripDonorAgeReferencesFromNote(
    text,
    donorCharacterName,
    donorSpecs,
    keepDistinctDonorNames
  )
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
    out = out.replace(/\b(?:minor|underage)\b/gi, 'young')
  }

  return out.replace(/\s+/g, ' ').trim()
}

/**
 * Build a portrait generation prompt anchored to 1 or more Subject Likeness Reference Images:
 * - `'same_person'` mode: younger/older/era-styled version of the SAME individual (`Arthur 78 -> Arthur 26` or selfie -> younger self).
 * - `'family_blend'` mode: ORIGINAL distinct relative/offspring inheriting specific traits from 1 or 2+ parent/family donors
 *   (e.g. `Claire 44: Warm 44-year-old adult daughter inheriting Arthur’s hazel eyes and Eleanor’s cheekbones`).
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

  const normalizedDonors: Array<{ characterName?: string; cleanLabel: string; gender?: string }> =
    Array.isArray(input.donors) && input.donors.length > 0
      ? input.donors.map((d, idx) => ({
          characterName: d.characterName?.trim() || undefined,
          cleanLabel:
            d.cleanLabel?.trim() || cleanLikenessDonorBaseLabel(d.characterName, idx + 1),
          gender: d.gender?.trim() || undefined,
        }))
      : [
          {
            characterName: input.donorCharacterName?.trim() || undefined,
            cleanLabel: cleanLikenessDonorBaseLabel(input.donorCharacterName, 1),
          },
        ]

  const rawNote = input.likenessTransformNote?.trim() || ''
  const rawAppearance = input.appearanceDescription?.trim() || ''
  const targetGender = inferGenderToken(
    input.targetGender,
    input.characterName,
    rawNote,
    rawAppearance
  )
  const donorGenders = normalizedDonors.map((d) =>
    inferGenderToken(d.gender, d.characterName)
  )

  const targetBaseLower = cleanLikenessDonorBaseLabel(input.characterName, 0).toLowerCase()
  const primaryDonorBaseLower = normalizedDonors[0]?.cleanLabel.toLowerCase() || ''
  const isSamePersonByBaseName = Boolean(
    normalizedDonors.length === 1 &&
      targetBaseLower &&
      primaryDonorBaseLower &&
      targetBaseLower === primaryDonorBaseLower &&
      !/^donor\s+\d+$/i.test(primaryDonorBaseLower)
  )

  const effectiveMode = resolveEffectiveLikenessRelationMode({
    explicitRelationMode: input.likenessMode,
    donorCount: normalizedDonors.length,
    isSamePersonPair: isSamePersonByBaseName,
    targetGender,
    donorGenders,
    combinedText: `${rawNote} ${rawAppearance}`.trim(),
    hasBiologicalKinshipToDonor: false,
  })
  const isFamilyBlend = effectiveMode === 'family_blend'

  const donorScrubbedNote = stripDonorAgeReferencesFromNote(
    rawNote,
    input.donorCharacterName,
    normalizedDonors,
    isFamilyBlend
  )
  const donorScrubbedAppearance = stripDonorAgeReferencesFromNote(
    rawAppearance,
    input.donorCharacterName,
    normalizedDonors,
    isFamilyBlend
  )

  const numericAge = extractNumericTargetAge(
    input.targetAge,
    input.characterName,
    donorScrubbedNote,
    donorScrubbedAppearance
  )

  const wantsCleanShaven =
    CLEAN_SHAVEN_INTENT_RE.test(rawNote) || CLEAN_SHAVEN_INTENT_RE.test(rawAppearance)
  const wantsSmileOrCustomExpression =
    SMILE_OR_EXPRESSION_INTENT_RE.test(rawNote) ||
    SMILE_OR_EXPRESSION_INTENT_RE.test(rawAppearance)
  const wantsGrayHair =
    WANTS_GRAY_OR_WHITE_HAIR_RE.test(donorScrubbedNote) ||
    WANTS_GRAY_OR_WHITE_HAIR_RE.test(donorScrubbedAppearance)
  const wantsRecedingOrBald =
    WANTS_RECEDING_OR_BALD_RE.test(donorScrubbedNote) ||
    WANTS_RECEDING_OR_BALD_RE.test(donorScrubbedAppearance)

  if (wantsSmileOrCustomExpression) {
    styleDirectives = styleDirectives.replace(
      'Expression: neutral relaxed expression, mouth closed, direct eye contact.',
      'Expression: natural, warm, authentic expression honoring the requested character demeanor/smile above, direct eye contact.'
    )
  }

  const safeNote = rawNote
    ? sanitizeReferenceTransformTextForRai(
        rawNote,
        numericAge,
        input.donorCharacterName,
        normalizedDonors,
        isFamilyBlend
      )
    : ''
  const safeAppearance = sanitizeReferenceTransformTextForRai(
    rawAppearance,
    numericAge,
    input.donorCharacterName,
    normalizedDonors,
    isFamilyBlend
  )

  const donorRefsSummary =
    normalizedDonors.length === 1
      ? 'Reference Image [1]'
      : normalizedDonors.map((_, idx) => `Reference Image [${idx + 1}]`).join(' and ')

  const ageStageClause =
    numericAge !== null && numericAge >= 14 && numericAge < 20
      ? `DE-AGING & YOUTH REJUVENATION OVERRIDE: Depict at a fresh, youthful collegiate young-adult life stage. Completely strip away all adult or senior aging markers from ${donorRefsSummary}: render smooth, taut, unlined skin, lean youthful jawline and neck, bright clear eyes with zero crow’s feet, zero forehead creases, zero nasolabial folds, zero under-eye bags, zero jowls, and full youthful hair density.`
      : numericAge !== null && numericAge >= 20 && numericAge <= 35
        ? `DE-AGING & REJUVENATION OVERRIDE: Depict strictly in young-adult prime at biological age ${numericAge}. Completely strip away any middle-aged or elderly aging markers visible in ${donorRefsSummary}: render smooth, firm, taut age-${numericAge} skin texture, a crisp youthful jawline and smooth neck with zero jowls or skin laxity, bright clear eyes with zero heavy under-eye bags, crow’s feet, deep forehead furrows, nasolabial folds, or age spots, and a full, thick youthful hairline with rich natural pigment${wantsGrayHair ? '' : ' (strictly zero silver, white, or gray hair)'}.`
        : numericAge !== null && numericAge >= 36 && numericAge <= 48
          ? `AGE TRANSFORMATION OVERRIDE: Depict strictly in prime adulthood at biological age ${numericAge}. If ${donorRefsSummary} show${normalizedDonors.length > 1 ? '' : 's'} older senior individual(s), rejuvenate skin elasticity, jawline firmness, and hair fullness/pigment to authentic age ${numericAge}, removing elderly deep wrinkles, jowls, age spots${wantsGrayHair ? '' : ', and white/silver hair'}.`
          : numericAge !== null && numericAge >= 60
            ? `AGE PROGRESSION OVERRIDE: Depict strictly at biological age ${numericAge} (senior life stage), rendering natural age-${numericAge} skin character, wisdom lines, and age-authentic hair texture/color as specified while preserving the requested genetic features from ${donorRefsSummary}.`
            : numericAge !== null
              ? `Depict strictly at biological age ${numericAge}.`
              : ''

  const cleanShavenClause = wantsCleanShaven
    ? `FACIAL HAIR OVERRIDE: Render with a completely clean-shaven, smooth jawline, chin, and upper lip — strictly zero beard, zero mustache, zero goatee, zero stubble, and zero five-o’clock shadow, completely removing any facial hair visible in ${donorRefsSummary}.`
    : ''

  const negativeTerms: string[] = []
  const needsAntiFacialHair =
    wantsCleanShaven || (isFamilyBlend && targetGender === 'female')
  if (needsAntiFacialHair) {
    negativeTerms.push(
      'beard',
      'mustache',
      'goatee',
      'stubble',
      "five o'clock shadow",
      'facial hair'
    )
  }
  if (normalizedDonors.length >= 2) {
    negativeTerms.push(
      'multiple people',
      'two people',
      'couple',
      'family group photo',
      'split screen',
      'diptych',
      'side-by-side',
      'collage',
      'picture-in-picture'
    )
  }
  if (numericAge !== null && numericAge <= 38) {
    negativeTerms.push(
      'elderly',
      'senior',
      'old man',
      'old woman',
      'aged skin',
      'deep wrinkles',
      "crow's feet",
      'forehead furrows',
      'deep nasolabial folds',
      'age spots',
      'liver spots',
      'jowls',
      'sagging skin',
      'loose neck skin',
      'heavy under-eye bags'
    )
    if (!wantsGrayHair) {
      negativeTerms.push(
        'gray hair',
        'grey hair',
        'silver hair',
        'white hair',
        'salt-and-pepper hair'
      )
    }
    if (!wantsRecedingOrBald) {
      negativeTerms.push('receding hairline', 'balding')
    }
    if (numericAge < 30) {
      negativeTerms.push('middle-aged')
    }
  } else if (numericAge !== null && numericAge >= 39 && numericAge <= 48) {
    negativeTerms.push(
      'elderly',
      'octogenarian',
      'deep elderly wrinkles',
      'liver spots',
      'heavy jowls'
    )
    if (!wantsGrayHair) {
      negativeTerms.push('pure white hair', 'snow-white hair')
    }
  }

  const lines: string[] = [anchor]

  if (isFamilyBlend) {
    const donorHeaderLabels = normalizedDonors
      .map((d, idx) =>
        d.cleanLabel && !/^Donor\s+\d+$/i.test(d.cleanLabel)
          ? `Reference Image [${idx + 1}]: ${d.cleanLabel}`
          : `Reference Image [${idx + 1}]`
      )
      .join(' + ')
    const targetLabel =
      cleanLikenessDonorBaseLabel(input.characterName, 0) || 'the target character'
    lines.push(
      '',
      `Familial Genetic Inheritance (${donorHeaderLabels}): Generate an ORIGINAL, DISTINCT individual (${targetLabel}${numericAge ? `, biological age ${numericAge}` : ''}) who is a biological relative/offspring — NOT the same person as ${donorRefsSummary}. Blend recognizable family genetics naturally across the attached donor reference photo(s) while giving the subject their own authentic, independent personal identity.`,
      '',
      `Trait Inheritance & Anti-Cloning Override (OVERRIDES ${donorRefsSummary}): Extract ONLY the specific inherited facial traits requested below (such as eye color/shape, cheekbone contour, smile geometry, and shared ancestral skin undertone) from the respective donor reference photo(s). Do NOT clone any donor photo’s exact overall face, age, elderly skin wrinkles, hairstyle, facial hair, or clothing.`
    )
    if (normalizedDonors.length >= 2) {
      lines.push(
        '',
        'SINGLE-SUBJECT PORTRAIT LOCK: Render ONLY ONE single person centered in frame (the target character alone) — strictly NO two-shot, NO parents in frame, NO split-screen, and NO side-by-side collage.'
      )
    }
    if (targetGender === 'female') {
      lines.push(
        '',
        'GENDER & FACIAL HARMONY LOCK: Subject is female (woman). Harmonize any facial traits inherited from a male donor photo into naturally feminine facial proportions, soft feminine jawline/brow balance, and completely smooth feminine skin with zero facial hair or stubble.'
      )
    } else if (targetGender === 'male') {
      lines.push(
        '',
        'GENDER & FACIAL HARMONY LOCK: Subject is male (man). Harmonize any facial traits inherited from a female donor photo into naturally masculine facial proportions and authentic male bone-structure harmony.'
      )
    }
    if (safeNote) {
      lines.push(
        '',
        `Requested Familial Trait Inheritance & Look: ${safeNote.replace(/\.*\s*$/, '')}.`
      )
    }
  } else {
    lines.push(
      '',
      'Subject Identity Anchor (Reference Image [1]): Preserve the exact underlying genetic facial identity of the person in Reference Image [1] — identical cranial and facial bone structure, eye shape, iris color, eye spacing, nose bridge and nostril contour, lip proportions, characteristic smile geometry, ear shape, skin tone, and ancestral heritage.',
      '',
      'Life-Stage, Hair & Attire Transformation (OVERRIDES Reference Image [1]): Reference Image [1] shows this individual at a DIFFERENT age, era, hairstyle, and outfit. Do NOT copy the donor photo’s age, skin wrinkles, sagging skin, hair color/hairstyle, facial hair, or clothing wherever they differ from the target character specification below.'
    )
    if (safeNote) {
      lines.push('', `Requested Transformation from Reference [1]: ${safeNote.replace(/\.*\s*$/, '')}.`)
    }
  }

  if (ageStageClause) {
    lines.push('', ageStageClause)
  }
  if (cleanShavenClause) {
    lines.push('', cleanShavenClause)
  }
  if (safeAppearance && safeAppearance.toLowerCase() !== safeNote.toLowerCase()) {
    lines.push('', `Target Character Appearance: ${safeAppearance}`)
  }

  const wardrobe = input.wardrobeDescription?.trim()
  if (wardrobe) {
    lines.push(
      '',
      `Wardrobe / Attire (OVERRIDES ${donorRefsSummary}): Do NOT copy clothing from ${donorRefsSummary}. Dress the subject in: ${wardrobe.replace(/\.*\s*$/, '')}.`
    )
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
