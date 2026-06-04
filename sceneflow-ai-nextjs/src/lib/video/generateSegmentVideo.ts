/**
 * Shared Veo 3.1 segment video generation (used by generate-asset and generate-continuous).
 */

import {
  generateProductionVideo,
  waitForProductionVideoCompletion,
  downloadProductionVideo,
  type ProductionVideoResult,
} from '@/lib/gemini/productionVideoClient'
import { uploadVideoToBlob } from '@/lib/storage/blob'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import {
  getMethodWithFallback,
  buildMethodSelectionContext,
  type VideoGenerationMethod,
  type MethodSelectionResult,
} from '@/lib/vision/intelligentMethodSelection'
import { getQualityForMethod } from '@/lib/config/modelConfig'
import { appendFtvTransitionStabilityTokens } from '@/lib/vision/ftvTransitionStability'
import {
  FTV_MINIMAL_NATIVE_AUDIO_HINT,
  narrowPromptForFtvFrameLock,
  neutralizeFtvGuidePrompt,
  extractSpeaksQuotedPerformCue,
  normalizeVeoSuspiciousPunctuation,
} from '@/lib/vision/ftvPromptNormalize'
import { getVideoDurationFromBuffer } from '@/lib/video/serverVideoDuration'
import { separateAudioStemsWithRetry, type StemSeparationResult } from '@/lib/audio/stemSeparation'
import { computeSourceHash } from '@/lib/audio/stemJobs'

export class SegmentVideoRateLimitError extends Error {
  retryAfter: number
  constructor(message: string, retryAfter = 60) {
    super(message)
    this.name = 'SegmentVideoRateLimitError'
    this.retryAfter = retryAfter
  }
}

export class SegmentVideoExtRefRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SegmentVideoExtRefRequiredError'
  }
}

export interface GenerateSegmentVideoInput {
  segmentId: string
  projectId: string
  sceneId: string
  userId: string
  prompt: string
  negativePrompt?: string
  genType?: 'T2V' | 'I2V'
  generationMethod?: VideoGenerationMethod
  startFrameUrl?: string
  endFrameUrl?: string
  sourceVideoUrl?: string
  previousSegmentVeoRef?: string
  previousSegmentAssetUrl?: string
  referenceImages?: Array<{ url: string; type: 'style' | 'character' }>
  sceneImageUrl?: string
  segmentIndex?: number
  totalSegments?: number
  duration?: number
  aspectRatio?: '16:9' | '9:16'
  resolution?: '720p' | '1080p'
  qualityTier?: 'fast' | 'premium'
  guidePrompt?: string
  isEstablishingShot?: boolean
  audioContext?: {
    hasNarration?: boolean
    narrationText?: string
    emotionalTone?: string
    dialogueBeat?: string
    suggestedAtmosphere?: string
  }
  existingStemSourceAudioUrl?: string
  existingStemSourceHash?: string
  existingStemStatus?: string
  existingStemJobId?: string
  /** When true, EXT without a Veo ref fails instead of I2V fallback. */
  requireVeoRefForExt?: boolean
}

export interface GenerateSegmentVideoResult {
  assetUrl: string
  assetType: 'video'
  lastFrameUrl: string | null
  veoVideoRef?: string
  veoVideoRefExpiry?: string
  requestedDurationSeconds?: number
  actualDurationSeconds?: number | null
  methodSelection?: MethodSelectionResult
  stemSeparation?: StemSeparationResult
}

