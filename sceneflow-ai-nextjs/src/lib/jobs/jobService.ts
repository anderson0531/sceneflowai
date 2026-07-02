import '@/models'
import GenerationJob, {
  type GenerationJobStatus,
  type GenerationJobType,
} from '@/models/GenerationJob'
import Notification from '@/models/Notification'
import { inngest } from '@/inngest/client'

export async function createGenerationJob(input: {
  userId: string
  projectId: string
  jobType: GenerationJobType
  payload: Record<string, unknown>
}): Promise<GenerationJob> {
  const job = await GenerationJob.create({
    user_id: input.userId,
    project_id: input.projectId,
    job_type: input.jobType,
    payload: input.payload,
    status: 'queued',
    progress: 0,
  })

  try {
    await inngest.send({
      name: 'generation/job.queued',
      data: {
        jobId: job.id,
        userId: input.userId,
        projectId: input.projectId,
        jobType: input.jobType,
        payload: input.payload,
      },
    })
  } catch (err) {
    console.warn('[jobService] Inngest send failed, job remains queued:', err)
  }

  return job
}

export async function updateGenerationJob(
  jobId: string,
  patch: Partial<{
    status: GenerationJobStatus
    progress: number
    result: Record<string, unknown> | null
    error: string | null
  }>
): Promise<void> {
  const updates: Record<string, unknown> = { ...patch }
  if (patch.status === 'completed' || patch.status === 'failed') {
    updates.completed_at = new Date()
  }
  await GenerationJob.update(updates, { where: { id: jobId } })
}

export async function notifyUser(input: {
  userId: string
  projectId?: string
  jobId?: string
  type: 'job_completed' | 'job_failed' | 'job_progress' | 'info'
  title: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await Notification.create({
    user_id: input.userId,
    project_id: input.projectId ?? null,
    job_id: input.jobId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata ?? null,
    read: false,
  })
}

export async function listJobsForUser(userId: string, projectId?: string) {
  const where: Record<string, string> = { user_id: userId }
  if (projectId) where.project_id = projectId
  return GenerationJob.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50,
  })
}

export async function listNotificationsForUser(userId: string, unreadOnly = false) {
  return Notification.findAll({
    where: {
      user_id: userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    order: [['created_at', 'DESC']],
    limit: 100,
  })
}
