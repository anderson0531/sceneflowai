import { NextRequest, NextResponse } from 'next/server'
import { generateImageWithGemini } from '@/lib/gemini/imageClient'
import { getEndpointStatus } from '@/lib/gemini/productionVideoClient'
import { uploadImageToBlob } from '@/lib/storage/blob'
import {
  generateSegmentVideoCore,
  SegmentVideoExtRefRequiredError,
  SegmentVideoRateLimitError,
  KlingSafetyGuardBlockedError,
} from '@/lib/video/generateSegmentVideo'
import { CreditService } from '@/services/CreditService'
import { VIDEO_CREDITS } from '@/lib/credits/creditCosts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isBeatFirstPipelineEnabled, isStoryboardApproved, getSceneBeats } from '@/lib/script/beatMigration'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import type { DetailedSceneDirection } from '@/types/scene-direction'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import {
  VideoGenerationMethod,
  type MethodSelectionResult,
} from '@/lib/vision/intelligentMethodSelection'
import type { StemSeparationResult } from '@/lib/audio/stemSeparation'
import { autoSanitizePrompt } from '@/utils/promptModerator'
import { extractVeoRaiDetailsFromErrorString } from '@/lib/vertexai/safety'
import { normalizeReferenceImages, shouldRelabelRefs, type VeoReferenceImage } from '@/lib/video/normalizeReferenceImages'
import { resolveBeatVideoReferences } from '@/lib/vision/resolveBeatVideoReferences'

export const maxDuration = 300 // 5 minutes for video generation
export const runtime = 'nodejs'

