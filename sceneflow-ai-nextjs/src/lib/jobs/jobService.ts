import '@/models'
import GenerationJob, {
  type GenerationJobStatus,
  type GenerationJobType,
} from '@/models/GenerationJob'
import Notification from '@/models/Notification'
import { inngest } from '@/inngest/client'
import { sequelize } from '@/config/database'

let notificationsSchemaInProgress = false
let notificationsSchemaCompleted = false

/**
 * Auto-ensure generation_jobs + notifications tables exist (mirrors CreditService migration pattern).
 */
async function ensureNotificationsSchema(): Promise<void> {
  if (notificationsSchemaCompleted) return

  if (notificationsSchemaInProgress) {
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 100))
      if (notificationsSchemaCompleted) return
    }
    throw new Error('[jobService] Notifications schema migration timeout')
  }

  notificationsSchemaInProgress = true
  try {
    console.log('[jobService] Auto-running generation_jobs + notifications schema migration...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS generation_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        project_id UUID NOT NULL,
        job_type VARCHAR(48) NOT NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'queued',
        progress INTEGER NOT NULL DEFAULT 0,
        payload JSONB NOT NULL DEFAULT '{}',
        result JSONB,
        error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        project_id UUID,
        job_id UUID,
        type VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_project ON generation_jobs(user_id, project_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
    `)
    notificationsSchemaCompleted = true
    console.log('[jobService] Notifications schema migration completed successfully')
  } catch (error) {
    console.error('[jobService] Notifications schema migration failed:', error)
    throw error
  } finally {
    notificationsSchemaInProgress = false
  }
}

export async function createGenerationJob(input: {
  userId: string
  projectId: string
  jobType: GenerationJobType
  payload: Record<string, unknown>
}): Promise<GenerationJob> {
  await ensureNotificationsSchema()
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
  await ensureNotificationsSchema()
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
  await ensureNotificationsSchema()
  return Notification.findAll({
    where: {
      user_id: userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    order: [['created_at', 'DESC']],
    limit: 100,
  })
}
