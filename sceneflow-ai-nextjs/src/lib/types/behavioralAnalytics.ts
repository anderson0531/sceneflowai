/**
 * Behavioral Analytics Types
 * 
 * Types for the privacy-first audience analytics platform:
 * - Biometric data (client-side only, sanitized JSON output)
 * - Micro-behavior tracking (mouse, volume, fullscreen events)
 * - Manual reactions (emoji timeline)
 * - A/B testing and segmentation
 * - Heatmap and retention visualization
 * 
 * PRIVACY ARCHITECTURE:
 * - Webcam video NEVER leaves the browser
 * - Only sanitized JSON payloads (emotion scores) are transmitted
 * - All biometric processing via MediaPipe/TensorFlow.js runs client-side
 * 
 * @see /screening-room-analytics.plan.md for architecture decisions
 */

// =============================================================================
// SCREENING SESSION TYPES
// =============================================================================

/**
 * A single viewing session by one tester
 * Created when a tester opens the screening link
 */
export interface BehavioralScreeningSession {
  id: string
  screeningId: string                // Links to the parent screening/project
  
  // A/B Testing
  variant: 'A' | 'B' | null          // Assigned variant (null if no A/B test)
  variantLabel?: string              // Human-readable: "Happy Ending" vs "Ambiguous"
  
  // Demographics (optional, collected via consent modal)
  demographics?: SessionDemographics
  
  // Session metrics
  durationWatched: number            // Seconds watched
  totalVideoDuration: number         // Total video length in seconds
  didFinish: boolean                 // Watched to completion
  completionRate: number             // 0-100 percentage
  
  // Consent & Calibration
  cameraConsentGranted: boolean      // User allowed biometric sensing
  calibrationCompleted: boolean      // Watched > 5 mins (calibration phase done)
  calibrationEndTime?: number        // Timestamp when calibration ended
  
  // Device info
  deviceInfo: DeviceInfo
  
  // Timestamps
  startedAt: string                  // ISO timestamp
  endedAt?: string                   // ISO timestamp when session ended
  lastActiveAt: string               // Last activity timestamp
  
  // Aggregated engagement score for this session
  engagementScore?: number           // 0-100, computed from all metrics
}

/**
 * Demographic information for segmentation
 */
export interface SessionDemographics {
  ageRange?: '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
  locale?: string                    // e.g., 'en-US', 'th-TH'
  country?: string                   // ISO country code
  viewingContext?: 'alone' | 'with-others' | 'professional-review'
}

/**
 * Device information
 */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'tv' | 'unknown'
  os?: string                        // e.g., 'macOS', 'Windows', 'iOS'
  browser?: string                   // e.g., 'Chrome', 'Safari', 'Firefox'
  screenResolution?: string          // e.g., '1920x1080'
  hasWebcam: boolean
}

// =============================================================================
// METRIC POINT TYPES (Time-Series Data)
// =============================================================================

/**
 * A single data point in the behavioral timeline
 * High-volume: expect many per session, batched every 30s
 */
export interface MetricPoint {
  id?: string                        // Optional, auto-generated on server
  sessionId: string
  timestamp: number                  // Video time in seconds
  capturedAt: string                 // ISO timestamp of when this was captured
  
  type: MetricPointType
  
  // Biometric data (when type = 'biometric')
  biometric?: BiometricData
  
  // Micro-behavior data (when type = 'micro_behavior')
  microBehavior?: MicroBehaviorData
  
  // Manual reaction data (when type = 'manual_reaction')
  manualReaction?: ManualReactionData
  
  // Calibration flag
  isCalibrationPhase: boolean        // True if within first 5 mins
}

/**
 * Types of metric points
 */
export type MetricPointType = 'biometric' | 'micro_behavior' | 'manual_reaction'

/**
 * Biometric data from facial analysis
 * Computed locally via MediaPipe/TensorFlow.js
 */
export interface BiometricData {
  emotion: DetectedEmotion
  intensity: number                  // 0.0 - 1.0
  confidence: number                 // Model confidence 0.0 - 1.0
  
