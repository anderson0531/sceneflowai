/**
 * KlingSafetyGuard — mandatory Hive audit for Fal/Kling fallback output only.
 * Vertex path never invokes this module.
 */

import { HiveModerationService, type HiveModerationResult } from '@/services/HiveModerationService'
import { ADMIN_REVIEW } from '@/lib/moderation/moderationSampling'
import { isFalKlingFallbackEnabled } from '@/lib/generation/contentPolicy'
import { recordUserModerationViolation } from '@/lib/moderation/userModerationViolations'
import { uploadToGCS, deleteFromGCS } from '@/lib/storage/gcsAssets'

const KLING_LIKENESS_BLOCK_THRESHOLD = 0.85

const DEEPFAKE_BLOCK_CLASSES = [
  'deepfake',
  'non_consensual',
  'non-consensual',
  'synthetic_face',
  'face_swap',
]

export class KlingSafetyGuardBlockedError extends Error {
  readonly flaggedCategories: string[]
  readonly hiveResult?: HiveModerationResult

  constructor(message: string, flaggedCategories: string[], hiveResult?: HiveModerationResult) {
    super(message)
    this.name = 'KlingSafetyGuardBlockedError'
    this.flaggedCategories = flaggedCategories
    this.hiveResult = hiveResult
  }
}

export interface KlingSafetyGuardContext {
  userId: string
  projectId: string
  sceneId?: string
  segmentId: string
  segmentIndex?: number
}

export function isKlingHiveGuardEnabled(): boolean {
  if (process.env.KLING_HIVE_GUARD_ENABLED === 'false') return false
  if (process.env.KLING_HIVE_GUARD_ENABLED === 'true') return true
  return isFalKlingFallbackEnabled() && HiveModerationService.isConfigured()
}

/**
 * Stricter blocking rules for Kling fallback output (blocking mode, not validation).
 */
export function evaluateKlingHiveResult(result: HiveModerationResult): {
  blocked: boolean
  categories: string[]
} {
  if (!result.allowed || result.action === 'blocked') {
    return {
      blocked: true,
      categories: result.flaggedCategories.length
        ? result.flaggedCategories
        : ['policy_violation'],
    }
  }

  const blockedCategories: string[] = []
  const classes = result.hiveClasses ?? []

  for (const cls of classes) {
    const classLower = cls.class.toLowerCase()

    if (DEEPFAKE_BLOCK_CLASSES.some((d) => classLower.includes(d)) && cls.score > 0.5) {
      blockedCategories.push('deepfake')
    }

    if (
      (classLower.includes('likeness') ||
        classLower.includes('celebrity') ||
        classLower.includes('face_match')) &&
      cls.score >= KLING_LIKENESS_BLOCK_THRESHOLD
    ) {
      blockedCategories.push('non_consensual_likeness')
    }

    if (
      (classLower === 'violence' ||
        classLower === 'weapon' ||
        classLower === 'firearm') &&
      cls.score >= ADMIN_REVIEW.thresholds.adminReview
    ) {
      blockedCategories.push('violence')
    }
  }

  if (blockedCategories.length > 0) {
    return { blocked: true, categories: [...new Set(blockedCategories)] }
  }

  return { blocked: false, categories: [] }
}

/**
 * Upload Kling output to a private staging prefix, run Hive visual moderation, drop on block.
 */
export async function moderateKlingVideoBuffer(
  videoBuffer: Buffer,
  context: KlingSafetyGuardContext
): Promise<void> {
  if (!isKlingHiveGuardEnabled()) {
    return
  }

  if (!HiveModerationService.isConfigured()) {
    throw new KlingSafetyGuardBlockedError(
      'Kling output moderation unavailable: Hive AI is not configured',
      ['moderation_unavailable']
    )
  }

  const stagingFilename = `kling-guard-${context.segmentId}-${Date.now()}.mp4`
  let stagingGcsPath: string | undefined

  try {
    const upload = await uploadToGCS(videoBuffer, {
      projectId: context.projectId,
      category: 'renders',
      subcategory: 'scenes',
      filename: `moderation-staging/${stagingFilename}`,
      contentType: 'video/mp4',
      metadata: {
        purpose: 'kling_hive_guard',
        segmentId: context.segmentId,
        autoDelete: 'true',
      },
    })

    stagingGcsPath = upload.gcsPath
    const videoUrl = upload.publicUrl || upload.url

    const hiveResult = await HiveModerationService.moderateVideo(videoUrl, {
      userId: context.userId,
      projectId: context.projectId,
      contentType: 'fal_video',
      sceneId: context.sceneId,
      segmentIndex: context.segmentIndex,
      logEvent: true,
    })

    const evaluation = evaluateKlingHiveResult(hiveResult)

    if (evaluation.blocked) {
      await recordUserModerationViolation(context.userId)
      throw new KlingSafetyGuardBlockedError(
        'Generated video blocked by content policy review',
        evaluation.categories,
        hiveResult
      )
    }
  } finally {
    if (stagingGcsPath) {
      try {
        await deleteFromGCS(stagingGcsPath)
      } catch (deleteErr) {
        console.warn('[KlingSafetyGuard] Failed to delete staging asset:', deleteErr)
      }
    }
  }
}
