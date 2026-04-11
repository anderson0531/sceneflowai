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
  /** Optional end keyframe URL — animatic crossfade matches ScenePreviewPlayer (image segments) */
  endFrameUrl?: string
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
  // Double-buffer pattern: draw to hidden canvas, then copy atomically to output
  private canvas: HTMLCanvasElement | null = null // Output canvas (for captureStream)
  private ctx: CanvasRenderingContext2D | null = null // Output context
  private hiddenCanvas: HTMLCanvasElement | null = null // Hidden canvas for all draw operations
  private hiddenCtx: CanvasRenderingContext2D | null = null // Hidden context
  private audioContext: AudioContext | null = null
  private playbackAudioContext: AudioContext | null = null // For playing pre-rendered audio into MediaRecorder
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private abortController: AbortController | null = null
  private isRendering = false
  private _watermarkLogged = false // Debug flag to log watermark only once
  private watermarkImage: HTMLImageElement | null = null // Preloaded watermark image for image-type watermarks
  
  // Content bounds tracking - stores where the actual video content is drawn
  // This is crucial for watermark positioning when video aspect ratio differs from canvas
  private contentBounds: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 }
  
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
      
      // Setup canvas with Double-Buffer pattern for reliable overlay rendering
      // This fixes race conditions in GCP/headless environments where captureStream
      // may capture frames before overlays are fully committed to the GPU buffer
      const { width, height } = RESOLUTIONS[config.resolution]
      
      // Hidden canvas: All draw operations happen here first
      this.hiddenCanvas = document.createElement('canvas')
      this.hiddenCanvas.width = width
      this.hiddenCanvas.height = height
      // willReadFrequently optimizes for getImageData calls used in frame commit
      this.hiddenCtx = this.hiddenCanvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: true 
      })
      
      // Output canvas: Used for captureStream, receives atomic frame copies
      this.canvas = document.createElement('canvas')
      this.canvas.width = width
      this.canvas.height = height
      // desynchronized: false forces sync mode (required for captureStream reliability)
      // preserveDrawingBuffer: true ensures buffer persists between frames
      this.ctx = this.canvas.getContext('2d', { 
        alpha: false,
        desynchronized: false,
      } as CanvasRenderingContext2DSettings)
      
      if (!this.ctx || !this.hiddenCtx) {
        throw new Error('Could not create canvas context')
      }
      
      // Reset any existing transforms to ensure consistent coordinate system
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.hiddenCtx.setTransform(1, 0, 0, 1, 0, 0)
      
      // Setup audio context for preloading (will be replaced by offline context for rendering)
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
      
      // Keep composition length aligned with mixer: audio/elastic timeline can exceed visual segments.
      // Previously we only used sum(segment durations), so narration/music at 6s produced a 4s WebM while UI showed 6s.
      const compositionDuration = Math.max(adjustedTotalDuration, config.totalDuration)

      // Update config with adjusted segments and total duration
      const adjustedConfig: LocalRenderConfig = {
        ...config,
        segments: adjustedSegments,
        totalDuration: compositionDuration,
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
      let mimeType = getMediaRecorderMimeType()!
      // Image-only animatics: use timed captureStream(fps). With captureStream(0) + requestFrame(),
      // Chromium VP9 often collapses identical canvas pixels into a single encoded frame, so the
      // output shows one frozen frame while audio plays for the full duration.
      // Video segments still use manual requestFrame() after each seek for frame-accurate capture.
      const allSegmentsAreImages =
        adjustedConfig.segments.length > 0 &&
        adjustedConfig.segments.every((s) => s.assetType === 'image')
      const captureFps = Math.min(60, Math.max(1, Math.round(adjustedConfig.fps)))
      const stream = allSegmentsAreImages
        ? this.canvas.captureStream(captureFps)
        : this.canvas.captureStream(0)
      if (allSegmentsAreImages) {
        console.log(
          `[LocalRender] Using captureStream(${captureFps}) for image-only animatic (avoids single-frame WebM)`
        )
      }
      // Get video track for manual frame requests (video path only)
      const canvasVideoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
      
      // ===========================================================================
      // PRE-RENDER AUDIO using OfflineAudioContext
      // ===========================================================================
      // The render loop runs slower than real-time (frame-by-frame with seeks).
      // If we used a real-time AudioContext, audio would play at normal speed 
      // and finish before the video render completes, causing silent output.
      //
      // Solution: Pre-render ALL audio (TTS, music, SFX, video audio) into a 
      // single buffer using OfflineAudioContext, then play it back via a 
      // real-time AudioContext that feeds into MediaRecorder's stream.
      // ===========================================================================
      
      const sampleRate = 44100
      const totalSamples = Math.ceil(adjustedConfig.totalDuration * sampleRate)
      
      let preRenderedAudioBuffer: AudioBuffer | null = null
      
      if (audioBuffers.size > 0 || adjustedConfig.segments.some(s => s.includeVideoAudio)) {
        try {
          console.log('[LocalRender] Pre-rendering audio with OfflineAudioContext:', {
            duration: adjustedConfig.totalDuration,
            sampleRate,
            totalSamples,
            audioClipCount: adjustedConfig.audioClips.length,
            videoAudioSegments: adjustedConfig.segments.filter(s => s.includeVideoAudio).length,
          })
          
          const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate)
          
          // Schedule all audio clips (narration, dialogue, music, sfx) into offline context
          adjustedConfig.audioClips.forEach((clip, index) => {
            const buffer = audioBuffers.get(`${clip.type}-${index}`)
            if (!buffer) return
            
            const source = offlineCtx.createBufferSource()
            source.buffer = buffer
            
            const gainNode = offlineCtx.createGain()
            gainNode.gain.value = clip.volume
            
            source.connect(gainNode)
            gainNode.connect(offlineCtx.destination)
            
            // Schedule at the correct time offset within the composition
            const startTime = Math.max(0, clip.startTime)
            const maxDuration = Math.max(0, adjustedConfig.totalDuration - startTime)
            source.start(startTime, 0, Math.min(clip.duration, maxDuration))
          })
          
          // Pre-render video audio from video elements
          // Extract audio from each video that has includeVideoAudio enabled
          for (const segment of adjustedConfig.segments) {
            if (!segment.includeVideoAudio || segment.assetType !== 'video') continue
            
            const video = assets.get(segment.segmentId)
            if (!(video instanceof HTMLVideoElement)) continue
            
            try {
              // Fetch the video's audio track separately and decode it
              const response = await fetch(segment.assetUrl, { signal })
              const arrayBuffer = await response.arrayBuffer()
              
              // Decode the video file's audio using the offline context
              const videoAudioBuffer = await offlineCtx.decodeAudioData(arrayBuffer)
              
              const source = offlineCtx.createBufferSource()
              source.buffer = videoAudioBuffer
              
              const gainNode = offlineCtx.createGain()
              gainNode.gain.value = segment.volume ?? 1.0
              
              source.connect(gainNode)
              gainNode.connect(offlineCtx.destination)
              
              // Schedule at the segment's start time
              source.start(segment.startTime, 0, segment.duration)
              
              console.log('[LocalRender] Video audio scheduled in offline context:', {
                segmentId: segment.segmentId,
                startTime: segment.startTime,
                duration: segment.duration,
                volume: segment.volume,
              })
            } catch (videoAudioError) {
              console.warn('[LocalRender] Could not extract audio from video:', segment.segmentId, videoAudioError)
            }
          }
          
          // Render the complete audio mix
          preRenderedAudioBuffer = await offlineCtx.startRendering()
          console.log('[LocalRender] Audio pre-rendered successfully:', {
            duration: preRenderedAudioBuffer.duration,
            channels: preRenderedAudioBuffer.numberOfChannels,
            sampleRate: preRenderedAudioBuffer.sampleRate,
          })
        } catch (audioError) {
          console.error('[LocalRender] Failed to pre-render audio, video will have no audio:', audioError)
        }
      }
      
      // Create audio track for recorder only when we actually have pre-rendered audio.
      // Attaching an empty audio track can cause some browsers to emit zero chunks.
      let audioDestination: MediaStreamAudioDestinationNode | null = null
      if (preRenderedAudioBuffer) {
        const playbackAudioContext = new AudioContextClass()
        this.playbackAudioContext = playbackAudioContext
        audioDestination = playbackAudioContext.createMediaStreamDestination()
        const audioTrack = audioDestination.stream.getAudioTracks()[0]
        if (audioTrack) {
          stream.addTrack(audioTrack)
        }
      }
      const hasAudioTrack = stream.getAudioTracks().length > 0
      if (!hasAudioTrack && mimeType.includes('opus')) {
        // Image-only animatic renders may not have an audio track.
        // Prefer a video-only mime to avoid empty recordings.
        const videoOnlyMimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ]
        const fallbackMime = videoOnlyMimeTypes.find((mt) => MediaRecorder.isTypeSupported(mt))
        if (fallbackMime) {
          mimeType = fallbackMime
        }
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
      
      // Play back pre-rendered audio through the real-time context
      // This will be captured by the MediaRecorder's audio track
      if (preRenderedAudioBuffer && audioDestination && this.playbackAudioContext) {
        const audioSource = this.playbackAudioContext.createBufferSource()
        audioSource.buffer = preRenderedAudioBuffer
        audioSource.connect(audioDestination)
        audioSource.start(0)
        console.log('[LocalRender] Pre-rendered audio playback started')
      }
      
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
        
        // === DOUBLE-BUFFER PATTERN ===
        // All drawing happens on hiddenCtx first, then atomically copied to output
        // This fixes race conditions where captureStream captures incomplete frames
        
        // Step 1: Draw base video frame to hidden buffer
        await this.drawFrame(currentTime, adjustedConfig, assets)
        
        // Step 2: Draw text overlays to hidden buffer
        if (adjustedConfig.textOverlays) {
          this.drawTextOverlays(currentTime, adjustedConfig.textOverlays)
        }
        
        // Step 3: Draw watermark to hidden buffer (always last/on top)
        if (adjustedConfig.watermark) {
          this.drawWatermark(adjustedConfig.watermark)
        }
        
        // Step 4: ATOMIC COMMIT - Copy completed frame to output buffer
        // This single drawImage call ensures overlays/watermarks are never skipped
        if (this.ctx && this.hiddenCanvas) {
          this.ctx.drawImage(this.hiddenCanvas, 0, 0)
          
          // Step 5: SYNCHRONOUS FLUSH - Force GPU to complete all pending draws
          // getImageData forces Chromium to resolve all pending operations
          // This prevents "half-baked" frames in headless/GCP environments
          this.ctx.getImageData(0, 0, 1, 1)
          
          // Step 5b: WATERMARK VERIFICATION (first frame only)
          // Sample pixels from bottom-right watermark region to confirm drawing
          if (frame === 0 && adjustedConfig.watermark) {
            const { width: cw, height: ch } = this.canvas
            // Sample 10x10 region from watermark area (bottom-right, with padding)
            const sampleX = Math.max(0, cw - 200)
            const sampleY = Math.max(0, ch - 100)
            const sampleData = this.ctx.getImageData(sampleX, sampleY, 100, 50)
            let nonTransparentPixels = 0
            for (let i = 0; i < sampleData.data.length; i += 4) {
              // Check if pixel differs from pure black (video background)
              if (sampleData.data[i] > 10 || sampleData.data[i + 1] > 10 || sampleData.data[i + 2] > 10) {
                nonTransparentPixels++
              }
            }
            console.log('[LocalRender] Watermark verification:', {
              sampleRegion: { x: sampleX, y: sampleY, w: 100, h: 50 },
              nonTransparentPixels,
              totalPixels: sampleData.data.length / 4,
              watermarkLikelyVisible: nonTransparentPixels > 100,
            })
          }
        }
        
        // Step 6: SOFTWARE TICK - Allow browser task runner to catch up
        // This microtask delay ensures the buffer state is registered
        await new Promise(resolve => setTimeout(resolve, 0))
        
        // Step 7: Request frame capture (video segments only; image animatic uses timed captureStream)
        if (!allSegmentsAreImages && canvasVideoTrack && 'requestFrame' in canvasVideoTrack) {
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
      // Final flush: request one more frame and allow recorder to emit trailing chunk.
      if (!allSegmentsAreImages && canvasVideoTrack && 'requestFrame' in canvasVideoTrack) {
        canvasVideoTrack.requestFrame()
      }
      await this.sleep(150, signal)
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

          if (segment.endFrameUrl && segment.endFrameUrl !== segment.assetUrl) {
            const endKey = `${segment.segmentId}__end`
            const endImg = new Image()
            endImg.crossOrigin = 'anonymous'
            await new Promise<void>((resolve, reject) => {
              endImg.onload = () => {
                console.log('[LocalRender] End frame loaded:', segment.segmentId)
                resolve()
              }
              endImg.onerror = () => {
                console.warn('[LocalRender] End frame failed, using start-only:', segment.segmentId)
                resolve()
              }
              endImg.src = segment.endFrameUrl!
            })
            if (endImg.complete && endImg.naturalWidth > 0) {
              assets.set(endKey, endImg)
            }
          }
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
  
  /**
   * Animatic still crossfade + subtle push-in (matches ScenePreviewPlayer image-sequence).
   */
  private drawAnimaticStillPair(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    startImg: HTMLImageElement,
    endImg: HTMLImageElement | undefined,
    progress: number
  ): void {
    const p = Math.max(0, Math.min(1, progress))
    const scalePush = 1 + p * 0.02

    const drawLayer = (img: HTMLImageElement, alpha: number) => {
      if (alpha <= 0) return
      ctx.save()
      ctx.globalAlpha = alpha
      const aw = img.naturalWidth || img.width
      const ah = img.naturalHeight || img.height
      if (aw <= 0 || ah <= 0) {
        ctx.restore()
        return
      }
      const baseScale = Math.max(canvasW / aw, canvasH / ah)
      const s = baseScale * scalePush
      const sw = aw * s
      const sh = ah * s
      const x = (canvasW - sw) / 2
      const y = (canvasH - sh) / 2
      ctx.drawImage(img, x, y, sw, sh)
      ctx.restore()
    }

    drawLayer(startImg, 1)
    if (endImg && endImg.naturalWidth > 0) {
      drawLayer(endImg, p)
    }
  }

  private async drawFrame(
    currentTime: number,
    config: LocalRenderConfig,
    assets: Map<string, HTMLImageElement | HTMLVideoElement>
  ): Promise<void> {
    // Use hidden canvas for double-buffer pattern
    const ctx = this.hiddenCtx
    const canvas = this.hiddenCanvas
    if (!ctx || !canvas) return
    
    const { width, height } = canvas
    
    // Clear to black
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
    
    const t = Math.min(Math.max(0, currentTime), Math.max(0, config.totalDuration - 1e-4))
    const segs = config.segments

    let segment = segs.find((s) => t >= s.startTime && t < s.startTime + s.duration)
    let localTime = segment ? t - segment.startTime : 0

    // Hold last visual frame while audio continues past segment timeline (mixer preview behavior)
    if (!segment && segs.length > 0) {
      const last = segs[segs.length - 1]
      const visualEnd = last.startTime + last.duration
      if (t >= visualEnd && t < config.totalDuration) {
        segment = last
        localTime = last.duration
      }
    }
    
    // Debug logging for first frame and every 10 seconds
    if (currentTime === 0 || Math.floor(currentTime) % 10 === 0) {
      console.log('[LocalRender] drawFrame at', currentTime, 'segments:', config.segments.map(s => ({
        id: s.segmentId,
        start: s.startTime,
        duration: s.duration,
        end: s.startTime + s.duration
      })), 'found segment:', segment?.segmentId, 'localTime:', localTime)
    }
    
    if (!segment) return
    
    const asset = assets.get(segment.segmentId)
    if (!asset) return
    
    // If video, seek to correct time and WAIT for seek to complete
    if (asset instanceof HTMLVideoElement) {
      const dur = segment.duration
      const localSeek = Math.min(
        Math.max(localTime, 0),
        Math.max(0, dur - 0.001)
      )
      if (Math.abs(asset.currentTime - localSeek) > 0.04) {
        await new Promise<void>((resolve) => {
          let resolved = false
          const onSeeked = () => {
            if (resolved) return
            resolved = true
            asset.removeEventListener('seeked', onSeeked)
            resolve()
          }
          const timeout = setTimeout(onSeeked, 500)
          asset.addEventListener('seeked', () => {
            clearTimeout(timeout)
            onSeeked()
          })
          asset.currentTime = localSeek
        })
      }
    }
    
    // Calculate position to fit and center (video uses post-seek dimensions; image uses bitmap)
    const assetWidth = asset instanceof HTMLVideoElement ? asset.videoWidth : asset.width
    const assetHeight = asset instanceof HTMLVideoElement ? asset.videoHeight : asset.height
    
    const scale = Math.max(width / assetWidth, height / assetHeight)
    const scaledWidth = assetWidth * scale
    const scaledHeight = assetHeight * scale
    const x = (width - scaledWidth) / 2
    const y = (height - scaledHeight) / 2
    
    this.contentBounds = { x, y, width: scaledWidth, height: scaledHeight }
    
    if (asset instanceof HTMLVideoElement) {
      ctx.drawImage(asset, x, y, scaledWidth, scaledHeight)
    } else {
      const endImg = assets.get(`${segment.segmentId}__end`) as HTMLImageElement | undefined
      const progress =
        segment.duration > 0 ? Math.max(0, Math.min(1, localTime / segment.duration)) : 0
      this.drawAnimaticStillPair(ctx, width, height, asset, endImg, progress)
    }
  }
  
  private drawTextOverlays(
    currentTime: number,
    overlays: LocalRenderTextOverlay[]
  ): void {
    // Use hidden canvas for double-buffer pattern
    const ctx = this.hiddenCtx
    const canvas = this.hiddenCanvas
    if (!ctx || !canvas) return
    
    const { width, height } = canvas
    
    // Save canvas state to ensure proper restoration after drawing
    ctx.save()
    
    // Force reset alpha to prevent "alpha bleed" from previous operations
    ctx.globalAlpha = 1.0
    
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
      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`
      ctx.textBaseline = 'middle'
      
      // Calculate text alignment based on anchor
      if (position.anchor.includes('center')) {
        ctx.textAlign = 'center'
      } else if (position.anchor.includes('right')) {
        ctx.textAlign = 'right'
      } else {
        ctx.textAlign = 'left'
      }
      
      // Draw background if specified
      if (style.backgroundColor && style.backgroundOpacity) {
        const metrics = ctx.measureText(overlay.text)
        const padding = fontSize * 0.3
        const bgWidth = metrics.width + padding * 2
        const bgHeight = fontSize + padding * 2
        
        let bgX = x - padding
        if (ctx.textAlign === 'center') bgX -= metrics.width / 2
        else if (ctx.textAlign === 'right') bgX -= metrics.width
        
        ctx.fillStyle = style.backgroundColor
        ctx.globalAlpha = opacity * (style.backgroundOpacity || 0.7)
        ctx.fillRect(bgX, y - bgHeight / 2, bgWidth, bgHeight)
      }
      
      // Draw text shadow if enabled
      if (style.textShadow) {
        ctx.fillStyle = '#000000'
        ctx.globalAlpha = opacity * 0.5
        ctx.fillText(overlay.text, x + 2, y + 2)
      }
      
      // Draw text
      ctx.fillStyle = style.color
      ctx.globalAlpha = opacity
      ctx.fillText(overlay.text, x, y)
      
      // Draw subtext if present
      if (overlay.subtext) {
        ctx.font = `${style.fontWeight - 100} ${fontSize * 0.7}px ${style.fontFamily}`
        ctx.fillText(overlay.subtext, x, y + fontSize)
      }
    }
    
    // Restore canvas state (resets globalAlpha, font, fillStyle, etc.)
    ctx.restore()
  }
  
  private drawWatermark(watermark: LocalRenderWatermark): void {
    // Use hidden canvas for double-buffer pattern
    const ctx = this.hiddenCtx
    const canvas = this.hiddenCanvas
    if (!ctx || !canvas) {
      console.warn('[LocalRender] drawWatermark: no hidden canvas context')
      return
    }
    
    // Save canvas state to ensure proper restoration after drawing
    ctx.save()
    
    // Use content bounds if available, otherwise fall back to canvas dimensions
    // This ensures watermark appears on the actual video content, not black bars
    const bounds = this.contentBounds.width > 0 
      ? this.contentBounds 
      : { x: 0, y: 0, width: canvas.width, height: canvas.height }
    const { anchor, padding, type } = watermark
    
    // Debug: Log watermark drawing (only on first frame to avoid spam)
    if (!this._watermarkLogged) {
      console.log('[LocalRender] Drawing watermark with content bounds:', { 
        canvasSize: { width: canvas.width, height: canvas.height },
        contentBounds: bounds,
        type, anchor, padding, text: watermark.text 
      })
    }
    
    // Calculate position based on anchor WITHIN the content bounds
    let x: number
    let y: number
    
    // Horizontal position - relative to content bounds
    if (anchor.includes('left')) {
      x = bounds.x + padding
    } else if (anchor.includes('right')) {
      x = bounds.x + bounds.width - padding
    } else {
      x = bounds.x + bounds.width / 2 // center within content
    }
    
    // Vertical position - relative to content bounds
    if (anchor.includes('top')) {
      y = bounds.y + padding
    } else if (anchor.includes('bottom')) {
      y = bounds.y + bounds.height - padding
    } else {
      y = bounds.y + bounds.height / 2 // center within content
    }
    
    if (type === 'text' && watermark.text) {
      const { textStyle } = watermark
      // Use content bounds height for font size calculation (not canvas height)
      const fontSize = (textStyle.fontSize / 100) * bounds.height
      
      // Set font with fallback to system fonts (ensures text renders even if custom font fails)
      const fontFamily = `"${textStyle.fontFamily}", Arial, Helvetica, sans-serif`
      ctx.font = `${textStyle.fontWeight} ${fontSize}px ${fontFamily}`
      ctx.globalAlpha = textStyle.opacity
      
      // Enhanced diagnostic logging (first frame only)
      if (!this._watermarkLogged) {
        console.log('[LocalRender] Watermark text details:', {
          text: watermark.text,
          position: { x, y },
          fontSize: `${fontSize}px (${textStyle.fontSize}% of ${bounds.height}px content height)`,
          font: ctx.font,
          color: textStyle.color,
          opacity: textStyle.opacity,
          anchor,
          contentBounds: bounds,
        })
        this._watermarkLogged = true
      }
      
      // Set text alignment based on anchor
      if (anchor.includes('left')) {
        ctx.textAlign = 'left'
      } else if (anchor.includes('right')) {
        ctx.textAlign = 'right'
      } else {
        ctx.textAlign = 'center'
      }
      
      // Set baseline based on vertical anchor
      if (anchor.includes('top')) {
        ctx.textBaseline = 'top'
      } else if (anchor.includes('bottom')) {
        ctx.textBaseline = 'bottom'
      } else {
        ctx.textBaseline = 'middle'
      }
      
      // Draw text shadow if enabled
      if (textStyle.textShadow) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillText(watermark.text, x + 2, y + 2)
      }
      
      // Draw text
      ctx.fillStyle = textStyle.color
      ctx.fillText(watermark.text, x, y)
      
      // Diagnostic: Verify fillText was called (first frame only)
      if (!this._watermarkLogged) {
        console.log('[LocalRender] Watermark fillText completed:', {
          fillStyle: ctx.fillStyle,
          textAlign: ctx.textAlign,
          textBaseline: ctx.textBaseline,
          globalAlpha: ctx.globalAlpha,
        })
      }
    } else if (type === 'image' && this.watermarkImage && this.watermarkImage.complete) {
      // Draw image watermark (preloaded in preloadWatermarkImage)
      const { imageStyle } = watermark
      const img = this.watermarkImage
      
      // Calculate scaled dimensions using content bounds width (not canvas width)
      const targetWidth = (imageStyle.width / 100) * bounds.width
      const aspectRatio = img.naturalHeight / img.naturalWidth
      const targetHeight = targetWidth * aspectRatio
      
      ctx.globalAlpha = imageStyle.opacity
      
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
      
      ctx.drawImage(img, drawX, drawY, targetWidth, targetHeight)
    }
    
    // Restore canvas state (resets globalAlpha, font, fillStyle, textAlign, etc.)
    ctx.restore()
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
    
    if (this.playbackAudioContext && this.playbackAudioContext.state !== 'closed') {
      try {
        this.playbackAudioContext.close()
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
    
    // Clear double-buffer canvases
    this.hiddenCanvas = null
    this.hiddenCtx = null
    this.canvas = null
    this.ctx = null
    this.audioContext = null
    this.playbackAudioContext = null
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
