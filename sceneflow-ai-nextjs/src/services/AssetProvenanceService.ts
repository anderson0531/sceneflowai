/**
 * AssetProvenanceService — uniform SHA-256 hash + HMAC sidecar for Veo and Kling outputs.
 */

import * as crypto from 'crypto'
import AssetProvenanceLog, {
  type GenerativeModelSource,
  type GenerationProviderSource,
} from '@/models/AssetProvenanceLog'
import { enqueueC2paSigning } from '@/lib/provenance/c2paWorkflow'

const PROVENANCE_VERSION = '1.0'

export interface VideoProvenanceInput {
  videoBuffer: Buffer
  userId: string
  projectId: string
  sceneId?: string
  segmentId: string
  generationProvider: GenerationProviderSource
  wasPolicyFallback: boolean
  vertexPolicyAttempts?: number
}

export interface VideoProvenanceStamp {
  provenanceId: string
  contentHash: string
  signature: string
  generativeModel: GenerativeModelSource
  gcsMetadata: Record<string, string>
  sidecar: Record<string, unknown>
}

export class AssetProvenanceService {
  private static readonly SIGNING_KEY =
    process.env.ASSET_PROVENANCE_SECRET || 'sceneflow-asset-provenance-dev-key'

  static resolveGenerativeModel(provider: GenerationProviderSource): GenerativeModelSource {
    return provider === 'vertex' ? 'veo-3.1' : 'kling-v3'
  }

  static computeContentHash(videoBuffer: Buffer): string {
    return crypto.createHash('sha256').update(videoBuffer).digest('hex')
  }

  static signSidecar(payload: {
    contentHash: string
    userId: string
    projectId: string
    segmentId: string
    generativeModel: GenerativeModelSource
    generationProvider: GenerationProviderSource
    signedAt: string
  }): string {
    return crypto
      .createHmac('sha256', this.SIGNING_KEY)
      .update(JSON.stringify(payload))
      .digest('hex')
  }

  /**
   * Stamp video bytes with provenance metadata and persist forensic log.
   */
  static async stampVideoAsset(input: VideoProvenanceInput): Promise<VideoProvenanceStamp> {
    const contentHash = this.computeContentHash(input.videoBuffer)
    const generativeModel = this.resolveGenerativeModel(input.generationProvider)
    const signedAt = new Date().toISOString()

    const signature = this.signSidecar({
      contentHash,
      userId: input.userId,
      projectId: input.projectId,
      segmentId: input.segmentId,
      generativeModel,
      generationProvider: input.generationProvider,
      signedAt,
    })

    const sidecar = {
      version: PROVENANCE_VERSION,
      generator: 'sceneflow-ai',
      signedAt,
      contentHash,
      signature,
      userId: input.userId,
      projectId: input.projectId,
      sceneId: input.sceneId,
      segmentId: input.segmentId,
      generativeModel,
      generationProvider: input.generationProvider,
      wasPolicyFallback: input.wasPolicyFallback,
      vertexPolicyAttempts: input.vertexPolicyAttempts,
    }

    let provenanceId: string

    try {
      const record = await AssetProvenanceLog.create({
        user_id: input.userId,
        project_id: input.projectId,
        scene_id: input.sceneId ?? null,
        segment_id: input.segmentId,
        content_hash: contentHash,
        signature,
        generative_model: generativeModel,
        generation_provider: input.generationProvider,
        was_policy_fallback: input.wasPolicyFallback,
        vertex_policy_attempts: input.vertexPolicyAttempts ?? null,
        c2pa_status: process.env.C2PA_SIGNING_ENABLED === 'true' ? 'pending' : 'skipped',
        sidecar_json: sidecar,
      })
      provenanceId = record.id
    } catch (dbErr) {
      console.warn('[AssetProvenance] DB log failed, using ephemeral id:', dbErr)
      provenanceId = crypto.randomUUID()
    }

    const gcsMetadata: Record<string, string> = {
      'x-sceneflow-content-hash': contentHash,
      'x-sceneflow-model': generativeModel,
      'x-sceneflow-provenance-id': provenanceId,
      'x-sceneflow-generation-provider': input.generationProvider,
    }

    return {
      provenanceId,
      contentHash,
      signature,
      generativeModel,
      gcsMetadata,
      sidecar,
    }
  }

  static async attachAssetUrl(provenanceId: string, assetUrl: string): Promise<void> {
    try {
      await AssetProvenanceLog.update(
        { asset_url: assetUrl },
        { where: { id: provenanceId } }
      )
    } catch (err) {
      console.warn('[AssetProvenance] Failed to attach asset URL:', err)
    }
  }

  static async scheduleC2paSigning(params: {
    provenanceId: string
    assetUrl: string
    contentHash: string
  }): Promise<void> {
    if (process.env.C2PA_SIGNING_ENABLED !== 'true') {
      return
    }

    try {
      await enqueueC2paSigning(params)
    } catch (err) {
      console.warn('[AssetProvenance] C2PA enqueue failed:', err)
      await AssetProvenanceLog.update(
        { c2pa_status: 'failed' },
        { where: { id: params.provenanceId } }
      ).catch(() => undefined)
    }
  }
}

export default AssetProvenanceService
