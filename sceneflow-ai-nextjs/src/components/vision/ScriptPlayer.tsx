'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Subtitles } from 'lucide-react'
import { SceneDisplay } from './SceneDisplay'
import { PlaybackControls } from './PlaybackControls'
import { VoiceAssignmentPanel } from './VoiceAssignmentPanel'

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
    { code: 'en', name: 'English', voice: 'en-US-Neural2-F' },
    { code: 'es', name: 'Spanish', voice: 'es-ES-Neural2-A' },
    { code: 'fr', name: 'French', voice: 'fr-FR-Neural2-A' },
    { code: 'de', name: 'German', voice: 'de-DE-Neural2-A' },
    { code: 'it', name: 'Italian', voice: 'it-IT-Neural2-A' },
    { code: 'pt', name: 'Portuguese', voice: 'pt-BR-Neural2-A' },
    { code: 'zh', name: 'Chinese (Mandarin)', voice: 'cmn-CN-Wavenet-A' },
    { code: 'ja', name: 'Japanese', voice: 'ja-JP-Neural2-B' },
    { code: 'ko', name: 'Korean', voice: 'ko-KR-Neural2-A' },
    { code: 'th', name: 'Thai', voice: 'th-TH-Neural2-C' },
    { code: 'hi', name: 'Hindi', voice: 'hi-IN-Neural2-A' },
    { code: 'ar', name: 'Arabic', voice: 'ar-XA-Wavenet-A' },
    { code: 'ru', name: 'Russian', voice: 'ru-RU-Wavenet-A' }
  ]

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)

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
  const translateAndGenerateAudio = async (text: string, sceneIdx: number, audioType: 'narration' | 'dialogue', characterIdx?: number): Promise<string> => {
    // If English, skip translation
    if (selectedLanguage === 'en') {
      // Use pre-generated MP3 if available
      const scene = scenes[sceneIdx]
      if (audioType === 'narration' && scene.narrationAudioUrl) {
        return scene.narrationAudioUrl
      }
      if (audioType === 'dialogue' && characterIdx !== undefined && scene.dialogueAudio?.[characterIdx]?.audioUrl) {
        return scene.dialogueAudio[characterIdx].audioUrl
      }
    }

    // Create cache key
    const cacheKey = `${sceneIdx}-${audioType}-${characterIdx || 0}-${selectedLanguage}`
    
    // Check cache
    const cached = translationCache.get(cacheKey)
    if (cached) {
      console.log('[Translation] Using cached audio for', cacheKey)
      return cached.audio
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
        return newCache
      })

      console.log('[Translation] Audio generated and cached')
      return audioUrl

    } catch (error) {
      console.error('[Translation] Error:', error)
      throw error
    }
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
          const audioUrl = await translateAndGenerateAudio(scene.narration, sceneIndex, 'narration')
          // Get translated text from cache for captions
          const cacheKey = `${sceneIndex}-narration-0-${selectedLanguage}`
          const cached = translationCache.get(cacheKey)
          if (cached) {
            setCurrentTranslatedNarration(cached.text)
          }
          
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
            const audioUrl = await translateAndGenerateAudio(dialogue.line, sceneIndex, 'dialogue', i)
            
            // Get translated text from cache for captions
            const cacheKey = `${sceneIndex}-dialogue-${i}-${selectedLanguage}`
            const cached = translationCache.get(cacheKey)
            if (cached) {
              translatedDialogue[i] = cached.text
            }
            
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

      // CHECK FOR PRE-GENERATED AUDIO FIRST (English mode)
      if (scene.narrationAudioUrl) {
        console.log('[Player] Using pre-generated audio for scene', sceneIndex + 1)
        
        // Play narration
        if (audioRef.current) {
          audioRef.current.src = scene.narrationAudioUrl
          audioRef.current.playbackRate = playerState.playbackSpeed
          audioRef.current.volume = playerState.volume
          
          await audioRef.current.play()
          setIsLoadingAudio(false) // ✅ Clear immediately after play starts
          
          // Wait for narration to finish
          await new Promise<void>((resolve) => {
            if (audioRef.current) {
              audioRef.current.onended = () => resolve()
            }
          })
        }
        
        // Small natural pause after narration
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Play dialogue audios sequentially
        if (scene.dialogueAudio && scene.dialogueAudio.length > 0) {
          for (const dialogue of scene.dialogueAudio) {
            if (dialogue.audioUrl && audioRef.current) {
              console.log('[Player] Playing dialogue for', dialogue.character)
              audioRef.current.src = dialogue.audioUrl
              audioRef.current.playbackRate = playerState.playbackSpeed
              audioRef.current.volume = playerState.volume
              
              await audioRef.current.play()
              
              // Wait for dialogue to finish
              await new Promise<void>((resolve) => {
                if (audioRef.current) {
                  audioRef.current.onended = () => resolve()
                }
              })
              
              // Small pause between dialogue lines
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          }
        }
        
        // Auto-advance to next scene (only if still playing)
        if (playerState.isPlaying) {
          // Immediate advance - no artificial delay needed
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
    } else if (!playerState.isPlaying && audioRef.current) {
      audioRef.current.pause()
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

