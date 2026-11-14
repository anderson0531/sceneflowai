import '@/models'
import GenerationJob, {
  type GenerationJobStatus,
  type GenerationJobType,
} from '@/models/GenerationJob'
import Notification, { type NotificationType } from '@/models/Notification'
import User from '@/models/User'
import { companionOpenPath } from '@/lib/companion/feedbackNotification'
import { sendWebPushToUser } from '@/lib/notifications/webPush'
import { buildOfficialEmail } from '@/lib/email/officialEmail'
import { getAppBaseUrl, sendEmail } from '@/lib/email/resendClient'
import { inngest } from '@/inngest/client'
import { sequelize } from '@/config/database'
import { ACTIVE_JOB_STATUSES } from '@/lib/jobs/jobStatus'
import { isInngestDispatchConfigured } from '@/lib/jobs/inngestDispatch'
import { isStaleActiveJob, STALE_JOB_ERROR } from '@/lib/jobs/staleJob'
import { hasTables } from '@/lib/database/schemaProbe'

export { ACTIVE_JOB_STATUSES }

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
    // Both tables already there is the normal case, and this sits on the request
    // path for every queued job, so confirm with one lookup before issuing DDL.
    if (await hasTables(['generation_jobs', 'notifications'])) {
      notificationsSchemaCompleted = true
      return
    }

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
  /**
   * Send `generation/job.queued`. Batch callers set this false and send
   * `generation/batch.queued` themselves — emitting both would hand the same
   * job to `processGenerationJob` and `processBatchGenerationJob` at once.
   */
  dispatch?: boolean
}): Promise<{ job: GenerationJob; dispatched: boolean }> {
  await ensureNotificationsSchema()
  const job = await GenerationJob.create({
    user_id: input.userId,
    project_id: input.projectId,
    job_type: input.jobType,
    payload: input.payload,
    status: 'queued',
    progress: 0,
  })

  if (input.dispatch === false) {
    return { job, dispatched: false }
  }

  // Leave status=queued when undispatched: callers (guided revise, AR) fall back
  // to an HTTP step worker when Inngest is missing or send fails.
  if (!isInngestDispatchConfigured()) {
    console.warn(
      '[jobService] INNGEST_EVENT_KEY not set — job not dispatched (caller must handle)'
    )
    return { job, dispatched: false }
  }

  let dispatched = false
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
    dispatched = true
  } catch (err) {
    console.warn(
      '[jobService] Inngest send failed — job not dispatched (caller must handle):',
      err
    )
  }

  return { job, dispatched }
}

export async function updateGenerationJob(
  jobId: string,
  patch: Partial<{
    status: GenerationJobStatus
    progress: number
    result: Record<string, unknown> | null
    error: string | null
    payload: Record<string, unknown>
  }>
): Promise<void> {
  const updates: Record<string, unknown> = { ...patch }
  if (
    patch.status === 'completed' ||
    patch.status === 'failed' ||
    patch.status === 'cancelled'
  ) {
    updates.completed_at = new Date()
  }
  await GenerationJob.update(updates, { where: { id: jobId } })
}

/** Shallow-merge keys onto generation_jobs.payload (used by step worker state). */
export async function patchGenerationJobPayload(
  jobId: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const job = await GenerationJob.findByPk(jobId)
  if (!job) throw new Error('Job not found')
  const current = (job.payload ?? {}) as Record<string, unknown>
  const next = { ...current, ...patch }
  job.payload = next
  job.changed('payload', true)
  await job.save()
  return next
}

