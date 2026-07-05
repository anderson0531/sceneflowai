import type {
  AggregatorPollResult,
  AggregatorSubmitOptions,
  AggregatorSubmitResult,
  AggregatorVideoInput,
  AggregatorWebhookPayload,
  VideoAggregatorAdapter,
} from '../types'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

/** Stub — Fal remains on the legacy policy-fallback path. */
export const falAggregatorAdapter: VideoAggregatorAdapter = {
  vendor: 'fal',

  mapMethodToModel(_method: VideoGenerationMethod, modelId: string): string {
    return modelId
  },

  async submitJob(_input: AggregatorVideoInput, _options?: AggregatorSubmitOptions): Promise<AggregatorSubmitResult> {
    throw new Error('Fal aggregator adapter not implemented — use legacy fal/klingPolicyClient fallback')
  },

  async pollJob(_jobId: string): Promise<AggregatorPollResult> {
    throw new Error('Fal aggregator adapter not implemented')
  },

  parseWebhook(_body: unknown): AggregatorWebhookPayload | null {
    return null
  },

  verifyWebhookSignature(): boolean {
    return false
  },
}
