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
      
      onProgress?.({ phase: 'preparing', progress: 30 })
      const audioBuffers = await this.preloadAudio(adjustedConfig.audioClips, signal)
      
      if (signal.aborted) {
        throw new Error('Render aborted')
      }
      
      // Setup MediaRecorder
      onProgress?.({ phase: 'rendering', progress: 40 })
      const mimeType = getMediaRecorderMimeType()!
      const stream = this.canvas.captureStream(adjustedConfig.fps)
      
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
          const blob = new Blob(this.recordedChunks, { type: mimeType })
          resolve(blob)
        }
        
        this.mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event}`))
        }
      })
      
      this.mediaRecorder.start(100) // Capture every 100ms
      
      // Schedule audio playback
      this.scheduleAudio(audioBuffers, adjustedConfig.audioClips, audioDestination)
      
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
        
        // Draw current frame
        this.drawFrame(currentTime, adjustedConfig, assets)
        
        // Draw text overlays
        if (adjustedConfig.textOverlays) {
          this.drawTextOverlays(currentTime, adjustedConfig.textOverlays)
        }
        
        // Draw watermark (always on top)
        if (adjustedConfig.watermark) {
          this.drawWatermark(adjustedConfig.watermark)
        }
        
        // Report progress
        const progress = 40 + Math.round((frame / totalFrames) * 50)
        onProgress?.({
          phase: 'rendering',
          progress,
          currentFrame: frame,
          totalFrames,
        })
        
        // Wait for next frame (allow UI updates)
        await this.sleep(frameDuration / 2, signal)
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
    
    await Promise.all(
      segments.map(async (segment) => {
        if (signal.aborted) return
        
        if (segment.assetType === 'video') {
          const video = document.createElement('video')
          video.crossOrigin = 'anonymous'
          video.preload = 'auto'
          video.muted = true // We handle audio separately
          
          await new Promise<void>((resolve, reject) => {
            video.onloadeddata = () => resolve()
            video.onerror = () => reject(new Error(`Failed to load video: ${segment.assetUrl}`))
            video.src = segment.assetUrl
          })
          
          assets.set(segment.segmentId, video)
        } else {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error(`Failed to load image: ${segment.assetUrl}`))
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
  
  private drawFrame(
    currentTime: number,
    config: LocalRenderConfig,
    assets: Map<string, HTMLImageElement | HTMLVideoElement>
  ): void {
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
    
    // If video, seek to correct time
    if (asset instanceof HTMLVideoElement) {
      const localTime = currentTime - segment.startTime
      if (Math.abs(asset.currentTime - localTime) > 0.1) {
        asset.currentTime = localTime
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
      
      this.ctx.globalAlpha = 1
    }
  }
  
  private drawWatermark(watermark: LocalRenderWatermark): void {
    if (!this.ctx || !this.canvas) return
    
    const { width, height } = this.canvas
    const { anchor, padding, type } = watermark
    
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
      
      this.ctx.globalAlpha = 1
    }
    
    // Image watermark would require preloading in render() - simplified for now
    // For image watermarks, you'd need to load the image in preloadAssets and draw here
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
    
    this.canvas = null
    this.ctx = null
    this.audioContext = null
    this.mediaRecorder = null
    this.recordedChunks = []
    this.abortController = null
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
