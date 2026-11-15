/**
 * Video Rendering Types
 * 
 * Shared type definitions for the FFmpeg video rendering pipeline.
 * Used by both the Cloud Run renderer and the Next.js API.
 */

/**
 * Ken Burns effect settings for image animation
 */
export interface KenBurnsViewportRect {
  x: number
  y: number
  width: number
  height: number
}

export interface KenBurnsSettings {
  /** Starting zoom level (1.0 = no zoom, 1.5 = 50% zoom in) */
  zoomStart: number
  /** Ending zoom level */
  zoomEnd: number
  /** Pan X direction (-1 = left, 0 = center, 1 = right) */
  panX: number
  /** Pan Y direction (-1 = up, 0 = center, 1 = down) */
  panY: number
  /** Optional authored pan-from viewport (normalized cover space). */
  startRect?: KenBurnsViewportRect
  /** Optional authored pan-to viewport (normalized cover space). */
  endRect?: KenBurnsViewportRect
  /** Easing curve for viewport interpolation during export. */
  easing?: 'linear' | 'smooth' | 'drift' | 'push' | 'dramatic'
}

/**
 * A video segment (one image with timing and effects)
 */
export interface RenderSegment {
  /** Unique segment ID */
  segmentId: string
  /** URL to the image (GCS or HTTPS) */
  imageUrl: string
  /** Start time in seconds */
  startTime: number
  /** Duration in seconds */
  duration: number
  /** Ken Burns animation settings (optional) */
  kenBurns?: KenBurnsSettings
  /**
   * How this segment arrives from the previous one. Absent means a hard cut,
   * which is what every segment did before the renderer learned `xfade`.
   */
  transitionIn?: 'dissolve' | 'fade'
  /**
   * Seconds of overlap with the previous segment, which the renderer fades
   * across and then reclaims. The previous segment's duration already
   * includes it.
   */
  transitionInSec?: number
}

/**
 * An audio clip with timing
 */
export interface RenderAudioClip {
  /** URL to the audio file (GCS or HTTPS) */
  url: string
  /** Start time in seconds */
  startTime: number
  /** Duration in seconds */
  duration: number
  /** Volume multiplier (0.0 to 1.0, default 1.0) */
  volume?: number
  /** Type of audio (for logging/debugging) */
  type?: 'narration' | 'dialogue' | 'music' | 'sfx'
}

/**
 * Stream type for render jobs
 */
export type RenderStreamType = 'animatic' | 'video'

/**
 * Render type for job categorization
 */
export type RenderType = 
  | 'scene_animatic'    // Single scene animatic (Ken Burns)
  | 'scene_video'       // Single scene AI video
  | 'project_animatic'  // Full project animatic
  | 'project_video'     // Full project video
  | 'project_final'     // Final cut with mixed streams

/**
 * Ken Burns settings for animatic rendering
 */
export interface AnimaticKenBurnsConfig {
  /** Intensity level */
  intensity: 'off' | 'subtle' | 'medium' | 'dramatic'
  /** Transition between segments */
  transitionStyle: 'cut' | 'crossfade' | 'fade-to-black'
  /** Transition duration in seconds */
  transitionDuration: number
}

/**
 * Complete render job specification
 * This is uploaded to GCS as job_spec.json and read by the Cloud Run renderer
 */
export interface RenderJobSpec {
  /** Unique job ID (UUID) */
  jobId: string
  /** SceneFlow project ID */
  projectId: string
  /** Scene ID (for scene-level renders) */
  sceneId?: string
  /** Project title (for metadata) */
  projectTitle: string
  /** Render type */
  renderType: RenderType
  /** Stream type (animatic or video) */
  streamType: RenderStreamType
  /** Output resolution */
  resolution: '720p' | '1080p' | '4K'
  /** Frames per second */
  fps: number
  /** Video segments (images with Ken Burns) */
  segments: RenderSegment[]
  /** Audio clips with timing */
  audioClips: RenderAudioClip[]
  /** GCS path for output video (gs://bucket/path) */
  outputPath: string
  /** Optional callback URL for status updates */
  callbackUrl?: string
  /** Job creation timestamp (ISO 8601) */
  createdAt: string
  /** Language code (for logging) */
  language?: string
  /** Include subtitles in video (future feature) */
  includeSubtitles?: boolean
  /** Ken Burns configuration (for animatic renders) */
  kenBurnsConfig?: AnimaticKenBurnsConfig
}

