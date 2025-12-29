/**
 * ModerationService
 * 
 * Content moderation using OpenAI's Moderation API.
 * Scans text content before sending to AI providers.
 * 
 * Features:
 * - Stricter thresholds for cloned voices vs stock voices
 * - Category-based blocking (hate, violence, fraud, etc.)
 * - Audit logging of moderation decisions
 */

import { createHash } from 'crypto';
import { ModerationEvent } from '../models/ModerationEvent';
import type { VoiceType, ContentType, ModerationAction } from '../models/ModerationEvent';

// OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODERATION_ENDPOINT = 'https://api.openai.com/v1/moderations'

// Thresholds - cloned voices have stricter moderation
const THRESHOLD_CLONED = Number(process.env.MODERATION_THRESHOLD_CLONED ?? '0.3')
const THRESHOLD_STOCK = Number(process.env.MODERATION_THRESHOLD_STOCK ?? '0.7')

// Categories that are always blocked regardless of threshold
const ALWAYS_BLOCKED_CATEGORIES = ['sexual/minors', 'self-harm/intent', 'self-harm/instructions']

// Additional keywords for fraud detection (not covered by OpenAI moderation)
const FRAUD_KEYWORDS = [
  'wire transfer',
  'send money',
  'bank account',
  'social security',
  'gift card',
  'this is not a scam',
  'i am calling from',
  'irs',
  'warrant for your arrest',
  'verify your identity',
  'your account has been compromised',
]

export interface ModerationResult {
  allowed: boolean
  action: ModerationAction
  flaggedCategories: string[]
  categoryScores: Record<string, number>
  highestScore: number
  threshold: number
  reason?: string
}

export interface ModerationOptions {
  voiceType: VoiceType
  voiceId?: string
  projectId?: string
  userId: string
  contentType: ContentType
  logEvent?: boolean // Default true
}

export class ModerationService {
  /**
   * Check if OpenAI moderation is configured
   */
  static isConfigured(): boolean {
    return !!OPENAI_API_KEY
  }

  /**
   * Get the appropriate threshold based on voice type
   */
  static getThreshold(voiceType: VoiceType): number {
    switch (voiceType) {
      case 'cloned':
        return THRESHOLD_CLONED
      case 'designed':
        return THRESHOLD_CLONED // Treat designed voices like cloned (custom)
      case 'stock':
      default:
        return THRESHOLD_STOCK
    }
  }

