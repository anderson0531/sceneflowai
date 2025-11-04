'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Subtitles } from 'lucide-react'
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
        currentTime = narrationDuration + 0.5 // Add 500ms pause after narration
      } catch (error) {
        console.warn('[Timeline] Failed to get narration duration, using default:', error)
        currentTime = 5 // Default 5 seconds
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

    const scene = scenes[sceneIndex]
    setIsLoadingAudio(true)

    try {
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

        // Auto-advance
        if (playerState.isPlaying) {
          nextScene()
        }
        return
      }

            // CHECK FOR PRE-GENERATED AUDIO FIRST (English mode with Web Audio Mixer)
      // Check if scene has any pre-generated audio (narration, music, dialogue, or SFX)
      const hasPreGeneratedAudio = scene.narrationAudioUrl || 
                                   scene.musicAudio || 
                                   (scene.dialogueAudio && scene.dialogueAudio.length > 0) ||
                                   (scene.sfxAudio && scene.sfxAudio.length > 0)
      
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
        
        // Calculate audio timeline for concurrent playback
        const audioConfig = await calculateAudioTimeline(scene)
        
        // Check if we have any audio to play
        if (!audioConfig.music && !audioConfig.narration && 
            (!audioConfig.dialogue || audioConfig.dialogue.length === 0) &&
            (!audioConfig.sfx || audioConfig.sfx.length === 0)) {
          console.warn('[Player] No audio available in calculated config for scene', sceneIndex + 1, 'Config:', audioConfig)
          setIsLoadingAudio(false)
          if (playerState.isPlaying) {
            setTimeout(() => nextScene(), 2000)
          }
          return
        }
        
        console.log('[Player] Audio config validated, proceeding to play:', {
          music: !!audioConfig.music,
          narration: !!audioConfig.narration,
          dialogueCount: audioConfig.dialogue?.length || 0,
          sfxCount: audioConfig.sfx?.length || 0
        })
        
        setIsLoadingAudio(false) // Clear loading state
        
                // Play scene with Web Audio Mixer (concurrent playback)
        if (audioMixerRef.current) {
          try {
            console.log('[Player] Playing scene with Web Audio Mixer, config:', audioConfig)
            await audioMixerRef.current.playScene(audioConfig)
            
            // Wait for playback to complete
            // Calculate maximum scene duration
            let maxDuration = 0
            
            // Check narration duration
            if (audioConfig.narration) {
              try {
                const duration = await getAudioDuration(audioConfig.narration)
                maxDuration = Math.max(maxDuration, duration)
                console.log('[Player] Narration duration:', duration)
              } catch (error) {
                console.warn('[Player] Failed to get narration duration:', error)                                                                               
              }
            }
            
            // Check dialogue durations
            if (audioConfig.dialogue) {
              for (const dialogue of audioConfig.dialogue) {
                try {
                  const duration = await getAudioDuration(dialogue.url)
                  maxDuration = Math.max(maxDuration, dialogue.startTime + duration)
                  console.log('[Player] Dialogue duration:', duration, 'at', dialogue.startTime)
                } catch (error) {
                  console.warn('[Player] Failed to get dialogue duration:', error)                                                                              
                }
              }
            }
            
            // Check SFX durations
            if (audioConfig.sfx) {
              for (const sfx of audioConfig.sfx) {
                try {
                  const duration = await getAudioDuration(sfx.url)
                  maxDuration = Math.max(maxDuration, sfx.startTime + duration)
                  console.log('[Player] SFX duration:', duration, 'at', sfx.startTime)
                } catch (error) {
                  console.warn('[Player] Failed to get SFX duration:', error)
                }
              }
            }
            
            // Check music duration (if music exists, use scene duration or music duration)
            let musicDuration = 0
            if (audioConfig.music) {
              try {
                musicDuration = await getAudioDuration(audioConfig.music)
                console.log('[Player] Music duration:', musicDuration, '(will loop)')
              } catch (error) {
                console.warn('[Player] Failed to get music duration:', error)
              }
            }
            
            // Music loops, so we use scene duration or max calculated duration
            // If only music exists (no other audio), ensure we wait for at least music duration
            const sceneDuration = scene.duration || Math.max(maxDuration, musicDuration || 30)
            const waitTime = Math.max(sceneDuration * 1000, maxDuration * 1000, musicDuration * 1000) + 500 // Add 500ms buffer
            console.log('[Player] Calculated wait time:', waitTime, 'ms (sceneDuration:', sceneDuration, 'maxDuration:', maxDuration, 'musicDuration:', musicDuration, ')')
            
            // Wait for scene playback to complete
            await new Promise(resolve => setTimeout(resolve, waitTime))
            
          } catch (error) {
            console.error('[Player] Web Audio Mixer error:', error)
            setIsLoadingAudio(false)
            // Fallback to old method on error
            if (playerState.isPlaying) {
              setTimeout(() => nextScene(), 2000)
            }
            return
          }
        }
        
        // Auto-advance to next scene (only if still playing)
        if (playerState.isPlaying) {
          nextScene()
        }
        return
      }
      
      // FALLBACK: Generate audio on-the-fly (existing code)
      console.warn('[Player] ⚠️ No pre-generated audio found! This will make expensive API calls.')
      console.warn('[Player] Please generate audio for all scenes before using Screening Room.')
      console.log('[Player] No pre-generated audio, generating on-the-fly for scene', sceneIndex + 1)
      
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
        // Auto-advance to next scene if no audio
        if (playerState.isPlaying) {
          setTimeout(() => nextScene(), 2000)
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
      
      // Auto-advance even on error
      if (playerState.isPlaying) {
        setTimeout(() => nextScene(), 2000)
      }
    }
  }, [scenes, playerState.isPlaying, playerState.playbackSpeed, playerState.volume, selectedLanguage, translationCache])


  // Play/pause audio when state changes
  useEffect(() => {
    if (playerState.isPlaying && !isLoadingAudio) {
      playSceneAudio(playerState.currentSceneIndex)
    } else if (!playerState.isPlaying) {
      // Pause/stop both HTMLAudioElement and Web Audio Mixer
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioMixerRef.current) {
        audioMixerRef.current.stop()
      }
    }
  }, [playerState.isPlaying, playerState.currentSceneIndex, playSceneAudio])

  const togglePlayPause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }

  const nextScene = () => {
    console.log('[Player] nextScene called - advancing from', playerState.currentSceneIndex)
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
  }

  const previousScene = () => {
    setPlayerState(prev => ({
      ...prev,
      currentSceneIndex: Math.max(0, prev.currentSceneIndex - 1)
    }))
  }

  const jumpToScene = (sceneIndex: number) => {
    if (sceneIndex >= 0 && sceneIndex < scenes.length) {
      setPlayerState(prev => ({ ...prev, currentSceneIndex: sceneIndex }))
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
          onTogglePlay={togglePlayPause}
          onPrevious={previousScene}
          onNext={nextScene}
          onJumpToScene={jumpToScene}
          onSpeedChange={(speed) => setPlayerState(prev => ({ ...prev, playbackSpeed: speed }))}
          isLoading={isLoadingAudio}
        />
      </div>
    </div>
  )
}