/**
 * Render job status
 */
export type RenderJobStatus = 
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

/**
 * Render job record (stored in database)
 */
export interface RenderJobRecord {
  /** Unique job ID */
  id: string
  /** SceneFlow project ID */
  projectId: string
  /** Scene ID (for scene-level renders) */
  sceneId?: string
  /** User ID */
  userId?: string
  /** Render type */
  renderType?: RenderType
  /** Stream type (animatic or video) */
  streamType?: RenderStreamType
  /** Current status */
  status: RenderJobStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Cloud Run Job execution ID (for monitoring) */
  cloudRunExecutionId?: string
  /** GCS path to output video */
  outputPath?: string
  /** Signed download URL (generated after completion) */
  downloadUrl?: string
  /** URL expiration time */
  downloadUrlExpiresAt?: Date
  /** Error message (if failed) */
  error?: string
  /** Output resolution */
  resolution: '720p' | '1080p' | '4K'
  /** Language code */
  language?: string
  /** Estimated duration in seconds */
  estimatedDuration?: number
  /** File size in bytes */
  fileSize?: number
  /** Job creation time */
  createdAt: Date
  /** Last update time */
  updatedAt: Date
  /** Job completion time */
  completedAt?: Date
}

/**
 * Request body for creating a render job
 */
export interface CreateRenderJobRequest {
  projectId: string
  projectTitle?: string
  language: string
  resolution: '720p' | '1080p' | '4K'
  includeSubtitles: boolean
  scenes: Array<{
    id?: string
    imageUrl?: string
    duration?: number
    narrationAudioUrl?: string
    narration_audio?: Record<string, string>
    dialogueAudio?: Record<string, Array<{
      audioUrl?: string
      audio_url?: string
      duration?: number
    }>>
    dialogue_audio?: Record<string, Array<{
      audioUrl?: string
      audio_url?: string
      duration?: number
    }>>
  }>
}

/**
 * Response for render job creation
 */
export interface CreateRenderJobResponse {
  success: boolean
  jobId: string
  status: RenderJobStatus
  message?: string
  estimatedDuration?: number
}

/**
 * Response for render job status check
 */
export interface RenderJobStatusResponse {
  success: boolean
  jobId: string
  status: RenderJobStatus
  progress: number
  downloadUrl?: string
  error?: string
  estimatedDuration?: number
  createdAt?: string
  completedAt?: string
}

/**
 * Callback payload sent from Cloud Run to update job status
 */
export interface RenderJobCallback {
  jobId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  outputUrl?: string
  error?: string
}

/**
 * Resolution configuration
 */
export const RESOLUTION_CONFIG = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 },
} as const

export type DeliveryAspectRatio = '16:9' | '9:16'

/** Landscape presets, or the same pixel count turned vertical for 9:16. */
export function deliveryFrameSize(
  resolution: string | undefined,
  aspectRatio: DeliveryAspectRatio = '16:9'
): { width: number; height: number } {
  const base =
    RESOLUTION_CONFIG[resolution as keyof typeof RESOLUTION_CONFIG] ?? RESOLUTION_CONFIG['1080p']
  if (aspectRatio === '9:16') {
    return { width: base.height, height: base.width }
  }
  return { width: base.width, height: base.height }
}

/**
 * Default settings
 */
export const RENDER_DEFAULTS = {
  fps: 24,
  defaultSceneDuration: 5,
  defaultKenBurns: {
    zoomStart: 1.0,
    zoomEnd: 1.05,
    panX: 0,
    panY: 0,
  },
  defaultAudioVolume: 1.0,
} as const

// ============================================================================
// Scene-Level Render Types (for Director's Console "Render Scene" feature)
// ============================================================================

/**
 * Audio source options for a video segment
 */
export type SegmentAudioSource = 'original' | 'voiceover' | 'none'

/**
 * A video segment for scene rendering (uses existing MP4s, not images)
 */
