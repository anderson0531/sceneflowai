/**
 * Micro-Behavior Tracking Hooks
 * 
 * Tracks user interactions that indicate engagement levels:
 * - Mouse jitter (restlessness)
 * - Volume changes (audio issues or interest)
 * - Fullscreen events (engagement)
 * - Tab visibility (attention)
 * - Video playback events (pause, seek, etc.)
 * 
 * All events are batched and sent every 30 seconds.
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { 
  MetricPoint, 
  MicroBehaviorAction,
  MicroBehaviorData,
} from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

export interface MicroBehaviorEvent {
  timestamp: number              // Video timestamp
  action: MicroBehaviorAction
  value?: number
  metadata?: Record<string, unknown>
}

export interface UseMicroBehaviorTrackingOptions {
  /** Reference to the video element */
  videoRef: React.RefObject<HTMLVideoElement | null>
  /** Whether tracking is enabled */
  enabled: boolean
  /** Callback when events are captured */
  onEvent: (event: MicroBehaviorEvent) => void
  /** Mouse jitter threshold (pixels per 5s interval) */
  jitterThreshold?: number
  /** Idle threshold (seconds without movement) */
  idleThreshold?: number
}

export interface UseMicroBehaviorTrackingResult {
  /** Total events captured this session */
  eventCount: number
  /** Current mouse jitter score (pixels in last 5s) */
  currentJitter: number
  /** Whether user appears restless */
  isRestless: boolean
  /** Time since last mouse movement (seconds) */
  idleTime: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_JITTER_THRESHOLD = 1000  // 1000 pixels in 5 seconds = restless
const DEFAULT_IDLE_THRESHOLD = 30       // 30 seconds without movement
const JITTER_SAMPLE_INTERVAL = 5000     // Calculate jitter every 5 seconds
const IDLE_CHECK_INTERVAL = 1000        // Check idle every second

// ============================================================================
// Hook: useMicroBehaviorTracking
// ============================================================================

export function useMicroBehaviorTracking({
  videoRef,
  enabled,
  onEvent,
  jitterThreshold = DEFAULT_JITTER_THRESHOLD,
  idleThreshold = DEFAULT_IDLE_THRESHOLD,
}: UseMicroBehaviorTrackingOptions): UseMicroBehaviorTrackingResult {
  // State
  const [eventCount, setEventCount] = useState(0)
  const [currentJitter, setCurrentJitter] = useState(0)
  const [isRestless, setIsRestless] = useState(false)
  const [idleTime, setIdleTime] = useState(0)
  
  // Refs for tracking
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null)
  const mouseDistanceAccumulator = useRef(0)
  const lastMovementTime = useRef(Date.now())
  const lastVolume = useRef(1)
  const wasFullscreen = useRef(false)
  
  // ============================================================================
  // Helper: Get current video time
  // ============================================================================
  
  const getCurrentVideoTime = useCallback((): number => {
    return videoRef.current?.currentTime ?? 0
  }, [videoRef])
  
  // ============================================================================
  // Helper: Emit event
  // ============================================================================
  
  const emitEvent = useCallback((
    action: MicroBehaviorAction,
    value?: number,
    metadata?: Record<string, unknown>
  ) => {
    if (!enabled) return
    
    const event: MicroBehaviorEvent = {
      timestamp: getCurrentVideoTime(),
      action,
      value,
      metadata,
    }
    
    onEvent(event)
    setEventCount(prev => prev + 1)
  }, [enabled, getCurrentVideoTime, onEvent])
  
  // ============================================================================
  // Mouse Movement Tracking
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      lastMovementTime.current = now
      
      if (lastMousePosition.current) {
        const dx = e.clientX - lastMousePosition.current.x
        const dy = e.clientY - lastMousePosition.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        mouseDistanceAccumulator.current += distance
      }
      
