/**
 * Prompt builders for character identity reference images (Pre-Vis / scene generation).
 */

import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'

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

/**
 * Resolve the best drawn baseline or preceding wardrobe reference for a wardrobe transition.
 * - For a scene-specific or non-default wardrobe, prefers the closest preceding drawn wardrobe
 *   in scene order, falling back to the character's default/first drawn wardrobe.
 * - When regenerating a single existing wardrobe with newly added scene appearance notes,
 *   anchors to its own existing fullBodyUrl so the underlying garment stays consistent.
 */
export function resolveAnchorWardrobeForTransition(
  wardrobes: ReadonlyArray<WardrobeTransitionCandidate> | null | undefined,
  targetWardrobe: WardrobeTransitionCandidate | null | undefined
): ResolvedAnchorWardrobe | undefined {
  if (!Array.isArray(wardrobes) || wardrobes.length === 0 || !targetWardrobe) {
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
      (targetId ? w.id !== targetId : idx !== targetIndex) && Boolean(getDrawnWardrobeFullBodyUrl(w))
  )

  if (otherDrawn.length > 0) {
    // 1. If target is tied to specific scene numbers, pick the closest preceding drawn wardrobe by scene number
    if (minTargetScene !== undefined) {
      let bestPreceding: WardrobeTransitionCandidate | undefined
      let bestMaxScene = -Infinity
      for (const candidate of otherDrawn) {
        const candidateScenes = Array.isArray(candidate.sceneNumbers)
          ? candidate.sceneNumbers.filter((n) => typeof n === 'number' && Number.isFinite(n) && n <= minTargetScene)
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
    // pick the immediately preceding drawn wardrobe
    if (!targetWardrobe.isDefault && targetIndex > 0) {
      for (let i = targetIndex - 1; i >= 0; i--) {
        const candidate = wardrobes[i]
        const url = getDrawnWardrobeFullBodyUrl(candidate)
        if (url) {
          return {
            baseWardrobeUrl: url,
            baseWardrobeName: candidate.name?.trim() || undefined,
            baseWardrobeDescription: formatAnchorWardrobeText(candidate),
          }
        }
      }
    }

    // 3. Fall back to the default or first drawn wardrobe (when target itself is not default)
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

  // 4. Same wardrobe being updated with scene continuity / appearance notes: anchor to its own drawn fullBodyUrl
  const selfUrl = getDrawnWardrobeFullBodyUrl(targetWardrobe)
  if (selfUrl && targetWardrobe.appearanceNotes?.trim()) {
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
