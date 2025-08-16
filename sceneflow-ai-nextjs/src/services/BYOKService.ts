import { UserProviderConfig } from '../models/UserProviderConfig'
import { AIProviderFactory } from './ai-providers/AIProviderFactory'
import { StandardVideoRequest, StandardVideoResult, AIProvider } from './ai-providers/BaseAIProviderAdapter'
import { EncryptionService } from './EncryptionService'

export interface ProviderConfigSummary {
  provider: AIProvider
  displayName: string
  description: string
  icon: string
  isConnected: boolean
  isValid: boolean
  lastTested?: Date
  quotaRemaining?: number
  quotaTotal?: number
}

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
}

export class BYOKService {
  /**
   * Stores or updates a user's AI provider configuration
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @param credentials - Raw credentials to encrypt and store
   * @returns Promise<UserProviderConfig> - The stored configuration
   */
  static async storeProviderConfig(
    userId: string,
    provider: AIProvider,
    credentials: Record<string, any>
  ): Promise<UserProviderConfig> {
    try {
      // Validate that the provider is supported
      if (!AIProviderFactory.isProviderSupported(provider)) {
        throw new Error(`Unsupported AI provider: ${provider}`)
      }

      // Test the credentials before storing
      const adapter = AIProviderFactory.createAdapterWithRawCredentials(provider)
      const isValid = await adapter.validate_credentials(credentials)

      // Encrypt the credentials
      const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials))

      // Store or update the configuration
      const [config, created] = await UserProviderConfig.findOrCreate({
        where: { user_id: userId, provider_name: provider },
        defaults: {
          user_id: userId,
          provider_name: provider,
          encrypted_credentials: encryptedCredentials,
          is_valid: isValid
        }
      })

      if (!created) {
        // Update existing configuration
        await config.update({
          encrypted_credentials: encryptedCredentials,
          is_valid: isValid,
          updated_at: new Date()
        })
      }

