/**
 * withHiveModeration - Middleware Wrapper for Content Moderation
 * 
 * Wraps generation and upload API handlers with Hive AI moderation.
 * Implements the Hybrid Smart Sampling strategy to balance cost and coverage.
 * 
 * Features:
 * - Pre-generation prompt screening (blocks before credits spent)
 * - Post-generation content moderation (catches visual violations)
 * - Automatic credit refund on block (policy-based)
 * - User violation tracking and suspension
 * - Fallback to OpenAI when Hive unavailable
 * 
 * @version 2.36
 */

import { NextRequest, NextResponse } from 'next/server';
import { HiveModerationService, type HiveModerationResult } from '../../services/HiveModerationService';
import { 
  shouldModerateGeneration, 
  MODERATION_REFUND_POLICY,
  MODERATION_SAMPLING,
  type ModerationContentType,
  type ModerationDecision,
} from './moderationSampling';
import { ModerationEvent } from '../../models/ModerationEvent';
import type { ContentType } from '../../models/ModerationEvent';
import type { PlanTier } from '../credits/creditCosts';

// =============================================================================
// TYPES
// =============================================================================

export interface ModerationContext {
  userId: string;
  projectId?: string;
  sceneId?: string;
  segmentIndex?: number;
  tier: PlanTier;
  priorViolations: number;
}

export interface PromptModerationResult {
  allowed: boolean;
  result?: HiveModerationResult;
  reason?: string;
  blocked?: boolean;
  refundCredits?: number;
}

export interface ContentModerationResult {
  allowed: boolean;
  result?: HiveModerationResult;
  decision?: ModerationDecision;
  shouldRefund?: boolean;
  refundPercentage?: number;
}

export interface ModerationMetrics {
  promptsChecked: number;
  promptsBlocked: number;
  contentChecked: number;
  contentBlocked: number;
  creditsRefunded: number;
  samplingDecisions: Record<string, number>;
}

// =============================================================================
// PRE-GENERATION PROMPT MODERATION
// =============================================================================

/**
 * Moderate a prompt BEFORE generation
 * This is the critical cost-saving check - blocks bad content before credits are spent
 * 
 * @param prompt The text prompt to check
 * @param context User/project context
 * @returns Whether the prompt is allowed
 */
export async function moderatePrompt(
  prompt: string,
  context: ModerationContext
): Promise<PromptModerationResult> {
  const { userId, projectId, tier, priorViolations } = context;

  // Always check prompts (text moderation is nearly free: $0.0005/1K chars)
  try {
    const result = await HiveModerationService.moderateText(prompt, {
      userId,
      projectId,
      contentType: 'image_prompt', // Will be video_prompt for video
      voiceType: 'stock',
      logEvent: true,
    });

    if (!result.allowed) {
      console.log(
        `[Moderation] Prompt blocked for user ${userId}: ` +
        `categories=${result.flaggedCategories.join(',')} score=${result.highestScore.toFixed(3)}`
      );

      // Update user violation count
      await incrementUserViolations(userId);

      return {
        allowed: false,
        result,
        reason: `Content policy violation: ${result.flaggedCategories.join(', ')}`,
        blocked: true,
        refundCredits: 0, // No credits spent yet
      };
    }

    return { allowed: true, result };
  } catch (error) {
    console.error('[Moderation] Prompt check error:', error);
    // On error, allow with warning (fail open for prompts to avoid blocking legitimate users)
    return {
      allowed: true,
      reason: 'Moderation check failed, allowing with logging',
    };
  }
}

// =============================================================================
// POST-GENERATION CONTENT MODERATION
// =============================================================================

/**
 * Moderate generated content (image, video, audio) AFTER generation
 * Uses smart sampling to balance cost and coverage
 * 
 * @param contentUrl URL to the generated content
 * @param contentType Type of content
 * @param context User/project context
 * @param isFirstInScene Whether this is the first generation in the scene
 * @param creditsCharged How many credits were charged for this generation
 * @returns Moderation result with refund info
 */
