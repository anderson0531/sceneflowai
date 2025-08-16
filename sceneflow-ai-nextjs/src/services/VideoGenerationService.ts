export interface VideoClip {
  scene_number: number
  clip_id: string
  status: 'queued' | 'rendering' | 'done' | 'failed'
  progress?: number
  estimated_completion?: Date
  error?: string
  video_url?: string
  thumbnail_url?: string
}

export interface VideoGenerationJob {
  generationId: string
  userId: string
  projectId: string
  clips: VideoClip[]
  overallStatus: 'queued' | 'rendering' | 'done' | 'failed'
  progress: number
  estimated_completion?: Date
  metadata: {
    totalClips: number
    estimatedTotalDuration: number
    provider: string
    generationStartedAt: Date
  }
}

export interface VideoStitchJob {
  stitchId: string
  generationId: string
  userId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  estimated_completion?: Date
  final_video_url?: string
  thumbnail_url?: string
  error?: string
  metadata: {
    totalDuration: number
    totalClips: number
    outputFormat: string
    outputQuality: string
    stitchStartedAt: Date
  }
}

export interface GenerationSettings {
  quality: 'standard' | 'high' | 'ultra'
  format: 'mp4' | 'mov' | 'webm'
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
  frameRate: '24' | '30' | '60'
}

export interface OutputSettings extends GenerationSettings {
  resolution: '720p' | '1080p' | '4k'
}

export class VideoGenerationService {
  private static generationJobs = new Map<string, VideoGenerationJob>()
  private static stitchJobs = new Map<string, VideoStitchJob>()

