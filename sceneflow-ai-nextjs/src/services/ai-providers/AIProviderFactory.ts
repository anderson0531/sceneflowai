import { IVideoGeneratorAdapter, AIProvider, ProviderCredentials, StandardVideoRequest, StandardVideoResult } from './BaseAIProviderAdapter'
import { GoogleVeoAdapter } from './GoogleVeoAdapter'
import { RunwayAdapter } from './RunwayAdapter'
import { StabilityAIAdapter } from './StabilityAIAdapter'
import { EncryptionService } from '../EncryptionService'

export class AIProviderFactory {
  /**
   * Creates an AI provider adapter based on the provider type and encrypted credentials
   * @param providerName - The AI provider to create
   * @param encryptedCredentials - Encrypted credentials from the database
   * @returns Promise<IVideoGeneratorAdapter> - The appropriate adapter instance
   */
  static async createAdapter(
    providerName: AIProvider, 
    encryptedCredentials: string
  ): Promise<IVideoGeneratorAdapter> {
    try {
      // Decrypt the credentials
      const decryptedCredentials = EncryptionService.decrypt(encryptedCredentials)
      const credentials = JSON.parse(decryptedCredentials)

      switch (providerName) {
        case AIProvider.GOOGLE_VEO:
          return new GoogleVeoAdapter()

        case AIProvider.RUNWAY:
          return new RunwayAdapter()

        case AIProvider.STABILITY_AI:
          return new StabilityAIAdapter()

        default:
          throw new Error(`Unsupported AI provider: ${providerName}`)
      }
    } catch (error) {
      console.error(`Failed to create adapter for ${providerName}:`, error)
      throw new Error(`Failed to create AI provider adapter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Creates an adapter with raw (unencrypted) credentials for testing/validation
   * @param providerName - The AI provider to create
   * @returns IVideoGeneratorAdapter - The appropriate adapter instance
   */
  static createAdapterWithRawCredentials(providerName: AIProvider): IVideoGeneratorAdapter {
    switch (providerName) {
      case AIProvider.GOOGLE_VEO:
        return new GoogleVeoAdapter()

      case AIProvider.RUNWAY:
        return new RunwayAdapter()

      case AIProvider.STABILITY_AI:
        return new StabilityAIAdapter()

      default:
        throw new Error(`Unsupported AI provider: ${providerName}`)
    }
  }

  /**
   * Generates a video using the specified provider
   * @param providerName - The AI provider to use
   * @param encryptedCredentials - Encrypted credentials from the database
   * @param request - Standardized video generation request
   * @returns Promise<StandardVideoResult> - Generation result
   */
  static async generateVideo(
    providerName: AIProvider,
    encryptedCredentials: string,
    request: StandardVideoRequest
  ): Promise<StandardVideoResult> {
    try {
      const adapter = await this.createAdapter(providerName, encryptedCredentials)
      const decryptedCredentials = JSON.parse(EncryptionService.decrypt(encryptedCredentials))
      return await adapter.generate(request, decryptedCredentials)
    } catch (error) {
      console.error(`Video generation failed for ${providerName}:`, error)
      return {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Video generation failed'
      }
    }
  }

  /**
   * Checks the status of a video generation job
   * @param providerName - The AI provider to use
   * @param encryptedCredentials - Encrypted credentials from the database
   * @param providerJobId - The provider's job ID
   * @returns Promise<StandardVideoResult> - Current status
   */
  static async checkVideoStatus(
    providerName: AIProvider,
    encryptedCredentials: string,
    providerJobId: string
  ): Promise<StandardVideoResult> {
    try {
      const adapter = await this.createAdapter(providerName, encryptedCredentials)
      const decryptedCredentials = JSON.parse(EncryptionService.decrypt(encryptedCredentials))
      return await adapter.check_status(providerJobId, decryptedCredentials)
    } catch (error) {
      console.error(`Status check failed for ${providerName}:`, error)
      return {
        status: 'FAILED',
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }

  /**
   * Validates provider credentials
   * @param providerName - The AI provider to validate
   * @param encryptedCredentials - Encrypted credentials from the database
   * @returns Promise<boolean> - True if credentials are valid
   */
  static async validateCredentials(
    providerName: AIProvider,
    encryptedCredentials: string
  ): Promise<boolean> {
    try {
      const adapter = await this.createAdapter(providerName, encryptedCredentials)
      const decryptedCredentials = JSON.parse(EncryptionService.decrypt(encryptedCredentials))
      return await adapter.validate_credentials(decryptedCredentials)
    } catch (error) {
      console.error(`Credential validation failed for ${providerName}:`, error)
      return false
    }
  }

  /**
   * Gets the list of supported AI providers
   * @returns AIProvider[] - Array of supported provider types
   */
  static getSupportedProviders(): AIProvider[] {
    return Object.values(AIProvider)
  }

  /**
   * Gets the display name for a provider
   * @param provider - The AI provider enum value
   * @returns string - Human-readable provider name
   */
  static getProviderDisplayName(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.GOOGLE_VEO:
        return 'Google Veo'
      case AIProvider.RUNWAY:
        return 'Runway ML'
      case AIProvider.STABILITY_AI:
        return 'Stability AI'
      default:
        return provider
    }
  }

  /**
   * Gets the description for a provider
   * @param provider - The AI provider enum value
   * @returns string - Provider description
   */
  static getProviderDescription(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.GOOGLE_VEO:
        return 'Google\'s latest AI video generation model with high-quality output and fast generation times.'
      case AIProvider.RUNWAY:
        return 'Professional-grade AI video generation with advanced control and customization options.'
      case AIProvider.STABILITY_AI:
        return 'Stable Video Diffusion model for consistent and reliable video generation.'
      default:
        return 'AI video generation provider'
    }
  }

  /**
   * Gets the icon/logo for a provider
   * @param provider - The AI provider enum value
   * @returns string - Icon identifier or URL
   */
  static getProviderIcon(provider: AIProvider): string {
    switch (provider) {
      case AIProvider.GOOGLE_VEO:
        return '🎬' // Video camera emoji
      case AIProvider.RUNWAY:
        return '🎭' // Performing arts emoji
      case AIProvider.STABILITY_AI:
        return '⚡' // High voltage emoji
      default:
        return '🤖' // Robot emoji
    }
  }

  /**
   * Validates if a provider is supported
   * @param provider - The provider to check
   * @returns boolean - True if the provider is supported
   */
  static isProviderSupported(provider: string): provider is AIProvider {
    return Object.values(AIProvider).includes(provider as AIProvider)
  }
}
