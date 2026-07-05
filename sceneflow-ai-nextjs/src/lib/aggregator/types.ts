import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

export type AggregatorVendor = 'renderful' | 'pollo' | 'glio' | 'reapi' | 'fal'

export type AggregatorJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface AggregatorVideoInput {
  prompt: string
  negativePrompt?: string
  method: VideoGenerationMethod
  videoModel: string
  durationSeconds?: number
  aspectRatio?: '16:9' | '9:16'
  startFrameUrl?: string
  endFrameUrl?: string
  referenceImages?: Array<{ url: string; type?: string; name?: string; role?: string }>
}

export interface AggregatorSubmitOptions {
  webhookUrl?: string
}

export interface AggregatorSubmitResult {
  jobId: string
  vendor: AggregatorVendor
  vendorModelId: string
}

export interface AggregatorPollResult {
  status: AggregatorJobStatus
  videoUrl?: string
  error?: string
}

export interface AggregatorWebhookPayload {
  jobId: string
  status: AggregatorJobStatus
  videoUrl?: string
  error?: string
  vendorModelId?: string
}

export interface AggregatorModelEntry {
  id: string
  label: string
  vendorModelId: string
  /** Keywords matched against Renderful catalog entry name/id (normalized). */
  matchKeywords: string[]
  /** Keywords that disqualify a catalog entry when present in name/id. */
  excludeKeywords?: string[]
  /** Optional quality tier hint (e.g. turbo, pro, std). */
  qualityTier?: string
  /** Renderful generation types this UI model supports (text-to-video, etc.). */
  supportedRenderfulTypes?: string[]
  polloEndpoint?: string
  methods: VideoGenerationMethod[]
  costPerSecondUsd: number
  nativeAudio?: boolean
}

export interface VideoAggregatorAdapter {
  readonly vendor: AggregatorVendor
  submitJob(input: AggregatorVideoInput, options?: AggregatorSubmitOptions): Promise<AggregatorSubmitResult>
  pollJob(jobId: string): Promise<AggregatorPollResult>
  parseWebhook(body: unknown): AggregatorWebhookPayload | null
  verifyWebhookSignature(headers: Headers, rawBody: string): boolean
  listModels?(): Promise<string[]>
  mapMethodToModel(method: VideoGenerationMethod, modelId: string): string
}

export interface AggregatorJobRecord {
  jobId: string
  segmentId: string
  projectId: string
  sceneId: string
  userId: string
  vendor: AggregatorVendor
  vendorModelId: string
  videoModel: string
  status: AggregatorJobStatus
  assetUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export class AggregatorHttpError extends Error {
  status: number
  vendor: AggregatorVendor

  constructor(message: string, status: number, vendor: AggregatorVendor) {
    super(message)
    this.name = 'AggregatorHttpError'
    this.status = status
    this.vendor = vendor
  }
}