  // Start video generation for all scenes
  static async startGeneration(
    userId: string,
    projectId: string,
    sceneDirections: Array<{
      scene_number: number
      video_clip_prompt: string
      duration: number
      strength_rating: number
    }>,
    projectContext: any,
    generationSettings: GenerationSettings
  ): Promise<VideoGenerationJob> {
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneDirections,
          userId,
          projectId,
          projectContext,
          generationSettings
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start video generation')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Video generation failed')
      }

      // Create generation job
      const generationJob: VideoGenerationJob = {
        generationId: data.generationId,
        userId,
        projectId,
        clips: data.clips,
        overallStatus: 'queued',
        progress: 0,
        metadata: data.metadata
      }

      // Store job for tracking
      this.generationJobs.set(data.generationId, generationJob)

      return generationJob

    } catch (error) {
      console.error('Error starting video generation:', error)
      throw error
    }
  }

  // Check generation status
  static async checkGenerationStatus(
    generationId: string,
    userId: string
  ): Promise<VideoGenerationJob | null> {
    try {
      const response = await fetch('/api/video/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationId,
          userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check generation status')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Status check failed')
      }

      // Update stored job
      const existingJob = this.generationJobs.get(generationId)
      if (existingJob) {
        existingJob.clips = data.clips
        existingJob.overallStatus = data.overallStatus
        existingJob.progress = data.progress
        existingJob.estimated_completion = data.estimated_completion
        this.generationJobs.set(generationId, existingJob)
        return existingJob
      }

      return null

    } catch (error) {
      console.error('Error checking generation status:', error)
      throw error
    }
  }

  // Start video stitching
  static async startStitching(
    generationId: string,
    userId: string,
    clips: VideoClip[],
    outputSettings: OutputSettings
  ): Promise<VideoStitchJob> {
    try {
      // Filter only completed clips
      const completedClips = clips.filter(clip => clip.status === 'done' && clip.video_url)
      
      if (completedClips.length === 0) {
        throw new Error('No completed clips available for stitching')
      }

      const response = await fetch('/api/video/stitch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationId,
          userId,
          clips: completedClips.map(clip => ({
            scene_number: clip.scene_number,
            clip_id: clip.clip_id,
            video_url: clip.video_url!,
            duration: 10 // Default duration, should come from scene directions
          })),
          outputSettings
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start video stitching')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Video stitching failed')
      }

      // Create stitch job
      const stitchJob: VideoStitchJob = {
        stitchId: data.stitchId,
        generationId,
        userId,
        status: data.status,
        progress: data.progress,
        estimated_completion: data.estimated_completion,
        metadata: data.metadata
      }

      // Store job for tracking
      this.stitchJobs.set(data.stitchId, stitchJob)

      return stitchJob

    } catch (error) {
      console.error('Error starting video stitching:', error)
      throw error
    }
  }

  // Check stitching status
  static async checkStitchingStatus(
    stitchId: string,
    userId: string
  ): Promise<VideoStitchJob | null> {
    try {
      const response = await fetch(`/api/video/stitch?stitchId=${stitchId}&userId=${userId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to check stitching status')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Status check failed')
      }

      // Update stored job
      const existingJob = this.stitchJobs.get(stitchId)
      if (existingJob) {
        existingJob.status = data.status
        existingJob.progress = data.progress
        existingJob.estimated_completion = data.estimated_completion
        existingJob.final_video_url = data.final_video_url
        existingJob.thumbnail_url = data.thumbnail_url
        existingJob.error = data.error
        this.stitchJobs.set(stitchId, existingJob)
        return existingJob
      }

      return null

    } catch (error) {
      console.error('Error checking stitching status:', error)
      throw error
    }
  }

  // Get generation job by ID
  static getGenerationJob(generationId: string): VideoGenerationJob | undefined {
    return this.generationJobs.get(generationId)
  }

  // Get stitch job by ID
  static getStitchJob(stitchId: string): VideoStitchJob | undefined {
    return this.stitchJobs.get(stitchId)
  }

  // Get all generation jobs for a user
  static getUserGenerationJobs(userId: string): VideoGenerationJob[] {
    return Array.from(this.generationJobs.values()).filter(job => job.userId === userId)
  }

  // Get all stitch jobs for a user
  static getUserStitchJobs(userId: string): VideoStitchJob[] {
    return Array.from(this.stitchJobs.values()).filter(job => job.userId === userId)
  }

  // Clean up completed jobs (optional)
  static cleanupCompletedJobs(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    // Clean up old generation jobs
    for (const [id, job] of this.generationJobs.entries()) {
      if (job.overallStatus === 'done' || job.overallStatus === 'failed') {
        const jobAge = now - job.metadata.generationStartedAt.getTime()
        if (jobAge > maxAge) {
          this.generationJobs.delete(id)
        }
      }
    }

    // Clean up old stitch jobs
    for (const [id, job] of this.stitchJobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobAge = now - job.metadata.stitchStartedAt.getTime()
        if (jobAge > maxAge) {
          this.stitchJobs.delete(id)
        }
      }
    }
  }

  // Simulate real-time status updates (for demo purposes)
  static startStatusPolling(generationId: string, callback: (job: VideoGenerationJob) => void): () => void {
    const interval = setInterval(async () => {
      try {
        const job = this.getGenerationJob(generationId)
        if (job) {
          // Simulate status updates
          const updatedJob = await this.simulateStatusUpdate(job)
          if (updatedJob) {
            callback(updatedJob)
          }
        }
      } catch (error) {
        console.error('Error during status polling:', error)
      }
    }, 5000) // Poll every 5 seconds

    // Return cleanup function
    return () => clearInterval(interval)
  }

  // Simulate status updates (for demo purposes)
  private static async simulateStatusUpdate(job: VideoGenerationJob): Promise<VideoGenerationJob> {
    // Simulate realistic progress updates
    const updatedClips = job.clips.map(clip => {
      if (clip.status === 'queued') {
        // Start rendering after some time
        if (Math.random() > 0.7) {
          return { ...clip, status: 'rendering' as const, progress: 0 }
        }
      } else if (clip.status === 'rendering') {
        // Update progress
        const newProgress = Math.min(100, clip.progress + Math.random() * 20)
        if (newProgress >= 100) {
          return { 
            ...clip, 
            status: 'done' as const, 
            progress: 100,
            video_url: `https://example.com/videos/${clip.clip_id}.mp4`,
            thumbnail_url: `https://example.com/thumbnails/${clip.clip_id}.jpg`
          }
        } else {
          return { ...clip, progress: newProgress }
        }
      }
      return clip
    })

    // Update overall status
    const completedClips = updatedClips.filter(clip => clip.status === 'done').length
    const failedClips = updatedClips.filter(clip => clip.status === 'failed').length
    const totalClips = updatedClips.length

    let overallStatus = job.overallStatus
    let progress = Math.round((completedClips / totalClips) * 100)

    if (completedClips === totalClips) {
      overallStatus = 'done'
      progress = 100
    } else if (failedClips > 0 && completedClips === 0) {
      overallStatus = 'failed'
      progress = 0
    } else if (completedClips > 0 || updatedClips.some(clip => clip.status === 'rendering')) {
      overallStatus = 'rendering'
    }

    const updatedJob = {
      ...job,
      clips: updatedClips,
      overallStatus,
      progress
    }

    // Update stored job
    this.generationJobs.set(job.generationId, updatedJob)

    return updatedJob
  }
}
