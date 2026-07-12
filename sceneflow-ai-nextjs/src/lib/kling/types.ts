/**
 * Kling API types and per-model capability map (build-gated).
 */

export type KlingModelId = 'kling-v3-omni' | 'kling-v3' | 'kling-v3-turbo' | 'kling-v2.6'

export type KlingQuality = 'std' | 'pro' | '4k'

export type KlingAspectRatio = '16:9' | '9:16' | '1:1' | 'auto'

export type KlingShotType = 'customize' | 'intelligence'

export type KlingImageListEntry = {
  url: string
  type: 'first_frame' | 'end_frame'
}

export type KlingMultiPromptEntry = {
  index: number
  prompt: string
  duration: string | number
}

export type KlingVoiceEntry = {
  voice_id: string
  /** Optional display name for UI */
  name?: string
}

/** Single-image creative FX presets */
export type KlingSingleImagePreset =
  | 'jelly_press'
  | 'jelly_slice'
  | 'jelly_squish'
  | 'jelly_jiggle'
  | 'pixelpixel'
  | 'yearbook'
  | 'instant_film'
  | 'squish'
  | 'expansion'

/** Dual-image relationship presets */
export type KlingDualImagePreset = 'hug' | 'kiss' | 'heart_gesture'

export type KlingCreativePreset = KlingSingleImagePreset | KlingDualImagePreset

export interface KlingModelCapabilities {
  multiShot: boolean
  elements: boolean
  voiceList: boolean
  lipsync: boolean
  v2v: boolean
  presets: boolean
  cfgScale: boolean
  imageList: boolean
  watermark: boolean
  nativeAudio: boolean
  /** Native video-extend chaining from parent video_id */
  videoExtend: boolean
  /** Face consistency lock across extend chain */
  faceConsistency: boolean
  qualities: KlingQuality[]
  maxDuration: number
  minDuration: number
  maxElements: number
  maxVoices: number
  maxMultiPromptScenes: number
  /** Legacy single-image I2V field */
  legacyImageField: boolean
}

/** Kling single-clip ceiling (seconds) before long-take pipeline */
export const KLING_SINGLE_CLIP_MAX_SEC = 15

/** Seconds added per native video-extend call */
export const KLING_EXTEND_DELTA_SEC = 5

/** Hard cumulative ceiling for extend chains (seconds) */
export const KLING_LONG_TAKE_MAX_SEC = 180

/** Max dialogue audio length for long-form lip-sync overdub */
export const KLING_LIPSYNC_MAX_SEC = 60

export const KLING_MODEL_CATALOG: Record<
  KlingModelId,
  { label: string; capabilities: KlingModelCapabilities }
> = {
  'kling-v3-omni': {
    label: 'Kling v3 Omni',
    capabilities: {
      multiShot: true,
      elements: true,
      voiceList: true,
      lipsync: true,
      v2v: true,
      presets: true,
      cfgScale: true,
      imageList: true,
      watermark: true,
      nativeAudio: true,
      videoExtend: true,
      faceConsistency: true,
      qualities: ['std', 'pro', '4k'],
      maxDuration: 15,
      minDuration: 3,
      maxElements: 4,
      maxVoices: 2,
      maxMultiPromptScenes: 6,
      legacyImageField: false,
    },
  },
  'kling-v3': {
    label: 'Kling v3',
    capabilities: {
      multiShot: true,
      elements: true,
      voiceList: true,
      lipsync: true,
      v2v: true,
      presets: true,
      cfgScale: true,
      imageList: true,
      watermark: true,
      nativeAudio: true,
      videoExtend: true,
      faceConsistency: true,
      qualities: ['std', 'pro'],
      maxDuration: 15,
      minDuration: 3,
      maxElements: 4,
      maxVoices: 2,
      maxMultiPromptScenes: 6,
      legacyImageField: false,
    },
  },
  'kling-v3-turbo': {
    label: 'Kling v3 Turbo',
    capabilities: {
      multiShot: false,
      elements: true,
      voiceList: true,
      lipsync: false,
      v2v: false,
      presets: false,
      cfgScale: true,
      imageList: true,
      watermark: true,
      nativeAudio: true,
      videoExtend: true,
      faceConsistency: false,
      qualities: ['std', 'pro'],
      maxDuration: 10,
      minDuration: 3,
      maxElements: 2,
      maxVoices: 2,
      maxMultiPromptScenes: 0,
      legacyImageField: false,
    },
  },
  'kling-v2.6': {
    label: 'Kling v2.6',
    capabilities: {
      multiShot: false,
      elements: false,
      voiceList: false,
      lipsync: false,
      v2v: false,
      presets: false,
      cfgScale: false,
      imageList: false,
      watermark: false,
      nativeAudio: true,
      videoExtend: true,
      faceConsistency: false,
      qualities: ['std', 'pro'],
      maxDuration: 10,
      minDuration: 5,
      maxElements: 0,
      maxVoices: 0,
      maxMultiPromptScenes: 0,
      legacyImageField: true,
    },
  },
}