export async function generateSegmentVideoCore(
  input: GenerateSegmentVideoInput
): Promise<GenerateSegmentVideoResult> {
  const {
    segmentId,
    projectId,
    sceneId,
    userId,
    prompt,
    negativePrompt,
    genType = 'I2V',
    generationMethod,
    startFrameUrl,
    endFrameUrl,
    sourceVideoUrl,
    previousSegmentVeoRef,
    previousSegmentAssetUrl,
    referenceImages,
    sceneImageUrl,
    segmentIndex = 0,
    totalSegments = 1,
    duration,
    aspectRatio,
    resolution,
    qualityTier,
    guidePrompt,
    isEstablishingShot = false,
    audioContext,
    existingStemSourceAudioUrl,
    existingStemSourceHash,
    existingStemStatus,
    existingStemJobId,
    requireVeoRefForExt = false,
  } = input

  const methodContext = buildMethodSelectionContext(
    {
      segmentId,
      sequenceIndex: segmentIndex,
      generatedPrompt: prompt,
      isEstablishingShot,
      references: {
        startFrameUrl,
        endFrameUrl,
        characterIds:
          referenceImages?.filter((r) => r.type === 'character').map((_, i) => `char-${i}`) ||
          [],
      },
    },
    { imageUrl: sceneImageUrl },
    previousSegmentAssetUrl
      ? {
          activeAssetUrl: previousSegmentAssetUrl,
          takes: previousSegmentVeoRef ? [{ veoVideoRef: previousSegmentVeoRef }] : [],
        }
      : undefined,
    totalSegments,
    referenceImages?.filter((r) => r.type === 'character').map((r) => r.url) || []
  )

  const requestedMethod = (generationMethod || genType) as VideoGenerationMethod
  const methodSelectionResult = getMethodWithFallback(requestedMethod, methodContext)
  let method = methodSelectionResult.method

  if (method === 'FTV' && (!startFrameUrl?.trim?.() || !endFrameUrl?.trim?.())) {
    const coerced: Exclude<VideoGenerationMethod, 'AUTO'> = startFrameUrl?.trim() ? 'I2V' : 'T2V'
    method = coerced
  }

  const isImageBasedMethod =
    method === 'I2V' ||
    method === 'FTV' ||
    method === 'EXT' ||
    (method === 'REF' && referenceImages && referenceImages.length > 0)

  let effectiveDuration: 4 | 6 | 8 = 8
  if (method === 'EXT') {
    effectiveDuration = 8
  } else {
    const requiresDuration8 =
      method === 'FTV' ||
      (method === 'REF' && referenceImages && referenceImages.length > 0) ||
      resolution === '1080p'
    if (requiresDuration8) {
      effectiveDuration = 8
    } else if (duration) {
      if (duration <= 5) effectiveDuration = 4
      else if (duration <= 7) effectiveDuration = 6
      else effectiveDuration = 8
    }
  }

  const effectiveQualityTier = qualityTier || getQualityForMethod(method)
  const effectiveResolution = method === 'EXT' ? '720p' : resolution || '720p'

  const videoOptions: Record<string, unknown> = {
    aspectRatio: aspectRatio || '16:9',
    resolution: effectiveResolution,
    durationSeconds: effectiveDuration,
    negativePrompt,
    personGeneration: isImageBasedMethod ? 'allow_adult' : 'allow_all',
    quality: effectiveQualityTier,
  }

  if ((method === 'I2V' || method === 'FTV') && startFrameUrl) {
    videoOptions.startFrame = startFrameUrl
  }

  if (method === 'EXT') {
    const veoRefToUse = sourceVideoUrl || previousSegmentVeoRef
    if (veoRefToUse) {
      videoOptions.sourceVideo = veoRefToUse
      videoOptions.forceProvider = 'gemini'
    } else if (requireVeoRefForExt) {
      throw new SegmentVideoExtRefRequiredError(
        'Veo extension requires the previous part’s video reference. Generate earlier parts in order within ~2 days, or regenerate the previous clip.'
      )
    } else if (startFrameUrl) {
      videoOptions.startFrame = startFrameUrl
    }
  } else if (method === 'FTV' && startFrameUrl) {
    videoOptions.startFrame = startFrameUrl
  } else if (method === 'I2V' && startFrameUrl) {
    videoOptions.startFrame = startFrameUrl
  }

  if (method === 'FTV' && endFrameUrl) {
    videoOptions.lastFrame = endFrameUrl
  }

  if (method === 'REF' && referenceImages && referenceImages.length > 0) {
    videoOptions.referenceImages = referenceImages.map((img) => ({
      url: img.url,
      type: img.type,
    }))
  }

  let enhancedPrompt =
    method === 'FTV'
      ? extractSpeaksQuotedPerformCue(prompt) ?? narrowPromptForFtvFrameLock(prompt)
      : prompt
  if (method === 'FTV' && !enhancedPrompt.trim()) {
    enhancedPrompt = 'Natural motion and expression between the two keyframes.'
  }

  if (guidePrompt?.trim()) {
    const gpRaw = guidePrompt.trim()
    const gp = method === 'FTV' ? neutralizeFtvGuidePrompt(gpRaw) : gpRaw
    if (gp) {
      enhancedPrompt = enhancedPrompt.trim() ? `${enhancedPrompt.trim()}\n\n${gp}` : gp
      if (method === 'FTV') {
        enhancedPrompt += `\n\n${FTV_MINIMAL_NATIVE_AUDIO_HINT}`
      } else {
        enhancedPrompt +=
          '\n\nInclude native synchronized audio (dialogue, ambience, and music) matching the descriptions above unless the scene should be silent.'
      }
    }
  }

  if (audioContext && method !== 'FTV') {
    const atmosphericGuidance: string[] = []
    if (audioContext.emotionalTone) {
      atmosphericGuidance.push(`Emotional atmosphere: ${audioContext.emotionalTone}`)
    }
    if (audioContext.suggestedAtmosphere) {
      atmosphericGuidance.push(`Visual mood: ${audioContext.suggestedAtmosphere}`)
    }
    if (audioContext.hasNarration && audioContext.narrationText) {
      atmosphericGuidance.push(
        `Scene accompanies narration about: ${audioContext.narrationText.slice(0, 100)}...`
      )
    }
    if (audioContext.dialogueBeat) {
      atmosphericGuidance.push(`Dialogue moment: ${audioContext.dialogueBeat}`)
    }
    if (atmosphericGuidance.length > 0) {
      const atmosphericText = `[Audio-Visual Sync Context]\n${atmosphericGuidance.join('\n')}`
      enhancedPrompt = `${enhancedPrompt}\n\n${atmosphericText}`
    }
  }

  enhancedPrompt = appendFtvTransitionStabilityTokens(
    method === 'FTV' ? normalizeVeoSuspiciousPunctuation(enhancedPrompt) : enhancedPrompt,
    method,
    segmentIndex
  )

  if (method === 'EXT' && videoOptions.sourceVideo) {
    videoOptions.forceProvider = 'gemini'
  }

  const veoResult = await generateProductionVideo(
    enhancedPrompt,
    videoOptions as Parameters<typeof generateProductionVideo>[1]
  )

  if (veoResult.status === 'FAILED') {
    if (veoResult.error?.toLowerCase().includes('rate limit')) {
      throw new SegmentVideoRateLimitError(
        veoResult.error,
        (veoResult as ProductionVideoResult & { estimatedWaitSeconds?: number })
          .estimatedWaitSeconds || 60
      )
    }
    throw new Error(veoResult.error || 'Video generation failed')
  }

  let finalResult: ProductionVideoResult = veoResult
  if (veoResult.status === 'QUEUED' || veoResult.status === 'PROCESSING') {
    finalResult = await waitForProductionVideoCompletion(
      veoResult.operationName!,
      veoResult.provider,
      240,
      10
    )
    if (finalResult.status === 'FAILED' && finalResult.provider === 'vertex' && finalResult.error) {
      const errorLower = finalResult.error.toLowerCase()
      const isContentPolicyError =
        errorLower.includes('usage guidelines') ||
        errorLower.includes('content policy') ||
        errorLower.includes('safety') ||
        errorLower.includes('policy violation') ||
        errorLower.includes('blocked') ||
        errorLower.includes('prohibited') ||
        finalResult.error.includes('Code 3')
      if (isContentPolicyError) {
        throw new Error(
          `Content Policy Violation: Vertex AI blocked this video request (see safety filters). Details: ${finalResult.error}`
        )
      }
    }
  }

  if (finalResult.status !== 'COMPLETED' || !finalResult.videoUrl) {
    throw new Error(finalResult.error || 'Video generation did not complete')
  }

  let videoBuffer: Buffer | null = null
  if (finalResult.videoUrl.startsWith('file:')) {
    videoBuffer = await downloadProductionVideo(finalResult.videoUrl, finalResult.provider)
    if (!videoBuffer) throw new Error('Failed to download video file')
  } else if (finalResult.videoUrl.startsWith('data:video/')) {
    const base64Match = finalResult.videoUrl.match(/^data:video\/[^;]+;base64,(.+)$/)
    if (!base64Match) throw new Error('Invalid base64 video data format')
    videoBuffer = Buffer.from(base64Match[1], 'base64')
  }

  let actualVideoDurationSeconds: number | null = null
  const probeAndLogDuration = async (buf: Buffer) => {
    const sec = await getVideoDurationFromBuffer(buf)
    if (sec != null) actualVideoDurationSeconds = sec
  }

  let assetUrl: string
  if (videoBuffer) {
    await probeAndLogDuration(videoBuffer)
    assetUrl = await uploadVideoToBlob(
      videoBuffer,
      `segments/${segmentId}-${Date.now()}.mp4`
    )
  } else if (finalResult.videoUrl.startsWith('http')) {
    let fetchUrl = finalResult.videoUrl
    if (finalResult.videoUrl.includes('generativelanguage.googleapis.com')) {
      const apiKey = process.env.GEMINI_API_KEY
      if (apiKey) {
        const url = new URL(finalResult.videoUrl)
        if (!url.searchParams.has('key')) url.searchParams.set('key', apiKey)
        fetchUrl = url.toString()
      }
    }
    const videoResponse = await fetch(fetchUrl)
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video from Veo: ${videoResponse.status}`)
    }
    const fetchedBuf = Buffer.from(await videoResponse.arrayBuffer())
    await probeAndLogDuration(fetchedBuf)
    assetUrl = await uploadVideoToBlob(
      fetchedBuf,
      `segments/${segmentId}-${Date.now()}.mp4`
    )
  } else {
    assetUrl = finalResult.videoUrl
  }

  let lastFrameUrl: string | null = null
  try {
    lastFrameUrl = await extractAndStoreLastFrame(assetUrl, segmentId)
  } catch {
    // non-fatal
  }

  let stemSeparation: StemSeparationResult | undefined
  const stemFeatureEnabled = process.env.STEM_SEPARATION_ENABLED === 'true'
  if (stemFeatureEnabled) {
    try {
      const sourceForStem = assetUrl
      const sourceHash = computeSourceHash(sourceForStem)
      if (
        existingStemStatus === 'complete' &&
        (existingStemSourceHash === sourceHash ||
          existingStemSourceAudioUrl === sourceForStem)
      ) {
        stemSeparation = {
          status: 'skipped',
          provider: (process.env.STEM_SEPARATION_PROVIDER || 'none').toLowerCase(),
          sourceHash,
          sourceAudioUrl: sourceForStem,
          jobId: existingStemJobId,
          error: 'Stem separation skipped: source unchanged and already complete',
        }
      } else {
        stemSeparation = await separateAudioStemsWithRetry(sourceForStem, {
          maxAttempts: 3,
          mode: (process.env.STEM_SEPARATION_MODE || 'async').toLowerCase() as 'sync' | 'async',
          context: { projectId, sceneId, segmentId, userId },
          model: process.env.DEMUCS_MODEL || 'htdemucs_ft',
        })
        stemSeparation = {
          ...stemSeparation,
          sourceHash: stemSeparation.sourceHash || sourceHash,
          sourceAudioUrl: stemSeparation.sourceAudioUrl || sourceForStem,
        }
      }
    } catch (stemError: unknown) {
      stemSeparation = {
        status: 'failed',
        provider: (process.env.STEM_SEPARATION_PROVIDER || 'none').toLowerCase(),
        error:
          stemError instanceof Error
            ? stemError.message
            : 'Stem separation failed unexpectedly',
      }
    }
  } else {
    stemSeparation = { status: 'skipped', provider: 'none' }
  }

  return {
    assetUrl,
    assetType: 'video',
    lastFrameUrl,
    veoVideoRef: finalResult.veoVideoRef,
    veoVideoRefExpiry: finalResult.veoVideoRefExpiry,
    requestedDurationSeconds: effectiveDuration,
    actualDurationSeconds: actualVideoDurationSeconds,
    methodSelection: methodSelectionResult,
    stemSeparation,
  }
}
