/**
 * LocalRenderService - Client-side video rendering using WebCodecs/Canvas
 * 
 * Provides fast local rendering for previews and quick exports without
 * requiring server-side Cloud Run infrastructure. Uses:
 * - Canvas API for frame composition
 * - MediaRecorder for video encoding (WebM/MP4)
 * - WebCodecs API for high-performance encoding (when available)
 * 
 * Limitations:
 * - Max recommended: 1080p, 60 seconds
 * - Browser-dependent codec support
 * - Memory-intensive for long videos
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md for architecture decisions
 */

'use client'

// =============================================================================
// Canvas Capture Interface
// =============================================================================

/**
 * Extended MediaStreamTrack interface for canvas capture streams.
 * The requestFrame() method allows manual frame capture instead of automatic intervals.
 */
interface CanvasCaptureMediaStreamTrack extends MediaStreamTrack {
  /** Request a new frame to be captured from the canvas */
  requestFrame(): void
}

// =============================================================================
// Types
// =============================================================================

export interface LocalRenderSegment {
  /** Unique segment ID */
  segmentId: string
  /** URL to the video or image asset */
  assetUrl: string
  /** Asset type */
  assetType: 'video' | 'image'
  /** Start time in the final composition (seconds) */
  startTime: number
  /** Duration in the final composition (seconds) */
  duration: number
  /** Volume for this segment (0-1) */
  volume?: number
  /** Include the video's audio track in the render */
  includeVideoAudio?: boolean
}

export interface LocalRenderAudioClip {
  /** URL to the audio file */
  url: string
  /** Start time in the composition (seconds) */
  startTime: number
  /** Duration in seconds */
  duration: number
  /** Volume (0-1) */
  volume: number
  /** Type for debugging */
  type: 'narration' | 'dialogue' | 'music' | 'sfx'
}

export interface LocalRenderTextOverlay {
  id: string
  text: string
  subtext?: string
  position: { x: number; y: number; anchor: string }
  style: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    backgroundColor?: string
    backgroundOpacity?: number
    textShadow?: boolean
  }
  timing: {
    startTime: number
    duration: number
    fadeInMs: number
    fadeOutMs: number
  }
}

export interface LocalRenderWatermark {
  type: 'text' | 'image'
  text?: string
  imageUrl?: string
  anchor: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  padding: number
  textStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    opacity: number
    textShadow?: boolean
  }
  imageStyle: {
    width: number
    opacity: number
  }
}

export interface LocalRenderConfig {
  /** Video segments to composite */
  segments: LocalRenderSegment[]
  /** Audio clips to mix */
  audioClips: LocalRenderAudioClip[]
  /** Text overlays to burn in */
  textOverlays?: LocalRenderTextOverlay[]
  /** Watermark to burn in */
  watermark?: LocalRenderWatermark
  /** Output resolution */
  resolution: '720p' | '1080p'
  /** Frames per second */
  fps: number
  /** Total duration in seconds */
  totalDuration: number
}

export interface LocalRenderProgress {
  /** Current phase */
  phase: 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error'
  /** Progress percentage (0-100) */
  progress: number
  /** Current frame being rendered */
  currentFrame?: number
  /** Total frames */
  totalFrames?: number
  /** Error message if failed */
  error?: string
}

export type LocalRenderProgressCallback = (progress: LocalRenderProgress) => void

export interface LocalRenderResult {
  /** Success flag */
  success: boolean
  /** Blob URL for the rendered video */
  blobUrl?: string
  /** Blob for download */
  blob?: Blob
  /** MIME type of output */
  mimeType?: string
  /** Duration in seconds */
  duration?: number
  /** Error message if failed */
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

const RESOLUTIONS = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
} as const

/** Max duration for local rendering (seconds) - supports longer user uploads */
export const LOCAL_RENDER_MAX_DURATION = 300

/** Max resolution for local rendering */
export const LOCAL_RENDER_MAX_RESOLUTION = '1080p'

// =============================================================================
// Feature Detection
// =============================================================================

/**
 * Check if WebCodecs API is available
 */
export function isWebCodecsAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return 'VideoEncoder' in window && 'VideoFrame' in window
}

/**
 * Check if MediaRecorder supports the desired format
 */