  // Additional signals
  gazeOnScreen: boolean              // Is user looking at screen?
  attentionScore?: number            // 0.0 - 1.0, derived from gaze
}

/**
 * Emotions detectable via facial analysis
 */
export type DetectedEmotion = 
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'confused'      // Brow furrow detection
  | 'neutral'
  | 'engaged'       // High attention, focused expression
  | 'bored'         // Low attention, gaze away
  | 'unknown'

/**
 * Micro-behavior data from user interactions
 */
export interface MicroBehaviorData {
  action: MicroBehaviorAction
  value?: number                     // Contextual value (e.g., jitter distance)
  metadata?: Record<string, unknown> // Additional context
}

/**
 * Types of micro-behaviors we track
 */
export type MicroBehaviorAction =
  | 'mouse_jitter'      // Excessive mouse movement (restlessness)
  | 'mouse_idle'        // No mouse movement for extended period
  | 'volume_up'         // User increased volume (interest or audio issues)
  | 'volume_down'       // User decreased volume
  | 'volume_mute'       // User muted
  | 'exit_fullscreen'   // User exited fullscreen (disengagement)
  | 'enter_fullscreen'  // User entered fullscreen (engagement)
  | 'pause'             // User paused video
  | 'resume'            // User resumed video
  | 'seek_forward'      // User skipped ahead
  | 'seek_backward'     // User rewound (rewatch behavior)
  | 'tab_hidden'        // User switched to another tab
  | 'tab_visible'       // User returned to the tab

/**
 * Manual reaction from emoji bar
 */
export interface ManualReactionData {
  reactionType: TimelineReactionType
  emoji: string                      // The actual emoji character
}

/**
 * Reaction types for the timeline emoji bar
 */
export type TimelineReactionType =
  | 'positive'    // 👍
  | 'laugh'       // 🤣
  | 'surprised'   // 😲
  | 'bored'       // 🥱
  | 'sad'         // 😢
  | 'love'        // ❤️
  | 'confused'    // 😕

/**
 * Emoji configuration for the reaction bar
 */
export const TIMELINE_EMOJIS: Record<TimelineReactionType, { emoji: string; label: string }> = {
  positive: { emoji: '👍', label: 'Like it' },
  laugh: { emoji: '🤣', label: 'Funny' },
  surprised: { emoji: '😲', label: 'Surprised' },
  bored: { emoji: '🥱', label: 'Boring' },
  sad: { emoji: '😢', label: 'Sad' },
  love: { emoji: '❤️', label: 'Love it' },
  confused: { emoji: '😕', label: 'Confused' },
}

// =============================================================================
// A/B TESTING TYPES
// =============================================================================

/**
 * A/B Test configuration for a screening
 */
export interface ABTestConfig {
  id: string
  screeningId: string
  isActive: boolean
  
  // Variants
  variantA: ABTestVariant
  variantB: ABTestVariant
  
  // Distribution (percentage for A, remainder goes to B)
  splitPercentage: number            // 50 = 50/50 split
  
  // Results
  results?: ABTestResults
  
  createdAt: string
  updatedAt: string
}

/**
 * A single A/B test variant
 */
export interface ABTestVariant {
  id: string
  label: string                      // e.g., "Happy Ending"
  description?: string
  
  // Content reference
  streamId: string                   // The FinalCutStream to use
  
  // Or for external uploads:
  externalVideoUrl?: string
  externalVideoDuration?: number
}

/**
 * A/B test results summary
 */
export interface ABTestResults {
  variantAStats: VariantStats
  variantBStats: VariantStats
  
  // Statistical analysis
  winningVariant?: 'A' | 'B' | 'tie'
  confidenceLevel?: number           // Statistical confidence (e.g., 0.95 = 95%)
  sampleSizeReached: boolean
  recommendedSampleSize: number
}

/**
 * Statistics for a single variant
 */
