/**
 * ScriptPlayer / Screening Room - Cinematic preview of screenplay with audio
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 * @see /CONTRIBUTING.md for development guidelines
 * 
 * TWO USE CASES:
 * 1. Screenplay Review: Full audio including scene description narration
 * 2. Animatic Preview: Narration disabled, dialogue/music/SFX only
 * 
 * FEATURES:
 * - Ken Burns effect on scene images (scene-aware animation)
 * - Narration toggle (on/off)
 * - Audio playback (narration, dialogue, music, SFX)
 * - Scene-by-scene navigation
 * 
 * PLANNED: MP4 export via Shotstack integration
 */
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Subtitles, Menu, RefreshCw, Download, Upload, FileText, Copy, Check } from 'lucide-react'
import { SceneDisplay } from './SceneDisplay'
import { PlaybackControls } from './PlaybackControls'
import { VoiceAssignmentPanel } from './VoiceAssignmentPanel'
import { MobileMenuSheet } from './MobileMenuSheet'
import { ExportVideoModal } from '@/components/export/ExportVideoModal'
import { WebAudioMixer, SceneAudioConfig, type AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { getAvailableLanguages, getAudioUrl, getAudioDuration as getStoredAudioDuration } from '@/lib/audio/languageDetection'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { toast } from 'sonner'
import type { SceneProductionData, AudioTracksData } from '@/components/vision/scene-production/types'
import { calculateSequentialAlignment, AUDIO_ALIGNMENT_BUFFERS, type AlignmentClip } from '@/components/vision/scene-production/audioTrackBuilder'

interface ScreeningRoomProps {
  script: any
  characters: Array<{ name: string; description?: string }>
  onClose: () => void
  initialScene?: number
  /** Timestamp updated whenever script is edited - forces full cache clear */
  scriptEditedAt?: number
  /** Production data with keyframe segments for each scene (Record<sceneId, SceneProductionData>) */
  sceneProductionState?: Record<string, SceneProductionData>
  /** Project ID for export and other operations */
  projectId?: string
  /** Stored translations from Production page - pre-translated narration/dialogue per scene per language */
  storedTranslations?: Record<string, Record<number, { narration?: string; dialogue?: string[] }>>
}

interface PlayerState {
  isPlaying: boolean
  currentSceneIndex: number
  playbackSpeed: number
  volume: number
  musicVolume: number
  autoAdvance: boolean
  narrationEnabled: boolean
  kenBurnsIntensity: 'subtle' | 'medium' | 'dramatic'
  showVoicePanel: boolean
  sceneTransitionDelay: number // Delay in seconds before auto-advancing to next scene
  voiceAssignments: {
    narrator: string
    characters: Record<string, string>
    voiceover: string
  }
}

const audioDurationCache = new Map<string, number>()
const DESCRIPTION_TO_NARRATION_GAP_SECONDS = 0.35
const NARRATION_DELAY_SECONDS = 2
const DIALOGUE_GAP_SECONDS = 0.3
const SFX_GAP_SECONDS = 0

function normalizeDuration(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  return null
}

function normalizeTimelineAudioTracks(raw: unknown): AudioTracksData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as AudioTracksData

  const normalizeClip = (clip?: { url?: string | null; startTime?: number; duration?: number }): { url: string; startTime: number; duration: number } | null => {
    if (!clip?.url) return null
    return {
      url: clip.url,
      startTime: Number.isFinite(clip.startTime as number) ? (clip.startTime as number) : 0,
      duration: Number.isFinite(clip.duration as number) ? (clip.duration as number) : 0,
    }
  }

  const voiceover = normalizeClip(data.voiceover ?? data.narration)
  const music = normalizeClip(data.music ?? undefined)

  const dialogue = Array.isArray(data.dialogue)
    ? data.dialogue.map(d => normalizeClip(d)).filter((d): d is { url: string; startTime: number; duration: number } => Boolean(d))
    : []

  const sfx = Array.isArray(data.sfx)
    ? data.sfx.map(s => normalizeClip(s)).filter((s): s is { url: string; startTime: number; duration: number } => Boolean(s))
    : []

  if (!voiceover && !music && dialogue.length === 0 && sfx.length === 0) {
    return null
  }

  return {
    voiceover: voiceover ? { id: 'voiceover', url: voiceover.url, startTime: voiceover.startTime, duration: voiceover.duration } : undefined,
    dialogue: dialogue.length > 0 ? dialogue.map((clip, index) => ({ id: `dialogue-${index}`, url: clip.url, startTime: clip.startTime, duration: clip.duration })) : undefined,
    music: music ? { id: 'music', url: music.url, startTime: music.startTime, duration: music.duration } : undefined,
    sfx: sfx.length > 0 ? sfx.map((clip, index) => ({ id: `sfx-${index}`, url: clip.url, startTime: clip.startTime, duration: clip.duration })) : undefined,
  }
}

function resolveSceneDurationFromSegments(segments?: Array<{ endTime?: number }>): number | null {
  if (!segments || segments.length === 0) return null
  const maxEnd = segments.reduce((max, seg) => Math.max(max, seg.endTime ?? 0), 0)
  return maxEnd > 0 ? maxEnd : null
}

// Helper function to normalize scenes from various data paths
// This ensures consistent scene access across different storage patterns
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

  // First, try to find a non-empty array
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  // If all are empty, return the first valid array (even if empty)
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  return []
}

async function resolveAudioDuration(url: string, stored?: unknown): Promise<number> {
  if (!url) {
    return 0
  }

  // Use URL without query params as cache key
  const cacheKey = url.split('?')[0]
  const cached = audioDurationCache.get(cacheKey)
  if (typeof cached === 'number') {
    return cached
  }

  const storedDuration = normalizeDuration(stored) ?? null

  try {
    const measured = await getAudioDuration(url)
    if (Number.isFinite(measured) && measured > 0) {
      const finalDuration = Math.max(measured, storedDuration ?? 0)
      audioDurationCache.set(cacheKey, finalDuration)
      return finalDuration
    }
  } catch (error) {
    console.warn('[Timeline] Failed to measure duration, using stored/fallback', { url: url.slice(-50), error })
  }

  if (storedDuration) {
    audioDurationCache.set(cacheKey, storedDuration)
    return storedDuration
  }

  const fallback = 3
  audioDurationCache.set(cacheKey, fallback)
  return fallback
}

