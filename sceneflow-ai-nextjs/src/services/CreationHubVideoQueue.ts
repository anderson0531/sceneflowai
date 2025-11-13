import { calculateVideoCost } from '@/lib/cost/videoCalculator'
import { CreditService } from './CreditService'
import Project from '@/models/Project'
import type { CreationSceneAsset, VideoModelKey } from '@/components/creation/types'

interface SubmitJobOptions {
  projectId: string
  sceneId: string
  userId: string
  prompt: string
  durationSec: number
  modelKey: VideoModelKey
  markupPercent: number
  fixedFeePerClip: number
  characterIds?: string[]
}

export interface CreationHubJob {
  id: string
  projectId: string
  sceneId: string
  userId: string
  prompt: string
  durationSec: number
  modelKey: VideoModelKey
  markupPercent: number
  fixedFeePerClip: number
  characterIds?: string[]
  status: 'queued' | 'processing' | 'completed' | 'failed'
  asset?: CreationSceneAsset
  error?: string
  createdAt: string
  updatedAt: string
}

interface JobTimers {
  processingTimer: NodeJS.Timeout
  completionTimer: NodeJS.Timeout
}

const PLACEHOLDER_VIDEOS = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
]

const PLACEHOLDER_THUMBNAILS = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d',
  'https://images.unsplash.com/photo-1521302200778-33500795e128',
]

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export class CreationHubVideoQueue {
  private static instance: CreationHubVideoQueue
  private jobs = new Map<string, CreationHubJob>()
  private timers = new Map<string, JobTimers>()

  public static getInstance(): CreationHubVideoQueue {
    if (!CreationHubVideoQueue.instance) {
      CreationHubVideoQueue.instance = new CreationHubVideoQueue()
    }
    return CreationHubVideoQueue.instance
  }

  public submitJob(options: SubmitJobOptions): CreationHubJob {
    const jobId = `veo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()

    const job: CreationHubJob = {
      id: jobId,
      projectId: options.projectId,
      sceneId: options.sceneId,
      userId: options.userId,
      prompt: options.prompt,
      durationSec: Math.max(4, options.durationSec),
      modelKey: options.modelKey,
      markupPercent: options.markupPercent,
      fixedFeePerClip: options.fixedFeePerClip,
      characterIds: options.characterIds,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    }

    this.jobs.set(jobId, job)

    const processingTimer = setTimeout(() => {
      const current = this.jobs.get(jobId)
      if (!current || current.status !== 'queued') return
      current.status = 'processing'
      current.updatedAt = new Date().toISOString()
      this.jobs.set(jobId, current)
    }, 1000)

    const completionTimer = setTimeout(() => {
      const current = this.jobs.get(jobId)
      if (!current || current.status === 'failed') return
      this.completeJob(current).catch((error) => {
        console.error('[CreationHubVideoQueue] Failed to complete job', error)
        const failed = this.jobs.get(jobId)
        if (!failed) return
        failed.status = 'failed'
        failed.error = error instanceof Error ? error.message : 'Generation failed'
        failed.updatedAt = new Date().toISOString()
        this.jobs.set(jobId, failed)
      })
    }, 4000)

    this.timers.set(jobId, { processingTimer, completionTimer })
    return job
  }

  public getJobsForProject(projectId: string): CreationHubJob[] {
    return Array.from(this.jobs.values()).filter((job) => job.projectId === projectId)
  }

  public getJob(jobId: string): CreationHubJob | undefined {
    return this.jobs.get(jobId)
  }

  private async completeJob(job: CreationHubJob): Promise<void> {
    const placeholderSource = PLACEHOLDER_VIDEOS[Math.floor(Math.random() * PLACEHOLDER_VIDEOS.length)]
    const placeholderThumb = PLACEHOLDER_THUMBNAILS[Math.floor(Math.random() * PLACEHOLDER_THUMBNAILS.length)]

    const clipCount = Math.max(1, Math.ceil(job.durationSec / 10))
    const costBreakdown = calculateVideoCost(clipCount, job.modelKey, job.markupPercent, job.fixedFeePerClip)
    const chargedCredits = CreditService.usdToCredits(costBreakdown.totalUserCost)

    const asset: CreationSceneAsset = {
      id: job.id,
      type: 'generated_video',
      name: job.prompt.slice(0, 80) || 'Generated Clip',
      durationSec: job.durationSec,
      createdAt: new Date().toISOString(),
      sourceUrl: placeholderSource,
      thumbnailUrl: `${placeholderThumb}?auto=format&fit=crop&w=600&q=80`,
      status: 'ready',
      meta: {
        jobId: job.id,
        modelKey: job.modelKey,
        clipCount,
        chargedCredits,
        costUsd: costBreakdown.totalUserCost,
      },
    }

    job.status = 'completed'
    job.asset = asset
    job.updatedAt = new Date().toISOString()
    this.jobs.set(job.id, job)

    await Promise.all([
      this.logUsage(job, costBreakdown.totalProviderCost, chargedCredits),
      this.updateProjectMetadata(job, asset, chargedCredits),
    ])
  }

  private async logUsage(job: CreationHubJob, providerCostUsd: number, chargedCredits: number) {
    try {
      await CreditService.logUsage({
        user_id: job.userId,
        route: '/api/creation/video/jobs',
        provider: 'sceneflow-ai',
        model: job.modelKey,
        category: 'video',
        request_id: job.id,
        byok: false,
        input_tokens: 0,
        output_tokens: 0,
        image_count: 0,
        cogs_usd: providerCostUsd,
        markup_multiplier: job.markupPercent + 1,
        charged_credits: chargedCredits,
        status: 'success',
        created_at: new Date(),
        updated_at: new Date(),
      } as any)
    } catch (error) {
      console.warn('[CreationHubVideoQueue] Failed to log usage', error)
    }
  }

  private async updateProjectMetadata(job: CreationHubJob, asset: CreationSceneAsset, chargedCredits: number) {
    try {
      const project = await Project.findByPk(job.projectId)
      if (!project) return

      const metadata = project.metadata || {}
      const creationHub = metadata.creationHub || {}
      const scenes = creationHub.scenes || {}

      const sceneKey = job.sceneId
      const sceneEntry: any = (scenes as any)[sceneKey] || {}
      const existingAssets: CreationSceneAsset[] = Array.isArray(sceneEntry.assets)
        ? sceneEntry.assets
        : []

      const updatedAssets = [...existingAssets.filter((item) => item.id !== asset.id), asset]
      sceneEntry.assets = updatedAssets

      const metrics = creationHub.metrics || {}
      metrics.creditsUsed = toNumber(metrics.creditsUsed) + chargedCredits
      metrics.generatedDurationSec = toNumber(metrics.generatedDurationSec) + asset.durationSec!
      metrics.totalAssets = Object.values(scenes).reduce((sum: number, entry: any) => {
        const count = Array.isArray(entry?.assets) ? entry.assets.length : 0
        return sum + count
      }, updatedAssets.length)

      (scenes as any)[sceneKey] = sceneEntry

      creationHub.scenes = scenes
      creationHub.metrics = metrics
      creationHub.lastUpdated = new Date().toISOString()

      metrics.totalAssets = Object.values(creationHub.scenes).reduce((sum: number, entry: any) => {
        const count = Array.isArray(entry?.assets) ? entry.assets.length : 0
        return sum + count
      }, 0)

      await project.update({ metadata: { ...metadata, creationHub } })
    } catch (error) {
      console.warn('[CreationHubVideoQueue] Failed to update project metadata', error)
    }
  }
}

export const creationHubVideoQueue = CreationHubVideoQueue.getInstance()
