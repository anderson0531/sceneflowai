import { ExportJob, ExportJobAttributes, ExportJobCreationAttributes, ExportJobStatus } from '@/models/ExportJob'
import { v4 as uuidv4 } from 'uuid'

export interface CreateExportJobInput {
  userId: string | null
  projectId: string | null
  payload: Record<string, any>
  metadata?: Record<string, any>
}

export interface UpdateExportJobInput {
  status?: ExportJobStatus
  progress?: number | null
  resultUrl?: string | null
  errorMessage?: string | null
  metadata?: Record<string, any> | null
}

function sanitizeProgress(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.min(1, Math.max(0, value))
}

export class ExportJobService {
  static async createJob(input: CreateExportJobInput): Promise<ExportJob> {
    const attrs: ExportJobCreationAttributes = {
      id: uuidv4(),
      user_id: input.userId ?? null,
      project_id: input.projectId ?? null,
      payload: input.payload ?? null,
      metadata: input.metadata ?? null,
      status: 'queued',
    }

    const job = await ExportJob.create(attrs)
    return job
  }

  static async getJob(jobId: string): Promise<ExportJob | null> {
    return ExportJob.findByPk(jobId)
  }

  static async listJobsForUser(userId: string, limit = 20): Promise<ExportJob[]> {
    return ExportJob.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
    })
  }

  static async updateJob(jobId: string, input: UpdateExportJobInput): Promise<ExportJob | null> {
    const job = await ExportJob.findByPk(jobId)
    if (!job) return null

    if (input.status) job.status = input.status
    if (typeof input.progress !== 'undefined') job.progress = sanitizeProgress(input.progress)
    if (typeof input.resultUrl !== 'undefined') job.result_url = input.resultUrl
    if (typeof input.errorMessage !== 'undefined') job.error_message = input.errorMessage
    if (typeof input.metadata !== 'undefined') job.metadata = input.metadata

    await job.save()
    return job
  }

  static async markStarted(jobId: string): Promise<ExportJob | null> {
    return this.updateJob(jobId, { status: 'running', progress: 0 })
  }

  static async markProgress(jobId: string, progress: number, metadata?: Record<string, any>): Promise<ExportJob | null> {
    return this.updateJob(jobId, { status: 'running', progress, metadata })
  }

  static async markCompleted(jobId: string, resultUrl: string, metadata?: Record<string, any>): Promise<ExportJob | null> {
    return this.updateJob(jobId, { status: 'completed', progress: 1, resultUrl, metadata })
  }

  static async markFailed(jobId: string, errorMessage: string, metadata?: Record<string, any>): Promise<ExportJob | null> {
    return this.updateJob(jobId, { status: 'failed', errorMessage, metadata })
  }
}
