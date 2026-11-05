import type { ProjectStream, ProjectStreamPublish } from '@/lib/streams/projectStreams'
import type { UpscaleSettings } from '@/lib/types/finalCut'
import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type { ShortFormClipSpec } from '@/app/api/premiere/shorts/generate/route'
import type { PublishUnitRecord } from '@/lib/publish/publishUnits'

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

/** Editorial job of a shot inside the promo, independent of script order. */
export type PromoTrailerRole = 'hook' | 'rise' | 'peak' | 'button'

export interface PromoTrailerBeatPlan {
  sceneId: string
  beatId: string
  sceneIndex: number
  startSec: number
  endSec: number
  score: number
  label?: string
  /** Preferred clip length for pacing (usually endSec - startSec). */
  durationSec?: number
  /** Reused storyboard frame from the source beat. */
  frameUrl?: string
  /** Reused production take / segment video from the source beat. */
  videoUrl?: string
  beatRole?: string
  beatKind?: string
  /** Title, outro, or story. Copied from the source scene so a language pass can see it. */
  cinematicType?: string
  /** English on-screen title or credit. */
  overlayText?: string
  /** Where this shot sits in the trailer: hook, rise, peak, or button. */
  trailerRole?: PromoTrailerRole
  /** Missing means the shot plays. False keeps it on the timeline and out of the cut. */
  included?: boolean
}

export type PromoFrameAspect = '16:9' | '9:16'

/** Intelligent marketing campaign preset archetypes for multi-promo creation. */
export type PromoCampaignPresetId =
  | 'theatrical_trailer'
  | 'social_vertical_hook'
  | 'character_spotlight'
  | 'high_octane_action'
  | 'mystery_cliffhanger'
  | 'global_multilanguage'

export interface PromoTrailerAsset {
  mp4Url: string
  aspect: PromoFrameAspect
  /** Language stream this file belongs to. Source films use `en`. */
  language?: string
  durationSec: number
  targetDurationSec: number
  beatPlan: PromoTrailerBeatPlan[]
  renderedAt: string
  status: 'ready' | 'rendering' | 'error'
  error?: string
  /** Optional campaign id this render belongs to. */
  promoId?: string
}

export interface PromoCampaignConfig {
  /** Unique promo campaign id (matches promoScene.id or promoScene.promoId). */
  id: string
  /** Display name of the promo campaign (e.g., "Theatrical Trailer", "Social Vertical Hook"). */
  name: string
  /** Intelligent marketing campaign preset. */
  preset?: PromoCampaignPresetId
  /** Custom campaign objective or marketing hook note. */
  campaignObjective?: string
  /** Target audience definition for this specific campaign. */
  audienceDefinition?: AudienceDefinition
  targetDurationSec?: number
  aspect?: PromoFrameAspect
  /** Active language selected for this campaign. */
  primaryLanguage?: string
  /** Languages enabled for this campaign (multilanguage support). */
  languages?: string[]
  watermarkEnabled?: boolean
  narrationStartShotKey?: string
  /** Rendered promo assets per language for this campaign. */
  trailersByLanguage?: Record<string, PromoTrailerAsset>
  trailer?: PromoTrailerAsset
  createdAt?: string
  updatedAt?: string
}

export interface ProjectPublishingPromo {
  /** Source-language render. Kept so Screening and Ship keep a single trailer. */
  trailer?: PromoTrailerAsset
  /** One rendered promo per language. The source language is also copied onto `trailer`. */
  trailersByLanguage?: Record<string, PromoTrailerAsset>
  shorts?: ShortFormClipSpec[]
  /** Audience the shot plan was composed for. Same shape as Audience Resonance. */
  audienceDefinition?: AudienceDefinition
  targetDurationSec?: number
  aspect?: PromoFrameAspect
  /** Languages the user has opened a promo stream for. */
  languages?: string[]
  /** Missing means the SceneFlow Studio watermark is burned into the promo. */
  watermarkEnabled?: boolean
  /** Included shot where narration begins. Missing starts with the first shot. */
  narrationStartShotKey?: string
  /** Currently active promo campaign id. */
  activePromoId?: string
  /** Multiple targeted marketing promo campaigns. */
  campaigns?: PromoCampaignConfig[]
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
  /** Prepared scene, chapter, master, and promo packages. */
  units?: PublishUnitRecord[]
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

export type PublishingLibraryTab = 'streams' | 'screening' | 'promo' | 'youtube' | 'ship'
