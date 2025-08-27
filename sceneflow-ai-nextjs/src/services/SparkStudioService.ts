import { Editframe } from '@editframe/editframe-js'
import { Shotstack } from 'shotstack-sdk'

export interface VideoClip {
  id: string
  sceneNumber: number
  prompt: string
  duration: number
  status: 'queued' | 'generating' | 'completed' | 'failed'
  progress: number
  videoUrl?: string
  thumbnailUrl?: string
  error?: string
  metadata?: {
    width: number
    height: number
    fps: number
    format: string
  }
}

export interface VideoAssemblyJob {
  id: string
  projectId: string
  userId: string
  clips: VideoClip[]
  status: 'queued' | 'assembling' | 'completed' | 'failed'
  progress: number
  finalVideoUrl?: string
  thumbnailUrl?: string
  error?: string
  settings: {
    quality: '1080p' | '4K' | '8K'
    format: 'mp4' | 'mov' | 'webm'
    aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
    frameRate: '24' | '30' | '60'
  }
  createdAt: Date
  updatedAt: Date
}

export interface GenerationSettings {
  quality: '1080p' | '4K' | '8K'
  format: 'mp4' | 'mov' | 'webm'
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3'
  frameRate: '24' | '30' | '60'
}

export class SparkStudioService {
  private static instance: SparkStudioService
  private editframeClient: Editframe | null = null
  private shotstackClient: Shotstack | null = null
  private assemblyJobs = new Map<string, VideoAssemblyJob>()

  private constructor() {}

  public static getInstance(): SparkStudioService {
    if (!SparkStudioService.instance) {
      SparkStudioService.instance = new SparkStudioService()
    }
    return SparkStudioService.instance
  }

  /**
   * Initialize Editframe client
   */
  private async initEditframe(apiKey: string): Promise<void> {
    try {
      this.editframeClient = new Editframe({
        apiKey,
        host: process.env.EDITFRAME_HOST || 'https://api.editframe.com'
      })
    } catch (error) {
      console.error('Failed to initialize Editframe client:', error)
      throw new Error('Editframe initialization failed')
    }
  }

  /**
   * Initialize Shotstack client
   */
  private async initShotstack(apiKey: string): Promise<void> {
    try {
      this.shotstackClient = new Shotstack({
        apiKey,
        host: process.env.SHOTSTACK_HOST || 'https://api.shotstack.io'
      })
    } catch (error) {
      console.error('Failed to initialize Shotstack client:', error)
      throw new Error('Shotstack initialization failed')
    }
  }

  /**
   * Generate video clip using AI provider (RunwayML, Stability AI, Google Veo)
   */
  async generateVideoClip(
    clip: VideoClip,
    provider: string,
    apiKey: string,
    settings: GenerationSettings
  ): Promise<VideoClip> {
    try {
      // Update clip status to generating
      clip.status = 'generating'
      clip.progress = 10

      // Initialize appropriate client based on provider
      if (provider === 'EDITFRAME') {
        await this.initEditframe(apiKey)
        return await this.generateWithEditframe(clip, settings)
      } else if (provider === 'SHOTSTACK') {
        await this.initShotstack(apiKey)
        return await this.generateWithShotstack(clip, settings)
      } else {
        // Fallback to other AI providers (RunwayML, Stability AI, Google Veo)
        return await this.generateWithAIProvider(clip, provider, apiKey, settings)
      }
    } catch (error) {
      clip.status = 'failed'
      clip.error = error instanceof Error ? error.message : 'Generation failed'
      throw error
    }
  }

