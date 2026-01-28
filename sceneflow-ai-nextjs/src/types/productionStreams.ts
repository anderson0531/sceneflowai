/**
 * Production Streams Type Definitions
 * 
 * Extended types for managing multi-stream production workflows:
 * - Animatic streams (Ken Burns keyframes + audio)
 * - Video streams (AI-generated video clips)
 * - Project-level stream aggregation
 * - Final Cut stream selection
 * - Shared review feedback
 * 
 * @see /components/vision/scene-production/types.ts for scene-level types
 */

import type {
  ProductionStream,
  ProductionStreamType,
  ProductionStreamStatus,
  AnimaticRenderSettings,
  VideoRenderSettings,
} from '@/components/vision/scene-production/types'

// Re-export for convenience
export type {
  ProductionStream,
  ProductionStreamType,
  ProductionStreamStatus,
  AnimaticRenderSettings,
  VideoRenderSettings,
}

// ============================================================================
// Project-Level Stream Aggregation
// ============================================================================

/**
 * Summary of production streams for a single scene
 */
export interface SceneStreamSummary {
  sceneId: string
  sceneNumber: number
  sceneTitle?: string
  /** Duration based on segments (for animatic) */
  segmentDuration: number
  /** All production streams for this scene */
  streams: ProductionStream[]
  /** Available languages with completed streams */
  availableLanguages: {
    animatic: string[]
    video: string[]
  }
}

/**
 * Project-level production summary across all scenes
 */
export interface ProjectProductionSummary {
  projectId: string
  projectTitle: string
  totalScenes: number
  
  /** Animatic production status */
  animatic: {
    /** Languages with at least one scene rendered */
    languages: string[]
    /** Number of scenes with complete animatic per language */
    completedByLanguage: Record<string, number>
    /** Total duration of completed animatics (primary language) */
    totalDuration: number
    /** Estimated render time for remaining scenes (seconds) */
    estimatedRenderTime: number
  }
  
  /** Video production status */
  video: {
    /** Languages with at least one scene rendered */
    languages: string[]
    /** Number of scenes with complete video per language */
    completedByLanguage: Record<string, number>
    /** Total duration of completed videos (primary language) */
    totalDuration: number
    /** Estimated render time for remaining scenes (seconds) */
    estimatedRenderTime: number
    /** Estimated cost for remaining scenes (USD) */
    estimatedCost: number
  }
  
  /** Overall readiness for Final Cut */
  readiness: {
    /** Can proceed with animatic-only export */
    animaticReady: boolean
    /** Can proceed with video export */
    videoReady: boolean
    /** Scenes missing any production streams */
    missingScenes: string[]
    /** Scenes with outdated streams */
    outdatedScenes: string[]
  }
}

// ============================================================================
// Final Cut Stream Selection
// ============================================================================

/**
 * Stream selection for a single scene in Final Cut
 */
export interface SceneStreamSelection {
  sceneId: string
  streamType: ProductionStreamType
  language: string
  /** Reference to the selected stream (if exists) */
  streamId?: string
  /** Whether the selection is valid (stream exists and is complete) */
  isValid: boolean
}

/**
 * Complete Final Cut configuration
 */
export interface FinalCutConfig {
  projectId: string
  /** Primary language for the export */
  primaryLanguage: string
  /** Stream selection for each scene */
  sceneSelections: SceneStreamSelection[]
  /** Export settings */
  exportSettings: FinalCutExportSettings
}

/**
 * Final Cut export settings
 */
export interface FinalCutExportSettings {
  /** Output resolution */
  resolution: '720p' | '1080p' | '4K'
  /** Include opening title card */
  includeTitleCard: boolean
  /** Include closing credits */
  includeCredits: boolean
  /** Transition between scenes */
  sceneTransition: 'cut' | 'crossfade' | 'fade-to-black'
  /** Scene transition duration (seconds) */
  sceneTransitionDuration: number
}

/**
 * Default Final Cut export settings
 */
export const DEFAULT_FINAL_CUT_SETTINGS: FinalCutExportSettings = {
  resolution: '1080p',
  includeTitleCard: true,
  includeCredits: true,
  sceneTransition: 'fade-to-black',
  sceneTransitionDuration: 1.0,
}

// ============================================================================
// Shared Review & Feedback
// ============================================================================

/**
 * Shared review link configuration
 */
export interface SharedReviewLink {
  id: string
  shareToken: string
  projectId: string
  /** Optional title for the shared review */
  title?: string
  /** Optional description */
  description?: string
  /** Password protection (hashed) */
  passwordHash?: string
  /** Expiration date (null = never expires) */
  expiresAt?: string | null
  /** Maximum views (null = unlimited) */
  maxViews?: number | null
  /** Current view count */
  viewCount: number
  /** Filter to specific scenes (null = all scenes) */
  sceneFilter?: string[] | null
  /** Allowed languages for reviewers */
  languagesAllowed: string[]
  /** Whether feedback is enabled */
  allowFeedback: boolean
  /** Whether scoring is enabled */
  allowScoring: boolean
  /** Whether feedback can be anonymous */
  anonymousFeedback: boolean
  /** Creation timestamp */
  createdAt: string
  /** Creator user ID */
  createdBy?: string
  /** Whether the link is active */
  isActive: boolean
}

/**
 * Scene feedback from a reviewer
 */
