#!/usr/bin/env ts-node

/**
 * API Testing Script for SceneFlow AI
 * 
 * This script tests the API endpoints for provider management and video generation
 * 
 * Usage:
 *   npm run test:api
 *   or
 *   npx ts-node src/scripts/test-api.ts
 */

const BASE_URL = 'http://localhost:3000/api'

interface TestResult {
  endpoint: string
  method: string
  success: boolean
  status: number
  response: any
  error?: string
}

async function testAPI(): Promise<void> {
  console.log('🧪 Testing SceneFlow AI API Endpoints...\n')

  const results: TestResult[] = []

  // Test 1: Health Check
  console.log('🔍 Test 1: Health Check Endpoint')
  results.push(await testEndpoint('/health', 'GET'))

  // Test 2: List Providers (GET)
  console.log('🔍 Test 2: List Providers Endpoint')
  results.push(await testEndpoint('/settings/providers', 'GET'))

  // Test 3: Add Provider (POST)
  console.log('🔍 Test 3: Add Provider Endpoint')
  results.push(await testEndpoint('/settings/providers', 'POST', {
    provider: 'GOOGLE_VEO',
    credentials: {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test_key_id',
      private_key: '-----BEGIN PRIVATE KEY-----\nTest Private Key\n-----END PRIVATE KEY-----',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: 'test_client_id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com'
    }
  }))

  // Test 4: Video Generation (POST)
  console.log('🔍 Test 4: Video Generation Endpoint')
  results.push(await testEndpoint('/video/generate', 'POST', {
    provider: 'GOOGLE_VEO',
    request: {
      prompt: 'A beautiful sunset over a calm ocean with gentle waves',
      negative_prompt: 'dark, gloomy, stormy weather, low quality',
      aspect_ratio: '16:9',
      motion_intensity: 7,
      duration: 15,
      resolution: '1920x1080',
      style: 'cinematic',
      quality: 'high',
      fps: 30,
      seed: 42
    }
  }))

  // Test 5: Invalid Video Request (POST)
  console.log('🔍 Test 5: Invalid Video Request Validation')
  results.push(await testEndpoint('/video/generate', 'POST', {
    provider: 'GOOGLE_VEO',
    request: {
      prompt: '', // Invalid: empty prompt
      aspect_ratio: '16:9',
      motion_intensity: 15 // Invalid: out of range
    }
  }))

  // Test 6: Invalid Provider (POST)
  console.log('🔍 Test 6: Invalid Provider Validation')
  results.push(await testEndpoint('/video/generate', 'POST', {
    provider: 'INVALID_PROVIDER',
    request: {
      prompt: 'A beautiful landscape',
      aspect_ratio: '16:9',
      motion_intensity: 5
    }
  }))

  // Test 7: Missing Required Fields (POST)
  console.log('🔍 Test 7: Missing Required Fields Validation')
  results.push(await testEndpoint('/video/generate', 'POST', {
    provider: 'GOOGLE_VEO'
    // Missing request field
  }))

  // Test 8: Provider Capabilities
  console.log('🔍 Test 8: Provider Capabilities (via settings)')
  results.push(await testEndpoint('/settings/providers', 'GET'))

  // Print Results Summary
  console.log('\n📊 API Test Results Summary:')
  console.log('=' * 50)
  
  let passedTests = 0
  let failedTests = 0
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const statusCode = result.status
    const endpoint = `${result.method} ${result.endpoint}`
    
    console.log(`${index + 1}. ${status} - ${endpoint} (${statusCode})`)
    
    if (result.success) {
      passedTests++
    } else {
      failedTests++
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    }
  })
  
  console.log('=' * 50)
  console.log(`📈 Total Tests: ${results.length}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📊 Success Rate: ${Math.round((passedTests / results.length) * 100)}%`)
  
  if (failedTests > 0) {
    console.log('\n🔍 Failed Test Analysis:')
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`${index + 1}. ${result.method} ${result.endpoint}:`)
      console.log(`   Status: ${result.status}`)
      console.log(`   Error: ${result.error || 'Unknown error'}`)
      if (result.response && result.response.details) {
        console.log(`   Details: ${JSON.stringify(result.response.details, null, 2)}`)
      }
    })
  }
  
  console.log('\n🎯 Next Steps:')
  if (failedTests === 0) {
    console.log('✅ All API tests passed! The backend is working correctly.')
    console.log('📝 Ready for integration testing with real provider APIs.')
  } else {
    console.log('⚠️ Some API tests failed. Check the error details above.')
    console.log('🔧 Fix the issues before proceeding to integration testing.')
  }
}

async function testEndpoint(
  endpoint: string, 
  method: string, 
  body?: any
): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'demo_user_001'
    }
  }
  
  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(url, options)
    const responseData = await response.json()
    
    const result: TestResult = {
      endpoint,
      method,
      success: response.ok,
      status: response.status,
      response: responseData
    }
    
    if (!response.ok) {
      result.error = responseData.error || `HTTP ${response.status}`
    }
    
    return result
    
  } catch (error) {
    return {
      endpoint,
      method,
      success: false,
      status: 0,
      response: {},
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

// Test specific endpoint functionality
async function testProviderManagement(): Promise<void> {
  console.log('\n🔧 Testing Provider Management Workflow...')
  
  // Step 1: Add a provider
  console.log('📝 Step 1: Adding Google Veo provider...')
  const addResult = await testEndpoint('/settings/providers', 'POST', {
    provider: 'GOOGLE_VEO',
    credentials: {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'test_key_id',
      private_key: '-----BEGIN PRIVATE KEY-----\nTest Private Key\n-----END PRIVATE KEY-----',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: 'test_client_id',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com'
    }
  })
  
  if (addResult.success) {
    console.log('✅ Provider added successfully')
    
    // Step 2: List providers
    console.log('📋 Step 2: Listing providers...')
    const listResult = await testEndpoint('/settings/providers', 'GET')
    
    if (listResult.success) {
      console.log('✅ Providers listed successfully')
      console.log(`📊 Found ${listResult.response.data?.length || 0} providers`)
    } else {
      console.log('❌ Failed to list providers:', listResult.error)
    }
    
    // Step 3: Test video generation
    console.log('🎬 Step 3: Testing video generation...')
    const generateResult = await testEndpoint('/video/generate', 'POST', {
      provider: 'GOOGLE_VEO',
      request: {
        prompt: 'A serene forest with sunlight filtering through trees',
        aspect_ratio: '16:9',
        motion_intensity: 5,
        duration: 10,
        resolution: '1920x1080',
        quality: 'standard'
      }
    })
    
    if (generateResult.success) {
      console.log('✅ Video generation initiated successfully')
      console.log(`🆔 Generation ID: ${generateResult.response.data?.generationId}`)
      console.log(`📊 Status: ${generateResult.response.data?.status}`)
    } else {
      console.log('❌ Video generation failed:', generateResult.error)
    }
    
  } else {
    console.log('❌ Failed to add provider:', addResult.error)
  }
}

// Main execution
if (require.main === module) {
  testAPI()
    .then(() => testProviderManagement())
    .then(() => {
      console.log('\n🏁 API testing completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 API testing failed:', error)
      process.exit(1)
    })
}

export { testAPI, testProviderManagement, testEndpoint }