  /**
   * Generate video using Editframe
   */
  private async generateWithEditframe(clip: VideoClip, settings: GenerationSettings): Promise<VideoClip> {
    if (!this.editframeClient) {
      throw new Error('Editframe client not initialized')
    }

    try {
      // Create video composition
      const composition = await this.editframeClient.createComposition({
        width: this.getResolutionWidth(settings.quality),
        height: this.getResolutionHeight(settings.quality),
        fps: parseInt(settings.frameRate),
        duration: clip.duration,
        format: settings.format
      })

      // Add text overlay for the prompt
      await composition.addText({
        text: clip.prompt,
        x: 'center',
        y: 'center',
        fontSize: 24,
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20
      })

      // Generate the video
      clip.progress = 50
      const result = await composition.generate()

      // Update clip with results
      clip.status = 'completed'
      clip.progress = 100
      clip.videoUrl = result.url
      clip.thumbnailUrl = result.thumbnailUrl
      clip.metadata = {
        width: this.getResolutionWidth(settings.quality),
        height: this.getResolutionHeight(settings.quality),
        fps: parseInt(settings.frameRate),
        format: settings.format
      }

      return clip
    } catch (error) {
      throw new Error(`Editframe generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate video using Shotstack
   */
  private async generateWithShotstack(clip: VideoClip, settings: GenerationSettings): Promise<VideoClip> {
    if (!this.shotstackClient) {
      throw new Error('Shotstack client not initialized')
    }

    try {
      // Create timeline for video generation
      const timeline = {
        tracks: [
          {
            clips: [
              {
                asset: {
                  type: 'title',
                  text: clip.prompt,
                  style: 'minimal',
                  color: '#ffffff',
                  size: 'large'
                },
                start: 0,
                length: clip.duration
              }
            ]
          }
        ]
      }

      // Submit render job
      clip.progress = 50
      const render = await this.shotstackClient.submit({
        timeline,
        output: {
          format: settings.format,
          resolution: settings.quality,
          fps: parseInt(settings.frameRate)
        }
      })

      // Poll for completion
      const result = await this.pollShotstackRender(render.id)
      
      // Update clip with results
      clip.status = 'completed'
      clip.progress = 100
      clip.videoUrl = result.url
      clip.thumbnailUrl = result.thumbnailUrl
      clip.metadata = {
        width: this.getResolutionWidth(settings.quality),
        height: this.getResolutionHeight(settings.quality),
        fps: parseInt(settings.frameRate),
        format: settings.format
      }

      return clip
    } catch (error) {
      throw new Error(`Shotstack generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate video using AI providers (RunwayML, Stability AI, Google Veo)
   */
  private async generateWithAIProvider(
    clip: VideoClip, 
    provider: string, 
    apiKey: string, 
    settings: GenerationSettings
  ): Promise<VideoClip> {
    try {
      // This would integrate with the existing AI provider system
      // For now, we'll simulate the process
      clip.progress = 30
      
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      clip.progress = 70
      
      // Simulate completion
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      clip.status = 'completed'
      clip.progress = 100
      clip.videoUrl = `https://example.com/generated/${clip.id}.mp4`
      clip.thumbnailUrl = `https://example.com/thumbnails/${clip.id}.jpg`
      clip.metadata = {
        width: this.getResolutionWidth(settings.quality),
        height: this.getResolutionHeight(settings.quality),
        fps: parseInt(settings.frameRate),
        format: settings.format
      }

      return clip
    } catch (error) {
      throw new Error(`AI provider generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Poll Shotstack render job for completion
   */
  private async pollShotstackRender(renderId: string): Promise<any> {
    if (!this.shotstackClient) {
      throw new Error('Shotstack client not initialized')
    }

    let attempts = 0
    const maxAttempts = 60 // 5 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      try {
        const status = await this.shotstackClient.getRender(renderId)
        
        if (status.status === 'done') {
          return status
        } else if (status.status === 'failed') {
          throw new Error(`Render failed: ${status.error}`)
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000))
        attempts++
      } catch (error) {
        throw new Error(`Failed to poll render status: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    throw new Error('Render timeout exceeded')
  }

  /**
   * Assemble final video from completed clips
   */
  async assembleFinalVideo(
    jobId: string,
    clips: VideoClip[],
    settings: GenerationSettings
  ): Promise<VideoAssemblyJob> {
    try {
      const job = this.assemblyJobs.get(jobId)
      if (!job) {
        throw new Error('Assembly job not found')
      }

      // Update job status
      job.status = 'assembling'
      job.progress = 20

      // Filter completed clips
      const completedClips = clips.filter(clip => clip.status === 'completed' && clip.videoUrl)
      if (completedClips.length === 0) {
        throw new Error('No completed clips available for assembly')
      }

      // Sort clips by scene number
      completedClips.sort((a, b) => a.sceneNumber - b.sceneNumber)

      // Use Editframe for final assembly (better for complex editing)
      if (this.editframeClient) {
        return await this.assembleWithEditframe(job, completedClips, settings)
      } else {
        // Fallback to Shotstack
        return await this.assembleWithShotstack(job, completedClips, settings)
      }
    } catch (error) {
      const job = this.assemblyJobs.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error = error instanceof Error ? error.message : 'Assembly failed'
      }
      throw error
    }
  }

  /**
   * Assemble video using Editframe
   */
  private async assembleWithEditframe(
    job: VideoAssemblyJob,
    clips: VideoClip[],
    settings: GenerationSettings
  ): Promise<VideoAssemblyJob> {
    if (!this.editframeClient) {
      throw new Error('Editframe client not initialized')
    }

    try {
      // Create composition for final assembly
      const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
      
      const composition = await this.editframeClient.createComposition({
        width: this.getResolutionWidth(settings.quality),
        height: this.getResolutionHeight(settings.quality),
        fps: parseInt(settings.frameRate),
        duration: totalDuration,
        format: settings.format
      })

      // Add clips sequentially
      let currentTime = 0
      for (const clip of clips) {
        if (clip.videoUrl) {
          await composition.addVideo({
            source: clip.videoUrl,
            start: currentTime,
            duration: clip.duration
          })
          currentTime += clip.duration
        }
      }

      // Generate final video
      job.progress = 80
      const result = await composition.generate()

      // Update job with results
      job.status = 'completed'
      job.progress = 100
      job.finalVideoUrl = result.url
      job.thumbnailUrl = result.thumbnailUrl
      job.updatedAt = new Date()

      return job
    } catch (error) {
      throw new Error(`Editframe assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Assemble video using Shotstack
   */
  private async assembleWithShotstack(
    job: VideoAssemblyJob,
    clips: VideoClip[],
    settings: GenerationSettings
  ): Promise<VideoAssemblyJob> {
    if (!this.shotstackClient) {
      throw new Error('Shotstack client not initialized')
    }

    try {
      // Create timeline for final assembly
      const timeline = {
        tracks: [
          {
            clips: clips.map((clip, index) => {
              let startTime = 0
              for (let i = 0; i < index; i++) {
                startTime += clips[i].duration
              }

              return {
                asset: {
                  type: 'video',
                  src: clip.videoUrl
                },
                start: startTime,
                length: clip.duration
              }
            })
          }
        ]
      }

      // Submit render job
      job.progress = 80
      const render = await this.shotstackClient.submit({
        timeline,
        output: {
          format: settings.format,
          resolution: settings.quality,
          fps: parseInt(settings.frameRate)
        }
      })

      // Poll for completion
      const result = await this.pollShotstackRender(render.id)

      // Update job with results
      job.status = 'completed'
      job.progress = 100
      job.finalVideoUrl = result.url
      job.thumbnailUrl = result.thumbnailUrl
      job.updatedAt = new Date()

      return job
    } catch (error) {
      throw new Error(`Shotstack assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get resolution width based on quality setting
   */
  private getResolutionWidth(quality: string): number {
    switch (quality) {
      case '1080p': return 1920
      case '4K': return 3840
      case '8K': return 7680
      default: return 1920
    }
  }

  /**
   * Get resolution height based on quality setting
   */
  private getResolutionHeight(quality: string): number {
    switch (quality) {
      case '1080p': return 1080
      case '4K': return 2160
      case '8K': return 4320
      default: return 1080
    }
  }

  /**
   * Create new assembly job
   */
  createAssemblyJob(
    projectId: string,
    userId: string,
    clips: VideoClip[],
    settings: GenerationSettings
  ): VideoAssemblyJob {
    const job: VideoAssemblyJob = {
      id: `assembly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      userId,
      clips,
      status: 'queued',
      progress: 0,
      settings,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.assemblyJobs.set(job.id, job)
    return job
  }

  /**
   * Get assembly job by ID
   */
  getAssemblyJob(jobId: string): VideoAssemblyJob | undefined {
    return this.assemblyJobs.get(jobId)
  }

  /**
   * Get all assembly jobs for a user
   */
  getUserAssemblyJobs(userId: string): VideoAssemblyJob[] {
    return Array.from(this.assemblyJobs.values()).filter(job => job.userId === userId)
  }

  /**
   * Update assembly job
   */
  updateAssemblyJob(jobId: string, updates: Partial<VideoAssemblyJob>): void {
    const job = this.assemblyJobs.get(jobId)
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date() })
      this.assemblyJobs.set(jobId, job)
    }
  }

  /**
   * Delete assembly job
   */
  deleteAssemblyJob(jobId: string): boolean {
    return this.assemblyJobs.delete(jobId)
  }
}