export function ScreeningRoom({ script, characters, onClose, initialScene = 0, scriptEditedAt, sceneProductionState, projectId, storedTranslations }: ScreeningRoomProps) {
  // Audio mixer ref - defined early so it can be used in script change effect
  const audioMixerRef = useRef<WebAudioMixer | null>(null)
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // CRITICAL: Clear ALL audio caches when script is edited
  // This prevents ghost audio from old cached audio playing alongside new audio
  const previousScriptEditedAtRef = React.useRef<number | undefined>(scriptEditedAt)
  React.useEffect(() => {
    if (previousScriptEditedAtRef.current !== undefined && 
        scriptEditedAt !== undefined && 
        previousScriptEditedAtRef.current !== scriptEditedAt) {
      // Script was edited - clear all audio caches unconditionally
      console.log('[ScreeningRoom] Script edited, clearing all audio caches')
      
      audioDurationCache.clear()
      
      if (audioMixerRef.current) {
        audioMixerRef.current.stop()
        audioMixerRef.current.clearCache()
      }
    }
    previousScriptEditedAtRef.current = scriptEditedAt
  }, [scriptEditedAt])
  
  // Handler to refresh audio caches - clears all caches and forces fresh load
  const handleRefreshAudio = useCallback(() => {
    setIsRefreshing(true)
    
    // Clear module-level duration cache
    audioDurationCache.clear()
    
    // Clear Web Audio mixer's buffer cache
    if (audioMixerRef.current) {
      audioMixerRef.current.stop()
      audioMixerRef.current.clearCache()
    }
    
    // Clear browser caches for audio (if supported)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('audio')) {
            caches.delete(name)
          }
        })
      })
    }
    
    toast.success('Audio caches cleared! Audio will reload fresh.')
    
    setTimeout(() => {
      setIsRefreshing(false)
    }, 500)
  }, [])
  
  // Extract scenes with proper reactivity to script changes
  const scenes = React.useMemo(() => {
    return normalizeScenes(script)
  }, [script])

  // Create a fingerprint of audio URLs in scenes to detect content changes
  // This catches cases where script object reference doesn't change but audio URLs do
  // Includes entry COUNTS to detect when dialogue/SFX lines are added/removed
  const audioFingerprint = React.useMemo(() => {
    return scenes.map((s: any, i: number) => {
      // Dialogue: get URLs from multi-language or legacy array format, include count
      const dialogueArray = s.dialogueAudio?.en || (Array.isArray(s.dialogueAudio) ? s.dialogueAudio : [])
      const dialogueUrls = dialogueArray.map((d: any) => d.audioUrl || '').filter(Boolean).join(',')
      const dialogueCount = dialogueArray.length
      
      // SFX: properly handle array format (NOT sfxAudioUrl singular)
      const sfxArray = Array.isArray(s.sfxAudio) ? s.sfxAudio : []
      const sfxUrls = sfxArray.filter(Boolean).join(',')
      const sfxCount = sfxArray.length
      
      // Include counts to detect added/removed entries even if URLs reused
      return `${i}:${s.narrationAudioUrl || ''}|D${dialogueCount}:${dialogueUrls}|S${sfxCount}:${sfxUrls}`
    }).join('||')
  }, [scenes])

  // CRITICAL: Clear audio caches when script/audio content changes
  // This prevents "ghost audio" where old cached audio plays alongside new audio
  // NOTE: Do NOT reset isPlaying here - let user control playback state
  const previousFingerprintRef = React.useRef<string>('')
  React.useEffect(() => {
    // Skip on initial mount - only react to CHANGES
    if (previousFingerprintRef.current && previousFingerprintRef.current !== audioFingerprint) {
      // Stop any currently playing audio and clear caches
      if (audioMixerRef.current) {
        audioMixerRef.current.stop()  // Stop active playback
        audioMixerRef.current.clearCache()  // Clear cached audio buffers
      }
      
      // Clear duration cache so durations are recalculated
      audioDurationCache.clear()
      
      // DO NOT reset isPlaying - the previous fix broke playback by doing this
      // User-initiated playback should continue; cache is cleared so new audio loads
    }
    previousFingerprintRef.current = audioFingerprint
  }, [audioFingerprint])  // Trigger on actual audio content changes, not just object reference
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSceneIndex: initialScene,
    playbackSpeed: 1.0,
    volume: 1.0,
    musicVolume: 0.15, // 15% default volume for music
    autoAdvance: true, // Auto-advance enabled by default
    narrationEnabled: true, // Narration/description audio enabled by default
    kenBurnsIntensity: 'medium', // Default Ken Burns intensity
    showVoicePanel: false,
    sceneTransitionDelay: 3, // 3 second delay before auto-advancing to next scene
    voiceAssignments: {
      narrator: 'en-US-Studio-O', // Default: Sophia
      characters: {},
      voiceover: 'en-US-Studio-O'
    }
  })

  // Playhead time for synchronized visual frame display
  // Uses requestAnimationFrame to stay in sync with audio playback
  const [currentPlayheadTime, setCurrentPlayheadTime] = useState(0)
  const playheadAnimationRef = useRef<number | null>(null)
  const scenePlaybackStartRef = useRef<number>(0)

  // Animation loop for playhead sync when playing
  useEffect(() => {
    if (playerState.isPlaying) {
      scenePlaybackStartRef.current = performance.now() - currentPlayheadTime * 1000
      
      const animate = () => {
        const elapsed = (performance.now() - scenePlaybackStartRef.current) / 1000
        setCurrentPlayheadTime(elapsed)
        playheadAnimationRef.current = requestAnimationFrame(animate)
      }
      playheadAnimationRef.current = requestAnimationFrame(animate)
    } else {
      if (playheadAnimationRef.current) {
        cancelAnimationFrame(playheadAnimationRef.current)
        playheadAnimationRef.current = null
      }
    }
    
    return () => {
      if (playheadAnimationRef.current) {
        cancelAnimationFrame(playheadAnimationRef.current)
        playheadAnimationRef.current = null
      }
    }
  }, [playerState.isPlaying])

  // Reset playhead when scene changes
  useEffect(() => {
    setCurrentPlayheadTime(0)
    scenePlaybackStartRef.current = performance.now()
  }, [playerState.currentSceneIndex])

  // Auto-hide controls state
  const [showControls, setShowControls] = useState(true)
  const [showCaptions, setShowCaptions] = useState(false) // Default to off
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false) // Export video modal
  // NOTE: Export/Import for translations moved to ScriptPanel (Production header)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Scene transition state for visual indicator
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionCountdown, setTransitionCountdown] = useState(0)

  // Language state - use pre-generated audio files
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en') // Default: English
  
  // Translation state for captions
  const [translatedNarration, setTranslatedNarration] = useState<string | null>(null)
  const [translatedDialogue, setTranslatedDialogue] = useState<string[] | null>(null)
  const translationCacheRef = useRef<Map<string, { narration?: string; dialogue?: string[] }>>(new Map())
  
  // NOTE: handleExportDialogue and handleImportDialogue moved to ScriptPanel (Production header)
  // Screening Room now uses storedTranslations prop from project metadata
  
  // Get available languages from scenes - recalculate when scenes or script changes
  const availableLanguages = React.useMemo(() => {
    const detected = getAvailableLanguages(scenes)
    return detected
  }, [scenes, script]) // Add script as dependency to force recalculation
  
  // Filter supported languages to only show those with audio files
  const selectableLanguages = React.useMemo(() => {
    const filtered = SUPPORTED_LANGUAGES.filter(lang => availableLanguages.includes(lang.code))
    return filtered
  }, [availableLanguages])
  
  // Set default language to first available if current selection is not available
  React.useEffect(() => {
    if (availableLanguages.length > 0 && !availableLanguages.includes(selectedLanguage)) {
      setSelectedLanguage(availableLanguages[0])
    }
  }, [availableLanguages, selectedLanguage, selectableLanguages])
  
  // Translate captions when language or scene changes
  useEffect(() => {
    const currentScene = scenes[playerState.currentSceneIndex]
    if (!currentScene) {
      setTranslatedNarration(null)
      setTranslatedDialogue(null)
      return
    }
    
    // Check cache first
    const cacheKey = `${playerState.currentSceneIndex}-${selectedLanguage}`
    const cached = translationCacheRef.current.get(cacheKey)
    
    // If English, use original text (no translation needed)
    if (selectedLanguage === 'en') {
      setTranslatedNarration(null)
      setTranslatedDialogue(null)
      return
    }
    
    // Check stored translations from Production page first (imported via export/import)
    const storedForLanguage = storedTranslations?.[selectedLanguage]
    const storedForScene = storedForLanguage?.[playerState.currentSceneIndex]
    if (storedForScene) {
      console.log(`[Captions] Using stored translation for scene ${playerState.currentSceneIndex + 1} in ${selectedLanguage}`)
      setTranslatedNarration(storedForScene.narration || null)
      setTranslatedDialogue(storedForScene.dialogue || null)
      // Also cache for consistency
      translationCacheRef.current.set(cacheKey, storedForScene)
      return
    }
    
    // If cached, use cached translations
    if (cached) {
      setTranslatedNarration(cached.narration || null)
      setTranslatedDialogue(cached.dialogue || null)
      return
    }
    
    // Translate narration and dialogue via API (fallback)
    const translateCaptions = async () => {
      try {
        const translations: { narration?: string; dialogue?: string[] } = {}
        
        // Translate narration if it exists
        if (currentScene.narration) {
          try {
            const response = await fetch('/api/translate/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: currentScene.narration,
                targetLanguage: selectedLanguage,
                sourceLanguage: 'en'
              })
            })
            
            if (response.ok) {
              const data = await response.json()
              translations.narration = data.translatedText
            } else {
              console.warn('[Captions] Failed to translate narration, using English')
              translations.narration = currentScene.narration
            }
          } catch (error) {
            console.error('[Captions] Error translating narration:', error)
            translations.narration = currentScene.narration
          }
        }
        
        // Translate dialogue if it exists
        if (currentScene.dialogue && Array.isArray(currentScene.dialogue) && currentScene.dialogue.length > 0) {
          try {
            // Translate all dialogue lines
            const dialogueTexts = currentScene.dialogue.map((d: any) => d.line).filter(Boolean)
            if (dialogueTexts.length > 0) {
              // Batch translate all dialogue lines
              const translationPromises = dialogueTexts.map(async (line: string) => {
                try {
                  const response = await fetch('/api/translate/google', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: line,
                      targetLanguage: selectedLanguage,
                      sourceLanguage: 'en'
                    })
                  })
                  
                  if (response.ok) {
                    const data = await response.json()
                    return data.translatedText
                  } else {
                    console.warn('[Captions] Failed to translate dialogue line, using English')
                    return line
                  }
                } catch (error) {
                  console.error('[Captions] Error translating dialogue line:', error)
                  return line
                }
              })
              
              translations.dialogue = await Promise.all(translationPromises)
            }
          } catch (error) {
            console.error('[Captions] Error translating dialogue:', error)
            translations.dialogue = currentScene.dialogue.map((d: any) => d.line)
          }
        }
        
        // Cache translations
        translationCacheRef.current.set(cacheKey, translations)
        
        // Update state
        setTranslatedNarration(translations.narration || null)
        setTranslatedDialogue(translations.dialogue || null)
      } catch (error) {
        console.error('[Captions] Error in translation flow:', error)
        // Fallback to English
        setTranslatedNarration(null)
        setTranslatedDialogue(null)
      }
    }
    
    translateCaptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage, playerState.currentSceneIndex, storedTranslations])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Initialize Web Audio Mixer
  useEffect(() => {
    audioMixerRef.current = new WebAudioMixer()
    
    return () => {
      // Cleanup on unmount
      if (audioMixerRef.current) {
        audioMixerRef.current.dispose()
        audioMixerRef.current = null
      }
    }
  }, [])

  // Auto-hide controls logic
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    if (playerState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [playerState.isPlaying])

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = () => {
      resetControlsTimeout()
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [resetControlsTimeout])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        togglePlayPause()
        resetControlsTimeout()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        previousScene()
        resetControlsTimeout()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextScene()
        resetControlsTimeout()
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        setPlayerState(prev => ({ ...prev, showVoicePanel: !prev.showVoicePanel }))
        resetControlsTimeout()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          document.documentElement.requestFullscreen()
        }
        resetControlsTimeout()
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        if (audioRef.current) {
          audioRef.current.muted = !audioRef.current.muted
        }
        resetControlsTimeout()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setShowCaptions(prev => !prev)
        resetControlsTimeout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerState.currentSceneIndex, scenes.length, resetControlsTimeout, handleClose])

  // Get audio URL for selected language (uses pre-generated audio files)
  const getAudioForLanguage = useCallback((scene: any, language: string, audioType: 'narration' | 'dialogue' | 'description', dialogueIndex?: number): string | null => {
    return getAudioUrl(scene, language, audioType, dialogueIndex)
  }, [])

  /**
   * Calculate audio timeline for a scene
   * Returns timing information for concurrent playback
   * Uses language-specific audio files and stored durations
   * 
   * SEQUENTIAL ALIGNMENT: Narration → SFX1 → Dialogue1 → SFX2 → Dialogue2 → ...
   * Music spans from 0 to total duration + buffer
   */
  const calculateAudioTimeline = useCallback(async (scene: any, timelineTracks?: AudioTracksData | null): Promise<SceneAudioConfig> => {
    const config: SceneAudioConfig = {}
    const { NARRATION_BUFFER, INTER_CLIP_BUFFER, MUSIC_END_BUFFER } = AUDIO_ALIGNMENT_BUFFERS

    if (timelineTracks) {
      let sceneDuration = 0
      if (timelineTracks.voiceover?.url) {
        const duration = timelineTracks.voiceover.duration || await resolveAudioDuration(timelineTracks.voiceover.url, timelineTracks.voiceover.duration)
        config.narration = timelineTracks.voiceover.url
        config.narrationOffsetSeconds = timelineTracks.voiceover.startTime || 0
        sceneDuration = Math.max(sceneDuration, (timelineTracks.voiceover.startTime || 0) + duration)
      }

      if (timelineTracks.music?.url) {
        const duration = timelineTracks.music.duration || await resolveAudioDuration(timelineTracks.music.url, timelineTracks.music.duration)
        config.music = timelineTracks.music.url
        sceneDuration = Math.max(sceneDuration, (timelineTracks.music.startTime || 0) + duration)
      }

      if (timelineTracks.dialogue && timelineTracks.dialogue.length > 0) {
        const dialogueSources: AudioSource[] = []
        for (const clip of timelineTracks.dialogue) {
          if (!clip?.url) continue
          const duration = clip.duration || await resolveAudioDuration(clip.url, clip.duration)
          dialogueSources.push({ url: clip.url, startTime: clip.startTime || 0, duration })
          sceneDuration = Math.max(sceneDuration, (clip.startTime || 0) + duration)
        }
        if (dialogueSources.length > 0) {
          config.dialogue = dialogueSources
        }
      }

      if (timelineTracks.sfx && timelineTracks.sfx.length > 0) {
        const sfxSources: AudioSource[] = []
        for (const clip of timelineTracks.sfx) {
          if (!clip?.url) continue
          const duration = clip.duration || await resolveAudioDuration(clip.url, clip.duration)
          sfxSources.push({ url: clip.url, startTime: clip.startTime || 0, duration })
          sceneDuration = Math.max(sceneDuration, (clip.startTime || 0) + duration)
        }
        if (sfxSources.length > 0) {
          config.sfx = sfxSources
        }
      }

      if (sceneDuration > 0) {
        config.sceneDuration = sceneDuration
      }

      return config
    }
    
    // Get language-specific audio URLs
    const narrationUrl = getAudioForLanguage(scene, selectedLanguage, 'narration')
    const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || (selectedLanguage === 'en' ? scene.dialogueAudio : null)
    
    // ========================================================================
    // STEP 1: Build AlignmentClip arrays for sequential alignment
    // ========================================================================
    
    // Build narration clip
    let narrationClip: AlignmentClip | null = null
    if (narrationUrl) {
      const storedDuration = getStoredAudioDuration(scene, selectedLanguage, 'narration')
      const narrationDuration = await resolveAudioDuration(narrationUrl, storedDuration)
      narrationClip = {
        id: 'narration',
        type: 'narration',
        url: narrationUrl,
        duration: narrationDuration,
        label: 'Narration',
      }
    }
    
    // Build SFX clips
    const sfxClips: AlignmentClip[] = []
    if (scene.sfxAudio && scene.sfxAudio.length > 0) {
      for (let idx = 0; idx < scene.sfxAudio.length; idx++) {
        const sfxUrl = scene.sfxAudio[idx]
        if (!sfxUrl) continue
        
        const sfxDef = scene.sfx?.[idx] || {}
        const sfxDuration = await resolveAudioDuration(sfxUrl, sfxDef.duration)
        sfxClips.push({
          id: `sfx-${idx}`,
          type: 'sfx',
          url: sfxUrl,
          duration: sfxDuration,
          label: typeof sfxDef === 'string' ? sfxDef.slice(0, 20) : (sfxDef.description?.slice(0, 20) || `SFX ${idx + 1}`),
          sfxIndex: idx,
        })
      }
    }
    
    // Build dialogue clips - sort by timestamp for correct order
    const dialogueClips: AlignmentClip[] = []
    if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
      const scriptDialogue = scene.dialogue || []
      
      // Helper: Extract timestamp from audio URL for ordering
      const getUrlTimestamp = (url: string): number => {
        const match = url?.match(/(\d{13})\.mp3/)
        return match ? parseInt(match[1], 10) : 0
      }
      
      // Sort audio entries by timestamp (generation order)
      const sortedByTimestamp = [...dialogueArray]
        .filter((d: any) => d.audioUrl)
        .sort((a: any, b: any) => {
          const tsA = getUrlTimestamp(a.audioUrl)
          const tsB = getUrlTimestamp(b.audioUrl)
          return tsA - tsB
        })
      
      // Take only as many audio entries as there are script lines
      const orderedAudio = sortedByTimestamp.slice(0, scriptDialogue.length)
      
      for (let i = 0; i < orderedAudio.length; i++) {
        const dialogue = orderedAudio[i]
        if (dialogue.audioUrl) {
          const dialogueDuration = await resolveAudioDuration(dialogue.audioUrl, dialogue.duration)
          dialogueClips.push({
            id: `dialogue-${i}`,
            type: 'dialogue',
            url: dialogue.audioUrl,
            duration: dialogueDuration,
            label: dialogue.character || `Line ${i + 1}`,
            dialogueIndex: dialogue.dialogueIndex ?? i,
          })
        }
      }
    }
    
    // ========================================================================
    // STEP 2: Calculate sequential alignment (no muted clips in playback)
    // ========================================================================
    
    const alignment = calculateSequentialAlignment(narrationClip, sfxClips, dialogueClips, new Set())
    
    console.log('[ScriptPlayer] Sequential alignment calculated:', {
      clipCount: alignment.clips.length,
      totalDuration: alignment.totalDuration,
      musicDuration: alignment.musicDuration,
    })
    
    // ========================================================================
    // STEP 3: Apply alignment to config
    // ========================================================================
    
    // Narration
    if (narrationUrl && narrationClip) {
      config.narration = narrationUrl
      const narrationAligned = alignment.clips.find(c => c.type === 'narration')
      config.narrationOffsetSeconds = narrationAligned?.startTime ?? 0
    }
    
    // SFX
    const resolvedSfx: AudioSource[] = []
    for (const clip of alignment.clips.filter(c => c.type === 'sfx' && !c.isMuted)) {
      resolvedSfx.push({
        url: clip.url,
        startTime: clip.startTime,
      })
    }
    if (resolvedSfx.length > 0) {
      config.sfx = resolvedSfx
    }
    
    // Dialogue
    const resolvedDialogue: AudioSource[] = []
    for (const clip of alignment.clips.filter(c => c.type === 'dialogue' && !c.isMuted)) {
      resolvedDialogue.push({
        url: clip.url,
        startTime: clip.startTime,
      })
    }
    if (resolvedDialogue.length > 0) {
      config.dialogue = resolvedDialogue
      console.log('[ScriptPlayer] Final config.dialogue being sent to WebAudioMixer:', resolvedDialogue.map((d, i) => ({
        index: i,
        url: d.url.slice(-40),
        startTime: d.startTime
      })))
    }
    
    // Music: starts at 0, spans entire scene + buffer
    if (scene.musicAudio) {
      config.music = scene.musicAudio
    }
    
    // Scene duration
    const declaredDuration = normalizeDuration(scene?.duration)
    const resolvedDuration = Math.max(alignment.totalDuration, declaredDuration ?? 0)
    if (resolvedDuration > 0) {
      config.sceneDuration = resolvedDuration
    }

    return config
  }, [selectedLanguage, getAudioForLanguage])

  // Helper function to run transition countdown with visual indicator
  const runTransitionCountdown = useCallback(async (delaySeconds: number, sessionId: number): Promise<boolean> => {
    setIsTransitioning(true)
    setTransitionCountdown(delaySeconds)
    
    for (let i = delaySeconds; i > 0; i--) {
      // Check if session is still valid
      if (playbackSessionRef.current !== sessionId || playbackCancelledRef.current) {
        setIsTransitioning(false)
        setTransitionCountdown(0)
        return false
      }
      setTransitionCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    setIsTransitioning(false)
    setTransitionCountdown(0)
    
    // Final check before returning success
    if (playbackSessionRef.current !== sessionId || playbackCancelledRef.current) {
      return false
    }
    return true
  }, [])

  // Generate and play audio for current scene
  const playSceneAudio = useCallback(async (sceneIndex: number, sessionId?: number) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length) return
    
    // Use provided sessionId or current session
    const activeSession = sessionId ?? playbackSessionRef.current
    
    // Check if playback was cancelled or session changed before starting
    if (playbackCancelledRef.current || playbackSessionRef.current !== activeSession) {
      return
    }

    const scene = scenes[sceneIndex]
    const sceneId = scene?.id || scene?.sceneId || `scene-${sceneIndex}`
    const productionData = sceneProductionState?.[sceneId]
    const timelineTracks = normalizeTimelineAudioTracks(productionData?.audioTracks)
    setIsLoadingAudio(true)

    try {
      // Check cancellation before starting translation mode
      if (playbackCancelledRef.current || playbackSessionRef.current !== activeSession) {
        setIsLoadingAudio(false)
        return
      }
      
      // Use pre-generated audio files for selected language
      // Check if scene has any pre-generated audio for the selected language
      const narrationUrl = getAudioForLanguage(scene, selectedLanguage, 'narration')
      const hasValidNarration = narrationUrl && 
                (narrationUrl.startsWith('http://') || narrationUrl.startsWith('https://'))

      // Note: Description audio is no longer played in Screening Room (disabled per user request)
      // We still check for other audio types but exclude description from playback
      
      // Check dialogue audio for selected language
      const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || (selectedLanguage === 'en' ? scene.dialogueAudio : null)
      const hasValidDialogue = Array.isArray(dialogueArray) && dialogueArray.length > 0 &&
                              dialogueArray.some((d: any) => d.audioUrl && 
                                (d.audioUrl.startsWith('http://') || d.audioUrl.startsWith('https://')))
      
      const hasValidMusic = scene.musicAudio && 
                           (scene.musicAudio.startsWith('http://') || scene.musicAudio.startsWith('https://'))
      const hasValidSFX = scene.sfxAudio && scene.sfxAudio.length > 0 &&
                         scene.sfxAudio.some((url: string) => url && 
                           (url.startsWith('http://') || url.startsWith('https://')))
      
      // Description audio excluded from this check since it's no longer played
      const hasTimelineAudio = Boolean(
        timelineTracks?.voiceover?.url ||
        timelineTracks?.music?.url ||
        (timelineTracks?.dialogue && timelineTracks.dialogue.length > 0) ||
        (timelineTracks?.sfx && timelineTracks.sfx.length > 0)
      )
      const hasPreGeneratedAudio = hasValidNarration || hasValidMusic || hasValidDialogue || hasValidSFX || hasTimelineAudio
      
      if (hasPreGeneratedAudio) {
        // Fade out and stop any currently playing audio
        if (audioMixerRef.current && audioMixerRef.current.getPlaying()) {
          await audioMixerRef.current.fadeOut(1000) // 1 second fade out
          audioMixerRef.current.stop()
        }
        
        // Check cancellation before calculating timeline
        if (playbackCancelledRef.current || playbackSessionRef.current !== activeSession) {
          setIsLoadingAudio(false)
          return
        }
        
        // Calculate audio timeline for concurrent playback
        const audioConfig = await calculateAudioTimeline(scene, timelineTracks)
        
        // Filter out narration if narrationEnabled is false
        // (Description is already not included in the timeline)
        if (!playerState.narrationEnabled) {
          delete audioConfig.narration
          delete audioConfig.narrationOffsetSeconds
        }
        
        // Ensure scene duration covers either calculated audio length or storyboard duration
        const fallbackDuration = (resolveSceneDurationFromSegments(productionData?.segments) ?? scene.duration) || 5
        audioConfig.sceneDuration = Math.max(audioConfig.sceneDuration || 0, fallbackDuration)
        
        // Check cancellation after async calculation
        if (playbackCancelledRef.current || playbackSessionRef.current !== activeSession) {
          setIsLoadingAudio(false)
          return
        }
        
                // Check if we have any audio to play (description excluded since it's disabled)
        if (!audioConfig.music && !audioConfig.narration &&
            (!audioConfig.dialogue || audioConfig.dialogue.length === 0) &&
            (!audioConfig.sfx || audioConfig.sfx.length === 0)) {
          console.warn('[Player] No audio available in calculated config for scene', sceneIndex + 1, 'Config:', audioConfig)                                    
          setIsLoadingAudio(false)
          
          // Minimum scene display time (use configurable delay) plus scene duration
          const sceneDuration = (scene.duration || 5) * 1000
          const transitionDelay = playerState.sceneTransitionDelay
          
          if (playerState.isPlaying && playerState.autoAdvance !== false && !isManualNavigationRef.current) {
            // Wait for scene duration first
            await new Promise(resolve => setTimeout(resolve, sceneDuration))
            
            // Check session still valid
            if (playbackSessionRef.current !== activeSession || playbackCancelledRef.current) {
              return
            }
            
            // Run visual countdown
            const shouldAdvance = await runTransitionCountdown(transitionDelay, activeSession)
            if (shouldAdvance && playerState.isPlaying && playerState.autoAdvance !== false) {
              nextScene()
            }
          }
          return
        }
        
        // Check cancellation before starting playback
        if (playbackCancelledRef.current || playbackSessionRef.current !== activeSession) {
          setIsLoadingAudio(false)
          return
        }
        
                setIsLoadingAudio(false) // Clear loading state
                
                // Play scene with Web Audio Mixer (concurrent playback)
        if (audioMixerRef.current) {
          try {
            // Set music volume before playing
            audioMixerRef.current.setVolume('music', playerState.musicVolume)
            
            // Wait for actual audio completion - playScene() returns a promise that resolves when all non-looping audio finishes
            await audioMixerRef.current.playScene(audioConfig)
            
            // Check cancellation after audio completes
            if (playbackCancelledRef.current || playbackSessionRef.current !== activeSession) {
              setIsLoadingAudio(false)
              return
            }
            
            // Run visual transition countdown using configurable delay
            const shouldAdvance = await runTransitionCountdown(playerState.sceneTransitionDelay, activeSession)
            
            if (!shouldAdvance) {
              setIsLoadingAudio(false)
              return
            }
            
          } catch (error) {
            console.error('[Player] Web Audio Mixer error:', error)
            setIsLoadingAudio(false)
            
            // Check if session still valid before attempting fallback
            if (playbackSessionRef.current !== activeSession || playbackCancelledRef.current) {
              return
            }
            
            // Fallback: run transition countdown on error
            if (playerState.isPlaying && playerState.autoAdvance && !isManualNavigationRef.current) {
              const shouldAdvance = await runTransitionCountdown(playerState.sceneTransitionDelay, activeSession)
              if (shouldAdvance) {
                nextScene()
              }
            }
            return
          }
        }
        
                // Auto-advance to next scene (only if still playing, auto-advance enabled, session valid, and not manual navigation)                                                                          
        if (playerState.isPlaying && playerState.autoAdvance && !isManualNavigationRef.current && playbackSessionRef.current === activeSession) {
          nextScene()
        }
        return
      }
      
            // FALLBACK: Generate audio on-the-fly (existing code)
      console.warn('[Player] ⚠️ No pre-generated audio found! This will make expensive API calls.')                                                              
      console.warn('[Player] Please generate audio for all scenes before using Screening Room.')                                                                
      
      // Build narration text from action
      const narrationText = scene.action || scene.visualDescription || ''
      
      // Build dialogue text
      const dialogueText = (scene.dialogue || [])
        .map((d: any) => `${d.character}: ${d.line}`)
        .join('\n')

      // Combine for now (Phase 1 - single narrator voice)
      const fullText = `${scene.heading}. ${narrationText} ${dialogueText}`.trim()

      if (!fullText) {
        setIsLoadingAudio(false)
        
        // Auto-advance to next scene if no audio (using configurable delay with visual countdown)
        if (playerState.isPlaying && playerState.autoAdvance !== false && !isManualNavigationRef.current) {
          // Wait for scene duration first
          const sceneDuration = (scene.duration || 5) * 1000
          await new Promise(resolve => setTimeout(resolve, sceneDuration))
          
          // Check session still valid
          if (playbackSessionRef.current !== activeSession || playbackCancelledRef.current) {
            return
          }
          
          // Run visual countdown
          const shouldAdvance = await runTransitionCountdown(playerState.sceneTransitionDelay, activeSession)
          if (shouldAdvance && playerState.isPlaying && playerState.autoAdvance !== false) {
            nextScene()
          }
        }
        return
      }

      // Generate TTS audio
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullText.substring(0, 5000), // Limit to avoid timeout
          voiceId: playerState.voiceAssignments.narrator
        })
      })

      if (!response.ok) {
        throw new Error('TTS generation failed')
      }

      const blob = await response.blob()
      const audioUrl = URL.createObjectURL(blob)
      
      setIsLoadingAudio(false)

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.playbackRate = playerState.playbackSpeed
        audioRef.current.volume = playerState.volume
        audioRef.current.play()
      }
    } catch (error) {
      console.error('[Player] Audio error:', error)
      setIsLoadingAudio(false)
      
      // Check if session still valid before attempting fallback
      if (playbackSessionRef.current !== activeSession || playbackCancelledRef.current) {
        return
      }
      
      // Auto-advance even on error (using configurable delay with visual countdown)
      if (playerState.isPlaying && playerState.autoAdvance !== false && !isManualNavigationRef.current) {
        const shouldAdvance = await runTransitionCountdown(playerState.sceneTransitionDelay, activeSession)
        if (shouldAdvance && playerState.isPlaying) {
          nextScene()
        }
      }
    }
  }, [scenes, playerState.isPlaying, playerState.playbackSpeed, playerState.volume, playerState.sceneTransitionDelay, playerState.autoAdvance, playerState.musicVolume, selectedLanguage, runTransitionCountdown, calculateAudioTimeline, getAudioForLanguage])


  // Track if this is the first play to prevent immediate skipping
  const isFirstPlayRef = useRef(true)
  
  // Track if playback should be cancelled (for preventing race conditions)
  const playbackCancelledRef = useRef(false)
  
  // Track if navigation is manual vs auto-advance (to prevent conflicts)
  const isManualNavigationRef = useRef(false)
  
  // Unique session ID to track which playback is currently valid
  // This prevents stale callbacks from previous scenes from triggering auto-advance
  const playbackSessionRef = useRef(0)

    // Play/pause audio when state changes
  useEffect(() => {
    // Increment session ID to invalidate any pending callbacks from previous scene
    playbackSessionRef.current += 1
    const currentSession = playbackSessionRef.current
    
    // Cancel any ongoing playback and clear transition state
    playbackCancelledRef.current = true
    setIsTransitioning(false)
    setTransitionCountdown(0)
    
    if (playerState.isPlaying && !isLoadingAudio) {
      // Stop current audio immediately to prevent overlap
      if (audioMixerRef.current && audioMixerRef.current.getPlaying()) {
        audioMixerRef.current.stop()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      
      // Small delay to ensure stop() has fully resolved before starting new playback
      // This prevents race conditions where old promises resolve after new playback starts
      setTimeout(() => {
        // Verify this is still the active session
        if (playbackSessionRef.current !== currentSession) {
          return
        }
        
        // Reset cancellation flag for new playback
        playbackCancelledRef.current = false
        
        // On first play, ensure we stay on the initial scene
        if (isFirstPlayRef.current) {
          isFirstPlayRef.current = false
          // Force play from the initial scene index, not currentSceneIndex which might have changed                                                              
          playSceneAudio(initialScene, currentSession)
        } else {
          playSceneAudio(playerState.currentSceneIndex, currentSession)
        }
      }, 100) // 100ms delay to ensure cleanup completes
    } else if (!playerState.isPlaying) {
      // Pause/stop both HTMLAudioElement and Web Audio Mixer
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioMixerRef.current) {
        audioMixerRef.current.stop()
      }
    }
  }, [playerState.isPlaying, playerState.currentSceneIndex, playSceneAudio, initialScene])

  const togglePlayPause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }

    const nextScene = () => {
    // Immediately invalidate any pending callbacks
    playbackSessionRef.current += 1
    playbackCancelledRef.current = true
    isManualNavigationRef.current = true
    
    // Clear transition state
    setIsTransitioning(false)
    setTransitionCountdown(0)
    
    setPlayerState(prev => {
      const nextIndex = prev.currentSceneIndex + 1
      if (nextIndex >= scenes.length) {
        // End of script
        return { ...prev, isPlaying: false, currentSceneIndex: scenes.length - 1 }                                                                              
      }
      return { ...prev, currentSceneIndex: nextIndex }
    })
    // Reset manual navigation flag after a longer delay to ensure new playback starts
    setTimeout(() => {
      isManualNavigationRef.current = false
    }, 500)
  }

  const previousScene = () => {
    // Immediately invalidate any pending callbacks
    playbackSessionRef.current += 1
    playbackCancelledRef.current = true
    isManualNavigationRef.current = true
    
    // Clear transition state
    setIsTransitioning(false)
    setTransitionCountdown(0)
    
    setPlayerState(prev => ({
      ...prev,
      currentSceneIndex: Math.max(0, prev.currentSceneIndex - 1)
    }))
    // Reset manual navigation flag after a longer delay to ensure new playback starts
    setTimeout(() => {
      isManualNavigationRef.current = false
    }, 500)
  }

  const jumpToScene = (sceneIndex: number) => {
    if (sceneIndex >= 0 && sceneIndex < scenes.length) {
      // Immediately invalidate any pending callbacks
      playbackSessionRef.current += 1
      playbackCancelledRef.current = true
      isManualNavigationRef.current = true
      
      // Clear transition state
      setIsTransitioning(false)
      setTransitionCountdown(0)
      
      setPlayerState(prev => ({ ...prev, currentSceneIndex: sceneIndex }))
      // Reset manual navigation flag after a longer delay to ensure new playback starts
      setTimeout(() => {
        isManualNavigationRef.current = false
      }, 500)
    }
  }

  const updateVoiceAssignment = (type: 'narrator' | 'voiceover', voiceId: string) => {
    setPlayerState(prev => ({
      ...prev,
      voiceAssignments: {
        ...prev.voiceAssignments,
        [type]: voiceId
      }
    }))
  }

  const updateCharacterVoice = (characterName: string, voiceId: string) => {
    setPlayerState(prev => ({
      ...prev,
      voiceAssignments: {
        ...prev.voiceAssignments,
        characters: {
          ...prev.voiceAssignments.characters,
          [characterName]: voiceId
        }
      }
    }))
  }

  const currentScene = scenes[playerState.currentSceneIndex]

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Hidden audio element */}
      <audio ref={audioRef} />
      
      {/* Scene Transition Overlay - Visual countdown before next scene */}
      {isTransitioning && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 backdrop-blur-sm border border-white/10">
            <div className="text-white/80 text-sm font-medium">Next scene in</div>
            <div className="text-white text-5xl font-bold tabular-nums">
              {transitionCountdown}
            </div>
            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(transitionCountdown / playerState.sceneTransitionDelay) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar - Slightly thicker on mobile for better visibility */}
      <div className="absolute top-0 left-0 right-0 z-20 h-1 sm:h-0.5 bg-gray-600" style={{ top: 'env(safe-area-inset-top, 0)' }}>
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((playerState.currentSceneIndex + 1) / scenes.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`} style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        {/* Title - truncated on mobile */}
        <div className="text-white flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">Screening Room</h2>
          <p className="text-xs sm:text-sm text-gray-400 truncate hidden sm:block">
            {script?.title || 'Untitled Script'}
          </p>
        </div>
        
        {/* Desktop controls - hidden on mobile/tablet */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setShowCaptions(prev => !prev)}
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              showCaptions ? 'bg-white/20' : ''
            }`}
            title="Toggle Captions (C)"
          >
            <Subtitles className="w-5 h-5" />
          </button>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value)
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors text-sm min-h-[44px]"
            title="Select Language"
          >
            {selectableLanguages.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
                {lang.name}
              </option>
            ))}
          </select>
          
          {/* NOTE: Export/Import moved to Production header (ScriptPanel) */}
          
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-3"
            title="Render Animatic"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm hidden xl:inline">Render Animatic</span>
          </button>
        </div>

        {/* Tablet controls - show captions toggle */}
        <div className="hidden md:flex lg:hidden items-center gap-2">
          <button
            onClick={() => setShowCaptions(prev => !prev)}
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              showCaptions ? 'bg-white/20' : ''
            }`}
            title="Toggle Captions"
          >
            <Subtitles className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        
        {/* Mobile menu button - visible only on mobile */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Menu"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Refresh button - clears audio caches */}
        <button
          onClick={handleRefreshAudio}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ml-2 disabled:opacity-50"
          title="Refresh Audio (clears caches)"
          aria-label="Refresh audio"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        
        {/* Close button - always visible */}
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ml-2"
          title="Exit Screening Room (ESC)"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      
      {/* Mobile Menu Bottom Sheet */}
      <MobileMenuSheet
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        showCaptions={showCaptions}
        onToggleCaptions={() => setShowCaptions(prev => !prev)}
        selectedLanguage={selectedLanguage}
        onLanguageChange={(lang) => {
          setSelectedLanguage(lang)
        }}
        supportedLanguages={selectableLanguages}
        // NOTE: Export/Import moved to Production header (ScriptPanel)
      />

      {/* Main Content Area */}
      <div className="h-full flex">
        {/* Scene Display */}
        <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${
          playerState.showVoicePanel ? 'lg:mr-80' : ''
        }`}>
          {(() => {
            // Get scene ID for production data lookup
            const sceneId = currentScene?.id || currentScene?.sceneId || `scene-${playerState.currentSceneIndex}`
            const productionData = sceneProductionState?.[sceneId]
            const timelineTracks = normalizeTimelineAudioTracks(productionData?.audioTracks)
            const sceneDuration = (resolveSceneDurationFromSegments(productionData?.segments) ?? currentScene?.duration) || 8
            
            return (
              <SceneDisplay
                scene={currentScene}
                sceneNumber={playerState.currentSceneIndex + 1}
                sceneIndex={playerState.currentSceneIndex}
                totalScenes={scenes.length}
                isLoading={isLoadingAudio}
                showCaptions={showCaptions}
                translatedNarration={translatedNarration || undefined}
                translatedDialogue={translatedDialogue || undefined}
                kenBurnsIntensity={playerState.kenBurnsIntensity}
                productionData={productionData}
                sceneDuration={sceneDuration}
                audioTracks={timelineTracks || undefined}
                currentTime={playerState.isPlaying ? currentPlayheadTime : undefined}
              />
            )
          })()}
        </div>

        {/* Voice Assignment Panel - Mobile: Bottom Sheet */}
        <div className={`lg:hidden fixed inset-x-0 bottom-0 top-1/3 bg-gray-900 border-t border-gray-700 transform transition-transform duration-300 z-50 ${
          playerState.showVoicePanel ? 'translate-y-0' : 'translate-y-full'
        }`} style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="p-4 h-full overflow-y-auto">
            {/* Handle bar */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Voice Assignments</h3>
              <button
                onClick={() => setPlayerState(prev => ({ ...prev, showVoicePanel: false }))}
                className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close voice panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <VoiceAssignmentPanel
              characters={characters}
              voiceAssignments={playerState.voiceAssignments}
              onUpdateNarrator={(voiceId) => updateVoiceAssignment('narrator', voiceId)}
              onUpdateVoiceover={(voiceId) => updateVoiceAssignment('voiceover', voiceId)}
              onUpdateCharacter={updateCharacterVoice}
            />
          </div>
        </div>

        {/* Voice Assignment Panel - Desktop: Side Panel */}
        <div className={`hidden lg:block absolute top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 transform transition-transform duration-300 ${
          playerState.showVoicePanel ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <VoiceAssignmentPanel
            characters={characters}
            voiceAssignments={playerState.voiceAssignments}
            onUpdateNarrator={(voiceId) => updateVoiceAssignment('narrator', voiceId)}
            onUpdateVoiceover={(voiceId) => updateVoiceAssignment('voiceover', voiceId)}
            onUpdateCharacter={updateCharacterVoice}
          />
        </div>
      </div>
      
      {/* Backdrop for mobile voice panel */}
      {playerState.showVoicePanel && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setPlayerState(prev => ({ ...prev, showVoicePanel: false }))}
        />
      )}

      {/* Playback Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
                <PlaybackControls
          isPlaying={playerState.isPlaying}
          currentSceneIndex={playerState.currentSceneIndex}
          totalScenes={scenes.length}
          playbackSpeed={playerState.playbackSpeed}
          musicVolume={playerState.musicVolume}
          autoAdvance={playerState.autoAdvance}
          narrationEnabled={playerState.narrationEnabled}
          kenBurnsIntensity={playerState.kenBurnsIntensity}
          onTogglePlay={togglePlayPause}
          onPrevious={previousScene}
          onNext={nextScene}
          onJumpToScene={jumpToScene}
          onSpeedChange={(speed) => setPlayerState(prev => ({ ...prev, playbackSpeed: speed }))}
          onMusicVolumeChange={(volume) => {
            setPlayerState(prev => ({ ...prev, musicVolume: volume }))
            // Update music volume in real-time if mixer is active
            if (audioMixerRef.current) {
              audioMixerRef.current.setVolume('music', volume)
            }
          }}
          onAutoAdvanceToggle={() => setPlayerState(prev => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
          onNarrationToggle={() => setPlayerState(prev => ({ ...prev, narrationEnabled: !prev.narrationEnabled }))}
          onKenBurnsIntensityChange={(intensity) => setPlayerState(prev => ({ ...prev, kenBurnsIntensity: intensity }))}
          isLoading={isLoadingAudio}
        />
      </div>

      {/* Export Video Modal */}
      <ExportVideoModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        projectId={projectId || ''}
        projectTitle={script?.title || 'Untitled Project'}
        availableLanguages={availableLanguages}
        scenes={scenes}
        playerSettings={{
          volume: playerState.volume,
          musicVolume: playerState.musicVolume,
          playbackSpeed: playerState.playbackSpeed,
          kenBurnsIntensity: playerState.kenBurnsIntensity,
          narrationEnabled: playerState.narrationEnabled,
        }}
      />
      
      {/* NOTE: Import modal moved to ScriptPanel (Production header) */}
    </div>
  )
}

