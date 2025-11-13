import type { VIDEO_PRICING } from '@/lib/cost/videoCalculator'

export type CreationAssetType =
  | 'generated_video'
  | 'uploaded_video'
  | 'uploaded_image'
  | 'generated_image'
  | 'user_audio'
  | 'generated_audio'

export interface CreationSceneAsset {
  id: string
  type: CreationAssetType
  name?: string
  thumbnailUrl?: string
  durationSec?: number
  createdAt?: string
  sourceUrl?: string
  previewUrl?: string
  status?: 'queued' | 'processing' | 'ready' | 'failed'
  meta?: Record<string, any>
}

export interface CreationTimelineClip {
  assetId: string
  type: CreationAssetType
  sourceUrl?: string
  timelineDuration: number
  sourceInPoint: number
  sourceOutPoint: number
  startTime: number
  label?: string
  status?: 'queued' | 'processing' | 'ready' | 'failed'
}

export interface SceneTimelineData {
  videoTrack: CreationTimelineClip[]
  userAudioTrack: CreationTimelineClip[]
  narrationTrackUrl?: string
  musicTrackUrl?: string
  dialogueTrack?: CreationTimelineClip[]
}

export interface CreationSceneData {
  sceneId: string
  sceneNumber: number
  heading?: string
  description?: string
  storyboardUrl?: string
  durationSec?: number
  timeline?: SceneTimelineData
  assets?: CreationSceneAsset[]
  narrationUrl?: string
  musicUrl?: string
  dialogueClips?: CreationTimelineClip[]
}

export interface GenerationReference {
  characterIds?: string[]
  storyboardUrl?: string
  continuityFrameUrl?: string
}

export type VideoModelKey = keyof typeof VIDEO_PRICING

export interface VideoGenerationRequest {
  prompt: string
  durationSec: number
  modelKey: VideoModelKey
  references: GenerationReference
  sceneId: string
  projectId: string
  characterMetadata?: Array<{ id: string; name: string }>
  continuity?: {
    usePreviousClip: boolean
    previousAssetId?: string
  }
}
