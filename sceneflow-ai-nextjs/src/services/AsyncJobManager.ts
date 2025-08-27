import { SparkStudioService, VideoClip, VideoAssemblyJob, GenerationSettings } from './SparkStudioService'

export interface JobStatus {
  id: string
  type: 'generation' | 'assembly'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  estimatedCompletion?: Date
  error?: string
  metadata?: any
}

export interface GenerationJob {
  id: string
  userId: string
  projectId: string
  clips: VideoClip[]
  provider: string
  apiKey: string
  settings: GenerationSettings
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: Date
  updatedAt: Date
}

export class AsyncJobManager {
  private static instance: AsyncJobManager
  private generationJobs = new Map<string, GenerationJob>()
  private assemblyJobs = new Map<string, VideoAssemblyJob>()
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null
  private readonly PROCESSING_INTERVAL = 5000 // 5 seconds

  private constructor() {
    this.startProcessing()
  }

  public static getInstance(): AsyncJobManager {
    if (!AsyncJobManager.instance) {
      AsyncJobManager.instance = new AsyncJobManager()
    }
    return AsyncJobManager.instance
  }

  /**
   * Start the background processing loop
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }

    this.processingInterval = setInterval(() => {
      this.processJobs()
    }, this.PROCESSING_INTERVAL)

    console.log('AsyncJobManager: Background processing started')
  }

  /**
   * Stop the background processing loop
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      this.isProcessing = false
      console.log('AsyncJobManager: Background processing stopped')
    }
  }

  /**
   * Process all queued jobs
   */
  private async processJobs(): Promise<void> {
    if (this.isProcessing) {
      return // Already processing
    }

    this.isProcessing = true

    try {
      // Process generation jobs first
      await this.processGenerationJobs()
      
      // Then process assembly jobs
      await this.processAssemblyJobs()
    } catch (error) {
      console.error('Error processing jobs:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process video generation jobs
   */
  private async processGenerationJobs(): Promise<void> {
    const queuedJobs = Array.from(this.generationJobs.values())
      .filter(job => job.status === 'queued')
      .slice(0, 3) // Process max 3 jobs at a time

    for (const job of queuedJobs) {
      try {
        await this.processGenerationJob(job)
      } catch (error) {
        console.error(`Error processing generation job ${job.id}:`, error)
        this.updateGenerationJob(job.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Processing failed'
        })
      }
    }
  }

  /**
   * Process a single generation job
   */
  private async processGenerationJob(job: GenerationJob): Promise<void> {
    // Update job status
    this.updateGenerationJob(job.id, {
      status: 'processing',
      progress: 5
    })

    const sparkStudio = SparkStudioService.getInstance()
    const completedClips: VideoClip[] = []

    // Process each clip
    for (let i = 0; i < job.clips.length; i++) {
      const clip = job.clips[i]
      
      try {
        // Update clip progress
        clip.progress = 10
        clip.status = 'generating'

        // Generate video clip
        const generatedClip = await sparkStudio.generateVideoClip(
          clip,
          job.provider,
          job.apiKey,
          job.settings
        )

        completedClips.push(generatedClip)

        // Update overall job progress
        const progress = Math.round(((i + 1) / job.clips.length) * 90) + 5
        this.updateGenerationJob(job.id, { progress })

      } catch (error) {
        console.error(`Error generating clip ${clip.id}:`, error)
        clip.status = 'failed'
        clip.error = error instanceof Error ? error.message : 'Generation failed'
      }
    }

    // Check if all clips completed successfully
    const successfulClips = completedClips.filter(clip => clip.status === 'completed')
    
    if (successfulClips.length > 0) {
      // Create assembly job
      const assemblyJob = sparkStudio.createAssemblyJob(
        job.projectId,
        job.userId,
        successfulClips,
        job.settings
      )

      this.assemblyJobs.set(assemblyJob.id, assemblyJob)

      // Mark generation job as completed
      this.updateGenerationJob(job.id, {
        status: 'completed',
        progress: 100
      })

      console.log(`Generation job ${job.id} completed. Created assembly job ${assemblyJob.id}`)
    } else {
      // All clips failed
      this.updateGenerationJob(job.id, {
        status: 'failed',
        error: 'All video clips failed to generate'
      })
    }
  }

  /**
   * Process video assembly jobs
   */
  private async processAssemblyJobs(): Promise<void> {
    const queuedJobs = Array.from(this.assemblyJobs.values())
      .filter(job => job.status === 'queued')
      .slice(0, 2) // Process max 2 assembly jobs at a time

    for (const job of queuedJobs) {
      try {
        await this.processAssemblyJob(job)
      } catch (error) {
        console.error(`Error processing assembly job ${job.id}:`, error)
        this.updateAssemblyJob(job.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Assembly failed'
        })
      }
    }
  }

  /**
   * Process a single assembly job
   */
  private async processAssemblyJob(job: VideoAssemblyJob): Promise<void> {
    const sparkStudio = SparkStudioService.getInstance()

    try {
      // Assemble final video
      const assembledJob = await sparkStudio.assembleFinalVideo(
        job.id,
        job.clips,
        job.settings
      )

      // Update local job
      this.updateAssemblyJob(job.id, {
        status: assembledJob.status,
        progress: assembledJob.progress,
        finalVideoUrl: assembledJob.finalVideoUrl,
        thumbnailUrl: assembledJob.thumbnailUrl,
        error: assembledJob.error
      })

      console.log(`Assembly job ${job.id} completed successfully`)
    } catch (error) {
      throw error
    }
  }

  /**
   * Submit a new video generation job
   */
  public submitGenerationJob(
    userId: string,
    projectId: string,
    clips: VideoClip[],
    provider: string,
    apiKey: string,
    settings: GenerationSettings
  ): string {
    const jobId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: GenerationJob = {
      id: jobId,
      userId,
      projectId,
      clips,
      provider,
      apiKey,
      settings,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.generationJobs.set(jobId, job)
    console.log(`Submitted generation job ${jobId} for project ${projectId}`)
    
    return jobId
  }

  /**
   * Get job status by ID
   */
  public getJobStatus(jobId: string): JobStatus | null {
    // Check generation jobs first
    const generationJob = this.generationJobs.get(jobId)
    if (generationJob) {
      return {
        id: generationJob.id,
        type: 'generation',
        status: generationJob.status,
        progress: generationJob.progress,
        estimatedCompletion: this.calculateEstimatedCompletion(generationJob),
        error: generationJob.error,
        metadata: {
          projectId: generationJob.projectId,
          totalClips: generationJob.clips.length,
          completedClips: generationJob.clips.filter(c => c.status === 'completed').length
        }
      }
    }

    // Check assembly jobs
    const assemblyJob = this.assemblyJobs.get(jobId)
    if (assemblyJob) {
      return {
        id: assemblyJob.id,
        type: 'assembly',
        status: assemblyJob.status,
        progress: assemblyJob.progress,
        estimatedCompletion: this.calculateEstimatedCompletion(assemblyJob),
        error: assemblyJob.error,
        metadata: {
          projectId: assemblyJob.projectId,
          totalClips: assemblyJob.clips.length,
          finalVideoUrl: assemblyJob.finalVideoUrl
        }
      }
    }

    return null
  }

  /**
   * Get all jobs for a user
   */
  public getUserJobs(userId: string): JobStatus[] {
    const jobs: JobStatus[] = []

    // Add generation jobs
    for (const job of this.generationJobs.values()) {
      if (job.userId === userId) {
        jobs.push({
          id: job.id,
          type: 'generation',
          status: job.status,
          progress: job.progress,
          estimatedCompletion: this.calculateEstimatedCompletion(job),
          error: job.error,
          metadata: {
            projectId: job.projectId,
            totalClips: job.clips.length,
            completedClips: job.clips.filter(c => c.status === 'completed').length
          }
        })
      }
    }

    // Add assembly jobs
    for (const job of this.assemblyJobs.values()) {
      if (job.userId === userId) {
        jobs.push({
          id: job.id,
          type: 'assembly',
          status: job.status,
          progress: job.progress,
          estimatedCompletion: this.calculateEstimatedCompletion(job),
          error: job.error,
          metadata: {
            projectId: job.projectId,
            totalClips: job.clips.length,
            finalVideoUrl: job.finalVideoUrl
          }
        })
      }
    }

    return jobs.sort((a, b) => new Date(b.metadata?.createdAt || 0).getTime() - new Date(a.metadata?.createdAt || 0).getTime())
  }

  /**
   * Get all jobs for a project
   */
  public getProjectJobs(projectId: string): JobStatus[] {
    const jobs: JobStatus[] = []

    // Add generation jobs
    for (const job of this.generationJobs.values()) {
      if (job.projectId === projectId) {
        jobs.push({
          id: job.id,
          type: 'generation',
          status: job.status,
          progress: job.progress,
          estimatedCompletion: this.calculateEstimatedCompletion(job),
          error: job.error,
          metadata: {
            projectId: job.projectId,
            totalClips: job.clips.length,
            completedClips: job.clips.filter(c => c.status === 'completed').length
          }
        })
      }
    }

    // Add assembly jobs
    for (const job of this.assemblyJobs.values()) {
      if (job.projectId === projectId) {
        jobs.push({
          id: job.id,
          type: 'assembly',
          status: job.status,
          progress: job.progress,
          estimatedCompletion: this.calculateEstimatedCompletion(job),
          error: job.error,
          metadata: {
            projectId: job.projectId,
            totalClips: job.clips.length,
            finalVideoUrl: job.finalVideoUrl
          }
        })
      }
    }

    return jobs.sort((a, b) => new Date(b.metadata?.createdAt || 0).getTime() - new Date(a.metadata?.createdAt || 0).getTime())
  }

  /**
   * Cancel a job
   */
  public cancelJob(jobId: string): boolean {
    // Check generation jobs
    const generationJob = this.generationJobs.get(jobId)
    if (generationJob && generationJob.status === 'queued') {
      this.updateGenerationJob(jobId, { status: 'failed', error: 'Job cancelled by user' })
      return true
    }

    // Check assembly jobs
    const assemblyJob = this.assemblyJobs.get(jobId)
    if (assemblyJob && assemblyJob.status === 'queued') {
      this.updateAssemblyJob(jobId, { status: 'failed', error: 'Job cancelled by user' })
      return true
    }

    return false
  }

  /**
   * Retry a failed job
   */
  public retryJob(jobId: string): boolean {
    // Check generation jobs
    const generationJob = this.generationJobs.get(jobId)
    if (generationJob && generationJob.status === 'failed') {
      this.updateGenerationJob(jobId, { status: 'queued', progress: 0, error: undefined })
      return true
    }

    // Check assembly jobs
    const assemblyJob = this.assemblyJobs.get(jobId)
    if (assemblyJob && assemblyJob.status === 'failed') {
      this.updateAssemblyJob(jobId, { status: 'queued', progress: 0, error: undefined })
      return true
    }

    return false
  }

  /**
   * Update generation job
   */
  private updateGenerationJob(jobId: string, updates: Partial<GenerationJob>): void {
    const job = this.generationJobs.get(jobId)
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date() })
      this.generationJobs.set(jobId, job)
    }
  }

  /**
   * Update assembly job
   */
  private updateAssemblyJob(jobId: string, updates: Partial<VideoAssemblyJob>): void {
    const job = this.assemblyJobs.get(jobId)
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date() })
      this.assemblyJobs.set(jobId, job)
    }
  }

  /**
   * Calculate estimated completion time for a job
   */
  private calculateEstimatedCompletion(job: GenerationJob | VideoAssemblyJob): Date | undefined {
    if (job.status === 'completed' || job.status === 'failed') {
      return undefined
    }

    // Rough estimation based on job type and progress
    const now = new Date()
    let estimatedMinutes = 0

    if ('clips' in job) {
      // Generation job
      const totalClips = job.clips.length
      const completedClips = job.clips.filter(c => c.status === 'completed').length
      const remainingClips = totalClips - completedClips
      
      // Estimate 2-5 minutes per clip depending on quality
      const qualityMultiplier = job.settings.quality === '4K' ? 3 : job.settings.quality === '8K' ? 5 : 2
      estimatedMinutes = remainingClips * qualityMultiplier
    } else {
      // Assembly job
      estimatedMinutes = 5 // Assembly typically takes 5-10 minutes
    }

    return new Date(now.getTime() + estimatedMinutes * 60 * 1000)
  }

  /**
   * Clean up completed jobs older than specified days
   */
  public cleanupOldJobs(daysOld: number = 7): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    // Clean up generation jobs
    for (const [jobId, job] of this.generationJobs.entries()) {
      if (job.status === 'completed' && job.updatedAt < cutoffDate) {
        this.generationJobs.delete(jobId)
      }
    }

    // Clean up assembly jobs
    for (const [jobId, job] of this.assemblyJobs.entries()) {
      if (job.status === 'completed' && job.updatedAt < cutoffDate) {
        this.assemblyJobs.delete(jobId)
      }
    }

    console.log(`AsyncJobManager: Cleaned up jobs older than ${daysOld} days`)
  }

  /**
   * Get system statistics
   */
  public getStats(): {
    totalGenerationJobs: number
    totalAssemblyJobs: number
    queuedJobs: number
    processingJobs: number
    completedJobs: number
    failedJobs: number
  } {
    const generationJobs = Array.from(this.generationJobs.values())
    const assemblyJobs = Array.from(this.assemblyJobs.values())
    const allJobs = [...generationJobs, ...assemblyJobs]

    return {
      totalGenerationJobs: generationJobs.length,
      totalAssemblyJobs: assemblyJobs.length,
      queuedJobs: allJobs.filter(job => job.status === 'queued').length,
      processingJobs: allJobs.filter(job => job.status === 'processing').length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length
    }
  }
}