export interface SceneRenderVideoSegment {
  /** Unique segment ID */
  segmentId: string
  /** Sequence index in the scene (0, 1, 2...) */
  sequenceIndex: number
  /** URL to the MP4 video file or still image (GCS or HTTPS) */
  videoUrl: string
  /** Media type for hybrid Promo / Memoir renders ('image' loops a still frame; default 'video') */
  assetType?: 'video' | 'image'
  /** Start time in final output (seconds) */
  startTime: number
  /** Motion duration in seconds (excludes preSegmentHoldSec and pauseDuration) */
  duration: number
  /** Audio source for this segment: 'original' (MP4 audio), 'voiceover' (TTS/dialogue), or 'none' */
  audioSource?: SegmentAudioSource
  /** Volume level for this segment's audio (0.0 to 1.0, defaults to 1.0) */
  audioVolume?: number
  /** URL to voiceover audio file (dialogue or narration clip) for this segment */
  voiceoverUrl?: string
  /** Start time within the voiceover file to use (for slicing narration) */
  voiceoverStartTime?: number
  /** Duration of voiceover to use (for slicing narration) */
  voiceoverDuration?: number
  /** Intro freeze hold before segment motion begins (seconds) */
  preSegmentHoldSec?: number
  /** Visual treatment during intro freeze ('freeze' | 'push') */
  preHoldStyle?: 'freeze' | 'push'
  /** Pause duration after this segment ends (seconds) */
  pauseDuration?: number
  /** Visual treatment during post-segment hold ('freeze' | 'push' | 'pingpong') */
  holdStyle?: 'freeze' | 'push' | 'pingpong'
  /** J-Cut audio lead-in before visual cut (seconds) */
  audioLeadInSec?: number
  /** L-Cut audio tail-out after visual cut (seconds) */
  audioTailOutSec?: number
  /** Uniform frame crop % (2–10) for uploaded video; preserves aspect ratio */
  watermarkCropPercent?: number
  /** Seconds into source MP4 where beat playback begins */
  videoTrimInSec?: number
  /** Seconds into source MP4 where beat playback ends */
  videoTrimOutSec?: number
  /** Picture speed. 1 is unchanged. Wall time of the source window is playable / rate. */
  playbackRate?: number
  /** How this shot arrives from the previous one. Absent is a hard cut. */
  transitionIn?: 'dissolve' | 'fade'
  /** Seconds of the join, painted on the shot edges. Does not change duration. */
  transitionInSec?: number
}

/**
 * Audio track selection for scene render
 */
export interface SceneRenderAudioConfig {
  /** Include narration audio */
  includeNarration: boolean
  /** Include dialogue audio */
  includeDialogue: boolean
  /** Include background music */
  includeMusic: boolean
  /** Include sound effects */
  includeSfx: boolean
  /** Include original audio from video segments */
  includeSegmentAudio: boolean
  /** Language code for dialogue/narration */
  language: string
  /** Volume levels (0.0 to 1.0) */
  narrationVolume: number
  dialogueVolume: number
  musicVolume: number
  sfxVolume: number
  segmentAudioVolume: number
  /** Auto-lower music by -8 dB (×0.398) during active narration/dialogue speech */
  autoDuckMusic?: boolean
  /** Auto-lower discrete SFX by -8 dB (×0.398) during active narration/dialogue speech */
  autoDuckSfx?: boolean
  /** Target loudness preset selected in the Mixer */
  loudnessTarget?: 'broadcast-24lkfs' | 'web-14lufs' | 'off'
}

/**
 * Audio clip for scene render with track type
 */
export interface SceneRenderAudioClip {
  /** URL to the audio file (GCS or HTTPS) */
  url: string
  /** Start time in final output (seconds) */
  startTime: number
  /** Duration in seconds */
  duration: number
  /** Volume multiplier (0.0 to 1.0) */
  volume: number
  /** Audio track type */
  type: 'narration' | 'dialogue' | 'music' | 'sfx'
  /** Character name (for dialogue) */
  character?: string
  /**
   * Playback speed for time-stretching (1 = normal). Uses source `duration` as file length;
   * wall-clock span is duration / playbackRate.
   */
  playbackRate?: number
  /** Music: loop clip for duration */
  loop?: boolean
  /** Music/Narration: fade-in seconds */
  fadeInSec?: number
  /** Music/Narration: fade-out seconds */
  fadeOutSec?: number
  /** Offset into the source file, seconds. */
  trimStart?: number
  /** Narration: apply low-shelf broadcast warmth EQ (defaults true on worker when omitted) */
  warmBroadcastEq?: boolean
}