export interface SceneFeedback {
  id: string
  shareToken: string
  sceneId: string
  /** Reviewer identification (optional if anonymous) */
  reviewerName?: string
  reviewerEmail?: string
  /** Scores (1-10 scale) */
  scores: {
    overall?: number
    pacing?: number
    visual?: number
    audio?: number
    story?: number
  }
  /** Written feedback */
  feedbackText?: string
  /** Timestamped notes during playback */
  timestampNotes?: Array<{
    time: number
    note: string
  }>
  /** Submission timestamp */
  submittedAt: string
}

/**
 * AI-generated feedback summary
 */
export interface FeedbackSummary {
  projectId: string
  /** Total number of feedback submissions */
  totalResponses: number
  /** Overall score averages */
  averageScores: {
    overall: number
    pacing: number
    visual: number
    audio: number
    story: number
  }
  /** Per-scene score averages */
  sceneScores: Record<string, {
    overall: number
    responseCount: number
  }>
  /** AI-generated summary of all feedback */
  aiSummary: string
  /** AI-generated revision recommendations */
  revisionRecommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    sceneId?: string
    recommendation: string
    basedOn: string  // Quote or reference from feedback
  }>
  /** When the summary was generated */
  generatedAt: string
}

// ============================================================================
// Render Queue & Job Tracking
// ============================================================================

/**
 * Render queue item for batch processing
 */
export interface RenderQueueItem {
  id: string
  projectId: string
  sceneId: string
  streamType: ProductionStreamType
  language: string
  settings: AnimaticRenderSettings | VideoRenderSettings
  priority: 'low' | 'normal' | 'high'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  /** Progress percentage (0-100) */
  progress: number
}

/**
 * Batch render request for multiple scenes/languages
 */
export interface BatchRenderRequest {
  projectId: string
  /** Scenes to render (empty = all scenes) */
  sceneIds?: string[]
  /** Languages to render */
  languages: string[]
  /** Stream type to render */
  streamType: ProductionStreamType
  /** Render settings */
  settings: AnimaticRenderSettings | VideoRenderSettings
  /** Whether to skip already-complete streams */
  skipCompleted: boolean
  /** Whether to re-render outdated streams */
  reRenderOutdated: boolean
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate source hash for staleness detection
 * Should be called when segments or audio change
 */
export function calculateSourceHash(
  segments: Array<{ segmentId: string; imageUrl?: string; imageDuration?: number }>,
  audioUrls: string[]
): string {
  const sourceData = JSON.stringify({
    segments: segments.map(s => ({
      id: s.segmentId,
      url: s.imageUrl,
      duration: s.imageDuration,
    })),
    audio: audioUrls.sort(),
  })
  
  // Simple hash - in production this would use crypto.createHash('sha256')
  let hash = 0
  for (let i = 0; i < sourceData.length; i++) {
    const char = sourceData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Check if a stream is outdated based on source hash
 */
export function isStreamOutdated(
  stream: ProductionStream,
  currentSourceHash: string
): boolean {
  if (!stream.sourceHash) return false
  return stream.sourceHash !== currentSourceHash
}

/**
 * Get the best available stream for a scene (prefers video, falls back to animatic)
 */
export function getBestStream(
  streams: ProductionStream[],
  language: string,
  preferType: ProductionStreamType = 'video'
): ProductionStream | undefined {
  const completed = streams.filter(s => 
    s.language === language && 
    s.status === 'complete' &&
    s.mp4Url
  )
  
  // Try preferred type first
  const preferred = completed.find(s => s.streamType === preferType)
  if (preferred) return preferred
  
  // Fall back to other type
  const fallback = completed.find(s => s.streamType !== preferType)
  return fallback
}

/**
 * Group streams by type and language
 */
export function groupStreamsByTypeAndLanguage(
  streams: ProductionStream[]
): Record<ProductionStreamType, Record<string, ProductionStream>> {
  const result: Record<ProductionStreamType, Record<string, ProductionStream>> = {
    animatic: {},
    video: {},
  }
  
  for (const stream of streams) {
    result[stream.streamType][stream.language] = stream
  }
  
  return result
}

/**
 * Estimate animatic render time based on scene duration
 * Animatics are fast: roughly 1:1 ratio (1 min scene = ~1 min render)
 */
export function estimateAnimaticRenderTime(sceneDurationSeconds: number): number {
  // Base overhead + processing time
  const overhead = 10 // 10 seconds base
  const processingRatio = 0.5 // 0.5x real-time for FFmpeg
  return overhead + (sceneDurationSeconds * processingRatio)
}

/**
 * Estimate video render time based on scene duration
 * Videos are slow: roughly 10:1 ratio (1 min scene = ~10 min render)
 */
export function estimateVideoRenderTime(sceneDurationSeconds: number): number {
  // Base overhead + AI generation time
  const overhead = 30 // 30 seconds base
  const generationRatio = 10 // 10x real-time for AI video
  return overhead + (sceneDurationSeconds * generationRatio)
}

/**
 * Estimate video render cost based on duration
 * Based on typical AI video generation pricing
 */
export function estimateVideoCost(sceneDurationSeconds: number): number {
  // Approximately $0.05 per second of video
  const costPerSecond = 0.05
  return sceneDurationSeconds * costPerSecond
}
