#!/usr/bin/env ts-node

/**
 * Test Script for Cue API Endpoint
 * 
 * This script tests the /api/ideation/cue endpoint with various conversation scenarios
 * 
 * Usage:
 *   npm run test:cue
 *   or
 *   npx ts-node src/scripts/test-cue-api.ts
 */

const BASE_URL = 'http://localhost:3000/api'

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface CueRequest {
  userId: string
  conversationHistory: ConversationMessage[]
  currentConcept?: {
    title?: string
    description?: string
    targetAudience?: string
    keyMessage?: string
    tone?: string
    genre?: string
    duration?: number
  }
  provider?: string
}

interface CueResponse {
  success: boolean
  data: {
    message: string
    suggestions: string[]
    completeness_score: number
    analysis: {
      narrative_strength: number
      audience_alignment: number
      market_potential: number
      execution_feasibility: number
    }
    next_questions: string[]
    concept_refinements: any
  }
  message: string
}

async function testCueAPI(): Promise<void> {
  console.log('🧪 Testing Cue API Endpoint...\n')

  const results: Array<{
    testName: string
    success: boolean
    response?: CueResponse
    error?: string
  }> = []

  // Test 1: Initial conversation with no concept
  console.log('🔍 Test 1: Initial conversation (no concept)')
  results.push(await testCueConversation({
    testName: 'Initial conversation (no concept)',
    userId: 'demo_user_001',
    conversationHistory: [
      {
        role: 'user',
        content: 'Hi Cue! I want to create a video but I\'m not sure where to start.',
        timestamp: new Date().toISOString()
      }
    ]
  }))

  // Test 2: Concept development conversation
  console.log('🔍 Test 2: Concept development conversation')
  results.push(await testCueConversation({
    testName: 'Concept development conversation',
    userId: 'demo_user_001',
    conversationHistory: [
      {
        role: 'user',
        content: 'I want to create a video about sustainable living for young professionals.',
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: 'That\'s a great topic! Let me help you develop this concept. What specific aspect of sustainable living do you want to focus on?',
        timestamp: new Date().toISOString()
      },
      {
        role: 'user',
        content: 'I want to focus on easy ways to reduce plastic waste in daily life.',
        timestamp: new Date().toISOString()
      }
    ],
    currentConcept: {
      title: 'Sustainable Living for Young Professionals',
      description: 'A video about reducing plastic waste in daily life',
      targetAudience: 'Young professionals',
      keyMessage: 'Small changes can make a big impact on the environment'
    }
  }))

  // Test 3: Advanced concept with provider
  console.log('🔍 Test 3: Advanced concept with provider')
  results.push(await testCueConversation({
    testName: 'Advanced concept with provider',
    userId: 'demo_user_001',
    conversationHistory: [
      {
        role: 'user',
        content: 'I think my concept is ready. Can you help me refine it for video production?',
        timestamp: new Date().toISOString()
      }
    ],
    currentConcept: {
      title: 'Zero Waste Kitchen: 10 Easy Swaps',
      description: 'A comprehensive guide showing young professionals how to reduce kitchen waste through simple swaps and sustainable practices',
      targetAudience: 'Young professionals aged 25-35 interested in sustainability',
      keyMessage: 'Sustainable living is accessible and affordable for everyone',
      tone: 'Educational and inspiring',
      genre: 'How-to/Educational',
      duration: 90
    },
    provider: 'GOOGLE_VEO'
  }))

  // Test 4: Invalid request (missing userId)
  console.log('🔍 Test 4: Invalid request (missing userId)')
  results.push(await testCueConversation({
    testName: 'Invalid request (missing userId)',
    userId: '',
    conversationHistory: [
      {
        role: 'user',
        content: 'Test message',
        timestamp: new Date().toISOString()
      }
    ]
  }))

  // Test 5: Invalid request (empty conversation)
  console.log('🔍 Test 5: Invalid request (empty conversation)')
  results.push(await testCueConversation({
    testName: 'Invalid request (empty conversation)',
    userId: 'demo_user_001',
    conversationHistory: []
  }))

  // Print Results Summary
  console.log('\n📊 Cue API Test Results Summary:')
  console.log('=' * 50)
  
  let passedTests = 0
  let failedTests = 0
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const testName = result.testName
    
    console.log(`${index + 1}. ${status} - ${testName}`)
    
    if (result.success && result.response) {
      console.log(`   Completeness Score: ${result.response.data.completeness_score}`)
      console.log(`   Suggestions: ${result.response.data.suggestions.length}`)
      console(`   Next Questions: ${result.response.data.next_questions.length}`)
    } else if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log('=' * 50)
  console.log(`📈 Total Tests: ${results.length}`)
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📊 Success Rate: ${Math.round((passedTests / results.length) * 100)}%`)
  
  // Detailed analysis of successful responses
  console.log('\n🔍 Detailed Analysis of Successful Responses:')
  results.filter(r => r.success && r.response).forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.testName}:`)
    const data = result.response!.data
    
    console.log(`   Message: ${data.message.substring(0, 100)}...`)
    console.log(`   Completeness Score: ${data.completeness_score}`)
    console.log(`   Analysis:`)
    console.log(`     - Narrative Strength: ${data.analysis.narrative_strength}`)
    console.log(`     - Audience Alignment: ${data.analysis.audience_alignment}`)
    console.log(`     - Market Potential: ${data.analysis.market_potential}`)
    console.log(`     - Execution Feasibility: ${data.analysis.execution_feasibility}`)
    console.log(`   Suggestions: ${data.suggestions.join(', ')}`)
    console.log(`   Next Questions: ${data.next_questions.join(', ')}`)
  })
  
  console.log('\n🎯 Next Steps:')
  if (failedTests === 0) {
    console.log('✅ All Cue API tests passed! The dual persona system is working correctly.')
    console.log('📝 Ready for integration with the frontend chat interface.')
  } else {
    console.log('⚠️ Some Cue API tests failed. Check the error details above.')
    console.log('🔧 Fix the issues before proceeding to frontend integration.')
  }
}

