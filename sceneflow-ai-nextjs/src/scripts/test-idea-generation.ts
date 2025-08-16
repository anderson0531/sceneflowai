#!/usr/bin/env ts-node

/**
 * Test Script for Idea Generation API Endpoint
 * 
 * This script tests the /api/ideation/generate endpoint with various concept scenarios
 * 
 * Usage:
 *   npm run test:ideas
 *   or
 *   npx ts-node src/scripts/test-idea-generation.ts
 */

const BASE_URL = 'http://localhost:3000/api'

interface VideoIdea {
  id: string
  title: string
  synopsis: string
  scene_outline: string[]
  thumbnail_prompt: string
  strength_rating: number
}

interface IdeaGenerationRequest {
  userId: string
  conversationHistory: any[]
  finalizedConcept: {
    targetAudience: string
    keyMessage: string
    tone?: string
    genre?: string
    duration?: number
  }
}

async function testIdeaGenerationAPI(): Promise<void> {
  console.log('🧪 Testing Idea Generation API Endpoint...\n')

  // Test 1: Sustainable Living Concept
  console.log('🔍 Test 1: Sustainable Living Concept')
  const result1 = await testIdeaGeneration({
    userId: 'demo_user_001',
    conversationHistory: [
      { role: 'user', content: 'I want to create a video about sustainable living for young professionals.' },
      { role: 'assistant', content: 'That\'s a great topic! Let me help you develop this concept.' }
    ],
    finalizedConcept: {
      targetAudience: 'Young professionals aged 25-35 interested in sustainability',
      keyMessage: 'Sustainable living is accessible and affordable for everyone',
      tone: 'Educational and inspiring',
      genre: 'How-to/Educational',
      duration: 90
    }
  })

  if (result1.success) {
    console.log('✅ Test 1 passed')
    console.log(`   Ideas generated: ${result1.response?.data.ideas.length}`)
    console.log(`   Average rating: ${result1.response?.data.generationMetadata.averageStrengthRating}`)
  } else {
    console.log('❌ Test 1 failed:', result1.error)
  }

  // Test 2: Invalid request (missing concept)
  console.log('🔍 Test 2: Invalid request (missing concept)')
  const result2 = await testIdeaGeneration({
    userId: 'demo_user_002',
    conversationHistory: [{ role: 'user', content: 'Test message' }],
    finalizedConcept: {
      targetAudience: '',
      keyMessage: ''
    }
  })

  if (!result2.success) {
    console.log('✅ Test 2 passed (correctly rejected invalid request)')
  } else {
    console.log('❌ Test 2 failed (should have rejected invalid request)')
  }

  console.log('\n🎯 Idea generation API testing completed!')
}

async function testIdeaGeneration(requestBody: IdeaGenerationRequest): Promise<{
  success: boolean
  response?: any
  error?: string
}> {
  try {
    const response = await fetch(`${BASE_URL}/ideation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    
    if (response.ok) {
      const data = await response.json()
      return { success: true, response: data }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.error || `HTTP ${response.status}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Main execution
if (require.main === module) {
  testIdeaGenerationAPI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n💥 Idea generation API testing failed:', error)
      process.exit(1)
    })
}

export { testIdeaGenerationAPI, testIdeaGeneration }
