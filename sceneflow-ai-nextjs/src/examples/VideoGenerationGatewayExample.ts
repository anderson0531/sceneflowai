import { videoGenerationGateway } from '../services/VideoGenerationGateway'
import { StandardVideoRequest } from '../services/ai-providers/BaseAIProviderAdapter'
import { AIProvider } from '../models/UserProviderConfig'

/**
 * Example usage of the VideoGenerationGateway service
 * This demonstrates how to use the gateway for video generation operations
 */

export class VideoGenerationGatewayExample {
  private userId: string = 'user_123'
  private provider: AIProvider = AIProvider.GOOGLE_VEO

  /**
   * Example: Trigger video generation
   */
  async triggerVideoGenerationExample(): Promise<void> {
    console.log('🎬 Triggering Video Generation...')

    try {
      // Create a standardized video generation request
      const request: StandardVideoRequest = {
        prompt: 'A cinematic sunset over a calm ocean with gentle waves, golden hour lighting',
        negative_prompt: 'dark, gloomy, stormy weather, low quality, blurry',
        aspect_ratio: '16:9',
        motion_intensity: 7, // Moderate motion
        duration: 15, // 15 seconds
        resolution: '1920x1080',
        style: 'cinematic',
        quality: 'high',
        fps: 30,
        seed: 42,
        custom_settings: {
          temperature: 0.7,
          topP: 0.8
        }
      }

      // Trigger the video generation
      const result = await videoGenerationGateway.trigger_generation(
        this.userId,
        request,
        this.provider
      )

      if (result.success) {
        console.log('✅ Video generation triggered successfully!')
        console.log('📊 Status:', result.data?.status)
        console.log('🆔 Provider Job ID:', result.data?.provider_job_id)
        console.log('⏱️ Estimated Time:', result.data?.estimated_time_remaining, 'seconds')
        console.log('📝 Message:', result.message)
      } else {
        console.error('❌ Video generation failed:', result.error)
      }

    } catch (error) {
      console.error('💥 Error in video generation example:', error)
    }
  }

  /**
   * Example: Check generation status
   */
  async checkGenerationStatusExample(providerJobId: string): Promise<void> {
    console.log('🔍 Checking Generation Status...')

    try {
      const result = await videoGenerationGateway.check_generation_status(
        this.userId,
        this.provider,
        providerJobId
      )

      if (result.success) {
        console.log('✅ Status check completed!')
        console.log('📊 Current Status:', result.data?.status)
        console.log('📈 Progress:', result.data?.progress, '%')
        
        if (result.data?.video_url) {
          console.log('🎥 Video URL:', result.data.video_url)
        }
        
        if (result.data?.estimated_time_remaining) {
          console.log('⏱️ Time Remaining:', result.data.estimated_time_remaining, 'seconds')
        }

        if (result.data?.error_message) {
          console.log('⚠️ Error:', result.data.error_message)
        }
      } else {
        console.error('❌ Status check failed:', result.error)
      }

    } catch (error) {
      console.error('💥 Error in status check example:', error)
    }
  }

  /**
   * Example: Cancel video generation
   */
  async cancelGenerationExample(providerJobId: string): Promise<void> {
    console.log('🚫 Cancelling Video Generation...')

    try {
      const result = await videoGenerationGateway.cancel_generation(
        this.userId,
        this.provider,
        providerJobId
      )

      if (result.success) {
        console.log('✅ Video generation cancelled successfully!')
        console.log('📝 Message:', result.message)
      } else {
        console.error('❌ Cancellation failed:', result.error)
      }

    } catch (error) {
      console.error('💥 Error in cancellation example:', error)
    }
  }

  /**
   * Example: Get available providers for a user
   */
  async getAvailableProvidersExample(): Promise<void> {
    console.log('🔍 Getting Available Providers...')

    try {
      const result = await videoGenerationGateway.getAvailableProviders(this.userId)

      if (result.success) {
        console.log('✅ Available providers retrieved!')
        console.log('📊 Providers:', result.data)
        console.log('📝 Message:', result.message)
      } else {
        console.error('❌ Failed to get providers:', result.error)
      }

    } catch (error) {
      console.error('💥 Error in get providers example:', error)
    }
  }