export function getMediaRecorderMimeType(): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null
  
  // Prefer WebM VP9 for better quality, fallback to VP8, then MP4
  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }
  
  return null
}

/**
 * Check if local rendering is supported in this browser
 */
export function isLocalRenderSupported(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server-side rendering not supported' }
  }
  
  if (!window.MediaRecorder) {
    return { supported: false, reason: 'MediaRecorder API not available' }
  }
  
  const mimeType = getMediaRecorderMimeType()
  if (!mimeType) {
    return { supported: false, reason: 'No supported video codec found' }
  }
  
  if (!window.AudioContext && !(window as unknown as { webkitAudioContext: unknown }).webkitAudioContext) {
    return { supported: false, reason: 'Web Audio API not available' }
  }
  
  return { supported: true }
}

// =============================================================================
// Local Render Service
// =============================================================================

/**
 * LocalRenderService - Main service for client-side video rendering
 */
export class LocalRenderService {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private audioContext: AudioContext | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private abortController: AbortController | null = null
  private isRendering = false
  private _watermarkLogged = false // Debug flag to log watermark only once
  private watermarkImage: HTMLImageElement | null = null // Preloaded watermark image for image-type watermarks
  
  /**
   * Check if a render is currently in progress
   */
  get rendering(): boolean {
    return this.isRendering
  }
  
