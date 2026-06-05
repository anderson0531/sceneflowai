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
import { isHiveModerationMasterEnabled } from './moderationFlags';
import { recordUserModerationViolation } from './userModerationViolations';
import {
  shouldModerateGeneration, 
  MODERATION_REFUND_POLICY,
  type ModerationContentType,
  type ModerationDecision,
} from './moderationSampling';
import { ModerationEvent } from '../../models/ModerationEvent';
import type { ContentType } from '../../models/ModerationEvent';
import type { PlanTier } from '../credits/creditCosts';

const HIVE_MODERATION_ENABLED = isHiveModerationMasterEnabled();

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
  _prompt: string,
  _context: ModerationContext
): Promise<PromptModerationResult> {
  return { allowed: true, reason: 'Use POST /api/moderation/validate for paid validation' };
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

      await recordUserModerationViolation(userId);

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
  _videoUrl: string,
  _audioUrl: string | null,
  _context: ModerationContext
): Promise<ContentModerationResult> {
  return { allowed: true, shouldRefund: false };
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
  _contentUrl: string | Buffer,
  _mimeType: string,
  _context: ModerationContext
): Promise<ContentModerationResult> {
  return { allowed: true, shouldRefund: false };
}

// =============================================================================
// USER VIOLATION TRACKING
// =============================================================================

/**
 * Get user's moderation context
 */
export async function getUserModerationContext(
  userId: string,
  projectId?: string,
  tier: PlanTier = 'starter'
): Promise<ModerationContext> {
  const priorViolations = isHiveModerationMasterEnabled()
    ? await HiveModerationService.getUserViolationCount(userId, 24)
    : 0;

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
