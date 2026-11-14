/**
 * Reference image generation, callable without an HTTP request.
 *
 * These hold the bodies that used to live inside the generate-location,
 * generate-object and character/generate-image routes. Both callers now share
 * them: the routes wrap these with session auth, and the Reference Express
 * worker calls them directly.
 *
 * Direct calls matter. Inngest's `callInternalApi` only sends `x-internal-job`,
 * a header honored solely by the `/api/internal/jobs/*` step routes, so a
 * background worker reaching a generate route over HTTP gets a 401 on every
 * item. Running in-process sidesteps auth entirely.
 */

import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadReferenceLibraryBase64Image } from '@/lib/storage/referenceLibraryStorage'
import { getCreditCost, IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import { quoteAndCharge } from '@/lib/credits/chargeQuotedGeneration'
import { englishForModel } from '@/i18n/server/requestLocale'
import {
  buildLocationBasePrompt,
  buildLocationVersionPrompt,
  ensureLocationVersionPromptIsStructural,
  type BuildLocationBasePromptOptions,
} from '@/lib/vision/locationReferencePrompts'
import { buildRelatedLocationContinuityClause } from '@/lib/vision/locationFamily'
import {
  buildCharacterIdentityReferencePrompt,
  buildLikenessGuidedIdentityPrompt,
  cleanLikenessDonorBaseLabel,
  extractWardrobeFromIdentityPrompt,
  identityAppearanceFromPrompt,
  promptHasIdentityReferenceAnchor,
  type LikenessRelationMode,
  type ResolvedLikenessDonor,
} from '@/lib/character/characterReferencePrompts'
import {
  ENHANCE_IDENTITY_ASPECT_RATIO,
  ENHANCE_IDENTITY_IMAGE_SIZE,
  ENHANCE_IDENTITY_MODEL,
  ENHANCE_IDENTITY_MODEL_TIER,
  enhanceIdentityImage,
} from '@/lib/character/enhanceIdentityImage'
import {
  OBJECT_REFERENCE_NEGATIVE_PROMPT,
  buildObjectReferenceNegativePrompt,
  withObjectReferenceInstruction,
} from '@/lib/vision/objectReferencePrompts'
import {
  buildArtStyleSpecFromValue,
  isPhotorealisticArtStyle,
} from '@/lib/artStyle/globalArtStyle'
import { getArtStyleNegativeTerms, resolveProjectArtStyle } from '@/lib/vision/artStyle'
import type { ObjectCategory } from '@/types/visionReferences'

export type ReferenceAspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16'

/** Story language already resolved by the caller, so routes keep cookie fallback. */
export type StoryLocaleContext = {
  storyLocale: string
  properNouns: readonly string[]
}

/** Carries the HTTP status the route should surface for this failure. */
export class ReferenceGenerationError extends Error {
  readonly status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ReferenceGenerationError'
    this.status = status
  }
}

export type ScreenplayContext = {
  genre?: string
  tone?: string
  setting?: string
  visualStyle?: string
}

