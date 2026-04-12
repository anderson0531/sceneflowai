/**
 * RenderStrategyRouter - Determines whether to use local or server rendering
 * 
 * Routes render requests based on:
 * - User subscription tier
 * - Video duration and complexity
 * - Output resolution
 * - Browser capabilities
 * - User preference
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

// =============================================================================
// IMPORTANT: TDZ Prevention
// =============================================================================
// Do NOT import from LocalRenderService at module level.
// The circular import chain (DirectorConsole → SceneProductionMixer → RenderStrategyRouter → LocalRenderService)
// causes TDZ errors in production builds. Constants are duplicated here and the browser
// capability check is inlined to break the dependency.
//
// If LOCAL_RENDER_MAX_DURATION changes in LocalRenderService.ts, update it here too.
// =============================================================================

/** Max duration for local rendering (seconds) - MUST match LocalRenderService.ts */
const LOCAL_RENDER_MAX_DURATION = 300

/** Max resolution for local rendering - MUST match LocalRenderService.ts */
const LOCAL_RENDER_MAX_RESOLUTION = '4K'

/**
 * Check if local rendering is supported in this browser
 * Inlined from LocalRenderService to avoid circular import TDZ
 */
function isLocalRenderSupported(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering not supported' }
  }
  
  if (!window.MediaRecorder) {
    return { supported: false, reason: 'MediaRecorder API not available' }
  }
  
  // Check for supported video codecs
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  
  let hasSupportedCodec = false
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      hasSupportedCodec = true
      break
    }
  }
  
  if (!hasSupportedCodec) {
    return { supported: false, reason: 'No supported video codec found' }
  }
  
  if (!window.AudioContext && !(window as unknown as { webkitAudioContext: unknown }).webkitAudioContext) {
    return { supported: false, reason: 'Web Audio API not available' }
  }
  
  return { supported: true }
}

// =============================================================================
// Types
// =============================================================================

export type RenderMode = 'local' | 'server' | 'headless' | 'auto'

export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'studio' | 'enterprise'

export interface RenderDecision {
  /** Chosen render mode */
  mode: 'local' | 'server'
  /** Human-readable reason for the decision */
  reason: string
  /** Whether user can override this decision */
  canOverride: boolean
  /** Warning message if any */
  warning?: string
  /** Estimated render time in seconds */
  estimatedTime?: number
  /** Estimated credit cost (server only) */
  estimatedCredits?: number
}