export interface VariantStats {
  sessionCount: number
  averageCompletionRate: number      // 0-100
  averageEngagementScore: number     // 0-100
  averageWatchTime: number           // Seconds
  
  // Emotion breakdown
  emotionBreakdown?: EmotionBreakdown
  
  // Retention at key moments
  retentionAt25Percent: number       // % viewers still watching at 25% mark
  retentionAt50Percent: number
  retentionAt75Percent: number
  retentionAt100Percent: number
}

/**
 * Emotion breakdown for aggregate analytics
 */
export interface EmotionBreakdown {
  happy: number                      // Percentage of time in this state
  sad: number
  surprised: number
  confused: number
  neutral: number
  engaged: number
  bored: number
}

// =============================================================================
// ANALYTICS AGGREGATION TYPES (Creator View)
// =============================================================================

/**
 * Aggregated analytics for the Creator Dashboard
 */
export interface BehavioralAnalyticsSummary {
  screeningId: string
  
  // Session counts
  totalSessions: number
  completedSessions: number
  activeSessions: number
  
  // Aggregate metrics
  averageCompletionRate: number      // 0-100
  averageEngagementScore: number     // 0-100
  averageWatchTime: number           // Seconds
  
  // Biometric summary (only from sessions with camera consent)
  biometricSessionCount: number
  emotionTimeline: EmotionTimelinePoint[]
  
  // Retention analysis
  retentionCurve: RetentionCurvePoint[]
  dropOffPoints: DropOffAnalysis[]
  
  // Demographic breakdown
  demographicBreakdown: DemographicBreakdown
  
  // Top moments
  highEngagementMoments: MomentHighlight[]
  lowEngagementMoments: MomentHighlight[]
  
  // A/B test results (if applicable)
  abTestResults?: ABTestResults
  
  // Timestamps
  updatedAt: string
}

/**
 * Emotion timeline point for heatmap visualization
 */
export interface EmotionTimelinePoint {
  timestamp: number                  // Video time in seconds
  
  // Aggregate emotion scores (0-1, averaged across all viewers)
  happiness: number
  confusion: number
  engagement: number
  
  // Sample size at this point
  viewerCount: number
}

/**
 * Retention curve point
 */
export interface RetentionCurvePoint {
  timestamp: number                  // Video time in seconds
  percentage: number                 // Percent of viewers still watching (0-100)
  viewerCount: number                // Absolute count
}

/**
 * Drop-off analysis for a specific point
 */
export interface DropOffAnalysis {
  timestamp: number
  dropOffCount: number
  dropOffPercentage: number          // What % of total viewers dropped here
  sceneNumber?: number
  possibleReason?: string            // AI-generated hypothesis
}

/**
 * Demographic breakdown for filtering
 */
export interface DemographicBreakdown {
  byAge: Record<SessionDemographics['ageRange'] & string, number>
  byGender: Record<SessionDemographics['gender'] & string, number>
  byLocale: Record<string, number>   // locale code -> count
  byDevice: Record<DeviceInfo['type'], number>
}

/**
 * Highlighted moment (high or low engagement)
 */
export interface MomentHighlight {
  timestamp: number
  durationSeconds: number            // How long this moment lasted
  type: 'high-engagement' | 'low-engagement' | 'confusion' | 'delight'
  score: number                      // Engagement/emotion score
  sceneNumber?: number
  description?: string               // What's happening in the video
}

// =============================================================================
// HEATMAP VISUALIZATION TYPES
// =============================================================================

/**
 * Heatmap data for timeline visualization
 */
export interface TimelineHeatmapData {
  screeningId: string
  videoDuration: number              // Total duration in seconds
  
  // Time buckets (e.g., every 5 seconds)
  bucketSizeSeconds: number
  buckets: HeatmapBucket[]
  
  // Filters applied
  filters: HeatmapFilters
}

/**
 * A single bucket in the heatmap
 */
export interface HeatmapBucket {
  startTime: number                  // Bucket start time
  endTime: number                    // Bucket end time
  
