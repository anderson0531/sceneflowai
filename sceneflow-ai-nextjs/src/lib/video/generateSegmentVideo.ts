/**
 * Shared Veo 3.1 segment video generation (used by generate-asset and generate-continuous).
 */

import { downloadProductionVideo } from '@/lib/gemini/productionVideoClient'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import { ContentPolicyExhaustedError } from '@/lib/generation/contentPolicy'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
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
  generationProvider?: 'vertex' | 'kling'
  wasPolicyFallback?: boolean
  vertexPolicyAttempts?: number
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

  let generationProvider: 'vertex' | 'kling' = 'vertex'
  let wasPolicyFallback = false
  let vertexPolicyAttempts = 0

  let videoBuffer: Buffer | null = null
  let finalVeoRef: string | undefined
  let finalVeoRefExpiry: string | undefined

  try {
    const genResult = await generateVideoWithVeoKlingFallback({
      prompt: enhancedPrompt,
      negativePrompt,
      method,
      videoOptions: videoOptions as VideoGenerationOptions,
    })

    generationProvider = genResult.generationProvider
    wasPolicyFallback = genResult.wasPolicyFallback
    vertexPolicyAttempts = genResult.vertexAttempts

    if (genResult.status === 'FAILED') {
      const err = genResult.error || 'Video generation failed'
      if (err.toLowerCase().includes('rate limit')) {
        throw new SegmentVideoRateLimitError(err, 60)
      }
      throw new Error(err)
    }

    videoBuffer = genResult.videoBuffer ?? null
    finalVeoRef = genResult.veoVideoRef
    finalVeoRefExpiry = genResult.veoVideoRefExpiry

    if (!videoBuffer && genResult.videoUrl) {
      if (genResult.videoUrl.startsWith('data:video/')) {
        const base64Match = genResult.videoUrl.match(/^data:video\/[^;]+;base64,(.+)$/)
        if (!base64Match) throw new Error('Invalid base64 video data format')
        videoBuffer = Buffer.from(base64Match[1], 'base64')
      } else if (genResult.videoUrl.startsWith('file:')) {
        videoBuffer = await downloadProductionVideo(
          genResult.videoUrl.replace(/^file:/, ''),
          generationProvider === 'kling' ? 'vertex' : 'vertex'
        )
      }
    }
  } catch (e) {
    if (e instanceof ContentPolicyExhaustedError) {
      throw new Error(
        `Content Policy Violation: ${e.message}`
      )
    }
    throw e
  }

  if (!videoBuffer) {
    throw new Error('Video generation did not produce output')
  }

  let actualVideoDurationSeconds: number | null = null
  const probeAndLogDuration = async (buf: Buffer) => {
    const sec = await getVideoDurationFromBuffer(buf)
    if (sec != null) actualVideoDurationSeconds = sec
  }

  await probeAndLogDuration(videoBuffer)
  const assetUrl = await uploadVideoToBlob(
    videoBuffer,
    `segments/${segmentId}-${Date.now()}.mp4`
  )

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
    veoVideoRef: finalVeoRef,
    veoVideoRefExpiry: finalVeoRefExpiry,
    generationProvider,
    wasPolicyFallback,
    vertexPolicyAttempts,
    requestedDurationSeconds: effectiveDuration,
    actualDurationSeconds: actualVideoDurationSeconds,
    methodSelection: methodSelectionResult,
    stemSeparation,
  }
}
