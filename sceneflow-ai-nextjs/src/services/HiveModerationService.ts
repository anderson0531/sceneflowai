/**
 * HiveModerationService
 * 
 * Content moderation using Hive AI's moderation APIs.
 * Provides visual, audio, text, and video moderation capabilities.
 * 
 * Features:
 * - Multi-modal content moderation (image, video, audio, text)
 * - Consistent ModerationResult interface with OpenAI moderation
 * - Audit logging of moderation decisions
 * - Fallback to OpenAI moderation when Hive is unavailable
 * 
 * @version 2.36
 * @see https://docs.thehive.ai
 */

import { createHash } from 'crypto';
import { ModerationEvent } from '@/models/ModerationEvent';
import type { ContentType, ModerationAction } from '@/models/ModerationEvent';
import { ModerationService, type ModerationResult, type ModerationOptions } from '@/services/ModerationService';
import { MODERATION_FALLBACK, ADMIN_REVIEW } from '@/lib/moderation/moderationSampling';

// =============================================================================
// HIVE AI CONFIGURATION
// =============================================================================

const HIVE_ACCESS_KEY_ID = process.env.HIVE_AI_ACCESS_KEY_ID;
const HIVE_SECRET_KEY = process.env.HIVE_AI_SECRET_KEY;

// Hive AI API endpoints
const HIVE_API_BASE = 'https://api.thehive.ai/api/v2';
const HIVE_ENDPOINTS = {
  visual: `${HIVE_API_BASE}/task/sync`,  // For image/video moderation
  text: `${HIVE_API_BASE}/task/sync`,    // For text moderation
  audio: `${HIVE_API_BASE}/task/sync`,   // For audio moderation
} as const;

// Hive model IDs
const HIVE_MODELS = {
  visual: 'visual-moderation',
  text: 'text-moderation',
  audio: 'audio-moderation',
} as const;

// =============================================================================
// EXTENDED TYPES
// =============================================================================

export type HiveContentType = ContentType | 'video_clip' | 'export_video' | 'export_audio';

export interface HiveModerationResult extends ModerationResult {
  /** Hive-specific class labels */
  hiveClasses?: HiveClassResult[];
  /** Confidence score from Hive (0-1) */
  confidence?: number;
  /** Whether content was auto-deleted vs flagged for review */
  autoDeleted?: boolean;
  /** Whether content is held for admin review */
  heldForReview?: boolean;
  /** Hive request ID for debugging */
  hiveRequestId?: string;
}

export interface HiveClassResult {
  class: string;
  score: number;
}

export interface HiveModerationOptions extends ModerationOptions {
  /** URL to the content (for images/video/audio) */
  contentUrl?: string;
  /** Raw content bytes (alternative to URL) */
  contentBytes?: Buffer;
  /** MIME type of the content */
  mimeType?: string;
  /** Scene ID for context */
  sceneId?: string;
  /** Segment index for context */
  segmentIndex?: number;
}

// =============================================================================
// HIVE AI CATEGORY MAPPING
// =============================================================================

/**
 * Map Hive AI classes to our internal categories
 * Hive returns fine-grained classes, we consolidate to broader categories
 */
const HIVE_CLASS_MAPPING: Record<string, string> = {
  // NSFW / Sexual
  'general_nsfw': 'sexual',
  'sexual_activity': 'sexual',
  'sexual_display': 'sexual',
  'very_suggestive': 'sexual',
  'suggestive': 'sexual',
  'animated_explicit': 'sexual',
  'animated_suggestive': 'sexual',
  
  // Violence
  'violence': 'violence',
  'gore': 'violence/graphic',
  'self_harm': 'self-harm',
  'self_harm_intent': 'self-harm/intent',
  
  // Minors (highest priority)
  'yes_minor': 'sexual/minors',
  'child_exploitation': 'sexual/minors',
  'csam': 'sexual/minors',
  
  // Hate / Discrimination
  'hate_symbol': 'hate',
  'hate_speech': 'hate',
  'extremism': 'hate',
  
  // Drugs
  'drugs': 'illegal',
  'drug_use': 'illegal',
  
  // Weapons
  'weapon': 'violence',
  'firearm': 'violence',
  
  // Other
  'spam': 'spam',
  'scam': 'fraud',
};

/**
 * Hive classes that trigger immediate blocking (bypass thresholds)
 */
const HIVE_ALWAYS_BLOCK_CLASSES = [
  'yes_minor',
  'child_exploitation',
  'csam',
  'self_harm_intent',
  'gore',
  'terrorism',
];