/**
 * Complete scene render job specification
 * Uploaded to GCS and processed by Cloud Run FFmpeg renderer
 */
export interface SceneRenderJobSpec {
  /** Unique job ID (UUID) */
  jobId: string
  /** SceneFlow project ID */
  projectId: string
  /** Scene ID being rendered */
  sceneId: string
  /** Scene number (1-based) */
  sceneNumber: number
  /** Output resolution */
  resolution: '720p' | '1080p' | '4K'
  /** Delivery frame. Omitted stays 16:9 so existing jobs keep landscape output. */
  aspectRatio?: '16:9' | '9:16'
  /** Frames per second */
  fps: number
  /** Video segments (existing MP4s to concatenate) */
  videoSegments: SceneRenderVideoSegment[]
  /** Audio clips with timing */
  audioClips: SceneRenderAudioClip[]
  /** GCS path for output video (gs://bucket/path) */
  outputPath: string
  /** Optional callback URL for status updates */
  callbackUrl?: string
  /** Job creation timestamp (ISO 8601) */
  createdAt: string
  /** Render mode: 'concatenate' for video concat, 'ken_burns' for image-based */
  renderMode: 'concatenate' | 'ken_burns'
  /** Language code */
  language: string
  /** Whether to include original audio from video segments */
  includeSegmentAudio?: boolean
  /** Volume for segment audio (0.0 to 1.0) */
  segmentAudioVolume?: number
  /** Text overlays to burn into the video (FFmpeg drawtext filter) */
  textOverlays?: SceneRenderTextOverlay[]
  /** Watermark to burn into the video (full duration) */
  watermark?: SceneRenderWatermark
  /**
   * Scene-stitch encode. Omitted or `delivery` keeps medium / CRF 23.
   * `draft` uses a faster preset for iteration exports.
   */
  encodeQuality?: SceneEncodeQuality
  /** Incoming scene opening transition burned into this scene's MP4. */
  sceneIntroTransition?: {
    effect: 'cut' | 'fade_in'
    durationSec: number
    leadInHoldSec?: number
  }
  /** Outgoing scene join burned into this scene's MP4. */
  sceneEndTransition?: {
    effect: 'fade' | 'dissolve' | 'cut'
    durationSec: number
    holdSec?: number
    nextFrameUrl?: string
  }
  /** Target loudness preset for final audio bus normalization. */
  loudnessTarget?: 'broadcast-24lkfs' | 'web-14lufs' | 'off'
}

/**
 * Watermark specification for FFmpeg drawtext/overlay filter
 * Applied to entire video duration
 */
/** Delivery keeps the historical x264 settings. Draft is an opt-in faster export. */
export type SceneEncodeQuality = 'delivery' | 'draft'

export interface SceneRenderWatermark {
  /** Watermark type */
  type: 'text' | 'image'
  /** Text content (for type='text') */
  text?: string
  /** Image URL (for type='image') */
  imageUrl?: string
  /** Position anchor */
  anchor: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  /** Padding from edges in pixels */
  padding: number
  /** Text styling (for type='text') */
  textStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    color: string
    opacity: number
    textShadow?: boolean
  }
  /** Image styling (for type='image') */
  imageStyle: {
    width: number
    opacity: number
  }
}

/**
 * Text overlay specification for FFmpeg drawtext filter
 * Converted from percentage-based UI coordinates to pixel values
 */
