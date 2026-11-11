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

import { clampWatermarkCropPercent, getFrameCropSourceRect } from './segmentVideoCrop'
import { deliveryFrameSize, type DeliveryAspectRatio } from './renderTypes'
import {
  computeFrameKenBurnsTransform,
  resolveBeatKenBurnsSettings,
  type BeatKenBurnsSettings,
} from '@/lib/storyboard/kenBurnsFrame'

// =============================================================================
// Canvas capture (video/mixed exports)
// =============================================================================

/** Manual frame capture when using canvas.captureStream(0) */
interface CanvasCaptureMediaStreamTrack extends MediaStreamTrack {
  requestFrame(): void
}

/**
 * Compute per-frame scale and pixel translation for a Pre-Vis / animatic still.
 * Supports authored per-beat Ken Burns rects, legacy directional beat Ken Burns,
 * synthesized gallery Ken Burns / lineZoom, and explicit static (`enabled: false`).
 */
export function computeAnimaticStillTransform(
  kenBurns: BeatKenBurnsSettings | undefined,
  progress: number,
  canvasW: number,
  canvasH: number
): { scalePush: number; translateX: number; translateY: number } {
  const p = Math.max(0, Math.min(1, progress))
  const resolvedKb = resolveBeatKenBurnsSettings(kenBurns)
  if (resolvedKb) {
    const kbTransform = computeFrameKenBurnsTransform(resolvedKb, p)
    return {
      scalePush: kbTransform.scale,
      translateX: (kbTransform.translateX / 100) * canvasW,
      translateY: (kbTransform.translateY / 100) * canvasH,
    }
  }
  if (kenBurns && kenBurns.enabled === false) {
    return { scalePush: 1, translateX: 0, translateY: 0 }
  }
  return {
    scalePush: 1 + p * 0.02,
    translateX: 0,
    translateY: 0,
  }
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
  /** Uniform frame crop % (2–10) for uploaded video; preserves aspect ratio */
  watermarkCropPercent?: number
  /** Seconds into source MP4 where beat playback begins */
  videoTrimInSec?: number
  /** Seconds into source MP4 where beat playback ends */
  videoTrimOutSec?: number
  /** Picture speed for this language version. 1 leaves source time unchanged. */
  playbackRate?: number
  /** Optional authored or synthesized Ken Burns viewport transform (Pre-Vis beat stills). */
  kenBurns?: BeatKenBurnsSettings
  /** Optional fade-in from black in seconds (Pre-Vis beat/scene transitionIn === 'fade'). */
  fadeInSec?: number
  /** Optional fade-out to black in seconds (Pre-Vis beat/scene transitionOut === 'fade'). */
  fadeOutSec?: number
  /** Optional crossfade/dissolve in from previous still segment in seconds. */
  dissolveInSec?: number
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
  /** 1 = normal; dialogue / music time-stretch */
  playbackRate?: number
  /** Music: repeat clip for clip duration */
  loop?: boolean
  /** Music: fade-in seconds */
  fadeInSec?: number
  /** Music: fade-out seconds */
  fadeOutSec?: number
  /** Offset into the source file so a later shot continues the cue. */
  trimStart?: number
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

/** Output size for canvas + encoder bitrate selection */
export type LocalRenderResolution = '720p' | '1080p' | '4K'

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
  resolution: LocalRenderResolution
  /** Delivery frame. Omitted stays 16:9. */
  aspectRatio?: DeliveryAspectRatio
  /**
   * contain fits the picture and pads. cover is the historical crop-to-fill default.
   * Package & Ship passes contain so a 16:9 clip can land in a 9:16 frame without cropping the story.
   */
  frameFit?: 'cover' | 'contain'
  /** Frames per second */
  fps: number
  /** Total duration in seconds */
  totalDuration: number
  /**
   * Browser container: `mp4` prefers H.264/AAC via MediaRecorder when supported; otherwise WebM.
   * Default `webm` preserves legacy scene-mixer behavior when omitted.
   */
  exportFormat?: 'mp4' | 'webm'
  /**
   * When true, each segment's `duration` is treated as authoritative (e.g. probed local files).
   * Skips extending segments using `HTMLVideoElement.duration`, which is often inflated vs real
   * media length and causes multi-minute slow / frozen video with normal-length audio.
   */
  trustSegmentDurations?: boolean
  /**
   * When true, silent compositions (zero audio clips / video audio) still attach a silent
   * stereo audio track so every rendered scene shares an identical 2-stream (video + audio)
   * container layout for lossless FFmpeg `-c copy` concatenation.
   */
  ensureAudioTrack?: boolean
  /**
   * Optional override for `LOCAL_RENDER_MAX_DURATION` (default 300s), used by multi-scene
   * Pre-Vis local fallback when server stitching is unavailable.
   */
  maxDurationSec?: number
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
  /** Optional status message */
  message?: string
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
  /** mp4 vs webm actually used (may differ from requested if browser lacks MP4 recorder) */
  containerUsed?: 'mp4' | 'webm'
  /** Duration in seconds */
  duration?: number
  /** Error message if failed */
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

/** Max duration for local rendering (seconds) - supports longer user uploads */
export const LOCAL_RENDER_MAX_DURATION = 300

/** Max resolution for local rendering */
export const LOCAL_RENDER_MAX_RESOLUTION: LocalRenderResolution = '4K'

function videoBitrateForResolution(resolution: LocalRenderResolution): number {
  if (resolution === '4K') return 24_000_000
  if (resolution === '1080p') return 8_000_000
  return 5_000_000
}

const WEBM_RECORDER_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const

const MP4_RECORDER_WITH_AUDIO = [
  'video/mp4;codecs=avc1.640029,mp4a.40.2',
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264,aac',
  'video/mp4',
] as const

const MP4_RECORDER_VIDEO_ONLY = [
  'video/mp4;codecs=avc1.640029',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
] as const

function firstSupportedMime(candidates: readonly string[]): string | null {
  if (typeof window === 'undefined' || !window.MediaRecorder) return null
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return null
}

/**
 * Pick a MediaRecorder mime type for the requested browser container.
 */
export function getMediaRecorderMimeTypeForExport(
  format: 'mp4' | 'webm',
  hasAudio: boolean
): string | null {
  if (format === 'mp4') {
    const withA = firstSupportedMime(MP4_RECORDER_WITH_AUDIO)
    if (hasAudio && withA) return withA
    const vo = firstSupportedMime(MP4_RECORDER_VIDEO_ONLY)
    if (vo) return vo
    return firstSupportedMime(WEBM_RECORDER_TYPES)
  }
  return firstSupportedMime(WEBM_RECORDER_TYPES) ?? firstSupportedMime(MP4_RECORDER_WITH_AUDIO)
}

/** True if this browser can record MP4 (H.264) with MediaRecorder */
export function isMp4MediaRecorderSupported(): boolean {
  return (
    firstSupportedMime(MP4_RECORDER_WITH_AUDIO) != null ||
    firstSupportedMime(MP4_RECORDER_VIDEO_ONLY) != null
  )
}

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
  return (
    getMediaRecorderMimeTypeForExport('webm', true) ??
    getMediaRecorderMimeTypeForExport('mp4', true)
  )
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

/** Per-segment cap so a hung URL fails fast instead of blocking export indefinitely */
const VIDEO_PRELOAD_TIMEOUT_MS = 180_000

/**
 * Resolve when the element can provide a decodable video frame, or reject on error/timeout.
 * Relying only on `loadeddata` hangs when many `<video>` elements load in parallel (connection limits)
 * or when some browsers omit that event for certain encodings.
 */
function waitForVideoPreload(
  video: HTMLVideoElement,
  segmentId: string,
  assetUrl: string,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    let abortListener: (() => void) | null = null

    const cleanup = () => {
      clearTimeout(timer)
      video.removeEventListener('loadeddata', onLoadedData)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('progress', onProgress)
      video.removeEventListener('error', onError)
      video.removeEventListener('stalled', onStalled)
      if (abortListener) signal.removeEventListener('abort', abortListener)
    }

    const finish = (ok: boolean, err?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (ok) resolve()
      else reject(err ?? new Error(`Video preload failed: ${segmentId}`))
    }

    const tryResolveIfPlayable = (): boolean => {
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        console.log(
          '[LocalRender] Video loaded:',
          segmentId,
          video.videoWidth,
          'x',
          video.videoHeight
        )
        finish(true)
        return true
      }
      return false
    }

    const onLoadedData = () => {
      if (!tryResolveIfPlayable()) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          console.log(
            '[LocalRender] Video loaded:',
            segmentId,
            video.videoWidth,
            'x',
            video.videoHeight
          )
          finish(true)
        }
      }
    }

    const onCanPlay = () => {
      tryResolveIfPlayable()
    }

    const onLoadedMetadata = () => {
      tryResolveIfPlayable()
    }

    const onProgress = () => {
      tryResolveIfPlayable()
    }

    const onError = () => {
      const code = video.error?.code ?? '?'
      const message = video.error?.message ?? ''
      console.error(
        '[LocalRender] Video load failed:',
        segmentId,
        'code',
        code,
        message,
        assetUrl?.slice(0, 120)
      )
      finish(
        false,
        new Error(
          `Failed to load video ${segmentId} (media error ${code}). Check the file URL and CORS.`
        )
      )
    }

    const onStalled = () => {
      console.warn('[LocalRender] Video stalled (slow network?):', segmentId)
    }

    video.addEventListener('loadeddata', onLoadedData)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('progress', onProgress)
    video.addEventListener('error', onError)
    video.addEventListener('stalled', onStalled)

    const timer = setTimeout(() => {
      console.error(
        '[LocalRender] Video preload timeout:',
        segmentId,
        'readyState=',
        video.readyState,
        'networkState=',
        video.networkState,
        assetUrl?.slice(0, 100)
      )
      finish(
        false,
        new Error(
          `Timed out loading video (${Math.round(VIDEO_PRELOAD_TIMEOUT_MS / 1000)}s): ${segmentId}. ` +
            'Your connection may be slow or too many clips are loading at once — try again or export fewer segments.'
        )
      )
    }, VIDEO_PRELOAD_TIMEOUT_MS)

    abortListener = () => {
      finish(false, new DOMException('Aborted', 'AbortError'))
    }
    if (signal.aborted) {
      finish(false, new DOMException('Aborted', 'AbortError'))
      return
    }
    signal.addEventListener('abort', abortListener)

    video.src = assetUrl
    queueMicrotask(() => tryResolveIfPlayable())
  })
}