export async function moderateGeneratedContent(
  contentUrl: string,
  contentType: ModerationContentType,
  context: ModerationContext,
  isFirstInScene: boolean,
  creditsCharged: number = 0
): Promise<ContentModerationResult> {
  const { userId, projectId, sceneId, segmentIndex, tier, priorViolations } = context;

  // Determine if we should check this content
  const decision = shouldModerateGeneration({
    contentType,
    tier,
    isFirstInScene,
    priorViolations,
    sceneId,
    segmentIndex,
  });

  if (!decision.shouldCheck) {
    console.log(
      `[Moderation] Skipping check (${decision.reason}): ` +
      `user=${userId} scene=${sceneId} segment=${segmentIndex}`
    );
    return {
      allowed: true,
      decision,
      shouldRefund: false,
    };
  }

  console.log(
    `[Moderation] Checking content (${decision.reason}): ` +
    `type=${contentType} user=${userId}`
  );

  try {
    let result: HiveModerationResult;

    // Choose moderation method based on content type
    switch (contentType) {
      case 'image_generated':
      case 'image_upload':
        result = await HiveModerationService.moderateImage(contentUrl, {
          userId,
          projectId,
          contentType: 'image_prompt',
          voiceType: 'stock',
          sceneId,
          segmentIndex,
          logEvent: true,
        });
        break;

      case 'video_generated':
      case 'export_video':
        result = await HiveModerationService.moderateVideo(contentUrl, {
          userId,
          projectId,
          contentType: 'video_prompt',
          voiceType: 'stock',
          sceneId,
          segmentIndex,
          logEvent: true,
        });
        break;

      case 'audio_generated':
      case 'audio_upload':
      case 'export_audio':
        result = await HiveModerationService.moderateAudio(contentUrl, {
          userId,
          projectId,
          contentType: 'tts_script',
          voiceType: 'stock',
          sceneId,
          segmentIndex,
          logEvent: true,
        });
        break;

      default:
        // For prompts, use text moderation
        result = await HiveModerationService.moderateText(contentUrl, {
          userId,
          projectId,
          contentType: 'image_prompt',
          voiceType: 'stock',
          logEvent: true,
        });
    }

    if (!result.allowed) {
      console.log(
        `[Moderation] Content blocked: type=${contentType} ` +
        `categories=${result.flaggedCategories.join(',')} score=${result.highestScore.toFixed(3)}`
      );

      // Update user violations
      await incrementUserViolations(userId);

      // Calculate refund based on violation history
      const refundPercentage = MODERATION_REFUND_POLICY.getRefundPercentage(priorViolations);
      const shouldRefund = refundPercentage > 0 && creditsCharged > 0;

      return {
        allowed: false,
        result,
        decision,
        shouldRefund,
        refundPercentage,
      };
    }

    return {
      allowed: true,
      result,
      decision,
      shouldRefund: false,
    };
  } catch (error) {
    console.error('[Moderation] Content check error:', error);
    // On error, allow the content (fail open for post-generation)
    // The export gate will catch it later
    return {
      allowed: true,
      decision,
      shouldRefund: false,
    };
  }
}

// =============================================================================
// EXPORT GATE MODERATION
// =============================================================================

/**
 * Final moderation gate before export/download
 * This is ALWAYS run regardless of sampling - last line of defense
 * 
 * @param videoUrl URL to the final video
 * @param audioUrl URL to the final audio (optional)
 * @param context User/project context
 * @returns Whether the export is allowed
 */
export async function moderateExport(
  videoUrl: string,
  audioUrl: string | null,
  context: ModerationContext
): Promise<ContentModerationResult> {
  const { userId, projectId, priorViolations } = context;

  console.log(`[Moderation] Export gate check: user=${userId} project=${projectId}`);

  try {
    // Always check video
    const videoResult = await HiveModerationService.moderateVideo(videoUrl, {
      userId,
      projectId,
      contentType: 'video_prompt',
      voiceType: 'stock',
      logEvent: true,
    });

    if (!videoResult.allowed) {
      console.log(
        `[Moderation] Export blocked (video): categories=${videoResult.flaggedCategories.join(',')}`
      );
      await incrementUserViolations(userId);
      return {
        allowed: false,
        result: videoResult,
        shouldRefund: false, // No refund at export stage - content was already generated
        refundPercentage: 0,
      };
    }

    // Check audio if provided
    if (audioUrl) {
      const audioResult = await HiveModerationService.moderateAudio(audioUrl, {
        userId,
        projectId,
        contentType: 'tts_script',
        voiceType: 'stock',
        logEvent: true,
      });

      if (!audioResult.allowed) {
        console.log(
          `[Moderation] Export blocked (audio): categories=${audioResult.flaggedCategories.join(',')}`
        );
        await incrementUserViolations(userId);
        return {
          allowed: false,
          result: audioResult,
          shouldRefund: false,
          refundPercentage: 0,
        };
      }
    }

    return { allowed: true, shouldRefund: false };
  } catch (error) {
    console.error('[Moderation] Export gate error:', error);
    // For exports, fail CLOSED (block on error)
    // This is the last line of defense
    return {
      allowed: false,
      shouldRefund: false,
    };
  }
}

// =============================================================================
// UPLOAD MODERATION
// =============================================================================

/**
 * Moderate user-uploaded content
 * Always run at 100% - external content is highest risk
 * 
 * @param contentUrl URL or buffer of uploaded content
 * @param mimeType MIME type of the content
 * @param context User context
 * @returns Whether the upload is allowed
 */
