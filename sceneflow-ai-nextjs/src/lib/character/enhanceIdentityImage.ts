/**
 * Shared identity reference enhancement — used by enhance-reference API and auto-enhance on generate-image.
 */

import { generateImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { uploadReferenceLibraryBase64Image } from '@/lib/storage/referenceLibraryStorage'
import { analyzeCharacterImage } from '@/lib/imagen/visionAnalyzer'
import { generateWithVision } from '@/lib/vertexai/gemini'
import {
  buildEnhanceIdentityReferencePrompt,
  resolveDefaultWardrobeDescription,
  type EnhanceIdentitySource,
  type SelfieEnhanceOptions,
} from '@/lib/character/characterReferencePrompts'
import { isPhotorealisticArtStyle } from '@/lib/artStyle/globalArtStyle'
import { getArtStyleNegativeTerms, resolveProjectArtStyle } from '@/lib/vision/artStyle'

export const ENHANCE_IDENTITY_ASPECT_RATIO = '9:16' as const
export const ENHANCE_IDENTITY_IMAGE_SIZE = '2K' as const
export const ENHANCE_IDENTITY_MODEL_TIER = 'designer' as const
export const ENHANCE_IDENTITY_MODEL = 'gemini-3-pro-image'

interface ImageAnalysis {
  hasFace: boolean
  faceCount: number
  isAlreadyOptimized: boolean
  optimizationScore: number
  issues: string[]
  suggestions: string[]
  demographicAnchor: string
  physicalTraits: string[]
}

export interface EnhanceIdentityImageInput {
  sourceImageUrl?: string
  /** Inline `data:image/...;base64,...` capture (e.g. pre-save Selfie Studio preview). */
  sourceImageDataUrl?: string
  characterName: string
  appearanceDescription?: string
  wardrobeDescription?: string | null
  characterId?: string
  projectId?: string
  iterationCount?: number
  /** Skip max-iteration and already-optimized checks (auto-enhance on first generation). */
  skipIterationGuard?: boolean
  /** Skip pre-analysis vision call for faster auto-enhance. */
  skipPreAnalysis?: boolean
  /**
   * description: a generated draft. The written body description wins.
   * photo: a picture the user supplied. Keep that person.
   */
  identitySource?: EnhanceIdentitySource
  artStyle?: string | null
  selfieOptions?: SelfieEnhanceOptions
}

export function parseImageDataUrl(
  dataUrl?: string | null
): { base64: string; mimeType: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const match = dataUrl
    .trim()
    .match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) return null
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s+/g, ''),
  }
}

export interface EnhanceIdentityImageResult {
  enhancedImageUrl: string
  visionDescription: string | null
  iterationCount: number
  model: string
  qualityFeedback?: {
    originalScore: number
    issuesFixed: string[]
    improvements: string[]
  }
}

export class EnhanceIdentityError extends Error {
  code: string
  analysis?: { score: number; suggestions: string[] }

  constructor(message: string, code: string, analysis?: { score: number; suggestions: string[] }) {
    super(message)
    this.name = 'EnhanceIdentityError'
    this.code = code
    this.analysis = analysis
  }
}

function buildSubjectDescription(
  characterName: string,
  demographicAnchor: string,
  physicalTraits: string[]
): string {
  const parts: string[] = [characterName, 'the exact person shown in this reference photo']
  if (demographicAnchor) parts.push(demographicAnchor)
  if (physicalTraits?.length > 0) {
    parts.push(`with ${physicalTraits.slice(0, 3).join(', ')}`)
  }
  return parts.join(', ')
}

function getDefaultAnalysis(existingDescription?: string): ImageAnalysis {
  return {
    hasFace: true,
    faceCount: 1,
    isAlreadyOptimized: false,
    optimizationScore: 50,
    issues: ['Unable to analyze — proceeding with standard enhancement'],
    suggestions: ['Ensure image has clear face visibility'],
    demographicAnchor: existingDescription?.split('.')[0] || 'a person',
    physicalTraits: [],
  }
}