export interface SceneRenderTextOverlay {
  /** Unique overlay ID */
  id: string
  /** Main text content */
  text: string
  /** Secondary text (for lower-thirds: name + title) */
  subtext?: string
  /** X position in pixels (from left) */
  x: number
  /** Y position in pixels (from top) */
  y: number
  /** Anchor point for positioning */
  anchor: 'top-left' | 'top-center' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  /** Font family name (must be available in FFmpeg container) */
  fontFamily: 'Montserrat' | 'Roboto' | 'RobotoMono' | 'Lora'
  /** Font size in pixels */
  fontSize: number
  /** Font weight (100-900) */
  fontWeight: number
  /** Text color in hex (#RRGGBB) */
  color: string
  /** Background color in hex (#RRGGBB), optional */
  backgroundColor?: string
  /** Background opacity (0-1), default 0.7 if backgroundColor set */
  backgroundOpacity?: number
  /** Enable text shadow (drop shadow effect) */
  textShadow?: boolean
  /** Start time in seconds */
  startTime: number
  /** Duration in seconds (-1 for full video) */
  duration: number
  /** Fade-in duration in milliseconds */
  fadeInMs: number
  /** Fade-out duration in milliseconds */
  fadeOutMs: number
}

/**
 * Request body for creating a scene render job
 */
export interface CreateSceneRenderJobRequest {
  projectId: string
  sceneId: string
  sceneNumber: number
  resolution: '720p' | '1080p' | '4K'
  /** Delivery frame. Omitted stays 16:9. */
  aspectRatio?: '16:9' | '9:16'
  audioConfig: SceneRenderAudioConfig
  /** Video segments from Director's Console */
  segments: Array<{
    segmentId: string
    sequenceIndex: number
    videoUrl: string
    assetType?: 'video' | 'image'
    startTime: number
    endTime: number
    audioSource?: SegmentAudioSource
    audioVolume?: number
    voiceoverUrl?: string
    voiceoverStartTime?: number
    voiceoverDuration?: number
    preSegmentHoldSec?: number
    preHoldStyle?: 'freeze' | 'push'
    pauseDuration?: number
    holdStyle?: 'freeze' | 'push' | 'pingpong'
    audioLeadInSec?: number
    audioTailOutSec?: number
    watermarkCropPercent?: number
    videoTrimInSec?: number
    videoTrimOutSec?: number
    playbackRate?: number
    /** How this shot arrives from the previous one. Absent is a hard cut. */
    transitionIn?: 'dissolve' | 'fade'
    /** Seconds of the join, painted on the shot edges. Does not change duration. */
    transitionInSec?: number
  }>
  /** Audio tracks with timing */
  audioTracks: {
    narration?: Array<{
      url: string
      startTime: number
      duration?: number
      volume?: number
      fadeInSec?: number
      fadeOutSec?: number
      trimStart?: number
      playbackRate?: number
      warmBroadcastEq?: boolean
    }>
    dialogue?: Array<{
      url: string
      startTime: number
      duration: number
      volume?: number
      character?: string
      playbackRate?: number
    }>
    music?: Array<{
      url: string
      startTime: number
      duration: number
      volume?: number
      loop?: boolean
      fadeInSec?: number
      fadeOutSec?: number
      playbackRate?: number
      /** Offset into the music file so per-shot slices stay continuous. */
      trimStart?: number
    }>
    sfx?: Array<{
      url: string
      startTime: number
      duration: number
      volume?: number
      playbackRate?: number
      trimStart?: number
    }>
  }
  /** Text overlays to burn into video */
  textOverlays?: Array<{
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
  }>
  /** Burn-in watermark (same shape as Scene Production Mixer POST body) */
  watermark?: SceneRenderWatermark | null
  /** Display name stored on the background job and the production stream. */
  languageLabel?: string
  streamType?: 'video' | 'animatic'
  /** Omitted means delivery. Draft is the Mixer iteration export. */
  encodeQuality?: SceneEncodeQuality
  /** Incoming scene opening transition burned into this scene's MP4. */
  sceneIntroTransition?: {
    effect: 'cut' | 'fade_in'
    durationSec: number
    leadInHoldSec?: number
  }
  /** Outgoing scene join burned into this scene's MP4. */
  sceneEndTransition?: {
    effect: 'fade' | 'dissolve' | 'cut'
    durationSec: number
    holdSec?: number
    nextFrameUrl?: string
  }
  /** Target loudness preset for final audio bus normalization. */
  loudnessTarget?: 'broadcast-24lkfs' | 'web-14lufs' | 'off'
}

