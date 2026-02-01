/**
 * Behavioral Analytics Storage Service
 * 
 * Manages storage and retrieval of behavioral analytics data using Vercel Blob.
 * 
 * Storage Strategy:
 * - Sessions: Stored as individual JSON blobs, indexed by screeningId
 * - Metrics: Batched and stored in time-bucketed blobs for efficient retrieval
 * - Reports: Aggregated summaries stored for long-term retention
 * 
 * Data Lifecycle:
 * - Raw metrics: 30 days (configurable)
 * - Sessions: 90 days (configurable)
 * - Reports: 365 days (configurable, higher value)
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for type definitions
 */

import { put, del, list } from '@vercel/blob'
import type {
  BehavioralScreeningSession,
  MetricPoint,
  MetricsBatchPayload,
  SessionInitPayload,
  SessionInitResponse,
  BehavioralAnalyticsSummary,
  AnalyticsReport,
  AnalyticsCleanupConfig,
  ABTestConfig,
  TimelineHeatmapData,
  HeatmapFilters,
  HeatmapBucket,
  EmotionTimelinePoint,
  RetentionCurvePoint,
  DropOffAnalysis,
} from '@/lib/types/behavioralAnalytics'

// =============================================================================
// CONSTANTS
// =============================================================================

const BLOB_PREFIX = 'analytics'
const SESSIONS_PREFIX = `${BLOB_PREFIX}/sessions`
const METRICS_PREFIX = `${BLOB_PREFIX}/metrics`
const REPORTS_PREFIX = `${BLOB_PREFIX}/reports`
const AB_TESTS_PREFIX = `${BLOB_PREFIX}/ab-tests`

// Default retention periods (days)
const DEFAULT_CLEANUP_CONFIG: AnalyticsCleanupConfig = {
  rawMetricsRetentionDays: 30,
  sessionRetentionDays: 90,
  reportRetentionDays: 365,
  cleanupSchedule: 'weekly',
}

// Calibration duration (5 minutes)
const CALIBRATION_DURATION_SECONDS = 300

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Initialize a new screening session
 */
export async function initializeSession(
  payload: SessionInitPayload
): Promise<SessionInitResponse> {
  const sessionId = generateSessionId()
  const now = new Date().toISOString()
  
  // Determine variant assignment for A/B tests
  const abTest = await getABTestConfig(payload.screeningId)
  let assignedVariant: 'A' | 'B' | null = null
  let variantStreamId: string | undefined
  
  if (abTest?.isActive) {
    // Check localStorage preference or assign randomly
    if (payload.requestedVariant && ['A', 'B'].includes(payload.requestedVariant)) {
      assignedVariant = payload.requestedVariant
    } else {
      // Random assignment based on split percentage
      assignedVariant = Math.random() * 100 < abTest.splitPercentage ? 'A' : 'B'
    }
    variantStreamId = assignedVariant === 'A' 
      ? abTest.variantA.streamId 
      : abTest.variantB.streamId
  }
  
  // Create session record
  const session: BehavioralScreeningSession = {
    id: sessionId,
    screeningId: payload.screeningId,
    variant: assignedVariant,
    variantLabel: assignedVariant 
      ? (assignedVariant === 'A' ? abTest?.variantA.label : abTest?.variantB.label)
      : undefined,
    demographics: payload.demographics,
    durationWatched: 0,
    totalVideoDuration: 0, // Will be updated when video loads
    didFinish: false,
    completionRate: 0,
    cameraConsentGranted: payload.cameraConsentGranted,
    calibrationCompleted: false,
    deviceInfo: payload.deviceInfo,
    startedAt: now,
    lastActiveAt: now,
  }
  
  // Store session
  await saveSession(session)
  
  // TODO: Fetch actual video URL and duration from screening/stream
  // For now, return placeholder
  return {
    sessionId,
    assignedVariant,
    variantStreamId,
    videoUrl: '', // Will be populated by screening lookup
    videoDuration: 0, // Will be populated by screening lookup
    calibrationDurationSeconds: CALIBRATION_DURATION_SECONDS,
  }
}

/**
 * Save/update a session to Vercel Blob
 */
