'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Subtitles, Download, Loader } from 'lucide-react'
import { SceneDisplay } from './SceneDisplay'
import { PlaybackControls } from './PlaybackControls'
import { VoiceAssignmentPanel } from './VoiceAssignmentPanel'
import { WebAudioMixer, SceneAudioConfig, AudioSource } from '@/lib/audio/webAudioMixer'
import { getAudioDuration } from '@/lib/audio/audioDuration'

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

export function ScreeningRoom({ script, characters, onClose, initialScene = 0 }: ScreeningRoomProps) {
  const scenes = script?.script?.scenes || []
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSceneIndex: initialScene,
    playbackSpeed: 1.0,
    volume: 1.0,
    musicVolume: 0.3, // 30% default volume for music
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
  const [showCaptions, setShowCaptions] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Language translation state
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en') // Default: English
  const [translationCache, setTranslationCache] = useState<Map<string, {text: string, audio: string}>>(new Map())
  const [currentTranslatedNarration, setCurrentTranslatedNarration] = useState<string | undefined>()
  const [currentTranslatedDialogue, setCurrentTranslatedDialogue] = useState<string[] | undefined>()

  // Supported languages with their Google TTS voice codes
  const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', voice: 'en-US-Studio-M' },  // Marcus (Studio)
    { code: 'es', name: 'Spanish', voice: 'es-ES-Neural2-B' },  // Male voice
    { code: 'fr', name: 'French', voice: 'fr-FR-Neural2-B' },   // Male voice
    { code: 'de', name: 'German', voice: 'de-DE-Neural2-B' },   // Male voice
    { code: 'it', name: 'Italian', voice: 'it-IT-Neural2-C' },  // Male voice
    { code: 'pt', name: 'Portuguese', voice: 'pt-BR-Neural2-B' }, // Male voice
    { code: 'zh', name: 'Chinese (Mandarin)', voice: 'cmn-CN-Wavenet-B' }, // Male voice
    { code: 'ja', name: 'Japanese', voice: 'ja-JP-Neural2-C' }, // Male voice
    { code: 'ko', name: 'Korean', voice: 'ko-KR-Neural2-C' },   // Male voice
    { code: 'th', name: 'Thai', voice: 'th-TH-Neural2-C' },     // Male voice (already correct)
    { code: 'hi', name: 'Hindi', voice: 'hi-IN-Neural2-B' },    // Male voice
    { code: 'ar', name: 'Arabic', voice: 'ar-XA-Wavenet-B' },   // Male voice
    { code: 'ru', name: 'Russian', voice: 'ru-RU-Wavenet-B' }   // Male voice
  ]

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

  // Translation helper function
  const translateAndGenerateAudio = async (text: string, sceneIdx: number, audioType: 'narration' | 'dialogue', characterIdx?: number): Promise<{ audioUrl: string, translatedText: string }> => {
    // If English, skip translation
    if (selectedLanguage === 'en') {
      // Use pre-generated MP3 if available
      const scene = scenes[sceneIdx]
      if (audioType === 'narration' && scene.narrationAudioUrl) {
        return { audioUrl: scene.narrationAudioUrl, translatedText: text }
      }
      if (audioType === 'dialogue' && characterIdx !== undefined && scene.dialogueAudio?.[characterIdx]?.audioUrl) {
        return { audioUrl: scene.dialogueAudio[characterIdx].audioUrl, translatedText: text }
      }
    }

    // Create cache key
    const cacheKey = `${sceneIdx}-${audioType}-${characterIdx || 0}-${selectedLanguage}`
    
    // Check cache
    const cached = translationCache.get(cacheKey)
    if (cached) {
      console.log('[Translation] Using cached audio for', cacheKey)
      return { audioUrl: cached.audio, translatedText: cached.text }
    }

    try {
      console.log('[Translation] Translating text to', selectedLanguage)
      
      // Step 1: Translate text
      const translateResponse = await fetch('/api/translate/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: selectedLanguage,
          sourceLanguage: 'en'
        })
      })

      if (!translateResponse.ok) {
        throw new Error('Translation failed')
      }

      const { translatedText } = await translateResponse.json()
      console.log('[Translation] Translated:', text.substring(0, 50), '→', translatedText.substring(0, 50))

      // Step 2: Generate TTS in target language
      const languageConfig = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)
      const voiceId = languageConfig?.voice || 'en-US-Neural2-F'

      const ttsResponse = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translatedText,
          voiceId
        })
      })

      if (!ttsResponse.ok) {
        throw new Error('TTS generation failed')
      }

      // Convert response to blob URL
      const audioBlob = await ttsResponse.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Cache the result
      setTranslationCache(prev => {
        const newCache = new Map(prev)
        newCache.set(cacheKey, { text: translatedText, audio: audioUrl })
        console.log('[Translation] Cached:', cacheKey, '→', translatedText.substring(0, 50))
        return newCache
      })

      console.log('[Translation] Audio generated and cached')
      return { audioUrl, translatedText }

    } catch (error) {
      console.error('[Translation] Error:', error)
      throw error
    }
  }

  /**
   * Calculate audio timeline for a scene
   * Returns timing information for concurrent playback
   */
  const calculateAudioTimeline = async (scene: any): Promise<SceneAudioConfig> => {
    const config: SceneAudioConfig = {}
    let currentTime = 0
    
    // Debug logging
    console.log('[Timeline] Calculating audio timeline for scene:', {
      hasMusic: !!scene.musicAudio,
      musicUrl: scene.musicAudio,
      hasNarration: !!scene.narrationAudioUrl,
      hasDialogue: !!(scene.dialogueAudio && scene.dialogueAudio.length > 0),
      dialogueCount: scene.dialogueAudio?.length || 0,
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
    if (scene.narrationAudioUrl) {
      config.narration = scene.narrationAudioUrl
            // Calculate narration duration for dialogue timing
      try {
        const narrationDuration = await getAudioDuration(scene.narrationAudioUrl)                                                                               
        currentTime = narrationDuration + 3.0 // Add 3-second lag before dialogue starts
      } catch (error) {
        console.warn('[Timeline] Failed to get narration duration, using default:', error)                                                                      
        currentTime = 8 // Default 8 seconds (5s narration + 3s delay)
      }
    }
    
    // Dialogue follows narration sequentially
    if (scene.dialogueAudio && scene.dialogueAudio.length > 0) {
      config.dialogue = []
      
      for (const dialogue of scene.dialogueAudio) {
        if (dialogue.audioUrl) {
          config.dialogue.push({
            url: dialogue.audioUrl,
            startTime: currentTime
          })
          
          // Calculate duration for next dialogue timing
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
  }

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
      
      // If translation enabled (non-English), use dynamic generation
      if (selectedLanguage !== 'en') {
        console.log('[Player] Using translation mode for', selectedLanguage)
        
        // Clear previous translated text
        setCurrentTranslatedNarration(undefined)
        setCurrentTranslatedDialogue(undefined)
        
        // Translate and play narration
        if (scene.narration) {
          const { audioUrl, translatedText } = await translateAndGenerateAudio(scene.narration, sceneIndex, 'narration')
          // Set translated text for captions
          setCurrentTranslatedNarration(translatedText)
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl
            audioRef.current.playbackRate = playerState.playbackSpeed
            audioRef.current.volume = playerState.volume
            await audioRef.current.play()
            setIsLoadingAudio(false)
            
            await new Promise<void>((resolve) => {
              if (audioRef.current) {
                audioRef.current.onended = () => resolve()
              }
            })
          }
        }

        // Small pause
        await new Promise(resolve => setTimeout(resolve, 500))

        // Translate and play dialogue
        if (scene.dialogue && scene.dialogue.length > 0) {
          const translatedDialogue: string[] = []
          for (let i = 0; i < scene.dialogue.length; i++) {
            const dialogue = scene.dialogue[i]
            const { audioUrl, translatedText } = await translateAndGenerateAudio(dialogue.line, sceneIndex, 'dialogue', i)
            
            // Set translated text for captions
            translatedDialogue[i] = translatedText
            
            if (audioRef.current) {
              audioRef.current.src = audioUrl
              audioRef.current.playbackRate = playerState.playbackSpeed
              audioRef.current.volume = playerState.volume
              await audioRef.current.play()
              
              await new Promise<void>((resolve) => {
                if (audioRef.current) {
                  audioRef.current.onended = () => resolve()
                }
              })
              
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          }
          setCurrentTranslatedDialogue(translatedDialogue)
        }

        // Add 3 second delay before advancing to next scene
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Check cancellation after delay
        if (playbackCancelledRef.current) {
          setIsLoadingAudio(false)
          return
        }

        // Auto-advance (only if auto-advance enabled and not manual navigation)
        if (playerState.isPlaying && playerState.autoAdvance && !isManualNavigationRef.current) {
          nextScene()
        }
        return
      }

                  // CHECK FOR PRE-GENERATED AUDIO FIRST (English mode with Web Audio Mixer)                                                                          
      // Check if scene has any pre-generated audio (narration, music, dialogue, or SFX)
      // Only consider audio URLs that are HTTP(S) URLs (persistent), not blob URLs (temporary)
      const hasValidNarration = scene.narrationAudioUrl && 
                                (scene.narrationAudioUrl.startsWith('http://') || scene.narrationAudioUrl.startsWith('https://'))
      const hasValidMusic = scene.musicAudio && 
                           (scene.musicAudio.startsWith('http://') || scene.musicAudio.startsWith('https://'))
      const hasValidDialogue = scene.dialogueAudio && scene.dialogueAudio.length > 0 &&
                              scene.dialogueAudio.some((d: any) => d.audioUrl && 
                                (d.audioUrl.startsWith('http://') || d.audioUrl.startsWith('https://')))
      const hasValidSFX = scene.sfxAudio && scene.sfxAudio.length > 0 &&
                         scene.sfxAudio.some((url: string) => url && 
                           (url.startsWith('http://') || url.startsWith('https://')))
      
      const hasPreGeneratedAudio = hasValidNarration || hasValidMusic || hasValidDialogue || hasValidSFX
      
      if (hasPreGeneratedAudio) {
        console.log('[Player] Using pre-generated audio with Web Audio Mixer for scene', sceneIndex + 1, {
          narration: !!scene.narrationAudioUrl,
          music: !!scene.musicAudio,
          dialogue: !!(scene.dialogueAudio && scene.dialogueAudio.length > 0),
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
  }, [scenes, playerState.isPlaying, playerState.playbackSpeed, playerState.volume, selectedLanguage, translationCache])


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

  const handleDownloadMP4 = async () => {
    setIsRendering(true)
    
    try {
      // Prepare scene data for Creatomate
      const sceneData = scenes.map((scene: any, idx: number) => {
        // Build dialogue array with start times
        const dialogue: Array<{ url: string; startTime: number }> = []
        if (scene.dialogueAudio && Array.isArray(scene.dialogueAudio)) {
          let dialogueTime = 0
          // Estimate narration duration for dialogue timing (5 seconds default)
          if (scene.narrationAudioUrl) {
            dialogueTime = 5 // Approximate narration duration
          }
          
          scene.dialogueAudio.forEach((d: any) => {
            if (d.audioUrl) {
              dialogue.push({
                url: d.audioUrl,
                startTime: dialogueTime
              })
              dialogueTime += 3 // Approximate 3 seconds per dialogue line
            }
          })
        }
        
        // Build SFX array with start times
        const sfx: Array<{ url: string; startTime: number }> = []
        if (scene.sfxAudio && Array.isArray(scene.sfxAudio)) {
          scene.sfxAudio.forEach((sfxUrl: string, sfxIdx: number) => {
            if (sfxUrl) {
              const sfxDef = scene.sfx?.[sfxIdx] || {}
              const sfxTime = sfxDef.time !== undefined ? sfxDef.time : 0
              sfx.push({
                url: sfxUrl,
                startTime: sfxTime
              })
            }
          })
        }
        
        return {
          sceneNumber: idx + 1,
          imageUrl: scene.imageUrl || '/images/placeholders/placeholder.svg',
          duration: scene.duration || 5,
          audioTracks: {
            narration: scene.narrationAudioUrl,
            dialogue: dialogue.length > 0 ? dialogue : undefined,
            sfx: sfx.length > 0 ? sfx : undefined,
            music: scene.musicAudio
          },
          kenBurnsIntensity: playerState.kenBurnsIntensity
        }
      })
      
      // Call Creatomate render API
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
      
      if (!data.success || !data.videoUrl) {
        throw new Error(data.message || 'Render failed: No video URL returned')
      }
      
      // Download video from Creatomate URL
      const a = document.createElement('a')
      a.href = data.videoUrl
      a.download = `${(script?.title || 'screening-room').replace(/[^a-z0-9]/gi, '-')}.mp4`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Show success message
      alert(`Video rendered successfully! ${data.creditsCharged ? `(${data.creditsCharged} credits charged)` : ''}`)
      
    } catch (error) {
      console.error('Render failed:', error)
      alert(`Failed to render video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRendering(false)
    }
  }

  const currentScene = scenes[playerState.currentSceneIndex]

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 h-0.5 bg-gray-600">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((playerState.currentSceneIndex + 1) / scenes.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="text-white">
          <h2 className="text-xl font-semibold">Screening Room</h2>
          <p className="text-sm text-gray-400">{script?.title || 'Untitled Script'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCaptions(prev => !prev)}
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition-colors ${
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
              // Clear cache when language changes
              setTranslationCache(new Map())
            }}
            className="px-3 py-1 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors text-sm"
            title="Select Language"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-gray-800 text-white">
                {lang.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownloadMP4}
            disabled={isRendering}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title={isRendering ? "Rendering..." : "Export to MP4"}
          >
            {isRendering ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span className="hidden sm:inline text-sm">Rendering...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">MP4</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            title="Exit Screening Room (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="h-full flex">
        {/* Scene Display */}
        <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${
          playerState.showVoicePanel ? 'mr-80' : ''
        }`}>
          <SceneDisplay
            scene={currentScene}
            sceneNumber={playerState.currentSceneIndex + 1}
            totalScenes={scenes.length}
            isLoading={isLoadingAudio}
            showCaptions={showCaptions}
            translatedNarration={currentTranslatedNarration}
            translatedDialogue={currentTranslatedDialogue}
            kenBurnsIntensity={playerState.kenBurnsIntensity}
          />
        </div>

        {/* Voice Assignment Panel (Slide-in from right) */}
        <div className={`absolute top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 transform transition-transform duration-300 ${
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