import { computeSpeechDuckMultiplier, type SpeechDuckWindow } from '@/lib/scene/mixerScoreMusic'

function clampRenderVolume(vol: number | undefined, fallback: number): number {
  const raw = vol != null && Number.isFinite(vol) ? vol : fallback
  return Math.max(0, Math.min(1.5, raw))
}

function clampRenderPlaybackRate(pr: number | undefined): number | undefined {
  if (pr == null || !Number.isFinite(pr) || pr <= 0) return undefined
  const clamped = Math.min(1.5, Math.max(0.5, pr))
  return Math.abs(clamped - 1) > 1e-4 ? clamped : undefined
}

/**
 * Build FFmpeg job-spec audioClips from Mixer POST audioConfig and audioTracks.
 * Preserves per-clip volume, playbackRate, trimStart, and applies speech auto-ducking
 * when callers did not pre-compute ducked per-clip volumes.
 */
export function buildSceneRenderAudioClips(
  audioConfig: SceneRenderAudioConfig,
  audioTracks: CreateSceneRenderJobRequest['audioTracks'],
  videoSegments?: SceneRenderVideoSegment[]
): SceneRenderAudioClip[] {
  const narrationVolume = audioConfig.narrationVolume ?? 0.8
  const dialogueVolume = audioConfig.dialogueVolume ?? 0.9
  const musicVolume = audioConfig.musicVolume ?? 0.15
  const sfxVolume = audioConfig.sfxVolume ?? 0.6

  const maxVideoDuration =
    videoSegments && videoSegments.length > 0
      ? videoSegments.reduce(
          (sum, seg) =>
            sum + (seg.preSegmentHoldSec || 0) + (seg.duration || 0) + (seg.pauseDuration || 0),
          0
        )
      : undefined

  const clampDurationToVideo = (startTime: number, duration: number): number | null => {
    if (maxVideoDuration == null || maxVideoDuration <= 0) return duration
    if (startTime >= maxVideoDuration - 0.01) return null
    return Math.max(0.05, Math.min(duration, maxVideoDuration - startTime))
  }

  const audioClips: SceneRenderAudioClip[] = []
  const speechWindows: SpeechDuckWindow[] = []

  // When embedded video clip audio is included, treat active video clip audio spans as principal audio windows for auto-ducking
  if (audioConfig.includeSegmentAudio && videoSegments && videoSegments.length > 0) {
    let runningStart = 0
    for (const seg of videoSegments) {
      const preHold = seg.preSegmentHoldSec || 0
      const motionDur = seg.duration || 0
      const segDur = preHold + motionDur + (seg.pauseDuration || 0)
      const segStart = typeof seg.startTime === 'number' && Number.isFinite(seg.startTime) ? seg.startTime : runningStart
      if (
        seg.assetType !== 'image' &&
        seg.audioSource !== 'none' &&
        (seg.audioVolume ?? 1) > 0 &&
        motionDur > 0
      ) {
        speechWindows.push({
          startTime: Math.max(0, segStart + preHold),
          endTime: Math.max(0, segStart + preHold) + motionDur,
        })
      }
      runningStart = segStart + segDur
    }
  }

  if (audioConfig.includeNarration && audioTracks.narration) {
    for (const track of audioTracks.narration) {
      if (!track?.url) continue
      const playbackRate = clampRenderPlaybackRate(track.playbackRate)
      const effectiveRate = playbackRate ?? 1
      // Never clamp narration voiceover to maxVideoDuration or 0.05s when duration is omitted:
      // 0 signals Cloud Run FFmpeg's explicit_audio_duration_filters to play the full voice file.
      const explicitDuration =
        track.duration != null && Number.isFinite(track.duration) && track.duration > 0
          ? track.duration
          : 0
      const wallDur =
        explicitDuration > 0
          ? explicitDuration / effectiveRate
          : maxVideoDuration != null && maxVideoDuration > track.startTime
            ? maxVideoDuration - track.startTime
            : 10
      if (wallDur > 0) {
        speechWindows.push({
          startTime: Math.max(0, track.startTime - 0.1),
          endTime: Math.max(0, track.startTime) + wallDur + 0.15,
        })
      }
      audioClips.push({
        url: track.url,
        startTime: Math.max(0, track.startTime),
        duration: explicitDuration,
        volume: clampRenderVolume(track.volume, narrationVolume),
        type: 'narration',
        ...(playbackRate != null ? { playbackRate } : {}),
        ...(track.fadeInSec != null && track.fadeInSec > 0 ? { fadeInSec: track.fadeInSec } : {}),
        ...(track.fadeOutSec != null && track.fadeOutSec > 0 ? { fadeOutSec: track.fadeOutSec } : {}),
        ...(track.trimStart != null && track.trimStart > 0 ? { trimStart: track.trimStart } : {}),
        ...(track.warmBroadcastEq !== undefined ? { warmBroadcastEq: track.warmBroadcastEq } : {}),
      })
    }
  }

  if (audioConfig.includeDialogue && audioTracks.dialogue) {
    for (const track of audioTracks.dialogue) {
      if (!track?.url) continue
      const explicitDuration =
        track.duration != null && Number.isFinite(track.duration) && track.duration > 0
          ? track.duration
          : 0
      const playbackRate = clampRenderPlaybackRate(track.playbackRate)
      const effectiveRate = playbackRate ?? 1
      const wallDur = explicitDuration / effectiveRate
      if (wallDur > 0) {
        speechWindows.push({
          startTime: Math.max(0, track.startTime - 0.1),
          endTime: Math.max(0, track.startTime) + wallDur + 0.15,
        })
      }
      audioClips.push({
        url: track.url,
        startTime: Math.max(0, track.startTime),
        duration: explicitDuration,
        volume: clampRenderVolume(track.volume, dialogueVolume),
        type: 'dialogue',
        character: track.character,
        ...(playbackRate != null ? { playbackRate } : {}),
      })
    }
  }

  if (audioConfig.includeMusic && audioTracks.music) {
    for (const track of audioTracks.music) {
      const clampedDuration = clampDurationToVideo(track.startTime, track.duration || 0)
      if (clampedDuration == null) continue
      const playbackRate = clampRenderPlaybackRate(track.playbackRate)
      const hasExplicitClipVolume = track.volume != null && Number.isFinite(track.volume)
      const duckMult =
        !hasExplicitClipVolume && audioConfig.autoDuckMusic
          ? computeSpeechDuckMultiplier(track.startTime, clampedDuration, speechWindows)
          : 1
      const volume = clampRenderVolume(
        hasExplicitClipVolume ? track.volume : musicVolume * duckMult,
        musicVolume
      )
      // Always ensure music clips with duration > 0 carry at least 0.001s trimStart
      // so Cloud Run FFmpeg's audio_source_window_filters always emits atrim and cuts
      // the music track at the end of the video clip instead of playing to the end of the file.
      const resolvedTrimStart =
        track.trimStart != null && track.trimStart > 0
          ? track.trimStart
          : clampedDuration > 0
            ? 0.001
            : undefined

      audioClips.push({
        url: track.url,
        startTime: track.startTime,
        duration: clampedDuration,
        volume,
        type: 'music',
        ...(playbackRate != null ? { playbackRate } : {}),
        ...(track.loop != null ? { loop: track.loop } : {}),
        ...(track.fadeInSec != null && track.fadeInSec > 0 ? { fadeInSec: track.fadeInSec } : {}),
        ...(track.fadeOutSec != null && track.fadeOutSec > 0 ? { fadeOutSec: track.fadeOutSec } : {}),
        ...(resolvedTrimStart != null ? { trimStart: resolvedTrimStart } : {}),
      })
    }
  }

  if (audioConfig.includeSfx && audioTracks.sfx) {
    for (const track of audioTracks.sfx) {
      const clampedDuration = clampDurationToVideo(track.startTime, track.duration || 0)
      if (clampedDuration == null) continue
      const playbackRate = clampRenderPlaybackRate(track.playbackRate)
      const hasExplicitClipVolume = track.volume != null && Number.isFinite(track.volume)
      const duckMult =
        !hasExplicitClipVolume && audioConfig.autoDuckSfx
          ? computeSpeechDuckMultiplier(track.startTime, clampedDuration, speechWindows)
          : 1
      const volume = clampRenderVolume(
        hasExplicitClipVolume ? track.volume : sfxVolume * duckMult,
        sfxVolume
      )
      const wasTrimmedByVideoEnd =
        maxVideoDuration != null &&
        maxVideoDuration > 0 &&
        track.startTime + (track.duration || 0) > maxVideoDuration + 0.01
      const resolvedSfxTrimStart =
        track.trimStart != null && track.trimStart > 0
          ? track.trimStart
          : wasTrimmedByVideoEnd && clampedDuration > 0
            ? 0.001
            : undefined
      audioClips.push({
        url: track.url,
        startTime: track.startTime,
        duration: clampedDuration,
        volume,
        type: 'sfx',
        ...(playbackRate != null ? { playbackRate } : {}),
        ...(resolvedSfxTrimStart != null ? { trimStart: resolvedSfxTrimStart } : {}),
      })
    }
  }

  return audioClips
}