  /**
   * Scan text content for prohibited content
   * 
   * @param text The text to scan
   * @param options Moderation options including voice type
   * @returns Moderation result
   */
  static async scanText(
    text: string,
    options: ModerationOptions
  ): Promise<ModerationResult> {
    const { voiceType, userId, contentType, logEvent = true } = options
    const threshold = this.getThreshold(voiceType)
    const contentHash = this.hashContent(text)

    // Default result for when moderation is not configured
    if (!this.isConfigured()) {
      console.warn('[Moderation] OpenAI API key not configured, allowing content by default')
      return {
        allowed: true,
        action: 'allowed',
        flaggedCategories: [],
        categoryScores: {},
        highestScore: 0,
        threshold,
        reason: 'Moderation not configured',
      }
    }

    try {
      // Check for fraud keywords first (custom check)
      const fraudKeywordsFound = this.checkFraudKeywords(text, voiceType)
      if (fraudKeywordsFound.length > 0 && voiceType === 'cloned') {
        const result: ModerationResult = {
          allowed: false,
          action: 'blocked',
          flaggedCategories: ['fraud'],
          categoryScores: { fraud: 1.0 },
          highestScore: 1.0,
          threshold,
          reason: `Fraud-related content detected: ${fraudKeywordsFound.join(', ')}`,
        }

        if (logEvent) {
          await this.logModerationEvent(userId, contentType, contentHash, result, options)
        }

        return result
      }

      // Call OpenAI Moderation API
      const response = await fetch(OPENAI_MODERATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: text }),
      })

      if (!response.ok) {
        console.error(`[Moderation] OpenAI API error: ${response.status}`)
        // On API error, allow content but log warning
        return {
          allowed: true,
          action: 'warning',
          flaggedCategories: [],
          categoryScores: {},
          highestScore: 0,
          threshold,
          reason: 'Moderation API unavailable',
        }
      }

      const data = await response.json()
      const results = data.results?.[0]

      if (!results) {
        return {
          allowed: true,
          action: 'allowed',
          flaggedCategories: [],
          categoryScores: {},
          highestScore: 0,
          threshold,
        }
      }

      // Process category scores
      const categoryScores: Record<string, number> = results.category_scores || {}
      const flaggedCategories: string[] = []
      let highestScore = 0

      for (const [category, score] of Object.entries(categoryScores)) {
        const numScore = score as number
        if (numScore > highestScore) {
          highestScore = numScore
        }

        // Check if category exceeds threshold or is always blocked
        if (ALWAYS_BLOCKED_CATEGORIES.includes(category) && numScore > 0.1) {
          flaggedCategories.push(category)
        } else if (numScore > threshold) {
          flaggedCategories.push(category)
        }
      }

      // Determine action
      let action: ModerationAction = 'allowed'
      let allowed = true

      if (flaggedCategories.length > 0) {
        // Check if any always-blocked categories are flagged
        const hasAlwaysBlocked = flaggedCategories.some(cat => 
          ALWAYS_BLOCKED_CATEGORIES.includes(cat)
        )

        if (hasAlwaysBlocked || highestScore > threshold) {
          action = 'blocked'
          allowed = false
        } else {
          action = 'warning'
        }
      }

      const result: ModerationResult = {
        allowed,
        action,
        flaggedCategories,
        categoryScores,
        highestScore,
        threshold,
      }

      // Log moderation event
      if (logEvent) {
        await this.logModerationEvent(userId, contentType, contentHash, result, options)
      }

      console.log(`[Moderation] Result: ${action}, categories: ${flaggedCategories.join(', ')}, score: ${highestScore.toFixed(3)}`)

      return result
    } catch (error) {
      console.error('[Moderation] Error scanning content:', error)
      // On error, allow content but with warning
      return {
        allowed: true,
        action: 'warning',
        flaggedCategories: [],
        categoryScores: {},
        highestScore: 0,
        threshold,
        reason: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check for fraud-related keywords (not covered by OpenAI moderation)
   */
  private static checkFraudKeywords(text: string, voiceType: VoiceType): string[] {
    // Only apply fraud detection to cloned/custom voices
    if (voiceType === 'stock') {
      return []
    }

    const lowerText = text.toLowerCase()
    const foundKeywords: string[] = []

    for (const keyword of FRAUD_KEYWORDS) {
      if (lowerText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword)
      }
    }

    return foundKeywords
  }

  /**
   * Log moderation event to database
   */
  private static async logModerationEvent(
    userId: string,
    contentType: ContentType,
    contentHash: string,
    result: ModerationResult,
    options: ModerationOptions
  ): Promise<void> {
    try {
      await ModerationEvent.create({
        user_id: userId,
        content_type: contentType,
        content_hash: contentHash,
        action: result.action,
        flagged_categories: result.flaggedCategories,
        category_scores: result.categoryScores,
        voice_type: options.voiceType,
        voice_id: options.voiceId,
        project_id: options.projectId,
        threshold_applied: result.threshold,
      })
    } catch (error) {
      console.error('[Moderation] Failed to log moderation event:', error)
      // Don't throw - logging failure shouldn't block the request
    }
  }

  /**
   * Hash content for deduplication
   */
  static hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if a user has too many blocked events recently (abuse detection)
   */
  static async checkUserAbusePattern(
    userId: string,
    windowHours: number = 24,
    maxBlocked: number = 5
  ): Promise<{ isAbusive: boolean; blockedCount: number }> {
    try {
      const windowStart = new Date()
      windowStart.setHours(windowStart.getHours() - windowHours)

      const blockedCount = await ModerationEvent.count({
        where: {
          user_id: userId,
          action: 'blocked',
          created_at: {
            [Symbol.for('gte')]: windowStart,
          },
        },
      })

      return {
        isAbusive: blockedCount >= maxBlocked,
        blockedCount,
      }
    } catch (error) {
      console.error('[Moderation] Error checking abuse pattern:', error)
      return { isAbusive: false, blockedCount: 0 }
    }
  }
}

export default ModerationService