  // Engagement metrics (0-1 scale)
  engagementScore: number
  emotionScore: number               // Positive emotions
  confusionScore: number
  attentionScore: number
  
  // Viewer count at this point
  viewerCount: number
  
  // Color hint for visualization
  colorIntensity: number             // 0-1, for gradient
  colorType: 'positive' | 'negative' | 'neutral'
}

/**
 * Filters for heatmap data
 */
export interface HeatmapFilters {
  ageRange?: SessionDemographics['ageRange']
  gender?: SessionDemographics['gender']
  locale?: string
  variant?: 'A' | 'B'
  cameraConsentOnly?: boolean        // Only include biometric sessions
}

// =============================================================================
// API PAYLOAD TYPES
// =============================================================================

/**
 * Batched metrics payload (sent every 30 seconds)
 */
export interface MetricsBatchPayload {
  sessionId: string
  screeningId: string
  
  // Metrics collected in this batch
  metrics: Omit<MetricPoint, 'sessionId'>[]
  
  // Session state update
  currentWatchTime: number           // Current video position
  isPlaying: boolean
  
  // Batch metadata
  batchTimestamp: string             // ISO timestamp
  batchSequence: number              // Incrementing batch number
}

/**
 * Session initialization payload
 */
export interface SessionInitPayload {
  screeningId: string
  
  // Consent choices
  cameraConsentGranted: boolean
  
  // Optional demographics
  demographics?: SessionDemographics
  
  // Device info
  deviceInfo: DeviceInfo
  
  // Variant assignment (for A/B tests)
  requestedVariant?: 'A' | 'B'       // If user has localStorage preference
}

/**
 * Session initialization response
 */
export interface SessionInitResponse {
  sessionId: string
  
  // Assigned variant (may differ from requested if test is not active)
  assignedVariant: 'A' | 'B' | null
  variantStreamId?: string
  
  // Video URL to play
  videoUrl: string
  videoDuration: number
  
  // Calibration settings
  calibrationDurationSeconds: number // Default 300 (5 mins)
}

// =============================================================================
// STORAGE & CLEANUP TYPES
// =============================================================================

/**
 * Analytics report (higher value than raw data, kept longer)
 */
export interface AnalyticsReport {
  id: string
  screeningId: string
  projectId: string
  
  // Report type
  reportType: 'session-summary' | 'aggregate-summary' | 'ab-comparison' | 'retention-analysis'
  
  // Report data (polymorphic based on reportType)
  data: BehavioralAnalyticsSummary | ABTestResults | unknown
  
  // Metadata
  generatedAt: string
  expiresAt?: string                 // Optional expiration for cleanup
  
  // Storage location
  storageUrl: string                 // Vercel Blob URL
}

/**
 * Cleanup configuration
 */
export interface AnalyticsCleanupConfig {
  // Raw metric points
  rawMetricsRetentionDays: number    // Default: 30 days
  
  // Session data
  sessionRetentionDays: number       // Default: 90 days
  
  // Reports (higher value, keep longer)
  reportRetentionDays: number        // Default: 365 days
  
  // Cleanup schedule
  cleanupSchedule: 'daily' | 'weekly' | 'manual'
}

// =============================================================================
// CONSENT & PRIVACY TYPES
// =============================================================================

/**
 * Consent state for the screening viewer
 */
export interface ViewerConsentState {
  sessionId: string
  
  // Camera consent
  cameraConsent: ConsentChoice
  
  // Data collection consent
  behaviorTrackingConsent: ConsentChoice
  
  // Demographics consent
  demographicsConsent: ConsentChoice
  
  // Timestamps
  consentGrantedAt?: string
  consentDeclinedAt?: string
}

/**
 * Consent choice
 */
export type ConsentChoice = 'granted' | 'declined' | 'pending'

/**
 * Calibration state
 */
export interface CalibrationState {
  isInCalibrationPhase: boolean
  calibrationStartedAt?: number      // Video timestamp
  calibrationEndsAt?: number         // Video timestamp (startedAt + 300s)
  isCalibrationComplete: boolean
}
