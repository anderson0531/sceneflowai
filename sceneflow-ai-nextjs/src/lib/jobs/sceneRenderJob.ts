import '@/models'
import { Op } from 'sequelize'
import GenerationJob from '@/models/GenerationJob'
import Project from '@/models/Project'
import {
  createGenerationJob,
  findActiveJob,
  notifyUser,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import { ACTIVE_JOB_STATUSES } from '@/lib/jobs/jobStatus'
import { getJobStatusAsync } from '@/lib/render/jobStatusStore'
import { getSignedDownloadUrl } from '@/lib/gcs/renderStorage'
import { mergeSceneProductionData } from '@/lib/storyboard/mergeProductionMedia'
import { getNextProductionStreamVersion } from '@/components/vision/scene-production/defaults'
import type {
  ProductionStream,
  SceneProductionData,
} from '@/components/vision/scene-production/types'

export type SceneRenderMode = 'cloud' | 'headless'

export type SceneRenderJobPayload = {
  renderJobId: string
  sceneId: string
  sceneNumber: number
  language: string
  languageLabel: string
  streamType: 'video' | 'animatic'
  durationSeconds?: number
  mode: SceneRenderMode
}

const TERMINAL = new Set(['completed', 'failed', 'cancelled'])

function payloadOf(job: GenerationJob): SceneRenderJobPayload | null {
  const payload = (job.payload ?? {}) as Partial<SceneRenderJobPayload>
  if (!payload.renderJobId || !payload.sceneId) return null
  return {
    renderJobId: payload.renderJobId,
    sceneId: payload.sceneId,
    sceneNumber: Number(payload.sceneNumber) || 0,
    language: payload.language || 'en',
    languageLabel: payload.languageLabel || payload.language || 'en',
    streamType: payload.streamType === 'animatic' ? 'animatic' : 'video',
    durationSeconds:
      typeof payload.durationSeconds === 'number' ? payload.durationSeconds : undefined,
    mode: payload.mode === 'headless' ? 'headless' : 'cloud',
  }
}

export function sceneRenderStreamId(generationJobId: string): string {
  return `scene-render-${generationJobId}`
}

/** Active mixer render for this project, if one is still queued or processing. */
export async function findActiveSceneRenderJobId(
  userId: string,
  projectId: string
): Promise<string | null> {
  const active = await findActiveJob({ userId, projectId, jobType: 'scene_render' })
  return active?.id ?? null
}

/**
 * Record a Cloud Run encode as a generation job.
 * Call only after the encode has been accepted. `dispatch: false` keeps
 * Inngest from trying to run the encode itself.
 */
export async function trackSceneRender(input: {
  userId: string
  projectId: string
  payload: SceneRenderJobPayload
}): Promise<string> {
  const { job } = await createGenerationJob({
    userId: input.userId,
    projectId: input.projectId,
    jobType: 'scene_render',
    payload: { ...input.payload },
    dispatch: false,
  })
  await updateGenerationJob(job.id, { status: 'processing', progress: 5 })
  return job.id
}

export async function findSceneRenderByRenderJobId(
  renderJobId: string
): Promise<GenerationJob | null> {
  return GenerationJob.findOne({
    where: {
      job_type: 'scene_render',
      payload: { [Op.contains]: { renderJobId } },
    },
    order: [['created_at', 'DESC']],
  })
}

async function claimTerminal(
  job: GenerationJob,
  patch: {
    status: 'completed' | 'failed'
    progress: number
    result?: Record<string, unknown> | null
    error?: string | null
  }
): Promise<boolean> {
  const [count] = await GenerationJob.update(
    {
      status: patch.status,
      progress: patch.progress,
      result: patch.result ?? null,
      error: patch.error ?? null,
      completed_at: new Date(),
    },
    {
      where: {
        id: job.id,
        status: { [Op.in]: ACTIVE_JOB_STATUSES },
      },
    }
  )
  return count > 0
}

/**
 * Append or replace this job's production stream and rendered-scene URL.
 * The stream id is the generation job id, so a repeated callback updates one row.
 */
export async function writeSceneRenderOutput(
  job: GenerationJob,
  downloadUrl: string,
  previousUrl?: string
): Promise<void> {
  const payload = payloadOf(job)
  if (!payload) return

  const project = await Project.findByPk(job.project_id)
  if (!project) return

  const metadata = ((project.metadata ?? {}) as Record<string, unknown>) || {}
  const visionPhase = ((metadata.visionPhase ?? {}) as Record<string, unknown>) || {}
  const production = ((visionPhase.production ?? {}) as Record<string, unknown>) || {}
  const scenes = ((production.scenes ?? {}) as Record<string, SceneProductionData>) || {}
  const existing = scenes[payload.sceneId]
  const streams = existing?.productionStreams ?? []
  const streamId = sceneRenderStreamId(job.id)
  const previous = streams.find((stream) => stream.id === streamId)
  const streamVersion =
    previous?.streamVersion ??
    getNextProductionStreamVersion(
      streams.filter((stream) => stream.id !== streamId),
      payload.language,
      payload.streamType
    )

  const duration =
    typeof payload.durationSeconds === 'number' && payload.durationSeconds > 0
      ? payload.durationSeconds
      : previous?.duration

  const stream: ProductionStream = {
    id: streamId,
    language: payload.language,
    languageLabel: payload.languageLabel,
    status: 'complete',
    streamType: payload.streamType,
    streamVersion,
    mp4Url: downloadUrl,
    completedAt: new Date().toISOString(),
    source: 'render',
    ...(duration !== undefined ? { duration } : {}),
  }

  const renderedSceneUrl =
    previousUrl && existing?.renderedSceneUrl && existing.renderedSceneUrl !== previousUrl
      ? existing.renderedSceneUrl
      : downloadUrl

  const incoming: SceneProductionData = {
    isSegmented: existing?.isSegmented ?? false,
    targetSegmentDuration: existing?.targetSegmentDuration ?? 10,
    segments: existing?.segments ?? [],
    productionStreams: [stream],
    renderedSceneUrl,
    renderedAt: new Date().toISOString(),
  }
  const merged = mergeSceneProductionData(existing, incoming) ?? incoming

  await project.update({
    metadata: {
      ...metadata,
      visionPhase: {
        ...visionPhase,
        production: {
          ...production,
          lastUpdated: new Date().toISOString(),
          scenes: {
            ...scenes,
            [payload.sceneId]: merged,
          },
        },
      },
    },
  })
}

function resultFor(job: GenerationJob, downloadUrl: string): Record<string, unknown> {
  const payload = payloadOf(job)
  return {
    downloadUrl,
    promoted: false,
    sceneId: payload?.sceneId,
    sceneNumber: payload?.sceneNumber,
    language: payload?.language,
    languageLabel: payload?.languageLabel,
    streamType: payload?.streamType,
    mode: payload?.mode,
    durationSeconds: payload?.durationSeconds,
  }
}

/**
 * Apply a Cloud Run callback (or a status sync) to the matching generation job.
 * A second completion is a no-op: the claim only wins while the job is active.
 */
export async function recordSceneRenderCallback(input: {
  renderJobId: string
  phase: 'progress' | 'completed' | 'failed'
  progress?: number
  downloadUrl?: string
  error?: string
}): Promise<void> {
  const job = await findSceneRenderByRenderJobId(input.renderJobId)
  if (!job || TERMINAL.has(job.status)) return

  if (input.phase === 'progress') {
    const progress = Math.max(0, Math.min(100, Math.round(input.progress ?? job.progress ?? 0)))
    await updateGenerationJob(job.id, { status: 'processing', progress })
    return
  }

  if (input.phase === 'failed') {
    const error = input.error || 'Scene render failed'
    const won = await claimTerminal(job, { status: 'failed', progress: 100, error })
    if (!won) return
    const payload = payloadOf(job)
    await notifyUser({
      userId: job.user_id,
      projectId: job.project_id,
      jobId: job.id,
      type: 'job_failed',
      title: 'Scene render failed',
      message: payload?.sceneNumber
        ? `Scene ${payload.sceneNumber} did not finish. ${error}`
        : error,
    })
    return
  }

  const downloadUrl = input.downloadUrl?.trim()
  if (!downloadUrl) {
    const won = await claimTerminal(job, {
      status: 'failed',
      progress: 100,
      error: 'Render finished without a download URL',
    })
    if (!won) return
    await notifyUser({
      userId: job.user_id,
      projectId: job.project_id,
      jobId: job.id,
      type: 'job_failed',
      title: 'Scene render failed',
      message: 'Render finished without a download URL',
    })
    return
  }

  await writeSceneRenderOutput(job, downloadUrl)
  const won = await claimTerminal(job, {
    status: 'completed',
    progress: 100,
    result: resultFor(job, downloadUrl),
    error: null,
  })
  if (!won) return

  const payload = payloadOf(job)
  const sceneLabel = payload?.sceneNumber ? `Scene ${payload.sceneNumber}` : 'Your scene'
  await notifyUser({
    userId: job.user_id,
    projectId: job.project_id,
    jobId: job.id,
    type: 'job_completed',
    title: 'Scene render ready',
    message: `${sceneLabel} is ready to watch.`,
    metadata: { sceneId: payload?.sceneId, downloadUrl },
  })
}

async function readHeadlessStatus(renderJobId: string): Promise<{
  phase: 'progress' | 'completed' | 'failed'
  progress?: number
  downloadUrl?: string
  error?: string
} | null> {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null
  }
  try {
    const { Storage } = await import('@google-cloud/storage')
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    const storage = credentialsJson
      ? new Storage({ credentials: JSON.parse(credentialsJson), projectId: JSON.parse(credentialsJson).project_id })
      : new Storage()
    const bucketName = process.env.GCS_RENDER_BUCKET || 'sceneflow-render-jobs'
    const file = storage.bucket(bucketName).file(`job-status/${renderJobId}.json`)
    const [exists] = await file.exists()
    if (!exists) return { phase: 'progress' }
    const [buf] = await file.download()
    const status = JSON.parse(buf.toString()) as {
      status?: string
      outputUrl?: string
      error?: string
    }
    if (status.status === 'complete' && status.outputUrl) {
      return { phase: 'completed', downloadUrl: status.outputUrl, progress: 100 }
    }
    if (status.status === 'failed') {
      return { phase: 'failed', error: status.error || 'Headless render failed', progress: 100 }
    }
    return { phase: 'progress' }
  } catch (error) {
    console.warn('[sceneRenderJob] Headless status read failed:', error)
    return null
  }
}