  /**
   * Example: Get provider capabilities
   */
  async getProviderCapabilitiesExample(): Promise<void> {
    console.log('🔍 Getting Provider Capabilities...')

    try {
      const result = await videoGenerationGateway.getProviderCapabilities(this.provider)

      if (result.success) {
        console.log('✅ Provider capabilities retrieved!')
        console.log('📊 Max Duration:', result.data?.maxDuration, 'seconds')
        console.log('📐 Supported Resolutions:', result.data?.supportedResolutions)
        console.log('🔄 Supported Aspect Ratios:', result.data?.supportedAspectRatios)
        console.log('🎭 Supports Negative Prompt:', result.data?.supportsNegativePrompt)
        console.log('⚙️ Supports Custom Settings:', result.data?.supportsCustomSettings)
        console.log('📝 Max Prompt Length:', result.data?.maxPromptLength)
        console.log('🎬 Motion Intensity Range:', result.data?.motionIntensityRange)
        console.log('⭐ Quality Options:', result.data?.qualityOptions)
        console.log('🎞️ FPS Range:', result.data?.fpsRange)
        
        if (result.data?.rateLimit) {
          console.log('⏱️ Rate Limits:', result.data.rateLimit)
        }
      } else {
        console.error('❌ Failed to get capabilities:', result.error)
      }

    } catch (error) {
      console.error('💥 Error in get capabilities example:', error)
    }
  }

  /**
   * Example: Test provider connection
   */
  async testProviderConnectionExample(): Promise<void> {
    console.log('🔍 Testing Provider Connection...')

    try {
      const result = await videoGenerationGateway.testProviderConnection(
        this.userId,
        this.provider
      )

      if (result.success) {
        console.log('✅ Connection test completed!')
        console.log('📊 Connection Status:', result.data ? '✅ Connected' : '❌ Disconnected')
        console.log('📝 Message:', result.message)
      } else {
        console.error('❌ Connection test failed:', result.error)
      }

    } catch (error) {
      console.error('💥 Error in connection test example:', error)
    }
  }

