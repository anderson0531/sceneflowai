/**
 * Web Audio API Mixer Service
 * 
 * Handles concurrent playback of multiple audio sources (music, narration, dialogue, SFX)
 * with individual volume control and precise timing.
 */

export type AudioType = 'music' | 'narration' | 'dialogue' | 'sfx'

export interface AudioSource {
  url: string
  startTime: number  // Relative to scene start (in seconds)
  duration?: number  // Optional duration override
}

export interface SceneAudioConfig {
  music?: string  // Music URL - plays from scene start
  narration?: string  // Narration URL - plays from scene start
  dialogue?: AudioSource[]  // Dialogue with timing
  sfx?: AudioSource[]  // SFX with timing
  sceneDuration?: number  // Scene duration in seconds (for music-only scenes)
}

export class WebAudioMixer {
  private audioContext: AudioContext | null = null
  private sources: Map<string, AudioBufferSourceNode> = new Map()
  private gainNodes: Map<AudioType, GainNode> = new Map()
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private masterGain: GainNode | null = null
  private isPlaying: boolean = false
  private sceneStartTime: number = 0
  private nonLoopingSources: Map<string, { source: AudioBufferSourceNode, endTime: number }> = new Map()
  private playbackCompleteResolve: (() => void) | null = null

  constructor() {
    // AudioContext will be created on first user interaction (browser autoplay policy)
  }

  /**
   * Initialize AudioContext on first use
   * Must be called in response to user interaction
   */
  private async initAudioContext(): Promise<AudioContext> {
    if (this.audioContext) {
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      return this.audioContext
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Create master gain node
    this.masterGain = this.audioContext.createGain()
    this.masterGain.connect(this.audioContext.destination)
    this.masterGain.gain.value = 1.0

    // Create gain nodes for each audio type
    const types: AudioType[] = ['music', 'narration', 'dialogue', 'sfx']
    types.forEach(type => {
      const gainNode = this.audioContext!.createGain()
      gainNode.connect(this.masterGain!)
      
                    // Set default volumes
      if (type === 'music') {
        gainNode.gain.value = 0.15  // 15% volume for music
      } else if (type === 'dialogue') {
        gainNode.gain.value = 2.1  // 210% volume for dialogue (140% boost)
      } else if (type === 'narration') {
        gainNode.gain.value = 1.5  // 150% volume for narration
      } else {
        gainNode.gain.value = 1.0  // 100% volume for SFX
      }
      
      this.gainNodes.set(type, gainNode)
    })

    return this.audioContext
  }

  /**
   * Load audio file from URL and decode to AudioBuffer
   */
  async loadAudioFile(url: string, type?: AudioType): Promise<AudioBuffer> {
    // Check cache
    if (this.audioBuffers.has(url)) {
      return this.audioBuffers.get(url)!
    }

    const context = await this.initAudioContext()

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      
      // Log audio file info for debugging
      console.log(`[WebAudioMixer] Loading audio from ${url}, size: ${arrayBuffer.byteLength} bytes, type: ${type || 'unknown'}`)
      
      // Decode audio with better error handling
      let audioBuffer: AudioBuffer
      try {
        audioBuffer = await context.decodeAudioData(arrayBuffer)
        console.log(`[WebAudioMixer] Audio decoded successfully: ${audioBuffer.duration.toFixed(2)}s, sample rate: ${audioBuffer.sampleRate}Hz, channels: ${audioBuffer.numberOfChannels}`)
      } catch (decodeError: any) {
        console.error(`[WebAudioMixer] Audio decoding failed for ${url}:`, decodeError)
        // Provide more detailed error information
        throw new Error(`Audio decoding failed: ${decodeError.message}. This may indicate a corrupted audio file or unsupported format.`)
      }
      
      // Cache buffer
      this.audioBuffers.set(url, audioBuffer)
      
      return audioBuffer
    } catch (error) {
      console.error(`[WebAudioMixer] Failed to load audio from ${url}:`, error)
      throw error
    }
  }

  /**
   * Set volume for a specific audio type
   */
  setVolume(type: AudioType, volume: number): void {
    const gainNode = this.gainNodes.get(type)
    if (gainNode && this.audioContext) {
      const currentTime = this.audioContext.currentTime
      gainNode.gain.setValueAtTime(volume, currentTime)
    }
  }