// =============================================================================
// Music clip scheduling (loop + fade + speed)
// =============================================================================

function clampRenderPlaybackRate(rate: number | undefined): number {
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return 1
  return Math.min(1.5, Math.max(0.5, rate))
}

function applyMusicGainEnvelope(
  gain: GainNode,
  clipStart: number,
  clipDuration: number,
  volume: number,
  fadeInSec: number,
  fadeOutSec: number
): void {
  const t0 = clipStart
  const tEnd = clipStart + clipDuration
  const fi = Math.max(0, Math.min(fadeInSec, clipDuration / 2))
  const fo = Math.max(0, Math.min(fadeOutSec, clipDuration / 2))

  if (fi > 0) {
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(volume, t0 + fi)
  } else {
    gain.gain.setValueAtTime(volume, t0)
  }

  if (fo > 0 && clipDuration > fo) {
    gain.gain.setValueAtTime(volume, tEnd - fo)
    gain.gain.linearRampToValueAtTime(0, tEnd)
  } else if (fo > 0) {
    gain.gain.linearRampToValueAtTime(0, tEnd)
  }
}

function scheduleMusicClipInContext(
  ctx: BaseAudioContext,
  clip: LocalRenderAudioClip,
  buffer: AudioBuffer,
  destination: AudioNode,
  compositionDuration: number
): void {
  const rate = clampRenderPlaybackRate(clip.playbackRate)
  const loop = clip.loop !== false
  const fadeIn = Math.max(0, clip.fadeInSec ?? 0)
  const fadeOut = Math.max(0, clip.fadeOutSec ?? 0)
  const clipStart = Math.max(0, clip.startTime)
  const clipDuration = Math.min(clip.duration, Math.max(0, compositionDuration - clipStart))
  if (clipDuration <= 0) return

  const masterGain = ctx.createGain()
  applyMusicGainEnvelope(masterGain, clipStart, clipDuration, clip.volume, fadeIn, fadeOut)
  masterGain.connect(destination)

  const trim = Math.max(0, clip.trimStart ?? 0)
  let cursor = 0
  let fileOffset = trim
  let guard = 0
  do {
    const remainingWall = clipDuration - cursor
    if (remainingWall <= 0.001) break
    const offset =
      buffer.duration > 0
        ? ((fileOffset % buffer.duration) + buffer.duration) % buffer.duration
        : 0
    const availableSrc = buffer.duration - offset
    if (availableSrc <= 0.001) {
      fileOffset = 0
      guard += 1
      if (!loop || guard > 8) break
      continue
    }
    const playSrc = loop ? availableSrc : Math.min(availableSrc, remainingWall * rate)
    const playWall = Math.min(playSrc / rate, remainingWall)
    if (playWall <= 0.001) break

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    source.connect(masterGain)
    source.start(clipStart + cursor, offset, Math.min(playSrc, playWall * rate))

    cursor += playWall
    fileOffset += playWall * rate
    guard += 1
    if (!loop) break
  } while (cursor < clipDuration - 0.001 && guard < 10000)
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
  private activeCaptureStream: MediaStream | null = null
  private activeAudioDestStream: MediaStream | null = null
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

  cancel(): void {
    this.abort()
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
    
    const maxDurationLimit =
      typeof config.maxDurationSec === 'number' && Number.isFinite(config.maxDurationSec) && config.maxDurationSec > 0
        ? config.maxDurationSec
        : LOCAL_RENDER_MAX_DURATION
    if (config.totalDuration > maxDurationLimit) {
      return { 
        success: false, 
        error: `Duration exceeds local render limit (${maxDurationLimit}s). Use server rendering for longer videos.` 
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
      const { width, height } = deliveryFrameSize(config.resolution, config.aspectRatio ?? '16:9')
      
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
      
      // Segment duration adjustment:
      // - Local file stitch: trust probed durations (trustSegmentDurations) — do not extend from
      //   video.duration, which often lies (VFR / bad moov) and yields 5–10× long exports with
      //   normal-speed audio from decodeAudioData.
      // - Otherwise: only shrink when the file is shorter than the timeline; never extend when
      //   video.duration is much longer than segment.duration (same inflated-metadata issue).
      let adjustedTotalDuration = 0
      const trustSeg = config.trustSegmentDurations === true
      const adjustedSegments = config.segments.map((segment) => {
        const asset = assets.get(segment.segmentId)
        let actualDuration = segment.duration

        if (!trustSeg && asset instanceof HTMLVideoElement && isFinite(asset.duration) && asset.duration > 0) {
          const vd = asset.duration
          const sd = segment.duration
          if (vd + 0.05 < sd) {
            console.log(
              `[LocalRender] Segment ${segment.segmentId}: shortening duration from ${sd}s to ${vd}s (video shorter than timeline)`
            )
            actualDuration = vd
          } else if (sd > 0.25 && vd > sd * 2) {
            console.warn(
              `[LocalRender] Segment ${segment.segmentId}: ignoring inflated video.duration ${vd}s vs timeline ${sd}s — keeping timeline length`
            )
            actualDuration = sd
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
      
      // For video segments, end the rendered video at the end of the video clips (adjustedTotalDuration).
      // Only image-only animatic renders extend composition length to config.totalDuration.
      const allSegmentsAreImages =
        adjustedSegments.length > 0 &&
        adjustedSegments.every((s) => s.assetType === 'image')
      const compositionDuration =
        !allSegmentsAreImages && adjustedTotalDuration > 0
          ? adjustedTotalDuration
          : Math.max(adjustedTotalDuration, config.totalDuration)

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
      const exportFormat = adjustedConfig.exportFormat ?? 'webm'
      // Image-only: timed captureStream(fps) so VP9 gets steady samples (avoids single-frame WebM).
      // Video/mixed: captureStream(0) + requestFrame() once per *composition* frame only.
      // Timed captureStream(fps) on video runs for the whole wall-clock render; the browser keeps
      // sampling at fps while the loop only updates the canvas ~totalFrames times → thousands of
      // duplicate timeline ticks → multi-minute file with slow-motion picture vs ~48s audio.
      const captureFps = Math.min(60, Math.max(1, Math.round(adjustedConfig.fps)))
      const stream = allSegmentsAreImages
        ? this.canvas.captureStream(captureFps)
        : this.canvas.captureStream(0)
      this.activeCaptureStream = stream
      const canvasVideoTrack = !allSegmentsAreImages
        ? (stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined)
        : undefined
      console.log(
        allSegmentsAreImages
          ? `[LocalRender] captureStream(${captureFps}) — image animatic`
          : '[LocalRender] captureStream(0) + requestFrame — one sample per composition frame'
      )
      
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

            if (clip.type === 'music') {
              scheduleMusicClipInContext(
                offlineCtx,
                clip,
                buffer,
                offlineCtx.destination,
                adjustedConfig.totalDuration
              )
              return
            }
            
            const source = offlineCtx.createBufferSource()
            source.buffer = buffer
            const rate =
              clip.playbackRate != null &&
              Number.isFinite(clip.playbackRate) &&
              clip.playbackRate > 0
                ? Math.min(1.5, Math.max(0.5, clip.playbackRate))
                : 1
            source.playbackRate.value = rate
            
            const gainNode = offlineCtx.createGain()
            gainNode.gain.value = clip.volume
            
            source.connect(gainNode)
            gainNode.connect(offlineCtx.destination)
            
            // Schedule at the correct time offset within the composition
            const startTime = Math.max(0, clip.startTime)
            const maxDuration = Math.max(0, adjustedConfig.totalDuration - startTime)
            const srcLen = Math.min(clip.duration, buffer.duration)
            source.start(startTime, 0, Math.min(srcLen, maxDuration * rate))
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
              
              // Schedule at the segment's start time (respect source trim window)
              const trimIn = segment.videoTrimInSec ?? 0
              const rate =
                segment.playbackRate != null &&
                Number.isFinite(segment.playbackRate) &&
                segment.playbackRate > 0
                  ? Math.min(1.5, Math.max(0.5, segment.playbackRate))
                  : 1
              source.playbackRate.value = rate
              const sourceSpan =
                segment.videoTrimOutSec != null
                  ? Math.max(0, segment.videoTrimOutSec - trimIn)
                  : segment.duration * rate
              source.start(segment.startTime, trimIn, sourceSpan)
              
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
      
      if (!preRenderedAudioBuffer && adjustedConfig.ensureAudioTrack && this.audioContext) {
        try {
          preRenderedAudioBuffer = this.audioContext.createBuffer(
            2,
            Math.max(1, totalSamples),
            sampleRate
          )
          console.log('[LocalRender] Synthesized silent stereo audio buffer for stream parity:', {
            duration: preRenderedAudioBuffer.duration,
            channels: preRenderedAudioBuffer.numberOfChannels,
            sampleRate: preRenderedAudioBuffer.sampleRate,
          })
        } catch (silentAudioError) {
          console.warn('[LocalRender] Could not create silent audio buffer:', silentAudioError)
        }
      }

      // Create audio track for recorder only when we actually have pre-rendered audio.
      // Attaching an empty audio track can cause some browsers to emit zero chunks.
      let audioDestination: MediaStreamAudioDestinationNode | null = null
      if (preRenderedAudioBuffer) {
        const playbackAudioContext = new AudioContextClass()
        this.playbackAudioContext = playbackAudioContext
        if (playbackAudioContext.state === 'suspended') {
          await playbackAudioContext.resume().catch(() => {})
        }
        audioDestination = playbackAudioContext.createMediaStreamDestination()
        this.activeAudioDestStream = audioDestination.stream
        const audioTrack = audioDestination.stream.getAudioTracks()[0]
        if (audioTrack) {
          stream.addTrack(audioTrack)
        }
      }
      const hasAudioTrack = stream.getAudioTracks().length > 0
      let mimeType = getMediaRecorderMimeTypeForExport(exportFormat, hasAudioTrack)
      if (!mimeType) {
        throw new Error('No supported MediaRecorder MIME type in this browser')
      }
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
      const containerUsed: 'mp4' | 'webm' = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
      if (exportFormat === 'mp4' && containerUsed === 'webm') {
        console.warn('[LocalRender] MP4 MediaRecorder not available; encoded WebM instead')
      }

      this.recordedChunks = []
      const videoBitsPerSecond = videoBitrateForResolution(adjustedConfig.resolution)
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
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
            reject(new Error('MediaRecorder produced 0 bytes of output'))
            return
          }
          const blob = new Blob(this.recordedChunks, { type: mimeType })
          resolve(blob)
        }
        
        this.mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event}`))
        }
      })

      const commitCompositionFrame = async (currentTime: number, verifyFirstFrame: boolean) => {
        // === DOUBLE-BUFFER PATTERN ===
        // All drawing happens on hiddenCtx first, then atomically copied to output
        // This fixes race conditions where captureStream captures incomplete frames
        await this.drawFrame(currentTime, adjustedConfig, assets)

        if (adjustedConfig.textOverlays) {
          this.drawTextOverlays(currentTime, adjustedConfig.textOverlays)
        }

        if (adjustedConfig.watermark) {
          this.drawWatermark(adjustedConfig.watermark)
        }

        if (this.ctx && this.hiddenCanvas) {
          this.ctx.drawImage(this.hiddenCanvas, 0, 0)

          // Force GPU flush on frame 0 and on video-seek renders; skip per-frame GPU readback
          // stalls on subsequent image-animatic frames so real-time 30fps pacing stays smooth.
          if (verifyFirstFrame || !allSegmentsAreImages) {
            this.ctx.getImageData(0, 0, 1, 1)
          }

          if (verifyFirstFrame && adjustedConfig.watermark && this.canvas) {
            const { width: cw, height: ch } = this.canvas
            const sampleX = Math.max(0, cw - 200)
            const sampleY = Math.max(0, ch - 100)
            const sampleData = this.ctx.getImageData(sampleX, sampleY, 100, 50)
            let nonTransparentPixels = 0
            for (let i = 0; i < sampleData.data.length; i += 4) {
              if (
                sampleData.data[i] > 10 ||
                sampleData.data[i + 1] > 10 ||
                sampleData.data[i + 2] > 10
              ) {
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
      }

      // Render frames
      const totalFrames = Math.max(1, Math.ceil(adjustedConfig.totalDuration * adjustedConfig.fps))
      const frameDuration = 1000 / adjustedConfig.fps

      console.log('[LocalRender] Starting render:', {
        totalDuration: adjustedConfig.totalDuration,
        fps: adjustedConfig.fps,
        totalFrames,
        frameDuration,
        segmentCount: adjustedConfig.segments.length,
        segments: adjustedConfig.segments.map((s) => ({
          id: s.segmentId,
          startTime: s.startTime,
          duration: s.duration,
          assetType: s.assetType,
          assetUrl: s.assetUrl?.substring(0, 50) + '...',
        })),
      })

      // Paint frame t = 0 onto the output canvas BEFORE starting MediaRecorder or audio playback
      // so the video encoder receives an immediate valid keyframe at t = 0 with zero blank lead-in.
      await commitCompositionFrame(0, true)

      this.mediaRecorder.start(100) // Capture every 100ms
      if (!allSegmentsAreImages && canvasVideoTrack && 'requestFrame' in canvasVideoTrack) {
        canvasVideoTrack.requestFrame()
      }

      let hasLiveAudioPlayback = false
      let audioStartCtxTime = 0
      if (preRenderedAudioBuffer && audioDestination && this.playbackAudioContext) {
        const audioSource = this.playbackAudioContext.createBufferSource()
        audioSource.buffer = preRenderedAudioBuffer
        audioSource.connect(audioDestination)
        audioStartCtxTime = this.playbackAudioContext.currentTime
        audioSource.start(0)
        hasLiveAudioPlayback = true
        console.log('[LocalRender] Pre-rendered audio playback started')
      }
      const renderStartWallMs =
        typeof performance !== 'undefined' ? performance.now() : Date.now()

      onProgress?.({
        phase: 'rendering',
        progress: 40,
        currentFrame: 0,
        totalFrames,
      })

      if (allSegmentsAreImages) {
        // Real-time audio-clock-anchored loop for image animatics:
        // Keeps Ken Burns motion, beat cuts, and captions 100% locked to real-time audio even
        // when browser timers coalesce or throttle, preventing +3-6s slow-motion tail drift.
        const getElapsedCompositionSec = (): number => {
          const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now()
          const wallSec = Math.max(0, (nowMs - renderStartWallMs) / 1000)
          if (
            hasLiveAudioPlayback &&
            this.playbackAudioContext &&
            this.playbackAudioContext.state === 'running'
          ) {
            const audioSec = this.playbackAudioContext.currentTime - audioStartCtxTime
            if (Number.isFinite(audioSec) && audioSec >= 0 && wallSec - audioSec < 1.5) {
              return audioSec
            }
          }
          return wallSec
        }

        let lastRenderedFrame = 0
        while (true) {
          if (signal.aborted) {
            this.mediaRecorder.stop()
            throw new Error('Render aborted')
          }

          const elapsedSec = getElapsedCompositionSec()
          if (elapsedSec >= adjustedConfig.totalDuration) {
            break
          }

          const targetFrame = Math.min(
            totalFrames - 1,
            Math.floor(elapsedSec * adjustedConfig.fps)
          )
          if (targetFrame > lastRenderedFrame) {
            await commitCompositionFrame(elapsedSec, false)
            lastRenderedFrame = targetFrame

            const progress = 40 + Math.round(((targetFrame + 1) / totalFrames) * 50)
            onProgress?.({
              phase: 'rendering',
              progress,
              currentFrame: targetFrame,
              totalFrames,
            })
          }

          const afterDrawSec = getElapsedCompositionSec()
          const nextTickSec = Math.min(
            adjustedConfig.totalDuration,
            (Math.max(lastRenderedFrame, targetFrame) + 1) / adjustedConfig.fps
          )
          const waitMs = Math.max(2, (nextTickSec - afterDrawSec) * 1000)
          await this.sleep(waitMs, signal)
        }

        // Commit final closing frame right before stopping recorder
        await commitCompositionFrame(Math.max(0, adjustedConfig.totalDuration - 1e-3), false)
        onProgress?.({ phase: 'encoding', progress: 95 })
        await this.sleep(Math.min(120, Math.max(40, frameDuration * 1.5)), signal)
        this.mediaRecorder.stop()
      } else {
        for (let frame = 1; frame < totalFrames; frame++) {
          if (signal.aborted) {
            this.mediaRecorder.stop()
            throw new Error('Render aborted')
          }

          const iterStart = typeof performance !== 'undefined' ? performance.now() : 0
          const currentTime = frame / adjustedConfig.fps

          await commitCompositionFrame(currentTime, false)
          await new Promise((resolve) => setTimeout(resolve, 0))

          if (canvasVideoTrack && 'requestFrame' in canvasVideoTrack) {
            canvasVideoTrack.requestFrame()
          }

          const progress = 40 + Math.round((frame / totalFrames) * 50)
          onProgress?.({
            phase: 'rendering',
            progress,
            currentFrame: frame,
            totalFrames,
          })

          const elapsed =
            typeof performance !== 'undefined' ? performance.now() - iterStart : 0
          if (elapsed > frameDuration * 1.35) {
            console.warn(
              `[LocalRender] Frame ${frame} took ${elapsed.toFixed(0)}ms (budget ${frameDuration.toFixed(0)}ms) — export may drift; lower resolution or fps if A/V desyncs`
            )
          }
          const wait = Math.max(0, frameDuration - elapsed)
          await this.sleep(wait, signal)
        }

        // Stop recording
        onProgress?.({ phase: 'encoding', progress: 95 })
        if (canvasVideoTrack && 'requestFrame' in canvasVideoTrack) {
          canvasVideoTrack.requestFrame()
        }
        await this.sleep(Math.max(150, frameDuration * 2), signal)
        this.mediaRecorder.stop()
      }
      
      // Wait for blob
      const blob = await recordingPromise
      const blobUrl = URL.createObjectURL(blob)
      
      onProgress?.({ phase: 'complete', progress: 100 })
      
      return {
        success: true,
        blobUrl,
        blob,
        mimeType,
        containerUsed,
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

    console.log(
      '[LocalRender] Preloading assets for',
      segments.length,
      'segments:',
      segments.map((s) => ({ id: s.segmentId, type: s.assetType, url: s.assetUrl?.substring(0, 80) }))
    )

    const videoSegments = segments.filter((s) => s.assetType === 'video')
    const imageSegments = segments.filter((s) => s.assetType === 'image')

    // Fewer parallel video fetches avoids silent stalls when the browser limits connections per host.
    const VIDEO_LOAD_CONCURRENCY = 4
    for (let i = 0; i < videoSegments.length; i += VIDEO_LOAD_CONCURRENCY) {
      if (signal.aborted) break
      const batch = videoSegments.slice(i, i + VIDEO_LOAD_CONCURRENCY)
      await Promise.all(
        batch.map(async (segment) => {
          if (signal.aborted) return
          console.log('[LocalRender] Loading video asset:', segment.segmentId)
          const video = document.createElement('video')
          video.crossOrigin = 'anonymous'
          video.preload = 'auto'
          video.muted = true
          video.playsInline = true
          video.setAttribute('playsinline', '')
          await waitForVideoPreload(video, segment.segmentId, segment.assetUrl, signal)
          assets.set(segment.segmentId, video)
        })
      )
    }

    const IMAGE_LOAD_CONCURRENCY = 8
    const IMAGE_LOAD_TIMEOUT_MS = 30_000
    const imagePromiseCache = new Map<string, Promise<HTMLImageElement>>()

    const loadSingleImageAttempt = (srcUrl: string, label: string): Promise<HTMLImageElement> =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error('Render aborted'))
          return
        }
        const img = new Image()
        img.crossOrigin = 'anonymous'
        let settled = false

        const cleanupListeners = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', onAbort)
          img.onload = null
          img.onerror = null
        }

        const onAbort = () => {
          if (settled) return
          settled = true
          cleanupListeners()
          img.src = ''
          reject(new Error('Render aborted'))
        }

        const timer = setTimeout(() => {
          if (settled) return
          settled = true
          cleanupListeners()
          img.src = ''
          reject(new Error(`Image load timed out (${label}): ${srcUrl}`))
        }, IMAGE_LOAD_TIMEOUT_MS)

        signal.addEventListener('abort', onAbort, { once: true })

        img.onload = () => {
          if (settled) return
          settled = true
          cleanupListeners()
          const finish = () => {
            console.log('[LocalRender] Image loaded:', label, img.width, 'x', img.height)
            resolve(img)
          }
          if (typeof img.decode === 'function') {
            img.decode().then(finish, finish)
          } else {
            finish()
          }
        }

        img.onerror = (e) => {
          if (settled) return
          settled = true
          cleanupListeners()
          console.warn('[LocalRender] Image load attempt failed:', label, e)
          reject(new Error(`Failed to load image: ${srcUrl}`))
        }

        img.src = srcUrl
      })

    const loadCachedImage = (url: string, label: string, optional: boolean): Promise<HTMLImageElement | null> => {
      let cached = imagePromiseCache.get(url)
      if (!cached) {
        cached = loadSingleImageAttempt(url, label).catch(async (primaryErr) => {
          if (signal.aborted) {
            imagePromiseCache.delete(url)
            throw primaryErr
          }
          // Recover from GCS CORS issues via same-origin proxy, or bypass poisoned non-CORS
          // browser cache entries (when an <img> rendered the same URL without crossOrigin).
          try {
            if (
              !url.startsWith('/api/proxy/image') &&
              (url.includes('storage.googleapis.com') || url.includes('storage.cloud.google.com'))
            ) {
              const proxiedUrl = `/api/proxy/image?url=${encodeURIComponent(url)}`
              return await loadSingleImageAttempt(proxiedUrl, `${label} (proxy)`)
            }
            if (url.startsWith('https://')) {
              const sep = url.includes('?') ? '&' : '?'
              return await loadSingleImageAttempt(`${url}${sep}_cors=1`, `${label} (cors-retry)`)
            }
          } catch {
            // Fall through to reject with primary error
          }
          imagePromiseCache.delete(url)
          throw primaryErr
        })
        imagePromiseCache.set(url, cached)
      }
      if (optional) {
        return cached.catch(() => {
          console.warn('[LocalRender] End frame failed, using start-only:', label)
          return null
        })
      }
      return cached
    }

    for (let i = 0; i < imageSegments.length; i += IMAGE_LOAD_CONCURRENCY) {
      if (signal.aborted) break
      const batch = imageSegments.slice(i, i + IMAGE_LOAD_CONCURRENCY)
      await Promise.all(
        batch.map(async (segment) => {
          if (signal.aborted) return

          console.log('[LocalRender] Loading image asset:', segment.segmentId)
          const img = await loadCachedImage(segment.assetUrl, segment.segmentId, false)
          if (img) {
            assets.set(segment.segmentId, img)
          }

          if (segment.endFrameUrl && segment.endFrameUrl !== segment.assetUrl) {
            const endKey = `${segment.segmentId}__end`
            const endImg = await loadCachedImage(segment.endFrameUrl, endKey, true)
            if (endImg && endImg.complete && endImg.naturalWidth > 0) {
              assets.set(endKey, endImg)
            }
          }
        })
      )
    }

    return assets
  }
  
  private async preloadAudio(
    clips: LocalRenderAudioClip[],
    signal: AbortSignal
  ): Promise<Map<string, AudioBuffer>> {
    const buffers = new Map<string, AudioBuffer>()
    
    if (!this.audioContext || clips.length === 0) return buffers
    
    const AUDIO_LOAD_CONCURRENCY = 6
    const decodedByUrl = new Map<string, Promise<AudioBuffer | null>>()
    const loadAudioByUrl = (url: string): Promise<AudioBuffer | null> => {
      let existing = decodedByUrl.get(url)
      if (!existing) {
        existing = (async () => {
          try {
            const response = await fetch(url, { signal })
            const arrayBuffer = await response.arrayBuffer()
            return await this.audioContext!.decodeAudioData(arrayBuffer)
          } catch (error) {
            console.warn(`Failed to load audio clip: ${url}`, error)
            return null
          }
        })()
        decodedByUrl.set(url, existing)
      }
      return existing
    }

    for (let i = 0; i < clips.length; i += AUDIO_LOAD_CONCURRENCY) {
      if (signal.aborted) break
      const batch = clips.slice(i, i + AUDIO_LOAD_CONCURRENCY)
      await Promise.all(
        batch.map(async (clip, offset) => {
          if (signal.aborted) return
          const index = i + offset
          const audioBuffer = await loadAudioByUrl(clip.url)
          if (audioBuffer) {
            buffers.set(`${clip.type}-${index}`, audioBuffer)
          }
        })
      )
    }
    
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

      if (clip.type === 'music') {
        scheduleMusicClipInContext(
          this.audioContext!,
          clip,
          buffer,
          destination,
          Math.max(
            ...clips.map((c) => c.startTime + c.duration),
            clip.startTime + clip.duration
          )
        )
        return
      }
      
      const source = this.audioContext!.createBufferSource()
      source.buffer = buffer
      const rate =
        clip.playbackRate != null &&
        Number.isFinite(clip.playbackRate) &&
        clip.playbackRate > 0
          ? Math.min(1.5, Math.max(0.5, clip.playbackRate))
          : 1
      source.playbackRate.value = rate
      
      const gainNode = this.audioContext!.createGain()
      gainNode.gain.value = clip.volume
      
      source.connect(gainNode)
      gainNode.connect(destination)
      
      // Schedule playback
      const startTime = this.audioContext!.currentTime + clip.startTime
      const srcLen = Math.min(clip.duration, buffer.duration)
      source.start(startTime, 0, srcLen)
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

    const imageUrl = watermark.imageUrl
    
    console.log('[LocalRender] Preloading watermark image:', imageUrl)
    
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
          reject(new Error(`Failed to load watermark image: ${imageUrl}`))
        }
        
        if (signal.aborted) {
          cleanup()
          reject(new Error('Aborted'))
          return
        }
        
        img.src = imageUrl
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
   * Animatic still crossfade + Ken Burns camera motion (matches Screening Room / ScenePreviewPlayer).
   */
  private drawAnimaticStillPair(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    startImg: HTMLImageElement,
    endImg: HTMLImageElement | undefined,
    progress: number,
    kenBurns?: BeatKenBurnsSettings,
    fadeBlack?: number,
    frameFit: 'cover' | 'contain' = 'cover',
    layerAlpha = 1
  ): void {
    const p = Math.max(0, Math.min(1, progress))
    const { scalePush, translateX, translateY } = computeAnimaticStillTransform(
      kenBurns,
      p,
      canvasW,
      canvasH
    )

    const drawLayer = (img: HTMLImageElement, alpha: number) => {
      if (alpha <= 0) return
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      const aw = img.naturalWidth || img.width
      const ah = img.naturalHeight || img.height
      if (aw <= 0 || ah <= 0) {
        ctx.restore()
        return
      }
      const baseScale =
        frameFit === 'contain'
          ? Math.min(canvasW / aw, canvasH / ah)
          : Math.max(canvasW / aw, canvasH / ah)
      const s = baseScale * scalePush
      const sw = aw * s
      const sh = ah * s
      const x = (canvasW - sw) / 2 + translateX
      const y = (canvasH - sh) / 2 + translateY
      ctx.drawImage(img, x, y, sw, sh)
      ctx.restore()
    }

    const lAlpha = Math.max(0, Math.min(1, layerAlpha))
    if (endImg && endImg.naturalWidth > 0) {
      const endAlpha = lAlpha * p
      const startAlpha = endAlpha >= 1 ? 0 : (lAlpha * (1 - p)) / (1 - endAlpha)
      drawLayer(startImg, startAlpha)
      drawLayer(endImg, endAlpha)
    } else {
      drawLayer(startImg, lAlpha)
    }
    if (fadeBlack && fadeBlack > 0) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, fadeBlack))
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvasW, canvasH)
      ctx.restore()
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
    
    // Debug logging for first frame only (avoid 30Hz serialization overhead during live capture)
    if (currentTime === 0) {
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
      const trimIn = segment.videoTrimInSec ?? 0
      const trimOut =
        segment.videoTrimOutSec ??
        (Number.isFinite(asset.duration) && asset.duration > 0
          ? asset.duration
          : trimIn + segment.duration)
      const rate =
        segment.playbackRate != null &&
        Number.isFinite(segment.playbackRate) &&
        segment.playbackRate > 0
          ? Math.min(1.5, Math.max(0.5, segment.playbackRate))
          : 1
      const localSeek = Math.min(
        Math.max(trimIn + localTime * rate, trimIn),
        Math.max(trimIn, trimOut - 0.001)
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
    const fullWidth = asset instanceof HTMLVideoElement ? asset.videoWidth : asset.width
    const fullHeight = asset instanceof HTMLVideoElement ? asset.videoHeight : asset.height
    const cropPct = clampWatermarkCropPercent(segment.watermarkCropPercent)
    const cropRect =
      asset instanceof HTMLVideoElement && cropPct != null
        ? getFrameCropSourceRect(fullWidth, fullHeight, cropPct)
        : { sx: 0, sy: 0, sw: fullWidth, sh: fullHeight }

    const contentWidth = cropRect.sw
    const contentHeight = cropRect.sh

    const fit = config.frameFit === 'contain' ? 'contain' : 'cover'
    const scale =
      contentWidth > 0 && contentHeight > 0
        ? fit === 'contain'
          ? Math.min(width / contentWidth, height / contentHeight)
          : Math.max(width / contentWidth, height / contentHeight)
        : 1
    const scaledWidth = contentWidth * scale
    const scaledHeight = contentHeight * scale
    const x = (width - scaledWidth) / 2
    const y = (height - scaledHeight) / 2

    this.contentBounds = { x, y, width: scaledWidth, height: scaledHeight }

    if (asset instanceof HTMLVideoElement) {
      ctx.drawImage(asset, cropRect.sx, cropRect.sy, cropRect.sw, cropRect.sh, x, y, scaledWidth, scaledHeight)
    } else {
      const segIdx = segs.indexOf(segment)
      let layerAlpha = 1
      if (
        segIdx > 0 &&
        segment.dissolveInSec &&
        segment.dissolveInSec > 0 &&
        localTime < segment.dissolveInSec
      ) {
        const prevSeg = segs[segIdx - 1]
        const prevAsset = prevSeg ? assets.get(prevSeg.segmentId) : undefined
        if (
          prevSeg &&
          prevAsset &&
          !(prevAsset instanceof HTMLVideoElement) &&
          prevSeg.assetUrl !== segment.assetUrl
        ) {
          const prevEndImg = assets.get(`${prevSeg.segmentId}__end`) as HTMLImageElement | undefined
          this.drawAnimaticStillPair(
            ctx,
            width,
            height,
            prevAsset,
            prevEndImg,
            1,
            prevSeg.kenBurns,
            0,
            fit,
            1
          )
          const rawAlpha = Math.max(0, Math.min(1, localTime / segment.dissolveInSec))
          layerAlpha = rawAlpha * rawAlpha * (3 - 2 * rawAlpha)
        }
      }

      const endImg = assets.get(`${segment.segmentId}__end`) as HTMLImageElement | undefined
      const progress =
        segment.duration > 0 ? Math.max(0, Math.min(1, localTime / segment.duration)) : 0
      const fadeIn =
        segment.fadeInSec && segment.fadeInSec > 0
          ? Math.max(0, 1 - localTime / segment.fadeInSec)
          : 0
      const fadeOut =
        segment.fadeOutSec && segment.fadeOutSec > 0
          ? Math.max(0, 1 - (segment.duration - localTime) / segment.fadeOutSec)
          : 0
      const fadeBlack = Math.min(1, Math.max(fadeIn, fadeOut))
      this.drawAnimaticStillPair(
        ctx,
        width,
        height,
        asset,
        endImg,
        progress,
        segment.kenBurns,
        fadeBlack,
        fit,
        layerAlpha
      )
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
    if (signal?.aborted) {
      return Promise.reject(new Error('Aborted'))
    }
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timeout)
        reject(new Error('Aborted'))
      }
      const timeout = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }, ms)
      signal?.addEventListener('abort', onAbort, { once: true })
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

    if (this.activeCaptureStream) {
      for (const track of this.activeCaptureStream.getTracks()) {
        try {
          track.stop()
        } catch {
          // Ignore
        }
      }
      this.activeCaptureStream = null
    }

    if (this.activeAudioDestStream) {
      for (const track of this.activeAudioDestStream.getTracks()) {
        try {
          track.stop()
        } catch {
          // Ignore
        }
      }
      this.activeAudioDestStream = null
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

export const localRenderService = getLocalRenderService()

export default LocalRenderService