      lastMousePosition.current = { x: e.clientX, y: e.clientY }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [enabled])
  
  // ============================================================================
  // Jitter Calculation (every 5 seconds)
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) return
    
    const interval = setInterval(() => {
      const jitter = mouseDistanceAccumulator.current
      setCurrentJitter(jitter)
      
      const restless = jitter > jitterThreshold
      setIsRestless(restless)
      
      if (restless) {
        emitEvent('mouse_jitter', jitter)
      }
      
      // Reset accumulator for next interval
      mouseDistanceAccumulator.current = 0
    }, JITTER_SAMPLE_INTERVAL)
    
    return () => clearInterval(interval)
  }, [enabled, jitterThreshold, emitEvent])
  
  // ============================================================================
  // Idle Time Tracking
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) return
    
    const interval = setInterval(() => {
      const now = Date.now()
      const idle = (now - lastMovementTime.current) / 1000
      setIdleTime(idle)
      
      // Emit idle event when threshold is crossed
      if (idle >= idleThreshold && idle < idleThreshold + 1) {
        emitEvent('mouse_idle', idle)
      }
    }, IDLE_CHECK_INTERVAL)
    
    return () => clearInterval(interval)
  }, [enabled, idleThreshold, emitEvent])
  
  // ============================================================================
  // Volume Change Tracking
  // ============================================================================
  
  useEffect(() => {
    if (!enabled || !videoRef.current) return
    
    const video = videoRef.current
    
    const handleVolumeChange = () => {
      const newVolume = video.volume
      const wasMuted = lastVolume.current === 0 || video.muted
      const isMuted = newVolume === 0 || video.muted
      
      if (isMuted && !wasMuted) {
        emitEvent('volume_mute')
      } else if (newVolume > lastVolume.current) {
        emitEvent('volume_up', newVolume)
      } else if (newVolume < lastVolume.current) {
        emitEvent('volume_down', newVolume)
      }
      
      lastVolume.current = newVolume
    }
    
    video.addEventListener('volumechange', handleVolumeChange)
    
    return () => {
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [enabled, videoRef, emitEvent])
  
  // ============================================================================
  // Fullscreen Tracking
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) return
    
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement
      
      if (isFullscreen && !wasFullscreen.current) {
        emitEvent('enter_fullscreen')
      } else if (!isFullscreen && wasFullscreen.current) {
        emitEvent('exit_fullscreen')
      }
      
      wasFullscreen.current = isFullscreen
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [enabled, emitEvent])
  
  // ============================================================================
  // Tab Visibility Tracking
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) return
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        emitEvent('tab_hidden')
      } else {
        emitEvent('tab_visible')
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, emitEvent])
  
  // ============================================================================
  // Video Playback Event Tracking
  // ============================================================================
  
  useEffect(() => {
    if (!enabled || !videoRef.current) return
    
    const video = videoRef.current
    let lastTimeBeforeSeek = 0
    
    const handlePause = () => {
      // Only emit if not at the end
      if (video.currentTime < video.duration - 1) {
        emitEvent('pause')
      }
    }
    
    const handlePlay = () => {
      emitEvent('resume')
    }
    
    const handleSeeking = () => {
      lastTimeBeforeSeek = video.currentTime
    }
    
    const handleSeeked = () => {
      const seekDelta = video.currentTime - lastTimeBeforeSeek
      
      if (seekDelta > 5) {
        emitEvent('seek_forward', seekDelta)
      } else if (seekDelta < -3) {
        emitEvent('seek_backward', Math.abs(seekDelta))
      }
    }
    
    video.addEventListener('pause', handlePause)
    video.addEventListener('play', handlePlay)
    video.addEventListener('seeking', handleSeeking)
    video.addEventListener('seeked', handleSeeked)
    
    return () => {
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('seeking', handleSeeking)
      video.removeEventListener('seeked', handleSeeked)
    }
  }, [enabled, videoRef, emitEvent])
  
  return {
    eventCount,
    currentJitter,
    isRestless,
    idleTime,
  }
}

// ============================================================================
// Hook: useMetricsBatcher
// ============================================================================

export interface UseMetricsBatcherOptions {
  /** Session ID */
  sessionId: string
  /** Screening ID */
  screeningId: string
  /** Batch interval in milliseconds (default: 30000) */
  batchInterval?: number
  /** Whether batching is enabled */
  enabled: boolean
  /** Whether in calibration phase */
  isCalibrationPhase: boolean
  /** API endpoint for batch submission */
  apiEndpoint?: string
}

export interface UseMetricsBatcherResult {
  /** Add a micro-behavior event to the batch */
  addMicroBehavior: (event: MicroBehaviorEvent) => void
  /** Add a manual reaction to the batch */
  addManualReaction: (timestamp: number, reactionType: string, emoji: string) => void
  /** Add a biometric data point to the batch */
  addBiometric: (timestamp: number, emotion: string, intensity: number, confidence: number, gazeOnScreen: boolean) => void
  /** Force flush the current batch */
  flush: () => Promise<void>
  /** Number of pending metrics in current batch */
  pendingCount: number
  /** Current batch sequence number */
  batchSequence: number
}

