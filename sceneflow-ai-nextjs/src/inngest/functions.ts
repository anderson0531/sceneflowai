import { inngest } from '@/inngest/client'
import { withRetry } from '@/lib/utils/retry'
import {
  notifyUser,
  updateGenerationJob,
} from '@/lib/jobs/jobService'
import { planKlingLongTake } from '@/lib/kling/longTakePlanner'
import {
  enqueueLongTakeStitch,
  finalizeLongTakeMaster,
  submitLongTakeBase,
  submitLongTakeExtend,
  submitLongTakeLipSync,
  type KlingLongTakeJobPayload,
} from '@/lib/kling/longTakeOrchestrator'
import { getKlingLongTakeCredits } from '@/lib/credits/creditCosts'
import { CreditService } from '@/services/CreditService'
import type { KlingQuality } from '@/lib/kling/types'

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
  { id: 'process-generation-job', retries: 5, triggers: [{ event: 'generation/job.queued' }] },
  async ({ event, step }) => {
    const { jobId, userId, projectId, jobType, payload } = event.data as {
      jobId: string
      userId: string
      projectId: string
      jobType: string
      payload: Record<string, unknown>
    }

    if (jobType === 'kling_long_take') {
      return { ok: true, delegated: 'process-kling-long-take' }
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
  { id: 'process-batch-generation-job', retries: 3, triggers: [{ event: 'generation/batch.queued' }] },
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

export const processKlingLongTake = inngest.createFunction(
  {
    id: 'process-kling-long-take',
    retries: 2,
    triggers: [{ event: 'generation/job.queued', if: 'event.data.jobType == "kling_long_take"' }],
  },
  async ({ event, step }) => {
    const { jobId, userId, projectId, payload } = event.data as {
      jobId: string
      userId: string
      projectId: string
      payload: KlingLongTakeJobPayload
    }

    const longTakePayload: KlingLongTakeJobPayload = {
      ...payload,
      generationJobId: jobId,
      userId,
      projectId,
    }

    const plan = planKlingLongTake({
      targetSeconds: longTakePayload.targetSeconds,
      model: longTakePayload.model,
    })

    await step.run('mark-processing', async () => {
      await updateGenerationJob(jobId, { status: 'processing', progress: 5 })
    })

    try {
      const base = await step.run('submit-base', async () =>
        submitLongTakeBase(longTakePayload)
      )

      const baseEvent = await step.waitForEvent('wait-kling-base', {
        event: 'kling/task.completed',
        timeout: '30m',
        if: `event.data.taskId == "${base.taskId}"`,
      })

      const baseData = baseEvent?.data as {
        videoUrl?: string
        videoId?: string
        status?: string
        error?: string
      }
      if (!baseData?.videoUrl || baseData.status === 'failed') {
        throw new Error(baseData?.error || 'Kling base clip failed')
      }

      let clipUrls = [baseData.videoUrl]
      let currentVideoId = baseData.videoId
      await updateGenerationJob(jobId, { progress: 20 })

      for (let i = 0; i < plan.extensions; i++) {
        if (!currentVideoId) {
          throw new Error('Kling extend chain missing video_id from previous step')
        }

        const ext = await step.run(`submit-extend-${i}`, async () =>
          submitLongTakeExtend({
            payload: longTakePayload,
            videoId: currentVideoId!,
            stepIndex: i + 1,
            totalExtendSteps: plan.extensions,
            clipUrls,
          })
        )

        const extEvent = await step.waitForEvent(`wait-kling-extend-${i}`, {
          event: 'kling/task.completed',
          timeout: '30m',
          if: `event.data.taskId == "${ext.taskId}"`,
        })

        const extData = extEvent?.data as {
          videoUrl?: string
          videoId?: string
          status?: string
          error?: string
        }
        if (!extData?.videoUrl || extData.status === 'failed') {
          throw new Error(extData?.error || `Kling extend step ${i + 1} failed`)
        }

        clipUrls = [...clipUrls, extData.videoUrl]
        currentVideoId = extData.videoId || currentVideoId
        await updateGenerationJob(jobId, {
          progress: 20 + Math.round(((i + 1) / Math.max(1, plan.extensions)) * 35),
        })
      }

      const stitch = await step.run('enqueue-stitch', async () =>
        enqueueLongTakeStitch({
          payload: longTakePayload,
          clipUrls,
        })
      )

      const stitchEvent = await step.waitForEvent('wait-stitch', {
        event: 'render/stitch.completed',
        timeout: '30m',
        if: `event.data.jobId == "${stitch.stitchJobId}"`,
      })

      const stitchData = stitchEvent?.data as {
        outputUrl?: string
        status?: string
        error?: string
      }
      if (!stitchData?.outputUrl || stitchData.status === 'FAILED') {
        throw new Error(stitchData?.error || 'FFmpeg stitch failed')
      }

      await updateGenerationJob(jobId, { progress: 70 })

      const lipsync = await step.run('submit-lipsync', async () =>
        submitLongTakeLipSync({
          payload: longTakePayload,
          masterVideoUrl: stitchData.outputUrl!,
        })
      )

      const lipEvent = await step.waitForEvent('wait-lipsync', {
        event: 'kling/task.completed',
        timeout: '30m',
        if: `event.data.taskId == "${lipsync.taskId}"`,
      })

      const lipData = lipEvent?.data as {
        videoUrl?: string
        status?: string
        error?: string
      }
      if (!lipData?.videoUrl || lipData.status === 'failed') {
        throw new Error(lipData?.error || 'Kling lip-sync failed')
      }

      const finalized = await step.run('finalize-master', async () =>
        finalizeLongTakeMaster({
          payload: longTakePayload,
          videoUrl: lipData.videoUrl!,
          provenance: {
            plan,
            clipCount: clipUrls.length,
            stitchJobId: stitch.stitchJobId,
          },
        })
      )

      await step.run('charge-credits', async () => {
        const credits = getKlingLongTakeCredits({
          model: longTakePayload.model,
          quality: (longTakePayload.quality as KlingQuality) || 'pro',
          plan,
          masterSeconds: plan.totalSeconds,
        })
        await CreditService.charge(userId, credits, 'ai_usage', projectId, {
          operation: 'kling_long_take',
          segmentId: longTakePayload.segmentId,
          beatId: longTakePayload.beatId,
        })
      })

      await step.run('complete', async () => {
        await updateGenerationJob(jobId, {
          status: 'completed',
          progress: 100,
          result: {
            assetUrl: finalized.assetUrl,
            segmentId: longTakePayload.segmentId,
            beatId: longTakePayload.beatId,
            totalSeconds: plan.totalSeconds,
            warnings: plan.warnings,
          },
        })
        await notifyUser({
          userId,
          projectId,
          jobId,
          type: 'job_completed',
          title: 'Long-form dialogue video ready',
          message: `Kling long-take (${plan.totalSeconds}s) finished for beat ${longTakePayload.beatId}.`,
        })
      })

      return { ok: true, assetUrl: finalized.assetUrl }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Long-take job failed'
      await step.run('fail', async () => {
        await updateGenerationJob(jobId, { status: 'failed', error: message })
        await notifyUser({
          userId,
          projectId,
          jobId,
          type: 'job_failed',
          title: 'Long-form dialogue failed',
          message,
        })
      })
      throw err
    }
  }
)

export const inngestFunctions = [processGenerationJob, processBatchGenerationJob, processKlingLongTake]