export interface RenderContext {
  /** Video duration in seconds */
  duration: number
  /** Output resolution */
  resolution: '720p' | '1080p' | '4K'
  /** Number of video segments */
  segmentCount: number
  /** Number of audio tracks */
  audioTrackCount: number
  /** Has text overlays */
  hasTextOverlays: boolean
  /** Number of text overlays */
  textOverlayCount: number
  /** Whether watermark is enabled */
  hasWatermark?: boolean
  /** User's subscription tier */
  userTier: SubscriptionTier
  /** User's remaining server renders this month (for trial/starter) */
  remainingServerRenders?: number
  /** User's preferred render mode */
  userPreference?: RenderMode
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Server render limits per tier (per month)
 * trial/starter get limited server renders to control costs
 */
export const SERVER_RENDER_LIMITS: Record<SubscriptionTier, number> = {
  trial: 3,
  starter: 10,
  pro: Infinity,
  studio: Infinity,
  enterprise: Infinity,
}

/**
 * Credit costs for server rendering (per minute of video)
 */
export const SERVER_RENDER_CREDITS_PER_MINUTE = 5

/**
 * Thresholds for routing decisions
 * Now uses local constants to avoid TDZ from circular imports
 */
export const getRoutingThresholds = () => ({
  /** Duration above which server is recommended (seconds) */
  DURATION_SERVER_RECOMMENDED: 30,
  /** Duration above which server is required (seconds) */
  DURATION_SERVER_REQUIRED: LOCAL_RENDER_MAX_DURATION,
  /** Segment count above which server is recommended */
  SEGMENTS_SERVER_RECOMMENDED: 10,
  /** Audio tracks above which server is recommended */
  AUDIO_TRACKS_SERVER_RECOMMENDED: 4,
} as const)

/**
 * Static routing thresholds - safe to use at module level now that
 * LOCAL_RENDER_MAX_DURATION is defined locally (no circular import)
 */
export const ROUTING_THRESHOLDS = {
  DURATION_SERVER_RECOMMENDED: 30,
  DURATION_SERVER_REQUIRED: LOCAL_RENDER_MAX_DURATION,
  SEGMENTS_SERVER_RECOMMENDED: 10,
  AUDIO_TRACKS_SERVER_RECOMMENDED: 4,
} as const

// =============================================================================
// Render Strategy Router
// =============================================================================

/**
 * Determine the optimal render strategy based on context
 */
export function determineRenderStrategy(context: RenderContext): RenderDecision {
  const {
    duration,
    resolution,
    segmentCount,
    audioTrackCount,
    hasTextOverlays,
    textOverlayCount,
    hasWatermark = false,
    userTier,
    remainingServerRenders,
    userPreference,
  } = context
  
  // Check browser capabilities first
  const localSupport = isLocalRenderSupported()
  
  // =========================================================================
  // Hard constraints (cannot be overridden)
  // =========================================================================
  
  // 4K always requires server rendering
  if (resolution === '4K') {
    return {
      mode: 'server',
      reason: '4K resolution requires server rendering',
      canOverride: false,
      estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
      estimatedTime: duration * 2, // Rough estimate
    }
  }
  
  // Duration exceeds local limit
  if (duration > LOCAL_RENDER_MAX_DURATION) {
    return {
      mode: 'server',
      reason: `Video duration (${Math.round(duration)}s) exceeds local render limit (${LOCAL_RENDER_MAX_DURATION}s)`,
      canOverride: false,
      estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
      estimatedTime: duration * 1.5,
    }
  }
  
  // Browser doesn't support local rendering
  if (!localSupport.supported) {
    return {
      mode: 'server',
      reason: localSupport.reason || 'Local rendering not supported in this browser',
      canOverride: false,
      estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
      estimatedTime: duration * 1.5,
    }
  }
  
  // =========================================================================
  // Tier-based routing
  // =========================================================================
  
  // Trial users: local only (unless they have remaining server renders)
  if (userTier === 'trial') {
    if (remainingServerRenders !== undefined && remainingServerRenders <= 0) {
      return {
        mode: 'local',
        reason: 'Trial tier: server render limit reached. Upgrade for more server renders.',
        canOverride: false,
        warning: 'Local rendering may be slower on complex videos',
        estimatedTime: duration * 3, // Local is slower
      }
    }
    
    // Trial with remaining renders - default to local but allow override
    if (userPreference === 'server' && remainingServerRenders && remainingServerRenders > 0) {
      return {
        mode: 'server',
        reason: `Using server render (${remainingServerRenders} remaining this month)`,
        canOverride: true,
        estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
        estimatedTime: duration * 1.5,
      }
    }
    
    return {
      mode: 'local',
      reason: 'Trial tier: using local rendering (faster, saves server renders)',
      canOverride: remainingServerRenders !== undefined && remainingServerRenders > 0,
      estimatedTime: duration * 2.5,
    }
  }
  
  // Starter users: similar logic
  if (userTier === 'starter') {
    if (remainingServerRenders !== undefined && remainingServerRenders <= 0) {
      return {
        mode: 'local',
        reason: 'Starter tier: monthly server render limit reached. Upgrade for unlimited.',
        canOverride: false,
        warning: 'Local rendering may be slower on complex videos',
        estimatedTime: duration * 3,
      }
    }
  }
  
  // =========================================================================
  // User preference (for pro+ tiers or when override is allowed)
  // =========================================================================
  
  if (userPreference === 'local') {
    return {
      mode: 'local',
      reason: 'User preference: local rendering',
      canOverride: true,
      estimatedTime: duration * 2.5,
    }
  }
  
  if (userPreference === 'server') {
    return {
      mode: 'server',
      reason: 'User preference: server rendering',
      canOverride: true,
      estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
      estimatedTime: duration * 1.5,
    }
  }
  
  // =========================================================================
  // Auto mode: choose based on complexity
  // =========================================================================
  
  // Calculate complexity score
  const complexityScore = calculateComplexityScore(context)
  
  // Preserve overlays/watermarks: cloud rendering is more deterministic than browser capture.
  if (hasTextOverlays || hasWatermark) {
    return {
      mode: 'server',
      reason: 'Text/watermark overlays are enabled. Cloud render is recommended for consistent burn-in.',
      canOverride: true,
      estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
      estimatedTime: duration * 1.5,
    }
  }

  // Short, simple videos: local is faster (no upload/download)
  if (duration < ROUTING_THRESHOLDS.DURATION_SERVER_RECOMMENDED && complexityScore < 3 && audioTrackCount <= 1) {
    return {
      mode: 'local',
      reason: 'Quick render: local is faster for short videos',
      canOverride: userTier !== 'trial',
      estimatedTime: duration * 2,
    }
  }
  
  // Complex videos: server is more reliable
  if (complexityScore >= 5) {
    return {
      mode: 'server',
      reason: 'Complex video: server rendering recommended for reliability',
      canOverride: true,
      estimatedCredits: Math.ceil(duration / 60) * SERVER_RENDER_CREDITS_PER_MINUTE,
      estimatedTime: duration * 1.5,
      warning: 'Local rendering may fail on complex videos',
    }
  }
  
  // Medium complexity: default to local for cost savings, allow override
  return {
    mode: 'local',
    reason: 'Default: local rendering (instant start, no credits used)',
    canOverride: true,
    estimatedTime: duration * 2.5,
  }
}

/**
 * Calculate a complexity score for routing decisions
 * Higher score = more complex = server recommended
 */
function calculateComplexityScore(context: RenderContext): number {
  let score = 0
  
  // Duration factor
  if (context.duration > 45) score += 2
  else if (context.duration > 30) score += 1
  
  // Segment count factor
  if (context.segmentCount > ROUTING_THRESHOLDS.SEGMENTS_SERVER_RECOMMENDED) score += 2
  else if (context.segmentCount > 5) score += 1
  
  // Audio complexity
  if (context.audioTrackCount > ROUTING_THRESHOLDS.AUDIO_TRACKS_SERVER_RECOMMENDED) score += 2
  else if (context.audioTrackCount > 2) score += 1
  
  // Text overlays
  if (context.hasTextOverlays) {
    score += 1
    if (context.textOverlayCount > 3) score += 1
  }

  // Watermark burn-in adds extra rendering complexity
  if (context.hasWatermark) {
    score += 1
  }
  
  // Resolution
  if (context.resolution === '4K') score += 2
  else if (context.resolution === '1080p') score += 1
  
  return score
}

/**
 * Check if user can use server rendering
 */
export function canUseServerRendering(
  userTier: SubscriptionTier,
  remainingServerRenders?: number
): { allowed: boolean; reason?: string } {
  // Pro+ tiers always have access
  if (['pro', 'studio', 'enterprise'].includes(userTier)) {
    return { allowed: true }
  }
  
  // Trial/Starter: check remaining renders
  if (remainingServerRenders === undefined) {
    return { allowed: true } // Assume allowed if not tracked
  }
  
  if (remainingServerRenders <= 0) {
    const limit = SERVER_RENDER_LIMITS[userTier]
    return {
      allowed: false,
      reason: `${userTier === 'trial' ? 'Trial' : 'Starter'} tier: ${limit} server renders/month limit reached`,
    }
  }
  
  return { allowed: true }
}

/**
 * Get render mode options for UI display
 */
export function getRenderModeOptions(context: RenderContext): Array<{
  mode: RenderMode
  label: string
  description: string
  available: boolean
  recommended: boolean
  badge?: string
}> {
  const decision = determineRenderStrategy({ ...context, userPreference: 'auto' })
  const localSupport = isLocalRenderSupported()
  const canServer = canUseServerRendering(context.userTier, context.remainingServerRenders)
  
  // Pro Cloud (headless) is available for pro+ tiers or 4K renders
  const canHeadless = ['pro', 'studio', 'enterprise'].includes(context.userTier)
  
  return [
    {
      mode: 'local',
      label: 'Browser (MP4/WebM)',
      description:
        'Local render up to 4K • MP4 when the browser supports H.264 recording, else WebM',
      available: localSupport.supported && context.duration <= LOCAL_RENDER_MAX_DURATION,
      recommended: decision.mode === 'local',
      badge: decision.mode === 'local' ? 'Recommended' : undefined,
    },
    {
      mode: 'server',
      label: '1080/4K Final',
      description: `Server MP4 at your Output resolution • ${SERVER_RENDER_CREDITS_PER_MINUTE} credits/min`,
      available: canServer.allowed,
      recommended: decision.mode === 'server',
      badge: decision.mode === 'server' ? 'Recommended' : canServer.allowed ? undefined : 'Upgrade',
    },
    {
      mode: 'headless',
      label: '4K Pro Cloud',
      description:
        'Headless WebM at your Output resolution • Frame-accurate overlays and watermarks when enabled',
      available: canHeadless,
      recommended: context.resolution === '4K' || context.duration > 60,
      badge: canHeadless ? 'Pro' : 'Pro Plan',
    },
    {
      mode: 'auto',
      label: 'Auto',
      description: 'Let SceneFlow choose the best option',
      available: true,
      recommended: false,
    },
  ]
}

export default determineRenderStrategy
