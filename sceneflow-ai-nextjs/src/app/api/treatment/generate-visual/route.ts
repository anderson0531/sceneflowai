import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Op } from 'sequelize'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { generateImageWithGemini, type ReferenceImage } from '@/lib/gemini/imageClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { englishForModel, resolveRequestStoryLocale } from '@/i18n/server/requestLocale'
import { DEFAULT_PROMPT_TEMPLATES, TREATMENT_VISUAL_CREDITS } from '@/types/treatment-visuals'
import type { TreatmentMood, TreatmentVisuals, GeneratedImage, CharacterPortrait, ActAnchor } from '@/types/treatment-visuals'
import type { FilmTreatmentData } from '@/lib/types/reports'
import { blueprintAspectRatioToImageApi, resolveVariantArtStyle } from '@/lib/treatment/blueprintFoundation'
import { getArtStylePromptSuffix } from '@/lib/vision/artStyle'
import { classifyAiError } from '@/lib/errors/aiErrorClassification'
import {
  deriveHeroPromptPreset,
  buildHeroImagePrompt,
  resolveHeroContinuityReferences,
  type PosterShotTypeId,
  type HeroPromptCharacterInput,
  type HeroPromptSceneRefInput,
  type HeroPromptObjectRefInput,
} from '@/lib/treatment/heroImagePrompts'
import type { SharedContinuitySource } from '@/lib/blueprint/blueprintContinuity'

export const runtime = 'nodejs'
export const maxDuration = 300

interface VisualFailure {
  visual: string
  code: string
  message: string
}