export function getImprovementsSummary(
  analysis: ImageAnalysis,
  selfieOptions?: SelfieEnhanceOptions
): string[] {
  const improvements: string[] = []

  if (selfieOptions) {
    if (selfieOptions.framingPreset === 'close_portrait') {
      improvements.push('Reframed to tight 9:16 casting headshot')
    } else if (selfieOptions.framingPreset === 'upper_torso') {
      improvements.push('Reframed to 9:16 upper-torso portrait')
    } else if (selfieOptions.framingPreset !== 'preserve_crop') {
      improvements.push('Reframed to 9:16 head-and-shoulders casting plate')
    }

    if (selfieOptions.backdropMode === 'warm_studio') {
      improvements.push('Applied warm editorial studio backdrop')
    } else if (selfieOptions.backdropMode === 'soft_blur_original') {
      improvements.push('Cleaned background into soft portrait bokeh')
    } else {
      improvements.push('Replaced room background with neutral gray studio backdrop')
    }

    if (selfieOptions.lightingMode === 'natural_daylight') {
      improvements.push('Balanced with soft directional daylight illumination')
    } else if (selfieOptions.lightingMode !== 'preserve_original') {
      improvements.push('Normalized studio lighting and removed screen color cast')
    }

    if (selfieOptions.fixLensDistortion !== false) {
      improvements.push('Corrected wide-angle webcam distortion to 85mm portrait look')
    }
    if (selfieOptions.fixEyeContact !== false) {
      improvements.push('Aligned eye contact naturally to the camera lens')
    }
    if (selfieOptions.fixRedEye) {
      improvements.push('Removed red-eye and cleared tired/bloodshot eye redness')
    }
    if (selfieOptions.groomHairAndBeard) {
      improvements.push('Groomed hair, flyaways, brows & facial hair while retaining natural style')
    }
    if (selfieOptions.skinComplexionMode === 'studio_makeup_retouch') {
      improvements.push('Applied camera-ready studio makeup & complexion retouch (pores preserved)')
    } else if (selfieOptions.skinComplexionMode === 'camera_ready_polish') {
      improvements.push('Cleared temporary blemishes, under-eye fatigue & monitor shine')
    }
    if (selfieOptions.harmonizeSymmetry) {
      improvements.push('Balanced webcam squint, posture cant & subtle facial symmetry')
    }
    return improvements
  }

  if (analysis.issues.includes('lighting') || analysis.optimizationScore < 80) {
    improvements.push('Optimized lighting for even, professional illumination')
  }
  if (analysis.issues.some((i) => i.toLowerCase().includes('background'))) {
    improvements.push('Replaced background with neutral gray studio backdrop')
  }
  if (analysis.issues.some((i) => i.toLowerCase().includes('pose') || i.toLowerCase().includes('angle'))) {
    improvements.push('Adjusted to front-facing professional pose')
  }
  if (analysis.issues.some((i) => i.toLowerCase().includes('expression'))) {
    improvements.push('Normalized to calm, neutral expression')
  }
  if (analysis.issues.some((i) => i.toLowerCase().includes('framing'))) {
    improvements.push('Reframed to head-and-shoulders composition')
  }

  if (improvements.length === 0) {
    improvements.push('Enhanced to professional headshot standards')
    improvements.push('Optimized for consistent reference use')
  }

  return improvements
}

async function analyzeSourceImage(
  source: { imageUrl?: string; inlineImage?: { base64: string; mimeType: string } | null },
  characterName: string,
  existingDescription?: string
): Promise<ImageAnalysis> {
  try {
    let base64: string
    let mimeType: string

    if (source.inlineImage) {
      base64 = source.inlineImage.base64
      mimeType = source.inlineImage.mimeType
    } else if (source.imageUrl) {
      const response = await fetch(source.imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      base64 = Buffer.from(arrayBuffer).toString('base64')
      mimeType =
        source.imageUrl.includes('.jpg') || source.imageUrl.includes('.jpeg')
          ? 'image/jpeg'
          : 'image/png'
    } else {
      return getDefaultAnalysis(existingDescription)
    }

    const analysisPrompt = `Analyze this image for use as a professional character reference in film/video production.

Evaluate and respond in JSON format with these exact fields:
{
  "hasFace": boolean (is there a visible human face?),
  "faceCount": number (how many faces are visible?),
  "optimizationScore": number 0-100 (how suitable is this as a professional headshot reference?),
  "issues": ["issue1", "issue2"] (problems that reduce reference quality, including transient grooming/camera issues like messy bedhead/flyaways, unkempt beard, red-eye/bloodshot eyes, temporary blemishes/shine, or squint/head tilt),
  "suggestions": ["suggestion1", "suggestion2"] (how to improve the image),
  "demographicAnchor": "string" (e.g., "African American man in his late 40s with salt-and-pepper beard"),
  "physicalTraits": ["trait1", "trait2"] (ONLY permanent anatomical identity traits to preserve: bone structure, eye color/shape, nose, hairline, permanent moles/freckles/scars — do NOT list transient un-groomed hair, red-eye, or temporary skin blemishes here)
}

Scoring criteria (100 = perfect professional headshot):
- Deduct 20 points: Poor/uneven lighting
- Deduct 15 points: Non-neutral background (not solid gray/white)
- Deduct 15 points: Not front-facing or angled pose
- Deduct 10 points: Extreme expression (not neutral/calm)
- Deduct 10 points: Not head-and-shoulders framing
- Deduct 10 points: Low resolution or blur
- Deduct 5 points: Distracting elements (busy clothing, accessories)

Respond ONLY with valid JSON, no other text.`

    const result = await generateWithVision(
      [
        { text: analysisPrompt },
        { inlineData: { data: base64, mimeType } },
      ],
      { model: 'gemini-2.5-flash', temperature: 0.1 }
    )

    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return getDefaultAnalysis(existingDescription)
    }

    const analysis = JSON.parse(jsonMatch[0]) as ImageAnalysis
    analysis.isAlreadyOptimized = analysis.optimizationScore >= 85
    return analysis
  } catch (error) {
    console.error('[Enhance Identity] Image analysis failed:', error)
    return getDefaultAnalysis(existingDescription)
  }
}