/** Map Mixer POST segment payload to FFmpeg job-spec video segment. */
export function toSceneRenderVideoSegment(
  seg: CreateSceneRenderJobRequest['segments'][number]
): SceneRenderVideoSegment {
  const audioSource = seg.audioSource ?? 'original'
  const preHold =
    seg.preSegmentHoldSec != null && Number.isFinite(seg.preSegmentHoldSec) && seg.preSegmentHoldSec > 0
      ? seg.preSegmentHoldSec
      : 0
  const pause =
    seg.pauseDuration != null && Number.isFinite(seg.pauseDuration) && seg.pauseDuration > 0
      ? seg.pauseDuration
      : 0
  const rawSpan = Math.max(0, seg.endTime - seg.startTime)
  // Callers supply [startTime, endTime] as the full timeline slot (preSegmentHoldSec + motionWall + pauseDuration).
  // Extract pure motion wall duration so downstream maxVideoDuration and FFmpeg tpad never double-count holds.
  const motionDuration = rawSpan > preHold + pause + 1e-4 ? rawSpan - preHold - pause : rawSpan
  return {
    segmentId: seg.segmentId,
    sequenceIndex: seg.sequenceIndex,
    videoUrl: seg.videoUrl,
    ...(seg.assetType === 'image' ? { assetType: 'image' as const } : {}),
    startTime: seg.startTime,
    duration: motionDuration,
    audioSource,
    audioVolume: seg.audioVolume ?? 1.0,
    voiceoverUrl: seg.voiceoverUrl,
    voiceoverStartTime: seg.voiceoverStartTime,
    voiceoverDuration: seg.voiceoverDuration,
    ...(preHold > 0 ? { preSegmentHoldSec: preHold } : {}),
    ...(seg.preHoldStyle ? { preHoldStyle: seg.preHoldStyle } : {}),
    pauseDuration: pause,
    ...(seg.holdStyle ? { holdStyle: seg.holdStyle } : {}),
    ...(seg.audioLeadInSec != null && seg.audioLeadInSec > 0 ? { audioLeadInSec: seg.audioLeadInSec } : {}),
    ...(seg.audioTailOutSec != null && seg.audioTailOutSec > 0 ? { audioTailOutSec: seg.audioTailOutSec } : {}),
    watermarkCropPercent: seg.watermarkCropPercent,
    videoTrimInSec: seg.videoTrimInSec,
    videoTrimOutSec: seg.videoTrimOutSec,
    playbackRate: seg.playbackRate,
    ...(seg.transitionIn === 'dissolve' || seg.transitionIn === 'fade'
      ? {
          transitionIn: seg.transitionIn,
          transitionInSec: seg.transitionInSec,
        }
      : {}),
  }
}

/**
 * Lightweight stitch job spec for long-take Kling clip concatenation.
 * Concat only — no audio/overlays (lip-sync overdub comes later).
 */
export interface StitchRenderJobSpec {
  jobId: string
  projectId: string
  sceneId: string
  resolution: '720p' | '1080p' | '4K'
  fps: number
  clipUrls: string[]
  outputPath: string
  callbackUrl?: string
  createdAt: string
  renderMode: 'stitch'
}