export const KLING_SINGLE_IMAGE_PRESETS: KlingSingleImagePreset[] = [
  'jelly_press',
  'jelly_slice',
  'jelly_squish',
  'jelly_jiggle',
  'pixelpixel',
  'yearbook',
  'instant_film',
  'squish',
  'expansion',
]

export const KLING_DUAL_IMAGE_PRESETS: KlingDualImagePreset[] = ['hug', 'kiss', 'heart_gesture']

export const KLING_QUALITY_RESOLUTION: Record<KlingQuality, '720p' | '1080p' | '4k'> = {
  std: '720p',
  pro: '1080p',
  '4k': '4k',
}

export interface KlingVideoInput {
  prompt: string
  negative_prompt?: string
  cfg_scale?: number
  aspect_ratio?: KlingAspectRatio | string
  duration?: number
  model_name?: KlingModelId | string
  mode?: KlingQuality
  /** Legacy single start frame */
  startFrame?: string
  /** Legacy end/tail frame */
  lastFrame?: string
  image_list?: KlingImageListEntry[]
  video_url?: string
  element_list?: string[]
  multi_shot?: boolean
  shot_type?: KlingShotType
  multi_prompt?: KlingMultiPromptEntry[]
  sound?: boolean | 'on' | 'off'
  voice_list?: KlingVoiceEntry[]
  preset?: KlingCreativePreset
  webhook_url?: string
  watermark_enabled?: boolean
  /** Second image for dual-image presets */
  secondaryImageUrl?: string
  /** Lock face identity across extend chain (requires reference frame) */
  face_consistency?: boolean
}

export interface KlingSubmitResult {
  taskId: string
  endpoint: 'text2video' | 'image2video' | 'video-extend' | 'lip-sync'
  asyncMode: boolean
  /** Kling output video_id for chaining extends */
  videoId?: string
}

export type KlingJobKind =
  | 'segment'
  | 'long_take_base'
  | 'long_take_extend'
  | 'long_take_lipsync'
  | 'long_take_stitch'

export interface KlingLongTakeChainContext {
  generationJobId: string
  beatId: string
  model: string
  quality: string
  targetSeconds: number
  clipUrls: string[]
  currentVideoId?: string
  dialogueAudioUrl?: string
  stepIndex: number
  totalExtendSteps: number
  stitchJobId?: string
}

export interface KlingJobRecord {
  jobId: string
  taskId: string
  endpoint: string
  segmentId: string
  projectId: string
  sceneId: string
  userId: string
  modelName: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  assetUrl?: string
  /** Raw Kling CDN URL before moderation (long-take intermediate steps) */
  videoUrl?: string
  videoId?: string
  error?: string
  kind?: KlingJobKind
  longTake?: KlingLongTakeChainContext
  createdAt: string
  updatedAt: string
}

export interface KlingWebhookPayload {
  task_id: string
  task_status?: 'submitted' | 'processing' | 'succeed' | 'failed'
  task_status_msg?: string
  task_result?: {
    videos?: Array<{ url?: string; id?: string }>
  }
}