export async function saveSession(
  session: BehavioralScreeningSession
): Promise<string> {
  const path = `${SESSIONS_PREFIX}/${session.screeningId}/${session.id}.json`
  
  const blob = await put(path, JSON.stringify(session), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
  
  return blob.url
}

/**
 * Get a session by ID
 */
export async function getSession(
  screeningId: string,
  sessionId: string
): Promise<BehavioralScreeningSession | null> {
  try {
    const path = `${SESSIONS_PREFIX}/${screeningId}/${sessionId}.json`
    const { blobs } = await list({ prefix: path })
    
    if (blobs.length === 0) return null
    
    const response = await fetch(blobs[0].url)
    if (!response.ok) return null
    
    return await response.json()
  } catch (error) {
    console.error(`[Analytics] Failed to get session ${sessionId}:`, error)
    return null
  }
}

/**
 * Get all sessions for a screening
 */
export async function getSessionsForScreening(
  screeningId: string
): Promise<BehavioralScreeningSession[]> {
  try {
    const prefix = `${SESSIONS_PREFIX}/${screeningId}/`
    const { blobs } = await list({ prefix })
    
    const sessions: BehavioralScreeningSession[] = []
    
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          sessions.push(await response.json())
        }
      } catch (e) {
        console.error(`[Analytics] Failed to fetch session blob:`, e)
      }
    }
    
    return sessions
  } catch (error) {
    console.error(`[Analytics] Failed to list sessions for ${screeningId}:`, error)
    return []
  }
}

/**
 * Update session metrics (called periodically during viewing)
 */
export async function updateSessionProgress(
  screeningId: string,
  sessionId: string,
  updates: {
    durationWatched: number
    totalVideoDuration: number
    didFinish?: boolean
  }
): Promise<void> {
  const session = await getSession(screeningId, sessionId)
  if (!session) return
  
  // Update session
  session.durationWatched = updates.durationWatched
  session.totalVideoDuration = updates.totalVideoDuration
  session.didFinish = updates.didFinish ?? session.didFinish
  session.completionRate = updates.totalVideoDuration > 0
    ? Math.round((updates.durationWatched / updates.totalVideoDuration) * 100)
    : 0
  session.lastActiveAt = new Date().toISOString()
  
  // Check calibration completion
  if (!session.calibrationCompleted && updates.durationWatched >= CALIBRATION_DURATION_SECONDS) {
    session.calibrationCompleted = true
    session.calibrationEndTime = CALIBRATION_DURATION_SECONDS
  }
  
  await saveSession(session)
}

/**
 * End a session
 */
export async function endSession(
  screeningId: string,
  sessionId: string
): Promise<void> {
  const session = await getSession(screeningId, sessionId)
  if (!session) return
  
  session.endedAt = new Date().toISOString()
  session.didFinish = session.completionRate >= 95 // 95% threshold for "finished"
  
  await saveSession(session)
}

// =============================================================================
// METRICS BATCH STORAGE
// =============================================================================

/**
 * Store a batch of metrics
 * Metrics are stored in time-bucketed files for efficient retrieval
 */
export async function storeMetricsBatch(
  payload: MetricsBatchPayload
): Promise<string> {
  const { sessionId, screeningId, metrics, batchSequence, batchTimestamp } = payload
  
  // Create path: metrics/{screeningId}/{sessionId}/batch-{sequence}.json
  const path = `${METRICS_PREFIX}/${screeningId}/${sessionId}/batch-${batchSequence.toString().padStart(6, '0')}.json`
  
  // Add sessionId to each metric and store
  const enrichedMetrics: MetricPoint[] = metrics.map(m => ({
    ...m,
    sessionId,
    capturedAt: m.capturedAt || batchTimestamp,
  }))
  
  const batchData = {
    sessionId,
    screeningId,
    batchSequence,
    batchTimestamp,
    metrics: enrichedMetrics,
  }
  
  const blob = await put(path, JSON.stringify(batchData), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
  
  return blob.url
}

/**
 * Get all metrics for a session
 */
export async function getMetricsForSession(
  screeningId: string,
  sessionId: string
): Promise<MetricPoint[]> {
  try {
    const prefix = `${METRICS_PREFIX}/${screeningId}/${sessionId}/`
    const { blobs } = await list({ prefix })
    
    const allMetrics: MetricPoint[] = []
    
    // Sort blobs by name to ensure correct order
    const sortedBlobs = blobs.sort((a, b) => a.pathname.localeCompare(b.pathname))
    
    for (const blob of sortedBlobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          const batchData = await response.json()
          allMetrics.push(...batchData.metrics)
        }
      } catch (e) {
        console.error(`[Analytics] Failed to fetch metrics batch:`, e)
      }
    }
    
    return allMetrics
  } catch (error) {
    console.error(`[Analytics] Failed to get metrics for session ${sessionId}:`, error)
    return []
  }
}

