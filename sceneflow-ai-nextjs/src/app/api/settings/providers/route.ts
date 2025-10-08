import { NextRequest, NextResponse } from 'next/server'
import { videoGenerationGateway } from '@/services/VideoGenerationGateway'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import { EncryptionService } from '@/services/EncryptionService'

/**
 * GET /api/settings/providers
 * List connected providers (DO NOT return credentials)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from request (in production, this would come from authentication)
    const userId = request.headers.get('x-user-id') || 'demo_user_001'
    
    // Get available providers for the user
    const result = await videoGenerationGateway.getAvailableProviders(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to retrieve providers' },
        { status: 500 }
      )
    }

    // Get detailed provider information without credentials
    const providers = await Promise.all(
      result.data!.map(async (providerName) => {
        try {
          // Get provider capabilities
          const capabilities = await videoGenerationGateway.getProviderCapabilities(providerName)
          
          // Get provider status
          const status = await videoGenerationGateway.testProviderConnection(userId, providerName)
          
          return {
            provider: providerName,
            displayName: getProviderDisplayName(providerName),
            description: getProviderDescription(providerName),
            icon: getProviderIcon(providerName),
            isConnected: status.success && status.data,
            isConfigured: true,
            capabilities: capabilities.success ? capabilities.data : null,
            lastTested: new Date().toISOString(),
            status: status.success && status.data ? 'connected' : 'disconnected'
          }
        } catch (error) {
          return {
            provider: providerName,
            displayName: getProviderDisplayName(providerName),
            description: getProviderDescription(providerName),
            icon: getProviderIcon(providerName),
            isConnected: false,
            isConfigured: false,
            capabilities: null,
            lastTested: null,
            status: 'not_configured'
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: providers,
      message: `Found ${providers.length} providers`
    })

  } catch (error) {
    console.error('GET /api/settings/providers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/providers
 * Add/update provider credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, credentials, userId = 'demo_user_001' } = body

    // Validate request
    if (!provider || !credentials) {
      return NextResponse.json(
        { error: 'Provider and credentials are required' },
        { status: 400 }
      )
    }

    // Validate provider name
    if (!Object.values(AIProvider).includes(provider as AIProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider name' },
        { status: 400 }
      )
    }

    // Check if encryption is configured
    if (!EncryptionService.isEncryptionConfigured()) {
      return NextResponse.json(
        { error: 'Encryption service is not properly configured' },
        { status: 500 }
      )
    }

    // Step 1: Validate credentials using the adapter
    console.log(`🔐 Validating credentials for provider: ${provider}`)
    
    try {
      const validationResult = await videoGenerationGateway.testProviderConnection(userId, provider as AIProvider)
      
      if (!validationResult.success || !validationResult.data) {
        return NextResponse.json(
          { 
            error: 'Provider credentials validation failed',
            details: validationResult.error || 'Unknown validation error'
          },
          { status: 400 }
        )
      }
      
      console.log(`✅ Credentials validated successfully for ${provider}`)
      
    } catch (validationError) {
      console.error(`❌ Credential validation error for ${provider}:`, validationError)
      return NextResponse.json(
        { 
          error: 'Provider credentials validation failed',
          details: validationError instanceof Error ? validationError.message : 'Unknown error'
        },
        { status: 400 }
      )
    }

    // Step 2: Encrypt credentials
    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(credentials))
    
    // Step 3: Save to database
    try {
      const [userConfig, created] = await UserProviderConfig.findOrCreate({
        where: { 
          user_id: userId, 
          provider_name: provider as AIProvider 
        },
        defaults: {
          user_id: userId,
          provider_name: provider as AIProvider,
          encrypted_credentials: encryptedCredentials,
          is_valid: true
        }
      })

      if (!created) {
        // Update existing configuration
        userConfig.encrypted_credentials = encryptedCredentials
        userConfig.is_valid = true
        userConfig.updated_at = new Date()
        await userConfig.save()
      }

      console.log(`✅ Provider configuration ${created ? 'created' : 'updated'} for ${provider}`)

      // Step 4: Return success response
      return NextResponse.json({
        success: true,
        data: {
          provider,
          displayName: getProviderDisplayName(provider as AIProvider),
          description: getProviderDescription(provider as AIProvider),
          icon: getProviderIcon(provider as AIProvider),
          isConnected: true,
          isConfigured: true,
          status: 'connected',
          lastTested: new Date().toISOString()
        },
        message: `Provider ${provider} configured successfully`
      })

    } catch (databaseError) {
      console.error(`❌ Database error for ${provider}:`, databaseError)
      return NextResponse.json(
        { error: 'Failed to save provider configuration' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('POST /api/settings/providers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/providers
 * Remove provider configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const userId = request.headers.get('x-user-id') || 'demo_user_001'

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      )
    }

    // Validate provider name
    if (!Object.values(AIProvider).includes(provider as AIProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider name' },
        { status: 400 }
      )
    }

    // Remove provider configuration
    const deleted = await UserProviderConfig.destroy({
      where: { 
        user_id: userId, 
        provider_name: provider as AIProvider 
      }
    })

    if (deleted > 0) {
      return NextResponse.json({
        success: true,
        message: `Provider ${provider} removed successfully`
      })
    } else {
      return NextResponse.json(
        { error: 'Provider configuration not found' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('DELETE /api/settings/providers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/providers
 * Update provider configuration (e.g., toggle is_valid)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider, is_valid, userId = 'demo_user_001' } = body

    if (!provider || typeof is_valid !== 'boolean') {
      return NextResponse.json(
        { error: 'Provider and is_valid are required' },
        { status: 400 }
      )
    }

    // Validate provider name
    if (!Object.values(AIProvider).includes(provider as AIProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider name' },
        { status: 400 }
      )
    }

    // Update provider configuration
    const [updatedCount] = await UserProviderConfig.update(
      { is_valid, updated_at: new Date() },
      { 
        where: { 
          user_id: userId, 
          provider_name: provider as AIProvider 
        }
      }
    )

    if (updatedCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Provider ${provider} ${is_valid ? 'enabled' : 'disabled'} successfully`
      })
    } else {
      return NextResponse.json(
        { error: 'Provider configuration not found' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('PUT /api/settings/providers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions for provider information
function getProviderDisplayName(provider: AIProvider): string {
  const names = {
    [AIProvider.GOOGLE_VEO]: 'Google Veo',
    [AIProvider.RUNWAY]: 'Runway ML',
    [AIProvider.STABILITY_AI]: 'Stability AI'
  }
  return names[provider] || provider
}

function getProviderDescription(provider: AIProvider): string {
  const descriptions = {
    [AIProvider.GOOGLE_VEO]: 'Google\'s advanced AI video generation model with cinematic quality',
    [AIProvider.RUNWAY]: 'Professional AI video generation platform for creative professionals',
    [AIProvider.STABILITY_AI]: 'High-quality AI video generation with stable diffusion technology'
  }
  return descriptions[provider] || 'AI video generation provider'
}

function getProviderIcon(provider: AIProvider): string {
  const icons = {
    [AIProvider.GOOGLE_VEO]: '🎬',
    [AIProvider.RUNWAY]: '🎭',
    [AIProvider.STABILITY_AI]: '⚡'
  }
  return icons[provider] || '🤖'
}