interface GenerateAssetRequest {
  prompt: string
  genType: 'T2V' | 'I2V' | 'T2I' | 'UPLOAD'
  referenceImageIds?: string[]
  startFrameUrl?: string
  endFrameUrl?: string  // Veo 3.1: For Frame-to-Video (FTV) generation with end frame
  sourceVideoUrl?: string  // Veo 3.1: Source video URL for extension mode - Veo handles frame continuity automatically
  referenceImages?: Array<{ url: string; type?: 'style' | 'character'; name?: string; role?: string }> | string[]  // Veo 3.1: Up to 8 reference images
  generationMethod?: 'T2V' | 'I2V' | 'FTV' | 'EXT' | 'REF' | 'AUTO'  // Veo 3.1: Explicit generation method (AUTO = intelligent selection)
  sceneId: string
  projectId: string
  // Optional video settings from prompt builder
  negativePrompt?: string
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
  qualityTier?: 'fast' | 'premium'  // Veo quality tier - FTV benefits from premium
  // Context for intelligent method selection
  segmentIndex?: number
  totalSegments?: number
  sceneImageUrl?: string
  previousSegmentAssetUrl?: string
  previousSegmentVeoRef?: string
  previousSegmentVeoRefExpiry?: string
  isEstablishingShot?: boolean
  // Audio context for atmospheric guidance (Veo 3.1 native dialogue / ambience)
  audioContext?: {
    hasNarration?: boolean
    narrationText?: string
    emotionalTone?: string
    dialogueBeat?: string
    suggestedAtmosphere?: string
  }
  // Guide prompt containing voice/dialogue cues for Veo 3.1 native audio
  // Composed by GuidePromptEditor with proper voice anchors and Veo formatting
  guidePrompt?: string
  existingStemSourceAudioUrl?: string
  existingStemSourceHash?: string
  existingStemStatus?: string
  existingStemJobId?: string
  /** Beat-first: segment source beat for prompt compilation */
  beatId?: string
  /** Full API prompt override — skips server assembly and pre-flight rewrite */
  apiPromptOverride?: string
  /** Opt-in backup engine when Vertex policy blocks. Default false. */
  allowPolicyFallback?: boolean
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  let requestBody: Partial<GenerateAssetRequest> = {}
  try {
    const { segmentId } = await params
    requestBody = await req.json()
    const body = requestBody as GenerateAssetRequest
    let prompt = body.prompt
    let negativePrompt = body.negativePrompt
    let referenceImages = normalizeReferenceImages(
      body.referenceImages as string[] | GenerateAssetRequest['referenceImages'],
    )
    const {
      genType, 
      referenceImageIds, 
      startFrameUrl, 
      endFrameUrl,
      sourceVideoUrl,
      generationMethod,
      sceneId, 
      projectId,
      duration,
      aspectRatio,
      resolution,
      qualityTier,  // User-selected quality tier (FTV defaults to premium)
      // Context for intelligent method selection
      segmentIndex = 0,
      totalSegments = 1,
      sceneImageUrl,
      previousSegmentAssetUrl,
      previousSegmentVeoRef,
      previousSegmentVeoRefExpiry,
      isEstablishingShot = false,
      // Audio context for atmospheric guidance
      audioContext,
      // Guide prompt with voice/dialogue cues for Veo 3.1 native audio
      guidePrompt
      ,
      existingStemSourceAudioUrl,
      existingStemSourceHash,
      existingStemStatus
      ,
      existingStemJobId
      ,
      beatId,
      apiPromptOverride,
      allowPolicyFallback,
    } = body

    // Get user session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!prompt || !genType || !sceneId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, genType, sceneId, projectId' },
        { status: 400 }
      )
    }

    if (isBeatFirstPipelineEnabled()) {
      await sequelize.authenticate()
      const project = await Project.findByPk(projectId)
      const scenes =
        project?.metadata?.visionPhase?.script?.script?.scenes ||
        project?.metadata?.visionPhase?.script?.scenes ||
        []
      const sceneRecord = scenes.find(
        (s: { id?: string; sceneNumber?: number }, idx: number) =>
          s?.id === sceneId || String(s?.sceneNumber) === sceneId || String(idx) === sceneId
      )
      if (sceneRecord && !isStoryboardApproved(sceneRecord as Record<string, unknown>)) {
        return NextResponse.json(
          {
            error: 'Pre-vis must be approved before video generation',
            code: 'STORYBOARD_NOT_APPROVED',
          },
          { status: 403 }
        )
      }

      if (beatId && sceneRecord && (genType === 'T2V' || genType === 'I2V')) {
        const beats = getSceneBeats(sceneRecord as Record<string, unknown>)
        const beat = beats.find((b) => b.beatId === beatId)
        if (beat) {
          const artStyleId = resolveProjectArtStyle(project?.metadata)
          const sceneDirection =
            (sceneRecord as { sceneDirection?: unknown; detailedDirection?: unknown })
              .sceneDirection ??
            (sceneRecord as { detailedDirection?: unknown }).detailedDirection ??
            null
          const compiled = compileBeatVideoPromptFromDirection(
            beat,
            sceneDirection as DetailedSceneDirection | null,
            { artStyleId }
          )
          prompt = compiled.prompt
          negativePrompt = negativePrompt || compiled.negativePrompt
        }
      }
    }

    if (beatId && projectId && shouldRelabelRefs(referenceImages)) {
      try {
        await sequelize.authenticate()
        const projectForRefs = await Project.findByPk(projectId)
        const scenesForRefs =
          projectForRefs?.metadata?.visionPhase?.script?.script?.scenes ||
          projectForRefs?.metadata?.visionPhase?.script?.scenes ||
          []
        const sceneForRefs = scenesForRefs.find(
          (s: { id?: string; sceneNumber?: number }, idx: number) =>
            s?.id === sceneId || String(s?.sceneNumber) === sceneId || String(idx) === sceneId
        )
        const beats = sceneForRefs ? getSceneBeats(sceneForRefs as Record<string, unknown>) : []
        const beat = beats.find((b) => b.beatId === beatId)
        if (beat && sceneForRefs) {
          const resolved = resolveBeatVideoReferences({
            scene: sceneForRefs as Record<string, unknown>,
            beat,
            projectCharacters:
              projectForRefs?.metadata?.visionPhase?.characters ||
              projectForRefs?.metadata?.characters ||
              [],
            locationReferences:
              projectForRefs?.metadata?.visionPhase?.references?.locationReferences || [],
            objectReferences:
              projectForRefs?.metadata?.visionPhase?.references?.objectReferences || [],
          })
          if (resolved.labeledRefs.length > 0) {
            referenceImages = resolved.labeledRefs.map(
              (ref): VeoReferenceImage => ({
                url: ref.url,
                type: ref.type,
                name: ref.name,
                role: ref.role,
              })
            )
            console.log(
              `[Segment Asset Generation] Server-resolved ${referenceImages.length} labeled REF image(s) for beat ${beatId}`
            )
          }
        }
      } catch (relabelError) {
        console.warn(
          '[Segment Asset Generation] Beat reference relabel failed; using client refs:',
          relabelError
        )
      }
    }

    console.log('[Segment Asset Generation] Generating asset for segment:', segmentId, 'Type:', genType)

    let assetUrl: string
    let assetType: 'video' | 'image'
    let lastFrameUrl: string | null = null
    let veoVideoRef: string | undefined = undefined  // Store Veo video reference for video extension
    let veoVideoRefExpiry: string | undefined = undefined  // ISO timestamp when veoVideoRef expires (48 hours)
    let methodSelectionResult: MethodSelectionResult | undefined = undefined
    let stemSeparation: StemSeparationResult | undefined = undefined
    let actualVideoDurationSeconds: number | null = null
    let requestedVideoDurationSeconds: number | undefined = undefined
    let generationProvider: 'vertex' | 'fal' | 'kling' | undefined
    let fallbackModelFamily: 'kling' | undefined
    let wasPolicyFallback: boolean | undefined
    let provenanceId: string | undefined
    let contentHash: string | undefined

    if (genType === 'T2V' || genType === 'I2V') {
      console.log('[Segment Asset Generation] Using Veo 3.1 for video generation')
      console.log('[Segment Asset Generation] Endpoint status:', JSON.stringify(getEndpointStatus()))

      const videoResult = await generateSegmentVideoCore({
        segmentId,
        projectId,
        sceneId,
        userId: String(session.user.id),
        prompt,
        negativePrompt,
        genType,
        generationMethod: generationMethod as VideoGenerationMethod | undefined,
        startFrameUrl,
        endFrameUrl,
        sourceVideoUrl,
        previousSegmentVeoRef,
        previousSegmentVeoRefExpiry,
        previousSegmentAssetUrl,
        referenceImages,
        sceneImageUrl,
        segmentIndex,
        totalSegments,
        duration,
        aspectRatio,
        resolution,
        qualityTier,
        guidePrompt,
        isEstablishingShot,
        audioContext,
        existingStemSourceAudioUrl,
        existingStemSourceHash,
        existingStemStatus,
        existingStemJobId,
        requireVeoRefForExt:
          generationMethod === 'EXT' && !sourceVideoUrl && !previousSegmentVeoRef,
        apiPromptOverride,
        allowPolicyFallback: allowPolicyFallback === true,
      })

      assetUrl = videoResult.assetUrl
      assetType = videoResult.assetType
      lastFrameUrl = videoResult.lastFrameUrl
      veoVideoRef = videoResult.veoVideoRef
      veoVideoRefExpiry = videoResult.veoVideoRefExpiry
      methodSelectionResult = videoResult.methodSelection
      stemSeparation = videoResult.stemSeparation
      actualVideoDurationSeconds = videoResult.actualDurationSeconds ?? null
      requestedVideoDurationSeconds = videoResult.requestedDurationSeconds
      generationProvider = videoResult.generationProvider
      fallbackModelFamily = videoResult.fallbackModelFamily
      wasPolicyFallback = videoResult.wasPolicyFallback
      provenanceId = videoResult.provenanceId
      contentHash = videoResult.contentHash

      if (wasPolicyFallback) {
        const klingCredits =
          (requestedVideoDurationSeconds ?? duration ?? 5) >= 8
            ? VIDEO_CREDITS.KLING_VIDEO_10S
            : VIDEO_CREDITS.KLING_VIDEO_5S
        await CreditService.charge(String(session.user.id), klingCredits, 'ai_usage', projectId, {
          operation:
            generationProvider === 'kling' ? 'direct_kling_video' : 'fal_kling_video',
          segmentId,
          generationProvider: generationProvider ?? 'fal',
        })
      }

    } else if (genType === 'T2I') {
      // Image generation using Gemini API
      const base64Image = await generateImageWithGemini(prompt, {
        aspectRatio: '16:9',
        numberOfImages: 1,
        imageSize: '2K',
        // TODO: Add reference images support when available
      })

      assetUrl = await uploadImageToBlob(
        base64Image,
        `segments/${segmentId}-${Date.now()}.png`
      )
      assetType = 'image'

    } else {
      return NextResponse.json(
        { error: 'UPLOAD type should be handled via upload endpoint' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      segmentId,
      assetUrl,
      assetType,
      lastFrameUrl,
      veoVideoRef,  // Gemini Files API reference for video extension
      veoVideoRefExpiry,  // ISO timestamp when veoVideoRef expires (48 hours from generation)
      status: assetType === 'video' && assetUrl.startsWith('job:') ? 'QUEUED' : 'COMPLETE',
      jobId: assetType === 'video' && assetUrl.startsWith('job:') ? assetUrl.replace('job:', '') : undefined,
      requestedDurationSeconds: requestedVideoDurationSeconds,
      actualDurationSeconds: actualVideoDurationSeconds ?? undefined,
      // Method selection info for UI feedback
      methodSelection: methodSelectionResult ? {
        method: methodSelectionResult.method,
        confidence: methodSelectionResult.confidence,
        reasoning: methodSelectionResult.reasoning,
        warnings: methodSelectionResult.warnings,
      } : undefined,
      stemSeparation,
      generationProvider,
      fallbackModelFamily,
      wasPolicyFallback,
      usedBackupEngine: wasPolicyFallback === true,
      provenanceId,
      contentHash,
    })
  } catch (error: any) {
    console.error('[Segment Asset Generation] Error:', error)

    if (error instanceof SegmentVideoRateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfter: error.retryAfter,
          isRateLimited: true,
        },
        { status: 429 }
      )
    }

    if (error instanceof SegmentVideoExtRefRequiredError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'VEO_EXT_REF_REQUIRED',
        },
        { status: 400 }
      )
    }

    if (error instanceof KlingSafetyGuardBlockedError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'CONTENT_POLICY_VIOLATION',
          blocked: true,
          categories: error.flaggedCategories,
          source: 'kling_hive_guard',
        },
        { status: 422 }
      )
    }
    
    // Parse and simplify Vertex AI error messages
    let errorMessage = error.message || 'Failed to generate asset'
    let statusCode = 500
    let retryAfter: number | undefined = undefined
    
    // Check for rate limit errors first - return 429 not 500
    if (errorMessage.toLowerCase().includes('rate limit')) {
      statusCode = 429
      retryAfter = 60
      errorMessage = 'Rate limit exceeded. Please wait 60 seconds and try again.'
    }
    
    // Extract cleaner error from Vertex AI JSON responses
    if (errorMessage.includes('Vertex AI error')) {
      try {
        // Try to parse the JSON error from Vertex AI
        const jsonMatch = errorMessage.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.error?.message) {
            errorMessage = `Vertex AI: ${parsed.error.message}`
          }
        }
      } catch {
        // Keep original message if parsing fails
      }
    }
    
    // Handle common error types with user-friendly messages
    const originalErrorMessage = errorMessage // Preserve original for details
    // Determine the effective generation method for error context
    const effectiveGenerationMethod = requestBody.generationMethod || requestBody.genType
    const isFTVMethod = effectiveGenerationMethod === 'FTV'
    const hasMultipleFrames = !!(requestBody.startFrameUrl && requestBody.endFrameUrl)
    
    const errLow = errorMessage.toLowerCase()
    if (errorMessage.includes('Content Safety Filter') ||
        errorMessage.includes('Content Policy') ||
        errLow.includes('safety filter') ||
        errorMessage.includes('filtered') ||
        errorMessage.includes('violate') ||
        errorMessage.includes('usage guidelines')) {
      statusCode = 422 // Unprocessable Entity - indicates content issue, not server error

      const hints: string[] = [
        'Vertex reviews the full request: your text plus any start frame, end frame, or reference images. Dramatic abstract visuals are sometimes misread as explosions or harm—even when the frames were AI-generated.',
        'Preflight may show Low Risk while Vertex still blocks — different classifiers. Server uses VEO_SAFETY_SETTING (default block_only_high). Expand “Vertex RAI / safety details” when present to see categories and probabilities.',
        'If you used Frame-to-Video, try Image-to-Video with only the start frame, or swap one of the keyframes.',
        'If you used reference images, try Text-to-Video without them.',
        'You were not charged for a completed clip when the request is blocked; optional wording fixes below are suggestions only.',
      ]
      if (requestBody.allowPolicyFallback !== true) {
        hints.push(
          'Enable "Allow backup engine if blocked" in generation settings to try an alternate video provider when Vertex rejects the prompt.'
        )
      }

      const optionalSanitized: { prompt?: string; guidePrompt?: string } = {}
      const changeAcc: string[] = []
      if (requestBody.prompt?.trim()) {
        const sp = autoSanitizePrompt(requestBody.prompt, { logChanges: false })
        if (sp.wasModified) {
          optionalSanitized.prompt = sp.sanitizedPrompt
          changeAcc.push(...sp.changes)
        }
      }
      if (requestBody.guidePrompt?.trim()) {
        const sg = autoSanitizePrompt(requestBody.guidePrompt, { logChanges: false })
        if (sg.wasModified) {
          optionalSanitized.guidePrompt = sg.sanitizedPrompt
          changeAcc.push(...sg.changes)
        }
      }
      const sanitizationChanges = changeAcc.length > 0 ? changeAcc : undefined
      const optionalSanitizedOut =
        optionalSanitized.prompt || optionalSanitized.guidePrompt ? optionalSanitized : undefined

      if (isFTVMethod || hasMultipleFrames) {
        errorMessage =
          'Content policy: Vertex blocked this generation. For Frame-to-Video, filters often react to the pair of images or the imagined transition—not only your text. Try Image-to-Video with the start frame, change a keyframe, or use optional wording suggestions if they help.'
      } else {
        errorMessage =
          'Content policy: Vertex blocked this generation. The trigger may be your text or a reference/start image. Try optional wording suggestions, remove reference images, or simplify the prompt.'
      }

      const vertexRaiDetails = extractVeoRaiDetailsFromErrorString(originalErrorMessage) || undefined

      return NextResponse.json(
        {
          error: errorMessage,
          retryAfter,
          isRateLimited: false,
          code: 'CONTENT_POLICY_VIOLATION',
          generationMethod: effectiveGenerationMethod,
          isFTVRelated: isFTVMethod || hasMultipleFrames,
          suggestion: isFTVMethod || hasMultipleFrames ? 'RETRY_I2V' : 'REPHRASE_PROMPT',
          retryI2VData:
            (isFTVMethod || hasMultipleFrames) && requestBody.startFrameUrl
              ? {
                  startFrameUrl: requestBody.startFrameUrl,
                  prompt: requestBody.prompt,
                }
              : undefined,
          hints,
          optionalSanitized: optionalSanitizedOut,
          sanitizationChanges,
          vertexDetails: originalErrorMessage,
          /** Parsed categories / probabilities when includeRaiReason is enabled on Veo */
          vertexRaiDetails,
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        },
        { status: 422 }
      )
    } else if (errorMessage.includes('Invalid JSON payload') || errorMessage.includes('INVALID_ARGUMENT')) {
      errorMessage = 'API Error: Invalid request format. Please try a different generation method.'
    } else if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = 'Rate limit reached. Please wait a moment and try again.'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
      errorMessage = 'Request timed out. The video generation is taking too long. Please try again.'
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        retryAfter,
        isRateLimited: statusCode === 429,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: statusCode }
    )
  }
}


