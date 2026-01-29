/**
 * Premiere Types - Distribution & Publishing
 * 
 * Extended types for the Premiere phase focusing on:
 * - Distribution platform integrations
 * - Audience analytics
 * - Publishing workflows
 * 
 * Core screening and publishing types are in finalCut.ts
 * This file contains platform-specific and advanced analytics types
 */

import type { PublishDestination, ScreeningAnalytics, ProductionLanguage } from './finalCut'

// =============================================================================
// PLATFORM INTEGRATION TYPES
// =============================================================================

/**
 * Connected platform account
 */
export interface PlatformConnection {
  id: string
  userId: string
  platform: PublishDestination
  
  // Account info
  accountId: string
  accountName: string
  accountEmail?: string
  profileImage?: string
  
  // OAuth
  accessToken: string             // Encrypted
  refreshToken?: string           // Encrypted
  tokenExpiresAt?: string
  scopes: string[]
  
  // Status
  status: PlatformConnectionStatus
  lastVerifiedAt: string
  
  // Metadata
  createdAt: string
  updatedAt: string
}

/**
 * Platform connection status
 */
export type PlatformConnectionStatus = 
  | 'active'            // Connected and working
  | 'expired'           // Token expired, needs refresh
  | 'revoked'           // User revoked access
  | 'error'             // Connection error

/**
 * YouTube-specific channel info
 */
export interface YouTubeChannelInfo {
  channelId: string
  title: string
  subscriberCount: number
  videoCount: number
  thumbnailUrl: string
  customUrl?: string
}

/**
 * Vimeo-specific account info
 */
export interface VimeoAccountInfo {
  userId: string
  name: string
  accountType: 'basic' | 'plus' | 'pro' | 'business' | 'premium'
  uploadQuotaRemaining: number    // Bytes
  weeklyUploadLimit: number       // Bytes
}

// =============================================================================
// ADVANCED ANALYTICS TYPES
// =============================================================================

/**
 * Comparative analytics across multiple screenings
 */
export interface ComparativeAnalytics {
  projectId: string
  streamId: string
  
  // Screening comparison
  screenings: ScreeningComparison[]
  
  // Trend analysis
  viewTrend: TrendData
  engagementTrend: TrendData
  completionTrend: TrendData
  
  // Best/worst moments
  topMoments: MomentAnalysis[]
  problemMoments: MomentAnalysis[]
}

/**
 * Screening comparison data
 */
export interface ScreeningComparison {
  screeningId: string
  title: string
  createdAt: string
  
  // Key metrics
  totalViews: number
  averageWatchTime: number
  completionRate: number
  engagementRate: number
  
  // Change from previous
  viewsChange?: number            // Percentage change
  completionChange?: number
  engagementChange?: number
}

/**
 * Trend data over time
 */
export interface TrendData {
  dataPoints: TrendPoint[]
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}

/**
 * Single trend data point
 */
export interface TrendPoint {
  date: string
  value: number
}

/**
 * Moment analysis for specific timestamps
 */
export interface MomentAnalysis {
  timestamp: number
  sceneNumber: number
  
  // What happened
  type: 'high-engagement' | 'high-dropout' | 'rewatch' | 'skip'
  
  // Metrics
  value: number                   // Engagement score or dropout count
  
  // Context
  description: string             // What's happening in the video
  suggestion?: string             // AI-generated improvement suggestion
}

// =============================================================================
// FEEDBACK AGGREGATION TYPES
// =============================================================================

/**
 * Aggregated feedback from all screenings
 */
export interface AggregatedFeedback {
  projectId: string
  streamId: string
  
  // Total counts
  totalComments: number
  totalReactions: number
  totalViewers: number
  
  // Comment analysis
  commentSentiment: SentimentBreakdown
  topTopics: TopicAnalysis[]
  actionableItems: ActionableItem[]
  
  // Scene-level feedback
  sceneFeedback: SceneFeedbackSummary[]
}

/**
 * Sentiment breakdown
 */
export interface SentimentBreakdown {
  positive: number                // Percentage
  neutral: number
  negative: number
  
  // Detailed
  detailedScores: {
    excitement: number
    confusion: number
    boredom: number
    appreciation: number
    criticism: number
  }
}

/**
 * Topic analysis from comments
 */
export interface TopicAnalysis {
  topic: string
  count: number
  sentiment: 'positive' | 'neutral' | 'negative'
  exampleComments: string[]
}

/**
 * Actionable item extracted from feedback
 */
export interface ActionableItem {
  id: string
  type: 'fix' | 'improvement' | 'consideration'
  priority: 'high' | 'medium' | 'low'
  description: string
  relatedComments: string[]
  suggestedAction: string
  affectedScenes: number[]
  status: 'pending' | 'in-progress' | 'resolved' | 'wont-fix'
}

/**
 * Scene-level feedback summary
 */
export interface SceneFeedbackSummary {
  sceneNumber: number
  sceneHeading: string
  
  // Engagement
  averageRetention: number
  dropOffRate: number
  rewatchRate: number
  
  // Feedback
  commentCount: number
  reactionCount: number
  sentiment: 'positive' | 'neutral' | 'negative'
  
  // Key themes
  themes: string[]
  
  // Suggested improvements
  suggestions: string[]
}

// =============================================================================
// A/B TESTING TYPES
// =============================================================================

/**
 * A/B test configuration
 */
export interface ABTest {
  id: string
  projectId: string
  name: string
  description?: string
  
