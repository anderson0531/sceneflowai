/**
 * AudiencePlayer Component
 * 
 * Specialized video player for behavioral analytics screening.
 * This is the "Sensor" player that captures:
 * - Micro-behaviors (mouse jitter, volume, fullscreen, tab visibility)
 * - Manual reactions (emoji timeline)
 * - Biometric data (via camera, when consent is granted)
 * 
 * Privacy-First Architecture:
 * - Consent modal blocks video until choice is made
 * - Camera processing happens locally (MediaPipe)
 * - Only sanitized JSON data is sent to server
 * - First 5 minutes are calibration phase
 * 
 * @see /src/lib/types/behavioralAnalytics.ts for types
 */

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
  Camera,
  CameraOff,
} from 'lucide-react'

import { ConsentModal } from './ConsentModal'
import { EmojiReactionBar } from './EmojiReactionBar'
import {
  useMicroBehaviorTracking,
  useMetricsBatcher,
  type MicroBehaviorEvent,
} from '@/hooks/useMicroBehaviorTracking'
import type {
  SessionDemographics,
  TimelineReactionType,
  CalibrationState,
} from '@/lib/types/behavioralAnalytics'

// ============================================================================
// Types
// ============================================================================

interface AudiencePlayerProps {
  /** Screening ID for analytics */
  screeningId: string
  /** Video URL to play */
  videoUrl: string
  /** Video title for display */
  title?: string
  /** Video description */
  description?: string
  /** Poster image */
  posterUrl?: string
  /** Total duration (if known) */
  duration?: number
  /** Whether to show demographics collection */
  collectDemographics?: boolean
  /** Callback when session starts */
  onSessionStart?: (sessionId: string, cameraConsent: boolean) => void
  /** Callback when video completes */
  onComplete?: (sessionId: string) => void
  /** A/B test variant label */
  variantLabel?: string
}

interface PlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isBuffering: boolean
  showControls: boolean
}

// ============================================================================
// Constants
// ============================================================================

const CALIBRATION_DURATION = 300 // 5 minutes in seconds
const CONTROLS_HIDE_DELAY = 3000 // Hide controls after 3 seconds of inactivity

// ============================================================================
// Component
// ============================================================================

