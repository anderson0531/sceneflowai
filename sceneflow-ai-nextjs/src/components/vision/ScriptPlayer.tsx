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
import { X, Subtitles, Menu, RefreshCw } from 'lucide-react'
import { SceneDisplay } from './SceneDisplay'
import { PlaybackControls } from './PlaybackControls'
import { VoiceAssignmentPanel } from './VoiceAssignmentPanel'
import { MobileMenuSheet } from './MobileMenuSheet'
import { WebAudioMixer, SceneAudioConfig, type AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { getAvailableLanguages, getAudioUrl, getAudioDuration as getStoredAudioDuration } from '@/lib/audio/languageDetection'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { toast } from 'sonner'
interface ScreeningRoomProps {
  script: any
  characters: Array<{ name: string; description?: string }>
  onClose: () => void
  initialScene?: number
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

export function ScreeningRoom({ script, characters, onClose, initialScene = 0 }: ScreeningRoomProps) {
  // Audio mixer ref - defined early so it can be used in script change effect
  const audioMixerRef = useRef<WebAudioMixer | null>(null)
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  
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
    const extractedScenes = script?.script?.scenes || script?.scenes || []
    return extractedScenes
  }, [script])

  // Create a fingerprint of audio URLs in scenes to detect content changes
  // This catches cases where script object reference doesn't change but audio URLs do
  const audioFingerprint = React.useMemo(() => {
    return scenes.map((s: any, i: number) => {
      const dialogueUrls = s.dialogueAudio?.en?.map((d: any) => d.audioUrl || '').join(',') || 
                           (Array.isArray(s.dialogueAudio) ? s.dialogueAudio.map((d: any) => d.audioUrl || '').join(',') : '')
      return `${i}:${s.narrationAudioUrl || ''}|${dialogueUrls}|${s.sfxAudioUrl || ''}`
    }).join('||')
  }, [scenes])

  // CRITICAL: Stop all audio playback and clear caches when script/audio content changes
  // This prevents "ghost audio" where old audio plays alongside new audio
  React.useEffect(() => {
    // Stop any currently playing audio FIRST - this is critical!
    if (audioMixerRef.current) {
      audioMixerRef.current.stop()  // Stop active playback
      audioMixerRef.current.clearCache()  // Clear cached audio buffers
    }
    
    // Clear duration cache so durations are recalculated
    audioDurationCache.clear()
    
    // Reset player state to prevent auto-resumption with stale state
    setPlayerState(prev => ({
      ...prev,
      isPlaying: false
    }))
    
    console.log('[ScriptPlayer] Audio reset - script/audio content changed')
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
    voiceAssignments: {
      narrator: 'en-US-Studio-O', // Default: Sophia
      characters: {},
      voiceover: 'en-US-Studio-O'
    }
  })

  // Auto-hide controls state
  const [showControls, setShowControls] = useState(true)
  const [showCaptions, setShowCaptions] = useState(false) // Default to off
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Language state - use pre-generated audio files
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en') // Default: English
  
  // Translation state for captions
  const [translatedNarration, setTranslatedNarration] = useState<string | null>(null)
  const [translatedDialogue, setTranslatedDialogue] = useState<string[] | null>(null)
  const translationCacheRef = useRef<Map<string, { narration?: string; dialogue?: string[] }>>(new Map())
  
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
    
    // If cached, use cached translations
    if (cached) {
      setTranslatedNarration(cached.narration || null)
      setTranslatedDialogue(cached.dialogue || null)
      return
    }
    
    // Translate narration and dialogue
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
  }, [selectedLanguage, playerState.currentSceneIndex])

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
   */
  const calculateAudioTimeline = useCallback(async (scene: any): Promise<SceneAudioConfig> => {
    const config: SceneAudioConfig = {}
    let totalDuration = 0
    let narrationEndTime = 0
    let descriptionEndTime = 0
    let sfxCursor = 0
    let dialogueCursor = 0
    
    // Get language-specific audio URLs
    const narrationUrl = getAudioForLanguage(scene, selectedLanguage, 'narration')
    const descriptionUrl = getAudioForLanguage(scene, selectedLanguage, 'description')
    const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || (selectedLanguage === 'en' ? scene.dialogueAudio : null)
    
    // Music starts at scene beginning (concurrent with everything)
    if (scene.musicAudio) {
      config.music = scene.musicAudio
    }
    
    // Scene description plays before narration
    if (descriptionUrl) {
      config.description = descriptionUrl
      config.descriptionOffsetSeconds = 0
      const storedDescriptionDuration = getStoredAudioDuration(scene, selectedLanguage, 'description')
      const descriptionDuration = await resolveAudioDuration(descriptionUrl, storedDescriptionDuration)
      descriptionEndTime = descriptionDuration
      totalDuration = Math.max(totalDuration, descriptionEndTime)
    }

    // Narration starts after configured offset
    if (narrationUrl) {
      config.narration = narrationUrl
      const narrationOffset = descriptionUrl
        ? descriptionEndTime + DESCRIPTION_TO_NARRATION_GAP_SECONDS
        : NARRATION_DELAY_SECONDS
      config.narrationOffsetSeconds = narrationOffset
      const storedDuration = getStoredAudioDuration(scene, selectedLanguage, 'narration')
      const narrationDuration = await resolveAudioDuration(narrationUrl, storedDuration)
      narrationEndTime = narrationOffset + narrationDuration
      totalDuration = Math.max(totalDuration, narrationEndTime)
    } else {
      narrationEndTime = descriptionEndTime
    }

    const voiceAnchorTime = Math.max(narrationEndTime, descriptionEndTime)

    // SFX queue begins after narration finishes
    const resolvedSfx: AudioSource[] = []
    sfxCursor = voiceAnchorTime
    if (scene.sfxAudio && scene.sfxAudio.length > 0) {
      for (let idx = 0; idx < scene.sfxAudio.length; idx++) {
        const sfxUrl = scene.sfxAudio[idx]
        if (!sfxUrl) continue

        const sfxDef = scene.sfx?.[idx] || {}
        const sfxDuration = await resolveAudioDuration(sfxUrl, sfxDef.duration)
        const explicitTime = typeof sfxDef.time === 'number'
          ? Math.max(sfxDef.time, voiceAnchorTime)
          : Math.max(sfxCursor, voiceAnchorTime)
        const startTime = Math.max(explicitTime, sfxCursor)
        resolvedSfx.push({
          url: sfxUrl,
          startTime
        })
        sfxCursor = startTime + sfxDuration + SFX_GAP_SECONDS
        totalDuration = Math.max(totalDuration, sfxCursor)
      }
    }
    if (resolvedSfx.length > 0) {
      config.sfx = resolvedSfx
    }

    // Dialogue waits for narration/SFX to finish and plays sequentially
    const resolvedDialogue: AudioSource[] = []
    dialogueCursor = Math.max(sfxCursor, voiceAnchorTime)
    
    if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
      for (let i = 0; i < dialogueArray.length; i++) {
        const dialogue = dialogueArray[i]
        if (dialogue.audioUrl) {
          const startTime = Math.max(dialogueCursor, voiceAnchorTime)
          resolvedDialogue.push({
            url: dialogue.audioUrl,
            startTime
          })

          const dialogueDuration = await resolveAudioDuration(dialogue.audioUrl, dialogue.duration)
          dialogueCursor = startTime + dialogueDuration + DIALOGUE_GAP_SECONDS
          totalDuration = Math.max(totalDuration, dialogueCursor)
        }
      }
    }
    if (resolvedDialogue.length > 0) {
      config.dialogue = resolvedDialogue
    }

    totalDuration = Math.max(totalDuration, dialogueCursor, narrationEndTime, sfxCursor, descriptionEndTime)
    
    const declaredDuration = normalizeDuration(scene?.duration)
    const resolvedDuration = Math.max(totalDuration, declaredDuration ?? 0)
    if (resolvedDuration > 0) {
      config.sceneDuration = resolvedDuration
    }

    return config
  }, [selectedLanguage, getAudioForLanguage])

  // Generate and play audio for current scene
  const playSceneAudio = useCallback(async (sceneIndex: number) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length) return
    
    // Check if playback was cancelled before starting
    if (playbackCancelledRef.current) {
      return
    }

    const scene = scenes[sceneIndex]
    setIsLoadingAudio(true)

    try {
      // Check cancellation before starting translation mode
      if (playbackCancelledRef.current) {
        setIsLoadingAudio(false)
        return
      }
      
      // Use pre-generated audio files for selected language
      // Check if scene has any pre-generated audio for the selected language
      const narrationUrl = getAudioForLanguage(scene, selectedLanguage, 'narration')
      const hasValidNarration = narrationUrl && 
                (narrationUrl.startsWith('http://') || narrationUrl.startsWith('https://'))

      const descriptionUrl = getAudioForLanguage(scene, selectedLanguage, 'description')
      const hasValidDescription = descriptionUrl &&
                  (descriptionUrl.startsWith('http://') || descriptionUrl.startsWith('https://'))
      
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
      
      const hasPreGeneratedAudio = hasValidNarration || hasValidDescription || hasValidMusic || hasValidDialogue || hasValidSFX
      
      if (hasPreGeneratedAudio) {
        // Fade out and stop any currently playing audio
        if (audioMixerRef.current && audioMixerRef.current.getPlaying()) {
          await audioMixerRef.current.fadeOut(1000) // 1 second fade out
          audioMixerRef.current.stop()
        }
        
        // Check cancellation before calculating timeline
        if (playbackCancelledRef.current) {
          setIsLoadingAudio(false)
          return
        }
        
        // Calculate audio timeline for concurrent playback
        const audioConfig = await calculateAudioTimeline(scene)
        
        // Filter out narration/description if narrationEnabled is false
        if (!playerState.narrationEnabled) {
          delete audioConfig.narration
          delete audioConfig.description
          delete audioConfig.narrationOffsetSeconds
          delete audioConfig.descriptionOffsetSeconds
        }
        
        // Ensure scene duration covers either calculated audio length or storyboard duration
        const fallbackDuration = scene.duration || 5
        audioConfig.sceneDuration = Math.max(audioConfig.sceneDuration || 0, fallbackDuration)
        
        // Check cancellation after async calculation
        if (playbackCancelledRef.current) {
          setIsLoadingAudio(false)
          return
        }
        
                // Check if we have any audio to play
        if (!audioConfig.music && !audioConfig.narration && !audioConfig.description &&
            (!audioConfig.dialogue || audioConfig.dialogue.length === 0) &&
            (!audioConfig.sfx || audioConfig.sfx.length === 0)) {
          console.warn('[Player] No audio available in calculated config for scene', sceneIndex + 1, 'Config:', audioConfig)                                    
          setIsLoadingAudio(false)
          
          // Minimum scene display time (3 seconds) even if no audio, plus 3 second delay before advancing
          const minDisplayTime = 3000
          const sceneDuration = (scene.duration || 5) * 1000
          const waitTime = Math.max(minDisplayTime, sceneDuration) + 3000 // Add 3 second delay before advancing
          
          if (playerState.isPlaying) {
            setTimeout(() => {
              // Only auto-advance if still playing, not manually paused, and not manual navigation
              if (playerState.isPlaying && playerState.autoAdvance !== false && !isManualNavigationRef.current) {
                nextScene()
              }
            }, waitTime)
          }
          return
        }
        
        // Check cancellation before starting playback
        if (playbackCancelledRef.current) {
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
            if (playbackCancelledRef.current) {
              setIsLoadingAudio(false)
              return
            }
            
            // Add 3 second delay before advancing to next scene
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Check cancellation after delay
            if (playbackCancelledRef.current) {
              setIsLoadingAudio(false)
              return
            }
            
          } catch (error) {
            console.error('[Player] Web Audio Mixer error:', error)
            setIsLoadingAudio(false)
            // Fallback to scene duration on error
            const minDisplayTime = 3000
            const sceneDuration = (scene.duration || 5) * 1000
            const waitTime = Math.max(minDisplayTime, sceneDuration) + 3000 // Add 3 second delay
            
            if (playerState.isPlaying) {
              setTimeout(() => {
                if (playerState.isPlaying && playerState.autoAdvance && !isManualNavigationRef.current) {
                  nextScene()
                }
              }, waitTime)
            }
            return
          }
        }
        
                // Auto-advance to next scene after delay (only if still playing, auto-advance enabled, and not manual navigation)                                                                          
        if (playerState.isPlaying && playerState.autoAdvance && !isManualNavigationRef.current) {
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
        // Minimum scene display time (3 seconds) even if no text, plus 3 second delay before advancing
        const minDisplayTime = 3000
        const sceneDuration = (scene.duration || 5) * 1000
        const waitTime = Math.max(minDisplayTime, sceneDuration) + 3000 // Add 3 second delay before advancing
        
        // Auto-advance to next scene if no audio
        if (playerState.isPlaying) {
          setTimeout(() => {
            // Only auto-advance if still playing, auto-advance is enabled, and not manual navigation
            if (playerState.isPlaying && playerState.autoAdvance !== false && !isManualNavigationRef.current) {
              nextScene()
            }
          }, waitTime)
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
      
      // Minimum scene display time even on error, plus 3 second delay before advancing
      const minDisplayTime = 3000
      const sceneDuration = (scene.duration || 5) * 1000
      const waitTime = Math.max(minDisplayTime, sceneDuration) + 3000 // Add 3 second delay before advancing
      
      // Auto-advance even on error (only if auto-advance enabled and not manual navigation)
      if (playerState.isPlaying) {
        setTimeout(() => {
          if (playerState.isPlaying && playerState.autoAdvance !== false && !isManualNavigationRef.current) {
            nextScene()
          }
        }, waitTime)
      }
    }
  }, [scenes, playerState.isPlaying, playerState.playbackSpeed, playerState.volume, selectedLanguage])


  // Track if this is the first play to prevent immediate skipping
  const isFirstPlayRef = useRef(true)
  
  // Track if playback should be cancelled (for preventing race conditions)
  const playbackCancelledRef = useRef(false)
  
  // Track if navigation is manual vs auto-advance (to prevent conflicts)
  const isManualNavigationRef = useRef(false)

    // Play/pause audio when state changes
  useEffect(() => {
    // Cancel any ongoing playback when scene changes
    playbackCancelledRef.current = true
    
    if (playerState.isPlaying && !isLoadingAudio) {
      // Stop current audio immediately to prevent overlap
      if (audioMixerRef.current && audioMixerRef.current.getPlaying()) {
        audioMixerRef.current.stop()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      
      // Reset cancellation flag for new playback
      playbackCancelledRef.current = false
      
      // On first play, ensure we stay on the initial scene
      if (isFirstPlayRef.current) {
        isFirstPlayRef.current = false
        // Force play from the initial scene index, not currentSceneIndex which might have changed                                                              
        playSceneAudio(initialScene)
      } else {
        playSceneAudio(playerState.currentSceneIndex)
      }
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
    isManualNavigationRef.current = true
    setPlayerState(prev => {
      const nextIndex = prev.currentSceneIndex + 1
      if (nextIndex >= scenes.length) {
        // End of script
        return { ...prev, isPlaying: false, currentSceneIndex: scenes.length - 1 }                                                                              
      }
      return { ...prev, currentSceneIndex: nextIndex }
    })
    // Reset manual navigation flag after a short delay
    setTimeout(() => {
      isManualNavigationRef.current = false
    }, 100)
  }

  const previousScene = () => {
    isManualNavigationRef.current = true
    setPlayerState(prev => ({
      ...prev,
      currentSceneIndex: Math.max(0, prev.currentSceneIndex - 1)
    }))
    // Reset manual navigation flag after a short delay
    setTimeout(() => {
      isManualNavigationRef.current = false
    }, 100)
  }

  const jumpToScene = (sceneIndex: number) => {
    if (sceneIndex >= 0 && sceneIndex < scenes.length) {
      isManualNavigationRef.current = true
      setPlayerState(prev => ({ ...prev, currentSceneIndex: sceneIndex }))
      // Reset manual navigation flag after a short delay
      setTimeout(() => {
        isManualNavigationRef.current = false
      }, 100)
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
      />

      {/* Main Content Area */}
      <div className="h-full flex">
        {/* Scene Display */}
        <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${
          playerState.showVoicePanel ? 'lg:mr-80' : ''
        }`}>
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
          />
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
    </div>
  )
}