  // Test setup
  variants: ABVariant[]
  trafficSplit: number[]          // Percentage for each variant (should sum to 100)
  
  // Metrics to track
  primaryMetric: ABMetricType
  secondaryMetrics: ABMetricType[]
  
  // Status
  status: ABTestStatus
  startedAt?: string
  endedAt?: string
  
  // Results
  winner?: string                 // Variant ID
  confidence: number              // Statistical confidence
  results: ABTestResult[]
}

/**
 * A/B test variant
 */
export interface ABVariant {
  id: string
  name: string
  streamId: string                // Which stream version
  description?: string
}

/**
 * A/B test metrics
 */
export type ABMetricType = 
  | 'completion-rate'
  | 'average-watch-time'
  | 'engagement-rate'
  | 'click-through-rate'
  | 'share-rate'

/**
 * A/B test status
 */
export type ABTestStatus = 
  | 'draft'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'

/**
 * A/B test result per variant
 */
export interface ABTestResult {
  variantId: string
  
  // Sample size
  viewers: number
  
  // Metrics
  completionRate: number
  averageWatchTime: number
  engagementRate: number
  
  // Statistical
  improvementOverControl: number  // Percentage
  statisticalSignificance: number // p-value
}

// =============================================================================
// DISTRIBUTION SCHEDULE TYPES
// =============================================================================

/**
 * Distribution schedule for staggered releases
 */
export interface DistributionSchedule {
  id: string
  projectId: string
  name: string
  
  // Schedule configuration
  releases: ScheduledRelease[]
  
  // Global settings
  autoPublish: boolean
  notifyOnPublish: boolean
  
  // Status
  status: ScheduleStatus
  nextReleaseAt?: string
}

/**
 * Scheduled release
 */
export interface ScheduledRelease {
  id: string
  streamId: string
  destination: PublishDestination
  
  // Timing
  scheduledAt: string
  timezone: string
  
  // Content
  title: string
  description: string
  tags: string[]
  thumbnail?: string
  
  // Status
  status: ReleaseStatus
  publishedUrl?: string
  error?: string
}

/**
 * Schedule status
 */
export type ScheduleStatus = 
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

/**
 * Release status
 */
export type ReleaseStatus = 
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'skipped'

// =============================================================================
// LOCALIZATION TYPES
// =============================================================================

/**
 * Localization job for multi-language distribution
 */
export interface LocalizationJob {
  id: string
  projectId: string
  sourceStreamId: string
  sourceLanguage: ProductionLanguage
  
  // Target languages
  targets: LocalizationTarget[]
  
  // Settings
  settings: LocalizationSettings
  
  // Status
  status: LocalizationStatus
  createdAt: string
  completedAt?: string
}

/**
 * Localization target
 */
export interface LocalizationTarget {
  language: ProductionLanguage
  streamId?: string               // Created stream ID when complete
  
  // Translation status
  narrationStatus: TranslationStatus
  dialogueStatus: TranslationStatus
  subtitleStatus: TranslationStatus
  
  // Audio status
  voiceoverStatus: VoiceoverStatus
  
  // Overall progress
  progress: number                // 0-100
}

/**
 * Translation status
 */
export type TranslationStatus = 
  | 'pending'
  | 'in-progress'
  | 'review'
  | 'approved'
  | 'error'

/**
 * Voiceover status
 */
export type VoiceoverStatus = 
  | 'pending'
  | 'generating'
  | 'review'
  | 'approved'
  | 'error'

/**
 * Localization settings
 */
export interface LocalizationSettings {
  // Translation provider
  translationProvider: 'gemini' | 'google-translate' | 'deepl' | 'manual'
  
  // Voice settings
  voiceProvider: 'elevenlabs' | 'google-tts' | 'manual'
  matchVoiceCharacteristics: boolean  // Try to match original voice age/gender
  
  // Subtitle settings
  generateSubtitles: boolean
  subtitleStyle: 'default' | 'custom'
  
  // Quality settings
  humanReviewRequired: boolean
  autoApproveThreshold: number    // Confidence threshold (0-100)
}

/**
 * Localization overall status
 */
export type LocalizationStatus = 
  | 'created'
  | 'translating'
  | 'voice-generation'
  | 'review'
  | 'complete'
  | 'error'

// =============================================================================
// REVENUE & MONETIZATION TYPES (Future)
// =============================================================================

/**
 * Monetization settings for published content
 */
export interface MonetizationSettings {
  enabled: boolean
  
  // YouTube monetization
  youtube?: {
    adsEnabled: boolean
    sponsoredContent: boolean
    paidPromotion: boolean
  }
  
  // Vimeo OTT
  vimeoOtt?: {
    priceType: 'free' | 'rent' | 'buy' | 'subscribe'
    rentPrice?: number
    buyPrice?: number
  }
  
  // Custom
  custom?: {
    model: 'free' | 'pay-per-view' | 'subscription'
    price?: number
    currency: string
  }
}

/**
 * Revenue tracking
 */
export interface RevenueData {
  projectId: string
  period: 'day' | 'week' | 'month' | 'all-time'
  
  // Revenue by source
  youtube: number
  vimeo: number
  direct: number
  other: number
  
  // Total
  totalRevenue: number
  currency: string
  
  // Breakdown
  breakdown: RevenueBreakdown[]
}

/**
 * Revenue breakdown by stream/screening
 */
export interface RevenueBreakdown {
  streamId: string
  streamName: string
  views: number
  revenue: number
  rpmPer1000Views: number
}
