/**
 * Web Audio API Mixer Service
 * 
 * Handles concurrent playback of multiple audio sources (music, narration, dialogue, SFX)
 * with individual volume control and precise timing.
 */

export type AudioType = 'music' | 'narration' | 'dialogue' | 'sfx'

export interface AudioSource {
  url: string
  startTime?: number  // Relative to scene start (in seconds)
  duration?: number  // Optional duration override
}

export interface SceneAudioConfig {
  music?: string  // Music URL - plays from scene start
  narration?: string  // Narration URL - plays from scene start
  narrationOffsetSeconds?: number  // Optional delay before narration begins
  dialogue?: AudioSource[]  // Dialogue with timing
  sfx?: AudioSource[]  // SFX with timing
  sceneDuration?: number  // Scene duration in seconds (for music-only scenes)
}

const DEFAULT_NARRATION_OFFSET = 2
const DIALOGUE_GAP_SECONDS = 0.3
const SFX_GAP_SECONDS = 0

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
      
      // Decode audio with better error handling
      let audioBuffer: AudioBuffer
      try {
        audioBuffer = await context.decodeAudioData(arrayBuffer)
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
    if (this.isPlaying) {
      this.stop()
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    const context = await this.initAudioContext()
    this.isPlaying = true
    this.sceneStartTime = context.currentTime
    this.nonLoopingSources.clear()
    
    // Reset all gain nodes to default volumes (important after fadeOut)
    const musicGain = this.gainNodes.get('music')
    if (musicGain) {
      musicGain.gain.cancelScheduledValues(context.currentTime)
      musicGain.gain.setValueAtTime(0.15, context.currentTime) // Reset to 15% default
    }

    // Create promise that resolves when all non-looping audio completes
    const playbackPromise = new Promise<void>((resolve) => {
      this.playbackCompleteResolve = resolve
    })

    try {
      // Music can start loading/playing immediately
      if (config.music) {
        this.loadAudioFile(config.music, 'music')
          .then(musicBuffer => {
            this.playAudioBuffer(
              musicBuffer,
              'music',
              0,
              true
            )
          })
          .catch(error => {
            console.error('[WebAudioMixer] Music load/play failed:', error)
          })
      }

      const narrationPromise = config.narration
        ? this.loadAudioFile(config.narration, 'narration').catch(error => {
            console.error('[WebAudioMixer] Narration load failed:', error)
            return null
          })
        : Promise.resolve(null)

      const dialoguePromises = (config.dialogue || []).map(source =>
        this.loadAudioFile(source.url, 'dialogue')
          .then(buffer => ({ source, buffer }))
          .catch(error => {
            console.error('[WebAudioMixer] Dialogue load failed for', source.url, error)
            return null
          })
      )

      const sfxPromises = (config.sfx || []).map(source =>
        this.loadAudioFile(source.url, 'sfx')
          .then(buffer => ({ source, buffer }))
          .catch(error => {
            console.error('[WebAudioMixer] SFX load failed for', source.url, error)
            return null
          })
      )

      const [narrationBuffer, dialogueResults, sfxResults] = await Promise.all([
        narrationPromise,
        Promise.all(dialoguePromises),
        Promise.all(sfxPromises)
      ])

      const narrationOffset = config.narration ? (config.narrationOffsetSeconds ?? DEFAULT_NARRATION_OFFSET) : 0
      const narrationDuration = narrationBuffer?.duration ?? 0
      const narrationEndTime = narrationOffset + narrationDuration

      if (narrationBuffer) {
        this.playAudioBuffer(
          narrationBuffer,
          'narration',
          narrationOffset,
          false
        )
      }

      const validSfx = sfxResults.filter((entry): entry is { source: AudioSource; buffer: AudioBuffer } => !!entry)
      let sfxCursor = narrationEndTime
      validSfx.forEach(({ source, buffer }) => {
        const requestedStart = typeof source.startTime === 'number' ? Math.max(source.startTime, narrationEndTime) : Math.max(sfxCursor, narrationEndTime)
        const startTime = Math.max(requestedStart, sfxCursor)
        this.playAudioBuffer(buffer, 'sfx', startTime, false)
        sfxCursor = startTime + buffer.duration + SFX_GAP_SECONDS
      })

      const validDialogues = dialogueResults.filter((entry): entry is { source: AudioSource; buffer: AudioBuffer } => !!entry)
      let dialogueCursor = Math.max(sfxCursor, narrationEndTime)
      validDialogues.forEach(({ source, buffer }) => {
        const requestedStart = typeof source.startTime === 'number' ? Math.max(source.startTime, dialogueCursor) : dialogueCursor
        const startTime = Math.max(requestedStart, dialogueCursor)
        this.playAudioBuffer(buffer, 'dialogue', startTime, false)
        dialogueCursor = startTime + buffer.duration + DIALOGUE_GAP_SECONDS
      })

      // If no non-looping sources, use scene duration (for music-only scenes)
      // This handles the case where only music exists (looping)
      if (this.nonLoopingSources.size === 0) {
        const sceneDurationMs = (config.sceneDuration || 5) * 1000 // Default 5 seconds if no duration provided
        // Wait for scene duration before resolving (for music-only scenes)
        setTimeout(() => {
          if (this.playbackCompleteResolve) {
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
    }

    // Handle end of playback
    source.addEventListener('ended', () => {
      this.sources.delete(sourceId)
      this.nonLoopingSources.delete(sourceId)
      
      // Check if all non-looping sources have ended
      if (this.nonLoopingSources.size === 0 && this.playbackCompleteResolve) {
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