      return config
    } catch (error) {
      console.error('Failed to store provider config:', error)
      throw new Error(`Failed to store provider configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieves a user's provider configuration
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @returns Promise<UserProviderConfig | null> - The configuration or null if not found
   */
  static async getProviderConfig(
    userId: string,
    provider: AIProvider
  ): Promise<UserProviderConfig | null> {
    try {
      return await UserProviderConfig.findOne({
        where: { user_id: userId, provider_name: provider }
      })
    } catch (error) {
      console.error('Failed to retrieve provider config:', error)
      throw new Error(`Failed to retrieve provider configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets all provider configurations for a user
   * @param userId - The user's ID
   * @returns Promise<UserProviderConfig[]> - Array of all configurations
   */
  static async getAllProviderConfigs(userId: string): Promise<UserProviderConfig[]> {
    try {
      return await UserProviderConfig.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      })
    } catch (error) {
      console.error('Failed to retrieve all provider configs:', error)
      throw new Error(`Failed to retrieve provider configurations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets a summary of all providers with their connection status
   * @param userId - The user's ID
   * @returns Promise<ProviderConfigSummary[]> - Array of provider summaries
   */
  static async getProviderSummaries(userId: string): Promise<ProviderConfigSummary[]> {
    try {
      const configs = await this.getAllProviderConfigs(userId)
      const summaries: ProviderConfigSummary[] = []

      for (const config of configs) {
        try {
          const adapter = await AIProviderFactory.createAdapter(config.provider_name, config.encrypted_credentials)
          const status = await adapter.getProviderStatus(JSON.parse(EncryptionService.decrypt(config.encrypted_credentials)))

          summaries.push({
            provider: config.provider_name,
            displayName: AIProviderFactory.getProviderDisplayName(config.provider_name),
            description: AIProviderFactory.getProviderDescription(config.provider_name),
            icon: AIProviderFactory.getProviderIcon(config.provider_name),
            isConnected: status.isConnected,
            isValid: status.isValid,
            lastTested: status.lastTested,
            quotaRemaining: status.quotaRemaining,
            quotaTotal: status.quotaTotal
          })
        } catch (error) {
          // If we can't create the adapter, mark as disconnected
          summaries.push({
            provider: config.provider_name,
            displayName: AIProviderFactory.getProviderDisplayName(config.provider_name),
            description: AIProviderFactory.getProviderDescription(config.provider_name),
            icon: AIProviderFactory.getProviderIcon(config.provider_name),
            isConnected: false,
            isValid: false,
            lastTested: new Date()
          })
        }
      }

      return summaries
    } catch (error) {
      console.error('Failed to get provider summaries:', error)
      throw new Error(`Failed to get provider summaries: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Tests a provider connection and credentials
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @returns Promise<boolean> - True if connection test passes
   */
  static async testProviderConnection(
    userId: string,
    provider: AIProvider
  ): Promise<boolean> {
    try {
      const config = await this.getProviderConfig(userId, provider)
      if (!config) {
        throw new Error('Provider configuration not found')
      }

      const adapter = await AIProviderFactory.createAdapter(provider, config.encrypted_credentials)
      const decryptedCredentials = JSON.parse(EncryptionService.decrypt(config.encrypted_credentials))
      const isValid = await adapter.testConnection(decryptedCredentials)

      // Update the configuration with the test result
      await config.update({
        is_valid: isValid,
        updated_at: new Date()
      })

      return isValid
    } catch (error) {
      console.error('Provider connection test failed:', error)
      return false
    }
  }

  /**
   * Generates a video using the specified provider
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @param request - Video generation request
   * @returns Promise<StandardVideoResult> - Generation result
   */
  static async generateVideo(
    userId: string,
    provider: AIProvider,
    request: StandardVideoRequest
  ): Promise<StandardVideoResult> {
    try {
      const config = await this.getProviderConfig(userId, provider)
      if (!config) {
        throw new Error('Provider configuration not found')
      }

      if (!config.is_valid) {
        throw new Error('Provider configuration is not valid')
      }

      return await AIProviderFactory.generateVideo(provider, config.encrypted_credentials, request)
    } catch (error) {
      console.error('Video generation failed:', error)
      return {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Video generation failed'
      }
    }
  }

  /**
   * Checks the status of a video generation job
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @param providerJobId - The provider's job ID
   * @returns Promise<StandardVideoResult> - Current status
   */
  static async checkVideoStatus(
    userId: string,
    provider: AIProvider,
    providerJobId: string
  ): Promise<StandardVideoResult> {
    try {
      const config = await this.getProviderConfig(userId, provider)
      if (!config) {
        throw new Error('Provider configuration not found')
      }

      return await AIProviderFactory.checkVideoStatus(provider, config.encrypted_credentials, providerJobId)
    } catch (error) {
      console.error('Video status check failed:', error)
      return {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }

  /**
   * Cancels a video generation job
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @param providerJobId - The provider's job ID
   * @returns Promise<boolean> - True if cancellation was successful
   */
  static async cancelVideoGeneration(
    userId: string,
    provider: AIProvider,
    providerJobId: string
  ): Promise<boolean> {
    try {
      const config = await this.getProviderConfig(userId, provider)
      if (!config) {
        throw new Error('Provider configuration not found')
      }

      const adapter = await AIProviderFactory.createAdapter(provider, config.encrypted_credentials)
      const decryptedCredentials = JSON.parse(EncryptionService.decrypt(config.encrypted_credentials))
      return await adapter.cancel_generation(providerJobId, decryptedCredentials)
    } catch (error) {
      console.error('Video cancellation failed:', error)
      return false
    }
  }

  /**
   * Removes a provider configuration
   * @param userId - The user's ID
   * @param provider - The AI provider type
   * @returns Promise<boolean> - True if removal was successful
   */
  static async removeProviderConfig(
    userId: string,
    provider: AIProvider
  ): Promise<boolean> {
    try {
      const result = await UserProviderConfig.destroy({
        where: { user_id: userId, provider_name: provider }
      })
      return result > 0
    } catch (error) {
      console.error('Failed to remove provider config:', error)
      throw new Error(`Failed to remove provider configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets the capabilities of a specific provider
   * @param provider - The AI provider type
   * @returns Promise<ProviderCapabilities | null> - Provider capabilities or null if not configured
   */
  static async getProviderCapabilities(
    userId: string,
    provider: AIProvider
  ): Promise<any | null> {
    try {
      const config = await this.getProviderConfig(userId, provider)
      if (!config || !config.is_valid) {
        return null
      }

      const adapter = await AIProviderFactory.createAdapter(provider, config.encrypted_credentials)
      return adapter.getCapabilities()
    } catch (error) {
      console.error('Failed to get provider capabilities:', error)
      return null
    }
  }

  /**
   * Validates if encryption is properly configured
   * @returns boolean - True if encryption is configured
   */
  static isEncryptionConfigured(): boolean {
    return EncryptionService.isEncryptionConfigured()
  }
}
