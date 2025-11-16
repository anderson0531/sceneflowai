import { AIProvider } from '../models/UserProviderConfig'
import { StandardVideoRequest, StandardVideoResult } from './ai-providers/BaseAIProviderAdapter'
import { AIProviderFactory } from './ai-providers/AIProviderFactory'
import { EncryptionService } from './EncryptionService'
import { UserProviderConfig } from '../models/UserProviderConfig'

export interface VideoGenerationJob {
  id: string
  userId: string
  provider: AIProvider
  request: StandardVideoRequest
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  videoUrl?: string
  error?: string
  createdAt: Date
  updatedAt: Date
  estimatedTimeRemaining?: number
  providerJobId?: string
}

export interface GatewayResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export class VideoGenerationGateway {
  private static instance: VideoGenerationGateway

  private constructor() {}

  /**
   * Singleton pattern to ensure only one gateway instance exists
   */
  public static getInstance(): VideoGenerationGateway {
    if (!VideoGenerationGateway.instance) {
      VideoGenerationGateway.instance = new VideoGenerationGateway()
    }
    return VideoGenerationGateway.instance
  }

  /**
   * Factory method to get the correct adapter instance
   * @param providerName - The AI provider to get adapter for
   * @returns The appropriate adapter instance
   */
  public get_adapter(providerName: AIProvider) {
    try {
      return AIProviderFactory.createAdapterWithRawCredentials(providerName)
    } catch (error) {
      throw new Error(`Failed to create adapter for provider ${providerName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Main method to trigger video generation
   * @param userId - The user's ID
   * @param request - Standardized video generation request
   * @param providerName - The AI provider to use
   * @returns Promise<GatewayResponse<StandardVideoResult>> - Generation result
   */
  public async trigger_generation(
    userId: string,
    request: StandardVideoRequest,
    providerName: AIProvider
  ): Promise<GatewayResponse<StandardVideoResult>> {
    try {
      // Step 1: Validate the request
      const validationResult = this.validateGenerationRequest(request)
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Request validation failed: ${validationResult.errors.join(', ')}`
        }
      }

      // Step 2: Securely retrieve and decrypt the user's credentials
      const credentials = await this.getUserCredentials(userId, providerName)
      if (!credentials.success || !credentials.data) {
        return {
          success: false,
          error: credentials.error || 'Failed to retrieve user credentials'
        }
      }

      // Step 3: Verify the is_valid flag in the database
      if (!credentials.data?.isValid) {
        return {
          success: false,
          error: 'Provider credentials are not valid. Please verify your API keys.'
        }
      }

      // Step 4: Get the appropriate adapter
      const adapter = this.get_adapter(providerName)

      // Step 5: Call the adapter's generate method
      const generationResult = await adapter.generate(request, credentials.data?.decryptedCredentials)

      // Step 6: Log the generation attempt
      await this.logGenerationAttempt(userId, providerName, request, generationResult)

      // Step 7: Return the result
      if (generationResult.status === 'FAILED') {
        return {
          success: false,
          error: generationResult.error_message || 'Video generation failed',
          data: generationResult
        }
      }

      return {
        success: true,
        data: generationResult,
        message: `Video generation ${generationResult.status.toLowerCase()} successfully`
      }

    } catch (error) {
      console.error('Video generation gateway error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during video generation'
      }
    }
  }

  /**
   * Check the status of a video generation job
   * @param userId - The user's ID
   * @param providerName - The AI provider used
   * @param providerJobId - The provider's job ID
   * @returns Promise<GatewayResponse<StandardVideoResult>> - Current status
   */
  public async check_generation_status(
    userId: string,
    providerName: AIProvider,
    providerJobId: string
  ): Promise<GatewayResponse<StandardVideoResult>> {
    try {
      // Get user credentials
      const credentials = await this.getUserCredentials(userId, providerName)
      if (!credentials.success || !credentials.data) {
        return {
          success: false,
          error: credentials.error || 'Failed to retrieve user credentials'
        }
      }

      // Get adapter and check status
      const adapter = this.get_adapter(providerName)
      const statusResult = await adapter.check_status(providerJobId, credentials.data?.decryptedCredentials)

      return {
        success: true,
        data: statusResult,
        message: `Status check completed: ${statusResult.status}`
      }

    } catch (error) {
      console.error('Status check gateway error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during status check'
      }
    }
  }

  /**
   * Cancel a video generation job
   * @param userId - The user's ID
   * @param providerName - The AI provider used
   * @param providerJobId - The provider's job ID
   * @returns Promise<GatewayResponse<boolean>> - Cancellation result
   */
  public async cancel_generation(
    userId: string,
    providerName: AIProvider,
    providerJobId: string
  ): Promise<GatewayResponse<boolean>> {
    try {
      // Get user credentials
      const credentials = await this.getUserCredentials(userId, providerName)
      if (!credentials.success || !credentials.data) {
        return {
          success: false,
          error: credentials.error || 'Failed to retrieve user credentials'
        }
      }

      // Get adapter and cancel generation
      const adapter = this.get_adapter(providerName)
      const cancellationResult = await adapter.cancel_generation(providerJobId, credentials.data?.decryptedCredentials)

      if (cancellationResult) {
        return {
          success: true,
          data: true,
          message: 'Video generation cancelled successfully'
        }
      } else {
        return {
          success: false,
          error: 'Failed to cancel video generation'
        }
      }

    } catch (error) {
      console.error('Cancellation gateway error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during cancellation'
      }
    }
  }

  /**
   * Get available providers for a user
   * @param userId - The user's ID
   * @returns Promise<GatewayResponse<AIProvider[]>> - Available providers
   */
  public async getAvailableProviders(userId: string): Promise<GatewayResponse<AIProvider[]>> {
    try {
      const userConfigs = await UserProviderConfig.findAll({
        where: { user_id: userId, is_valid: true },
        attributes: ['provider_name']
      })

      const providers = userConfigs.map(config => config.provider_name)
      
      return {
        success: true,
        data: providers,
        message: `Found ${providers.length} available providers`
      }

    } catch (error) {
      console.error('Get available providers error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve available providers'
      }
    }
  }

  /**
   * Validate a video generation request
   * @param request - The request to validate
   * @returns { isValid: boolean; errors: string[] } - Validation result
   */
  private validateGenerationRequest(request: StandardVideoRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields
    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.push('Prompt is required')
    }

    if (!request.aspect_ratio) {
      errors.push('Aspect ratio is required')
    }

    if (!request.motion_intensity || request.motion_intensity < 1 || request.motion_intensity > 10) {
      errors.push('Motion intensity must be between 1 and 10')
    }

    // Optional field validation
    if (request.duration && (request.duration < 1 || request.duration > 120)) {
      errors.push('Duration must be between 1 and 120 seconds')
    }

    if (request.fps && (request.fps < 6 || request.fps > 60)) {
      errors.push('FPS must be between 6 and 60')
    }

    if (request.seed && (request.seed < 0 || request.seed > 999999999)) {
      errors.push('Seed must be between 0 and 999999999')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Securely retrieve and decrypt user credentials
   * @param userId - The user's ID
   * @param providerName - The AI provider
   * @returns Promise<GatewayResponse<{ isValid: boolean; decryptedCredentials: any }>> - Credentials result
   */
  private async getUserCredentials(
    userId: string,
    providerName: AIProvider
  ): Promise<GatewayResponse<{ isValid: boolean; decryptedCredentials: any }>> {
    try {
      // Retrieve user provider configuration first
      const userConfig = await UserProviderConfig.findOne({
        where: { user_id: userId, provider_name: providerName }
      })

      if (!userConfig) {
        return {
          success: false,
          error: `No BYOK configuration found for provider ${providerName}. Please configure your API keys in BYOK Settings.`
        }
      }

      // Only check encryption if we have credentials to decrypt
      if (!EncryptionService.isEncryptionConfigured()) {
        return {
          success: false,
          error: 'Encryption service is not properly configured. Please set ENCRYPTION_KEY environment variable in your Vercel project settings.'
        }
      }

      // Decrypt credentials
      try {
        const decryptedCredentials = JSON.parse(EncryptionService.decrypt(userConfig.encrypted_credentials))
        
        return {
          success: true,
          data: {
            isValid: userConfig.is_valid,
            decryptedCredentials
          }
        }
      } catch (decryptionError) {
        console.error('Credential decryption failed:', decryptionError)
        return {
          success: false,
          error: 'Failed to decrypt provider credentials. Please verify your ENCRYPTION_KEY is correct and matches the key used to encrypt the credentials.'
        }
      }

    } catch (error) {
      console.error('Get user credentials error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve user credentials'
      }
    }
  }

  /**
   * Log generation attempt for monitoring and debugging
   * @param userId - The user's ID
   * @param providerName - The AI provider used
   * @param request - The generation request
   * @param result - The generation result
   */
  private async logGenerationAttempt(
    userId: string,
    providerName: AIProvider,
    request: StandardVideoRequest,
    result: StandardVideoResult
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date(),
        userId,
        provider: providerName,
        request: {
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio,
          motion_intensity: request.motion_intensity,
          duration: request.duration,
          resolution: request.resolution,
          quality: request.quality,
          fps: request.fps
        },
        result: {
          status: result.status,
          provider_job_id: result.provider_job_id,
          error_message: result.error_message,
          progress: result.progress,
          estimated_time_remaining: result.estimated_time_remaining
        }
      }

      console.log('Video Generation Attempt Log:', JSON.stringify(logEntry, null, 2))
      
      // In a production environment, you would save this to a database or logging service
      // await this.saveGenerationLog(logEntry)
      
    } catch (error) {
      console.error('Failed to log generation attempt:', error)
      // Don't fail the main operation if logging fails
    }
  }

  /**
   * Get provider capabilities for a specific provider
   * @param providerName - The AI provider
   * @returns Promise<GatewayResponse<any>> - Provider capabilities
   */
  public async getProviderCapabilities(providerName: AIProvider): Promise<GatewayResponse<any>> {
    try {
      const adapter = this.get_adapter(providerName)
      const capabilities = adapter.getCapabilities()
      
      return {
        success: true,
        data: capabilities,
        message: `Retrieved capabilities for ${providerName}`
      }

    } catch (error) {
      console.error('Get provider capabilities error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve provider capabilities'
      }
    }
  }

  /**
   * Test provider connection for a user
   * @param userId - The user's ID
   * @param providerName - The AI provider
   * @returns Promise<GatewayResponse<boolean>> - Connection test result
   */
  public async testProviderConnection(
    userId: string,
    providerName: AIProvider
  ): Promise<GatewayResponse<boolean>> {
    try {
      const credentials = await this.getUserCredentials(userId, providerName)
      if (!credentials.success || !credentials.data) {
        return {
          success: false,
          error: credentials.error || 'Failed to retrieve user credentials'
        }
      }

      const adapter = this.get_adapter(providerName)
      const isValid = await adapter.testConnection(credentials.data?.decryptedCredentials)

      return {
        success: true,
        data: isValid,
        message: isValid ? 'Provider connection test successful' : 'Provider connection test failed'
      }

    } catch (error) {
      console.error('Provider connection test error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test provider connection'
      }
    }
  }
}

// Export a singleton instance
export const videoGenerationGateway = VideoGenerationGateway.getInstance()