// =============================================================================
// HIVE MODERATION SERVICE
// =============================================================================

export class HiveModerationService {
  /**
   * Check if Hive AI moderation is configured
   */
  static isConfigured(): boolean {
    return !!(HIVE_ACCESS_KEY_ID && HIVE_SECRET_KEY);
  }

  /**
   * Get Hive AI auth header
   */
  private static getAuthHeader(): string {
    if (!HIVE_ACCESS_KEY_ID || !HIVE_SECRET_KEY) {
      throw new Error('Hive AI credentials not configured');
    }
    // Hive uses token-based auth
    return `Token ${HIVE_ACCESS_KEY_ID}`;
  }

  /**
   * Hash content for deduplication
   */
  static hashContent(content: string | Buffer): string {
    const data = typeof content === 'string' ? content : content.toString('base64');
    return createHash('sha256').update(data).digest('hex');
  }

  // ===========================================================================
  // TEXT MODERATION (for prompts)
  // ===========================================================================

  /**
   * Moderate text content (prompts, scripts)
   * This is the primary pre-generation check - catches violations before credits are spent
   */
  static async moderateText(
    text: string,
    options: HiveModerationOptions
  ): Promise<HiveModerationResult> {
    const { userId, contentType, logEvent = true } = options;
    const contentHash = this.hashContent(text);

    // If Hive not configured, fall back to OpenAI
    if (!this.isConfigured()) {
      console.warn('[HiveModeration] Hive AI not configured, falling back to OpenAI');
      return this.fallbackToOpenAI(text, options);
    }

    try {
      const response = await fetch(HIVE_ENDPOINTS.text, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_data: text,
          models: {
            'text-moderation': {},
          },
        }),
      });

      if (!response.ok) {
        console.error(`[HiveModeration] API error: ${response.status}`);
        return this.fallbackToOpenAI(text, options);
      }

      const data = await response.json();
      const result = this.parseHiveResponse(data, 'text');

      if (logEvent) {
        await this.logModerationEvent(userId, contentType, contentHash, result, options);
      }

      return result;
    } catch (error) {
      console.error('[HiveModeration] Text moderation error:', error);
      return this.fallbackToOpenAI(text, options);
    }
  }

  // ===========================================================================
  // IMAGE MODERATION
  // ===========================================================================

  /**
   * Moderate image content
   * Used for: user uploads, generated frames, scene images
   */
  static async moderateImage(
    imageUrlOrBuffer: string | Buffer,
    options: HiveModerationOptions
  ): Promise<HiveModerationResult> {
    const { userId, contentType, logEvent = true } = options;
    const isUrl = typeof imageUrlOrBuffer === 'string';
    const contentHash = this.hashContent(
      isUrl ? imageUrlOrBuffer : imageUrlOrBuffer
    );

    if (!this.isConfigured()) {
      console.warn('[HiveModeration] Hive AI not configured, allowing image by default');
      return this.createDefaultAllowResult('Hive AI not configured');
    }

    try {
      const body: Record<string, unknown> = {
        models: {
          'visual-moderation': {},
        },
      };

      if (isUrl) {
        body.url = imageUrlOrBuffer;
      } else {
        body.image = (imageUrlOrBuffer as Buffer).toString('base64');
      }

      const response = await fetch(HIVE_ENDPOINTS.visual, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(`[HiveModeration] Image API error: ${response.status}`);
        return this.createDefaultAllowResult(`API error: ${response.status}`);
      }

      const data = await response.json();
      const result = this.parseHiveResponse(data, 'visual');

      if (logEvent) {
        await this.logModerationEvent(userId, contentType, contentHash, result, options);
      }

      return result;
    } catch (error) {
      console.error('[HiveModeration] Image moderation error:', error);
      return this.createDefaultAllowResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // VIDEO MODERATION
  // ===========================================================================

  /**
   * Moderate video content
   * Used for: generated video clips, final exports
   * Note: Video moderation is more expensive, used strategically
   */
  static async moderateVideo(
    videoUrl: string,
    options: HiveModerationOptions
  ): Promise<HiveModerationResult> {
    const { userId, contentType, logEvent = true } = options;
    const contentHash = this.hashContent(videoUrl);

    if (!this.isConfigured()) {
      console.warn('[HiveModeration] Hive AI not configured, allowing video by default');
      return this.createDefaultAllowResult('Hive AI not configured');
    }

    try {
      const response = await fetch(HIVE_ENDPOINTS.visual, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          models: {
            'visual-moderation': {
              // Sample frames for efficiency
              frame_interval: 1000, // Every 1 second
            },
          },
        }),
      });

      if (!response.ok) {
        console.error(`[HiveModeration] Video API error: ${response.status}`);
        return this.createDefaultAllowResult(`API error: ${response.status}`);
      }

      const data = await response.json();
      const result = this.parseHiveResponse(data, 'visual');

      if (logEvent) {
        await this.logModerationEvent(userId, contentType, contentHash, result, options);
      }

      return result;
    } catch (error) {
      console.error('[HiveModeration] Video moderation error:', error);
      return this.createDefaultAllowResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // AUDIO MODERATION
  // ===========================================================================

  /**
   * Moderate audio content
   * Used for: generated voiceovers, user-uploaded audio
   */
  static async moderateAudio(
    audioUrl: string,
    options: HiveModerationOptions
  ): Promise<HiveModerationResult> {
    const { userId, contentType, logEvent = true } = options;
    const contentHash = this.hashContent(audioUrl);

    if (!this.isConfigured()) {
      console.warn('[HiveModeration] Hive AI not configured, allowing audio by default');
      return this.createDefaultAllowResult('Hive AI not configured');
    }

    try {
      const response = await fetch(HIVE_ENDPOINTS.audio, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: audioUrl,
          models: {
            'audio-moderation': {},
          },
        }),
      });

      if (!response.ok) {
        console.error(`[HiveModeration] Audio API error: ${response.status}`);
        return this.createDefaultAllowResult(`API error: ${response.status}`);
      }

      const data = await response.json();
      const result = this.parseHiveResponse(data, 'audio');

      if (logEvent) {
        await this.logModerationEvent(userId, contentType, contentHash, result, options);
      }

      return result;
    } catch (error) {
      console.error('[HiveModeration] Audio moderation error:', error);
      return this.createDefaultAllowResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ===========================================================================
  // RESPONSE PARSING
  // ===========================================================================

  /**
   * Parse Hive AI response into standardized ModerationResult
   */
  private static parseHiveResponse(
    data: Record<string, unknown>,
    type: 'visual' | 'text' | 'audio'
  ): HiveModerationResult {
    const hiveClasses: HiveClassResult[] = [];
    const flaggedCategories: string[] = [];
    const categoryScores: Record<string, number> = {};
    let highestScore = 0;
    let confidence = 0;

    try {
      // Extract output from Hive response
      const status = data.status as Record<string, unknown> | undefined;
      const output = status?.output as Array<Record<string, unknown>> | undefined;

      if (output && Array.isArray(output)) {
        for (const item of output) {
          const classes = item.classes as Array<Record<string, unknown>> | undefined;
          if (classes && Array.isArray(classes)) {
            for (const cls of classes) {
              const className = cls.class as string;
              const score = cls.score as number;

              hiveClasses.push({ class: className, score });

              // Map to our internal category
              const internalCategory = HIVE_CLASS_MAPPING[className] || className;
              
              if (score > (categoryScores[internalCategory] || 0)) {
                categoryScores[internalCategory] = score;
              }

              if (score > highestScore) {
                highestScore = score;
                confidence = score;
              }

              // Check if flagged
              if (HIVE_ALWAYS_BLOCK_CLASSES.includes(className) && score > 0.1) {
                flaggedCategories.push(internalCategory);
              } else if (score > ADMIN_REVIEW.thresholds.adminReview) {
                flaggedCategories.push(internalCategory);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[HiveModeration] Error parsing response:', error);
    }

    // Determine action based on thresholds
    const { action, autoDeleted, heldForReview } = this.determineAction(
      highestScore,
      flaggedCategories,
      hiveClasses
    );

    const result: HiveModerationResult = {
      allowed: action === 'allowed',
      action,
      flaggedCategories: [...new Set(flaggedCategories)], // Deduplicate
      categoryScores,
      highestScore,
      threshold: ADMIN_REVIEW.thresholds.adminReview,
      hiveClasses,
      confidence,
      autoDeleted,
      heldForReview,
      hiveRequestId: (data.id as string) || undefined,
    };

    console.log(
      `[HiveModeration] Result: ${action}, ` +
      `categories: ${flaggedCategories.join(', ')}, ` +
      `score: ${highestScore.toFixed(3)}`
    );

    return result;
  }

  /**
   * Determine moderation action based on scores and categories
   */
  private static determineAction(
    highestScore: number,
    flaggedCategories: string[],
    hiveClasses: HiveClassResult[]
  ): { action: ModerationAction; autoDeleted: boolean; heldForReview: boolean } {
    // Check for always-block categories
    const hasAlwaysBlock = hiveClasses.some(
      cls => HIVE_ALWAYS_BLOCK_CLASSES.includes(cls.class) && cls.score > 0.1
    );

    if (hasAlwaysBlock) {
      return { action: 'blocked', autoDeleted: true, heldForReview: false };
    }

    // High confidence violation - auto-delete
    if (highestScore >= ADMIN_REVIEW.thresholds.autoDelete) {
      return { action: 'blocked', autoDeleted: true, heldForReview: false };
    }

    // Medium confidence - hold for review
    if (highestScore >= ADMIN_REVIEW.thresholds.adminReview) {
      return { action: 'blocked', autoDeleted: false, heldForReview: true };
    }

    // Low confidence - allow with logging
    return { action: 'allowed', autoDeleted: false, heldForReview: false };
  }

  // ===========================================================================
  // FALLBACK & HELPERS
  // ===========================================================================

  /**
   * Fall back to OpenAI moderation when Hive is unavailable
   */
  private static async fallbackToOpenAI(
    text: string,
    options: HiveModerationOptions
  ): Promise<HiveModerationResult> {
    console.log('[HiveModeration] Falling back to OpenAI moderation');

    if (MODERATION_FALLBACK.alertOnFallback) {
      // TODO: Send alert to ops team
      console.warn('[HiveModeration] ALERT: Using OpenAI fallback mode');
    }

    // Use existing OpenAI moderation service
    const openAIResult = await ModerationService.scanText(text, {
      voiceType: 'stock', // Use stock threshold for non-voice content
      userId: options.userId,
      contentType: options.contentType,
      projectId: options.projectId,
      logEvent: false, // We'll log our own event
    });

    // Convert to HiveModerationResult
    return {
      ...openAIResult,
      hiveClasses: [],
      confidence: openAIResult.highestScore,
      autoDeleted: false,
      heldForReview: false,
      reason: 'Fallback to OpenAI moderation',
    };
  }

  /**
   * Create default allow result (when moderation is unavailable)
   */
  private static createDefaultAllowResult(reason: string): HiveModerationResult {
    return {
      allowed: true,
      action: 'allowed',
      flaggedCategories: [],
      categoryScores: {},
      highestScore: 0,
      threshold: ADMIN_REVIEW.thresholds.adminReview,
      hiveClasses: [],
      confidence: 0,
      autoDeleted: false,
      heldForReview: false,
      reason,
    };
  }

  /**
   * Log moderation event to database
   */
  private static async logModerationEvent(
    userId: string,
    contentType: ContentType,
    contentHash: string,
    result: HiveModerationResult,
    options: HiveModerationOptions
  ): Promise<void> {
    try {
      await ModerationEvent.create({
        user_id: userId,
        content_type: contentType,
        content_hash: contentHash,
        action: result.action,
        flagged_categories: result.flaggedCategories,
        category_scores: result.categoryScores,
        project_id: options.projectId,
        threshold_applied: result.threshold,
      });
    } catch (error) {
      console.error('[HiveModeration] Failed to log moderation event:', error);
      // Don't throw - logging failure shouldn't block the request
    }
  }

  // ===========================================================================
  // USER VIOLATION TRACKING
  // ===========================================================================

  /**
   * Get user's violation count in the recent window
   */
  static async getUserViolationCount(
    userId: string,
    windowHours: number = 24
  ): Promise<number> {
    try {
      // Skip lookup for anonymous users - the user_id column is UUID type
      // and 'anonymous' is not a valid UUID, causing database errors
      if (!userId || userId === 'anonymous') {
        return 0;
      }

      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - windowHours);

      const count = await ModerationEvent.count({
        where: {
          user_id: userId,
          action: 'blocked',
          created_at: {
            [Symbol.for('gte')]: windowStart,
          },
        },
      });

      return count;
    } catch (error) {
      console.error('[HiveModeration] Error getting violation count:', error);
      return 0;
    }
  }

  /**
   * Check if user should be suspended based on violations
   */
  static async checkUserSuspension(userId: string): Promise<{
    shouldSuspend: boolean;
    violationCount: number;
    reason?: string;
  }> {
    const violationCount = await this.getUserViolationCount(userId, 24);

    if (violationCount >= 5) {
      return {
        shouldSuspend: true,
        violationCount,
        reason: `${violationCount} content violations in 24 hours`,
      };
    }

    return { shouldSuspend: false, violationCount };
  }
}

export default HiveModerationService;
