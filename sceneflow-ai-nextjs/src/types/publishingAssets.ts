import type { ProjectStream, ProjectStreamPublish } from '@/lib/streams/projectStreams'
import type { UpscaleSettings } from '@/lib/types/finalCut'
import type { ShortFormClipSpec } from '@/app/api/premiere/shorts/generate/route'

/** Delivery quality preset for master stream renders. */
export type StreamDeliveryPreset = 'draft' | 'standard' | 'premium'

export type StreamDeliveryResolution = '720p' | '1080p' | '4K'

export interface StreamRenderSettings {
  preset: StreamDeliveryPreset
  resolution: StreamDeliveryResolution
  upscale: boolean
  upscaleSettings?: UpscaleSettings
}

export interface YoutubePublishBundle {
  language: string
  title: string
  description: string
  thumbnailUrl?: string
  tags?: string[]
  categoryId?: string
  privacyStatus: 'private' | 'unlisted' | 'public'
  madeForKids?: boolean
  youtubeUrl?: string
  publishedAt?: string
  status: 'draft' | 'ready' | 'published' | 'error'
  error?: string
}

export interface PromoTrailerBeatPlan {
  sceneId: string
  beatId: string
  sceneIndex: number
  startSec: number
  endSec: number
  score: number
  label?: string
}

export interface PromoTrailerAsset {
  mp4Url: string
  aspect: '9:16'
  durationSec: number
  targetDurationSec: number
  beatPlan: PromoTrailerBeatPlan[]
  renderedAt: string
  status: 'ready' | 'rendering' | 'error'
  error?: string
}

export interface ProjectPublishingPromo {
  trailer?: PromoTrailerAsset
  shorts?: ShortFormClipSpec[]
}

export interface PublishingReadiness {
  lastCheckedAt: string
  blockers: string[]
  readyStreamCount: number
  totalStreamCount: number
}

/** Extended stream record stored under visionPhase.publishing.streams */
export interface PublishingStreamRecord extends ProjectStream {
  renderSettings?: StreamRenderSettings
  publish?: ProjectStreamPublish
  screeningId?: string
}

export interface ProjectPublishingState {
  streams: PublishingStreamRecord[]
  promo?: ProjectPublishingPromo
  youtubeByLanguage: Record<string, YoutubePublishBundle>
  readiness?: PublishingReadiness
}

export const DEFAULT_STREAM_RENDER_SETTINGS: StreamRenderSettings = {
  preset: 'standard',
  resolution: '1080p',
  upscale: false,
}

export const DELIVERY_PRESET_RESOLUTION: Record<StreamDeliveryPreset, StreamDeliveryResolution> = {
  draft: '720p',
  standard: '1080p',
  premium: '4K',
}

export type PublishingLibraryTab = 'streams' | 'screening' | 'promo' | 'youtube'
