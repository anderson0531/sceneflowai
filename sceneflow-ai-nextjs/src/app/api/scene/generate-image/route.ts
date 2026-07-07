import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { generateImageWithVertexKlingFallback } from '@/lib/generation/vertexImageWithKlingFallback'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { optimizePromptForImagen, generateLinkingDescription, extractDemographicAnchor, buildIdentityPromptToken, sanitizePromptForIdentityRefs, filterCharactersForPromptRefs } from '@/lib/imagen/promptOptimizer'
import { validateCharacterLikeness } from '@/lib/imagen/imageValidator'
import { waitForGCSURIs, checkGCSURIAccessibility } from '@/lib/storage/gcsAccessibility'
import { generateDirectionHash, generateImageSourceHash } from '@/lib/utils/contentHash'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import {
  generateSceneImagePrompt,
  detectSceneType,
  extractDirectionMetadata,
  assignPropAndLocationReferenceIndices,
  type CharacterContext,
  type PropContext,
  type LocationContext,
} from '@/lib/intelligence/scene-image-intelligence'
import { detectCharactersInText, resolveBeatSpeaker } from '@/lib/scene/characterDetection'
import { isStoryboardNoCharacterScene } from '@/lib/script/sceneClassification'
import { getSceneBeats, isNarratorBeat } from '@/lib/script/beatMigration'
import { NARRATOR_CHARACTER, type BeatKind } from '@/lib/script/segmentTypes'
import { DEFAULT_VEO_CLIP_DURATION } from '@/lib/config/modelConfig'
import {
  buildCharacterHairAnchor,
  buildCharacterHairDescription,
  buildDualReferenceNegativeTerms,
  buildFramingAwareIdentityBlock,
  buildHairCompositionLock,
  buildHairStyleNegativeTerms,
  buildIdentityReferenceLabel,
  buildIdentityReferencePromptLine,
  buildWardrobeReferenceLabel,
  buildWardrobeReferencePromptLine,
  DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK,
  resolveCharacterReferencePair,
} from '@/lib/character/characterReferenceAssembly'
import {
  buildWardrobeDiptychCharacterConsumptionLine,
  buildWardrobeDiptychReferenceLabel,
  DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT,
  WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION,
  mergeBeatFrameNegativePrompt,
} from '@/lib/character/sceneCharacterHeadshot'
import { formatVisualExpressionCue, stripAllCues } from '@/lib/scene/performanceCues'
import { WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION } from '@/lib/character/wardrobeReferencePrompts'
import {
  buildLocationReferencePromptLine,
} from '@/lib/vision/locationReferencePrompts'
import {
  MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
  buildCharacterReferenceEntries,
  buildLocationReferenceEntry,
  buildPropReferenceEntries,
  remapReferenceNumbersInPrompt,
  selectReferenceImagesInOrder,
} from '@/lib/vision/referenceLimits'
import {
  resolveStoryboardGeneration,
  getPhotorealisticPromptAnchor,
} from '@/lib/storyboard/storyboardQuality'
import { getArtStyleNegativeTerms, getArtStylePromptSuffix } from '@/lib/vision/artStyle'
import { editImageWithGeminiStudio } from '@/lib/gemini/geminiStudioImageClient'
import { buildEndFramePrompt } from '@/lib/scene/deriveSegmentsFromBeats'
import { buildPreVisEndFrameEditInstruction } from '@/lib/vision/framePromptBaseline'
import {
  isExpressImageRateLimitError,
  isTransientExpressImageError,
  resolveExpressImageErrorStatus,
} from '@/lib/sceneGeneration/expressImageErrors'

export const runtime = 'nodejs'
export const maxDuration = 120  // Increased for new AI image models

/**
 * @deprecated Use generateLinkingDescription from promptOptimizer instead
 * Extract VISUAL ANCHORS from appearance description for Imagen API
 * 
 * The model needs key visual differentiators to "latch onto" the reference image.
 * Too generic ("a man") = model ignores specific features
 * Too specific (conflicting details) = model follows text over image
 * 
 * Goal: 3-6 word description with KEY VISUAL ANCHORS (hair, glasses, beard, age)
 * These anchors tell the model WHICH pixels in the reference image are important.
 */
function createVisualAnchorDescription(char: any, index: number): string {
  const description = char.visionDescription || char.appearanceDescription || ''
  const descLower = description.toLowerCase()
  
  // Detect gender
  const isFemale = descLower.includes('woman') || 
                   descLower.includes('female') ||
                   descLower.includes('she ')
  
  const anchors: string[] = []
  
  // AGE ANCHOR - critical differentiator
  if (descLower.includes('late 50s') || descLower.includes('early 60s') || descLower.includes('60s')) {
    anchors.push('older')
  } else if (descLower.includes('late 40s') || descLower.includes('50s')) {
    anchors.push('middle-aged')
  } else if (descLower.includes('late 20s') || descLower.includes('early 30s') || descLower.includes('30s')) {
    anchors.push('young')
  }
  
  // HAIR ANCHOR - very distinctive
  if (descLower.includes('curly afro') || descLower.includes('afro')) {
    anchors.push('with curly afro')
  } else if (descLower.includes('salt-and-pepper') && descLower.includes('hair')) {
    anchors.push('with salt-and-pepper hair')
  } else if (descLower.includes('bald')) {
    anchors.push('bald')
  } else if (descLower.includes('grey hair') || descLower.includes('gray hair')) {
    anchors.push('with grey hair')
  } else if (descLower.includes('short') && descLower.includes('cropped')) {
    anchors.push('with short cropped hair')
  }
  
  // BEARD ANCHOR - important for men
  if (!isFemale) {
    if (descLower.includes('salt-and-pepper') && descLower.includes('beard')) {
      anchors.push('grey beard')
    } else if (descLower.includes('full beard')) {
      anchors.push('full beard')
    } else if (descLower.includes('beard')) {
      anchors.push('beard')
    }
  }
  
  // GLASSES ANCHOR - very distinctive
  if (descLower.includes('glasses')) {
    anchors.push('glasses')
  }
  
  // Build the description
  const gender = isFemale ? 'woman' : 'man'
  let result: string
  
  if (anchors.length === 0) {
    result = `a ${gender}`
  } else if (anchors.length === 1) {
    // "an older man" or "a man with curly afro"
    const anchor = anchors[0]
    if (anchor.startsWith('with') || anchor === 'bald') {
      result = `a ${gender} ${anchor}`
    } else {
      result = `${anchor.startsWith('o') ? 'an' : 'a'} ${anchor} ${gender}`
    }
  } else {
    // Combine anchors: "an older man with grey beard"
    const ageAnchor = anchors.find(a => ['older', 'middle-aged', 'young'].includes(a))
    const otherAnchors = anchors.filter(a => !['older', 'middle-aged', 'young'].includes(a))
    
    if (ageAnchor) {
      const article = ageAnchor.startsWith('o') ? 'an' : 'a'
      result = `${article} ${ageAnchor} ${gender}`
      if (otherAnchors.length > 0) {
        // Join with "and" for readability
        const features = otherAnchors.map(a => a.startsWith('with') ? a.substring(5) : a).join(' and ')
        result += ` with ${features}`
      }
    } else {
      // No age anchor, just combine features
      const features = otherAnchors.map(a => a.startsWith('with') ? a.substring(5) : a).join(' and ')
      result = `a ${gender} with ${features}`
    }
  }
  
  console.log(`[Scene Image] Visual anchor description for ${char.name} (ref ${index}): "${result}"`)
  return result
}

/**
 * Strip emotional descriptors from character descriptions
 * Keeps only physical characteristics, lets scene drive emotions
 */
function stripEmotionalDescriptors(description: string): string {
  // Remove common emotional/expression terms
  const emotionalTerms = [
    // "friendly smile", "warm expression", "wide smile", etc.
    /\b(friendly|warm|cheerful|happy|sad|worried|confident|stern|serious|welcoming|inviting|wide|bright|broad)\s+(smile|expression|demeanor|look|face|grin)\b/gi,
    // "smiling", "frowning", "grinning", "beaming"
    /\b(smiling|frowning|grinning|beaming)\b/gi,
    // "with a happy expression", "with a smile", "and a wide smile"
    /\b(with|and)\s+a\s+(happy|sad|worried|confident|friendly|stern|serious|warm|cheerful|weary|tired|energetic|excited|wide|bright|broad)?\s*(smile|expression|look|demeanor|face|appearance|frown|grin|smirk)\b/gi,
    // "and a smile", ", a smile"
    /[,\s]+(and\s+)?a\s+(smile|frown|grin|smirk)\b/gi,
    // "appears happy", "looks tired"
    /\b(appears|looks|seems)\s+(happy|sad|worried|confident|tired|energetic|friendly|stern|serious|cheerful)\b/gi,
  ]
  
  let cleaned = description
  emotionalTerms.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Clean up double spaces and punctuation
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').trim()
  
  return cleaned
}

/**
 * Strip clothing/wardrobe descriptors from character descriptions
 * Prevents conflicts when explicit wardrobe (defaultWardrobe) is set separately
 * Only applied when character has explicit wardrobe to avoid duplicate/conflicting instructions
 */
function stripClothingDescriptors(description: string): string {
  // Remove common clothing/wardrobe patterns
  const clothingTerms = [
    // "wearing a blue suit" patterns
    /\b(wearing|dressed in|clothed in|clad in)\s+(a\s+)?[^,.]+?(suit|shirt|dress|coat|jacket|pants|jeans|trousers|uniform|outfit|attire|clothes|clothing|t-shirt|tee|sweater|hoodie|blazer|tie|blouse|skirt|shorts|vest|cardigan|polo|button-down|oxford)[^,.]*[,.]?/gi,
    // ", in a blue suit," patterns
    /[,\s]+in\s+(a\s+)?[^,.]+?(suit|shirt|dress|coat|jacket|pants|jeans|trousers|uniform|outfit|attire)[^,.]*[,.]?/gi,
    // "with a tie", "with a watch" - wardrobe accessories (not physical features)
    /\bwith\s+(a\s+)?(tie|bow tie|necklace|bracelet|watch|earrings|ring|scarf|hat|cap|glasses|sunglasses|handbag|purse|briefcase)\b/gi,
    // Standalone clothing references at end of description
    /[,\s]+(casual|formal|business|professional|smart|elegant)\s+(attire|clothes|clothing|wear|outfit|look)[,.]?$/gi,
    // "dressed formally", "dressed casually"
    /\bdressed\s+(formally|casually|professionally|elegantly|smartly)\b/gi,
  ]
  
  let cleaned = description
  clothingTerms.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Clean up double spaces, dangling commas, and punctuation artifacts
  cleaned = cleaned
    .replace(/,\s*,/g, ',')       // double commas
    .replace(/\s+,/g, ',')        // space before comma
    .replace(/,\s*\./g, '.')      // comma before period
    .replace(/\s{2,}/g, ' ')      // multiple spaces
    .replace(/,\s*$/g, '')        // trailing comma
    .replace(/^\s*,/g, '')        // leading comma
    .trim()
  
  return cleaned
}