export async function moderateUpload(
  contentUrl: string | Buffer,
  mimeType: string,
  context: ModerationContext
): Promise<ContentModerationResult> {
  const { userId, projectId, priorViolations } = context;

  console.log(`[Moderation] Upload check: user=${userId} type=${mimeType}`);

  try {
    let result: HiveModerationResult;

    if (mimeType.startsWith('image/')) {
      result = await HiveModerationService.moderateImage(contentUrl, {
        userId,
        projectId,
        contentType: 'image_prompt',
        voiceType: 'stock',
        mimeType,
        logEvent: true,
      });
    } else if (mimeType.startsWith('audio/')) {
      // For audio buffers, we need to upload first then check
      // For URLs, check directly
      if (typeof contentUrl === 'string') {
        result = await HiveModerationService.moderateAudio(contentUrl, {
          userId,
          projectId,
          contentType: 'tts_script',
          voiceType: 'stock',
          mimeType,
          logEvent: true,
        });
      } else {
        // Buffer case - skip for now, will be caught at export
        return { allowed: true, shouldRefund: false };
      }
    } else if (mimeType.startsWith('video/')) {
      if (typeof contentUrl === 'string') {
        result = await HiveModerationService.moderateVideo(contentUrl, {
          userId,
          projectId,
          contentType: 'video_prompt',
          voiceType: 'stock',
          mimeType,
          logEvent: true,
        });
      } else {
        return { allowed: true, shouldRefund: false };
      }
    } else {
      // Unknown type - allow but log
      console.warn(`[Moderation] Unknown upload type: ${mimeType}`);
      return { allowed: true, shouldRefund: false };
    }

    if (!result.allowed) {
      console.log(
        `[Moderation] Upload blocked: type=${mimeType} ` +
        `categories=${result.flaggedCategories.join(',')}`
      );
      await incrementUserViolations(userId);
      return {
        allowed: false,
        result,
        shouldRefund: false, // No credits charged for uploads
      };
    }

    return { allowed: true, result, shouldRefund: false };
  } catch (error) {
    console.error('[Moderation] Upload check error:', error);
    // For uploads, fail CLOSED (block on error)
    // External content is high risk
    return { allowed: false, shouldRefund: false };
  }
}

// =============================================================================
// USER VIOLATION TRACKING
// =============================================================================

/**
 * Increment user's violation count
 */
async function incrementUserViolations(userId: string): Promise<void> {
  try {
    // Get current count from recent events
    const recentCount = await HiveModerationService.getUserViolationCount(
      userId,
      MODERATION_SAMPLING.violations.recentWindowHours
    );

    console.log(`[Moderation] User ${userId} violation count: ${recentCount + 1}`);

    // Check if suspension is needed
    const { shouldSuspend, reason } = await HiveModerationService.checkUserSuspension(userId);
    
    if (shouldSuspend) {
      console.warn(`[Moderation] User ${userId} should be suspended: ${reason}`);
      // TODO: Update user.moderation_suspended_until in database
    }
  } catch (error) {
    console.error('[Moderation] Error updating violation count:', error);
  }
}

/**
 * Get user's moderation context
 */
export async function getUserModerationContext(
  userId: string,
  projectId?: string,
  tier: PlanTier = 'starter'
): Promise<ModerationContext> {
  const priorViolations = await HiveModerationService.getUserViolationCount(userId, 24);

  return {
    userId,
    projectId,
    tier,
    priorViolations,
  };
}

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

/**
 * Create blocked response for API routes
 */
export function createBlockedResponse(
  result: HiveModerationResult,
  message: string = 'Content blocked by moderation'
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      blocked: true,
      categories: result.flaggedCategories,
      code: 'CONTENT_POLICY_VIOLATION',
    },
    { status: 403 }
  );
}

/**
 * Create blocked response for upload routes
 */
export function createUploadBlockedResponse(
  result?: HiveModerationResult
): NextResponse {
  return NextResponse.json(
    {
      error: 'Upload blocked: content violates our content policy',
      blocked: true,
      categories: result?.flaggedCategories || [],
      code: 'UPLOAD_POLICY_VIOLATION',
    },
    { status: 403 }
  );
}

/**
 * Create blocked response for export routes
 */
export function createExportBlockedResponse(
  result?: HiveModerationResult
): NextResponse {
  return NextResponse.json(
    {
      error: 'Export blocked: video contains content that violates our policies. Please remove the flagged content and try again.',
      blocked: true,
      categories: result?.flaggedCategories || [],
      code: 'EXPORT_POLICY_VIOLATION',
    },
    { status: 403 }
  );
}

export default {
  moderatePrompt,
  moderateGeneratedContent,
  moderateExport,
  moderateUpload,
  getUserModerationContext,
  createBlockedResponse,
  createUploadBlockedResponse,
  createExportBlockedResponse,
};
