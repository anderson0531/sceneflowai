import { IVideoGeneratorAdapter, StandardVideoRequest, StandardVideoResult, ProviderCredentials, ProviderCapabilities, ProviderStatus } from './BaseAIProviderAdapter'

export interface RunwayCredentials {
  apiKey: string
}

export class RunwayAdapter extends IVideoGeneratorAdapter {
  private readonly API_BASE_URL = 'https://api.runwayml.com/v1'
  private readonly VIDEO_GENERATION_ENDPOINT = '/video/generations'
  private readonly STATUS_ENDPOINT = '/video/generations/{id}'

  constructor() {
    const capabilities: ProviderCapabilities = {
      maxDuration: 120, // Runway supports up to 120 seconds
      supportedResolutions: ['1920x1080', '1080x1920', '1280x720', '720x1280', '2560x1440', '1440x2560'],
      supportedAspectRatios: ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
      supportsNegativePrompt: true,
      supportsCustomSettings: true,
      maxPromptLength: 2000,
      motionIntensityRange: { min: 1, max: 10 },
      qualityOptions: ['draft', 'standard', 'high', 'ultra'],
      fpsRange: { min: 24, max: 60 },
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerHour: 200
      }
    }

    super('RUNWAY', capabilities)
  }

  /**
   * Initiates the video generation process
   */
  async generate(request: StandardVideoRequest, credentials: ProviderCredentials): Promise<StandardVideoResult> {
    try {
      // Validate request against capabilities
      const validation = this.validateRequest(request)
      if (!validation.isValid) {
        return {
          status: 'FAILED',
          error_message: `Request validation failed: ${validation.errors.join(', ')}`
        }
      }

      const runwayCredentials = credentials as RunwayCredentials
      if (!runwayCredentials.apiKey) {
        return {
          status: 'FAILED',
          error_message: 'Missing Runway API key'
        }
      }

      // Convert standardized request to Runway format
      const providerRequest = this.convertToProviderFormat(request)
      
      const response = await fetch(`${this.API_BASE_URL}${this.VIDEO_GENERATION_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${runwayCredentials.apiKey}`
        },
        body: JSON.stringify(providerRequest)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Runway API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      return {
        status: 'QUEUED',
        provider_job_id: data.id,
        progress: 0,
        estimated_time_remaining: 600, // Runway typically takes 10-15 minutes
        metadata: {
          duration: request.duration || 10,
          resolution: request.resolution || '1920x1080',
          format: 'MP4',
          created_at: new Date(),
          provider: 'RUNWAY'
        }
      }

    } catch (error) {
      console.error('Runway video generation failed:', error)
      return {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Polls the provider for the status of an existing job
   */
  async check_status(provider_job_id: string, credentials: ProviderCredentials): Promise<StandardVideoResult> {
    try {
      const runwayCredentials = credentials as RunwayCredentials
      if (!runwayCredentials.apiKey) {
        return {
          status: 'FAILED',
          error_message: 'Missing Runway API key'
        }
      }

      const statusUrl = this.STATUS_ENDPOINT.replace('{id}', provider_job_id)
      const response = await fetch(`${this.API_BASE_URL}${statusUrl}`, {
        headers: {
          'Authorization': `Bearer ${runwayCredentials.apiKey}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Runway status check error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      // Map Runway status to standardized status
      let standardizedStatus: StandardVideoResult['status']
      let progress = 0
      let estimatedTimeRemaining: number | undefined

      switch (data.status) {
        case 'pending':
          standardizedStatus = 'QUEUED'
          progress = 10
          estimatedTimeRemaining = 600
          break
        case 'processing':
          standardizedStatus = 'PROCESSING'
          progress = data.progress || 50
          estimatedTimeRemaining = data.estimated_time_remaining || 300
          break
        case 'completed':
          standardizedStatus = 'COMPLETED'
          progress = 100
          break
        case 'failed':
          standardizedStatus = 'FAILED'
          break
        case 'cancelled':
          standardizedStatus = 'CANCELLED'
          break
        default:
          standardizedStatus = 'PROCESSING'
          progress = 25
          estimatedTimeRemaining = 450
      }

      return {
        status: standardizedStatus,
        provider_job_id,
        progress,
        estimated_time_remaining: estimatedTimeRemaining,
        video_url: data.output?.video_url,
        error_message: data.error?.message,
        metadata: {
          duration: data.output?.duration || 10,
          resolution: data.output?.resolution || '1920x1080',
          format: 'MP4',
          created_at: new Date(data.created_at),
          provider: 'RUNWAY'
        }
      }

    } catch (error) {
      console.error('Runway status check failed:', error)
      return {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }

  /**
   * Performs a low-cost API call to verify the credentials work
   */
  async validate_credentials(credentials: ProviderCredentials): Promise<boolean> {
    try {
      const runwayCredentials = credentials as RunwayCredentials
      if (!runwayCredentials.apiKey) {
        return false
      }

      // Test credentials by calling the user endpoint
      const response = await fetch(`${this.API_BASE_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${runwayCredentials.apiKey}`
        }
      })

      return response.ok
    } catch (error) {
      console.error('Runway credential validation failed:', error)
      return false
    }
  }

  /**
   * Cancels an ongoing video generation job
   */
  async cancel_generation(provider_job_id: string, credentials: ProviderCredentials): Promise<boolean> {
    try {
      const runwayCredentials = credentials as RunwayCredentials
      if (!runwayCredentials.apiKey) {
        return false
      }

      const cancelUrl = `${this.VIDEO_GENERATION_ENDPOINT}/${provider_job_id}/cancel`
      const response = await fetch(`${this.API_BASE_URL}${cancelUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${runwayCredentials.apiKey}`
        }
      })

      return response.ok
    } catch (error) {
      console.error('Runway cancellation failed:', error)
      return false
    }
  }

  /**
   * Gets the current provider status
   */
  async getProviderStatus(credentials: ProviderCredentials): Promise<ProviderStatus> {
    try {
      const isValid = await this.validate_credentials(credentials)
      
      if (isValid) {
        // Get quota information
        const response = await fetch(`${this.API_BASE_URL}/user`, {
          headers: {
            'Authorization': `Bearer ${(credentials as RunwayCredentials).apiKey}`
          }
        })

        if (response.ok) {
          const userData = await response.json()
          return {
            isConnected: true,
            isValid: true,
            lastTested: new Date(),
            quotaRemaining: userData.quota?.remaining || 100,
            quotaTotal: userData.quota?.total || 1000
          }
        }
      }

      return {
        isConnected: isValid,
        isValid,
        lastTested: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        isValid: false,
        lastTested: new Date()
      }
    }
  }

  /**
   * Converts standardized request to Runway format
   */
  protected convertToProviderFormat(request: StandardVideoRequest): any {
    const runwayRequest: any = {
      prompt: request.prompt,
      negative_prompt: request.negative_prompt,
      aspect_ratio: this.mapAspectRatio(request.aspect_ratio),
      duration: request.duration || 10,
      resolution: this.mapResolution(request.resolution),
      style: request.style || 'cinematic',
      quality: this.mapQuality(request.quality),
      fps: request.fps || 30,
      seed: request.seed
    }

         // Map motion intensity to Runway's motion parameters
     if (request.motion_intensity !== undefined) {
       runwayRequest.motion_bucket_id = this.mapMotionIntensity(request.motion_intensity)
     }

    // Add custom settings if supported
    if (request.custom_settings && Object.keys(request.custom_settings).length > 0) {
      runwayRequest.custom_settings = request.custom_settings
    }

    return runwayRequest
  }

  /**
   * Converts provider-specific response to standardized format
   */
  protected convertFromProviderFormat(providerResponse: any): StandardVideoResult {
    return {
      status: 'QUEUED',
      provider_job_id: providerResponse.id,
      progress: 0,
      estimated_time_remaining: 600
    }
  }

  /**
   * Maps standardized aspect ratio to Runway format
   */
  private mapAspectRatio(aspectRatio?: string): string {
    const mapping: Record<string, string> = {
      '16:9': '16:9',
      '9:16': '9:16',
      '4:3': '4:3',
      '3:4': '3:4',
      '1:1': '1:1',
      '21:9': '21:9'
    }
    return mapping[aspectRatio || '16:9'] || '16:9'
  }

  /**
   * Maps standardized resolution to Runway format
   */
  private mapResolution(resolution?: string): string {
    const mapping: Record<string, string> = {
      '1920x1080': '1920x1080',
      '1080x1920': '1080x1920',
      '1280x720': '1280x720',
      '720x1280': '720x1280',
      '2560x1440': '2560x1440',
      '1440x2560': '1440x2560'
    }
    return mapping[resolution || '1920x1080'] || '1920x1080'
  }

  /**
   * Maps standardized quality to Runway format
   */
  private mapQuality(quality?: string): string {
    const mapping: Record<string, string> = {
      'draft': 'draft',
      'standard': 'standard',
      'high': 'high',
      'ultra': 'ultra'
    }
    return mapping[quality || 'standard'] || 'standard'
  }

  /**
   * Maps standardized motion intensity (1-10) to Runway's motion bucket ID
   */
  private mapMotionIntensity(intensity: number): number {
    // Runway uses motion_bucket_id 1-127, we map our 1-10 scale to their range
    // 1-3: Low motion (1-38), 4-7: Medium motion (39-76), 8-10: High motion (77-127)
    if (intensity <= 3) {
      return Math.floor((intensity - 1) * 19) + 1 // Maps 1-3 to 1-38
    } else if (intensity <= 7) {
      return Math.floor((intensity - 4) * 12.7) + 39 // Maps 4-7 to 39-76
    } else {
      return Math.floor((intensity - 8) * 25) + 77 // Maps 8-10 to 77-127
    }
  }
}