export async function POST(req: NextRequest) {
  let userId: string | null = null
  let creditsCharged = 0
  const CREDIT_COST = IMAGE_CREDITS.IMAGEN_3 // 5 credits per image

  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    userId = session?.user?.id || session?.user?.email || null
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // 2. Pre-check credit balance
    const hasEnoughCredits = await CreditService.ensureCredits(userId, CREDIT_COST)
    if (!hasEnoughCredits) {
      const breakdown = await CreditService.getCreditBreakdown(userId)
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: CREDIT_COST,
        balance: breakdown.total_credits,
        suggestedTopUp: { pack: 'quick_fix', name: 'Quick Fix', price: 25, credits: 2000 }
      }, { status: 402 })
    }

    const body = await req.json()
    const {
      projectId,
      sceneIndex,
      scenePrompt,           // Legacy support
      customPrompt,          // NEW: From prompt builder
      artStyle,              // NEW: User's art style selection
      shotType,              // NEW: Camera framing
      cameraAngle,           // NEW: Camera angle
      lighting,              // NEW: Lighting selection
      characters,            // NEW: From prompt data object
      selectedCharacters = [], // Legacy support - array or extracted from object
      quality = 'auto',
      personGeneration,       // NEW: Optional personGeneration setting (default: 'allow_adult')
      characterWardrobes = [], // NEW: Scene-level wardrobe overrides - array of { characterId, wardrobeId }
      sceneReferences = [],   // NEW: Scene backdrop references from Reference Library
      objectReferences = [],  // NEW: Prop/object references from Reference Library
      excludeCharacters: excludeCharactersParam = false,  // NEW: Generate scene reference only (no people) for reference library
      locationReferences = [],  // NEW: Location references for environment consistency
      skipObjectAutoDetection = false,  // NEW: Skip auto-detection of objects (for batch mode)
      useAIPrompt = true,  // NEW: Use Gemini intelligence for prompt generation (default: true)
      allowTypography = false,  // Title/credit beats may render on-screen text
      frameType = 'establishing',  // 'establishing' | 'dialogue' | 'custom' | 'beat'
      dialogueIndex,  // Required when frameType === 'dialogue'
      beatIndex,  // Required when frameType === 'beat' (unless beatId is provided)
      beatId,  // Optional stable beat id when frameType === 'beat'
      customFrameId,  // Required when frameType === 'custom'
      /** In-memory scene snapshot (Express) merged over DB scene at sceneIndex */
      sceneOverride,
      modelTier,
      storyboardQuality,
      skipLikenessValidation = false,
      generationMode = 'default',
      includeWardrobeReferenceImages = true,
      includeWardrobeDiptych = true,
      fromDialog = false,
      negativePrompt,
      thinkingLevel,
      visualSetup,
      talentDirection,
      wardrobeTextOverrides,
      frameRole = 'start',
      startFrameUrl,
    } = body

    const resolvedGen = resolveStoryboardGeneration({
      storyboardQuality:
        storyboardQuality === 'final' || storyboardQuality === 'draft'
          ? storyboardQuality
          : undefined,
      legacyImageQuality:
        quality === 'max' || quality === 'auto' ? quality : undefined,
    })
    const effectiveImageSize = resolvedGen.imageSize
    const effectiveImagenQuality = resolvedGen.imagenQuality

    const resolvedModelTier =
      modelTier === 'eco' || modelTier === 'designer' || modelTier === 'director'
        ? modelTier
        : resolvedGen.modelTier
    
    // Client explicitly chose characters (even if empty = no characters wanted); mutable for dialogue frames
    let characterSelectionExplicit = body.characterSelectionExplicit ?? false
    
    const isDialogueFrame = frameType === 'dialogue'
    const isBeatFrame = frameType === 'beat'
    const isCustomFrame = frameType === 'custom'
    if (isDialogueFrame && (typeof dialogueIndex !== 'number' || dialogueIndex < 0)) {
      return NextResponse.json(
        { success: false, error: 'dialogueIndex is required when frameType is dialogue' },
        { status: 400 }
      )
    }
    if (
      isBeatFrame &&
      (typeof beatIndex !== 'number' || beatIndex < 0) &&
      !(typeof beatId === 'string' && beatId.trim())
    ) {
      return NextResponse.json(
        { success: false, error: 'beatIndex or beatId is required when frameType is beat' },
        { status: 400 }
      )
    }
    if (isCustomFrame && (!customFrameId || typeof customFrameId !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'customFrameId is required when frameType is custom' },
        { status: 400 }
      )
    }
    
    let effectiveShotType = shotType
    let effectiveCameraAngle = cameraAngle
    let effectiveLighting = lighting
    if (generationMode === 'direct' && visualSetup && typeof visualSetup === 'object') {
      const vs = visualSetup as Record<string, string>
      if (vs.shotType) effectiveShotType = vs.shotType
      if (vs.cameraAngle) effectiveCameraAngle = vs.cameraAngle
      if (vs.lighting) effectiveLighting = vs.lighting
    }
    let dialogueFrameContext = ''
    let beatKindForIntelligence: BeatKind | undefined
    
    let effectiveExcludeCharacters = excludeCharactersParam
    
    // Handle both legacy (selectedCharacters) and new (characters) formats
    // If excludeCharacters is true, ignore all character references for scene environment-only image
    let characterArray = effectiveExcludeCharacters ? [] : (characters || selectedCharacters || [])

    console.log('[Scene Image] Generating scene image')
    console.log('[Scene Image] Selected characters:', characterArray.length)
    console.log('[Scene Image] Raw selectedCharacters:', JSON.stringify(characterArray))

    // Single unified project load for both character and scene data
    let project = null
    let resolvedScene: any = null
    let characterObjects = characterArray

    // Filter out null/undefined values immediately
    const beforeFilterCount = characterArray.length
    characterObjects = characterObjects.filter((c: any) => c != null)
    const afterFilterCount = characterObjects.length

    console.log(`[Scene Image] Filtered ${beforeFilterCount - afterFilterCount} null values`)
    console.log('[Scene Image] DEBUG - selectedCharacters type:', characterObjects[0] ? typeof characterObjects[0] : 'empty array')
    console.log('[Scene Image] DEBUG - selectedCharacters[0]:', characterObjects[0] ? JSON.stringify(characterObjects[0]).substring(0, 200) : 'none')
    console.log('[Scene Image] DEBUG - projectId:', projectId)

    let effectiveBeatIndex =
      isBeatFrame && typeof beatIndex === 'number' && beatIndex >= 0 ? beatIndex : -1
    let effectiveCharacterWardrobes = characterWardrobes

    if (projectId) {
      await sequelize.authenticate()
      project = await Project.findByPk(projectId, {
        attributes: ['id', 'metadata', 'user_id', 'title', 'status', 'current_step']
      })
      
      if (!project) {
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }

      const allCharacters = project.metadata?.visionPhase?.characters || []
      const scenesForType = project.metadata?.visionPhase?.script?.script?.scenes || []
      const filmTitleForDetection =
        (project.metadata?.title as string | undefined) || project.title || undefined
      if (typeof sceneIndex === 'number') {
        const scenesForResolution = scenesForType
        const dbScene = scenesForResolution[sceneIndex]
        resolvedScene =
          sceneOverride && typeof sceneOverride === 'object'
            ? { ...(dbScene || {}), ...sceneOverride }
            : dbScene
      }

      if (
        effectiveCharacterWardrobes.length === 0 &&
        resolvedScene &&
        Array.isArray(resolvedScene.characterWardrobes)
      ) {
        effectiveCharacterWardrobes = resolvedScene.characterWardrobes
      }

      if (isBeatFrame && resolvedScene) {
        if (typeof beatId === 'string' && beatId.trim()) {
          const beats = getSceneBeats(resolvedScene as Record<string, unknown>)
          const idx = beats.findIndex((b) => b.beatId === beatId.trim())
          if (idx >= 0) effectiveBeatIndex = idx
        }
        if (effectiveBeatIndex < 0) {
          return NextResponse.json(
            { success: false, error: 'Beat not found for beatIndex/beatId' },
            { status: 400 }
          )
        }

        if (frameRole === 'end') {
          const beats = getSceneBeats(resolvedScene as Record<string, unknown>)
          const beat = beats[effectiveBeatIndex]
          if (!beat) {
            return NextResponse.json(
              { success: false, error: 'Beat not found for end frame generation' },
              { status: 400 }
            )
          }
          const resolvedStartUrl =
            (typeof startFrameUrl === 'string' && startFrameUrl.trim()) ||
            beat.storyboardImageUrl?.trim()
          if (!resolvedStartUrl) {
            return NextResponse.json(
              { success: false, error: 'Start frame required before generating end frame' },
              { status: 400 }
            )
          }

          const endPrompt =
            (typeof customPrompt === 'string' && customPrompt.trim()) ||
            buildEndFramePrompt(beat)
          const durationSeconds =
            typeof beat.durationSeconds === 'number' && beat.durationSeconds > 0
              ? beat.durationSeconds
              : DEFAULT_VEO_CLIP_DURATION
          const instruction = buildPreVisEndFrameEditInstruction({
            startFramePrompt: beat.storyboardImagePrompt?.trim() || endPrompt,
            durationSeconds,
          })

          const editResult = await editImageWithGeminiStudio({
            sourceImage: resolvedStartUrl,
            instruction,
            aspectRatio: '16:9',
            imageSize: '1K',
            editIntent: 'keyframeEnd',
            segmentDurationSeconds: durationSeconds,
            negativePrompt: mergeBeatFrameNegativePrompt(),
          })

          const imageUrl = await uploadImageToBlob(
            editResult.imageBase64,
            `projects/${projectId}/scenes/${sceneIndex}/beats/${beat.beatId || effectiveBeatIndex}-end-${Date.now()}.png`
          )

          try {
            await CreditService.charge(
              userId!,
              IMAGE_CREDITS.FRAME_GENERATION,
              'ai_usage',
              projectId || null,
              { operation: 'beat_end_frame', sceneIndex, beatIndex: effectiveBeatIndex }
            )
          } catch (chargeError: unknown) {
            console.error('[Scene Image] Failed to charge end-frame credits:', chargeError)
          }

          return NextResponse.json({
            success: true,
            imageUrl,
            prompt: instruction,
            frameType: 'beat',
            frameRole: 'end',
            beatIndex: effectiveBeatIndex,
            model: 'gemini-image-edit',
            provider: 'gemini',
            storage: 'vercel-blob',
            creditsCharged: IMAGE_CREDITS.FRAME_GENERATION,
          })
        }
      }

      const storyboardNoCharacterScene =
        !!resolvedScene &&
        isStoryboardNoCharacterScene(
          resolvedScene as Record<string, unknown>,
          (sceneIndex ?? 0) + 1,
          scenesForType.length
        )
      if (storyboardNoCharacterScene) {
        effectiveExcludeCharacters = true
        characterObjects = []
        characterSelectionExplicit = true
        characterArray = []
        console.log('[Scene Image] Title/credits/no-talent scene — excluding character references')
      }
      console.log('[Scene Image] DEBUG - characters in project:', allCharacters.length)
      console.log('[Scene Image] DEBUG - characters from DB:', allCharacters.map((c: any) => ({
        name: c.name,
        hasRefImage: !!c.referenceImage,
        refImagePrefix: c.referenceImage ? c.referenceImage.substring(0, 40) : 'none'
      })))
      
      // ALWAYS load characters from database if we have a projectId
      if (characterObjects.length > 0) {
        // If selectedCharacters are IDs (strings), match them
        if (typeof characterObjects[0] === 'string') {
          characterObjects = characterObjects.map((charId: string) => {
            const byId = allCharacters.find((c: any) => c.id === charId)
            if (byId) return byId
            return allCharacters.find((c: any) => c.name === charId)
          }).filter((c: any) => c != null)
          
          console.log('[Scene Image] Loaded character objects by ID:', characterObjects.length)
        } 
        // If selectedCharacters are already objects, reload them from DB
        else if (typeof characterObjects[0] === 'object') {
          characterObjects = characterObjects.map((char: any) => {
            if (!char) return null
            
            // Try ID match first (if ID exists)
            if (char.id) {
              const byId = allCharacters.find((c: any) => c.id === char.id)
              if (byId) return byId
            }
            
            // Fallback to name match
            if (char.name) {
              const byName = allCharacters.find((c: any) => c.name === char.name)
              if (byName) return byName
            }
            
            return null
          }).filter((c: any) => c != null)
          
          console.log('[Scene Image] Reloaded character objects from DB:', characterObjects.length)
        }
      } else if (projectId && typeof sceneIndex === 'number') {
        // Dialogue storyboard frame: select speaking character only (skip narrator)
        if (isDialogueFrame && resolvedScene) {
          characterSelectionExplicit = true
          const dialogueLines = Array.isArray(resolvedScene.dialogue) ? resolvedScene.dialogue : []
          const line = dialogueLines[dialogueIndex!]
          if (line) {
            const speakerName = String(line.character || '').trim()
            const isNarrationLine =
              line.kind === 'narration' ||
              line.characterId === 'narrator' ||
              speakerName.toUpperCase() === NARRATOR_CHARACTER
            if (isNarrationLine) {
              characterObjects = []
              beatKindForIntelligence = 'narration'
            } else if (speakerName && allCharacters.length > 0) {
              const speakerLower = speakerName.toLowerCase()
              const speakerChar = allCharacters.find((c: any) => {
                if (!c?.name) return false
                if (c.type === 'narrator') return false
                const nameLower = c.name.toLowerCase()
                return nameLower === speakerLower || nameLower.includes(speakerLower) || speakerLower.includes(nameLower)
              })
              if (speakerChar) {
                characterObjects = [speakerChar]
                console.log(`[Scene Image] Dialogue frame: selected speaker "${speakerName}"`)
              }
            }
          }
        } else if (isBeatFrame && resolvedScene) {
          const clientVerifiedBeatRefs =
            body.characterSelectionExplicit === true && skipObjectAutoDetection === true
          if (!clientVerifiedBeatRefs) {
            characterSelectionExplicit = true
          }
          const beats = getSceneBeats(resolvedScene as Record<string, unknown>)
          const beat = beats[effectiveBeatIndex]
          if (beat) {
            beatKindForIntelligence = beat.kind
            if (storyboardNoCharacterScene) {
              if (!clientVerifiedBeatRefs) characterObjects = []
              if (beat.kind === 'action') {
                const actionText = beat.actionDescription?.trim() || ''
                const displayAction = actionText || 'Scene action unfolds'
                dialogueFrameContext =
                  `Storyboard silent action frame. No dialogue, no lip-sync. ` +
                  `Abstract/digital composition with NO people. Visual direction: ${displayAction}. `
                effectiveShotType = effectiveShotType || 'medium shot'
              }
            } else if (beat.kind === 'action') {
              const actionText = beat.actionDescription?.trim() || ''
              if (!clientVerifiedBeatRefs) {
                // Beat-scoped only: do not scan full scene.action (other beats' characters leak in)
                const actionContext = [
                  resolvedScene?.heading || '',
                  actionText,
                ].join(' ')
                const detectedChars = detectCharactersInText(actionContext, allCharacters, {
                  excludeTexts: filmTitleForDetection ? [filmTitleForDetection] : [],
                })
                characterObjects = detectedChars
                if (detectedChars.length > 0) {
                  console.log(
                    `[Scene Image] Action beat: detected ${detectedChars.length} character(s) from action text:`,
                    detectedChars.map((c: any) => c.name)
                  )
                }
              }
              const displayAction = actionText || 'Scene action unfolds'
              dialogueFrameContext =
                `Storyboard silent action frame. No dialogue, no lip-sync, no on-screen text. ` +
                `Visual direction: ${displayAction}. `
              effectiveShotType = effectiveShotType || 'medium shot'
            } else if (isNarratorBeat(beat)) {
              if (!clientVerifiedBeatRefs) characterObjects = []
              const lineText = beat.line?.trim() || ''
              dialogueFrameContext =
                `Storyboard voiceover backdrop frame. NO narrator on screen, NO talking head, NO lip-sync. ` +
                `Illustrate the visual scene and mood implied by this voiceover` +
                (lineText ? `: "${lineText}"` : '') +
                `. Show environment, subjects, and atmosphere only. `
              effectiveShotType = effectiveShotType || 'wide shot'
            } else if (beat.characterId || beat.character) {
              if (!clientVerifiedBeatRefs) {
                const speakerChar = resolveBeatSpeaker(beat, allCharacters)
                if (speakerChar) characterObjects = [speakerChar]
              }
              const lineText = beat.line?.trim() || ''
              const speakerName = (beat.character || '').trim()
              dialogueFrameContext =
                `Storyboard dialogue frame. Focus on ${speakerName || 'the speaker'} delivering this line: "${lineText}". ` +
                'Frame the speaking character prominently — medium close-up or over-the-shoulder — with scene continuity preserved. '
              effectiveShotType = effectiveShotType || 'medium close-up'
            }
            console.log(`[Scene Image] Beat frame ${effectiveBeatIndex}: kind=${beat.kind}`)
          }
        } else if (characterSelectionExplicit) {
          console.log('[Scene Image] Character selection was explicit (from dialog or no-talent detection) — skipping auto-detect')
          console.log('[Scene Image] Proceeding with 0 characters as intended by user')
        } else {
          console.log('[Scene Image] No characterObjects provided, attempting to auto-detect from scene')
          if (resolvedScene) {
            const scene = resolvedScene
            if (storyboardNoCharacterScene) {
              console.log('[Scene Image] No-talent/title scene — skipping character auto-detection')
              characterObjects = []
              characterSelectionExplicit = true
            } else {
              const sceneText = [
                scene.heading || '',
                scene.action || '',
                scene.visualDescription || '',
                ...(scene.dialogue || []).map((d: any) => d.character || ''),
              ].join(' ')

              const detectedChars = detectCharactersInText(sceneText, allCharacters, {
                excludeTexts: filmTitleForDetection ? [filmTitleForDetection] : [],
              })

              if (detectedChars.length > 0) {
                characterObjects = detectedChars
                console.log(
                  `[Scene Image] Auto-detected ${detectedChars.length} character(s) from scene:`,
                  detectedChars.map((c: any) => c.name)
                )
              } else {
                console.log(
                  '[Scene Image] No characters detected in scene text, proceeding without character references'
                )
              }
            }
          }
        }
      }
      
      // DEBUG: Log character properties and ensure referenceImage is populated
      if (characterObjects.length > 0) {
        console.log('[Scene Image] DEBUG - First character keys:', Object.keys(characterObjects[0]))
        console.log('[Scene Image] DEBUG - Has referenceImage:', !!characterObjects[0].referenceImage)
        
        // Log all characters' reference image status
        characterObjects.forEach((char: any, idx: number) => {
          console.log(`[Scene Image] Character ${idx + 1} (${char.name}):`, {
            hasReferenceImage: !!char.referenceImage,
            referenceImageUrl: char.referenceImage ? char.referenceImage.substring(0, 50) + '...' : 'none'
          })
        })
        
        // Check for characters missing reference images
        const missingImages = characterObjects.filter((c: any) => !c.referenceImage)
        if (missingImages.length > 0) {
          console.warn(`[Scene Image] WARNING: ${missingImages.length} character(s) missing referenceImage:`, 
            missingImages.map((c: any) => c.name))
          console.warn('[Scene Image] These characters will be included in prompt text only (no visual reference)')
        }
      } else if (projectId) {
        // Even if no characterObjects found, log available characters from project
        console.log('[Scene Image] DEBUG - No characterObjects found, but project has', allCharacters.length, 'characters')
        if (allCharacters.length > 0) {
          allCharacters.forEach((char: any, idx: number) => {
            console.log(`[Scene Image] Available character ${idx + 1}:`, {
              name: char.name,
              hasReferenceImage: !!char.referenceImage
            })
          })
        }
      }
    }

    // Filter for valid characters (we don't need reference images anymore)
    characterObjects = characterObjects.filter((c: any) => c != null)
    console.log('[Scene Image] Valid character objects:', characterObjects.length)
    
    // Load scene data (reuse same project variable)
    let fullSceneContext = scenePrompt || ''
    let sceneData: any = null  // Store scene for hash calculation
    let references: any[] = []  // Store references for hash calculation

    if (project && typeof sceneIndex === 'number') {
      const scene = resolvedScene
      sceneData = scene  // Capture for hash calculation
      references = project.metadata?.visionPhase?.references || []  // Capture references
      
      if (scene) {
        // Dialogue storyboard frame: focus on the speaking character (or backdrop for narration)
        if (isDialogueFrame) {
          const dialogueLines = Array.isArray(scene.dialogue) ? scene.dialogue : []
          const line = dialogueLines[dialogueIndex]
          if (!line) {
            return NextResponse.json(
              { success: false, error: `Dialogue line at index ${dialogueIndex} not found` },
              { status: 400 }
            )
          }
          const speakerName = String(line.character || '').trim()
          const lineText = String(line.line ?? line.text ?? '').trim()
          const isNarrationLine =
            line.kind === 'narration' ||
            line.characterId === 'narrator' ||
            speakerName.toUpperCase() === NARRATOR_CHARACTER

          if (isNarrationLine) {
            beatKindForIntelligence = 'narration'
            characterSelectionExplicit = true
            characterObjects = []
            dialogueFrameContext =
              `Storyboard voiceover backdrop frame. NO narrator on screen, NO talking head, NO lip-sync. ` +
              `Illustrate the visual scene and mood implied by this voiceover` +
              (lineText ? `: "${lineText}"` : '') +
              `. Show environment, subjects, and atmosphere only. `
            effectiveShotType = effectiveShotType || 'wide shot'
          } else {
            beatKindForIntelligence = 'dialogue'
            const voiceDir = line.voiceDirection ? ` (${line.voiceDirection})` : ''
            dialogueFrameContext =
              `Storyboard dialogue frame. Focus on ${speakerName || 'the speaker'} delivering this line${voiceDir}: "${lineText}". ` +
              'Frame the speaking character prominently — medium close-up or over-the-shoulder — with scene continuity preserved. '
            effectiveShotType = effectiveShotType || 'medium close-up'
            effectiveCameraAngle = effectiveCameraAngle || 'eye level'
          }
        } else if (isCustomFrame) {
          const customFrames = Array.isArray(scene.storyboardFrames) ? scene.storyboardFrames : []
          const customFrame = customFrames.find((f: any) => f?.id === customFrameId)
          if (!customFrame) {
            return NextResponse.json(
              { success: false, error: `Custom storyboard frame ${customFrameId} not found` },
              { status: 400 }
            )
          }
          const label = String(customFrame.label || 'Custom storyboard frame').trim()
          const character = String(customFrame.character || '').trim()
          const lineText = String(customFrame.line || '').trim()
          dialogueFrameContext =
            `Storyboard custom frame "${label}". ` +
            (character ? `Feature ${character}${lineText ? ` — "${lineText}"` : ''}. ` : '') +
            'Create a cinematic storyboard cut that fits the scene continuity. '
          if (character && allCharacters.length > 0) {
            characterSelectionExplicit = true
            const charLower = character.toLowerCase()
            const match = allCharacters.find((c: any) => {
              if (!c?.name) return false
              const nameLower = c.name.toLowerCase()
              return nameLower === charLower || nameLower.includes(charLower) || charLower.includes(nameLower)
            })
            if (match) characterObjects = [match]
          }
        }

        // PRIORITY 1: Enhanced Scene Direction (customPrompt from PromptBuilder, or sceneDirectionText)
        // PRIORITY 2: Original script components (action + visualDescription)
        const sceneDirectionText = scene.sceneDirectionText || ''
        
        if (customPrompt && customPrompt.trim()) {
          fullSceneContext = customPrompt
          console.log('[Scene Image] Using custom prompt from ScenePromptBuilder')
        } else if (isBeatFrame && scene) {
          const beats = getSceneBeats(scene as Record<string, unknown>)
          const beat = beats[effectiveBeatIndex]
          const beatAction = beat?.actionDescription?.trim() || beat?.line?.trim() || ''
          fullSceneContext = beatAction || scene.action || scene.visualDescription || scene.heading || ''
          console.log('[Scene Image] Using beat-primary context for beat frame')
        } else if (sceneDirectionText && sceneDirectionText.trim()) {
          fullSceneContext = sceneDirectionText
          console.log('[Scene Image] Using enhanced Scene Direction as base context')
        } else if (scenePrompt && scenePrompt.trim()) {
          fullSceneContext = scenePrompt
          console.log('[Scene Image] Using explicitly provided scenePrompt')
        } else {
          // Fallback to original script components
          // Prefer action (detailed) over visualDescription (camera-focused)
          fullSceneContext = scene.action || scene.visualDescription || scene.heading || ''

          // If both action and visualDescription exist and are different, combine them
          if (scene.action && scene.visualDescription && scene.action !== scene.visualDescription) {
            fullSceneContext = `${scene.action} ${scene.visualDescription}`
          }
          console.log('[Scene Image] Using original script components (action/visualDescription)')
        }
        
        if (dialogueFrameContext && !(customPrompt && customPrompt.trim())) {
          fullSceneContext = `${dialogueFrameContext}${fullSceneContext}`
        }
        
        console.log('[Scene Image] Scene context established:', {
          hasVisualDescription: !!scene.visualDescription,
          hasAction: !!scene.action,
          hasSceneDirection: !!sceneDirectionText,
          hasCustomPrompt: !!customPrompt,
          contextLength: fullSceneContext.length,
          sceneIndex: sceneIndex
        })
      }
    }
    
    // Initialize variables to hold selected references
    let detectedObjectReferences = objectReferences || []
    let matchedLocationReference: any = locationReferences.length > 0 ? locationReferences[0] : null

    if (
      isBeatFrame &&
      body.characterSelectionExplicit === true &&
      skipObjectAutoDetection === true
    ) {
      console.log('[Scene Image] Beat frame using client-verified references', {
        characters: characterObjects.map((c: any) => c?.name).filter(Boolean),
        location: matchedLocationReference?.location || matchedLocationReference?.name,
        objects: detectedObjectReferences.map((o: any) => o?.name).filter(Boolean),
      })
    }
    
    // Fetch available project references for the AI to choose from
    const projectObjectRefs = project?.metadata?.visionPhase?.references?.objectReferences || []
    const projectLocationRefs = project?.metadata?.visionPhase?.references?.locationReferences || []
    
    // We pass all available references to the AI, and let it filter them.
    // If the user manually provided references (objectReferences or locationReferences), we bypass auto-detection for those categories.
    const autoDetectObjects = detectedObjectReferences.length === 0 && !skipObjectAutoDetection
    const autoDetectLocations = !matchedLocationReference
    
    // Build character references using visionDescription (preferred) or fallback descriptions
    // IMPORTANT: referenceId is ONLY assigned to characters with GCS images
    // This ensures the [1], [2] markers in the prompt match the API's referenceImages array
    let gcsRefIndex = 0
    const characterReferences = characterObjects.map((char: any, idx: number) => {
      // Prefer Gemini Vision description over manual description
      const rawDescription = char.visionDescription || char.appearanceDescription || 
        `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
      
      // Strip emotional descriptors - let scene drive emotions
      let description = stripEmotionalDescriptors(rawDescription)
      
      // Determine wardrobe for this character in this scene
      // Check for scene-level wardrobe override first
      let effectiveWardrobe = char.defaultWardrobe
      let effectiveAccessories = char.wardrobeAccessories
      
      const charId = char.id || char.name // Some characters may use name as ID
      const sceneWardrobeOverride = effectiveCharacterWardrobes.find(
        (cw: { characterId: string; wardrobeId: string }) => cw.characterId === charId
      )
      
      if (sceneWardrobeOverride && char.wardrobes && Array.isArray(char.wardrobes)) {
        // Find the specific wardrobe in the character's collection
        const selectedWardrobe = char.wardrobes.find(
          (w: { id: string; description: string; accessories?: string }) => w.id === sceneWardrobeOverride.wardrobeId
        )
        if (selectedWardrobe) {
          effectiveWardrobe = selectedWardrobe.description
          effectiveAccessories = selectedWardrobe.accessories
          console.log(`[Scene Image] Using scene-level wardrobe override for ${char.name}: "${selectedWardrobe.name}"`)
        }
      } else if (!sceneWardrobeOverride && char.wardrobes && Array.isArray(char.wardrobes) && char.wardrobes.length > 0) {
        // Auto-lookup: find wardrobe by scene number when no explicit override
        const sceneNum = sceneIndex !== undefined ? sceneIndex + 1 : undefined
        let foundSceneMatch = false
        if (sceneNum) {
          const matchedWardrobe = char.wardrobes.find(
            (w: { sceneNumbers?: number[]; description: string; accessories?: string; name?: string }) =>
              w.sceneNumbers && w.sceneNumbers.includes(sceneNum)
          )
          if (matchedWardrobe) {
            effectiveWardrobe = matchedWardrobe.description
            effectiveAccessories = matchedWardrobe.accessories
            foundSceneMatch = true
            console.log(`[Scene Image] Auto-matched wardrobe for ${char.name} in scene ${sceneNum}: "${matchedWardrobe.name}"`)
          }
        }
        
        // Fallback to isDefault wardrobe from collection — this uses the richer
        // wardrobe description from the collection instead of the legacy defaultWardrobe string
        if (!foundSceneMatch) {
          const defaultWardrobe = char.wardrobes.find(
            (w: { isDefault?: boolean; description: string; accessories?: string; name?: string }) => w.isDefault
          )
          if (defaultWardrobe && defaultWardrobe.description) {
            effectiveWardrobe = defaultWardrobe.description
            effectiveAccessories = defaultWardrobe.accessories
            console.log(`[Scene Image] Using isDefault wardrobe from collection for ${char.name}: "${defaultWardrobe.name}" (description: ${defaultWardrobe.description.substring(0, 60)}...)`)
          }
        }
      }

      const wardrobeOverrides = body.wardrobeTextOverrides as Record<string, string> | undefined
      if (wardrobeOverrides && char.name && wardrobeOverrides[char.name]?.trim()) {
        effectiveWardrobe = wardrobeOverrides[char.name].trim()
        console.log(`[Scene Image] Using wardrobe text override for ${char.name}`)
      }
      
      // Strip clothing descriptors if explicit wardrobe is set to prevent conflicts
      // Example: visionDescription says "wearing a blue suit" but defaultWardrobe says "casual jeans and t-shirt"
      if (effectiveWardrobe) {
        const originalDescription = description
        description = stripClothingDescriptors(description)
        if (description !== originalDescription) {
          console.log(`[Scene Image] Stripped clothing from description for ${char.name} (explicit wardrobe: "${effectiveWardrobe}")`)
          console.log(`[Scene Image]   Original: "${originalDescription}"`)
          console.log(`[Scene Image]   Cleaned:  "${description}"`)
        }
      }
      
      // Identity + wardrobe references — diptych replaces separate identity when available
      const refPair = resolveCharacterReferencePair({
        character: char,
        scene: sceneData as Record<string, unknown>,
        sceneIndex,
        characterWardrobes: effectiveCharacterWardrobes,
        includeWardrobeReferenceImages,
        includeWardrobeDiptych: includeWardrobeDiptych === true,
      })
      const hasWardrobeDiptych = refPair.hasWardrobeDiptych
      const wardrobeDiptychUrl = refPair.wardrobeDiptychUrl
      const identityImageUrl = hasWardrobeDiptych ? undefined : refPair.identityUrl
      const wardrobeImageUrl = includeWardrobeReferenceImages ? refPair.wardrobeUrl : undefined
      const hasDualReferences = refPair.hasDualReferences
      const hasWardrobeOnlyReference = refPair.hasWardrobeOnlyReference
      const hasWardrobeReference = !!(wardrobeImageUrl || hasWardrobeDiptych)
      const hasCostumeReference = hasWardrobeReference

      if (hasWardrobeDiptych) {
        console.log(
          `[Scene Image] ✓ Wardrobe diptych for ${char.name}: LEFT=identity face, RIGHT=wardrobe outfit`
        )
      } else if (hasDualReferences) {
        console.log(
          `[Scene Image] ✓ Dual references for ${char.name}: identity portrait + wardrobe turnaround`
        )
      } else if (hasWardrobeOnlyReference) {
        console.log(
          `[Scene Image] ✓ Wardrobe-only reference for ${char.name} (no identity portrait)`
        )
      }

      console.log(`[Scene Image] Using ${char.visionDescription ? 'Gemini Vision' : 'manual'} description for ${char.name}`)
      
      // Extract age and add explicit age clause
      const ageMatch = description.match(/\b(late\s*)?(\d{1,2})s?\b/i)
      const ageClause = ageMatch ? ` Exact age: ${ageMatch[0]}.` : ''
      
      // Extract key physical features to emphasize in prompt
      const keyFeatures: string[] = []
      
      // Prioritize key features: hairStyle (especially "Bald"), keyFeature, hairColor
      if (char.hairStyle) {
        if (char.hairStyle.toLowerCase() === 'bald') {
          keyFeatures.push('bald head')
        } else if (char.hairColor && char.hairStyle) {
          keyFeatures.push(`${char.hairColor} ${char.hairStyle} hair`)
        } else {
          keyFeatures.push(`${char.hairStyle} hair`)
        }
      }
      
      if (char.keyFeature) {
        keyFeatures.push(char.keyFeature)
      }
      
      if (char.ethnicity && !keyFeatures.some(f => f.toLowerCase().includes(char.ethnicity.toLowerCase()))) {
        // Only add ethnicity if not already mentioned
        keyFeatures.push(char.ethnicity)
      }
      
      console.log(`[Scene Image] Extracted key features for ${char.name}:`, keyFeatures)

      const appearanceSource =
        char.appearanceDescription || char.visionDescription || char.description || ''
      const hairAnchor = buildCharacterHairAnchor({
        hairStyle: char.hairStyle,
        hairColor: char.hairColor,
        appearanceDescription: appearanceSource,
        visionDescription: char.visionDescription,
      })
      const hairDescription =
        buildCharacterHairDescription(char) ??
        (hairAnchor ? hairAnchor.replace(/ matching identity reference$/i, '') : undefined)

      if (!char.hairStyle?.trim() && hairAnchor) {
        console.warn(
          `[Scene Image] ${char.name} missing hairStyle field; using hair anchor extracted from appearance metadata`
        )
      }
      
      // Build wardrobe description if available (using effective wardrobe, which may be overridden)
      // When a costume reference image exists, we minimize wardrobe text since the model sees it
      let wardrobeDescription = ''
      if (effectiveWardrobe && !hasWardrobeReference) {
        // No wardrobe image — full wardrobe text in prompt
        wardrobeDescription = `, wearing ${effectiveWardrobe}`
        if (effectiveAccessories) {
          wardrobeDescription += `, ${effectiveAccessories}`
        }
        console.log(`[Scene Image] ${char.name} wardrobe (text): ${wardrobeDescription}`)
      } else if (effectiveWardrobe && hasWardrobeDiptych) {
        wardrobeDescription =
          ', copy outfit from the RIGHT panel of their wardrobe diptych reference only — do not describe clothing in text'
        console.log(`[Scene Image] ${char.name} wardrobe (diptych ref): text minimized`)
      } else if (effectiveWardrobe && hasWardrobeReference) {
        wardrobeDescription = ', wearing the outfit shown in their wardrobe reference image'
        console.log(`[Scene Image] ${char.name} wardrobe (image ref): text minimized`)
      }

      const diptychReferenceId = wardrobeDiptychUrl ? ++gcsRefIndex : undefined
      const identityReferenceId = identityImageUrl ? ++gcsRefIndex : undefined
      const wardrobeReferenceId = wardrobeImageUrl ? ++gcsRefIndex : undefined
      const hasReferenceImage = !!(diptychReferenceId || identityReferenceId || wardrobeReferenceId)
      const referenceId = diptychReferenceId ?? identityReferenceId ?? wardrobeReferenceId
      
      // subjectTextDescription: metadata for structured API reference payload (not repeated in scene prompt)
      // promptToken: reference-first binding for all prompt text — "person [N]" only when identity ref exists
      let subjectTextDescription: string | undefined
      if (diptychReferenceId || identityReferenceId) {
        subjectTextDescription = char.name || 'person'
      } else if (hasReferenceImage && appearanceSource) {
        subjectTextDescription =
          extractDemographicAnchor(appearanceSource) ||
          createVisualAnchorDescription(char, referenceId ?? idx + 1)
        console.log(
          `[Scene Image] ${char.name} subjectDescription: "${subjectTextDescription}"`
        )
      } else if (hasReferenceImage) {
        subjectTextDescription = createVisualAnchorDescription(char, referenceId ?? idx + 1)
        console.log(
          `[Scene Image] ${char.name} subjectDescription (visual anchor): "${subjectTextDescription}"`
        )
      }
      
      const linkingRefId =
        diptychReferenceId ??
        identityReferenceId ??
        (hasWardrobeOnlyReference ? wardrobeReferenceId : undefined)
      const promptToken = linkingRefId
        ? diptychReferenceId || identityReferenceId
          ? buildIdentityPromptToken(linkingRefId)
          : `person [${linkingRefId}]`
        : undefined
      const linkingDescription = promptToken
      
      if (hasReferenceImage) {
        console.log(
          `[Scene Image] ${char.name} diptychRef: ${diptychReferenceId ?? 'none'}, identityRef: ${identityReferenceId ?? 'none'}, wardrobeRef: ${wardrobeReferenceId ?? 'none'}`
        )
        console.log(`[Scene Image] ${char.name} promptToken (for prompt): "${promptToken}"`)
        console.log(`[Scene Image] ${char.name} subjectDescription (for API): "${subjectTextDescription}"`)
      } else {
        console.log(`[Scene Image] ${char.name} has no reference image, will use text description only`)
      }
      
      return {
        referenceId,
        diptychReferenceId,
        identityReferenceId,
        wardrobeReferenceId,
        name: char.name,
        description: `${description}${ageClause}${wardrobeDescription}`,
        imageUrl: wardrobeDiptychUrl ?? identityImageUrl ?? wardrobeImageUrl,
        wardrobeDiptychImageUrl: wardrobeDiptychUrl,
        identityImageUrl,
        wardrobeImageUrl,
        ethnicity: char.ethnicity,
        keyFeatures: keyFeatures.length > 0 ? keyFeatures : undefined,
        hairDescription,
        hairAnchor,
        hairStyle: char.hairStyle,
        hairColor: char.hairColor,
        defaultWardrobe: hasWardrobeReference ? undefined : effectiveWardrobe,
        wardrobeAccessories: hasWardrobeReference ? undefined : effectiveAccessories,
        hasCostumeReference,
        hasWardrobeDiptych,
        hasDualReferences,
        hasWardrobeOnlyReference,
        linkingDescription,
        promptToken,
        subjectTextDescription,
        appearanceDescription: char.appearanceDescription || char.visionDescription,
      }
    })
    
    // =========================================================================
    // PROMPT GENERATION: AI Intelligence → Rules-based fallback
    // =========================================================================
    
    let optimizedPrompt: string
    let usedAIIntelligence = false
    let aiNegativePromptAdditions: string[] = []
    /** Subset of characterReferences whose refs are sent to the image model (may be filtered after AI prompt). */
    let characterReferencesForImages = characterReferences
    
    if (customPrompt && customPrompt.trim()) {
      let promptBody = customPrompt.trim()
      if (allowTypography) {
        promptBody =
          'Abstract cinematic digital composition with NO people and NO character portraits. ' +
          'Centered title typography is the primary subject. ' +
          promptBody
      }
      // User provided a custom prompt (likely from Prompt Builder, already optimized and possibly edited)
      // Only re-optimize if character references aren't already in the prompt
      const hasCharacterReferences = characterReferences.length > 0 && (() => {
        const hasReferencePattern = 
          characterReferences.some((ref: { name: string }) => {
            const namePattern = new RegExp(`character\\s+${ref.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+appears`, 'i')
            return namePattern.test(promptBody)
          }) &&
          /must\s+match\s+their\s+reference\s+image/i.test(promptBody)
        return hasReferencePattern
      })()
      
      if (hasCharacterReferences || characterReferences.length === 0) {
        optimizedPrompt = promptBody
        console.log('[Scene Image] Using custom prompt from Prompt Builder (preserving user edits)')
      } else {
        optimizedPrompt = optimizePromptForImagen({
          sceneAction: promptBody,
          visualDescription: promptBody,
          characterReferences: characterReferences,
          artStyle: artStyle || 'photorealistic',
          objectReferences: detectedObjectReferences
        })
        console.log('[Scene Image] Added character references to user-edited prompt (re-optimized)')
      }

      const effectiveArtStyle = artStyle || 'photorealistic'
      if (effectiveArtStyle === 'photorealistic') {
        const lower = optimizedPrompt.toLowerCase()
        const hasRealismKeywords =
          lower.includes('photorealistic') ||
          lower.includes('live-action') ||
          lower.includes('live action') ||
          lower.includes('photograph')
        if (!hasRealismKeywords) {
          optimizedPrompt = `${optimizedPrompt.trim()}, ${getArtStylePromptSuffix(effectiveArtStyle)}`
        }
      }
    } else if (effectiveExcludeCharacters) {
      // Scene reference mode: Focus on environment, props, lighting - no people
      const sceneReferencePrefix = `Cinematic establishing shot, empty scene composition. Focus on environment details, lighting, atmosphere, and props. NO PEOPLE in the frame. `
      const sceneReferenceSuffix = ` The image should serve as a reference for scene consistency - capturing the location, time of day, lighting mood, and key props without any characters.`
      
      optimizedPrompt = optimizePromptForImagen({
        sceneAction: sceneReferencePrefix + fullSceneContext + sceneReferenceSuffix,
        visualDescription: fullSceneContext,
        characterReferences: [],
        artStyle: artStyle || 'photorealistic',
        objectReferences: detectedObjectReferences
      })
      console.log('[Scene Image] Building scene reference prompt (excludeCharacters=true)')
    } else if (useAIPrompt && project && sceneData) {
      // =====================================================================
      // AI INTELLIGENCE PATH: Use Gemini to generate a smart, context-aware prompt
      // =====================================================================
      console.log('[Scene Image] Attempting AI-powered prompt intelligence...')
      
      // Detect scene type from heading
      const scenes = project.metadata?.visionPhase?.script?.script?.scenes || []
      const sceneType = detectSceneType(
        sceneData.heading || '',
        fullSceneContext,
        (sceneIndex || 0) + 1,
        scenes.length
      )
      
      // Extract useful direction metadata (lighting, framing, mood)
      const directionMetadata = {
        ...extractDirectionMetadata(sceneData.sceneDirection),
        ...(effectiveShotType ? { framingHint: effectiveShotType } : {}),
      }
      
      // Build film context from project metadata
      const treatment = project.metadata?.visionPhase?.treatment || project.metadata?.treatmentPhase
      const filmContext = {
        title: project.metadata?.title || project.title || undefined,
        logline: treatment?.logline || treatment?.synopsis || undefined,
        genre: treatment?.genre ? (Array.isArray(treatment.genre) ? treatment.genre : [treatment.genre]) : undefined,
        tone: treatment?.tone || undefined,
        visualStyle: treatment?.visualStyle || undefined,
      }
      
      // Build character contexts with resolved wardrobes
      const characterContexts: CharacterContext[] = characterReferences.map((ref: any) => ({
        name: ref.name,
        linkingDescription: ref.promptToken ?? ref.linkingDescription,
        appearanceDescription: ref.appearanceDescription,
        wardrobeDescription: ref.defaultWardrobe,
        wardrobeAccessories: ref.wardrobeAccessories,
        hairDescription: ref.hairAnchor ?? ref.hairDescription,
        hasReferenceImage: !!ref.identityReferenceId || !!ref.wardrobeReferenceId,
        referenceIndex: ref.identityReferenceId ?? ref.wardrobeReferenceId,
        identityReferenceIndex: ref.identityReferenceId,
        wardrobeReferenceIndex: ref.wardrobeReferenceId,
        hasDualReferences: !!ref.hasDualReferences,
        hasCostumeReference: !!ref.hasCostumeReference,
      }))
      
      // Build prop contexts
      const propContexts: PropContext[] = detectedObjectReferences.map((obj: any) => ({
        name: obj.name,
        description: obj.description,
        category: obj.category,
        importance: obj.importance,
        hasReferenceImage: !!obj.imageUrl,
      }))
      
      // Build available location contexts
      const availableLocationsContext: LocationContext[] = projectLocationRefs.map((locRef: any) => ({
        name: locRef.location || locRef.name || 'Unknown location',
        hasReferenceImage: !!locRef.imageUrl,
      }))
      
      // We pass the project references to AI, except if the user explicitly provided them
      const propsToPassToAI = autoDetectObjects 
        ? projectObjectRefs.map((obj: any) => ({
            name: obj.name,
            description: obj.description,
            category: obj.category,
            importance: obj.importance,
            hasReferenceImage: !!obj.imageUrl,
          }))
        : propContexts
        
      const locationsToPassToAI = autoDetectLocations ? availableLocationsContext : (matchedLocationReference ? [{
        name: matchedLocationReference.location || matchedLocationReference.name || 'Unknown location',
        hasReferenceImage: !!matchedLocationReference.imageUrl,
      }] : [])

      const { props: propsWithIndices, locations: locationsWithIndices } =
        assignPropAndLocationReferenceIndices(
          characterContexts,
          propsToPassToAI,
          locationsToPassToAI
        )
      
      // Count total reference images that MIGHT be sent (will be refined after AI selects)
      // We'll update this count later, but for the prompt, we just let it know how many are available
      const totalAvailableRefImages =
        characterReferences.filter(
          (r: any) => r.identityReferenceId || r.wardrobeReferenceId
        ).reduce(
          (sum: number, r: any) =>
            sum + (r.identityReferenceId ? 1 : 0) + (r.wardrobeReferenceId ? 1 : 0),
          0
        ) +
        propsWithIndices.filter((o) => o.hasReferenceImage).length +
        locationsWithIndices.filter((l) => l.hasReferenceImage).length
      
      // Call Gemini intelligence
      const beatForIntelligence =
        isBeatFrame && sceneData
          ? getSceneBeats(sceneData as Record<string, unknown>)[effectiveBeatIndex]
          : undefined

      const aiResult = await generateSceneImagePrompt({
        sceneHeading: sceneData.heading || '',
        sceneAction: fullSceneContext,
        sceneNumber: (sceneIndex || 0) + 1,
        totalScenes: scenes.length,
        filmContext,
        sceneType,
        beatKind: beatKindForIntelligence,
        beatIndex: isBeatFrame ? effectiveBeatIndex : undefined,
        totalBeats: isBeatFrame ? getSceneBeats(sceneData as Record<string, unknown>).length : undefined,
        beatAction: stripAllCues(
          beatForIntelligence?.actionDescription || beatForIntelligence?.line || ''
        ),
        beatRole: beatForIntelligence?.beatRole,
        directionMetadata,
        characters: characterContexts,
        props: propsWithIndices,
        availableLocations: locationsWithIndices,
        artStyle: artStyle || 'photorealistic',
        referenceImageCount: totalAvailableRefImages,
      })

      if (aiResult.negativePromptAdditions?.length) {
        aiNegativePromptAdditions = aiResult.negativePromptAdditions
      }
      
      // Apply AI selections if auto-detect was enabled
      if (aiResult.usedAI) {
        if (autoDetectObjects && aiResult.selectedPropNames && aiResult.selectedPropNames.length > 0) {
          detectedObjectReferences = projectObjectRefs.filter((obj: any) => 
            aiResult.selectedPropNames!.includes(obj.name)
          ).slice(0, 4) // Max 4 objects
          
          console.log(`[Scene Image] AI selected props:`, detectedObjectReferences.map((o: any) => o.name).join(', '))
        }
        
        if (autoDetectLocations && aiResult.selectedLocationName) {
          const matched = projectLocationRefs.find((loc: any) => 
            loc.location === aiResult.selectedLocationName || loc.name === aiResult.selectedLocationName
          )
          if (matched) {
            matchedLocationReference = matched
            console.log(`[Scene Image] AI selected location:`, matched.location || matched.name)
          }
        }
      }
      
      if (aiResult.usedAI && aiResult.prompt) {
        // AI intelligence succeeded — use the AI-generated prompt
        // Wrap it with the linking template for reference image binding
        const charactersWithRefs = characterReferences.filter(
          (ref: any) => ref.identityReferenceId || ref.wardrobeReferenceId
        )
        
        let aiPromptBody = aiResult.prompt
        if (charactersWithRefs.length > 0) {
          aiPromptBody = sanitizePromptForIdentityRefs(aiPromptBody, charactersWithRefs)
          const filteredForPrompt = filterCharactersForPromptRefs(
            charactersWithRefs,
            aiPromptBody,
            aiResult.selectedCharacterNames
          )
          characterReferencesForImages = characterReferences.filter((ref: any) =>
            filteredForPrompt.some((filtered) => filtered.name === ref.name)
          )
          if (filteredForPrompt.length < charactersWithRefs.length) {
            console.log(
              `[Scene Image] Filtered character refs for prompt/images: ${filteredForPrompt.map((r: any) => r.name).join(', ')} (dropped ${charactersWithRefs.length - filteredForPrompt.length})`
            )
          }
          const subjectIntroductions = filteredForPrompt
            .map(
              (ref: any) =>
                ref.promptToken ??
                (ref.identityReferenceId != null
                  ? buildIdentityPromptToken(ref.identityReferenceId)
                  : ref.linkingDescription)
            )
            .join(' and ')
          optimizedPrompt = `Create an image about ${subjectIntroductions} to match the description: ${aiPromptBody}`
        } else {
          optimizedPrompt = aiResult.prompt
        }
        
        usedAIIntelligence = true
        console.log(`[Scene Image] ✓ AI intelligence generated prompt (${optimizedPrompt.length} chars, type: ${sceneType})`)
        console.log(`[Scene Image] AI reasoning: ${aiResult.reasoning || 'none'}`)
      } else {
        // AI failed — fall back to rules-based optimizer
        console.log(`[Scene Image] AI intelligence unavailable, falling back to rules-based optimizer`)
        console.log(`[Scene Image] Fallback reason: ${aiResult.reasoning || 'unknown'}`)
        optimizedPrompt = optimizePromptForImagen({
          sceneAction: fullSceneContext,
          visualDescription: fullSceneContext,
          characterReferences: characterReferences,
          artStyle: artStyle || 'photorealistic',
          objectReferences: detectedObjectReferences
        })
      }
    } else {
      // Rules-based optimizer (no AI, no custom prompt)
      optimizedPrompt = optimizePromptForImagen({
        sceneAction: fullSceneContext,
        visualDescription: fullSceneContext,
        characterReferences: characterReferences,
        artStyle: artStyle || 'photorealistic',
        objectReferences: detectedObjectReferences
      })
      console.log('[Scene Image] Optimized scene description prompt (rules-based)')
      if (detectedObjectReferences.length > 0) {
        console.log('[Scene Image] Included', detectedObjectReferences.length, 'object reference(s) in prompt optimization')
      }
    }

    const photorealisticAnchor = getPhotorealisticPromptAnchor(
      resolvedGen.storyboardQuality,
      artStyle
    )
    if (photorealisticAnchor) {
      optimizedPrompt = `${optimizedPrompt.trim()}. ${photorealisticAnchor}`
    }

    const personTokens = characterReferences
      .map((ref: { promptToken?: string }) => ref.promptToken)
      .filter((token): token is string => !!token)
    const hairCompositionLock = buildHairCompositionLock(fullSceneContext, personTokens)
    if (hairCompositionLock && !optimizedPrompt.includes('do not pull hair back')) {
      optimizedPrompt = `${optimizedPrompt.trim()} ${hairCompositionLock}`.trim()
    }

    const diptychCharacters = characterReferences.filter(
      (cr: { hasWardrobeDiptych?: boolean }) => cr.hasWardrobeDiptych
    )
    if (diptychCharacters.length > 0) {
      const perCharacterDiptychLines = diptychCharacters
        .map((cr: { name: string }) => buildWardrobeDiptychCharacterConsumptionLine(cr.name))
        .join('\n')
      optimizedPrompt = `${optimizedPrompt.trim()}\n\n${WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION}\n${perCharacterDiptychLines}`
      console.log(
        `[Scene Image] Appended wardrobe diptych consumption for: ${diptychCharacters.map((cr: { name: string }) => cr.name).join(', ')}`
      )
    }

    // Validate we have a prompt to send to the model
    if (!optimizedPrompt || !optimizedPrompt.trim()) {
      console.warn('[Scene Image] Missing scene description/prompt. projectId, sceneIndex, scenePrompt/customPrompt are required.')
      return NextResponse.json({
        success: false,
        error: 'Missing scene description. Provide projectId+sceneIndex or a scenePrompt/customPrompt.'
      }, { status: 400 })
    }

    console.log('[Scene Image] Optimized prompt preview:', optimizedPrompt.substring(0, 150))

    const beatLineForExpression =
      isBeatFrame && sceneData
        ? getSceneBeats(sceneData as Record<string, unknown>)[effectiveBeatIndex]?.line
        : undefined
    if (beatLineForExpression) {
      const expressionCue = formatVisualExpressionCue(beatLineForExpression)
      if (expressionCue && !optimizedPrompt.includes('Facial expression:')) {
        optimizedPrompt = `${optimizedPrompt.trim()} ${expressionCue}`
      }
    }

    // Build character references using Blob URLs
    // Filter for characters that have reference images
    const charactersWithImages = characterObjects.filter((c: any) => c.referenceImage)
    const charactersWithoutImages = characterObjects.filter((c: any) => !c.referenceImage)
    
    console.log(`[Scene Image] Character reference status:`, {
      totalCharacters: characterObjects.length,
      withImages: charactersWithImages.length,
      withoutImages: charactersWithoutImages.length,
      withoutImagesNames: charactersWithoutImages.map((c: any) => c.name)
    })
    
    if (charactersWithoutImages.length > 0) {
      console.warn(`[Scene Image] ${charactersWithoutImages.length} character(s) will be included in prompt text only (no reference images):`, 
        charactersWithoutImages.map((c: any) => c.name))
      console.warn('[Scene Image] These characters should have referenceImage saved to database for optimal image generation')
    }
    
    // Build image references — identity and wardrobe are separate slots when both exist
    const imageReferences: Array<{
      referenceId: number
      imageUrl: string
      subjectDescription: string
      refRole: 'identity' | 'wardrobe' | 'wardrobe-diptych'
      characterName: string
    }> = []

    for (const ref of characterReferencesForImages) {
      if (ref.diptychReferenceId && ref.wardrobeDiptychImageUrl) {
        imageReferences.push({
          referenceId: ref.diptychReferenceId,
          imageUrl: ref.wardrobeDiptychImageUrl,
          subjectDescription: ref.subjectTextDescription || `${ref.name} wardrobe diptych`,
          refRole: 'wardrobe-diptych',
          characterName: ref.name,
        })
        continue
      }
      if (ref.identityReferenceId && ref.identityImageUrl) {
        imageReferences.push({
          referenceId: ref.identityReferenceId,
          imageUrl: ref.identityImageUrl,
          subjectDescription: ref.subjectTextDescription || `${ref.name} identity`,
          refRole: 'identity',
          characterName: ref.name,
        })
      }
      if (ref.wardrobeReferenceId && ref.wardrobeImageUrl) {
        imageReferences.push({
          referenceId: ref.wardrobeReferenceId,
          imageUrl: ref.wardrobeImageUrl,
          subjectDescription: `${ref.name} wardrobe`,
          refRole: 'wardrobe',
          characterName: ref.name,
        })
      }
    }

    console.log(`[Scene Image] Using ${imageReferences.length} character reference image(s) for structured API call`)

    // Build character-specific negative prompts based on reference characteristics
    // NOTE: We focus on FACIAL/IDENTITY negatives only, not wardrobe negatives
    // Per Gemini docs: "Use positive descriptions instead of negatives" for better results
    const typographyNegatives = allowTypography
      ? ''
      : 'text overlay, captions, subtitles, dialogue text, speech bubbles, text on image, watermark, logo text, title cards, intertitles, written words, typography overlay, '
    const baseNegativePrompt = `elderly appearance, deeply wrinkled, aged beyond reference, geriatric, wrong age, different facial features, incorrect ethnicity, mismatched appearance, different person, celebrity likeness, child, teenager, youthful appearance, ${typographyNegatives}`.replace(/,\s*$/, '')
    
    const characterSpecificNegatives: string[] = []
    characterObjects.forEach((char: any) => {
      // If reference is bald, exclude hair
      if (char.hairStyle && char.hairStyle.toLowerCase() === 'bald') {
        characterSpecificNegatives.push('hair', 'full head of hair', 'long hair', 'short hair')
      }
      
      // If reference has beard, exclude clean-shaven
      if (char.keyFeature && char.keyFeature.toLowerCase().includes('beard')) {
        characterSpecificNegatives.push('clean-shaven', 'no facial hair', 'shaved')
      }
      
      // If reference shows specific expression, exclude opposite states that would change appearance
      if (char.appearanceDescription && char.appearanceDescription.toLowerCase().includes('smile')) {
        characterSpecificNegatives.push('frowning', 'sad expression', 'angry expression')
      }

      const charRef = characterReferences.find((cr: { name?: string }) => cr.name === char.name)
      characterSpecificNegatives.push(
        ...buildHairStyleNegativeTerms(
          char.hairStyle,
          charRef?.hairDescription || charRef?.hairAnchor
        )
      )
      
      // REMOVED: Wardrobe-specific negatives - using positive reinforcement in prompt instead
      // Gemini docs recommend describing what you WANT, not what to avoid
    })
    
    // Combine base negative prompt with character-specific ones (facial features only)
    const negativePromptParts = [baseNegativePrompt]
    if (characterSpecificNegatives.length > 0) {
      const uniqueNegatives = [...new Set(characterSpecificNegatives)] // Remove duplicates
      negativePromptParts.push(...uniqueNegatives)
    }
    const styleNegativeTerms = getArtStyleNegativeTerms(artStyle)
    if (styleNegativeTerms) {
      negativePromptParts.push(styleNegativeTerms)
    }
    const hasAnyDualRef = characterReferences.some((cr: any) => cr.hasDualReferences)
    const hasAnyDiptychRef = characterReferences.some((cr: any) => cr.hasWardrobeDiptych)
    if (
      hasAnyDualRef &&
      (artStyle || 'photorealistic').trim() === 'photorealistic'
    ) {
      negativePromptParts.push(buildDualReferenceNegativeTerms())
    }
    if (hasAnyDiptychRef) {
      negativePromptParts.push(DIPTYCH_REPRODUCTION_NEGATIVE_PROMPT)
    }
    if (aiNegativePromptAdditions.length) {
      negativePromptParts.push(...aiNegativePromptAdditions)
    }
    const finalNegativePrompt = mergeBeatFrameNegativePrompt(negativePromptParts.join(', '))
    
    console.log(`[Scene Image] Negative prompt includes ${characterSpecificNegatives.length} character-specific exclusions (facial features only)`)

    // Build object reference images for inclusion in generation
    const objectImageReferences = detectedObjectReferences
      .filter((obj: any) => obj.imageUrl)
      .map((obj: any) => ({
        imageUrl: obj.imageUrl,
        name: obj.name || 'prop',
        importance: obj.importance,
      }))
    
    if (objectImageReferences.length > 0) {
      console.log(`[Scene Image] Including ${objectImageReferences.length} object reference image(s):`,
        objectImageReferences.map((o: any) => o.name))
    }

    // Vertex AI image generation (see docs/VERTEX_MEDIA_MIGRATION.md)
    let base64Image: string | null = null
    let generationModelId = 'imagen-3.0-fast-generate-001'
    let generationProvider: 'vertex' | 'fal' = 'vertex'
    let generationAttempt = 0
    const maxGenerationAttempts = 4
    const rateLimitBackoffMs = [5000, 15000, 30000]
    const useVertexGeminiImage =
      imageReferences.length > 0 ||
      objectImageReferences.length > 0 ||
      (matchedLocationReference && matchedLocationReference.imageUrl)
    
    while (generationAttempt < maxGenerationAttempts) {
      try {
        generationAttempt++
        console.log(`[Scene Image] Generation attempt ${generationAttempt}/${maxGenerationAttempts}`)
        
        if (useVertexGeminiImage) {
          console.log(
            `[Scene Image] Using Vertex Gemini Image (tier=${resolvedModelTier || 'designer'}) for reference images`
          )
          
          // Combine character, object, and location reference images (priority-capped)
          const characterRefEntries = buildCharacterReferenceEntries(
            imageReferences,
            characterReferences,
            buildIdentityReferenceLabel,
            buildWardrobeReferenceLabel,
            0,
            buildWardrobeDiptychReferenceLabel
          )
          const propRefEntries = buildPropReferenceEntries(
            objectImageReferences,
            characterRefEntries.length
          )
          const locationRefEntry = buildLocationReferenceEntry(
            matchedLocationReference,
            characterRefEntries.length + propRefEntries.length
          )
          const allPrioritizedRefs = [
            ...characterRefEntries,
            ...propRefEntries,
            ...(locationRefEntry ? [locationRefEntry] : []),
          ]
          const { selected: selectedReferenceImages, dropped: droppedReferenceImages, indexMap } =
            selectReferenceImagesInOrder(
              allPrioritizedRefs,
              MAX_VERTEX_GEMINI_REFERENCE_IMAGES,
              {
                buildIdentityLabel: buildIdentityReferenceLabel,
                buildWardrobeLabel: buildWardrobeReferenceLabel,
                buildDiptychLabel: buildWardrobeDiptychReferenceLabel,
              }
            )

          if (droppedReferenceImages.length > 0) {
            console.log(
              `[Scene Image] Dropped ${droppedReferenceImages.length} reference image(s) (cap=${MAX_VERTEX_GEMINI_REFERENCE_IMAGES}):`,
              droppedReferenceImages.map((r) => r.name).join(', ')
            )
          }

          console.log(
            `[Scene Image] Reference send order: ${selectedReferenceImages
              .map((r) => `${r.sendIndex}=${r.name}`)
              .join(', ')}`
          )

          const allReferenceImages = selectedReferenceImages.map((ref) => ({
            imageUrl: ref.imageUrl,
            name: ref.name,
          }))
          const selectedReferenceUrls = new Set(selectedReferenceImages.map((ref) => ref.imageUrl))
          const cappedObjectImageReferences = objectImageReferences.filter((obj) =>
            selectedReferenceUrls.has(obj.imageUrl)
          )
          const cappedLocationEntry = selectedReferenceImages.find((ref) => ref.role === 'location')
          const cappedLocationReference =
            cappedLocationEntry?.imageUrl &&
            matchedLocationReference?.imageUrl === cappedLocationEntry.imageUrl
              ? matchedLocationReference
              : null
          const cappedImageReferences = selectedReferenceImages
            .filter((entry) => entry.characterName && entry.refRole)
            .map((entry) => {
              const source = imageReferences.find((r) => r.imageUrl === entry.imageUrl)!
              return {
                ...source,
                referenceId: entry.sendIndex!,
                sendIndex: entry.sendIndex!,
              }
            })
          
          console.log(`[Scene Image] Labeled reference images: ${allReferenceImages.map(r => r.name).join(', ')}`)
          
          // Build multimodal prompt with explicit per-image role instructions
          let geminiPrompt = `Generate a cinematic scene image. The following reference images are provided:\n\n`
          
          // Character reference instructions
          if (cappedImageReferences.length > 0) {
            geminiPrompt += `CHARACTER REFERENCES (${cappedImageReferences.length}):\n`
            const hasAnyDual = characterReferences.some((cr: any) => cr.hasDualReferences)
            const hasAnyDiptych = characterReferences.some((cr: any) => cr.hasWardrobeDiptych)
            if (hasAnyDiptych) {
              geminiPrompt += `${WARDROBE_DIPTYCH_CONSUMPTION_INSTRUCTION}\n`
            }
            if (hasAnyDual) {
              geminiPrompt += `${DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK}\n`
              const framingBlock = buildFramingAwareIdentityBlock(effectiveShotType)
              if (framingBlock) {
                geminiPrompt += `${framingBlock}\n`
              }
            }
            cappedImageReferences.forEach((ref) => {
              const matchingCharRef = characterReferences.find(
                (cr: any) => cr.name === ref.characterName
              )
              if (ref.refRole === 'wardrobe-diptych') {
                geminiPrompt += `- Reference image ${ref.referenceId}: ${buildWardrobeDiptychReferenceLabel(ref.characterName)}\n`
                geminiPrompt += `  ${buildWardrobeDiptychCharacterConsumptionLine(ref.characterName)}\n`
                const hairLock =
                  matchingCharRef?.hairAnchor ?? matchingCharRef?.hairDescription
                if (hairLock) {
                  geminiPrompt +=
                    `  Hairstyle lock: ${hairLock} — do not restyle for framing or injuries.\n`
                }
              } else if (ref.refRole === 'identity') {
                geminiPrompt += `${buildIdentityReferencePromptLine(ref.characterName, ref.referenceId)}\n`
                const hairLock =
                  matchingCharRef?.hairAnchor ?? matchingCharRef?.hairDescription
                if (hairLock) {
                  geminiPrompt +=
                    `  Hairstyle lock: ${hairLock} — do not restyle for framing or injuries.\n`
                }
              } else if (matchingCharRef?.hasDualReferences) {
                geminiPrompt += `${buildWardrobeReferencePromptLine(ref.characterName, ref.referenceId)}\n`
              } else {
                geminiPrompt += `- Reference image ${ref.referenceId}: WARDROBE REFERENCE for ${ref.characterName}\n  ${WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION}\n`
              }
            })
            const hasIdentityOnly = characterReferences.some(
              (cr: any) =>
                cr.identityImageUrl &&
                !cr.hasDualReferences &&
                !cr.hasWardrobeOnlyReference &&
                !cr.hasWardrobeDiptych
            )
            if (hasAnyDiptych) {
              geminiPrompt +=
                'Wardrobe diptych refs: LEFT panel = face/identity only; RIGHT panel = outfit/wardrobe only. Do not describe clothing in text — copy outfit from the RIGHT panel.\n\n'
            } else if (hasAnyDual) {
              geminiPrompt +=
                'In the scene prompt, refer to characters with identity refs using ONLY "person [N]" tokens — no ethnicity, age, or appearance adjectives in text.\n\n'
            } else if (hasIdentityOnly) {
              geminiPrompt +=
                'Use identity reference(s) for face, hair, skin tone, age, ethnicity, and body proportions only. Ignore clothing in identity reference images — outfit must come from wardrobe text in the scene prompt.\n\n'
            } else {
              geminiPrompt +=
                'The character(s) MUST match the reference image(s) exactly — same face, ethnicity, age, hair, and facial features.\n\n'
            }
          }
          
          // Object reference instructions
          if (cappedObjectImageReferences.length > 0) {
            const objectNames = cappedObjectImageReferences.map((o: any) => o.name).join(', ')
            geminiPrompt += `PROP REFERENCES: Include these specific props/objects matching their reference images: ${objectNames}.\n\n`
          }
          
          // Location reference instructions
          if (cappedLocationReference?.imageUrl && cappedLocationEntry?.sendIndex) {
            const locationName =
              cappedLocationReference.location ||
              cappedLocationReference.name ||
              'Location'
            geminiPrompt += `${buildLocationReferencePromptLine(locationName, cappedLocationEntry.sendIndex)} Environment: "${locationName}". Match lighting to the scene prompt Global Style Anchor.\n\n`
          }

          const remappedOptimizedPrompt = remapReferenceNumbersInPrompt(optimizedPrompt, indexMap)
          geminiPrompt += `SCENE PROMPT:\n${remappedOptimizedPrompt}\n\n`
          
          geminiPrompt += `CRITICAL REQUIREMENTS:\n`
          geminiPrompt += `- Preserve character identity from identity reference images exactly\n`
          if (hairCompositionLock) {
            geminiPrompt += `- ${hairCompositionLock}\n`
          }
          if (cappedImageReferences.length > 0) {
            const wardrobeReminders = characterReferences
              .filter((cr: any) => cr.defaultWardrobe && !cr.hasWardrobeReference)
              .map((cr: any) => `${cr.name}: "${cr.defaultWardrobe}"`)
            if (wardrobeReminders.length > 0) {
              geminiPrompt += `- WARDROBE MUST BE EXACT: ${wardrobeReminders.join('; ')}\n`
            }
            if (hasAnyDualRef) {
              geminiPrompt += `- ${DUAL_REFERENCE_GLOBAL_PRIORITY_BLOCK}\n`
            }
            const wardrobeOnlyNames = characterReferences
              .filter((cr: any) => cr.hasWardrobeOnlyReference)
              .map((cr: any) => cr.name)
            if (wardrobeOnlyNames.length > 0) {
              geminiPrompt += `- WARDROBE-ONLY REFERENCE: ${wardrobeOnlyNames.join(', ')} — ${WARDROBE_TURNAROUND_CONSUMPTION_INSTRUCTION}\n`
            }
          }
          geminiPrompt += `- No dialogue captions, subtitles, or watermarks\n`
          geminiPrompt += `- Match props and environment to their reference images\n`
          if (cappedLocationReference?.imageUrl) {
            geminiPrompt +=
              '- Location background: match the wide-angle location reference for layout, furniture placement, and color palette\n'
          }
          if ((artStyle || 'photorealistic').trim() === 'photorealistic') {
            geminiPrompt +=
              '- Output must look like a live-action photograph or film frame, NOT illustration, NOT storyboard sketch, NOT cartoon or anime\n'
            const avoidTerms = getArtStyleNegativeTerms(artStyle)
            if (avoidTerms) {
              geminiPrompt += `- AVOID: ${avoidTerms}\n`
            }
          }

          const vertexResult = await generateImageWithVertexKlingFallback({
            prompt: geminiPrompt,
            aspectRatio: '16:9',
            imageSize: effectiveImageSize,
            referenceImages: allReferenceImages,
            negativePrompt: finalNegativePrompt,
            ...(resolvedModelTier ? { modelTier: resolvedModelTier } : {}),
          })

          base64Image = vertexResult.imageBase64
          generationModelId = vertexResult.modelId
          generationProvider = vertexResult.generationProvider
        } else {
          console.log('[Scene Image] Using Vertex AI Imagen (no reference images)')
          // When excludeCharacters is true, force personGeneration to 'dont_allow' for scene reference images
          const effectivePersonGeneration = effectiveExcludeCharacters
            ? 'dont_allow'
            : personGeneration || 'allow_adult'
          base64Image = await generateImageWithGemini(optimizedPrompt, {
            aspectRatio: '16:9',
            numberOfImages: 1,
            imageSize: effectiveImageSize,
            quality: effectiveImagenQuality,
            personGeneration: effectivePersonGeneration,
            negativePrompt: finalNegativePrompt
          })
        }
        
        // Success - break out of retry loop
        if (base64Image) {
          break
        }
        
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        console.error(`[Scene Image] Generation attempt ${generationAttempt} failed:`, errorMessage)

        const errorLower = errorMessage.toLowerCase()
        const isTransientError = isTransientExpressImageError(error)
        const isRateLimitError = isExpressImageRateLimitError(error)
        const status = resolveExpressImageErrorStatus(error)

        if (isTransientError && generationAttempt < maxGenerationAttempts) {
          const retryDelay =
            rateLimitBackoffMs[generationAttempt - 1] ??
            rateLimitBackoffMs[rateLimitBackoffMs.length - 1]
          const retryReason = isRateLimitError
            ? 'Vertex rate limit'
            : status === 504
              ? 'Vertex transient error (504 gateway timeout)'
              : status === 502 || status === 503
                ? `Vertex transient error (HTTP ${status})`
                : 'Vertex transient error'
          console.log(
            `[Scene Image] ${retryReason} (attempt ${generationAttempt}/${maxGenerationAttempts}). Retrying after ${retryDelay}ms...`
          )
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          continue
        }

        const isReferenceImageError =
          !isTransientError &&
          (errorLower.includes('failed to download reference') ||
            errorLower.includes('reference image') ||
            (errorLower.includes('reference') &&
              (errorLower.includes('not found') ||
                errorLower.includes('access') ||
                errorLower.includes('permission'))))

        if (isReferenceImageError && generationAttempt < maxGenerationAttempts) {
          const retryDelay = 1000 * Math.pow(2, generationAttempt - 1)
          console.log(
            `[Scene Image] Reference image access error. Retrying after ${retryDelay}ms...`
          )
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          continue
        }

        throw error
      }
    }
    
    if (!base64Image) {
      throw new Error('Failed to generate image after all retry attempts')
    }

    // Upload to Vercel Blob storage
    const imageUrl = await uploadImageToBlob(
      base64Image,
      `scenes/scene-${Date.now()}.png`
    )

    console.log('[Scene Image] ✓ Image generated and uploaded')

    // Validate character likeness (optional - informational only; skipped during Express batch)
    let validation: any = null
    if (!skipLikenessValidation && characterObjects.length > 0) {
      console.log('[Scene Image] Validating character likeness...')

      // Determine which character to validate (prefer character mentioned in action/visualDesc)
      let primaryCharForValidation = characterObjects[0]

      // ✅ ADD: Skip validation if no valid character
      if (!primaryCharForValidation || !primaryCharForValidation.referenceImage) {
        console.log('[Scene Image] Skipping validation - no character with reference image')
      } else {
      
      const sceneText = `${fullSceneContext || ''}`.toLowerCase()
      for (const char of characterObjects) {
        if (char && char.name && char.referenceImage && sceneText.includes(char.name.toLowerCase())) {
          // ✅ Added char && char.referenceImage check
          primaryCharForValidation = char
          console.log(`[Scene Image] Validating against ${char.name} (featured in scene)`)
          break
        }
      }

      try {
        validation = await validateCharacterLikeness(
          imageUrl,
          primaryCharForValidation.referenceImage!,
          primaryCharForValidation.name
        )

        console.log(`[Image Validator] ${primaryCharForValidation.name} - Matches: ${validation.matches}, Confidence: ${validation.confidence}%`)
        
        // 80% threshold is appropriate for AI-generated likeness (perfect match is rare)
        if (!validation.matches && validation.confidence < 80) {
          console.warn('[Scene Image] ⚠️  Character likeness validation failed (confidence < 80%).')
          console.warn('[Scene Image] Issues:', validation.issues.join(', '))
        } else if (validation.matches) {
          console.log(`[Scene Image] ✓ Character likeness validated (${validation.confidence}% confidence)`)
        }
      } catch (error) {
        console.error('[Scene Image] Validation failed:', error)
      }
      } // Close the else block
    }

    // Calculate workflow sync hashes for tracking staleness
    const basedOnDirectionHash = sceneData ? generateDirectionHash(sceneData) : undefined
    const basedOnReferencesHash = sceneData ? generateImageSourceHash(sceneData) : undefined

    // 3. Charge credits after successful generation
    try {
      await CreditService.charge(
        userId!,
        CREDIT_COST,
        'ai_usage',
        projectId || null,
        { operation: 'imagen_generate', sceneIndex, model: generationModelId }
      )
      creditsCharged = CREDIT_COST
      console.log(`[Scene Image] Charged ${CREDIT_COST} credits to user ${userId}`)
    } catch (chargeError: any) {
      console.error('[Scene Image] Failed to charge credits:', chargeError)
      // Don't fail the request if credit charge fails - image was already generated
    }

    // Get updated balance for response
    let newBalance: number | undefined
    try {
      const breakdown = await CreditService.getCreditBreakdown(userId!)
      newBalance = breakdown.total_credits
    } catch (e) {
      // Ignore balance lookup errors
    }

    // Prepare response based on validation results
    const response: any = {
      success: true,
      imageUrl,
      model: generationModelId,
      quality: quality,
      provider: generationProvider,
      storage: 'vercel-blob',
      // Include hashes for workflow sync tracking
      basedOnDirectionHash,
      basedOnReferencesHash,
      // AI intelligence info
      usedAIIntelligence,
      // Credit info
      creditsCharged: CREDIT_COST,
      creditsBalance: newBalance,
      prompt: optimizedPrompt,
      frameType: isDialogueFrame ? 'dialogue' : isCustomFrame ? 'custom' : 'establishing',
      ...(isDialogueFrame ? { dialogueIndex } : {}),
      ...(isCustomFrame ? { customFrameId } : {}),
    }

    // Add validation info (informational only for storyboards)
    if (validation) {
      response.validationConfidence = validation.confidence
      response.validationPassed = true  // Always pass for storyboards
      response.validationMessage = `Storyboard generated (${validation.confidence}% character similarity - informational only)`
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Scene Image] Error:', error)
    console.error('[Scene Image] Error stack:', error.stack)
    console.error('[Scene Image] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode
    })
    
    // Check if it's a quota error
    const isQuotaError = error.message?.includes('quota') || 
                        error.message?.includes('Quota exceeded') ||
                        error.message?.includes('RESOURCE_EXHAUSTED') ||
                        error.message?.includes('429')
    
    if (isQuotaError) {
      return NextResponse.json({
        success: false,
        error: 'Google Cloud quota limit reached',
        errorType: 'quota',
        googleError: error.message,
        retryable: true,
        documentation: 'https://cloud.google.com/vertex-ai/docs/quotas'
      }, { status: 429 })
    }
    
    // Provide detailed error message to frontend
    const errorMessage = error.message || 'Failed to generate scene image'
    const detailedError = `${errorMessage}${error.code ? ` (Code: ${error.code})` : ''}${error.statusCode ? ` (Status: ${error.statusCode})` : ''}`
    
    return NextResponse.json({
      success: false,
      error: detailedError,
      errorType: 'api',
      errorDetails: {
        originalMessage: error.message,
        code: error.code,
        statusCode: error.statusCode,
        name: error.name
      }
    }, { status: 500 })
  }
}
