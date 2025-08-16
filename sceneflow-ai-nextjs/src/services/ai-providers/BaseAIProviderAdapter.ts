export enum AIProvider {
  GOOGLE_VEO = 'GOOGLE_VEO',
  RUNWAY = 'RUNWAY',
  STABILITY_AI = 'STABILITY_AI'
}

export interface StandardVideoRequest {
  prompt: string
  negative_prompt?: string
  aspect_ratio: string // e.g., "16:9", "9:16", "1:1"
  motion_intensity: number // Standardized scale, 1-10
  seed?: number
  duration?: number // in seconds
  resolution?: string // e.g., "1920x1080", "4K"
  style?: string // e.g., "cinematic", "realistic", "artistic"
  quality?: 'draft' | 'standard' | 'high' | 'ultra'
  fps?: number // frames per second
  custom_settings?: Record<string, any> // Provider-specific settings
}

export interface StandardVideoResult {
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  video_url?: string
  provider_job_id?: string
  error_message?: string
  progress?: number // 0-100
  estimated_time_remaining?: number // in seconds
  metadata?: {
    duration: number
    resolution: string
    format: string
    file_size?: number
    created_at: Date
    provider: string
  }
}

export interface ProviderCredentials {
  [key: string]: any
}

export interface ProviderCapabilities {
  maxDuration: number // in seconds
  supportedResolutions: string[]
  supportedAspectRatios: string[]
  supportsNegativePrompt: boolean
  supportsCustomSettings: boolean
  maxPromptLength: number
  motionIntensityRange: { min: number; max: number }
  qualityOptions: string[]
  fpsRange: { min: number; max: number }
  rateLimit?: {
    requestsPerMinute: number
    requestsPerHour: number
  }
}

export interface ProviderStatus {
  isConnected: boolean
  isValid: boolean
  lastTested?: Date
  quotaRemaining?: number
  quotaTotal?: number
}

/**
 * Abstract interface for AI video generation providers
 * Implements the standardized IVideoGeneratorAdapter pattern
 */
export abstract class IVideoGeneratorAdapter {
  protected providerName: string
  protected capabilities: ProviderCapabilities

  constructor(providerName: string, capabilities: ProviderCapabilities) {
    this.providerName = providerName
    this.capabilities = capabilities
  }

  /**
   * Initiates the video generation process
   * @param request - Standardized video generation request
   * @param credentials - Provider-specific credentials
   * @returns Promise<StandardVideoResult> - Generation result
   */
  abstract generate(request: StandardVideoRequest, credentials: ProviderCredentials): Promise<StandardVideoResult>

  /**
   * Polls the provider for the status of an existing job
   * @param provider_job_id - Unique identifier for the video generation job
   * @param credentials - Provider-specific credentials
   * @returns Promise<StandardVideoResult> - Current status
   */
  abstract check_status(provider_job_id: string, credentials: ProviderCredentials): Promise<StandardVideoResult>

  /**
   * Performs a low-cost API call to verify the credentials work
   * @param credentials - Provider-specific credentials
   * @returns Promise<boolean> - True if credentials are valid
   */
  abstract validate_credentials(credentials: ProviderCredentials): Promise<boolean>

  /**
   * Cancels an ongoing video generation job
   * @param provider_job_id - Unique identifier for the video generation job
   * @param credentials - Provider-specific credentials
   * @returns Promise<boolean> - True if cancellation was successful
   */
  abstract cancel_generation(provider_job_id: string, credentials: ProviderCredentials): Promise<boolean>

  /**
   * Gets the provider's capabilities and limitations
   * @returns ProviderCapabilities - Provider-specific capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return this.capabilities
  }

  /**
   * Gets the current provider status
   * @returns Promise<ProviderStatus> - Provider connection and quota status
   */
  abstract getProviderStatus(credentials: ProviderCredentials): Promise<ProviderStatus>

  /**
   * Validates if a video generation request is within provider capabilities
   * @param request - Video generation request to validate
   * @returns { isValid: boolean; errors: string[] } - Validation result
   */
  validateRequest(request: StandardVideoRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check duration limits
    if (request.duration && request.duration > this.capabilities.maxDuration) {
      errors.push(`Duration exceeds maximum allowed (${this.capabilities.maxDuration}s)`)
    }

    // Check resolution support
    if (request.resolution && !this.capabilities.supportedResolutions.includes(request.resolution)) {
      errors.push(`Resolution ${request.resolution} not supported. Supported: ${this.capabilities.supportedResolutions.join(', ')}`)
    }

    // Check aspect ratio support
    if (request.aspect_ratio && !this.capabilities.supportedAspectRatios.includes(request.aspect_ratio)) {
      errors.push(`Aspect ratio ${request.aspect_ratio} not supported. Supported: ${this.capabilities.supportedAspectRatios.join(', ')}`)
    }

    // Check prompt length
    if (request.prompt.length > this.capabilities.maxPromptLength) {
      errors.push(`Prompt exceeds maximum length (${this.capabilities.maxPromptLength} characters)`)
    }

    // Check negative prompt support
    if (request.negative_prompt && !this.capabilities.supportsNegativePrompt) {
      errors.push('Negative prompts not supported by this provider')
    }

    // Check motion intensity range
    if (request.motion_intensity) {
      const { min, max } = this.capabilities.motionIntensityRange
      if (request.motion_intensity < min || request.motion_intensity > max) {
        errors.push(`Motion intensity must be between ${min} and ${max}`)
      }
    }

    // Check quality options
    if (request.quality && !this.capabilities.qualityOptions.includes(request.quality)) {
      errors.push(`Quality ${request.quality} not supported. Supported: ${this.capabilities.qualityOptions.join(', ')}`)
    }

    // Check FPS range
    if (request.fps) {
      const { min, max } = this.capabilities.fpsRange
      if (request.fps < min || request.fps > max) {
        errors.push(`FPS must be between ${min} and ${max}`)
      }
    }

    // Check custom settings support
    if (request.custom_settings && Object.keys(request.custom_settings).length > 0 && !this.capabilities.supportsCustomSettings) {
      errors.push('Custom settings not supported by this provider')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Gets the provider name
   * @returns string - Provider identifier
   */
  getProviderName(): string {
    return this.providerName
  }

  /**
   * Tests the provider connection and credentials
   * @returns Promise<boolean> - True if connection test passes
   */
  async testConnection(credentials: ProviderCredentials): Promise<boolean> {
    try {
      return await this.validate_credentials(credentials)
    } catch (error) {
      console.error(`Connection test failed for ${this.providerName}:`, error)
      return false
    }
  }

  /**
   * Converts standardized request to provider-specific format
   * @param request - Standardized request
   * @returns any - Provider-specific request format
   */
  protected abstract convertToProviderFormat(request: StandardVideoRequest): any

  /**
   * Converts provider-specific response to standardized format
   * @param providerResponse - Provider-specific response
   * @returns StandardVideoResult - Standardized result
   */
  protected abstract convertFromProviderFormat(providerResponse: any): StandardVideoResult
}