  /**
   * Play a complete scene with concurrent audio
   * Returns a Promise that resolves when all non-looping audio completes
   */
  async playScene(config: SceneAudioConfig): Promise<void> {
    console.log('[WebAudioMixer] playScene called with config:', {
      hasMusic: !!config.music,
      hasNarration: !!config.narration,
      dialogueCount: config.dialogue?.length || 0,
      sfxCount: config.sfx?.length || 0
    })
    
    if (this.isPlaying) {
      console.log('[WebAudioMixer] Stopping previous playback')
      this.stop()
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    const context = await this.initAudioContext()
    this.isPlaying = true
    this.sceneStartTime = context.currentTime
    this.nonLoopingSources.clear()
    console.log('[WebAudioMixer] Scene start time:', this.sceneStartTime)
    console.log('[WebAudioMixer] Playing scene with config:', {
      hasMusic: !!config.music,
      musicUrl: config.music,
      hasNarration: !!config.narration,
      dialogueCount: config.dialogue?.length || 0,
      sfxCount: config.sfx?.length || 0
    })

    // Create promise that resolves when all non-looping audio completes
    const playbackPromise = new Promise<void>((resolve) => {
      this.playbackCompleteResolve = resolve
    })

    try {
      // Preload all audio files
      const loadPromises: Promise<AudioBuffer>[] = []

      if (config.music) {
        console.log('[WebAudioMixer] Loading music:', config.music)
        loadPromises.push(this.loadAudioFile(config.music, 'music'))
      }
      if (config.narration) {
        console.log('[WebAudioMixer] Loading narration:', config.narration)
        loadPromises.push(this.loadAudioFile(config.narration, 'narration'))
      }
      if (config.dialogue) {
        console.log('[WebAudioMixer] Loading', config.dialogue.length, 'dialogue files')
        config.dialogue.forEach(d => {
          console.log('[WebAudioMixer] Loading dialogue:', d.url)
          loadPromises.push(this.loadAudioFile(d.url, 'dialogue'))
        })
      }
      if (config.sfx) {
        console.log('[WebAudioMixer] Loading', config.sfx.length, 'SFX files')
        config.sfx.forEach(s => {
          console.log('[WebAudioMixer] Loading SFX:', s.url)
          loadPromises.push(this.loadAudioFile(s.url, 'sfx'))
        })
      }

      console.log('[WebAudioMixer] Waiting for', loadPromises.length, 'audio files to load')
      await Promise.all(loadPromises)
      console.log('[WebAudioMixer] All audio files loaded successfully')

      // Play music at scene start (if available) - music loops, so we don't track it
      if (config.music) {
        const musicBuffer = this.audioBuffers.get(config.music)
        if (musicBuffer) {
          console.log('[WebAudioMixer] Playing music at 0s, looping, buffer duration:', musicBuffer.duration)
          const musicGain = this.gainNodes.get('music')
          if (musicGain) {
            console.log('[WebAudioMixer] Music gain node current volume:', musicGain.gain.value)
          }
          this.playAudioBuffer(
            musicBuffer,
            'music',
            0,  // Start at scene beginning
            true  // Loop if needed
          )
          console.log('[WebAudioMixer] Music source started successfully')
        } else {
          console.error('[WebAudioMixer] Music buffer not found for:', config.music)
          console.error('[WebAudioMixer] Available buffers:', Array.from(this.audioBuffers.keys()))
        }
      } else {
        console.log('[WebAudioMixer] No music in config for this scene')
      }

      // Play narration at scene start (if available) - narration is non-looping
      if (config.narration) {
        const narrationBuffer = this.audioBuffers.get(config.narration)
        if (narrationBuffer) {
          console.log('[WebAudioMixer] Playing narration at 0s')
          this.playAudioBuffer(
            narrationBuffer,
            'narration',
            0,
            false  // Non-looping
          )
        } else {
          console.error('[WebAudioMixer] Narration buffer not found for:', config.narration)
        }
      }

      // Schedule dialogue - dialogue is non-looping
      if (config.dialogue) {
        console.log('[WebAudioMixer] Scheduling', config.dialogue.length, 'dialogue tracks')
        config.dialogue.forEach(d => {
          const dialogueBuffer = this.audioBuffers.get(d.url)
          if (dialogueBuffer) {
            console.log('[WebAudioMixer] Scheduling dialogue at', d.startTime, 's')
            this.playAudioBuffer(
              dialogueBuffer,
              'dialogue',
              d.startTime,
              false  // Non-looping
            )
          } else {
            console.error('[WebAudioMixer] Dialogue buffer not found for:', d.url)
          }
        })
      }

      // Schedule SFX - SFX is non-looping
      if (config.sfx) {
        console.log('[WebAudioMixer] Scheduling', config.sfx.length, 'SFX tracks')
        config.sfx.forEach(s => {
          const sfxBuffer = this.audioBuffers.get(s.url)
          if (sfxBuffer) {
            console.log('[WebAudioMixer] Scheduling SFX at', s.startTime, 's')
            this.playAudioBuffer(
              sfxBuffer,
              'sfx',
              s.startTime,
              false  // Non-looping
            )
          } else {
            console.error('[WebAudioMixer] SFX buffer not found for:', s.url)
          }
        })
      }

      // If no non-looping sources, use scene duration (for music-only scenes)
      // This handles the case where only music exists (looping)
      if (this.nonLoopingSources.size === 0) {
        const sceneDurationMs = (config.sceneDuration || 5) * 1000 // Default 5 seconds if no duration provided
        console.log('[WebAudioMixer] No non-looping audio sources, using scene duration:', sceneDurationMs, 'ms')
        // Wait for scene duration before resolving (for music-only scenes)
        setTimeout(() => {
          if (this.playbackCompleteResolve) {
            console.log('[WebAudioMixer] Music-only scene duration completed, resolving promise')
            this.playbackCompleteResolve()
            this.playbackCompleteResolve = null
          }
        }, sceneDurationMs)
      }
    } catch (error) {
      console.error('[WebAudioMixer] Error playing scene:', error)
      this.isPlaying = false
      // Resolve promise on error so playback can continue
      if (this.playbackCompleteResolve) {
        this.playbackCompleteResolve()
        this.playbackCompleteResolve = null
      }
      throw error
    }

    // Return promise that resolves when all non-looping audio completes
    return playbackPromise
  }

  /**
   * Play an AudioBuffer with scheduling
   */
  private playAudioBuffer(
    buffer: AudioBuffer,
    type: AudioType,
    startTime: number,
    loop: boolean = false
  ): void {
    if (!this.audioContext || !this.masterGain) return

    const gainNode = this.gainNodes.get(type)
    if (!gainNode) {
      console.warn(`[WebAudioMixer] No gain node for type: ${type}`)
      return
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.connect(gainNode)

    const sourceId = `${type}-${Date.now()}-${Math.random()}`
    this.sources.set(sourceId, source)

    // Calculate absolute start time
    const absoluteStartTime = this.sceneStartTime + startTime

    // Calculate absolute end time for non-looping sources
    if (!loop) {
      const absoluteEndTime = absoluteStartTime + buffer.duration
      this.nonLoopingSources.set(sourceId, { source, endTime: absoluteEndTime })
      console.log(`[WebAudioMixer] Tracking non-looping ${type} source, will end at`, absoluteEndTime, 's')
    }

    // Handle end of playback
    source.addEventListener('ended', () => {
      this.sources.delete(sourceId)
      this.nonLoopingSources.delete(sourceId)
      
      console.log(`[WebAudioMixer] ${type} source ended, remaining non-looping sources:`, this.nonLoopingSources.size)
      
      // Check if all non-looping sources have ended
      if (this.nonLoopingSources.size === 0 && this.playbackCompleteResolve) {
        console.log('[WebAudioMixer] All non-looping audio completed, resolving promise')
        this.playbackCompleteResolve()
        this.playbackCompleteResolve = null
      }
      
      // Check if all sources ended
      if (this.sources.size === 0 && !loop) {
        this.isPlaying = false
      }
    })

    try {
      source.start(absoluteStartTime)
      console.log(`[WebAudioMixer] Started ${type} audio at`, absoluteStartTime, 's (relative:', startTime, 's)', loop ? '(looping)' : '(non-looping)')
    } catch (error) {
      console.error(`[WebAudioMixer] Error starting ${type} audio:`, error)
      this.sources.delete(sourceId)
      this.nonLoopingSources.delete(sourceId)
      
      // Check if this was the last source and resolve if needed
      if (this.nonLoopingSources.size === 0 && this.playbackCompleteResolve) {
        this.playbackCompleteResolve()
        this.playbackCompleteResolve = null
      }
    }
  }

  /**
   * Fade out music over specified duration
   */
  async fadeOut(durationMs: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const musicGain = this.gainNodes.get('music')
      if (!musicGain || !this.audioContext) {
        resolve()
        return
      }

      const currentTime = this.audioContext.currentTime
      const currentVolume = musicGain.gain.value

      // Linear ramp to 0
      musicGain.gain.linearRampToValueAtTime(0, currentTime + (durationMs / 1000))

      setTimeout(() => {
        resolve()
      }, durationMs)
    })
  }

  /**
   * Fade in music over specified duration
   */
    fadeIn(durationMs: number = 1000, targetVolume: number = 0.2): void {
    const musicGain = this.gainNodes.get('music')
    if (!musicGain || !this.audioContext) return

    const currentTime = this.audioContext.currentTime

    // Start at 0, ramp to targetVolume (default 20% volume for music)
    musicGain.gain.setValueAtTime(0, currentTime)
    musicGain.gain.linearRampToValueAtTime(targetVolume, currentTime + (durationMs / 1000))                                                                     
  }

  /**
   * Stop all audio playback
   */
  stop(): void {
    this.sources.forEach(source => {
      try {
        source.stop()
      } catch (error) {
        // Source may have already ended
      }
    })
    this.sources.clear()
    this.nonLoopingSources.clear()
    this.isPlaying = false
    
    // Resolve any pending playback promise when stopped
    if (this.playbackCompleteResolve) {
      this.playbackCompleteResolve()
      this.playbackCompleteResolve = null
    }
  }

  /**
   * Check if currently playing
   */
  getPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop()
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error)
      this.audioContext = null
    }

    this.audioBuffers.clear()
    this.gainNodes.clear()
    this.masterGain = null
  }
}