interface GenerateVisualRequest {
  projectId: string
  treatment: FilmTreatmentData
  generateAll?: boolean
  visualType?: 'hero' | 'character' | 'act' | 'keyProp'
  visualId?: string | number
  mood?: TreatmentMood
  posterType?: PosterShotTypeId
  customPrompt?: string
  negativePrompt?: string
  artStyle?: string
  characters?: HeroPromptCharacterInput[]
  sceneReferences?: HeroPromptSceneRefInput[]
  objectReferences?: HeroPromptObjectRefInput[]
  referenceImages?: ReferenceImage[]
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Load Project + Series Continuity Library references from the database when available.
 * Non-fatal if project/series is not yet saved or DB is unreachable in tests.
 */
async function loadServerContinuitySource(
  projectId: string,
  treatment: FilmTreatmentData
): Promise<SharedContinuitySource | null> {
  if (!projectId || !UUID_REGEX.test(projectId)) return null

  try {
    await import('@/models')
    const { Project } = await import('@/models/Project')
    const { Series } = await import('@/models/Series')
    const { ReferenceAsset } = await import('@/models/ReferenceAsset')
    const { ReferenceAssetLink } = await import('@/models/ReferenceAssetLink')

    const project = await Project.findByPk(projectId)
    if (!project) return null

    const metadata = (project.metadata || {}) as Record<string, any>
    const visionPhase = (metadata.visionPhase || {}) as Record<string, any>
    const visionRefs = (visionPhase.references || {}) as Record<string, any>

    const visionCharacters: Array<Record<string, any>> = Array.isArray(visionPhase.characters)
      ? [...visionPhase.characters]
      : []
    const visionLocations: Array<Record<string, any>> = [
      ...(Array.isArray(visionRefs.locationReferences) ? visionRefs.locationReferences : []),
      ...(Array.isArray(visionRefs.sceneReferences) ? visionRefs.sceneReferences : []),
    ]
    const visionProps: Array<Record<string, any>> = Array.isArray(visionRefs.objectReferences)
      ? [...visionRefs.objectReferences]
      : []

    const seriesId =
      (project as any).series_id ||
      metadata.seriesId ||
      (treatment as any)?.seriesId ||
      null

    let seriesTitle: string | null = metadata.seriesTitle || null
    let bibleCharacters: Array<Record<string, any>> = []
    let bibleLocations: Array<Record<string, any>> = []
    let bibleProps: Array<Record<string, any>> = []

    if (seriesId && UUID_REGEX.test(String(seriesId))) {
      const series = await Series.findByPk(String(seriesId)).catch(() => null)
      if (series) {
        seriesTitle = series.title || seriesTitle
        const bible = ((series as any).production_bible ||
          (series as any).metadata?.productionBible ||
          {}) as Record<string, any>
        if (Array.isArray(bible.characters)) bibleCharacters = bible.characters
        if (Array.isArray(bible.locations)) bibleLocations = bible.locations
        if (Array.isArray(bible.props)) bibleProps = bible.props
      }
    }

    // Also load linked ReferenceAsset rows for this project or series
    try {
      const linkOr: Array<Record<string, any>> = [{ project_id: projectId }]
      if (seriesId && UUID_REGEX.test(String(seriesId))) {
        linkOr.push({ series_id: String(seriesId) })
      }
      const links = await ReferenceAssetLink.findAll({
        where: { [Op.or]: linkOr },
      }).catch(() => [])
      const assetIds = [...new Set(links.map((l: any) => l.asset_id).filter(Boolean))]
      if (assetIds.length > 0) {
        const assets = await ReferenceAsset.findAll({
          where: { id: assetIds, archived_at: null },
        }).catch(() => [])
        for (const asset of assets) {
          const item = {
            id: asset.id,
            name: asset.name,
            description: asset.description || '',
            referenceImage: asset.reference_image_url || null,
            imageUrl: asset.reference_image_url || null,
            role: (asset.attributes as any)?.role,
            libraryAssetId: asset.id,
          }
          if (asset.kind === 'character' || asset.kind === 'wardrobe') {
            visionCharacters.push(item)
          } else if (asset.kind === 'location') {
            visionLocations.push(item)
          } else if (asset.kind === 'prop') {
            visionProps.push(item)
          }
        }
      }
    } catch {
      /* ReferenceAsset table optional */
    }

    return {
      seriesId: seriesId ? String(seriesId) : null,
      seriesTitle,
      bibleCharacters,
      bibleLocations,
      bibleProps,
      visionCharacters,
      visionLocations,
      visionProps,
    }
  } catch (err) {
    console.warn('[Treatment Visual] Non-fatal error loading continuity source:', err)
    return null
  }
}

// Build prompt based on mood
function buildPromptWithMood(basePrompt: string, mood: TreatmentMood): string {
  const moodModifiers: Record<TreatmentMood, string> = {
    dark: 'Dark, moody lighting with deep shadows, desaturated colors, noir aesthetic.',
    balanced: 'Natural balanced lighting, cinematic color grading.',
    light: 'Bright, airy lighting with warm tones, optimistic feel.',
    stylized: 'Highly stylized, bold colors, artistic interpretation, graphic novel aesthetic.'
  }
  
  return `${basePrompt} ${moodModifiers[mood]}`
}

// Generate hero image
async function generateHeroImage(
  treatment: FilmTreatmentData,
  mood: TreatmentMood,
  projectId: string,
  storyLocale: string,
  properNouns: string[],
  options: {
    posterType?: PosterShotTypeId
    customPrompt?: string
    negativePrompt?: string
    artStyle?: string
    characters?: HeroPromptCharacterInput[]
    sceneReferences?: HeroPromptSceneRefInput[]
    objectReferences?: HeroPromptObjectRefInput[]
    referenceImages?: ReferenceImage[]
    sharedContinuitySource?: SharedContinuitySource | null
  } = {}
): Promise<GeneratedImage> {
  const posterType: PosterShotTypeId = options.posterType || 'hero-portrait'

  // Resolve Continuity Library references (Characters, Locations, Props)
  const continuityResolution = resolveHeroContinuityReferences({
    treatment: treatment as any,
    posterType,
    selectedCharacters: options.characters,
    selectedSceneRefs: options.sceneReferences,
    selectedObjectRefs: options.objectReferences,
    sharedContinuitySource: options.sharedContinuitySource,
    explicitReferenceImages: options.referenceImages,
  })

  const { resolvedContinuity, referenceImages, referenceBindingPromptBlock } =
    continuityResolution

  const resolvedSceneRefs: HeroPromptSceneRefInput[] =
    options.sceneReferences && options.sceneReferences.length > 0
      ? options.sceneReferences
      : resolvedContinuity.locations.map((loc, idx) => ({
          id: loc.id || `loc-${idx}`,
          name: loc.name,
          description: [loc.location, loc.atmosphere, loc.furniture_props]
            .filter(Boolean)
            .join('. '),
          location: loc.location,
          atmosphere: loc.atmosphere,
          furniture_props: loc.furniture_props,
          imageUrl: loc.referenceImage,
          type: 'scene' as const,
        }))

  const resolvedObjectRefs: HeroPromptObjectRefInput[] =
    options.objectReferences && options.objectReferences.length > 0
      ? options.objectReferences
      : resolvedContinuity.props.map((prop, idx) => ({
          id: prop.id || `prop-${idx}`,
          name: prop.name,
          description: prop.description,
          significance: prop.significance,
          importance: prop.importance,
          category: prop.category,
          imageUrl: prop.referenceImage,
          type: 'object' as const,
        }))

  const artStyleId =
    options.artStyle ||
    resolveVariantArtStyle(treatment as unknown as Record<string, unknown>)

  let basePrompt: string
  let effectiveNegativePrompt = options.negativePrompt

  if (options.customPrompt && options.customPrompt.trim()) {
    basePrompt = options.customPrompt.trim()
  } else {
    const derived = deriveHeroPromptPreset({
      treatment: {
        ...(treatment as any),
        artStyle: artStyleId,
      },
      posterType,
      availableCharacters:
        options.characters && options.characters.length > 0
          ? options.characters
          : resolvedContinuity.cast,
      sceneReferences: resolvedSceneRefs,
      objectReferences: resolvedObjectRefs,
    })

    if (!effectiveNegativePrompt) {
      effectiveNegativePrompt = derived.structure.negativePrompt
    }

    basePrompt = buildPromptWithMood(
      buildHeroImagePrompt({
        treatment: {
          ...(treatment as any),
          artStyle: artStyleId,
        },
        structure: derived.structure,
        availableCharacters:
          options.characters && options.characters.length > 0
            ? options.characters
            : resolvedContinuity.cast,
        sceneReferences: resolvedSceneRefs,
        selectedSceneRefIds: derived.selectedSceneRefIds,
        objectReferences: resolvedObjectRefs,
        selectedObjectRefIds: derived.selectedObjectRefIds,
      }),
      mood
    )
  }

  const artStyleSuffix = getArtStylePromptSuffix(artStyleId)
  const styledPrompt =
    artStyleSuffix && !basePrompt.includes(artStyleSuffix)
      ? `${basePrompt} ${artStyleSuffix}`
      : basePrompt

  const promptWithContinuityRefs = referenceBindingPromptBlock
    ? `${referenceBindingPromptBlock}${styledPrompt}`
    : styledPrompt

  console.log('[HeroImage] Final prompt generated:', {
    posterType,
    promptLength: promptWithContinuityRefs.length,
    referenceImageCount: referenceImages.length,
    castCount: resolvedContinuity.cast.length,
    locationCount: resolvedContinuity.locations.length,
    propCount: resolvedContinuity.props.length,
    promptPreview: promptWithContinuityRefs.substring(0, 320) + '...',
  })

  // Also include continuity cast & location names in properNouns so translation preserves them
  const mergedProperNouns = [
    ...new Set([
      ...properNouns,
      ...resolvedContinuity.cast.map((c) => c.name).filter(Boolean),
      ...resolvedContinuity.locations.map((l) => l.name).filter(Boolean),
    ]),
  ]

  const heroAspectRatio = blueprintAspectRatioToImageApi(
    (treatment as { aspectRatio?: string }).aspectRatio
  )
  const modelPrompt = await englishForModel(
    promptWithContinuityRefs,
    storyLocale,
    mergedProperNouns
  )
  const base64Image = await generateImageWithGemini(modelPrompt, {
    aspectRatio: heroAspectRatio,
    imageSize: '2K',
    ...(referenceImages.length > 0 ? { referenceImages } : {}),
    ...(effectiveNegativePrompt ? { negativePrompt: effectiveNegativePrompt } : {}),
  })

  const blobUrl = await uploadImageToBlob(
    base64Image,
    `treatment/hero-${Date.now()}.png`,
    projectId
  )

  return {
    id: `hero-${projectId}-${Date.now()}`,
    url: blobUrl,
    prompt: styledPrompt,
    generatedAt: new Date().toISOString(),
    aspectRatio: heroAspectRatio,
    status: 'ready' as const,
  }
}

// Generate character portrait
async function generateCharacterPortrait(
  character: {
    name: string
    role?: string
    description?: string
    image_prompt?: string
    referenceImage?: string | null
  },
  treatment: FilmTreatmentData,
  mood: TreatmentMood,
  projectId: string,
  storyLocale: string,
  properNouns: string[],
  continuityCast: HeroPromptCharacterInput[] = []
): Promise<CharacterPortrait> {
  const role = character.role?.toLowerCase() || 'supporting'
  const roleType = role.includes('protagonist') || role.includes('lead') || role.includes('hero') 
    ? 'protagonist' 
    : role.includes('antagonist') || role.includes('villain') 
      ? 'antagonist' 
      : 'supporting'

  const matchedContinuityChar = continuityCast.find(
    (c) => c.name?.toLowerCase() === character.name?.toLowerCase()
  )
  const refImgUrl = character.referenceImage || matchedContinuityChar?.referenceImage || null

  const prompt = buildPromptWithMood(
    DEFAULT_PROMPT_TEMPLATES.characterPortrait({
      name: character.name,
      description:
        character.description ||
        matchedContinuityChar?.appearance ||
        matchedContinuityChar?.description ||
        '',
      role: character.role || matchedContinuityChar?.role || 'character',
      ethnicity: (character as any).ethnicity || matchedContinuityChar?.ethnicity,
      age: (character as any).age
    }),
    mood
  )

  const referenceImages: ReferenceImage[] = refImgUrl
    ? [
        {
          referenceId: 1,
          imageUrl: refImgUrl,
          subjectDescription: `Reference [1] — Character identity & wardrobe reference for ${character.name}: match facial features, bone structure, hair, skin tone, and signature attire`,
        },
      ]
    : []
  
  const modelPrompt = await englishForModel(prompt, storyLocale, properNouns)
  const base64Image = await generateImageWithGemini(modelPrompt, {
    aspectRatio: '3:4',
    imageSize: '1K',
    ...(referenceImages.length > 0 ? { referenceImages } : {}),
  })
  
  const blobUrl = await uploadImageToBlob(
    base64Image,
    `characters/${character.name.replace(/\s+/g, '-')}-${Date.now()}.png`,
    projectId
  )
  
  return {
    characterName: character.name,
    role: roleType,
    image: {
      id: `char-${character.name.replace(/\s+/g, '-')}-${Date.now()}`,
      url: blobUrl,
      prompt,
      generatedAt: new Date().toISOString(),
      aspectRatio: '3:4',
      status: 'ready' as const
    }
  } as unknown as CharacterPortrait
}

// Generate act anchor (establishing shot)
async function generateActAnchor(
  actNumber: 1 | 2 | 3,
  actContent: string,
  treatment: FilmTreatmentData,
  mood: TreatmentMood,
  projectId: string,
  storyLocale: string,
  properNouns: string[],
  continuityLocations: Array<{ name: string; referenceImage?: string | null }> = []
): Promise<ActAnchor> {
  const prompt = buildPromptWithMood(
    DEFAULT_PROMPT_TEMPLATES.actEstablishing({
      actNumber,
      setting: treatment.setting || continuityLocations[0]?.name || 'dramatic location',
      timeOfDay: 'day',
      mood: treatment.tone || 'dramatic',
      genre: treatment.genre || 'drama'
    }),
    mood
  )

  const locWithImg = continuityLocations.find((l) => Boolean(l.referenceImage))
  const referenceImages: ReferenceImage[] = locWithImg?.referenceImage
    ? [
        {
          referenceId: 1,
          imageUrl: locWithImg.referenceImage,
          subjectDescription: `Reference [1] — Environment / location reference for "${locWithImg.name}": match architectural layout, atmosphere, and color palette`,
        },
      ]
    : []
  
  const modelPrompt = await englishForModel(prompt, storyLocale, properNouns)
  const base64Image = await generateImageWithGemini(modelPrompt, {
    aspectRatio: '21:9', // Cinematic 2.39:1
    imageSize: '2K',
    ...(referenceImages.length > 0 ? { referenceImages } : {}),
  })
  
  const blobUrl = await uploadImageToBlob(
    base64Image,
    `treatment/act${actNumber}-${Date.now()}.png`,
    projectId
  )
  
  return {
    actNumber,
    title: `Act ${actNumber}`,
    establishingShot: {
      id: `act${actNumber}-${projectId}-${Date.now()}`,
      url: blobUrl,
      prompt,
      generatedAt: new Date().toISOString(),
      aspectRatio: '21:9',
      status: 'ready' as const
    },
    description: actContent
  } as unknown as ActAnchor
}

export async function POST(request: NextRequest) {
  try {
    // Get session and user ID for credit charging
    const session = await getServerSession(authOptions as any).catch(() => null)
    const userId = (session?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateVisualRequest = await request.json()
    const {
      projectId,
      treatment,
      generateAll,
      visualType,
      visualId,
      mood = 'balanced',
      posterType,
      customPrompt,
      negativePrompt,
      artStyle,
      characters,
      sceneReferences,
      objectReferences,
      referenceImages,
    } = body
    
    if (!projectId || !treatment) {
      return NextResponse.json(
        { error: 'Missing projectId or treatment data' },
        { status: 400 }
      )
    }

    // Treatment text is written in the creator's language and every prompt here
    // feeds the image model, which needs English.
    const { storyLocale, properNouns } = await resolveRequestStoryLocale(request, {
      projectId,
      userIdOrEmail: userId,
    })

    // Estimate credits needed based on what we're generating
    let estimatedCredits = 0
    if (generateAll) {
      estimatedCredits = TREATMENT_VISUAL_CREDITS.heroImage
      const charCount = Math.min((treatment.character_descriptions?.length || 0), 4)
      estimatedCredits += charCount * TREATMENT_VISUAL_CREDITS.characterPortrait
      const actBreakdown = treatment.act_breakdown || {}
      const actCount = [actBreakdown.act1, actBreakdown.act2, actBreakdown.act3].filter(Boolean).length
      estimatedCredits += actCount * TREATMENT_VISUAL_CREDITS.actEstablishing
    } else if (visualType === 'hero') {
      estimatedCredits = TREATMENT_VISUAL_CREDITS.heroImage
    } else if (visualType === 'character') {
      estimatedCredits = TREATMENT_VISUAL_CREDITS.characterPortrait
    } else if (visualType === 'act') {
      estimatedCredits = TREATMENT_VISUAL_CREDITS.actEstablishing
    }

    // Check credits before image generation
    if (estimatedCredits > 0) {
      const hasCredits = await CreditService.ensureCredits(userId, estimatedCredits)
      if (!hasCredits) {
        const breakdown = await CreditService.getCreditBreakdown(userId).catch(() => null)
        return NextResponse.json({
          error: 'Insufficient credits for treatment visual generation',
          creditsRequired: estimatedCredits,
          creditsAvailable: breakdown?.total_credits ?? 0
        }, { status: 402 })
      }
    }

    // Load Continuity Library from DB (Project visionPhase + Series production_bible + ReferenceAssets)
    const sharedContinuitySource = await loadServerContinuitySource(projectId, treatment)
    const continuityResolution = resolveHeroContinuityReferences({
      treatment: treatment as any,
      posterType,
      selectedCharacters: characters,
      selectedSceneRefs: sceneReferences,
      selectedObjectRefs: objectReferences,
      sharedContinuitySource,
      explicitReferenceImages: referenceImages,
    })
    
    let visuals: Partial<TreatmentVisuals> = {
      id: `visuals-${projectId}`,
      projectId,
      mood,
      colorTemperature: 0,
      isGenerating: false,
      estimatedCredits: 0,
      creditsUsed: 0
    }
    
    const partialFailures: VisualFailure[] = []
    const recordFailure = (visual: string, error: unknown) => {
      const classified = classifyAiError(error)
      console.error(
        `[Treatment Visual] ${visual} failed (code=${classified.code}):`,
        classified.details
      )
      partialFailures.push({
        visual,
        code: classified.code,
        message: classified.details,
      })
    }

    // Generate all visuals
    if (generateAll) {
      // Hero image
      try {
        visuals.heroImage = await generateHeroImage(
          treatment,
          mood,
          projectId,
          storyLocale,
          properNouns,
          {
            posterType,
            customPrompt,
            negativePrompt,
            artStyle,
            characters,
            sceneReferences,
            objectReferences,
            referenceImages,
            sharedContinuitySource,
          }
        )
        visuals.creditsUsed = (visuals.creditsUsed || 0) + TREATMENT_VISUAL_CREDITS.heroImage
      } catch (error) {
        recordFailure('hero', error)
      }
      
      // Character portraits (first 4)
      const charsToRender = treatment.character_descriptions?.slice(0, 4) || []
      visuals.characterPortraits = []
      for (const char of charsToRender) {
        try {
          const portrait = await generateCharacterPortrait(
            char,
            treatment,
            mood,
            projectId,
            storyLocale,
            properNouns,
            continuityResolution.resolvedContinuity.cast
          )
          visuals.characterPortraits.push(portrait)
          visuals.creditsUsed = (visuals.creditsUsed || 0) + TREATMENT_VISUAL_CREDITS.characterPortrait
        } catch (error) {
          recordFailure(`character:${char.name}`, error)
        }
      }
      
      // Act anchors
      visuals.actAnchors = []
      const actBreakdown = treatment.act_breakdown || {}
      const acts: [1 | 2 | 3, string][] = [
        [1, actBreakdown.act1 || ''],
        [2, actBreakdown.act2 || ''],
        [3, actBreakdown.act3 || '']
      ]
      
      for (const [actNum, actContent] of acts) {
        if (actContent) {
          try {
            const anchor = await generateActAnchor(
              actNum,
              actContent,
              treatment,
              mood,
              projectId,
              storyLocale,
              properNouns,
              continuityResolution.resolvedContinuity.locations
            )
            visuals.actAnchors.push(anchor)
            visuals.creditsUsed = (visuals.creditsUsed || 0) + TREATMENT_VISUAL_CREDITS.actEstablishing
          } catch (error) {
            recordFailure(`act:${actNum}`, error)
          }
        }
      }
      
      visuals.lastGeneratedAt = new Date().toISOString()

      // Every sub-step failing is a real error, not a successful empty result
      if (partialFailures.length > 0 && !visuals.heroImage) {
        const first = partialFailures[0]
        const classified = classifyAiError(new Error(first.message))
        return NextResponse.json(
          {
            error: classified.message,
            code: classified.code,
            details: first.message,
            partialFailures,
          },
          { status: classified.status }
        )
      }
    }
    // Generate single visual
    else if (visualType) {
      switch (visualType) {
        case 'hero':
          visuals.heroImage = await generateHeroImage(
            treatment,
            mood,
            projectId,
            storyLocale,
            properNouns,
            {
              posterType,
              customPrompt,
              negativePrompt,
              artStyle,
              characters,
              sceneReferences,
              objectReferences,
              referenceImages,
              sharedContinuitySource,
            }
          )
          visuals.creditsUsed = TREATMENT_VISUAL_CREDITS.heroImage
          break
          
        case 'character':
          const charIndex = typeof visualId === 'number' ? visualId : 0
          const char = treatment.character_descriptions?.[charIndex]
          if (char) {
            const portrait = await generateCharacterPortrait(
              char,
              treatment,
              mood,
              projectId,
              storyLocale,
              properNouns,
              continuityResolution.resolvedContinuity.cast
            )
            visuals.characterPortraits = [portrait]
            visuals.creditsUsed = TREATMENT_VISUAL_CREDITS.characterPortrait
          }
          break
          
        case 'act':
          const actNum = (typeof visualId === 'number' ? visualId : 1) as 1 | 2 | 3
          const actContent = treatment.act_breakdown?.[`act${actNum}` as keyof typeof treatment.act_breakdown] || ''
          if (actContent) {
            const anchor = await generateActAnchor(
              actNum,
              actContent as string,
              treatment,
              mood,
              projectId,
              storyLocale,
              properNouns,
              continuityResolution.resolvedContinuity.locations
            )
            visuals.actAnchors = [anchor]
            visuals.creditsUsed = TREATMENT_VISUAL_CREDITS.actEstablishing
          }
          break
      }
      
      visuals.lastGeneratedAt = new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      visuals,
      ...(partialFailures.length > 0 ? { partialFailures } : {})
    })
    
  } catch (error: any) {
    const classified = classifyAiError(error)
    console.error(
      `[Treatment Visual] Failed (code=${classified.code}, status=${classified.status}):`,
      classified.details
    )
    return NextResponse.json(
      {
        error: classified.message,
        code: classified.code,
        details: classified.details,
      },
      { status: classified.status }
    )
  }
}
