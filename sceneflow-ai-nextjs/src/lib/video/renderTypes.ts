/**
 * Video Rendering Types
 * 
 * Shared type definitions for the FFmpeg video rendering pipeline.
 * Used by both the Cloud Run renderer and the Next.js API.
 */

/**
 * Ken Burns effect settings for image animation
 */
export interface KenBurnsSettings {
  /** Starting zoom level (1.0 = no zoom, 1.5 = 50% zoom in) */
  zoomStart: number
  /** Ending zoom level */
  zoomEnd: number
  /** Pan X direction (-1 = left, 0 = center, 1 = right) */
  panX: number
  /** Pan Y direction (-1 = up, 0 = center, 1 = down) */
  panY: number
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
 * Complete render job specification
 * This is uploaded to GCS as job_spec.json and read by the Cloud Run renderer
 */
export interface RenderJobSpec {
  /** Unique job ID (UUID) */
  jobId: string
  /** SceneFlow project ID */
  projectId: string
  /** Project title (for metadata) */
  projectTitle: string
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
  /** Error message (if failed) */
  error?: string
  /** Output resolution */
  resolution: '720p' | '1080p' | '4K'
  /** Estimated duration in seconds */
  estimatedDuration?: number
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
 * A video segment for scene rendering (uses existing MP4s, not images)
 */
export interface SceneRenderVideoSegment {
  /** Unique segment ID */
  segmentId: string
  /** Sequence index in the scene (0, 1, 2...) */
  sequenceIndex: number
  /** URL to the MP4 video file (GCS or HTTPS) */
  videoUrl: string
  /** Start time in final output (seconds) */
  startTime: number
  /** Duration in seconds */
  duration: number
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
  /** Language code for dialogue/narration */
  language: string
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
}

/**
 * Request body for creating a scene render job
 */
export interface CreateSceneRenderJobRequest {
  projectId: string
  sceneId: string
  sceneNumber: number
  resolution: '720p' | '1080p' | '4K'
  audioConfig: SceneRenderAudioConfig
  /** Video segments from Director's Console */
  segments: Array<{
    segmentId: string
    sequenceIndex: number
    videoUrl: string
    startTime: number
    endTime: number
  }>
  /** Audio tracks with timing */
  audioTracks: {
    narration?: Array<{ url: string; startTime: number; duration: number }>
    dialogue?: Array<{ url: string; startTime: number; duration: number; character?: string }>
    music?: Array<{ url: string; startTime: number; duration: number }>
    sfx?: Array<{ url: string; startTime: number; duration: number }>
  }
}