export async function sendJobNotificationEmail(input: {
  userId: string
  projectId?: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<boolean> {
  const user = await User.findByPk(input.userId)
  const email = user?.email?.trim().toLowerCase()
  if (!email || !email.includes('@') || email.endsWith('@temp.sceneflow.ai')) {
    return false
  }

  const baseUrl = getAppBaseUrl()
  const rawProductionPath =
    typeof input.metadata?.productionUrl === 'string' && input.metadata.productionUrl.trim()
      ? input.metadata.productionUrl.trim()
      : input.projectId
        ? `/dashboard/workflow/vision/${input.projectId}`
        : '/dashboard'
  const ctaUrl = rawProductionPath.startsWith('http')
    ? rawProductionPath
    : `${baseUrl}${rawProductionPath.startsWith('/') ? '' : '/'}${rawProductionPath}`

  const isFailed = input.type === 'job_failed'
  const ctaLabel = isFailed ? 'Open Project in SceneFlow' : 'Open Production Stage'
  const followUpParagraph = isFailed
    ? 'Open your project in SceneFlow Studio to review the status and retry generation.'
    : 'Your script is saved and ready in the Production Stage. Open SceneFlow Studio to review your scenes, run Audience Resonance, or direct your shots.'

  const { html, text } = buildOfficialEmail({
    preheader: input.message,
    heading: input.title,
    paragraphs: [input.message, followUpParagraph],
    ctaLabel,
    ctaUrl,
    whyReceived:
      'You received this email because a background generation job completed in your SceneFlow Studio account.',
    unsubscribeUrl: `${baseUrl}/dashboard/settings`,
  })

  await sendEmail({
    to: email,
    subject: input.title,
    html,
    text,
    allowFallbackFrom: true,
  })
  return true
}

export async function notifyUser(input: {
  userId: string
  projectId?: string
  jobId?: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
  sendEmail?: boolean
}): Promise<void> {
  await ensureNotificationsSchema()

  const fanOutToStakeholders =
    Boolean(input.projectId) &&
    (input.type === 'feedback' || input.type.startsWith('client_'))

  let recipientIds = [input.userId]
  if (fanOutToStakeholders && input.projectId) {
    try {
      const { listProjectStakeholderUserIds } = await import(
        '@/lib/producer/workspaceProjectsQuery'
      )
      recipientIds = await listProjectStakeholderUserIds(input.projectId, input.userId)
    } catch {
      recipientIds = [input.userId]
    }
  }

  const pushUrl = companionOpenPath({
    type: input.type,
    projectId: input.projectId,
    metadata: input.metadata,
  })

  for (const targetUserId of recipientIds) {
    await Notification.create({
      user_id: targetUserId,
      project_id: input.projectId ?? null,
      job_id: input.jobId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata ?? null,
      read: false,
    })
    try {
      await sendWebPushToUser(targetUserId, {
        title: input.title,
        message: input.message,
        url: pushUrl,
      })
    } catch (error) {
      console.error('[notifyUser] web push failed', error)
    }
  }

  const shouldSendEmail =
    input.sendEmail === true || input.metadata?.kind === 'script_generation'
  if (shouldSendEmail) {
    try {
      await sendJobNotificationEmail(input)
    } catch (error) {
      console.error('[notifyUser] email notification failed', error)
    }
  }
}

/** Mark stuck queued/processing jobs as failed so new work can start. */
export async function expireStaleActiveJob(job: GenerationJob): Promise<boolean> {
  if (!isStaleActiveJob(job)) return false
  await updateGenerationJob(job.id, {
    status: 'failed',
    error: STALE_JOB_ERROR,
  })
  return true
}

export async function cancelGenerationJob(jobId: string, userId: string): Promise<boolean> {
  const job = await getJobForUser(jobId, userId)
  if (!job || !ACTIVE_JOB_STATUSES.includes(job.status)) return false
  await updateGenerationJob(jobId, {
    status: 'cancelled',
    error: 'Cancelled by user',
  })
  return true
}

/**
 * Cancel every active job of a type for a project (clears stuck queued AR, etc.).
 */
export async function cancelActiveJobsForProject(input: {
  userId: string
  projectId: string
  jobType: GenerationJobType
}): Promise<{ cancelledIds: string[] }> {
  const jobs = await listJobsForUser(input.userId, input.projectId, { activeOnly: true })
  const cancelledIds: string[] = []
  for (const job of jobs) {
    if (job.job_type !== input.jobType) continue
    const ok = await cancelGenerationJob(job.id, input.userId)
    if (ok) cancelledIds.push(job.id)
  }
  return { cancelledIds }
}

export async function listJobsForUser(
  userId: string,
  projectId?: string,
  options: { activeOnly?: boolean } = {}
) {
  const where: Record<string, unknown> = { user_id: userId }
  if (projectId) where.project_id = projectId
  if (options.activeOnly) where.status = ACTIVE_JOB_STATUSES
  const jobs = await GenerationJob.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50,
  })

  if (!options.activeOnly) return jobs

  const active: GenerationJob[] = []
  for (const job of jobs) {
    if (await expireStaleActiveJob(job)) continue
    active.push(job)
  }
  return active
}

/** Single job scoped to its owner, so one account cannot poll another's job. */
export async function getJobForUser(jobId: string, userId: string) {
  return GenerationJob.findOne({ where: { id: jobId, user_id: userId } })
}

/** Existing queued/processing job of a type, used to reject duplicate runs. */
export async function findActiveJob(input: {
  userId: string
  projectId: string
  jobType: GenerationJobType
}) {
  const existing = await GenerationJob.findOne({
    where: {
      user_id: input.userId,
      project_id: input.projectId,
      job_type: input.jobType,
      status: ACTIVE_JOB_STATUSES,
    },
    order: [['created_at', 'DESC']],
  })
  if (!existing) return null
  if (await expireStaleActiveJob(existing)) return null
  return existing
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