async function resolveEffectiveArtStyle(
  explicitArtStyle?: string | null,
  projectId?: string | null
): Promise<string | undefined> {
  if (typeof explicitArtStyle === 'string' && explicitArtStyle.trim()) {
    return explicitArtStyle.trim()
  }
  const pid = projectId?.trim()
  if (!pid || pid === 'default') return undefined
  try {
    const { Project } = await import('@/models/Project')
    const project = await Project.findByPk(pid)
    if (project?.metadata) {
      return resolveProjectArtStyle(project.metadata)
    }
  } catch {
    // Optional DB lookup fallback for unit tests or standalone invocations
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

/**
 * Build an optimized prompt for location reference image generation.
 * Creates environment-only shots WITHOUT actors for production consistency.
 */
export function buildLocationPrompt(
  locationName: string,
  intExt?: string,
  timeOfDay?: string,
  description?: string,
  options?: BuildLocationBasePromptOptions
): string {
  return buildLocationBasePrompt(locationName, intExt, timeOfDay, description, options)
}

export type GenerateLocationImageInput = {
  userId: string
  projectId?: string
  locationName: string
  intExt?: string
  timeOfDay?: string
  description?: string
  aspectRatio?: ReferenceAspectRatio
  /** Pre-composed prompt from LocationPromptBuilder; overrides composition. */
  locationPrompt?: string
  /** Optional parent complex anchor for sub-areas / adjacent vaults. */
  parentLocationName?: string
  parentLocationDescription?: string
  subZoneLabel?: string
  parentReferenceImageUrl?: string
  artStyle?: string | null
  locale: StoryLocaleContext
}

export async function generateLocationReferenceImage(
  input: GenerateLocationImageInput
): Promise<{ imageUrl: string; prompt: string; creditCost: number }> {
  const {
    userId,
    projectId,
    locationName,
    intExt,
    timeOfDay,
    description,
    // Widescreen is best for location establishing shots.
    aspectRatio = '16:9',
    locationPrompt,
    parentLocationName,
    parentLocationDescription,
    subZoneLabel,
    parentReferenceImageUrl,
    locale,
  } = input

  if (!locationName) {
    throw new ReferenceGenerationError('Missing required field: locationName', 400)
  }

  const creditCost = IMAGE_CREDITS.SCENE_REFERENCE
  const hasParentReferenceImage = Boolean(parentReferenceImageUrl?.trim())
  const effectiveArtStyle = await resolveEffectiveArtStyle(input.artStyle, projectId)
  const isStylized = Boolean(effectiveArtStyle && !isPhotorealisticArtStyle(effectiveArtStyle))

  let prompt =
    locationPrompt && locationPrompt.trim()
      ? locationPrompt
      : buildLocationPrompt(locationName, intExt, timeOfDay, description, {
          parentLocationName,
          parentLocationDescription,
          subZoneLabel,
          hasParentReferenceImage,
          artStyle: effectiveArtStyle,
        })

  if (locationPrompt && locationPrompt.trim() && isStylized && effectiveArtStyle) {
    const spec = buildArtStyleSpecFromValue(effectiveArtStyle)
    if (!prompt.toLowerCase().includes(spec.title.toLowerCase())) {
      prompt = `${prompt.replace(/[.]+$/, '')}. ${spec.locationRefDirective}`
    }
  }

  if (
    locationPrompt &&
    locationPrompt.trim() &&
    parentLocationName?.trim() &&
    !prompt.toLowerCase().includes(parentLocationName.trim().toLowerCase())
  ) {
    const continuityClause = buildRelatedLocationContinuityClause({
      locationName,
      parentLocationName,
      parentLocationDescription,
      subZoneLabel,
      hasParentReferenceImage,
    })
    if (continuityClause) {
      prompt = `${prompt.replace(/[.]+$/, '')}. ${continuityClause}`
    }
  }

  // The builder fields and description are typed by the creator, so the
  // composed prompt can arrive in any language; the image model needs English.
  prompt = await englishForModel(prompt, locale.storyLocale, [
    locationName,
    ...(parentLocationName ? [parentLocationName] : []),
    ...locale.properNouns,
  ])

  const baseLocationNegatives =
    'people, persons, humans, actors, characters, figures, silhouettes, faces, crowds'
  const locationNegativePrompt =
    effectiveArtStyle && effectiveArtStyle !== 'photorealistic'
      ? `${baseLocationNegatives}, ${getArtStyleNegativeTerms(effectiveArtStyle)}`
      : baseLocationNegatives

  // negativePrompt enforces no people in location shots.
  const result = await generateImageWithGeminiStudio({
    prompt,
    aspectRatio,
    negativePrompt: locationNegativePrompt,
    ...(hasParentReferenceImage
      ? {
          referenceImages: [
            {
              imageUrl: parentReferenceImageUrl!.trim(),
              mimeType: 'image/jpeg',
              name: `${parentLocationName || locationName} parent complex location`,
            },
          ],
        }
      : {}),
  })

  if (!result.imageBase64) {
    throw new ReferenceGenerationError(
      'No image generated. Try adjusting the description.'
    )
  }

  const fileName = `scenes/location-${locationName
    .toLowerCase()
    .replace(/\s+/g, '-')}-${Date.now()}.png`
  const imageUrl = await uploadReferenceLibraryBase64Image(
    result.imageBase64,
    fileName,
    projectId || 'default'
  )

  const charged = await quoteAndCharge({
    userId,
    projectId: projectId || null,
    quoteInput: {
      kind: 'reference',
      model: result.model,
      imageCount: 1,
      floorCredits: creditCost,
    },
    meta: { label: `Location reference: ${locationName}`, model: result.model },
  })

  return { imageUrl, prompt, creditCost: charged.credits }
}

export type GenerateLocationVersionImageInput = GenerateLocationImageInput & {
  baseImageUrl: string
  stateNotes: string
  previousStateNotes?: string
  versionId?: string
  /** Object-library / scene Key Props names to strip from version bake prompts. */
  catalogPropNames?: string[]
}

export async function generateLocationVersionReferenceImage(
  input: GenerateLocationVersionImageInput
): Promise<{ imageUrl: string; prompt: string; creditCost: number }> {
  const {
    userId,
    projectId,
    locationName,
    intExt,
    timeOfDay,
    description,
    aspectRatio = '16:9',
    locationPrompt,
    locale,
    baseImageUrl,
    stateNotes,
    previousStateNotes,
    versionId,
    catalogPropNames,
  } = input

  if (!locationName) {
    throw new ReferenceGenerationError('Missing required field: locationName', 400)
  }
  if (!baseImageUrl?.trim()) {
    throw new ReferenceGenerationError(
      'A base location image is required to generate a set-state version',
      400
    )
  }
  if (!stateNotes?.trim()) {
    throw new ReferenceGenerationError('Missing required field: stateNotes', 400)
  }

  const creditCost = IMAGE_CREDITS.SCENE_REFERENCE
  const effectiveArtStyle = await resolveEffectiveArtStyle(input.artStyle, projectId)
  const isStylized = Boolean(effectiveArtStyle && !isPhotorealisticArtStyle(effectiveArtStyle))

  let prompt =
    locationPrompt && locationPrompt.trim()
      ? ensureLocationVersionPromptIsStructural(locationPrompt, catalogPropNames)
      : buildLocationVersionPrompt({
          locationName,
          stateNotes,
          previousStateNotes,
          intExt,
          timeOfDay,
          description,
          catalogPropNames,
          artStyle: effectiveArtStyle,
        })

  if (locationPrompt && locationPrompt.trim() && isStylized && effectiveArtStyle) {
    const spec = buildArtStyleSpecFromValue(effectiveArtStyle)
    if (!prompt.toLowerCase().includes(spec.title.toLowerCase())) {
      prompt = `${prompt.replace(/[.]+$/, '')}. ${spec.locationRefDirective}`
    }
  }

  prompt = await englishForModel(prompt, locale.storyLocale, [
    locationName,
    ...locale.properNouns,
  ])

  const baseVersionNegatives =
    'people, persons, humans, actors, characters, figures, silhouettes, faces, crowds, restored undamaged set, intact destroyed features'
  const versionNegativePrompt =
    effectiveArtStyle && effectiveArtStyle !== 'photorealistic'
      ? `${baseVersionNegatives}, ${getArtStyleNegativeTerms(effectiveArtStyle)}`
      : baseVersionNegatives

  const result = await generateImageWithGeminiStudio({
    prompt,
    aspectRatio,
    negativePrompt: versionNegativePrompt,
    referenceImages: [
      {
        imageUrl: baseImageUrl,
        mimeType: 'image/jpeg',
        name: `${locationName} base location`,
      },
    ],
  })

  if (!result.imageBase64) {
    throw new ReferenceGenerationError(
      'No image generated. Try adjusting the set-state notes.'
    )
  }

  const safeName = locationName.toLowerCase().replace(/\s+/g, '-')
  const versionSlug = (versionId || 'version').replace(/[^a-z0-9-]/gi, '').slice(0, 40)
  const fileName = `scenes/location-${safeName}/versions/${versionSlug}-${Date.now()}.png`
  const imageUrl = await uploadReferenceLibraryBase64Image(
    result.imageBase64,
    fileName,
    projectId || 'default'
  )

  const charged = await quoteAndCharge({
    userId,
    projectId: projectId || null,
    quoteInput: {
      kind: 'reference',
      model: result.model,
      imageCount: 1,
      floorCredits: creditCost,
    },
    meta: { label: `Location version: ${locationName}`, model: result.model },
  })

  return { imageUrl, prompt, creditCost: charged.credits }
}

// ---------------------------------------------------------------------------
// Props / objects
// ---------------------------------------------------------------------------

/** Build an optimized prompt for an isolated object reference plate. */
export function buildObjectImagePrompt(
  prompt: string,
  category: ObjectCategory = 'other',
  hasReference: boolean,
  artStyle?: string | null
): string {
  const studioModifiers = [
    'Clean studio lighting',
    'Plain neutral backdrop',
    'High resolution, sharp focus',
    'Centered composition',
  ]

  const isLiveAction = isPhotorealisticArtStyle(artStyle)

  const categoryEnhancements: Record<ObjectCategory, string[]> = {
    prop: ['Detailed texture visible', 'Subject isolation'],
    vehicle: ['3/4 angle, entire vehicle visible'],
    'set-piece': [
      isLiveAction ? 'Architectural detail photography' : 'Architectural detail reference',
      'Environmental context minimal',
    ],
    costume: ['On dress form', 'Fabric texture detailed', 'Full garment visible'],
    technology: ['Entire device visible', 'Interface visible if applicable'],
    other: ['Clear subject isolation'],
  }

  const enhancements = categoryEnhancements[category] || categoryEnhancements.other
  const body = withObjectReferenceInstruction(prompt, artStyle)
  const extras = `${enhancements.join(', ')}. ${studioModifiers.join(', ')}.`

  if (hasReference) {
    return `Create a clean, studio-quality reference image based on the provided reference image. ${body} ${extras} Remove background clutter, enhance clarity.`
  }

  return `${body} ${extras}`
}

export type GenerateObjectImageInput = {
  userId: string
  projectId?: string
  name: string
  prompt: string
  category?: ObjectCategory
  referenceImageUrl?: string
  referenceImageBase64?: string
  aspectRatio?: ReferenceAspectRatio
  artStyle?: string | null
  locale: StoryLocaleContext
}

export async function generateObjectReferenceImage(
  input: GenerateObjectImageInput
): Promise<{
  imageUrl: string
  prompt: string
  creditCost: number
  hasReferenceSource: boolean
}> {
  const {
    userId,
    projectId,
    name,
    prompt: enteredPrompt,
    category = 'other',
    referenceImageUrl,
    referenceImageBase64,
    // Square is best for reference images.
    aspectRatio = '1:1',
    locale,
  } = input

  if (!name || !enteredPrompt) {
    throw new ReferenceGenerationError(
      'Missing required fields: name and prompt',
      400
    )
  }

  let creditCost = getCreditCost('IMAGE_GENERATION')
  const effectiveArtStyle = await resolveEffectiveArtStyle(input.artStyle, projectId)

  // Typed in the creator's language; the image model needs English.
  const prompt = await englishForModel(enteredPrompt, locale.storyLocale, [
    name,
    ...locale.properNouns,
  ])

  const hasReferenceSource = Boolean(referenceImageUrl || referenceImageBase64)
  const optimizedPrompt = buildObjectImagePrompt(
    prompt,
    category,
    hasReferenceSource,
    effectiveArtStyle
  )

  const referenceImages = hasReferenceSource
    ? [
        {
          imageUrl: referenceImageUrl,
          base64Image: referenceImageBase64,
          mimeType: 'image/jpeg',
          name: `${name} reference`,
        },
      ]
    : undefined

  const result = await generateImageWithGeminiStudio({
    prompt: optimizedPrompt,
    aspectRatio,
    modelTier: 'eco',
    imageSize: '2K',
    referenceImages,
    negativePrompt: buildObjectReferenceNegativePrompt(effectiveArtStyle),
  })

  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)
  const filename = `objects/${category}/${safeName}-${Date.now()}.${
    result.mimeType === 'image/png' ? 'png' : 'jpg'
  }`
  const imageUrl = await uploadReferenceLibraryBase64Image(result.imageBase64, filename)

  // A charge failure must not discard a generated image the user can still use.
  try {
    const charged = await quoteAndCharge({
      userId,
      quoteInput: {
        kind: 'reference',
        imageCount: 1,
        floorCredits: creditCost,
      },
      meta: { label: `Object reference: ${name}` },
    })
    creditCost = charged.credits
  } catch (creditError) {
    console.error('[Key Props Generation] Credit charge failed:', creditError)
  }

  return { imageUrl, prompt: optimizedPrompt, creditCost, hasReferenceSource }
}

// ---------------------------------------------------------------------------
// Cast / character identity
// ---------------------------------------------------------------------------

export const CAST_IMAGE_CREDIT_COST = IMAGE_CREDITS.CHARACTER_IDENTITY_WITH_ENHANCE

export type GenerateCastImageInput = {
  userId: string
  prompt: string
  projectId?: string
  characterId?: string
  characterName?: string
  quality?: string
  rawMode?: boolean
  skipAutoEnhance?: boolean
  artStyle?: string | null
  /** Optional subject reference image URL (uploaded photo or another cast character's portrait). */
  likenessReferenceImageUrl?: string | null
  /** Optional multi-donor list (e.g. 2 biological parents `[Arthur, Eleanor]` for `Claire 44`). */
  likenessDonors?: Array<Partial<ResolvedLikenessDonor> & { imageUrl: string }> | null
  /** Relationship mode (`same_person` age/era shift vs `family_blend` trait inheritance). */
  likenessMode?: LikenessRelationMode | string | null
  /** Optional natural-language transformation instructions relative to donor reference image(s). */
  likenessTransformNote?: string | null
  /** Optional donor character name so older donor age numbers are scrubbed from target prompt text. */
  donorCharacterName?: string | null
  /** Optional target age/era for likeness transformation. */
  targetAge?: string | number | null
  /** Optional target gender presentation (`female` / `male`) for cross-gender parent trait harmony. */
  targetGender?: string | null
  /** Optional target attire/wardrobe so likeness prompts preserve collar/shoulder outfit. */
  wardrobeDescription?: string | null
}

/**
 * Multimodal caption attached directly above Reference Image [1] when transforming age/styling.
 * Explicitly avoids labeling the older/donor photo with the target character's name (e.g. "Arthur 26"),
 * includes "Reference Image [1]" for 1-to-1 text binding, and contains "character reference" so
 * `isIdentityReferencePartName` treats it as a reference plate without spurious face-crop warnings.
 */
export const LIKENESS_DONOR_REFERENCE_PART_CAPTION =
  'Reference Image [1] — genetic facial bone-structure donor character reference photo ONLY (depicts this individual at a different age/era; preserve underlying bone structure and eyes, do NOT copy the donor photo age, wrinkles, hair, or clothing):'

export function buildLikenessDonorReferencePartCaption(
  index1Based: number,
  mode: 'same_person' | 'family_blend',
  donorLabel?: string | null
): string {
  if (mode === 'same_person' && index1Based === 1) {
    return LIKENESS_DONOR_REFERENCE_PART_CAPTION
  }
  const cleanLabel = cleanLikenessDonorBaseLabel(donorLabel, index1Based)
  const hasNamedDonor = Boolean(
    donorLabel?.trim() && !/^Reference Donor\s+\d+$/i.test(cleanLabel) && !/^Donor\s+\d+$/i.test(cleanLabel)
  )
  const labelDisplay = hasNamedDonor ? ` (${cleanLabel})` : ''
  const attributionClause = hasNamedDonor
    ? `extract ONLY inherited familial traits attributed to ${cleanLabel}`
    : `extract ONLY inherited familial traits from Reference Image [${index1Based}]`
  return `Reference Image [${index1Based}]${labelDisplay} — biological family trait donor character reference photo ONLY (parent/relative of target character; ${attributionClause}; target is a DISTINCT individual, do NOT clone this donor's exact face, gender, age, hairstyle, or clothing):`
}

export async function generateCastReferenceImage(
  input: GenerateCastImageInput
): Promise<{
  imageUrl: string
  visionDescription: string | null
  autoEnhanced: boolean
  model: string
  creditCost: number
}> {
  const {
    userId,
    projectId,
    characterId,
    characterName,
    quality = 'auto',
    rawMode,
    skipAutoEnhance = false,
  } = input

  let finalPrompt = input.prompt?.trim() || ''
  if (!finalPrompt) {
    throw new ReferenceGenerationError('Prompt is required', 400)
  }

  const effectiveArtStyle = await resolveEffectiveArtStyle(input.artStyle, projectId)
  const isLiveAction = isPhotorealisticArtStyle(effectiveArtStyle)
  const resolvedDonors: Array<{
    imageUrl: string
    characterName?: string
    cleanLabel?: string
    gender?: string
  }> = []
  const seenDonorUrls = new Set<string>()
  if (Array.isArray(input.likenessDonors)) {
    for (const d of input.likenessDonors) {
      const url = typeof d?.imageUrl === 'string' ? d.imageUrl.trim() : ''
      if (!url || seenDonorUrls.has(url)) continue
      seenDonorUrls.add(url)
      resolvedDonors.push({
        imageUrl: url,
        characterName: d.characterName?.trim() || undefined,
        cleanLabel:
          d.cleanLabel?.trim() ||
          cleanLikenessDonorBaseLabel(d.characterName, resolvedDonors.length + 1),
        gender: d.gender?.trim() || undefined,
      })
    }
  }
  const singleLikenessUrl = input.likenessReferenceImageUrl?.trim() || ''
  if (resolvedDonors.length === 0 && singleLikenessUrl) {
    resolvedDonors.push({
      imageUrl: singleLikenessUrl,
      characterName: input.donorCharacterName?.trim() || undefined,
      cleanLabel: cleanLikenessDonorBaseLabel(input.donorCharacterName, 1),
    })
  }
  const usingLikenessRef = resolvedDonors.length > 0

  const resolvedCharacterName =
    (typeof characterName === 'string' && characterName.trim()) ||
    finalPrompt.split(/[,\n]/)[0]?.trim() ||
    'Character'

  let extraNegativeTerms: string[] = []
  let effectiveLikenessMode: 'same_person' | 'family_blend' =
    resolvedDonors.length >= 2 || input.likenessMode === 'family_blend'
      ? 'family_blend'
      : 'same_person'
  const extractedWardrobe =
    input.wardrobeDescription?.trim() || extractWardrobeFromIdentityPrompt(finalPrompt)
  if (usingLikenessRef) {
    const coreAppearance = identityAppearanceFromPrompt(finalPrompt)
    const likenessBuilt = buildLikenessGuidedIdentityPrompt({
      characterName: resolvedCharacterName,
      donorCharacterName: input.donorCharacterName || resolvedDonors[0]?.characterName,
      donors: resolvedDonors,
      likenessMode: input.likenessMode,
      targetGender: input.targetGender,
      appearanceDescription: coreAppearance,
      likenessTransformNote: input.likenessTransformNote,
      targetAge: input.targetAge,
      wardrobeDescription: extractedWardrobe,
      artStyle: effectiveArtStyle,
    })
    finalPrompt = likenessBuilt.prompt
    extraNegativeTerms = likenessBuilt.negativeTerms
    if (likenessBuilt.prompt.includes('Familial Genetic Inheritance (')) {
      effectiveLikenessMode = 'family_blend'
    }
  } else if (!rawMode && !promptHasIdentityReferenceAnchor(finalPrompt)) {
    finalPrompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription: finalPrompt,
      wardrobeDescription: extractedWardrobe,
      artStyle: effectiveArtStyle,
    })
  } else if (rawMode && !isLiveAction && effectiveArtStyle) {
    const spec = buildArtStyleSpecFromValue(effectiveArtStyle)
    if (!finalPrompt.toLowerCase().includes(spec.title.toLowerCase())) {
      finalPrompt = `${spec.title} character identity reference portrait.\n\n${finalPrompt}\n\nStyle: ${spec.characterRefDirective}`
    }
  }

  const combinedNegativeTerms = [
    ...(effectiveArtStyle && effectiveArtStyle !== 'photorealistic'
      ? [getArtStyleNegativeTerms(effectiveArtStyle)]
      : []),
    ...extraNegativeTerms,
  ].filter(Boolean)
  const combinedNegativePrompt =
    combinedNegativeTerms.length > 0 ? combinedNegativeTerms.join(', ') : undefined

  console.log(
    `[Character Image] Generating identity headshot (designer 2K, likenessRef=${usingLikenessRef}, donors=${resolvedDonors.length}, mode=${effectiveLikenessMode})...`
  )
  let draftResult: Awaited<ReturnType<typeof generateImageWithGeminiStudio>>
  try {
    draftResult = await generateImageWithGeminiStudio({
      prompt: finalPrompt,
      aspectRatio: ENHANCE_IDENTITY_ASPECT_RATIO,
      imageSize: quality === 'max' ? '4K' : ENHANCE_IDENTITY_IMAGE_SIZE,
      modelTier: ENHANCE_IDENTITY_MODEL_TIER,
      ...(usingLikenessRef
        ? {
            referenceImages: resolvedDonors.map((donor, idx) => ({
              imageUrl: donor.imageUrl,
              name: buildLikenessDonorReferencePartCaption(
                idx + 1,
                effectiveLikenessMode,
                donor.characterName || donor.cleanLabel
              ),
            })),
          }
        : {}),
      ...(combinedNegativePrompt ? { negativePrompt: combinedNegativePrompt } : {}),
    })
  } catch (genErr: unknown) {
    // If Vertex Gemini Image blocks an inline human photo paired with a very young target age,
    // extract facial bone-structure & complexion traits via Gemini Vision and generate cleanly.
    if (!usingLikenessRef) {
      throw genErr
    }
    console.warn(
      '[Character Image] Likeness reference inline call failed; falling back to vision-extracted bone-structure anchor:',
      (genErr as Error)?.message || genErr
    )
    const donorTraitSummaries: string[] = []
    try {
      const { analyzeCharacterImage } = await import('@/lib/imagen/visionAnalyzer')
      for (const donor of resolvedDonors.slice(0, 2)) {
        const traits = await analyzeCharacterImage(
          donor.imageUrl,
          donor.cleanLabel || resolvedCharacterName
        )
        if (traits?.trim()) {
          donorTraitSummaries.push(
            donor.cleanLabel ? `${donor.cleanLabel}: ${traits.slice(0, 200)}` : traits.slice(0, 220)
          )
        }
      }
    } catch {}
    const referenceTraits = donorTraitSummaries.join('; ')
    const fallbackAppearance = [
      identityAppearanceFromPrompt(input.prompt?.trim() || ''),
      input.likenessTransformNote?.trim()
        ? `Transformation target: ${input.likenessTransformNote.trim()}.`
        : '',
      referenceTraits
        ? effectiveLikenessMode === 'family_blend'
          ? `Inherited family genetics from donor reference(s) (${referenceTraits}), blended into a distinct individual strictly at the target age, hair, and attire specification above.`
          : `Underlying genetic bone structure, eye color, and complexion matching donor reference (${referenceTraits}), adjusted strictly to the target age, smooth age-accurate skin, hair, and clean-shaven/facial-hair specification above.`
        : '',
    ]
      .filter(Boolean)
      .join(' ')
    const fallbackPrompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription: fallbackAppearance,
      wardrobeDescription: extractedWardrobe,
      artStyle: effectiveArtStyle,
    })
    draftResult = await generateImageWithGeminiStudio({
      prompt: fallbackPrompt,
      aspectRatio: ENHANCE_IDENTITY_ASPECT_RATIO,
      imageSize: quality === 'max' ? '4K' : ENHANCE_IDENTITY_IMAGE_SIZE,
      modelTier: ENHANCE_IDENTITY_MODEL_TIER,
      ...(combinedNegativePrompt ? { negativePrompt: combinedNegativePrompt } : {}),
    })
  }

  const draftBase64 = `data:${draftResult.mimeType};base64,${draftResult.imageBase64}`
  const draftImageUrl = await uploadReferenceLibraryBase64Image(
    draftBase64,
    `characters/char-draft-${Date.now()}.png`,
    projectId || 'default'
  )

  let imageUrl = draftImageUrl
  let visionDescription: string | null = null
  let autoEnhanced = false

  // Skip the description-override 2nd pass when `usingLikenessRef` is true: Step 1 already rendered
  // a 2K/4K studio headshot directly from the reference photo, and `identitySource: 'description'`
  // tells Gemini "the photo is only the starting composition", washing out facial likeness.
  if (!skipAutoEnhance && isLiveAction && !usingLikenessRef) {
    console.log('[Character Image] Auto-enhancing identity reference...')
    const enhanced = await enhanceIdentityImage({
      sourceImageUrl: draftImageUrl,
      characterName: resolvedCharacterName,
      appearanceDescription: identityAppearanceFromPrompt(finalPrompt),
      characterId,
      projectId,
      iterationCount: 0,
      skipIterationGuard: true,
      skipPreAnalysis: true,
      identitySource: 'description',
      artStyle: effectiveArtStyle,
    })
    imageUrl = enhanced.enhancedImageUrl
    visionDescription = enhanced.visionDescription
    autoEnhanced = true
  }

  if (!visionDescription) {
    try {
      const { analyzeCharacterImage } = await import('@/lib/imagen/visionAnalyzer')
      visionDescription = await analyzeCharacterImage(imageUrl, resolvedCharacterName)
    } catch (error) {
      console.error('[Character Image] Vision analysis failed:', error)
    }
  }

  let chargedCredits = CAST_IMAGE_CREDIT_COST
  try {
    const charged = await quoteAndCharge({
      userId,
      projectId: projectId || null,
      quoteInput: {
        kind: 'reference',
        model: ENHANCE_IDENTITY_MODEL,
        resolution: quality === 'max' ? '4k' : '1080p',
        imageCount: 1,
        floorCredits: CAST_IMAGE_CREDIT_COST,
      },
      meta: {
        label: 'character_identity_with_enhance',
        characterId,
        model: ENHANCE_IDENTITY_MODEL,
        autoEnhanced,
      },
    })
    chargedCredits = charged.credits
  } catch (chargeError: unknown) {
    console.error('[Character Image] Failed to charge credits:', chargeError)
  }

  return {
    imageUrl,
    visionDescription,
    autoEnhanced,
    model: ENHANCE_IDENTITY_MODEL,
    creditCost: chargedCredits,
  }
}
