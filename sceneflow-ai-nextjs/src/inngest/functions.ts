import { inngest } from '@/inngest/client'
import { withRetry } from '@/lib/utils/retry'
import {
  notifyUser,
  updateGenerationJob,
} from '@/lib/jobs/jobService'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

async function callInternalApi(path: string, body: Record<string, unknown>) {
  return withRetry(
    async () => {
      const res = await fetch(`${APP_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-job': process.env.INTERNAL_JOB_SECRET || 'sceneflow-internal',
        },
        body: JSON.stringify(body),
      })
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}))
        const err = new Error(data.error || 'Rate limited')
        ;(err as any).status = 429
        throw err
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `API ${path} failed: ${res.status}`)
      }
      return res.json()
    },
    { maxRetries: 5, initialDelayMs: 2000, maxDelayMs: 60000, operationName: `internal ${path}` }
  )
}

export const processGenerationJob = inngest.createFunction(
  { id: 'process-generation-job', retries: 5 },
  { event: 'generation/job.queued' },
  async ({ event, step }) => {
    const { jobId, userId, projectId, jobType, payload } = event.data as {
      jobId: string
      userId: string
      projectId: string
      jobType: string
      payload: Record<string, unknown>
    }

    await step.run('mark-processing', async () => {
      await updateGenerationJob(jobId, { status: 'processing', progress: 5 })
    })

    try {
      const result = await step.run('execute-job', async () => {
        switch (jobType) {
          case 'scene_audio':
            return callInternalApi('/api/vision/generate-scene-audio', payload)
          case 'segment_frames':
            return callInternalApi('/api/production/generate-segment-frames', payload)
          case 'segment_video':
            return callInternalApi('/api/segments/' + payload.segmentId + '/generate-asset', payload)
          case 'reference_library':
            return callInternalApi('/api/scene/generate-image', payload)
          default:
            throw new Error(`Unsupported job type: ${jobType}`)
        }
      })

      await step.run('complete', async () => {
        await updateGenerationJob(jobId, {
          status: 'completed',
          progress: 100,
          result: result as Record<string, unknown>,
        })
        await notifyUser({
          userId,
          projectId,
          jobId,
          type: 'job_completed',
          title: 'Background job complete',
          message: `${jobType.replace(/_/g, ' ')} finished successfully.`,
        })
      })

      return { ok: true }
    } catch (err: any) {
      await step.run('fail', async () => {
        await updateGenerationJob(jobId, {
          status: 'failed',
          error: err?.message || 'Job failed',
        })
        await notifyUser({
          userId,
          projectId,
          jobId,
          type: 'job_failed',
          title: 'Background job failed',
          message: err?.message || 'An error occurred during background processing.',
        })
      })
      throw err
    }
  }
)

export const processBatchGenerationJob = inngest.createFunction(
  { id: 'process-batch-generation-job', retries: 3 },
  { event: 'generation/batch.queued' },
  async ({ event, step }) => {
    const { jobId, userId, projectId, jobType, items } = event.data as {
      jobId: string
      userId: string
      projectId: string
      jobType: string
      items: Record<string, unknown>[]
    }

    await updateGenerationJob(jobId, { status: 'processing', progress: 0 })

    let completed = 0
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      await step.run(`batch-item-${i}`, async () => {
        const path =
          jobType === 'scene_audio'
            ? '/api/vision/generate-scene-audio'
            : jobType === 'segment_frames'
              ? '/api/production/generate-segment-frames'
            : jobType === 'reference_library'
              ? '/api/scene/generate-image'
              : '/api/vision/generate-characters'
        await callInternalApi(path, item)
        completed += 1
        const progress = Math.round((completed / items.length) * 100)
        await updateGenerationJob(jobId, { progress })
      })
      await step.sleep('rate-limit-gap', '1500ms')
    }

    await updateGenerationJob(jobId, { status: 'completed', progress: 100 })
    await notifyUser({
      userId,
      projectId,
      jobId,
      type: 'job_completed',
      title: 'Batch generation complete',
      message: `Finished ${items.length} ${jobType.replace(/_/g, ' ')} tasks.`,
    })
  }
)

export const inngestFunctions = [processGenerationJob, processBatchGenerationJob]
