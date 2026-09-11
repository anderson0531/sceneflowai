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
import { CreditService } from '@/services/CreditService'
import { englishForModel } from '@/i18n/server/requestLocale'
import { LOCATION_TURNAROUND_GENERATION_INSTRUCTION } from '@/lib/vision/locationReferencePrompts'
import {
  buildCharacterIdentityReferencePrompt,
  promptHasIdentityReferenceAnchor,
} from '@/lib/character/characterReferencePrompts'
import {
  ENHANCE_IDENTITY_ASPECT_RATIO,
  ENHANCE_IDENTITY_IMAGE_SIZE,
  ENHANCE_IDENTITY_MODEL,
  ENHANCE_IDENTITY_MODEL_TIER,
  enhanceIdentityImage,
} from '@/lib/character/enhanceIdentityImage'
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
  description?: string
): string {
  const parts: string[] = []

  if (description) {
    parts.push(description)
  } else {
    parts.push(`${locationName} setting`)
  }

  if (intExt) {
    const mapping: Record<string, string> = {
      'INT': 'Interior scene',
      'EXT': 'Exterior scene',
      'INT/EXT': 'Interior/Exterior transitional scene',
      'EXT/INT': 'Exterior/Interior transitional scene',
    }
    parts.push(mapping[intExt] || '')
  }

  if (timeOfDay) {
    const lightingMap: Record<string, string> = {
      'DAY': 'Natural daylight, bright ambient lighting',
      'NIGHT': 'Nighttime atmosphere, artificial interior lighting or moonlight',
      'MORNING': 'Early morning light, soft golden hour tones',
      'EVENING': 'Evening atmosphere, warm golden lighting',
      'SUNSET': 'Dramatic sunset lighting with warm orange and pink tones',
      'SUNRISE': 'Sunrise atmosphere, soft warm golden light breaking through',
      'DUSK': 'Twilight atmosphere, cool blue-purple tones with fading light',
      'DAWN': 'Pre-dawn atmosphere, soft cool light with hint of warmth',
    }
    const lighting = lightingMap[timeOfDay.toUpperCase()]
    if (lighting) parts.push(lighting)
  }

  parts.push(
    LOCATION_TURNAROUND_GENERATION_INSTRUCTION,
    'Cinematic production design, professional film set quality',
    'High resolution, sharp focus, detailed textures',
    'Film production location reference photograph for visual consistency across scenes'
  )

  return parts.filter(Boolean).join('. ') + '.'
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
    locale,
  } = input

  if (!locationName) {
    throw new ReferenceGenerationError('Missing required field: locationName', 400)
  }

  const creditCost = getCreditCost('IMAGE_GENERATION')

  let prompt =
    locationPrompt && locationPrompt.trim()
      ? locationPrompt
      : buildLocationPrompt(locationName, intExt, timeOfDay, description)

  // The builder fields and description are typed by the creator, so the
  // composed prompt can arrive in any language; the image model needs English.
  prompt = await englishForModel(prompt, locale.storyLocale, [
    locationName,
    ...locale.properNouns,
  ])

  // negativePrompt enforces no people in location shots.
  const result = await generateImageWithGeminiStudio({
    prompt,
    aspectRatio,
    negativePrompt:
      'people, persons, humans, actors, characters, figures, silhouettes, faces, crowds',
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

  await CreditService.charge(userId, creditCost, 'ai_usage', null, {
    provider: 'gemini',
    category: 'images',
    operation: `Location reference: ${locationName}`,
  })

  return { imageUrl, prompt, creditCost }
}

// ---------------------------------------------------------------------------
// Props / objects
// ---------------------------------------------------------------------------

/** Build an optimized prompt for clean reference image generation. */
export function buildObjectImagePrompt(
  prompt: string,
  category: ObjectCategory = 'other',
  hasReference: boolean
): string {
  const studioModifiers = [
    'Professional product photography',
    'Clean studio lighting with soft shadows',
    'High resolution, sharp focus',
    'Centered composition',
    '8K quality, production reference image',
  ]

  const categoryEnhancements: Record<ObjectCategory, string[]> = {
    'prop': ['Hero prop presentation', 'Detailed texture visible', 'Museum quality display'],
    'vehicle': ['3/4 angle automotive photography', 'Dramatic studio lighting', 'Showroom quality'],
    'set-piece': ['Architectural detail photography', 'Environmental context minimal', 'Scale reference implied'],
    'costume': ['Fashion photography on form', 'Fabric texture detailed', 'Full garment visible'],
    'technology': ['Tech product showcase', 'Sleek modern presentation', 'Interface visible if applicable'],
    'other': ['Professional reference photography', 'Clear subject isolation', 'Production quality'],
  }

  const enhancements = categoryEnhancements[category] || categoryEnhancements.other

  // With a reference image, focus on extracting/enhancing rather than creating.
  if (hasReference) {
    return `Create a clean, studio-quality reference image based on the provided reference photo. ${prompt}. ${enhancements.join(', ')}. ${studioModifiers.join(', ')}. Remove background clutter, enhance clarity, professional product shot quality.`
  }

  return `${prompt}. ${enhancements.join(', ')}. ${studioModifiers.join(', ')}.`
}

export type GenerateObjectImageInput = {
  userId: string
  name: string
  prompt: string
  category?: ObjectCategory
  referenceImageUrl?: string
  referenceImageBase64?: string
  aspectRatio?: ReferenceAspectRatio
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

  const creditCost = getCreditCost('IMAGE_GENERATION')

  // Typed in the creator's language; the image model needs English.
  const prompt = await englishForModel(enteredPrompt, locale.storyLocale, [
    name,
    ...locale.properNouns,
  ])

  const hasReferenceSource = Boolean(referenceImageUrl || referenceImageBase64)
  const optimizedPrompt = buildObjectImagePrompt(prompt, category, hasReferenceSource)

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
    // A prop sheet is a lit object on a clean background — the thing pro buys
    // over flash is facial likeness, which no object needs. Left unset, Vertex
    // defaults to `designer`, so a scene's worth of props was generating on pro
    // at four times the latency for no visible gain. `eco` caps at 2K, which is
    // the size already requested here. When the user attached a photo of the
    // real object, `escalateEcoRefusalToPro` still buys one pro attempt if
    // flash refuses the frame, so the cheap tier cannot cost the image.
    modelTier: 'eco',
    imageSize: '2K',
    referenceImages,
  })

  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)
  const filename = `objects/${category}/${safeName}-${Date.now()}.${
    result.mimeType === 'image/png' ? 'png' : 'jpg'
  }`
  const imageUrl = await uploadReferenceLibraryBase64Image(result.imageBase64, filename)

  // A charge failure must not discard a generated image the user can still use.
  try {
    await CreditService.charge(userId, creditCost, 'ai_usage', null, {
      provider: 'gemini',
      category: 'images',
      operation: `Object reference: ${name}`,
    })
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

  if (!rawMode && !promptHasIdentityReferenceAnchor(finalPrompt)) {
    finalPrompt = buildCharacterIdentityReferencePrompt({
      appearanceDescription: finalPrompt,
    })
  }

  const resolvedCharacterName =
    (typeof characterName === 'string' && characterName.trim()) ||
    finalPrompt.split(/[,\n]/)[0]?.trim() ||
    'Character'

  console.log('[Character Image] Generating identity headshot (designer 2K)...')
  const draftResult = await generateImageWithGeminiStudio({
    prompt: finalPrompt,
    aspectRatio: ENHANCE_IDENTITY_ASPECT_RATIO,
    imageSize: quality === 'max' ? '4K' : ENHANCE_IDENTITY_IMAGE_SIZE,
    modelTier: ENHANCE_IDENTITY_MODEL_TIER,
  })

  const draftBase64 = `data:${draftResult.mimeType};base64,${draftResult.imageBase64}`
  const draftImageUrl = await uploadReferenceLibraryBase64Image(
    draftBase64,
    `characters/char-draft-${Date.now()}.png`,
    projectId || 'default'
  )

  let imageUrl = draftImageUrl
  let visionDescription: string | null = null
  let autoEnhanced = false

  if (!skipAutoEnhance) {
    console.log('[Character Image] Auto-enhancing identity reference...')
    const enhanced = await enhanceIdentityImage({
      sourceImageUrl: draftImageUrl,
      characterName: resolvedCharacterName,
      appearanceDescription: finalPrompt,
      characterId,
      projectId,
      iterationCount: 0,
      skipIterationGuard: true,
      skipPreAnalysis: true,
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

  try {
    await CreditService.charge(userId, CAST_IMAGE_CREDIT_COST, 'ai_usage', projectId || null, {
      operation: 'character_identity_with_enhance',
      characterId,
      model: ENHANCE_IDENTITY_MODEL,
      autoEnhanced,
    })
  } catch (chargeError: unknown) {
    console.error('[Character Image] Failed to charge credits:', chargeError)
  }

  return {
    imageUrl,
    visionDescription,
    autoEnhanced,
    model: ENHANCE_IDENTITY_MODEL,
    creditCost: CAST_IMAGE_CREDIT_COST,
  }
}
