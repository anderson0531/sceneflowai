/**
 * Shared Veo 3.1 segment video generation (used by generate-asset and generate-continuous).
 */

import { downloadProductionVideo } from '@/lib/gemini/productionVideoClient'
import { generateVideoWithVeoKlingFallback } from '@/lib/generation/veoWithKlingFallback'
import { ContentPolicyExhaustedError } from '@/lib/generation/contentPolicy'
import { neutralizePromptForVeo } from '@/lib/generation/preflightPromptGuard'
import {
  moderateKlingVideoBuffer,
  KlingSafetyGuardBlockedError,
} from '@/lib/moderation/klingSafetyGuard'
import { AssetProvenanceService } from '@/services/AssetProvenanceService'
import type { VideoGenerationOptions } from '@/lib/gemini/videoClient'
import { uploadVideoToBlob } from '@/lib/storage/blob'
import { extractAndStoreLastFrame } from '@/lib/videoUtils'
import {
  getMethodWithFallback,
  buildMethodSelectionContext,
  type VideoGenerationMethod,
  type MethodSelectionResult,
} from '@/lib/vision/intelligentMethodSelection'
import { getQualityForMethod, DEFAULT_VEO_CLIP_DURATION, type VeoClipDuration } from '@/lib/config/modelConfig'
import { sanitizeOmniRefLabel } from '@/lib/gemini/cleanOmniRefPrompt'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import { veoRefsToPrioritized } from '@/lib/video/normalizeReferenceImages'
import { isVeoVideoRefValid } from '@/lib/gemini/geminiStudioVideoClient'
import { getVideoDurationFromBuffer } from '@/lib/video/serverVideoDuration'
import { separateAudioStemsWithRetry, type StemSeparationResult } from '@/lib/audio/stemSeparation'
import { computeSourceHash } from '@/lib/audio/stemJobs'
import { buildSegmentEnhancedPrompt } from '@/lib/video/buildSegmentEnhancedPrompt'
import { isAggregatorEnabled } from '@/lib/aggregator/config'
import { generateVideoWithAggregator } from '@/lib/aggregator/generateVideoWithAggregator'
import { getDefaultAggregatorModelId } from '@/lib/aggregator/modelRegistry'
import { uploadVideo as uploadVideoToGCS } from '@/lib/storage/gcsAssets'
import { isKlingConfigured, getKlingDefaultModel, resolveKlingQuality } from '@/lib/kling/config'
import {
  generateVideoWithKlingVeoFallback,
  KlingVideoAsyncSubmittedError,
} from '@/lib/kling/klingWithVeoFallback'
import type {
  KlingQuality,
  KlingShotType,
  KlingMultiPromptEntry,
  KlingCreativePreset,
} from '@/lib/kling/types'
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
  previousSegmentVeoRefExpiry?: string
  previousSegmentAssetUrl?: string
  referenceImages?: Array<{ url: string; type: 'style' | 'character'; name?: string; role?: string }>
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
  /** When set, used as the full API prompt (skips assembly and pre-flight rewrite). */
  apiPromptOverride?: string
  /** Opt-in Vertex Veo backup when Kling policy blocks. Default true on Kling path. */
  allowPolicyFallback?: boolean
  /** Primary video backend: kling (default), vertex, or multiplatform aggregator. */
  videoProvider?: 'kling' | 'vertex' | 'aggregator'
  /** Aggregator model id from modelRegistry (e.g. kling-2.6). */
  videoModel?: string
  /** Direct Kling model (e.g. kling-v3-omni). */
  klingModel?: string
  klingQuality?: KlingQuality
  cfgScale?: number
  sound?: boolean
  watermarkEnabled?: boolean
  elementList?: string[]
  voiceList?: Array<{ voice_id: string; name?: string }>
  multiShot?: boolean
  shotType?: KlingShotType
  multiPrompt?: KlingMultiPromptEntry[]
  preset?: KlingCreativePreset
  allowVeoFallback?: boolean
  expressMode?: boolean
}

export class SegmentVideoKlingNotConfiguredError extends Error {
  constructor() {
    super(
      'Direct Kling API is not configured on the server (KLING_API_KEY or KLING_ACCESS_KEY + KLING_SECRET_KEY missing)'
    )
    this.name = 'SegmentVideoKlingNotConfiguredError'
  }
}

export class SegmentVideoKlingAsyncError extends Error {
  jobId: string
  taskId: string
  modelName: string

