/**
 * BYOK (Bring Your Own Key) Usage Examples
 * This file demonstrates how to use the BYOK service for AI video generation
 */

import { BYOKService } from '../services/BYOKService'
import { AIProvider } from '../models/UserProviderConfig'
import { VideoGenerationRequest } from '../services/ai-providers/BaseAIProviderAdapter'

// Example: Setting up Google Veo credentials
export async function setupGoogleVeoExample() {
  try {
    const userId = 'user-123'
    
    // Google Cloud service account credentials
    const credentials = {
      projectId: 'your-project-id',
      privateKeyId: 'your-private-key-id',
      privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
      clientEmail: 'your-service-account@your-project.iam.gserviceaccount.com',
      clientId: 'your-client-id',
      authUri: 'https://accounts.google.com/o/oauth2/auth',
      tokenUri: 'https://oauth2.googleapis.com/token',
      authProviderX509CertUrl: 'https://www.googleapis.com/oauth2/v1/certs',
      clientX509CertUrl: 'https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com'
    }

    console.log('🔐 Setting up Google Veo credentials...')
    
    // Store and validate credentials
    const config = await BYOKService.storeProviderConfig(
      userId,
      AIProvider.GOOGLE_VEO,
      credentials
    )

    console.log('✅ Google Veo credentials stored successfully!')
    console.log('Configuration ID:', config.id)
    console.log('Is Valid:', config.is_valid)

    return config
  } catch (error) {
    console.error('❌ Failed to setup Google Veo:', error)
    throw error
  }
}

// Example: Setting up Runway ML credentials
export async function setupRunwayExample() {
  try {
    const userId = 'user-123'
    
    const credentials = {
      apiKey: 'your-runway-api-key',
      organizationId: 'your-org-id' // Optional
    }

    console.log('🎭 Setting up Runway ML credentials...')
    
    const config = await BYOKService.storeProviderConfig(
      userId,
      AIProvider.RUNWAY,
      credentials
    )

    console.log('✅ Runway ML credentials stored successfully!')
    console.log('Configuration ID:', config.id)
    console.log('Is Valid:', config.is_valid)

    return config
  } catch (error) {
    console.error('❌ Failed to setup Runway ML:', error)
    throw error
  }
}

// Example: Setting up Stability AI credentials
export async function setupStabilityAIExample() {
  try {
    const userId = 'user-123'
    
    const credentials = {
      apiKey: 'your-stability-ai-api-key',
      organizationId: 'your-org-id' // Optional
    }

    console.log('⚡ Setting up Stability AI credentials...')
    
    const config = await BYOKService.storeProviderConfig(
      userId,
      AIProvider.STABILITY_AI,
      credentials
    )

    console.log('✅ Stability AI credentials stored successfully!')
    console.log('Configuration ID:', config.id)
    console.log('Is Valid:', config.is_valid)

    return config
  } catch (error) {
    console.error('❌ Failed to setup Stability AI:', error)
    throw error
  }
}

