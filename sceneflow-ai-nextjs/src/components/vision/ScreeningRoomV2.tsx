/**
 * ScreeningRoomV2 - Fullscreen cinematic preview of screenplay with audio
 * 
 * This is the v2 replacement for ScreeningRoom/ScriptPlayer.
 * Uses FullscreenPlayer internally with proper state management for:
 * - Scene navigation
 * - Language selection  
 * - Audio cache management
 * - Test audience feedback (emoji reactions, biometrics)
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */
'use client'

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { FullscreenPlayer, type AudienceFeedbackEvent } from './FullscreenPlayer'
import type { SceneProductionData } from '@/components/vision/scene-production/types'
import { getLanguagePlaybackOffset } from '@/components/vision/scene-production/audioTrackBuilder'

interface ScreeningRoomV2Props {
  script: any
  characters: Array<{ name: string; description?: string }>
  onClose: () => void
  initialScene?: number
  /** Timestamp updated whenever script is edited - forces full cache clear */
  scriptEditedAt?: number
  /** Production data with keyframe segments for each scene (Record<sceneId, SceneProductionData>) */
  sceneProductionState?: Record<string, SceneProductionData>
  /** Project ID for operations */
  projectId?: string
  /** Stored translations from Production page */
  storedTranslations?: Record<string, Record<number, { narration?: string; dialogue?: string[] }>>
  // Audience Feedback Mode
  /** Enable audience feedback features (emoji reactions, facial recognition, biometrics) */
  enableAudienceFeedback?: boolean
  /** Screening ID for analytics tracking */
  screeningId?: string
  /** Session ID for this viewing session */
  sessionId?: string
  /** Callback when audience feedback event occurs */
  onAudienceFeedback?: (event: AudienceFeedbackEvent) => void
  /** Top bar back affordance (same as close); e.g. "Back" when a return URL was provided */
  backButtonLabel?: string
  /** Prefer stitched video streams over Ken Burns animatic when available */
  playbackMode?: 'animatic' | 'video' | 'auto'
  onPlaybackModeChange?: (mode: 'animatic' | 'video' | 'auto') => void
}

