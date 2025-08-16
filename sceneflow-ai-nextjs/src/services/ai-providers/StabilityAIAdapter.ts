import { IVideoGeneratorAdapter, StandardVideoRequest, StandardVideoResult, ProviderCredentials, ProviderCapabilities, ProviderStatus } from './BaseAIProviderAdapter'

export interface StabilityAICredentials {
  apiKey: string
}

export class StabilityAIAdapter extends IVideoGeneratorAdapter {
  private readonly API_BASE_URL = 'https://api.stability.ai/v1'
  private readonly VIDEO_GENERATION_ENDPOINT = '/generation/stable-video-diffusion'
  private readonly STATUS_ENDPOINT = '/generation/stable-video-diffusion/{id}'

  constructor() {
    const capabilities: ProviderCapabilities = {
      maxDuration: 25, // Stability AI supports up to 25 seconds
      supportedResolutions: ['1024x1024', '1152x896', '896x1152', '1216x832', '832x1216', '1344x768', '768x1344'],
      supportedAspectRatios: ['1:1', '4:3', '3:4', '3:2', '2:3'],
      supportsNegativePrompt: true,
      supportsCustomSettings: true,
      maxPromptLength: 1000,
      motionIntensityRange: { min: 1, max: 10 },
      qualityOptions: ['draft', 'standard', 'high', 'ultra'],
      fpsRange: { min: 6, max: 25 },
      rateLimit: {
        requestsPerMinute: 15,
        requestsPerHour: 150
      }
    }

    super('STABILITY_AI', capabilities)
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

      const stabilityCredentials = credentials as StabilityAICredentials
      if (!stabilityCredentials.apiKey) {
        return {
          status: 'FAILED',
          error_message: 'Missing Stability AI API key'
        }
      }

      // Convert standardized request to Stability AI format
      const providerRequest = this.convertToProviderFormat(request)
      
      const response = await fetch(`${this.API_BASE_URL}${this.VIDEO_GENERATION_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stabilityCredentials.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(providerRequest)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Stability AI API error: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      
      return {
        status: 'QUEUED',
        provider_job_id: data.id || this.generateVideoId(),
        progress: 0,
        estimated_time_remaining: 300, // Stability AI typically takes 5-10 minutes
        metadata: {
          duration: request.duration || 10,
          resolution: request.resolution || '1024x1024',
          format: 'MP4',
          created_at: new Date(),
          provider: 'STABILITY_AI'
        }
      }

    } catch (error) {
      console.error('Stability AI video generation failed:', error)
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
      const stabilityCredentials = credentials as StabilityAICredentials
      if (!stabilityCredentials.apiKey) {
        return {
          status: 'FAILED',
          error_message: 'Missing Stability AI API key'
        }
      }

      const statusUrl = this.STATUS_ENDPOINT.replace('{id}', provider_job_id)
      const response = await fetch(`${this.API_BASE_URL}${statusUrl}`, {
        headers: {
          'Authorization': `Bearer ${stabilityCredentials.apiKey}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Stability AI status check error: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      
      // Map Stability AI status to standardized status
      let standardizedStatus: StandardVideoResult['status']
      let progress = 0
      let estimatedTimeRemaining: number | undefined

      switch (data.status) {
        case 'pending':
          standardizedStatus = 'QUEUED'
          progress = 10
          estimatedTimeRemaining = 300
          break
        case 'processing':
          standardizedStatus = 'PROCESSING'
          progress = data.progress || 50
          estimatedTimeRemaining = data.estimated_time_remaining || 150
          break
        case 'succeeded':
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
          estimatedTimeRemaining = 225
      }

      return {
        status: standardizedStatus,
        provider_job_id,
        progress,
        estimated_time_remaining: estimatedTimeRemaining,
        video_url: data.artifacts?.[0]?.base64,
        error_message: data.faults?.[0]?.message,
        metadata: {
          duration: data.artifacts?.[0]?.duration || 10,
          resolution: data.artifacts?.[0]?.resolution || '1024x1024',
          format: 'MP4',
          created_at: new Date(data.created_at),
          provider: 'STABILITY_AI'
        }
      }

    } catch (error) {
      console.error('Stability AI status check failed:', error)
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
      const stabilityCredentials = credentials as StabilityAICredentials
      if (!stabilityCredentials.apiKey) {
        return false
      }

      // Test credentials by calling the balance endpoint
      const response = await fetch(`${this.API_BASE_URL}/user/balance`, {
        headers: {
          'Authorization': `Bearer ${stabilityCredentials.apiKey}`,
          'Accept': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('Stability AI credential validation failed:', error)
      return false
    }
  }

  /**
   * Cancels an ongoing video generation job
   */
  async cancel_generation(provider_job_id: string, credentials: ProviderCredentials): Promise<boolean> {
    try {
      const stabilityCredentials = credentials as StabilityAICredentials
      if (!stabilityCredentials.apiKey) {
        return false
      }

      const cancelUrl = `${this.VIDEO_GENERATION_ENDPOINT}/${provider_job_id}/cancel`
      const response = await fetch(`${this.API_BASE_URL}${cancelUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stabilityCredentials.apiKey}`,
          'Accept': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      console.error('Stability AI cancellation failed:', error)
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
        // Get balance information
        const response = await fetch(`${this.API_BASE_URL}/user/balance`, {
          headers: {
            'Authorization': `Bearer ${(credentials as StabilityAICredentials).apiKey}`,
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const balanceData = await response.json()
          return {
            isConnected: true,
            isValid: true,
            lastTested: new Date(),
            quotaRemaining: balanceData.credits || 100,
            quotaTotal: balanceData.total_credits || 1000
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
   * Converts standardized request to Stability AI format
   */
  protected convertToProviderFormat(request: StandardVideoRequest): any {
    const { width, height } = this.parseResolution(request.resolution || '1024x1024')
    
    const stabilityRequest: any = {
      text_prompts: [
        {
          text: request.prompt,
          weight: 1
        }
      ],
      cfg_scale: 7.5,
      height: height,
      width: width,
      steps: this.mapQualityToSteps(request.quality),
      seed: request.seed || Math.floor(Math.random() * 1000000),
      samples: 1
    }

    // Add negative prompt if provided
    if (request.negative_prompt) {
      stabilityRequest.text_prompts.push({
        text: request.negative_prompt,
        weight: -1
      })
    }

    // Map motion intensity to Stability AI's motion parameters
    if (request.motion_intensity !== undefined) {
      stabilityRequest.motion_bucket_id = this.mapMotionIntensity(request.motion_intensity)
    }

    // Map duration to frames (Stability AI works with frames)
    if (request.duration) {
      const fps = request.fps || 6
      stabilityRequest.frames = Math.floor(request.duration * fps)
    }

    // Add custom settings if supported
    if (request.custom_settings && Object.keys(request.custom_settings).length > 0) {
      Object.assign(stabilityRequest, request.custom_settings)
    }

    return stabilityRequest
  }

  /**
   * Converts provider-specific response to standardized format
   */
  protected convertFromProviderFormat(providerResponse: any): StandardVideoResult {
    return {
      status: 'QUEUED',
      provider_job_id: providerResponse.id || this.generateVideoId(),
      progress: 0,
      estimated_time_remaining: 300
    }
  }

  /**
   * Parses resolution string into width and height
   */
  private parseResolution(resolution: string): { width: number; height: number } {
    const [width, height] = resolution.split('x').map(Number)
    return { width, height }
  }

  /**
   * Maps standardized quality to Stability AI steps
   */
  private mapQualityToSteps(quality?: string): number {
    const mapping: Record<string, number> = {
      'draft': 20,
      'standard': 30,
      'high': 50,
      'ultra': 75
    }
    return mapping[quality || 'standard'] || 30
  }

  /**
   * Maps standardized motion intensity (1-10) to Stability AI's motion bucket ID
   */
  private mapMotionIntensity(intensity: number): number {
    // Stability AI uses motion_bucket_id 1-127, we map our 1-10 scale to their range
    // 1-3: Low motion (1-38), 4-7: Medium motion (39-76), 8-10: High motion (77-127)
    if (intensity <= 3) {
      return Math.floor((intensity - 1) * 19) + 1 // Maps 1-3 to 1-38
    } else if (intensity <= 7) {
      return Math.floor((intensity - 4) * 12.7) + 39 // Maps 4-7 to 39-76
    } else {
      return Math.floor((intensity - 8) * 25) + 77 // Maps 8-10 to 77-127
    }
  }

  /**
   * Generates a unique video ID
   */
  private generateVideoId(): string {
    return `stability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