  /**
   * Example: Complete workflow - generate, check status, and handle completion
   */
  async completeWorkflowExample(): Promise<void> {
    console.log('🚀 Starting Complete Video Generation Workflow...')

    try {
      // Step 1: Create video generation request
      const request: StandardVideoRequest = {
        prompt: 'A majestic eagle soaring through mountain peaks at sunrise, cinematic lighting',
        negative_prompt: 'dark, low quality, blurry, distorted',
        aspect_ratio: '16:9',
        motion_intensity: 8, // High motion for flying eagle
        duration: 20,
        resolution: '1920x1080',
        style: 'cinematic',
        quality: 'ultra',
        fps: 30,
        seed: 12345
      }

      // Step 2: Trigger generation
      console.log('🎬 Step 1: Triggering video generation...')
      const generationResult = await videoGenerationGateway.trigger_generation(
        this.userId,
        request,
        this.provider
      )

      if (!generationResult.success || !generationResult.data) {
        console.error('❌ Generation failed:', generationResult.error)
        return
      }

      const providerJobId = generationResult.data.provider_job_id
      if (!providerJobId) {
        console.error('❌ No provider job ID returned')
        return
      }

      console.log('✅ Generation triggered! Job ID:', providerJobId)

      // Step 3: Poll for status (in real app, this would be done asynchronously)
      console.log('🔍 Step 2: Checking generation status...')
      
      let attempts = 0
      const maxAttempts = 10
      
      while (attempts < maxAttempts) {
        attempts++
        console.log(`📊 Status check attempt ${attempts}/${maxAttempts}`)
        
        const statusResult = await videoGenerationGateway.check_generation_status(
          this.userId,
          this.provider,
          providerJobId
        )

        if (!statusResult.success) {
          console.error('❌ Status check failed:', statusResult.error)
          break
        }

        const status = statusResult.data?.status
        const progress = statusResult.data?.progress || 0
        
        console.log(`📈 Status: ${status}, Progress: ${progress}%`)

        if (status === 'COMPLETED') {
          console.log('🎉 Video generation completed!')
          if (statusResult.data?.video_url) {
            console.log('🎥 Video URL:', statusResult.data.video_url)
          }
          break
        } else if (status === 'FAILED') {
          console.error('❌ Video generation failed:', statusResult.data?.error_message)
          break
        } else if (status === 'CANCELLED') {
          console.log('🚫 Video generation was cancelled')
          break
        }

        // Wait before next check (in real app, use proper polling strategy)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      console.log('🏁 Workflow completed!')

    } catch (error) {
      console.error('💥 Error in complete workflow example:', error)
    }
  }

  /**
   * Example: Handle different providers
   */
  async multiProviderExample(): Promise<void> {
    console.log('🔄 Multi-Provider Video Generation Example...')

    const providers = [AIProvider.GOOGLE_VEO, AIProvider.RUNWAY, AIProvider.STABILITY_AI]
    const request: StandardVideoRequest = {
      prompt: 'A serene forest with sunlight filtering through trees, peaceful atmosphere',
      negative_prompt: 'dark, scary, stormy, low quality',
      aspect_ratio: '16:9',
      motion_intensity: 3, // Low motion for peaceful scene
      duration: 10,
      resolution: '1920x1080',
      style: 'realistic',
      quality: 'high',
      fps: 30
    }

    for (const provider of providers) {
      console.log(`\n🎬 Testing provider: ${provider}`)
      
      try {
        // Check if user has this provider configured
        const providersResult = await videoGenerationGateway.getAvailableProviders(this.userId)
        if (providersResult.success && providersResult.data?.includes(provider)) {
          console.log(`✅ Provider ${provider} is available`)
          
          // Test connection
          const connectionResult = await videoGenerationGateway.testProviderConnection(this.userId, provider)
          if (connectionResult.success && connectionResult.data) {
            console.log(`🔗 Provider ${provider} connection successful`)
            
            // Get capabilities
            const capabilitiesResult = await videoGenerationGateway.getProviderCapabilities(provider)
            if (capabilitiesResult.success) {
              console.log(`📊 ${provider} max duration: ${capabilitiesResult.data?.maxDuration}s`)
            }
          } else {
            console.log(`❌ Provider ${provider} connection failed`)
          }
        } else {
          console.log(`⚠️ Provider ${provider} not configured for user`)
        }
      } catch (error) {
        console.error(`💥 Error with provider ${provider}:`, error)
      }
    }
  }
}

// Export example functions for easy testing
export const videoGenerationGatewayExamples = {
  triggerVideoGeneration: (example: VideoGenerationGatewayExample) => example.triggerVideoGenerationExample(),
  checkGenerationStatus: (example: VideoGenerationGatewayExample, jobId: string) => example.checkGenerationStatusExample(jobId),
  cancelGeneration: (example: VideoGenerationGatewayExample, jobId: string) => example.cancelGenerationExample(jobId),
  getAvailableProviders: (example: VideoGenerationGatewayExample) => example.getAvailableProvidersExample(),
  getProviderCapabilities: (example: VideoGenerationGatewayExample) => example.getProviderCapabilitiesExample(),
  testProviderConnection: (example: VideoGenerationGatewayExample) => example.testProviderConnectionExample(),
  completeWorkflow: (example: VideoGenerationGatewayExample) => example.completeWorkflowExample(),
  multiProvider: (example: VideoGenerationGatewayExample) => example.multiProviderExample()
}

// Example usage
export async function runVideoGenerationGatewayExamples(): Promise<void> {
  console.log('🚀 Running VideoGenerationGateway Examples...\n')
  
  const example = new VideoGenerationGatewayExample()
  
  // Run individual examples
  await example.getAvailableProvidersExample()
  await example.getProviderCapabilitiesExample()
  await example.testProviderConnectionExample()
  
  // Run complete workflow (commented out to avoid actual API calls)
  // await example.completeWorkflowExample()
  
  console.log('\n✅ All examples completed!')
}