// Example: Generating a video with Google Veo
export async function generateVideoExample() {
  try {
    const userId = 'user-123'
    const provider = AIProvider.GOOGLE_VEO
    
    const request: VideoGenerationRequest = {
      prompt: 'A cinematic sunset over a calm ocean with gentle waves, golden hour lighting, 4K quality',
      duration: 15,
      resolution: '1920x1080',
      aspectRatio: '16:9',
      style: 'cinematic',
      negativePrompt: 'dark, gloomy, stormy weather, low quality, blurry',
      customSettings: {
        temperature: 0.7,
        topP: 0.8
      }
    }

    console.log('🎬 Generating video with Google Veo...')
    console.log('Prompt:', request.prompt)
    
    const result = await BYOKService.generateVideo(userId, provider, request)
    
    if (result.success) {
      console.log('✅ Video generation started successfully!')
      console.log('Video ID:', result.videoId)
      console.log('Status:', result.status)
      console.log('Estimated time:', result.estimatedTimeRemaining, 'seconds')
      
      // In a real application, you would poll for status updates
      return result
    } else {
      console.error('❌ Video generation failed:', result.error)
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('❌ Failed to generate video:', error)
    throw error
  }
}

// Example: Checking video generation status
export async function checkVideoStatusExample(videoId: string) {
  try {
    const userId = 'user-123'
    const provider = AIProvider.GOOGLE_VEO
    
    console.log('📊 Checking video generation status...')
    console.log('Video ID:', videoId)
    
    const status = await BYOKService.checkVideoStatus(userId, provider, videoId)
    
    console.log('Status:', status.status)
    console.log('Progress:', status.progress, '%')
    
    if (status.videoUrl) {
      console.log('✅ Video completed!')
      console.log('Video URL:', status.videoUrl)
    } else if (status.estimatedTimeRemaining) {
      console.log('⏳ Still processing...')
      console.log('Estimated time remaining:', status.estimatedTimeRemaining, 'seconds')
    }
    
    return status
  } catch (error) {
    console.error('❌ Failed to check video status:', error)
    throw error
  }
}

// Example: Getting provider summaries
export async function getProviderSummariesExample() {
  try {
    const userId = 'user-123'
    
    console.log('📋 Getting provider summaries...')
    
    const summaries = await BYOKService.getProviderSummaries(userId)
    
    console.log('Found', summaries.length, 'provider configurations:')
    
    summaries.forEach(summary => {
      console.log(`\n${summary.icon} ${summary.displayName}`)
      console.log(`   Description: ${summary.description}`)
      console.log(`   Connected: ${summary.isConnected ? '✅' : '❌'}`)
      console.log(`   Valid: ${summary.isValid ? '✅' : '❌'}`)
      
      if (summary.quotaRemaining !== undefined && summary.quotaTotal !== undefined) {
        console.log(`   Quota: ${summary.quotaRemaining}/${summary.quotaTotal}`)
      }
      
      if (summary.lastTested) {
        console.log(`   Last tested: ${summary.lastTested.toLocaleString()}`)
      }
    })
    
    return summaries
  } catch (error) {
    console.error('❌ Failed to get provider summaries:', error)
    throw error
  }
}

// Example: Testing provider connections
export async function testProviderConnectionsExample() {
  try {
    const userId = 'user-123'
    
    console.log('🔍 Testing provider connections...')
    
    const providers = [AIProvider.GOOGLE_VEO, AIProvider.RUNWAY, AIProvider.STABILITY_AI]
    
    for (const provider of providers) {
      try {
        console.log(`\nTesting ${provider}...`)
        const isValid = await BYOKService.testProviderConnection(userId, provider)
        console.log(`${provider}: ${isValid ? '✅ Connected' : '❌ Failed'}`)
      } catch (error) {
        console.log(`${provider}: ❌ Error - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    console.log('\n✅ Provider connection tests completed!')
  } catch (error) {
    console.error('❌ Failed to test provider connections:', error)
    throw error
  }
}

// Example: Complete workflow
export async function completeWorkflowExample() {
  try {
    console.log('🚀 Starting complete BYOK workflow example...\n')
    
    // 1. Setup providers
    console.log('Step 1: Setting up providers...')
    await setupGoogleVeoExample()
    await setupRunwayExample()
    await setupStabilityAIExample()
    
    // 2. Get provider summaries
    console.log('\nStep 2: Getting provider summaries...')
    await getProviderSummariesExample()
    
    // 3. Test connections
    console.log('\nStep 3: Testing provider connections...')
    await testProviderConnectionsExample()
    
    // 4. Generate a video
    console.log('\nStep 4: Generating a video...')
    const result = await generateVideoExample()
    
    if (result.success && result.videoId) {
      // 5. Check status (simulate polling)
      console.log('\nStep 5: Checking video status...')
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
      await checkVideoStatusExample(result.videoId)
    }
    
    console.log('\n🎉 Complete workflow example finished successfully!')
    
  } catch (error) {
    console.error('❌ Workflow example failed:', error)
    throw error
  }
}

// Export all examples
export const BYOKExamples = {
  setupGoogleVeoExample,
  setupRunwayExample,
  setupStabilityAIExample,
  generateVideoExample,
  checkVideoStatusExample,
  getProviderSummariesExample,
  testProviderConnectionsExample,
  completeWorkflowExample
}