async function readCloudStatus(renderJobId: string): Promise<{
  phase: 'progress' | 'completed' | 'failed'
  progress?: number
  downloadUrl?: string
  error?: string
} | null> {
  const status = await getJobStatusAsync(renderJobId)
  if (!status) return null
  if (status.status === 'COMPLETED') {
    let downloadUrl = status.downloadUrl
    if (!downloadUrl || downloadUrl.startsWith('gs://')) {
      downloadUrl = (await getSignedDownloadUrl(renderJobId)) || downloadUrl
    }
    return { phase: 'completed', downloadUrl, progress: 100 }
  }
  if (status.status === 'FAILED') {
    return { phase: 'failed', error: status.error || 'Scene render failed', progress: 100 }
  }
  return { phase: 'progress', progress: status.progress }
}

/** Refresh one active scene_render from Cloud Run so the dock moves without a client poll loop. */
export async function syncSceneRenderJobRecord(job: GenerationJob): Promise<GenerationJob> {
  if (job.job_type !== 'scene_render' || TERMINAL.has(job.status)) return job
  const payload = payloadOf(job)
  if (!payload) return job

  const snapshot =
    payload.mode === 'headless'
      ? await readHeadlessStatus(payload.renderJobId)
      : await readCloudStatus(payload.renderJobId)
  if (!snapshot) return job

  await recordSceneRenderCallback({
    renderJobId: payload.renderJobId,
    phase: snapshot.phase,
    progress: snapshot.progress,
    downloadUrl: snapshot.downloadUrl,
    error: snapshot.error,
  })

  return (await GenerationJob.findByPk(job.id)) ?? job
}

/** Replace the signed URL with a permanent one and remember that promotion happened. */
export async function promoteSceneRenderResult(input: {
  userId: string
  jobId: string
  downloadUrl: string
}): Promise<GenerationJob | null> {
  const job = await GenerationJob.findOne({
    where: { id: input.jobId, user_id: input.userId, job_type: 'scene_render' },
  })
  if (!job || job.status !== 'completed') return null

  const previous =
    typeof job.result?.downloadUrl === 'string' ? job.result.downloadUrl : undefined
  if (job.result?.promoted === true && previous === input.downloadUrl) return job

  await writeSceneRenderOutput(job, input.downloadUrl, previous)
  const result = {
    ...(job.result ?? {}),
    downloadUrl: input.downloadUrl,
    promoted: true,
  }
  await updateGenerationJob(job.id, { result })
  job.result = result
  return job
}
