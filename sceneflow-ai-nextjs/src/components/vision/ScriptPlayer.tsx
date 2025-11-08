'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Subtitles, Download, Loader, Menu } from 'lucide-react'
import { SceneDisplay } from './SceneDisplay'
import { PlaybackControls } from './PlaybackControls'
import { VoiceAssignmentPanel } from './VoiceAssignmentPanel'
import { MobileMenuSheet } from './MobileMenuSheet'
import { WebAudioMixer, SceneAudioConfig, AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'
import { toast } from 'sonner'
import { useOverlayStore } from '@/store/useOverlayStore'
import { getAvailableLanguages, getAudioUrl, getAudioDuration as getStoredAudioDuration } from '@/lib/audio/languageDetection'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { trackCta } from '@/lib/analytics'

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
  kenBurnsIntensity: 'subtle' | 'medium' | 'dramatic'
  showVoicePanel: boolean
  voiceAssignments: {
    narrator: string
    characters: Record<string, string>
    voiceover: string
  }
}

const renderToastStyle = {
  background: '#111827',
  color: '#F9FAFB',
  border: '1px solid #1f2937'
}

export function ScreeningRoom({ script, characters, onClose, initialScene = 0 }: ScreeningRoomProps) {
  // Extract scenes with proper reactivity to script changes
  const scenes = React.useMemo(() => {
    const extractedScenes = script?.script?.scenes || script?.scenes || []
    console.log('[Screening Room] Scenes extracted:', extractedScenes.length, 'scenes')
    // Log first scene structure for debugging
    if (extractedScenes.length > 0) {
      const firstScene = extractedScenes[0]
      console.log('[Screening Room] First scene structure:', {
        hasNarrationAudio: !!firstScene.narrationAudio,
        narrationAudioType: typeof firstScene.narrationAudio,
        narrationAudioKeys: firstScene.narrationAudio ? Object.keys(firstScene.narrationAudio) : [],
        hasDialogueAudio: !!firstScene.dialogueAudio,
        dialogueAudioType: typeof firstScene.dialogueAudio,
        dialogueAudioKeys: firstScene.dialogueAudio && typeof firstScene.dialogueAudio === 'object' && !Array.isArray(firstScene.dialogueAudio) ? Object.keys(firstScene.dialogueAudio) : []
      })
    }
    return extractedScenes
  }, [script])
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSceneIndex: initialScene,
    playbackSpeed: 1.0,
    volume: 1.0,
    musicVolume: 0.15, // 15% default volume for music
    autoAdvance: true, // Auto-advance enabled by default
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
  const renderPollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Language state - use pre-generated audio files
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en') // Default: English
  
  // Translation state for captions
  const [translatedNarration, setTranslatedNarration] = useState<string | null>(null)
  const [translatedDialogue, setTranslatedDialogue] = useState<string[] | null>(null)
  const translationCacheRef = useRef<Map<string, { narration?: string; dialogue?: string[] }>>(new Map())
  
  // Get available languages from scenes - recalculate when scenes or script changes
  const availableLanguages = React.useMemo(() => {
    console.log('[Screening Room] Recalculating available languages from', scenes.length, 'scenes')
    const detected = getAvailableLanguages(scenes)
    console.log('[Screening Room] Available languages detected:', detected)
    return detected
  }, [scenes, script]) // Add script as dependency to force recalculation
  
  // Filter supported languages to only show those with audio files
  const selectableLanguages = React.useMemo(() => {
    const filtered = SUPPORTED_LANGUAGES.filter(lang => availableLanguages.includes(lang.code))
    console.log('[Screening Room] Selectable languages:', filtered.map(l => l.code))
    return filtered
  }, [availableLanguages])
  
  // Set default language to first available if current selection is not available
  React.useEffect(() => {
    console.log('[Screening Room] Language selection check:', {
      availableLanguages,
      selectedLanguage,
      selectableLanguages: selectableLanguages.map(l => l.code)
    })
    if (availableLanguages.length > 0 && !availableLanguages.includes(selectedLanguage)) {
      console.log('[Screening Room] Switching to first available language:', availableLanguages[0])
      setSelectedLanguage(availableLanguages[0])
    }
  }, [availableLanguages, selectedLanguage, selectableLanguages])
  
  // Debug effect to log script changes
  React.useEffect(() => {
    console.log('[Screening Room] Script prop changed, scenes count:', scenes.length)
  }, [script, scenes.length])
  
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
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isRendering, setIsRendering] = useState(false)
  const audioMixerRef = useRef<WebAudioMixer | null>(null)
  
  // Initialize Web Audio Mixer
  useEffect(() => {
    audioMixerRef.current = new WebAudioMixer()
    
    return () => {
      // Cleanup on unmount
      if (audioMixerRef.current) {
        audioMixerRef.current.dispose()
        audioMixerRef.current = null
      }
      // Cleanup polling interval
      if (renderPollIntervalRef.current) {
        clearInterval(renderPollIntervalRef.current)
        renderPollIntervalRef.current = null
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
        onClose()
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
  }, [playerState.currentSceneIndex, scenes.length, resetControlsTimeout])

  // Get audio URL for selected language (uses pre-generated audio files)
  const getAudioForLanguage = useCallback((scene: any, language: string, audioType: 'narration' | 'dialogue', dialogueIndex?: number): string | null => {
    return getAudioUrl(scene, language, audioType, dialogueIndex)
  }, [])

  /**
   * Calculate audio timeline for a scene
   * Returns timing information for concurrent playback
   * Uses language-specific audio files and stored durations
   */
  const calculateAudioTimeline = useCallback(async (scene: any): Promise<SceneAudioConfig> => {
    const config: SceneAudioConfig = {}
    let currentTime = 0
    
    // Get language-specific audio URLs
    const narrationUrl = getAudioForLanguage(scene, selectedLanguage, 'narration')
    const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || (selectedLanguage === 'en' ? scene.dialogueAudio : null)
    
    // Debug logging
    console.log('[Timeline] Calculating audio timeline for scene (language:', selectedLanguage, '):', {
      hasMusic: !!scene.musicAudio,
      musicUrl: scene.musicAudio,
      hasNarration: !!narrationUrl,
      narrationUrl,
      hasDialogue: !!(Array.isArray(dialogueArray) && dialogueArray.length > 0),
      dialogueCount: Array.isArray(dialogueArray) ? dialogueArray.length : 0,
      hasSFX: !!(scene.sfxAudio && scene.sfxAudio.length > 0),
      sfxCount: scene.sfxAudio?.length || 0,
      sfxUrls: scene.sfxAudio
    })
    
    // Music starts at scene beginning (concurrent with everything)
    if (scene.musicAudio) {
      config.music = scene.musicAudio
      console.log('[Timeline] Added music:', scene.musicAudio)
    }
    
    // Narration starts at scene beginning (concurrent with music)
    if (narrationUrl) {
      config.narration = narrationUrl
      
      // Use stored duration if available, otherwise calculate
      const storedDuration = getStoredAudioDuration(scene, selectedLanguage, 'narration')
      if (storedDuration) {
        currentTime = storedDuration + 3.0 // Add 3-second lag before dialogue starts
        console.log('[Timeline] Using stored narration duration:', storedDuration)
      } else {
        // Fallback to calculating duration
        try {
          const narrationDuration = await getAudioDuration(narrationUrl)                                                                               
          currentTime = narrationDuration + 3.0 // Add 3-second lag before dialogue starts
        } catch (error) {
          console.warn('[Timeline] Failed to get narration duration, using default:', error)                                                                      
          currentTime = 8 // Default 8 seconds (5s narration + 3s delay)
        }
      }
    }
    
    // Dialogue follows narration sequentially
    if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
      config.dialogue = []
      
      for (const dialogue of dialogueArray) {
        if (dialogue.audioUrl) {
          config.dialogue.push({
            url: dialogue.audioUrl,
            startTime: currentTime
          })
          
          // Use stored duration if available, otherwise calculate
          const storedDialogueDuration = dialogue.duration
          if (storedDialogueDuration) {
            currentTime += storedDialogueDuration + 0.3 // Add 300ms pause between dialogue lines
            console.log('[Timeline] Using stored dialogue duration:', storedDialogueDuration)
          } else {
            // Fallback to calculating duration
            try {
              const dialogueDuration = await getAudioDuration(dialogue.audioUrl)
              currentTime += dialogueDuration + 0.3 // Add 300ms pause between dialogue lines
            } catch (error) {
              console.warn('[Timeline] Failed to get dialogue duration, using default:', error)
              currentTime += 3 // Default 3 seconds per dialogue
            }
          }
        }
      }
    }
    
    // SFX - use specified time or calculate sequential position
    if (scene.sfxAudio && scene.sfxAudio.length > 0) {
      config.sfx = []
      
      // Loop through sfxAudio array directly (not scene.sfx which might be empty)
      scene.sfxAudio.forEach((sfxUrl: string, idx: number) => {
        if (sfxUrl) {
          // Get metadata from scene.sfx if available
          const sfxDef = scene.sfx?.[idx] || {}
          // Use specified time if available, otherwise use current calculated time
          const sfxTime = sfxDef.time !== undefined ? sfxDef.time : currentTime
          config.sfx!.push({
            url: sfxUrl,
            startTime: sfxTime
          })
          console.log('[Timeline] Added SFX:', { url: sfxUrl, startTime: sfxTime, idx })
          
          // If sequential, update currentTime
          if (sfxDef.time === undefined) {
            currentTime += 2 // Default 2 seconds for SFX
          }
        }
      })
    }
    
    console.log('[Timeline] Final config:', {
      hasMusic: !!config.music,
      hasNarration: !!config.narration,
      dialogueCount: config.dialogue?.length || 0,
      sfxCount: config.sfx?.length || 0
    })
    
    return config
  }, [selectedLanguage, getAudioForLanguage])

  // Generate and play audio for current scene
  const playSceneAudio = useCallback(async (sceneIndex: number) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length) return
    
    // Check if playback was cancelled before starting
    if (playbackCancelledRef.current) {
      console.log('[Player] Playback cancelled for scene', sceneIndex + 1)
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
      
      const hasPreGeneratedAudio = hasValidNarration || hasValidMusic || hasValidDialogue || hasValidSFX
      
      if (hasPreGeneratedAudio) {
        console.log('[Player] Using pre-generated audio with Web Audio Mixer for scene', sceneIndex + 1, 'language:', selectedLanguage, {
          narration: !!narrationUrl,
          music: !!scene.musicAudio,
          dialogue: hasValidDialogue,
          sfx: !!(scene.sfxAudio && scene.sfxAudio.length > 0)
        })
        
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
        
        // Add scene duration to config for music-only scenes
        audioConfig.sceneDuration = scene.duration || 5
        
        // Check cancellation after async calculation
        if (playbackCancelledRef.current) {
          setIsLoadingAudio(false)
          return
        }
        
                // Check if we have any audio to play
        if (!audioConfig.music && !audioConfig.narration && 
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
        
        console.log('[Player] Audio config validated, proceeding to play:', {
          music: !!audioConfig.music,
          narration: !!audioConfig.narration,
          dialogueCount: audioConfig.dialogue?.length || 0,
          sfxCount: audioConfig.sfx?.length || 0
        })
        
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
            
            console.log('[Player] Playing scene with Web Audio Mixer, config:', audioConfig, 'musicVolume:', playerState.musicVolume)
            
            // Wait for actual audio completion - playScene() returns a promise that resolves when all non-looping audio finishes
            await audioMixerRef.current.playScene(audioConfig)
            
            console.log('[Player] Scene audio playback completed')
            
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
      console.log('[Player] Audio check results for scene', sceneIndex + 1, ':', {
        narrationAudioUrl: scene.narrationAudioUrl ? (scene.narrationAudioUrl.startsWith('blob:') ? 'blob URL (temporary)' : 'persistent URL') : 'none',
        musicAudio: scene.musicAudio ? (scene.musicAudio.startsWith('blob:') ? 'blob URL (temporary)' : 'persistent URL') : 'none',
        dialogueAudioCount: scene.dialogueAudio?.length || 0,
        sfxAudioCount: scene.sfxAudio?.length || 0,
        hasValidNarration,
        hasValidMusic,
        hasValidDialogue,
        hasValidSFX
      })
      console.log('[Player] Generating on-the-fly for scene', sceneIndex + 1)
      
      // Build narration text from action
      const narrationText = scene.action || scene.visualDescription || ''
      
      // Build dialogue text
      const dialogueText = (scene.dialogue || [])
        .map((d: any) => `${d.character}: ${d.line}`)
        .join('\n')

      // Combine for now (Phase 1 - single narrator voice)
      const fullText = `${scene.heading}. ${narrationText} ${dialogueText}`.trim()

      if (!fullText) {
        console.log('[Player] No text for scene', sceneIndex)
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
      
      setCurrentAudioUrl(audioUrl)
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
    console.log('[Player] nextScene called - advancing from', playerState.currentSceneIndex)
    isManualNavigationRef.current = true
    setPlayerState(prev => {
      const nextIndex = prev.currentSceneIndex + 1
      console.log('[Player] Advancing to scene', nextIndex)
      if (nextIndex >= scenes.length) {
        // End of script
        console.log('[Player] End of script reached')
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

  const exportStudioEnabled = process.env.NEXT_PUBLIC_EXPORT_STUDIO_ENABLED === 'true'
  const handleDownloadMP4 = async () => {
    setIsRendering(true)

    if (!exportStudioEnabled) {
      setIsRendering(false)
      toast.error('Export Studio is disabled. Enable NEXT_PUBLIC_EXPORT_STUDIO_ENABLED to download MP4 renders.', { style: renderToastStyle })
      trackCta({
        event: 'export_studio_disabled_download_attempt',
        location: 'ScriptPlayer'
      })
      return
    }

    trackCta({
      event: 'export_studio_pipeline_request',
      location: 'ScriptPlayer',
      value: scenes.length
    })
    useOverlayStore.getState().show(
      'Batching scenes and starting render pipeline... (this can take several minutes)',
      600
    )
    
    try {
      // Prepare scene data for Creatomate using selected language
      const sceneData = scenes.map((scene: any, idx: number) => {
        const narrationUrl = getAudioForLanguage(scene, selectedLanguage, 'narration')
        const storedNarrationDuration = getStoredAudioDuration(scene, selectedLanguage, 'narration') ?? 0
        const dialogueArray = scene.dialogueAudio?.[selectedLanguage] || (selectedLanguage === 'en' ? scene.dialogueAudio : null)

        // Build dialogue array with start times using language-specific audio
        const dialogue: Array<{ url: string; startTime: number; duration?: number }> = []
        let dialogueStartTime = storedNarrationDuration > 0 ? storedNarrationDuration + 3.0 : 0
        let totalDialogueDuration = 0

        if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
          dialogueArray.forEach((d: any) => {
            if (d.audioUrl) {
              const lineDuration = d.duration || 3
              dialogue.push({
                url: d.audioUrl,
                startTime: dialogueStartTime,
                duration: lineDuration
              })
              totalDialogueDuration += lineDuration
              dialogueStartTime += lineDuration + 0.3 // Add 300ms pause between dialogue lines
              totalDialogueDuration += 0.3
            }
          })

          // Remove the extra pause added after the final line
          if (dialogue.length > 0) {
            totalDialogueDuration -= 0.3
          }
        }

        const padAfterNarration = storedNarrationDuration > 0 && totalDialogueDuration > 0 ? 3.0 : 0
        let computedSceneDuration = storedNarrationDuration + padAfterNarration + Math.max(totalDialogueDuration, 0)

        if (computedSceneDuration <= 0) {
          computedSceneDuration = Math.max(scene.duration || 0, 5)
        }

        // Ensure minimum positive duration to avoid zero-length scenes
        computedSceneDuration = Math.max(computedSceneDuration, 0.5)

        // Build SFX array with start times and clamp within scene duration
        const sfx: Array<{ url: string; startTime: number; duration?: number }> = []
        if (scene.sfxAudio && Array.isArray(scene.sfxAudio)) {
          scene.sfxAudio.forEach((sfxUrl: string, sfxIdx: number) => {
            if (sfxUrl) {
              const sfxDef = scene.sfx?.[sfxIdx] || {}
              const sfxTime = typeof sfxDef.time === 'number' ? sfxDef.time : 0
              const remaining = Math.max(computedSceneDuration - sfxTime, 0)
              sfx.push({
                url: sfxUrl,
                startTime: sfxTime,
                duration: remaining
              })
            }
          })
        }

        console.log('[Screening Room] Scene duration summary', {
          sceneNumber: idx + 1,
          narration: storedNarrationDuration,
          dialogueCount: dialogue.length,
          totalDialogueDuration,
          computedSceneDuration
        })

        return {
          sceneNumber: idx + 1,
          imageUrl: scene.imageUrl || '/images/placeholders/placeholder.svg',
          duration: computedSceneDuration,
          audioTracks: {
            narration: narrationUrl || undefined,
            dialogue: dialogue.length > 0 ? dialogue : undefined,
            sfx: sfx.length > 0 ? sfx : undefined,
            music: scene.musicAudio
          },
          kenBurnsIntensity: playerState.kenBurnsIntensity
        }
      })
      
      // Submit render job (returns immediately with renderId)
      const response = await fetch('/api/screening-room/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: sceneData,
          options: {
            width: 1920,
            height: 1080,
            fps: 30,
            quality: 'high',
            format: 'mp4'
          },
          projectTitle: script?.title || 'Screening Room'
        })
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Render failed' }))
        throw new Error(error.message || `Render failed: ${response.status}`)
      }
      
      const data = await response.json()

      if (!data.success || !data.renderId) {
        throw new Error(data.message || 'Failed to submit render job')
      }

      trackCta({
        event: 'export_studio_pipeline_enqueued',
        location: 'ScriptPlayer',
        value: data.renderId
      })

      const renderId = data.renderId
      const batchRenderIds: string[] | undefined = Array.isArray(data.batchRenderIds) ? data.batchRenderIds : undefined
      const projectTitle = (script?.title || 'screening-room').replace(/[^a-z0-9]/gi, '-')
      
      // Hide overlay - user can now continue using the app
      useOverlayStore.getState().hide()
      setIsRendering(false) // Allow button to be enabled again
      
      // Show non-blocking notification that render is in progress
      toast.info(batchRenderIds?.length
        ? `Segmented render started (${batchRenderIds.length} batches). We'll merge and notify when it completes.`
        : 'Video render started. You will be notified when it completes.', {
        duration: 6000
      })

      if (batchRenderIds?.length) {
        console.log('[Creatomate] Batch render IDs:', batchRenderIds)
      }
      
      // Poll for render status in background
      let pollAttempts = 0
      const maxPollAttempts = 180 // 15 minutes at 5 second intervals
      
      // Clear any existing polling interval
      if (renderPollIntervalRef.current) {
        clearInterval(renderPollIntervalRef.current)
      }
      
      renderPollIntervalRef.current = setInterval(async () => {
        pollAttempts++
        
        try {
          const statusResponse = await fetch(`/api/screening-room/render?renderId=${renderId}`)
          
          if (!statusResponse.ok) {
            throw new Error('Failed to check render status')
          }
          
          const statusData = await statusResponse.json()
          
          if (statusData.status === 'succeeded' && statusData.videoUrl) {
            if (renderPollIntervalRef.current) {
              clearInterval(renderPollIntervalRef.current)
              renderPollIntervalRef.current = null
            }
            
            // Show success notification with download option
            toast.success('Video render complete!', {
              duration: 10000,
              action: {
                label: 'Download',
                onClick: () => {
                  const a = document.createElement('a')
                  a.href = statusData.videoUrl
                  a.download = `${projectTitle}.mp4`
                  a.target = '_blank'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                }
              }
            })
            
            // Auto-download after a short delay
            setTimeout(() => {
              const a = document.createElement('a')
              a.href = statusData.videoUrl
              a.download = `${projectTitle}.mp4`
              a.target = '_blank'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }, 1000)
            
          } else if (statusData.status === 'failed') {
            if (renderPollIntervalRef.current) {
              clearInterval(renderPollIntervalRef.current)
              renderPollIntervalRef.current = null
            }
            toast.error('Video render failed. Please try again.', { style: renderToastStyle })
          } else if (pollAttempts >= maxPollAttempts) {
            if (renderPollIntervalRef.current) {
              clearInterval(renderPollIntervalRef.current)
              renderPollIntervalRef.current = null
            }
            toast.error('Render timeout - please try again or contact support', { style: renderToastStyle })
          }
          // Continue polling if status is 'queued' or 'rendering'
        } catch (error) {
          console.error('[Render Poll] Error checking status:', error)
          // Don't clear interval on error - continue polling
          // Only clear if we've exceeded max attempts
          if (pollAttempts >= maxPollAttempts) {
            if (renderPollIntervalRef.current) {
              clearInterval(renderPollIntervalRef.current)
              renderPollIntervalRef.current = null
            }
            toast.error('Error checking render status. Please try again.', { style: renderToastStyle })
          }
        }
      }, 5000) // Poll every 5 seconds
      
    } catch (error) {
      useOverlayStore.getState().hide()
      setIsRendering(false)
      console.error('Render submission failed:', error)
      trackCta({
        event: 'export_studio_pipeline_error',
        location: 'ScriptPlayer',
        value: error instanceof Error ? error.message : 'Unknown error'
      })
      toast.error(`Failed to submit render job: ${error instanceof Error ? error.message : 'Unknown error'}`, { style: renderToastStyle })
    }
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
          <button
            onClick={handleDownloadMP4}
            disabled={isRendering}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
            title={isRendering ? "Rendering..." : "Export to MP4"}
          >
            {isRendering ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-sm">Rendering...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span className="text-sm">MP4</span>
              </>
            )}
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
        
        {/* Close button - always visible */}
        <button
          onClick={onClose}
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
        onDownloadMP4={handleDownloadMP4}
        isRendering={isRendering}
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
          onKenBurnsIntensityChange={(intensity) => setPlayerState(prev => ({ ...prev, kenBurnsIntensity: intensity }))}
          isLoading={isLoadingAudio}
        />
      </div>
    </div>
  )
}