  constructor(jobId: string, taskId: string, modelName: string) {
    super('Kling video job submitted — awaiting webhook completion')
    this.name = 'SegmentVideoKlingAsyncError'
    this.jobId = jobId
    this.taskId = taskId
    this.modelName = modelName
  }
}

export class SegmentVideoAggregatorAsyncError extends Error {
  jobId: string
  vendor: string
  vendorModelId: string

  constructor(jobId: string, vendor: string, vendorModelId: string) {
    super('Aggregator video job submitted — awaiting webhook completion')
    this.name = 'SegmentVideoAggregatorAsyncError'
    this.jobId = jobId
    this.vendor = vendor
    this.vendorModelId = vendorModelId
  }
}

export class SegmentVideoAggregatorNotConfiguredError extends Error {
  constructor() {
    super(
      'Multiplatform video aggregator is not configured on the server (VIDEO_AGGREGATOR_API_KEY missing)'
    )
    this.name = 'SegmentVideoAggregatorNotConfiguredError'
  }
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
  generationProvider?: 'vertex' | 'fal' | 'kling' | 'aggregator'
  fallbackModelFamily?: 'kling'
  wasPolicyFallback?: boolean
  usedBackupEngine?: boolean
  vertexPolicyAttempts?: number
  provenanceId?: string
  contentHash?: string
  videoModel?: string
  billingModelId?: string
  modelUpgraded?: boolean
  effectiveAggregatorType?: string
  upgradeLabel?: string
  aggregatorVendor?: string
  aggregatorJobId?: string
  klingJobId?: string
  wasVeoFallback?: boolean
  klingModel?: string
  asyncPending?: boolean
}

