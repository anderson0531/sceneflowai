#!/usr/bin/env node

/**
 * ES Module Test Script for VideoGenerationGateway
 * 
 * This script tests basic functionality using ES modules
 */

console.log('🧪 Testing VideoGenerationGateway Service...\n')

// Test 1: Check if we can import the services
try {
  console.log('🔐 Test 1: Checking service imports...')
  
  // Try to import the services
  const { EncryptionService } = await import('./src/services/EncryptionService.js')
  console.log('✅ EncryptionService imported successfully')
  
  const { videoGenerationGateway } = await import('./src/services/VideoGenerationGateway.js')
  console.log('✅ VideoGenerationGateway imported successfully')
  
  const { AIProvider } = await import('./src/services/ai-providers/BaseAIProviderAdapter.js')
  console.log('✅ AIProvider enum imported successfully')
  
  console.log('')

} catch (error) {
  console.log('❌ Service import failed:', error.message)
  console.log('💡 This might be due to TypeScript compilation issues')
  process.exit(1)
}

// Test 2: Check encryption service configuration
try {
  console.log('🔐 Test 2: Checking encryption service...')
  const { EncryptionService } = await import('./src/services/EncryptionService.js')
  
  const isConfigured = EncryptionService.isEncryptionConfigured()
  console.log('📊 Encryption configured:', isConfigured)
  
  if (!isConfigured) {
    console.log('📝 Please set ENCRYPTION_KEY in your .env.local file')
    console.log('💡 Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  
  console.log('')

} catch (error) {
  console.log('❌ Encryption service test failed:', error.message)
}

// Test 3: Test adapter creation
try {
  console.log('🏭 Test 3: Testing adapter creation...')
  const { videoGenerationGateway } = await import('./src/services/VideoGenerationGateway.js')
  const { AIProvider } = await import('./src/services/ai-providers/BaseAIProviderAdapter.js')
  
  try {
    const googleVeoAdapter = videoGenerationGateway.get_adapter(AIProvider.GOOGLE_VEO)
    console.log('✅ Google Veo adapter created successfully')
  } catch (error) {
    console.log('❌ Google Veo adapter creation failed:', error.message)
  }
  
  try {
    const runwayAdapter = videoGenerationGateway.get_adapter(AIProvider.RUNWAY)
    console.log('✅ Runway adapter created successfully')
  } catch (error) {
    console.log('❌ Runway adapter creation failed:', error.message)
  }
  
  try {
    const stabilityAdapter = videoGenerationGateway.get_adapter(AIProvider.STABILITY_AI)
    console.log('✅ Stability AI adapter created successfully')
  } catch (error) {
    console.log('❌ Stability AI adapter creation failed:', error.message)
  }
  
  console.log('')

} catch (error) {
  console.log('❌ Adapter creation test failed:', error.message)
}

// Test 4: Test provider capabilities
try {
  console.log('📊 Test 4: Testing provider capabilities...')
  const { videoGenerationGateway } = await import('./src/services/VideoGenerationGateway.js')
  const { AIProvider } = await import('./src/services/ai-providers/BaseAIProviderAdapter.js')
  
  try {
    const capabilities = await videoGenerationGateway.getProviderCapabilities(AIProvider.GOOGLE_VEO)
    if (capabilities.success) {
      console.log('✅ Google Veo capabilities retrieved')
      console.log(`   - Max Duration: ${capabilities.data?.maxDuration}s`)
      console.log(`   - Supported Resolutions: ${capabilities.data?.supportedResolutions?.length || 0}`)
    } else {
      console.log('❌ Failed to get Google Veo capabilities:', capabilities.error)
    }
  } catch (error) {
    console.log('❌ Provider capabilities test failed:', error.message)
  }
  
  console.log('')

} catch (error) {
  console.log('❌ Provider capabilities test failed:', error.message)
}

console.log('🎉 Basic gateway tests completed!')
console.log('\n📋 Next steps:')
console.log('   1. Set up database and run database setup script')
console.log('   2. Configure real AI provider credentials')
console.log('   3. Test with real provider APIs')
console.log('   4. Run full integration tests')