// Helper function to normalize scenes from various data paths
function normalizeScenes(source: any): any[] {
  if (!source) return []

  const candidates = [
    source?.script?.scenes,
    source?.scenes,
    source?.visionPhase?.script?.script?.scenes,
    source?.visionPhase?.scenes,
    source?.metadata?.visionPhase?.script?.script?.scenes,
    source?.metadata?.visionPhase?.scenes
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

export function ScreeningRoomV2({
  script,
  characters,
  onClose,
  initialScene = 0,
  scriptEditedAt,
  sceneProductionState,
  projectId,
  storedTranslations,
  // Audience Feedback
  enableAudienceFeedback = false,
  screeningId,
  sessionId,
  onAudienceFeedback,
  backButtonLabel,
  playbackMode = 'auto',
  onPlaybackModeChange,
}: ScreeningRoomV2Props) {
  // ============================================================================
  // Scene State
  // ============================================================================
  const [currentSceneIndex, setCurrentSceneIndex] = useState(initialScene)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  
  // Extract scenes from script
  const scenes = useMemo(() => normalizeScenes(script), [script])
  
  // Get current scene and its production data
  const currentScene = scenes[currentSceneIndex]
  const currentSceneId = currentScene?.id || currentScene?.sceneId || `scene-${currentSceneIndex}`
  const currentProductionData = sceneProductionState?.[currentSceneId]

  const sceneVideoUrl = useMemo(() => {
    const streams = currentProductionData?.productionStreams || []
    const match = streams.find(
      (s) =>
        s.streamType === 'video' &&
        s.language === selectedLanguage &&
        s.status === 'complete' &&
        !!s.mp4Url
    )
    return match?.mp4Url || null
  }, [currentProductionData, selectedLanguage])

  const useVideoPlayback =
    playbackMode === 'video' || (playbackMode === 'auto' && !!sceneVideoUrl)
  
  // Get segments for current scene
  const segments = useMemo(() => {
    return currentProductionData?.segments || []
  }, [currentProductionData])
  
  // ============================================================================
  // Audio Cache Management
  // ============================================================================
  const previousScriptEditedAtRef = useRef<number | undefined>(scriptEditedAt)
  
  useEffect(() => {
    if (previousScriptEditedAtRef.current !== undefined && 
        scriptEditedAt !== undefined && 
        previousScriptEditedAtRef.current !== scriptEditedAt) {
      console.log('[ScreeningRoomV2] Script edited, audio will be refreshed')
    }
    previousScriptEditedAtRef.current = scriptEditedAt
  }, [scriptEditedAt])
  
  // ============================================================================
  // Scene Navigation
  // ============================================================================
  const goToNextScene = useCallback(() => {
    if (currentSceneIndex < scenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1)
    }
  }, [currentSceneIndex, scenes.length])
  
  const goToPreviousScene = useCallback(() => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1)
    }
  }, [currentSceneIndex])
  
  // ============================================================================
  // Language Change
  // ============================================================================
  const handleLanguageChange = useCallback((newLanguage: string) => {
    setSelectedLanguage(newLanguage)
  }, [])
  
  // ============================================================================
  // Render
  // ============================================================================
  
  // If no scenes, show message
  if (scenes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">No Scenes Available</h2>
          <p className="text-gray-400 mb-4">Generate scenes first to preview in Screening Room.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            {backButtonLabel ?? 'Close'}
          </button>
        </div>
      </div>
    )
  }
  
  // If no production data for current scene, show message
  if ((!currentProductionData || segments.length === 0) && !useVideoPlayback) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-2">Scene Not Ready</h2>
          <p className="text-gray-400 mb-4">
            Scene {currentSceneIndex + 1} needs keyframes generated.<br/>
            Use Production to generate keyframes first.
          </p>
          <div className="flex gap-2 justify-center">
            {currentSceneIndex > 0 && (
              <button
                onClick={goToPreviousScene}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Previous Scene
              </button>
            )}
            {currentSceneIndex < scenes.length - 1 && (
              <button
                onClick={goToNextScene}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                Next Scene
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              {backButtonLabel ?? 'Close'}
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (useVideoPlayback && sceneVideoUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-white text-sm font-medium">
            Video Pre-viz — Scene {currentSceneIndex + 1} / {scenes.length}
          </div>
          <div className="flex items-center gap-2">
            {onPlaybackModeChange ? (
              <select
                value={playbackMode}
                onChange={(e) =>
                  onPlaybackModeChange(e.target.value as 'animatic' | 'video' | 'auto')
                }
                className="bg-white/10 text-white text-xs rounded px-2 py-1 border border-white/20"
              >
                <option value="auto">Auto</option>
                <option value="video">Video</option>
                <option value="animatic">Animatic</option>
              </select>
            ) : null}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <video
            key={sceneVideoUrl}
            src={sceneVideoUrl}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-lg shadow-2xl"
          />
        </div>
        <div className="flex justify-center gap-2 py-3 border-t border-white/10">
          {currentSceneIndex > 0 ? (
            <button
              onClick={goToPreviousScene}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
            >
              Previous
            </button>
          ) : null}
          {currentSceneIndex < scenes.length - 1 ? (
            <button
              onClick={goToNextScene}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <FullscreenPlayer
      segments={segments}
      scene={currentScene}
      sceneId={currentSceneId}
      allScenes={scenes}
      scriptTitle={script?.title || script?.script?.title}
      language={selectedLanguage}
      initialTime={0}
      onClose={onClose}
      onLanguageChange={handleLanguageChange}
      currentSceneIndex={currentSceneIndex}
      totalScenes={scenes.length}
      onNextScene={goToNextScene}
      onPreviousScene={goToPreviousScene}
      autoAdvance={true}
      sceneTransitionDelay={3}
      playbackOffset={getLanguagePlaybackOffset(currentScene, selectedLanguage)}
      // Audience Feedback
      enableAudienceFeedback={enableAudienceFeedback}
      screeningId={screeningId}
      sessionId={sessionId}
      onAudienceFeedback={onAudienceFeedback}
      backButtonLabel={backButtonLabel}
    />
  )
}

export default ScreeningRoomV2