export function AudiencePlayer({
  screeningId,
  videoUrl,
  title,
  description,
  posterUrl,
  duration: initialDuration,
  collectDemographics = true,
  onSessionStart,
  onComplete,
  variantLabel,
}: AudiencePlayerProps) {
  // ============================================================================
  // State
  // ============================================================================
  
  // Consent state
  const [showConsentModal, setShowConsentModal] = useState(true)
  const [cameraConsent, setCameraConsent] = useState(false)
  const [demographics, setDemographics] = useState<SessionDemographics>()
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Calibration state
  const [calibration, setCalibration] = useState<CalibrationState>({
    isInCalibrationPhase: true,
    calibrationStartedAt: 0,
    calibrationEndsAt: CALIBRATION_DURATION,
    isCalibrationComplete: false,
  })
  
  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: initialDuration || 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    isBuffering: false,
    showControls: true,
  })
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // ============================================================================
  // Metrics Batcher
  // ============================================================================
  
  const metricsBatcher = useMetricsBatcher({
    sessionId: sessionId || '',
    screeningId,
    enabled: isInitialized && !!sessionId,
    isCalibrationPhase: calibration.isInCalibrationPhase,
  })
  
  // ============================================================================
  // Micro-Behavior Tracking
  // ============================================================================
  
  const handleMicroBehaviorEvent = useCallback((event: MicroBehaviorEvent) => {
    metricsBatcher.addMicroBehavior(event)
  }, [metricsBatcher])
  
  const microBehavior = useMicroBehaviorTracking({
    videoRef,
    enabled: isInitialized && !!sessionId,
    onEvent: handleMicroBehaviorEvent,
  })
  
  // ============================================================================
  // Consent Handler
  // ============================================================================
  
  const handleConsentComplete = useCallback(async (consent: {
    cameraConsent: boolean
    demographics?: SessionDemographics
  }) => {
    setCameraConsent(consent.cameraConsent)
    setDemographics(consent.demographics)
    setShowConsentModal(false)
    
    // Initialize session
    try {
      const response = await fetch('/api/analytics/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningId,
          cameraConsentGranted: consent.cameraConsent,
          demographics: consent.demographics,
          deviceInfo: {
            type: getDeviceType(),
            os: getOS(),
            browser: getBrowser(),
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            hasWebcam: consent.cameraConsent,
          },
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        setIsInitialized(true)
        
        onSessionStart?.(data.sessionId, consent.cameraConsent)
      }
    } catch (error) {
      console.error('[AudiencePlayer] Failed to initialize session:', error)
      // Continue anyway with local-only tracking
      const localSessionId = `local_${Date.now()}`
      setSessionId(localSessionId)
      setIsInitialized(true)
    }
  }, [screeningId, onSessionStart])
  
  // ============================================================================
  // Playback Handlers
  // ============================================================================
  
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    
    if (playerState.isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [playerState.isPlaying])
  
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    
    const currentTime = videoRef.current.currentTime
    setPlayerState(prev => ({ ...prev, currentTime }))
    
    // Update calibration state
    if (calibration.isInCalibrationPhase && currentTime >= CALIBRATION_DURATION) {
      setCalibration(prev => ({
        ...prev,
        isInCalibrationPhase: false,
        isCalibrationComplete: true,
      }))
    }
  }, [calibration.isInCalibrationPhase])
  
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return
    setPlayerState(prev => ({ 
      ...prev, 
      duration: videoRef.current!.duration 
    }))
  }, [])
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = parseFloat(e.target.value)
    videoRef.current.currentTime = time
  }, [])
  
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    videoRef.current.muted = !playerState.isMuted
    setPlayerState(prev => ({ ...prev, isMuted: !prev.isMuted }))
  }, [playerState.isMuted])
  
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const volume = parseFloat(e.target.value)
    videoRef.current.volume = volume
    setPlayerState(prev => ({ 
      ...prev, 
      volume, 
      isMuted: volume === 0 
    }))
  }, [])
  
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])
  
  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds)
    )
  }, [])
  
  // ============================================================================
  // Video Event Handlers
  // ============================================================================
  
  const handlePlay = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: true }))
  }, [])
  
  const handlePause = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }))
  }, [])
  
  const handleEnded = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }))
    if (sessionId) {
      onComplete?.(sessionId)
    }
  }, [sessionId, onComplete])
  
  const handleWaiting = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isBuffering: true }))
  }, [])
  
  const handleCanPlay = useCallback(() => {
    setPlayerState(prev => ({ ...prev, isBuffering: false }))
  }, [])
  
  // ============================================================================
  // Controls Visibility
  // ============================================================================
  
  const showControls = useCallback(() => {
    setPlayerState(prev => ({ ...prev, showControls: true }))
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    if (playerState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setPlayerState(prev => ({ ...prev, showControls: false }))
      }, CONTROLS_HIDE_DELAY)
    }
  }, [playerState.isPlaying])
  
  const handleMouseMove = useCallback(() => {
    showControls()
  }, [showControls])
  
  // ============================================================================
  // Fullscreen Handler
  // ============================================================================
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setPlayerState(prev => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }))
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  // ============================================================================
  // Emoji Reaction Handler
  // ============================================================================
  
  const handleEmojiReaction = useCallback((
    timestamp: number,
    reactionType: TimelineReactionType,
    emoji: string
  ) => {
    metricsBatcher.addManualReaction(timestamp, reactionType, emoji)
  }, [metricsBatcher])
  
  // ============================================================================
  // Helpers
  // ============================================================================
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const progressPercent = playerState.duration > 0
    ? (playerState.currentTime / playerState.duration) * 100
    : 0
  
  // ============================================================================
  // Render: Consent Modal
  // ============================================================================
  
  if (showConsentModal) {
    return (
      <ConsentModal
        onConsentComplete={handleConsentComplete}
        screeningTitle={title}
        showDemographics={collectDemographics}
      />
    )
  }
  
  // ============================================================================
  // Render: Player
  // ============================================================================
  
  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playerState.isPlaying && setPlayerState(prev => ({ ...prev, showControls: false }))}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onClick={togglePlay}
        playsInline
      />
      
      {/* Buffering Indicator */}
      <AnimatePresence>
        {playerState.isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Emoji Reaction Bar */}
      <EmojiReactionBar
        currentTime={playerState.currentTime}
        visible={playerState.showControls}
        onReaction={handleEmojiReaction}
        compact={playerState.isFullscreen}
      />
      
      {/* Calibration Indicator */}
      <AnimatePresence>
        {calibration.isInCalibrationPhase && cameraConsent && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full"
          >
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-xs text-amber-300">
              Calibrating... {formatTime(CALIBRATION_DURATION - playerState.currentTime)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Camera Status Indicator */}
      {cameraConsent && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-2 py-1 bg-black/50 rounded-full">
          <Camera className="w-3 h-3 text-green-400" />
          <span className="text-xs text-gray-300">Sensing</span>
        </div>
      )}
      
      {/* Variant Label (A/B Testing) */}
      {variantLabel && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300">
          {variantLabel}
        </div>
      )}
      
      {/* Controls Overlay */}
      <AnimatePresence>
        {playerState.showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"
          >
            {/* Title */}
            {title && (
              <div className="absolute top-0 left-0 right-0 p-4">
                <h2 className="text-white font-semibold text-lg truncate">{title}</h2>
                {description && (
                  <p className="text-gray-400 text-sm truncate">{description}</p>
                )}
              </div>
            )}
            
            {/* Center Play Button */}
            {!playerState.isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors pointer-events-auto"
              >
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </button>
            )}
            
            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
              {/* Progress Bar */}
              <div className="relative h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/progress">
                <input
                  type="range"
                  min={0}
                  max={playerState.duration || 100}
                  value={playerState.currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
                
                {/* Calibration Zone Marker */}
                {cameraConsent && playerState.duration > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full bg-amber-500/30 rounded-full"
                    style={{ 
                      width: `${Math.min((CALIBRATION_DURATION / playerState.duration) * 100, 100)}%` 
                    }}
                  />
                )}
              </div>
              
              {/* Controls Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Skip Back */}
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Skip back 10s"
                  >
                    <SkipBack className="w-5 h-5 text-white" />
                  </button>
                  
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {playerState.isPlaying ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white" />
                    )}
                  </button>
                  
                  {/* Skip Forward */}
                  <button
                    onClick={() => skip(10)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Skip forward 10s"
                  >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>
                  
                  {/* Volume */}
                  <div className="flex items-center gap-1 group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {playerState.isMuted || playerState.volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={playerState.isMuted ? 0 : playerState.volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-20 transition-all duration-200 h-1 appearance-none bg-white/30 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>
                  
                  {/* Time */}
                  <span className="text-sm text-white/70 ml-2">
                    {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Pending Metrics Indicator */}
                  {metricsBatcher.pendingCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs text-white/50">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      {metricsBatcher.pendingCount}
                    </div>
                  )}
                  
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {playerState.isFullscreen ? (
                      <Minimize className="w-5 h-5 text-white" />
                    ) : (
                      <Maximize className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Device Detection Helpers
// ============================================================================

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'unknown'
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Opera')) return 'Opera'
  return 'unknown'
}

export default AudiencePlayer