/** Enhance a character identity reference into a photoreal 9:16 headshot (reference-anchored). */
export async function enhanceIdentityImage(
  input: EnhanceIdentityImageInput
): Promise<EnhanceIdentityImageResult> {
  const {
    sourceImageUrl,
    sourceImageDataUrl,
    characterName,
    appearanceDescription,
    wardrobeDescription,
    characterId,
    projectId,
    iterationCount = 0,
    skipIterationGuard = false,
    skipPreAnalysis = false,
    identitySource = 'photo',
    selfieOptions,
  } = input

  const inlineImage = parseImageDataUrl(sourceImageDataUrl)
  if (!inlineImage && !sourceImageUrl) {
    throw new EnhanceIdentityError(
      'A source image URL or captured image data URL is required.',
      'MISSING_SOURCE_IMAGE'
    )
  }

  if (!skipIterationGuard && iterationCount >= 3) {
    throw new EnhanceIdentityError(
      'Maximum enhancement iterations reached. Please capture or upload a new source image.',
      'MAX_ITERATIONS_REACHED'
    )
  }

  const appearance =
    appearanceDescription?.trim() ||
    `${characterName}, professional casting headshot subject.`

  const wardrobe =
    wardrobeDescription?.trim() ||
    undefined

  const imageAnalysis = skipPreAnalysis
    ? getDefaultAnalysis(appearance)
    : await analyzeSourceImage(
        { imageUrl: sourceImageUrl, inlineImage },
        characterName,
        appearance
      )

  if (
    !skipIterationGuard &&
    !selfieOptions &&
    imageAnalysis.isAlreadyOptimized &&
    iterationCount >= 1
  ) {
    throw new EnhanceIdentityError(
      'This image is already well-optimized for reference use. For better results, try uploading a different source image with more natural lighting or pose variation.',
      'ALREADY_OPTIMIZED',
      {
        score: imageAnalysis.optimizationScore,
        suggestions: ['Upload a new source image for fresh enhancement'],
      }
    )
  }

  const subjectDescription =
    identitySource === 'description'
      ? undefined
      : buildSubjectDescription(
          characterName,
          imageAnalysis.demographicAnchor,
          imageAnalysis.physicalTraits
        )

  let effectiveArtStyle = input.artStyle?.trim() || undefined
  if (!effectiveArtStyle && projectId && projectId !== 'default') {
    try {
      const { Project } = await import('@/models/Project')
      const project = await Project.findByPk(projectId)
      if (project?.metadata) {
        effectiveArtStyle = resolveProjectArtStyle(project.metadata)
      }
    } catch {
      // Optional DB lookup fallback
    }
  }

  const enhancementPrompt = buildEnhanceIdentityReferencePrompt({
    characterName,
    appearanceDescription: appearance,
    wardrobeDescription: wardrobe,
    subjectDescription,
    identitySource,
    artStyle: effectiveArtStyle,
    selfieOptions,
  })

  const isLiveAction = isPhotorealisticArtStyle(effectiveArtStyle)
  const result = await generateImageWithGeminiStudio({
    prompt: enhancementPrompt,
    aspectRatio: ENHANCE_IDENTITY_ASPECT_RATIO,
    imageSize: ENHANCE_IDENTITY_IMAGE_SIZE,
    modelTier: ENHANCE_IDENTITY_MODEL_TIER,
    ...(effectiveArtStyle && !isLiveAction
      ? { negativePrompt: getArtStyleNegativeTerms(effectiveArtStyle) }
      : {}),
    referenceImages: [
      inlineImage
        ? {
            base64Image: inlineImage.base64,
            mimeType: inlineImage.mimeType,
            name: characterName,
          }
        : {
            imageUrl: sourceImageUrl!,
            name: characterName,
          },
    ],
  })

  const base64Image = `data:${result.mimeType};base64,${result.imageBase64}`
  const enhancedImageUrl = await uploadReferenceLibraryBase64Image(
    base64Image,
    `characters/enhanced-${characterId || 'char'}-${Date.now()}.png`,
    projectId || 'default'
  )

  let visionDescription: string | null = null
  try {
    visionDescription = await analyzeCharacterImage(enhancedImageUrl, characterName)
  } catch (error) {
    console.error('[Enhance Identity] Vision analysis failed:', error)
  }

  return {
    enhancedImageUrl,
    visionDescription,
    iterationCount: iterationCount + 1,
    model: ENHANCE_IDENTITY_MODEL,
    qualityFeedback: {
      originalScore: imageAnalysis.optimizationScore,
      issuesFixed: imageAnalysis.issues,
      improvements: getImprovementsSummary(imageAnalysis, selfieOptions),
    },
  }
}

/** Resolve wardrobe text from a character record for enhance/generate flows. */
export function resolveWardrobeForEnhance(character: Record<string, unknown>): string | undefined {
  return resolveDefaultWardrobeDescription(character as Parameters<typeof resolveDefaultWardrobeDescription>[0])
}
