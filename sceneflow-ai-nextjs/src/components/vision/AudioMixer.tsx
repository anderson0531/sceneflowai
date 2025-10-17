'use client'

import React, { useRef, useState, useEffect } from 'react'
import { VolumeSlider } from '@/components/ui/VolumeSlider'
import { Play, Pause, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface AudioTrack {
  type: 'tts' | 'sfx' | 'music'
  audioUrl: string
  startTime: number  // Relative to scene start (seconds)
  volume?: number    // Optional override, otherwise uses mixer volume
}

interface AudioMixerProps {
  tracks: AudioTrack[]
  isPlaying: boolean
  onPlaybackChange: (isPlaying: boolean) => void
  className?: string
}

export function AudioMixer({ tracks, isPlaying, onPlaybackChange, className = '' }: AudioMixerProps) {
  const [volumes, setVolumes] = useState({ tts: 1.0, sfx: 0.7, music: 0.3 })
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopPlayback()
    }
  }, [])

  const stopPlayback = () => {
    // Stop all source nodes
    sourceNodesRef.current.forEach(node => {
      try {
        node.stop()
      } catch (e) {
        // Already stopped
      }
    })
    sourceNodesRef.current = []

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    onPlaybackChange(false)
  }

  const playMixed = async () => {
    try {
      setError(null)
      
      if (tracks.length === 0) {
        setError('No audio tracks to play')
        return
      }

      // Create audio context
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = ctx

      // Create gain nodes for each track type
      const gainNodes = {
        tts: ctx.createGain(),
        sfx: ctx.createGain(),
        music: ctx.createGain()
      }

      // Set initial volumes
      gainNodes.tts.gain.value = volumes.tts
      gainNodes.sfx.gain.value = volumes.sfx
      gainNodes.music.gain.value = volumes.music

      // Connect gain nodes to destination
      gainNodes.tts.connect(ctx.destination)
      gainNodes.sfx.connect(ctx.destination)
      gainNodes.music.connect(ctx.destination)

      console.log('[AudioMixer] Loading', tracks.length, 'tracks')

      // Load and schedule all tracks
      const sourceNodes: AudioBufferSourceNode[] = []
      
      for (const track of tracks) {
        try {
          // Fetch audio data
          const response = await fetch(track.audioUrl)
          if (!response.ok) {
            console.error('[AudioMixer] Failed to fetch track:', track.type, response.status)
            continue
          }

          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

          // Create source node
          const source = ctx.createBufferSource()
          source.buffer = audioBuffer

          // Connect to appropriate gain node
          const volume = track.volume !== undefined ? track.volume : volumes[track.type]
          const gainNode = gainNodes[track.type]
          
          source.connect(gainNode)

          // Schedule playback
          source.start(ctx.currentTime + track.startTime)
          sourceNodes.push(source)

          console.log('[AudioMixer] Scheduled', track.type, 'at', track.startTime, 'seconds, duration:', audioBuffer.duration)
        } catch (error) {
          console.error('[AudioMixer] Error loading track:', track.type, error)
        }
      }

      sourceNodesRef.current = sourceNodes

      if (sourceNodes.length === 0) {
        setError('Failed to load any audio tracks')
        stopPlayback()
        return
      }

      // Find max duration
      let maxDuration = 0
      sourceNodes.forEach(node => {
        if (node.buffer) {
          const trackEnd = (node as any)._startTime + node.buffer.duration
          maxDuration = Math.max(maxDuration, trackEnd)
        }
      })

      // Set up playback end callback
      setTimeout(() => {
        stopPlayback()
      }, (maxDuration * 1000) + 100)  // Add 100ms buffer

      onPlaybackChange(true)
      console.log('[AudioMixer] Playback started, duration:', maxDuration, 'seconds')
    } catch (error: any) {
      console.error('[AudioMixer] Error:', error)
      setError(error?.message || 'Playback failed')
      stopPlayback()
    }
  }

  const handleVolumeChange = (type: 'tts' | 'sfx' | 'music', value: number) => {
    setVolumes(prev => ({ ...prev, [type]: value }))
    
    // Update live if playing
    if (audioContextRef.current) {
      const gainNodes = audioContextRef.current
      // Note: In a real implementation, you'd store gain node references
      // For now, volume changes apply to new playback
    }
  }

  return (
    <div className={`space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Audio Mixer</h3>
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <Button
              size="sm"
              onClick={playMixed}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Play Mix
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={stopPlayback}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <VolumeSlider 
          label="Dialogue" 
          value={volumes.tts} 
          onChange={(v) => handleVolumeChange('tts', v)} 
        />
        <VolumeSlider 
          label="SFX" 
          value={volumes.sfx} 
          onChange={(v) => handleVolumeChange('sfx', v)} 
        />
        <VolumeSlider 
          label="Music" 
          value={volumes.music} 
          onChange={(v) => handleVolumeChange('music', v)} 
        />
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {tracks.length} track{tracks.length !== 1 ? 's' : ''} loaded
      </div>
    </div>
  )
}