const DEFAULT_BATCH_INTERVAL = 30000 // 30 seconds

export function useMetricsBatcher({
  sessionId,
  screeningId,
  batchInterval = DEFAULT_BATCH_INTERVAL,
  enabled,
  isCalibrationPhase,
  apiEndpoint = '/api/analytics/metrics/batch',
}: UseMetricsBatcherOptions): UseMetricsBatcherResult {
  const pendingMetrics = useRef<Omit<MetricPoint, 'sessionId'>[]>([])
  const batchSequence = useRef(0)
  const [pendingCount, setPendingCount] = useState(0)
  
  // ============================================================================
  // Add Methods
  // ============================================================================
  
  const addMicroBehavior = useCallback((event: MicroBehaviorEvent) => {
    const metric: Omit<MetricPoint, 'sessionId'> = {
      timestamp: event.timestamp,
      capturedAt: new Date().toISOString(),
      type: 'micro_behavior',
      microBehavior: {
        action: event.action,
        value: event.value,
        metadata: event.metadata,
      },
      isCalibrationPhase,
    }
    
    pendingMetrics.current.push(metric)
    setPendingCount(pendingMetrics.current.length)
  }, [isCalibrationPhase])
  
  const addManualReaction = useCallback((
    timestamp: number,
    reactionType: string,
    emoji: string
  ) => {
    const metric: Omit<MetricPoint, 'sessionId'> = {
      timestamp,
      capturedAt: new Date().toISOString(),
      type: 'manual_reaction',
      manualReaction: {
        reactionType: reactionType as any,
        emoji,
      },
      isCalibrationPhase,
    }
    
    pendingMetrics.current.push(metric)
    setPendingCount(pendingMetrics.current.length)
  }, [isCalibrationPhase])
  
  const addBiometric = useCallback((
    timestamp: number,
    emotion: string,
    intensity: number,
    confidence: number,
    gazeOnScreen: boolean
  ) => {
    const metric: Omit<MetricPoint, 'sessionId'> = {
      timestamp,
      capturedAt: new Date().toISOString(),
      type: 'biometric',
      biometric: {
        emotion: emotion as any,
        intensity,
        confidence,
        gazeOnScreen,
      },
      isCalibrationPhase,
    }
    
    pendingMetrics.current.push(metric)
    setPendingCount(pendingMetrics.current.length)
  }, [isCalibrationPhase])
  
  // ============================================================================
  // Flush Batch
  // ============================================================================
  
  const flush = useCallback(async () => {
    if (pendingMetrics.current.length === 0) return
    
    const metrics = [...pendingMetrics.current]
    pendingMetrics.current = []
    setPendingCount(0)
    
    const payload = {
      sessionId,
      screeningId,
      metrics,
      currentWatchTime: 0, // Will be updated by caller
      isPlaying: true,
      batchTimestamp: new Date().toISOString(),
      batchSequence: batchSequence.current,
    }
    
    batchSequence.current++
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        console.error('[Metrics Batcher] Failed to send batch:', response.status)
        // Re-add metrics on failure
        pendingMetrics.current.unshift(...metrics)
        setPendingCount(pendingMetrics.current.length)
      }
    } catch (error) {
      console.error('[Metrics Batcher] Error sending batch:', error)
      // Re-add metrics on error
      pendingMetrics.current.unshift(...metrics)
      setPendingCount(pendingMetrics.current.length)
    }
  }, [sessionId, screeningId, apiEndpoint])
  
  // ============================================================================
  // Automatic Batching Interval
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) return
    
    const interval = setInterval(() => {
      flush()
    }, batchInterval)
    
    return () => clearInterval(interval)
  }, [enabled, batchInterval, flush])
  
  // ============================================================================
  // Flush on Unmount
  // ============================================================================
  
  useEffect(() => {
    return () => {
      if (pendingMetrics.current.length > 0) {
        // Best-effort flush on unmount
        flush()
      }
    }
  }, [flush])
  
  return {
    addMicroBehavior,
    addManualReaction,
    addBiometric,
    flush,
    pendingCount,
    batchSequence: batchSequence.current,
  }
}