async function testCueConversation(testConfig: {
  testName: string
  userId: string
  conversationHistory: ConversationMessage[]
  currentConcept?: any
  provider?: string
}): Promise<{
  testName: string
  success: boolean
  response?: CueResponse
  error?: string
}> {
  const { testName, userId, conversationHistory, currentConcept, provider } = testConfig
  
  try {
    const requestBody: CueRequest = {
      userId,
      conversationHistory,
      currentConcept,
      provider: provider as any
    }
    
    const response = await fetch(`${BASE_URL}/ideation/cue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (response.ok) {
      const responseData: CueResponse = await response.json()
      
      // Validate response structure
      const isValidResponse = validateCueResponse(responseData)
      
      if (isValidResponse) {
        return {
          testName,
          success: true,
          response: responseData
        }
      } else {
        return {
          testName,
          success: false,
          error: 'Invalid response structure'
        }
      }
    } else {
      const errorData = await response.json()
      return {
        testName,
        success: false,
        error: errorData.error || `HTTP ${response.status}`
      }
    }
    
  } catch (error) {
    return {
      testName,
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

function validateCueResponse(response: any): boolean {
  try {
    // Check if response has required structure
    if (!response.success || !response.data) {
      return false
    }
    
    const data = response.data
    
    // Validate required fields
    if (typeof data.message !== 'string' || data.message.length === 0) {
      return false
    }
    
    if (!Array.isArray(data.suggestions) || data.suggestions.length === 0) {
      return false
    }
    
    if (typeof data.completeness_score !== 'number' || 
        data.completeness_score < 0 || data.completeness_score > 1) {
      return false
    }
    
    if (!data.analysis || typeof data.analysis !== 'object') {
      return false
    }
    
    // Validate analysis fields
    const analysis = data.analysis
    const requiredAnalysisFields = ['narrative_strength', 'audience_alignment', 'market_potential', 'execution_feasibility']
    
    for (const field of requiredAnalysisFields) {
      if (typeof analysis[field] !== 'number' || analysis[field] < 0 || analysis[field] > 1) {
        return false
      }
    }
    
    if (!Array.isArray(data.next_questions) || data.next_questions.length === 0) {
      return false
    }
    
    if (!data.concept_refinements || typeof data.concept_refinements !== 'object') {
      return false
    }
    
    return true
    
  } catch (error) {
    return false
  }
}

// Test specific conversation scenarios
async function testConversationScenarios(): Promise<void> {
  console.log('\n🔧 Testing Specific Conversation Scenarios...')
  
  // Scenario 1: Brand new user starting from scratch
  console.log('📝 Scenario 1: Brand new user starting from scratch')
  const newUserResponse = await testCueConversation({
    testName: 'New user scenario',
    userId: 'new_user_001',
    conversationHistory: [
      {
        role: 'user',
        content: 'I have no idea what kind of video to make. Can you help me?',
        timestamp: new Date().toISOString()
      }
    ]
  })
  
  if (newUserResponse.success) {
    console.log('✅ New user scenario passed')
    console.log(`   Initial completeness score: ${newUserResponse.response?.data.completeness_score}`)
    console.log(`   First suggestion: ${newUserResponse.response?.data.suggestions[0]}`)
  } else {
    console.log('❌ New user scenario failed:', newUserResponse.error)
  }
  
  // Scenario 2: User with partial concept
  console.log('📝 Scenario 2: User with partial concept')
  const partialConceptResponse = await testCueConversation({
    testName: 'Partial concept scenario',
    userId: 'partial_user_001',
    conversationHistory: [
      {
        role: 'user',
        content: 'I want to make a video about cooking, but I\'m not sure about the details.',
        timestamp: new Date().toISOString()
      }
    ],
    currentConcept: {
      title: 'Cooking Video',
      description: 'A video about cooking'
    }
  })
  
  if (partialConceptResponse.success) {
    console.log('✅ Partial concept scenario passed')
    console.log(`   Completeness score: ${partialConceptResponse.response?.data.completeness_score}`)
    console.log(`   Areas for improvement: ${partialConceptResponse.response?.data.suggestions.join(', ')}`)
  } else {
    console.log('❌ Partial concept scenario failed:', partialConceptResponse.error)
  }
  
  // Scenario 3: User with complete concept
  console.log('📝 Scenario 3: User with complete concept')
  const completeConceptResponse = await testCueConversation({
    testName: 'Complete concept scenario',
    userId: 'complete_user_001',
    conversationHistory: [
      {
        role: 'user',
        content: 'I think my concept is ready. Can you review it?',
        timestamp: new Date().toISOString()
      }
    ],
    currentConcept: {
      title: 'Mastering Sourdough Bread: A Complete Guide',
      description: 'A comprehensive tutorial for beginners to master the art of sourdough bread making, covering everything from starter creation to final baking',
      targetAudience: 'Home bakers aged 25-45 interested in artisanal bread making',
      keyMessage: 'Anyone can make amazing sourdough bread with patience and practice',
      tone: 'Encouraging and educational',
      genre: 'How-to/Educational',
      duration: 120
    }
  })
  
  if (completeConceptResponse.success) {
    console.log('✅ Complete concept scenario passed')
    console.log(`   Completeness score: ${completeConceptResponse.response?.data.completeness_score}`)
    console.log(`   Narrative strength: ${completeConceptResponse.response?.data.analysis.narrative_strength}`)
    console.log(`   Market potential: ${completeConceptResponse.response?.data.analysis.market_potential}`)
  } else {
    console.log('❌ Complete concept scenario failed:', completeConceptResponse.error)
  }
}

// Main execution
if (require.main === module) {
  testCueAPI()
    .then(() => testConversationScenarios())
    .then(() => {
      console.log('\n🏁 Cue API testing completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Cue API testing failed:', error)
      process.exit(1)
    })
}

export { testCueAPI, testConversationScenarios, testCueConversation, validateCueResponse }
