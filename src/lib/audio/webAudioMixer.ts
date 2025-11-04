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
}

export class WebAudioMixer {
  private audioContext: AudioContext | null = null
  private sources: Map<string, AudioBufferSourceNode> = new Map()
  private gainNodes: Map<AudioType, GainNode> = new Map()
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private masterGain: GainNode | null = null
  private isPlaying: boolean = false
  private sceneStartTime: number = 0

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
        gainNode.gain.value = 0.5  // 50% volume for music
      } else {
        gainNode.gain.value = 1.0  // 100% volume for other audio
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
      const audioBuffer = await context.decodeAudioData(arrayBuffer)
      
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
   */
  async playScene(config: SceneAudioConfig): Promise<void> {
    if (this.isPlaying) {
      this.stop()
    }

    const context = await this.initAudioContext()
    this.isPlaying = true
    this.sceneStartTime = context.currentTime

    try {
      // Preload all audio files
      const loadPromises: Promise<AudioBuffer>[] = []

      if (config.music) {
        loadPromises.push(this.loadAudioFile(config.music, 'music'))
      }
      if (config.narration) {
        loadPromises.push(this.loadAudioFile(config.narration, 'narration'))
      }
      if (config.dialogue) {
        config.dialogue.forEach(d => loadPromises.push(this.loadAudioFile(d.url, 'dialogue')))
      }
      if (config.sfx) {
        config.sfx.forEach(s => loadPromises.push(this.loadAudioFile(s.url, 'sfx')))
      }

      await Promise.all(loadPromises)

      // Play music at scene start (if available)
      if (config.music) {
        this.playAudioBuffer(
          this.audioBuffers.get(config.music)!,
          'music',
          0,  // Start at scene beginning
          true  // Loop if needed
        )
      }

      // Play narration at scene start (if available)
      if (config.narration) {
        this.playAudioBuffer(
          this.audioBuffers.get(config.narration)!,
          'narration',
          0
        )
      }

      // Schedule dialogue
      if (config.dialogue) {
        config.dialogue.forEach(d => {
          this.playAudioBuffer(
            this.audioBuffers.get(d.url)!,
            'dialogue',
            d.startTime
          )
        })
      }

      // Schedule SFX
      if (config.sfx) {
        config.sfx.forEach(s => {
          this.playAudioBuffer(
            this.audioBuffers.get(s.url)!,
            'sfx',
            s.startTime
          )
        })
      }
    } catch (error) {
      console.error('[WebAudioMixer] Error playing scene:', error)
      this.isPlaying = false
      throw error
    }
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

    // Handle end of playback
    source.addEventListener('ended', () => {
      this.sources.delete(sourceId)
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
  fadeIn(durationMs: number = 1000): void {
    const musicGain = this.gainNodes.get('music')
    if (!musicGain || !this.audioContext) return

    const currentTime = this.audioContext.currentTime

    // Start at 0, ramp to 0.5 (50% volume for music)
    musicGain.gain.setValueAtTime(0, currentTime)
    musicGain.gain.linearRampToValueAtTime(0.5, currentTime + (durationMs / 1000))
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
    this.isPlaying = false
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