export { KlingSafetyGuardBlockedError } from '@/lib/moderation/klingSafetyGuard'

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
    previousSegmentVeoRefExpiry,
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
    apiPromptOverride,
    allowPolicyFallback = false,
    videoProvider = 'kling',
    videoModel,
    klingModel,
    klingQuality,
    cfgScale,
    sound,
    watermarkEnabled,
    elementList,
    voiceList,
    multiShot,
    shotType,
    multiPrompt,
    preset,
    allowVeoFallback,
    expressMode,
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

  let effectiveDuration: VeoClipDuration = DEFAULT_VEO_CLIP_DURATION
  let klingDurationSeconds = duration ?? (expressMode ? 10 : 10)

  if (videoProvider === 'kling') {
    klingDurationSeconds = Math.min(15, Math.max(3, duration ?? (expressMode ? 10 : 10)))
    effectiveDuration = klingDurationSeconds <= 5 ? 4 : klingDurationSeconds <= 7 ? 6 : klingDurationSeconds <= 9 ? 8 : 10
  } else if (method === 'EXT') {
    effectiveDuration = DEFAULT_VEO_CLIP_DURATION
  } else {
    const requiresStabilityDuration =
      method === 'FTV' ||
      (method === 'REF' && referenceImages && referenceImages.length > 0) ||
      resolution === '1080p'
    if (requiresStabilityDuration) {
      effectiveDuration = DEFAULT_VEO_CLIP_DURATION
    } else if (duration) {
      if (duration <= 5) effectiveDuration = 4
      else if (duration <= 7) effectiveDuration = 6
      else if (duration <= 9) effectiveDuration = 8
      else effectiveDuration = 10
    }
  }

  const effectiveQualityTier = qualityTier || getQualityForMethod(method)
  const effectiveResolution =
    videoProvider === 'kling'
      ? (klingQuality === 'std' ? '720p' : klingQuality === '4k' ? '4k' : resolution || '1080p')
      : method === 'EXT'
        ? '720p'
        : resolution || '720p'

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
    let veoRefToUse = sourceVideoUrl || previousSegmentVeoRef
    if (
      veoRefToUse &&
      previousSegmentVeoRefExpiry &&
      !isVeoVideoRefValid(previousSegmentVeoRefExpiry)
    ) {
      console.warn('[Segment Video] Veo extension ref expired (48h cache window)')
      if (requireVeoRefForExt) {
        throw new SegmentVideoExtRefRequiredError(
          'Veo extension reference expired (~48h). Regenerate the previous part in the chain, then retry.'
        )
      }
      veoRefToUse = undefined
    }
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

  let referenceFallbackPrompt: string | undefined

  if (method === 'REF' && referenceImages && referenceImages.length > 0) {
    const prioritized = veoRefsToPrioritized(referenceImages)

    videoOptions.referenceImages = referenceImages.map((img, i) => ({
      url: img.url,
      type: img.type,
      label: sanitizeOmniRefLabel(
        neutralizeReferenceConflictPrompt(img.name || prioritized[i]?.name || '')
      ),
      role: prioritized[i]?.role,
    }))
  }

  const built = buildSegmentEnhancedPrompt({
    prompt,
    guidePrompt,
    method,
    referenceImages,
    segmentIndex,
    audioContext,
  })
  referenceFallbackPrompt = built.referenceFallbackPrompt
  let enhancedPrompt = built.enhancedPrompt

  const override = apiPromptOverride?.trim()
  const selectedVideoModel = videoModel || getDefaultAggregatorModelId()
  const selectedKlingModel = klingModel || getKlingDefaultModel()
  const resolvedKlingQuality =
    klingQuality || resolveKlingQuality(undefined, effectiveResolution as '720p' | '1080p' | '4k')

  if (videoProvider === 'kling' && !isKlingConfigured()) {
    throw new SegmentVideoKlingNotConfiguredError()
  }

  if (videoProvider === 'aggregator' && !isAggregatorEnabled()) {
    throw new SegmentVideoAggregatorNotConfiguredError()
  }

  const useAggregator =
    videoProvider === 'aggregator' && isAggregatorEnabled()

  const useKling = videoProvider === 'kling' && isKlingConfigured()

  if (override) {
    enhancedPrompt = override
  } else if (!useAggregator && !useKling) {
    const preflight = await neutralizePromptForVeo({
      prompt: enhancedPrompt,
      guidePrompt,
      method,
      startFrameUrl:
        typeof videoOptions.startFrame === 'string' ? videoOptions.startFrame : undefined,
    })
    if (preflight.wasRewritten) {
      console.log(
        `[Segment Video] Pre-flight rewrite applied (risk=${preflight.riskScore.level}, triggers=${preflight.riskScore.triggers.join(',')})`
      )
    }
    enhancedPrompt = preflight.prompt
  }

  let generationProvider: 'vertex' | 'fal' | 'kling' | 'aggregator' = 'kling'
  let fallbackModelFamily: 'kling' | undefined
  let wasPolicyFallback = false
  let wasVeoFallback = false
  let vertexPolicyAttempts = 0
  let klingJobId: string | undefined
  let responseKlingModel: string | undefined
  let aggregatorVendor: string | undefined
  let billingModelId: string | undefined
  let modelUpgraded: boolean | undefined
  let effectiveAggregatorType: string | undefined
  let upgradeLabel: string | undefined

  let videoBuffer: Buffer | null = null
  let finalVeoRef: string | undefined
  let finalVeoRefExpiry: string | undefined

  if (useAggregator) {
    const aggResult = await generateVideoWithAggregator({
      prompt: enhancedPrompt,
      negativePrompt,
      method,
      videoModel: selectedVideoModel,
      durationSeconds: effectiveDuration,
      aspectRatio: (aspectRatio || '16:9') as '16:9' | '9:16',
      startFrameUrl:
        typeof videoOptions.startFrame === 'string' ? videoOptions.startFrame : undefined,
      endFrameUrl:
        typeof videoOptions.lastFrame === 'string' ? videoOptions.lastFrame : undefined,
      referenceImages,
      segmentId,
      projectId,
      sceneId,
      userId,
    })

    if (aggResult.mode === 'async') {
      throw new SegmentVideoAggregatorAsyncError(
        aggResult.jobId,
        aggResult.vendor,
        aggResult.vendorModelId
      )
    }

    videoBuffer = aggResult.videoBuffer
    generationProvider = 'aggregator'
    aggregatorVendor = aggResult.vendor
    billingModelId = aggResult.billingModelId
    modelUpgraded = aggResult.modelUpgraded
    effectiveAggregatorType = aggResult.effectiveType
    upgradeLabel = aggResult.upgradeLabel
    console.log(
      `[Segment Video] Aggregator ${aggResult.vendor} completed job ${aggResult.jobId} model=${selectedVideoModel}${modelUpgraded ? ` (upgraded to ${billingModelId})` : ''}`
    )
  } else if (useKling) {
    console.log(`[Segment Video] Routing to Kling (model=${selectedKlingModel})`)
    try {
      const genResult = await generateVideoWithKlingVeoFallback({
        prompt: enhancedPrompt,
        negativePrompt,
        method,
        videoOptions: {
          ...(videoOptions as VideoGenerationOptions),
          durationSeconds: klingDurationSeconds as VeoClipDuration,
        },
        guidePrompt,
        referenceFallbackPrompt,
        allowVeoFallback: allowVeoFallback ?? allowPolicyFallback ?? false,
        klingModel: selectedKlingModel,
        klingQuality: resolvedKlingQuality,
        cfgScale,
        sound,
        watermarkEnabled,
        elementList,
        voiceList,
        multiShot,
        shotType,
        multiPrompt,
        preset,
        segmentId,
        projectId,
        sceneId,
        userId,
      })

      generationProvider = genResult.generationProvider
      wasVeoFallback = genResult.wasVeoFallback
      wasPolicyFallback = genResult.wasVeoFallback
      vertexPolicyAttempts = genResult.klingAttempts
      responseKlingModel = genResult.klingModel || selectedKlingModel
      klingJobId = genResult.klingJobId

      if (genResult.status === 'FAILED') {
        const err = genResult.error || 'Kling video generation failed'
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
        }
      }
    } catch (e) {
      if (e instanceof KlingVideoAsyncSubmittedError) {
        throw new SegmentVideoKlingAsyncError(e.jobId, e.taskId, selectedKlingModel)
      }
      throw e
    }
  } else try {
    console.log('[Segment Video] Routing to Vertex')
    const genResult = await generateVideoWithVeoKlingFallback({
      prompt: enhancedPrompt,
      negativePrompt,
      method,
      videoOptions: videoOptions as VideoGenerationOptions,
      referenceFallbackPrompt,
      allowPolicyFallback,
    })

    generationProvider = genResult.generationProvider
    fallbackModelFamily = genResult.fallbackModelFamily
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
          'vertex'
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

  // Non-Vertex output: mandatory Hive audit before storage.
  if (generationProvider !== 'vertex') {
    await moderateKlingVideoBuffer(videoBuffer, {
      userId,
      projectId,
      sceneId,
      segmentId,
      segmentIndex,
    })
  }

  const provenanceStamp = await AssetProvenanceService.stampVideoAsset({
    videoBuffer,
    userId,
    projectId,
    sceneId,
    segmentId,
    generationProvider,
    wasPolicyFallback,
    vertexPolicyAttempts: vertexPolicyAttempts,
    videoModel: generationProvider === 'aggregator' ? selectedVideoModel : undefined,
    aggregatorVendor,
  })

  let actualVideoDurationSeconds: number | null = null
  const probeAndLogDuration = async (buf: Buffer) => {
    const sec = await getVideoDurationFromBuffer(buf)
    if (sec != null) actualVideoDurationSeconds = sec
  }

  await probeAndLogDuration(videoBuffer)
  const assetUrl =
    generationProvider === 'aggregator'
      ? await uploadVideoToGCS(
          videoBuffer,
          `segments/${segmentId}-${Date.now()}.mp4`,
          projectId
        )
      : await uploadVideoToBlob(
          videoBuffer,
          `segments/${segmentId}-${Date.now()}.mp4`,
          projectId,
          provenanceStamp.gcsMetadata
        )

  await AssetProvenanceService.attachAssetUrl(provenanceStamp.provenanceId, assetUrl)
  await AssetProvenanceService.scheduleC2paSigning({
    provenanceId: provenanceStamp.provenanceId,
    assetUrl,
    contentHash: provenanceStamp.contentHash,
  })

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
    fallbackModelFamily,
    wasPolicyFallback,
    usedBackupEngine: wasPolicyFallback,
    vertexPolicyAttempts,
    provenanceId: provenanceStamp.provenanceId,
    contentHash: provenanceStamp.contentHash,
    requestedDurationSeconds:
      videoProvider === 'kling' ? klingDurationSeconds : effectiveDuration,
    actualDurationSeconds: actualVideoDurationSeconds,
    methodSelection: methodSelectionResult,
    stemSeparation,
    videoModel:
      generationProvider === 'aggregator'
        ? selectedVideoModel
        : generationProvider === 'kling'
          ? responseKlingModel
          : undefined,
    billingModelId,
    modelUpgraded,
    effectiveAggregatorType,
    upgradeLabel,
    aggregatorVendor,
    klingJobId,
    wasVeoFallback,
    klingModel: responseKlingModel,
  }
}