  /**
   * Abort the current render
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.cleanup()
  }
  
  /**
   * Render a video locally using Canvas + MediaRecorder
   */
  async render(
    config: LocalRenderConfig,
    onProgress?: LocalRenderProgressCallback
  ): Promise<LocalRenderResult> {
    // Validation
    const support = isLocalRenderSupported()
    if (!support.supported) {
      return { success: false, error: support.reason }
    }
    
    if (config.totalDuration > LOCAL_RENDER_MAX_DURATION) {
      return { 
        success: false, 
        error: `Duration exceeds local render limit (${LOCAL_RENDER_MAX_DURATION}s). Use server rendering for longer videos.` 
      }
    }
    
    if (this.isRendering) {
      return { success: false, error: 'A render is already in progress' }
    }
    
    this.isRendering = true
    this.abortController = new AbortController()
    this._watermarkLogged = false // Reset for new render
    const signal = this.abortController.signal
    
    try {
      onProgress?.({ phase: 'preparing', progress: 0 })
      
      // Setup canvas
      const { width, height } = RESOLUTIONS[config.resolution]
      this.canvas = document.createElement('canvas')
      this.canvas.width = width
      this.canvas.height = height
      this.ctx = this.canvas.getContext('2d', { alpha: false })
      
      if (!this.ctx) {
        throw new Error('Could not create canvas context')
      }
      
      // Setup audio context
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.audioContext = new AudioContextClass()
      
      // Preload all assets
      onProgress?.({ phase: 'preparing', progress: 10 })
      const assets = await this.preloadAssets(config.segments, signal)
      
      if (signal.aborted) {
        throw new Error('Render aborted')
      }
      
      // Preload fonts for text overlays and watermarks
      // This ensures fonts are loaded before rendering starts, preventing fallback font issues
      onProgress?.({ phase: 'preparing', progress: 15 })
      await this.preloadFonts(config, signal)
      
      if (signal.aborted) {
        throw new Error('Render aborted')
      }
      
      // Preload watermark image if needed
      onProgress?.({ phase: 'preparing', progress: 20 })
      await this.preloadWatermarkImage(config.watermark, signal)
      
      if (signal.aborted) {
        throw new Error('Render aborted')
      }
      
      // CRITICAL: Update segment durations based on actual video durations
      // This fixes cases where actualVideoDuration wasn't saved during upload
      let adjustedTotalDuration = 0
      const adjustedSegments = config.segments.map((segment, idx) => {
        const asset = assets.get(segment.segmentId)
        let actualDuration = segment.duration
        
        if (asset instanceof HTMLVideoElement && isFinite(asset.duration) && asset.duration > 0) {
          const videoDuration = asset.duration
          if (Math.abs(videoDuration - segment.duration) > 0.5) {
            console.log(`[LocalRender] Segment ${segment.segmentId}: correcting duration from ${segment.duration}s to ${videoDuration}s (actual video)`)
            actualDuration = videoDuration
          }
        }
        
        const adjustedSegment = {
          ...segment,
          startTime: adjustedTotalDuration,
          duration: actualDuration,
        }
        adjustedTotalDuration += actualDuration
        return adjustedSegment
      })
      
      // Update config with adjusted segments and total duration
      const adjustedConfig: LocalRenderConfig = {
        ...config,
        segments: adjustedSegments,
        totalDuration: adjustedTotalDuration,
      }
      
      console.log('[LocalRender] Duration adjustment:', {
        originalDuration: config.totalDuration,
        adjustedDuration: adjustedTotalDuration,
        segments: adjustedSegments.map(s => ({ id: s.segmentId, duration: s.duration }))
      })
      
      // Debug: Log watermark configuration
      if (config.watermark) {
        console.log('[LocalRender] Watermark config:', {
          type: config.watermark.type,
          text: config.watermark.text,
          anchor: config.watermark.anchor,
          padding: config.watermark.padding,
          textStyle: config.watermark.textStyle
        })
      } else {
        console.log('[LocalRender] Watermark: disabled')
      }
      
      onProgress?.({ phase: 'preparing', progress: 30 })
      const audioBuffers = await this.preloadAudio(adjustedConfig.audioClips, signal)
      
      if (signal.aborted) {
        throw new Error('Render aborted')
      }
      
      // Setup MediaRecorder
      onProgress?.({ phase: 'rendering', progress: 40 })
      const mimeType = getMediaRecorderMimeType()!
      // Use captureStream(0) for manual frame capture - this ensures all drawing
      // (including overlays and watermarks) is complete before frame is captured
      const stream = this.canvas.captureStream(0)
      // Get video track for manual frame requests
      const canvasVideoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
      
      // Mix audio into the stream
      const audioDestination = this.audioContext.createMediaStreamDestination()
      const audioTrack = audioDestination.stream.getAudioTracks()[0]
      if (audioTrack) {
        stream.addTrack(audioTrack)
      }
      
      this.recordedChunks = []
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: adjustedConfig.resolution === '1080p' ? 8000000 : 5000000,
      })
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data)
        }
      }
      
      // Start recording
      const recordingPromise = new Promise<Blob>((resolve, reject) => {
        if (!this.mediaRecorder) {
          reject(new Error('MediaRecorder not initialized'))
          return
        }
        
        this.mediaRecorder.onstop = () => {
          const totalChunkSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
          console.log('[LocalRender] Recording stopped:', {
            chunkCount: this.recordedChunks.length,
            totalChunkSize,
            mimeType
          })
          if (this.recordedChunks.length === 0 || totalChunkSize === 0) {
            console.error('[LocalRender] No data recorded - canvas may not have rendered any content')
          }
          const blob = new Blob(this.recordedChunks, { type: mimeType })
          resolve(blob)
        }
        
        this.mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event}`))
        }
      })
      
      this.mediaRecorder.start(100) // Capture every 100ms
      
      // Schedule audio playback (TTS, music, SFX from audio clips)
      this.scheduleAudio(audioBuffers, adjustedConfig.audioClips, audioDestination)
      
      // Schedule video audio (native audio from video files)
      this.scheduleVideoAudio(adjustedConfig, assets, audioDestination)
      
      // Render frames
      const totalFrames = Math.ceil(adjustedConfig.totalDuration * adjustedConfig.fps)
      const frameDuration = 1000 / adjustedConfig.fps
      
      console.log('[LocalRender] Starting render:', {
        totalDuration: adjustedConfig.totalDuration,
        fps: adjustedConfig.fps,
        totalFrames,
        frameDuration,
        segmentCount: adjustedConfig.segments.length,
        segments: adjustedConfig.segments.map(s => ({
          id: s.segmentId,
          startTime: s.startTime,
          duration: s.duration,
          assetType: s.assetType,
          assetUrl: s.assetUrl?.substring(0, 50) + '...'
        }))
      })
      
      for (let frame = 0; frame < totalFrames; frame++) {
        if (signal.aborted) {
          this.mediaRecorder.stop()
          throw new Error('Render aborted')
        }
        
        const currentTime = frame / adjustedConfig.fps
        
        // Draw current frame (await for video seeking)
        await this.drawFrame(currentTime, adjustedConfig, assets)
        
        // Draw text overlays
        if (adjustedConfig.textOverlays) {
          this.drawTextOverlays(currentTime, adjustedConfig.textOverlays)
        }
        
        // Draw watermark (always on top)
        if (adjustedConfig.watermark) {
          this.drawWatermark(adjustedConfig.watermark)
        }
        
        // CRITICAL: Request frame capture AFTER all drawing is complete
        // This fixes the race condition where captureStream(fps) might capture
        // frames before overlays/watermarks are drawn
        if (canvasVideoTrack && 'requestFrame' in canvasVideoTrack) {
          canvasVideoTrack.requestFrame()
        }
        
        // Report progress
        const progress = 40 + Math.round((frame / totalFrames) * 50)
        onProgress?.({
          phase: 'rendering',
          progress,
          currentFrame: frame,
          totalFrames,
        })
        
        // Wait for next frame timing (use full frameDuration for proper pacing)
        await this.sleep(frameDuration, signal)
      }
      
      // Stop recording
      onProgress?.({ phase: 'encoding', progress: 95 })
      this.mediaRecorder.stop()
      
      // Wait for blob
      const blob = await recordingPromise
      const blobUrl = URL.createObjectURL(blob)
      
      onProgress?.({ phase: 'complete', progress: 100 })
      
      return {
        success: true,
        blobUrl,
        blob,
        mimeType,
        duration: adjustedConfig.totalDuration,
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      onProgress?.({ phase: 'error', progress: 0, error: errorMessage })
      return { success: false, error: errorMessage }
    } finally {
      this.cleanup()
    }
  }
  
  // ===========================================================================
  // Private Methods
  // ===========================================================================
  
  private async preloadAssets(
    segments: LocalRenderSegment[],
    signal: AbortSignal
  ): Promise<Map<string, HTMLImageElement | HTMLVideoElement>> {
    const assets = new Map<string, HTMLImageElement | HTMLVideoElement>()
    
    console.log('[LocalRender] Preloading assets for', segments.length, 'segments:', 
      segments.map(s => ({ id: s.segmentId, type: s.assetType, url: s.assetUrl?.substring(0, 80) })))
    
    await Promise.all(
      segments.map(async (segment) => {
        if (signal.aborted) return
        
        if (segment.assetType === 'video') {
          console.log('[LocalRender] Loading video asset:', segment.segmentId)
          const video = document.createElement('video')
          video.crossOrigin = 'anonymous'
          video.preload = 'auto'
          video.muted = true // We handle audio separately
          
          await new Promise<void>((resolve, reject) => {
            video.onloadeddata = () => {
              console.log('[LocalRender] Video loaded:', segment.segmentId, video.videoWidth, 'x', video.videoHeight)
              resolve()
            }
            video.onerror = (e) => {
              console.error('[LocalRender] Video load failed (CORS issue?):', segment.segmentId, e)
              reject(new Error(`Failed to load video: ${segment.assetUrl}`))
            }
            video.src = segment.assetUrl
          })
          
          assets.set(segment.segmentId, video)
        } else {
          console.log('[LocalRender] Loading image asset:', segment.segmentId)
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              console.log('[LocalRender] Image loaded:', segment.segmentId, img.width, 'x', img.height)
              resolve()
            }
            img.onerror = (e) => {
              console.error('[LocalRender] Image load failed (CORS issue?):', segment.segmentId, e)
              reject(new Error(`Failed to load image: ${segment.assetUrl}`))
            }
            img.src = segment.assetUrl
          })
          
          assets.set(segment.segmentId, img)
        }
      })
    )
    
    return assets
  }
  
  private async preloadAudio(
    clips: LocalRenderAudioClip[],
    signal: AbortSignal
  ): Promise<Map<string, AudioBuffer>> {
    const buffers = new Map<string, AudioBuffer>()
    
    if (!this.audioContext) return buffers
    
    await Promise.all(
      clips.map(async (clip, index) => {
        if (signal.aborted) return
        
        try {
          const response = await fetch(clip.url, { signal })
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
          buffers.set(`${clip.type}-${index}`, audioBuffer)
        } catch (error) {
          console.warn(`Failed to load audio clip: ${clip.url}`, error)
        }
      })
    )
    
    return buffers
  }
  
  private scheduleAudio(
    buffers: Map<string, AudioBuffer>,
    clips: LocalRenderAudioClip[],
    destination: MediaStreamAudioDestinationNode
  ): void {
    if (!this.audioContext) return
    
    clips.forEach((clip, index) => {
      const buffer = buffers.get(`${clip.type}-${index}`)
      if (!buffer) return
      
      const source = this.audioContext!.createBufferSource()
      source.buffer = buffer
      
      const gainNode = this.audioContext!.createGain()
      gainNode.gain.value = clip.volume
      
      source.connect(gainNode)
      gainNode.connect(destination)
      
      // Schedule playback
      const startTime = this.audioContext!.currentTime + clip.startTime
      source.start(startTime, 0, clip.duration)
    })
  }
  
  /**
   * Schedule video audio tracks for playback alongside the render
   * This extracts audio from video elements and plays them in sync
   */
  private scheduleVideoAudio(
    config: LocalRenderConfig,
    assets: Map<string, HTMLImageElement | HTMLVideoElement>,
    destination: MediaStreamAudioDestinationNode
  ): void {
    if (!this.audioContext) return
    
    // Filter segments that have video audio enabled
    const videoAudioSegments = config.segments.filter(s => s.includeVideoAudio && s.assetType === 'video')
    
    if (videoAudioSegments.length === 0) return
    
    console.log('[LocalRender] Scheduling video audio for', videoAudioSegments.length, 'segments')
    
    videoAudioSegments.forEach(segment => {
      const video = assets.get(segment.segmentId)
      if (!(video instanceof HTMLVideoElement)) return
      
      try {
        // Create a media element source from the video
        // Note: Can only create one MediaElementAudioSourceNode per video
        const source = this.audioContext!.createMediaElementSource(video)
        
        const gainNode = this.audioContext!.createGain()
        gainNode.gain.value = segment.volume ?? 1.0
        
        source.connect(gainNode)
        gainNode.connect(destination)
        
        // Unmute the video so audio flows through
        video.muted = false
        
        console.log('[LocalRender] Video audio scheduled for segment:', segment.segmentId, 'volume:', segment.volume)
      } catch (error) {
        // MediaElementAudioSourceNode may fail if already created for this video
        console.warn('[LocalRender] Could not create audio source for video:', segment.segmentId, error)
      }
    })
  }
  
  /**
   * Preload fonts to ensure they're available for canvas rendering.
   * Without this, text may render with fallback fonts on first frames.
   */
  private async preloadFonts(
    config: LocalRenderConfig,
    signal: AbortSignal
  ): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts) {
      console.warn('[LocalRender] document.fonts not available, skipping font preload')
      return
    }
    
    const fontsToLoad = new Set<string>()
    
    // Collect fonts from text overlays
    if (config.textOverlays) {
      for (const overlay of config.textOverlays) {
        // Use a standard size for preloading (the actual size doesn't matter for loading)
        const fontString = `${overlay.style.fontWeight} 16px "${overlay.style.fontFamily}"`
        fontsToLoad.add(fontString)
      }
    }
    
    // Collect font from watermark
    if (config.watermark?.type === 'text' && config.watermark.textStyle) {
      const { textStyle } = config.watermark
      const fontString = `${textStyle.fontWeight} 16px "${textStyle.fontFamily}"`
      fontsToLoad.add(fontString)
    }
    
    if (fontsToLoad.size === 0) {
      console.log('[LocalRender] No custom fonts to preload')
      return
    }
    
    console.log('[LocalRender] Preloading fonts:', Array.from(fontsToLoad))
    
    // Load all fonts in parallel with timeout
    const fontPromises = Array.from(fontsToLoad).map(async (fontString) => {
      try {
        await Promise.race([
          document.fonts.load(fontString),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Font load timeout: ${fontString}`)), 5000)
          )
        ])
        console.log('[LocalRender] Font loaded:', fontString)
      } catch (error) {
        console.warn('[LocalRender] Font load failed (will use fallback):', fontString, error)
      }
    })
    
    await Promise.all(fontPromises)
    
    // Wait for all fonts to be ready (belt and suspenders)
    try {
      await document.fonts.ready
      console.log('[LocalRender] All fonts ready')
    } catch (e) {
      console.warn('[LocalRender] document.fonts.ready failed:', e)
    }
  }
  
  /**
   * Preload watermark image if type is 'image'.
   * Must be called before render loop to ensure image is ready for drawImage().
   */
  private async preloadWatermarkImage(
    watermark: LocalRenderWatermark | undefined,
    signal: AbortSignal
  ): Promise<void> {
    this.watermarkImage = null
    
    if (!watermark || watermark.type !== 'image' || !watermark.imageUrl) {
      console.log('[LocalRender] No watermark image to preload (type:', watermark?.type, ')')
      return
    }
    
    console.log('[LocalRender] Preloading watermark image:', watermark.imageUrl)
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Watermark image load timeout (10s)'))
        }, 10000)
        
        const cleanup = () => {
          clearTimeout(timeoutId)
          img.onload = null
          img.onerror = null
        }
        
        img.onload = () => {
          cleanup()
          console.log('[LocalRender] Watermark image loaded:', img.naturalWidth, 'x', img.naturalHeight)
          resolve()
        }
        
        img.onerror = () => {
          cleanup()
          reject(new Error(`Failed to load watermark image: ${watermark.imageUrl}`))
        }
        
        if (signal.aborted) {
          cleanup()
          reject(new Error('Aborted'))
          return
        }
        
        img.src = watermark.imageUrl
      })
      
      // Use decode() for additional guarantee the image is ready for rendering
      if (img.decode) {
        await img.decode()
        console.log('[LocalRender] Watermark image decoded and ready')
      }
      
      this.watermarkImage = img
    } catch (error) {
      console.error('[LocalRender] Failed to preload watermark image:', error)
      // Don't throw - watermark is optional, render should continue without it
    }
  }
  
  private async drawFrame(
    currentTime: number,
    config: LocalRenderConfig,
    assets: Map<string, HTMLImageElement | HTMLVideoElement>
  ): Promise<void> {
    if (!this.ctx || !this.canvas) return
    
    const { width, height } = this.canvas
    
    // Clear to black
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, width, height)
    
    // Find the current segment
    const segment = config.segments.find(
      (s) => currentTime >= s.startTime && currentTime < s.startTime + s.duration
    )
    
    // Debug logging for first frame and every 10 seconds
    if (currentTime === 0 || Math.floor(currentTime) % 10 === 0) {
      console.log('[LocalRender] drawFrame at', currentTime, 'segments:', config.segments.map(s => ({
        id: s.segmentId,
        start: s.startTime,
        duration: s.duration,
        end: s.startTime + s.duration
      })), 'found segment:', segment?.segmentId)
    }
    
    if (!segment) return
    
    const asset = assets.get(segment.segmentId)
    if (!asset) return
    
    // Calculate position to fit and center
    const assetWidth = asset instanceof HTMLVideoElement ? asset.videoWidth : asset.width
    const assetHeight = asset instanceof HTMLVideoElement ? asset.videoHeight : asset.height
    
    const scale = Math.max(width / assetWidth, height / assetHeight)
    const scaledWidth = assetWidth * scale
    const scaledHeight = assetHeight * scale
    const x = (width - scaledWidth) / 2
    const y = (height - scaledHeight) / 2
    
    // If video, seek to correct time and WAIT for seek to complete
    if (asset instanceof HTMLVideoElement) {
      const localTime = currentTime - segment.startTime
      // Only seek if we're more than 1 frame off (at 30fps, ~0.033s)
      if (Math.abs(asset.currentTime - localTime) > 0.04) {
        // Wait for video to seek to the correct frame
        await new Promise<void>((resolve) => {
          let resolved = false
          const onSeeked = () => {
            if (resolved) return
            resolved = true
            asset.removeEventListener('seeked', onSeeked)
            resolve()
          }
          // Add timeout to prevent hanging if seeked never fires (500ms for long videos)
          const timeout = setTimeout(onSeeked, 500)
          asset.addEventListener('seeked', () => {
            clearTimeout(timeout)
            onSeeked()
          })
          asset.currentTime = localTime
        })
      }
    }
    
    // Draw the asset
    this.ctx.drawImage(asset, x, y, scaledWidth, scaledHeight)
  }
  
  private drawTextOverlays(
    currentTime: number,
    overlays: LocalRenderTextOverlay[]
  ): void {
    if (!this.ctx || !this.canvas) return
    
    const { width, height } = this.canvas
    
    // Save canvas state to ensure proper restoration after drawing
    this.ctx.save()
    
    for (const overlay of overlays) {
      const { timing, style, position } = overlay
      const endTime = timing.duration === -1 
        ? Infinity 
        : timing.startTime + timing.duration
      
      // Check if overlay is visible
      if (currentTime < timing.startTime || currentTime > endTime) {
        continue
      }
      
      // Calculate opacity for fade
      let opacity = 1
      const fadeInEnd = timing.startTime + timing.fadeInMs / 1000
      const fadeOutStart = endTime - timing.fadeOutMs / 1000
      
      if (currentTime < fadeInEnd) {
        opacity = (currentTime - timing.startTime) / (timing.fadeInMs / 1000)
      } else if (currentTime > fadeOutStart && timing.duration !== -1) {
        opacity = (endTime - currentTime) / (timing.fadeOutMs / 1000)
      }
      
      opacity = Math.max(0, Math.min(1, opacity))
      
      // Calculate position
      const x = (position.x / 100) * width
      const y = (position.y / 100) * height
      const fontSize = (style.fontSize / 100) * height
      
      // Set font
      this.ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
      this.ctx.textBaseline = 'middle'
      
      // Calculate text alignment based on anchor
      if (position.anchor.includes('center')) {
        this.ctx.textAlign = 'center'
      } else if (position.anchor.includes('right')) {
        this.ctx.textAlign = 'right'
      } else {
        this.ctx.textAlign = 'left'
      }
      
      // Draw background if specified
      if (style.backgroundColor && style.backgroundOpacity) {
        const metrics = this.ctx.measureText(overlay.text)
        const padding = fontSize * 0.3
        const bgWidth = metrics.width + padding * 2
        const bgHeight = fontSize + padding * 2
        
        let bgX = x - padding
        if (this.ctx.textAlign === 'center') bgX -= metrics.width / 2
        else if (this.ctx.textAlign === 'right') bgX -= metrics.width
        
        this.ctx.fillStyle = style.backgroundColor
        this.ctx.globalAlpha = opacity * (style.backgroundOpacity || 0.7)
        this.ctx.fillRect(bgX, y - bgHeight / 2, bgWidth, bgHeight)
      }
      
      // Draw text shadow if enabled
      if (style.textShadow) {
        this.ctx.fillStyle = '#000000'
        this.ctx.globalAlpha = opacity * 0.5
        this.ctx.fillText(overlay.text, x + 2, y + 2)
      }
      
      // Draw text
      this.ctx.fillStyle = style.color
      this.ctx.globalAlpha = opacity
      this.ctx.fillText(overlay.text, x, y)
      
      // Draw subtext if present
      if (overlay.subtext) {
        this.ctx.font = `${style.fontWeight - 100} ${fontSize * 0.7}px ${style.fontFamily}`
        this.ctx.fillText(overlay.subtext, x, y + fontSize)
      }
    }
    
    // Restore canvas state (resets globalAlpha, font, fillStyle, etc.)
    this.ctx.restore()
  }
  
  private drawWatermark(watermark: LocalRenderWatermark): void {
    if (!this.ctx || !this.canvas) {
      console.warn('[LocalRender] drawWatermark: no canvas context')
      return
    }
    
    // Save canvas state to ensure proper restoration after drawing
    this.ctx.save()
    
    const { width, height } = this.canvas
    const { anchor, padding, type } = watermark
    
    // Debug: Log watermark drawing (only on first frame to avoid spam)
    if (!this._watermarkLogged) {
      console.log('[LocalRender] Drawing watermark:', { type, anchor, padding, text: watermark.text, canvas: { width, height } })
      this._watermarkLogged = true
    }
    
    // Calculate position based on anchor
    let x: number
    let y: number
    
    // Horizontal position
    if (anchor.includes('left')) {
      x = padding
    } else if (anchor.includes('right')) {
      x = width - padding
    } else {
      x = width / 2 // center
    }
    
    // Vertical position
    if (anchor.includes('top')) {
      y = padding
    } else if (anchor.includes('bottom')) {
      y = height - padding
    } else {
      y = height / 2 // center
    }
    
    if (type === 'text' && watermark.text) {
      const { textStyle } = watermark
      const fontSize = (textStyle.fontSize / 100) * height
      
      // Set font
      this.ctx.font = `${textStyle.fontWeight} ${fontSize}px ${textStyle.fontFamily}`
      this.ctx.globalAlpha = textStyle.opacity
      
      // Set text alignment based on anchor
      if (anchor.includes('left')) {
        this.ctx.textAlign = 'left'
      } else if (anchor.includes('right')) {
        this.ctx.textAlign = 'right'
      } else {
        this.ctx.textAlign = 'center'
      }
      
      // Set baseline based on vertical anchor
      if (anchor.includes('top')) {
        this.ctx.textBaseline = 'top'
      } else if (anchor.includes('bottom')) {
        this.ctx.textBaseline = 'bottom'
      } else {
        this.ctx.textBaseline = 'middle'
      }
      
      // Draw text shadow if enabled
      if (textStyle.textShadow) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        this.ctx.fillText(watermark.text, x + 2, y + 2)
      }
      
      // Draw text
      this.ctx.fillStyle = textStyle.color
      this.ctx.fillText(watermark.text, x, y)
    } else if (type === 'image' && this.watermarkImage && this.watermarkImage.complete) {
      // Draw image watermark (preloaded in preloadWatermarkImage)
      const { imageStyle } = watermark
      const img = this.watermarkImage
      
      // Calculate scaled dimensions (imageStyle.width is percentage of canvas width)
      const targetWidth = (imageStyle.width / 100) * width
      const aspectRatio = img.naturalHeight / img.naturalWidth
      const targetHeight = targetWidth * aspectRatio
      
      this.ctx.globalAlpha = imageStyle.opacity
      
      // Adjust position based on anchor for image drawing
      let drawX = x
      let drawY = y
      
      if (anchor.includes('right')) {
        drawX = x - targetWidth
      } else if (!anchor.includes('left')) {
        // center
        drawX = x - targetWidth / 2
      }
      
      if (anchor.includes('bottom')) {
        drawY = y - targetHeight
      } else if (!anchor.includes('top')) {
        // center
        drawY = y - targetHeight / 2
      }
      
      this.ctx.drawImage(img, drawX, drawY, targetWidth, targetHeight)
    }
    
    // Restore canvas state (resets globalAlpha, font, fillStyle, textAlign, etc.)
    this.ctx.restore()
  }
  
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout)
        reject(new Error('Aborted'))
      })
    })
  }
  
  private cleanup(): void {
    this.isRendering = false
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch {
        // Ignore
      }
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close()
      } catch {
        // Ignore
      }
    }
    
    // Clear recorded chunks to free memory BEFORE nullifying references
    // This is critical for preventing memory buildup
    if (this.recordedChunks.length > 0) {
      console.log('[LocalRender] Clearing', this.recordedChunks.length, 'recorded chunks')
      this.recordedChunks.length = 0
    }
    
    // Clear preloaded watermark image to free memory
    this.watermarkImage = null
    
    this.canvas = null
    this.ctx = null
    this.audioContext = null
    this.mediaRecorder = null
    this.recordedChunks = []
    this.abortController = null
  }
  
  /**
   * Revoke a blob URL to free memory
   * Call this after the blob URL is no longer needed (e.g., after upload to storage)
   */
  static revokeBlobUrl(blobUrl: string): void {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl)
        console.log('[LocalRender] Revoked blob URL:', blobUrl.substring(0, 50))
      } catch (e) {
        console.warn('[LocalRender] Failed to revoke blob URL:', e)
      }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let localRenderServiceInstance: LocalRenderService | null = null

/**
 * Get the singleton LocalRenderService instance
 */
export function getLocalRenderService(): LocalRenderService {
  if (!localRenderServiceInstance) {
    localRenderServiceInstance = new LocalRenderService()
  }
  return localRenderServiceInstance
}

export default LocalRenderService