/**
 * Get all metrics for a screening (across all sessions)
 */
export async function getMetricsForScreening(
  screeningId: string
): Promise<MetricPoint[]> {
  try {
    const prefix = `${METRICS_PREFIX}/${screeningId}/`
    const { blobs } = await list({ prefix })
    
    const allMetrics: MetricPoint[] = []
    
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          const batchData = await response.json()
          allMetrics.push(...batchData.metrics)
        }
      } catch (e) {
        console.error(`[Analytics] Failed to fetch metrics batch:`, e)
      }
    }
    
    return allMetrics
  } catch (error) {
    console.error(`[Analytics] Failed to get metrics for screening ${screeningId}:`, error)
    return []
  }
}

// =============================================================================
// A/B TEST MANAGEMENT
// =============================================================================

/**
 * Save A/B test configuration
 */
export async function saveABTestConfig(config: ABTestConfig): Promise<string> {
  const path = `${AB_TESTS_PREFIX}/${config.screeningId}.json`
  
  const blob = await put(path, JSON.stringify(config), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
  
  return blob.url
}

/**
 * Get A/B test configuration for a screening
 */
export async function getABTestConfig(
  screeningId: string
): Promise<ABTestConfig | null> {
  try {
    const prefix = `${AB_TESTS_PREFIX}/${screeningId}.json`
    const { blobs } = await list({ prefix })
    
    if (blobs.length === 0) return null
    
    const response = await fetch(blobs[0].url)
    if (!response.ok) return null
    
    return await response.json()
  } catch (error) {
    console.error(`[Analytics] Failed to get A/B test config for ${screeningId}:`, error)
    return null
  }
}

// =============================================================================
// ANALYTICS AGGREGATION
// =============================================================================

/**
 * Generate aggregate analytics summary for a screening
 */
export async function generateAnalyticsSummary(
  screeningId: string
): Promise<BehavioralAnalyticsSummary> {
  const sessions = await getSessionsForScreening(screeningId)
  const allMetrics = await getMetricsForScreening(screeningId)
  
  // Calculate session counts
  const totalSessions = sessions.length
  const completedSessions = sessions.filter(s => s.didFinish).length
  const activeSessions = sessions.filter(s => !s.endedAt).length
  const biometricSessions = sessions.filter(s => s.cameraConsentGranted)
  
  // Calculate aggregate metrics
  const averageCompletionRate = totalSessions > 0
    ? sessions.reduce((sum, s) => sum + s.completionRate, 0) / totalSessions
    : 0
  
  const averageWatchTime = totalSessions > 0
    ? sessions.reduce((sum, s) => sum + s.durationWatched, 0) / totalSessions
    : 0
  
  // Calculate engagement score (based on completion + interactions)
  const reactionCount = allMetrics.filter(m => m.type === 'manual_reaction').length
  const averageEngagementScore = totalSessions > 0
    ? Math.min(100, (averageCompletionRate * 0.7) + (reactionCount / totalSessions * 10 * 0.3))
    : 0
  
  // Generate emotion timeline (bucket by 5-second intervals)
  const emotionTimeline = generateEmotionTimeline(allMetrics, sessions)
  
  // Generate retention curve
  const maxDuration = Math.max(...sessions.map(s => s.totalVideoDuration), 0)
  const retentionCurve = generateRetentionCurve(sessions, maxDuration)
  
  // Find drop-off points
  const dropOffPoints = findDropOffPoints(retentionCurve)
  
  // Generate demographic breakdown
  const demographicBreakdown = generateDemographicBreakdown(sessions)
  
  // Find engagement moments
  const { highEngagementMoments, lowEngagementMoments } = findEngagementMoments(emotionTimeline)
  
  // Get A/B test results if applicable
  const abTestResults = await calculateABTestResults(screeningId, sessions)
  
  return {
    screeningId,
    totalSessions,
    completedSessions,
    activeSessions,
    averageCompletionRate,
    averageEngagementScore,
    averageWatchTime,
    biometricSessionCount: biometricSessions.length,
    emotionTimeline,
    retentionCurve,
    dropOffPoints,
    demographicBreakdown,
    highEngagementMoments,
    lowEngagementMoments,
    abTestResults,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Generate emotion timeline from biometric metrics
 */
function generateEmotionTimeline(
  metrics: MetricPoint[],
  sessions: BehavioralScreeningSession[]
): EmotionTimelinePoint[] {
  const biometricMetrics = metrics.filter(
    m => m.type === 'biometric' && m.biometric && !m.isCalibrationPhase
  )
  
  if (biometricMetrics.length === 0) return []
  
  // Bucket by 5-second intervals
  const bucketSize = 5
  const buckets = new Map<number, { happiness: number[], confusion: number[], engagement: number[], count: number }>()
  
  for (const metric of biometricMetrics) {
    const bucketStart = Math.floor(metric.timestamp / bucketSize) * bucketSize
    
    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, { happiness: [], confusion: [], engagement: [], count: 0 })
    }
    
    const bucket = buckets.get(bucketStart)!
    
    if (metric.biometric?.emotion === 'happy') {
      bucket.happiness.push(metric.biometric.intensity)
    }
    if (metric.biometric?.emotion === 'confused') {
      bucket.confusion.push(metric.biometric.intensity)
    }
    if (metric.biometric?.emotion === 'engaged' || metric.biometric?.gazeOnScreen) {
      bucket.engagement.push(metric.biometric.intensity || 0.8)
    }
    
    bucket.count++
  }
  
  // Convert to timeline points
  const timeline: EmotionTimelinePoint[] = []
  
  for (const [timestamp, bucket] of buckets.entries()) {
    timeline.push({
      timestamp,
      happiness: bucket.happiness.length > 0 
        ? bucket.happiness.reduce((a, b) => a + b, 0) / bucket.happiness.length 
        : 0,
      confusion: bucket.confusion.length > 0 
        ? bucket.confusion.reduce((a, b) => a + b, 0) / bucket.confusion.length 
        : 0,
      engagement: bucket.engagement.length > 0 
        ? bucket.engagement.reduce((a, b) => a + b, 0) / bucket.engagement.length 
        : 0.5,
      viewerCount: bucket.count,
    })
  }
  
  return timeline.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Generate retention curve
 */
function generateRetentionCurve(
  sessions: BehavioralScreeningSession[],
  maxDuration: number
): RetentionCurvePoint[] {
  if (sessions.length === 0 || maxDuration === 0) return []
  
  const curve: RetentionCurvePoint[] = []
  const bucketSize = 10 // 10-second intervals
  
  for (let timestamp = 0; timestamp <= maxDuration; timestamp += bucketSize) {
    const viewersAtPoint = sessions.filter(s => s.durationWatched >= timestamp).length
    const percentage = (viewersAtPoint / sessions.length) * 100
    
    curve.push({
      timestamp,
      percentage,
      viewerCount: viewersAtPoint,
    })
  }
  
  return curve
}

/**
 * Find significant drop-off points in retention curve
 */
function findDropOffPoints(curve: RetentionCurvePoint[]): DropOffAnalysis[] {
  const dropOffs: DropOffAnalysis[] = []
  
  for (let i = 1; i < curve.length; i++) {
    const drop = curve[i - 1].percentage - curve[i].percentage
    
    // Flag drops > 10%
    if (drop > 10) {
      dropOffs.push({
        timestamp: curve[i].timestamp,
        dropOffCount: curve[i - 1].viewerCount - curve[i].viewerCount,
        dropOffPercentage: drop,
      })
    }
  }
  
  return dropOffs
}

/**
 * Generate demographic breakdown
 */
function generateDemographicBreakdown(sessions: BehavioralScreeningSession[]) {
  const breakdown = {
    byAge: {} as Record<string, number>,
    byGender: {} as Record<string, number>,
    byLocale: {} as Record<string, number>,
    byDevice: {} as Record<string, number>,
  }
  
  for (const session of sessions) {
    // Age
    if (session.demographics?.ageRange) {
      breakdown.byAge[session.demographics.ageRange] = 
        (breakdown.byAge[session.demographics.ageRange] || 0) + 1
    }
    
    // Gender
    if (session.demographics?.gender) {
      breakdown.byGender[session.demographics.gender] = 
        (breakdown.byGender[session.demographics.gender] || 0) + 1
    }
    
    // Locale
    if (session.demographics?.locale) {
      breakdown.byLocale[session.demographics.locale] = 
        (breakdown.byLocale[session.demographics.locale] || 0) + 1
    }
    
    // Device
    if (session.deviceInfo?.type) {
      breakdown.byDevice[session.deviceInfo.type] = 
        (breakdown.byDevice[session.deviceInfo.type] || 0) + 1
    }
  }
  
  return breakdown
}

/**
 * Find high/low engagement moments from emotion timeline
 */
function findEngagementMoments(timeline: EmotionTimelinePoint[]) {
  const highEngagementMoments: BehavioralAnalyticsSummary['highEngagementMoments'] = []
  const lowEngagementMoments: BehavioralAnalyticsSummary['lowEngagementMoments'] = []
  
  for (const point of timeline) {
    // High engagement: happiness > 0.7 or engagement > 0.8
    if (point.happiness > 0.7 || point.engagement > 0.8) {
      highEngagementMoments.push({
        timestamp: point.timestamp,
        durationSeconds: 5,
        type: point.happiness > 0.7 ? 'delight' : 'high-engagement',
        score: Math.max(point.happiness, point.engagement),
      })
    }
    
    // Low engagement: confusion > 0.5 or engagement < 0.3
    if (point.confusion > 0.5) {
      lowEngagementMoments.push({
        timestamp: point.timestamp,
        durationSeconds: 5,
        type: 'confusion',
        score: point.confusion,
      })
    } else if (point.engagement < 0.3) {
      lowEngagementMoments.push({
        timestamp: point.timestamp,
        durationSeconds: 5,
        type: 'low-engagement',
        score: 1 - point.engagement,
      })
    }
  }
  
  // Return top 5 of each
  return {
    highEngagementMoments: highEngagementMoments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    lowEngagementMoments: lowEngagementMoments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
  }
}

/**
 * Calculate A/B test results
 */
async function calculateABTestResults(
  screeningId: string,
  sessions: BehavioralScreeningSession[]
) {
  const abTest = await getABTestConfig(screeningId)
  if (!abTest?.isActive) return undefined
  
  const variantASessions = sessions.filter(s => s.variant === 'A')
  const variantBSessions = sessions.filter(s => s.variant === 'B')
  
  const calculateStats = (variantSessions: BehavioralScreeningSession[]) => {
    const count = variantSessions.length
    if (count === 0) {
      return {
        sessionCount: 0,
        averageCompletionRate: 0,
        averageEngagementScore: 0,
        averageWatchTime: 0,
        retentionAt25Percent: 0,
        retentionAt50Percent: 0,
        retentionAt75Percent: 0,
        retentionAt100Percent: 0,
      }
    }
    
    return {
      sessionCount: count,
      averageCompletionRate: variantSessions.reduce((sum, s) => sum + s.completionRate, 0) / count,
      averageEngagementScore: variantSessions.reduce((sum, s) => sum + (s.engagementScore || 50), 0) / count,
      averageWatchTime: variantSessions.reduce((sum, s) => sum + s.durationWatched, 0) / count,
      retentionAt25Percent: variantSessions.filter(s => s.completionRate >= 25).length / count * 100,
      retentionAt50Percent: variantSessions.filter(s => s.completionRate >= 50).length / count * 100,
      retentionAt75Percent: variantSessions.filter(s => s.completionRate >= 75).length / count * 100,
      retentionAt100Percent: variantSessions.filter(s => s.completionRate >= 95).length / count * 100,
    }
  }
  
  const variantAStats = calculateStats(variantASessions)
  const variantBStats = calculateStats(variantBSessions)
  
  // Determine winner (simple comparison for MVP)
  let winningVariant: 'A' | 'B' | 'tie' = 'tie'
  const aScore = variantAStats.averageCompletionRate * 0.5 + variantAStats.averageEngagementScore * 0.5
  const bScore = variantBStats.averageCompletionRate * 0.5 + variantBStats.averageEngagementScore * 0.5
  
  if (aScore > bScore + 5) winningVariant = 'A'
  else if (bScore > aScore + 5) winningVariant = 'B'
  
  return {
    variantAStats,
    variantBStats,
    winningVariant,
    sampleSizeReached: variantASessions.length >= 30 && variantBSessions.length >= 30,
    recommendedSampleSize: 50,
  }
}

// =============================================================================
// HEATMAP GENERATION
// =============================================================================

/**
 * Generate heatmap data for timeline visualization
 */
export async function generateHeatmapData(
  screeningId: string,
  filters: HeatmapFilters = {}
): Promise<TimelineHeatmapData> {
  const sessions = await getSessionsForScreening(screeningId)
  const allMetrics = await getMetricsForScreening(screeningId)
  
  // Apply filters
  let filteredSessions = sessions
  
  if (filters.ageRange) {
    filteredSessions = filteredSessions.filter(s => s.demographics?.ageRange === filters.ageRange)
  }
  if (filters.gender) {
    filteredSessions = filteredSessions.filter(s => s.demographics?.gender === filters.gender)
  }
  if (filters.locale) {
    filteredSessions = filteredSessions.filter(s => s.demographics?.locale === filters.locale)
  }
  if (filters.variant) {
    filteredSessions = filteredSessions.filter(s => s.variant === filters.variant)
  }
  if (filters.cameraConsentOnly) {
    filteredSessions = filteredSessions.filter(s => s.cameraConsentGranted)
  }
  
  const filteredSessionIds = new Set(filteredSessions.map(s => s.id))
  const filteredMetrics = allMetrics.filter(
    m => filteredSessionIds.has(m.sessionId) && !m.isCalibrationPhase
  )
  
  // Determine video duration
  const videoDuration = Math.max(...sessions.map(s => s.totalVideoDuration), 0)
  const bucketSize = 5 // 5-second buckets
  
  // Build buckets
  const buckets: HeatmapBucket[] = []
  
  for (let startTime = 0; startTime < videoDuration; startTime += bucketSize) {
    const endTime = Math.min(startTime + bucketSize, videoDuration)
    
    const bucketMetrics = filteredMetrics.filter(
      m => m.timestamp >= startTime && m.timestamp < endTime
    )
    
    const biometricMetrics = bucketMetrics.filter(m => m.type === 'biometric' && m.biometric)
    const reactionMetrics = bucketMetrics.filter(m => m.type === 'manual_reaction')
    
    // Calculate scores
    let engagementScore = 0.5 // Default neutral
    let emotionScore = 0.5
    let confusionScore = 0
    let attentionScore = 0.5
    
    if (biometricMetrics.length > 0) {
      const happyMetrics = biometricMetrics.filter(m => m.biometric?.emotion === 'happy')
      const confusedMetrics = biometricMetrics.filter(m => m.biometric?.emotion === 'confused')
      const engagedMetrics = biometricMetrics.filter(m => 
        m.biometric?.emotion === 'engaged' || m.biometric?.gazeOnScreen
      )
      
      emotionScore = happyMetrics.length > 0
        ? happyMetrics.reduce((sum, m) => sum + (m.biometric?.intensity || 0), 0) / happyMetrics.length
        : 0.5
      
      confusionScore = confusedMetrics.length > 0
        ? confusedMetrics.reduce((sum, m) => sum + (m.biometric?.intensity || 0), 0) / confusedMetrics.length
        : 0
      
      attentionScore = engagedMetrics.length > 0
        ? engagedMetrics.reduce((sum, m) => sum + (m.biometric?.intensity || 0.8), 0) / engagedMetrics.length
        : 0.5
    }
    
    // Factor in manual reactions
    const positiveReactions = reactionMetrics.filter(
      m => ['positive', 'laugh', 'love', 'surprised'].includes(m.manualReaction?.reactionType || '')
    ).length
    const negativeReactions = reactionMetrics.filter(
      m => ['bored', 'confused'].includes(m.manualReaction?.reactionType || '')
    ).length
    
    if (reactionMetrics.length > 0) {
      const reactionScore = (positiveReactions - negativeReactions) / reactionMetrics.length
      emotionScore = (emotionScore + (reactionScore + 1) / 2) / 2 // Blend with biometric
    }
    
    engagementScore = (emotionScore + attentionScore + (1 - confusionScore)) / 3
    
    // Determine color
    let colorType: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (engagementScore > 0.6) colorType = 'positive'
    else if (engagementScore < 0.4 || confusionScore > 0.5) colorType = 'negative'
    
    // Count viewers at this point
    const viewerCount = filteredSessions.filter(s => s.durationWatched >= startTime).length
    
    buckets.push({
      startTime,
      endTime,
      engagementScore,
      emotionScore,
      confusionScore,
      attentionScore,
      viewerCount,
      colorIntensity: Math.abs(engagementScore - 0.5) * 2, // 0-1 based on deviation from neutral
      colorType,
    })
  }
  
  return {
    screeningId,
    videoDuration,
    bucketSizeSeconds: bucketSize,
    buckets,
    filters,
  }
}

// =============================================================================
// REPORT STORAGE
// =============================================================================

/**
 * Save an analytics report (higher-value aggregated data)
 */
export async function saveReport(report: AnalyticsReport): Promise<string> {
  const path = `${REPORTS_PREFIX}/${report.projectId}/${report.screeningId}/${report.id}.json`
  
  const blob = await put(path, JSON.stringify(report), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
  
  return blob.url
}

/**
 * Get reports for a screening
 */
export async function getReportsForScreening(
  projectId: string,
  screeningId: string
): Promise<AnalyticsReport[]> {
  try {
    const prefix = `${REPORTS_PREFIX}/${projectId}/${screeningId}/`
    const { blobs } = await list({ prefix })
    
    const reports: AnalyticsReport[] = []
    
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url)
        if (response.ok) {
          reports.push(await response.json())
        }
      } catch (e) {
        console.error(`[Analytics] Failed to fetch report:`, e)
      }
    }
    
    return reports.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    )
  } catch (error) {
    console.error(`[Analytics] Failed to get reports for ${screeningId}:`, error)
    return []
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Run cleanup to remove old analytics data
 */
export async function runAnalyticsCleanup(
  config: AnalyticsCleanupConfig = DEFAULT_CLEANUP_CONFIG
): Promise<{ deleted: number; errors: number }> {
  const now = new Date()
  let deleted = 0
  let errors = 0
  
  // Helper to check if blob is expired
  const isExpired = (uploadedAt: Date, retentionDays: number): boolean => {
    const expiryDate = new Date(uploadedAt)
    expiryDate.setDate(expiryDate.getDate() + retentionDays)
    return now > expiryDate
  }
  
  // Clean up raw metrics
  try {
    const { blobs: metricBlobs } = await list({ prefix: METRICS_PREFIX })
    for (const blob of metricBlobs) {
      if (isExpired(blob.uploadedAt, config.rawMetricsRetentionDays)) {
        try {
          await del(blob.url)
          deleted++
        } catch (e) {
          errors++
        }
      }
    }
  } catch (e) {
    console.error('[Analytics Cleanup] Failed to clean metrics:', e)
    errors++
  }
  
  // Clean up sessions
  try {
    const { blobs: sessionBlobs } = await list({ prefix: SESSIONS_PREFIX })
    for (const blob of sessionBlobs) {
      if (isExpired(blob.uploadedAt, config.sessionRetentionDays)) {
        try {
          await del(blob.url)
          deleted++
        } catch (e) {
          errors++
        }
      }
    }
  } catch (e) {
    console.error('[Analytics Cleanup] Failed to clean sessions:', e)
    errors++
  }
  
  // Clean up old reports (but keep longer)
  try {
    const { blobs: reportBlobs } = await list({ prefix: REPORTS_PREFIX })
    for (const blob of reportBlobs) {
      if (isExpired(blob.uploadedAt, config.reportRetentionDays)) {
        try {
          await del(blob.url)
          deleted++
        } catch (e) {
          errors++
        }
      }
    }
  } catch (e) {
    console.error('[Analytics Cleanup] Failed to clean reports:', e)
    errors++
  }
  
  console.log(`[Analytics Cleanup] Completed: ${deleted} deleted, ${errors} errors`)
  
  return { deleted, errors }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `ses_${timestamp}_${random}`
}
