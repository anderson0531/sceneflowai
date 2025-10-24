'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Settings } from 'lucide-react'
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

  // Generate and play audio for current scene
  const playSceneAudio = useCallback(async (sceneIndex: number) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length) return

    const scene = scenes[sceneIndex]
    setIsLoadingAudio(true)

    try {
      // CHECK FOR PRE-GENERATED AUDIO FIRST
      if (scene.narrationAudioUrl) {
        console.log('[Player] Using pre-generated audio for scene', sceneIndex + 1)
        
        // Play narration
        if (audioRef.current) {
          audioRef.current.src = scene.narrationAudioUrl
          audioRef.current.playbackRate = playerState.playbackSpeed
          audioRef.current.volume = playerState.volume
          
          await audioRef.current.play()
          
          // Wait for narration to finish
          await new Promise<void>((resolve) => {
            if (audioRef.current) {
              audioRef.current.onended = () => resolve()
            }
          })
        }
        
        // Play dialogue audios sequentially
        if (scene.dialogueAudio && scene.dialogueAudio.length > 0) {
          for (const dialogue of scene.dialogueAudio) {
            if (dialogue.audioUrl && audioRef.current) {
              console.log('[Player] Playing dialogue for', dialogue.character)
              audioRef.current.src = dialogue.audioUrl
              audioRef.current.playbackRate = playerState.playbackSpeed
              audioRef.current.volume = playerState.volume
              
              await audioRef.current.play()
              
              await new Promise<void>((resolve) => {
                if (audioRef.current) {
                  audioRef.current.onended = () => resolve()
                }
              })
            }
          }
        }
        
        setIsLoadingAudio(false)
        
        // Auto-advance to next scene
        if (playerState.isPlaying) {
          setTimeout(() => nextScene(), 1000)
        }
        return
      }
      
      // FALLBACK: Generate audio on-the-fly (existing code)
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
  }, [scenes, playerState.isPlaying, playerState.playbackSpeed, playerState.volume])

  // Handle audio end - auto-advance to next scene
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      console.log('[Player] Audio ended, auto-advancing')
      if (playerState.isPlaying) {
        nextScene()
      }
    }

    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [playerState.isPlaying, playerState.currentSceneIndex, scenes.length])

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
    setPlayerState(prev => {
      const nextIndex = prev.currentSceneIndex + 1
      if (nextIndex >= scenes.length) {
        // End of script
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
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPlayerState(prev => ({ ...prev, showVoicePanel: !prev.showVoicePanel }))}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            title="Voice Settings (V)"
          >
            <Volume2 className="w-5 h-5" />
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

