import { NextRequest, NextResponse } from 'next/server'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { videoGenerationGateway } from '@/services/VideoGenerationGateway'
import { EncryptionService } from '@/services/EncryptionService'

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
  provider?: AIProvider
}

interface CueResponse {
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
  concept_refinements: {
    title?: string
    description?: string
    targetAudience?: string
    keyMessage?: string
    tone?: string
    genre?: string
    duration?: number
  }
}

/**
 * POST /api/ideation/cue
 * Cue's conversation endpoint with dual persona prompt engineering
 */
export async function POST(request: NextRequest) {
  try {
    const body: CueRequest = await request.json()
    const { userId, conversationHistory, currentConcept, provider = AIProvider.GOOGLE_VEO } = body

    // Validate request
    if (!userId || !conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json(
        { error: 'User ID and conversation history are required' },
        { status: 400 }
      )
    }

    console.log(`🎭 Cue conversation initiated for user: ${userId}`)
    console.log(`📝 Conversation length: ${conversationHistory.length} messages`)
    console.log(`🤖 Using provider: ${provider}`)

    // Get user's provider configuration
    let userCredentials: any = null
    let isUsingUserProvider = false

    try {
      // Check if user has configured the specified provider
      const providerStatus = await videoGenerationGateway.testProviderConnection(userId, provider)
      
      if (providerStatus.success && providerStatus.data) {
        isUsingUserProvider = true
        console.log(`✅ Using user's configured ${provider} credentials`)
        
        // Get provider capabilities for context
        const capabilities = await videoGenerationGateway.getProviderCapabilities(provider)
        if (capabilities.success) {
          console.log(`📊 Provider capabilities: ${JSON.stringify(capabilities.data)}`)
        }
      } else {
        console.log(`⚠️ User's ${provider} not configured, using default simulation`)
      }
    } catch (error) {
      console.log(`⚠️ Provider check failed, using default simulation: ${error}`)
    }

    // Generate Cue's response using the dual persona system
    const cueResponse = await generateCueResponse(
      conversationHistory,
      currentConcept,
      provider,
      isUsingUserProvider
    )

    console.log(`🎯 Cue response generated with completeness score: ${cueResponse.completeness_score}`)

    return NextResponse.json({
      success: true,
      data: cueResponse,
      message: 'Cue response generated successfully'
    })

  } catch (error) {
    console.error('POST /api/ideation/cue error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate Cue's response using dual persona prompt engineering
 */
async function generateCueResponse(
  conversationHistory: ConversationMessage[],
  currentConcept: any = {},
  provider: AIProvider,
  isUsingUserProvider: boolean
): Promise<CueResponse> {
  
  // Construct the dual persona system prompt
  const systemPrompt = constructDualPersonaPrompt(currentConcept, provider, isUsingUserProvider)
  
  // Format conversation for LLM
  const formattedConversation = formatConversationForLLM(systemPrompt, conversationHistory)
  
  // Generate response using LLM (or simulation for demo)
  let llmResponse: string
  
  if (isUsingUserProvider) {
    // In production, this would call the actual LLM API
    // For now, we'll simulate the response
    llmResponse = await simulateLLMResponse(formattedConversation, currentConcept)
  } else {
    // Use simulation for demo purposes
    llmResponse = await simulateLLMResponse(formattedConversation, currentConcept)
  }
  
  // Parse and structure the response
  return parseCueResponse(llmResponse, currentConcept)
}

/**
 * Construct the dual persona system prompt
 */
function constructDualPersonaPrompt(currentConcept: any, provider: AIProvider, isUsingUserProvider: boolean): string {
  const providerInfo = getProviderInfo(provider)
  
  return `You are Cue, an AI creative assistant with a dual persona approach to video concept development. You must respond as both:

1. PROFESSIONAL SCRIPTWRITER/DIRECTOR:
   - Focus on narrative structure, storytelling techniques, and execution feasibility
   - Provide insights on pacing, character development, visual storytelling
   - Consider technical aspects like shot composition, editing flow, and production requirements
   - Evaluate creative originality and artistic merit

2. AUDIENCE ANALYST:
   - Analyze target demographics and their viewing preferences
   - Assess market trends and engagement patterns
   - Evaluate commercial viability and audience appeal
   - Consider cultural relevance and social impact

CONVERSATION GUIDELINES:
- Ask probing questions to refine the concept from both perspectives
- Provide constructive feedback that balances creativity with market appeal
- Suggest specific improvements based on your dual analysis
- Calculate a completeness_score (0.0-1.0) based on concept development
- Offer 2-3 actionable suggestions for concept refinement
- Provide next questions to guide the user's thinking

TECHNICAL CONTEXT:
- AI Provider: ${providerInfo.name}
- Provider Capabilities: ${providerInfo.capabilities}
- Current Concept: ${JSON.stringify(currentConcept, null, 2)}

RESPONSE FORMAT:
You must respond with valid JSON in this exact structure:
{
  "message": "Your conversational response as Cue, incorporating both personas",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],
  "completeness_score": 0.65,
  "analysis": {
    "narrative_strength": 0.7,
    "audience_alignment": 0.6,
    "market_potential": 0.8,
    "execution_feasibility": 0.5
  },
  "next_questions": ["Question 1", "Question 2", "Question 3"],
  "concept_refinements": {
    "title": "Refined title",
    "description": "Enhanced description",
    "targetAudience": "More specific audience",
    "keyMessage": "Sharpened key message",
    "tone": "Refined tone",
    "genre": "Specific genre",
    "duration": 60
  }
}

IMPORTANT: Ensure your response is valid JSON. The completeness_score should reflect how well-developed the concept is (0.0 = just starting, 1.0 = fully developed).`
}

/**
 * Get provider information for context
 */
function getProviderInfo(provider: AIProvider): { name: string; capabilities: string } {
  const providerInfo = {
    [AIProvider.GOOGLE_VEO]: {
      name: 'Google Veo',
      capabilities: 'High-quality cinematic video generation, up to 60s, multiple aspect ratios, motion control'
    },
    [AIProvider.RUNWAY]: {
      name: 'Runway ML',
      capabilities: 'Professional video generation, up to 120s, advanced motion control, style transfer'
    },
    [AIProvider.STABILITY_AI]: {
      name: 'Stability AI',
      capabilities: 'Creative video generation, up to 25s, artistic styles, stable diffusion technology'
    }
  }
  
  return providerInfo[provider] || {
    name: 'Unknown Provider',
    capabilities: 'Standard video generation capabilities'
  }
}

/**
 * Format conversation for LLM input
 */
function formatConversationForLLM(systemPrompt: string, conversationHistory: ConversationMessage[]): string {
  let formatted = `SYSTEM PROMPT:\n${systemPrompt}\n\nCONVERSATION HISTORY:\n`
  
  conversationHistory.forEach((message, index) => {
    const role = message.role === 'user' ? 'USER' : 'ASSISTANT'
    formatted += `${role}: ${message.content}\n`
  })
  
  formatted += `\nASSISTANT (Cue):`
  return formatted
}

/**
 * Simulate LLM response for demo purposes
 */
async function simulateLLMResponse(formattedConversation: string, currentConcept: any): Promise<string> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Analyze the current concept and generate a contextual response
  const conceptAnalysis = analyzeConcept(currentConcept)
  
  // Generate a realistic Cue response based on the concept analysis
  const response = generateContextualCueResponse(conceptAnalysis, currentConcept)
  
  return response
}

/**
 * Analyze the current concept to determine response strategy
 */
function analyzeConcept(currentConcept: any): {
  developmentStage: 'initial' | 'developing' | 'refined' | 'complete'
  missingElements: string[]
  strengths: string[]
  areasForImprovement: string[]
} {
  const { title, description, targetAudience, keyMessage, tone, genre, duration } = currentConcept || {}
  
  const missingElements: string[] = []
  const strengths: string[] = []
  const areasForImprovement: string[] = []
  
  // Analyze what's present and what's missing
  if (!title || title.trim().length < 3) missingElements.push('clear title')
  if (!description || description.trim().length < 20) missingElements.push('detailed description')
  if (!targetAudience || targetAudience.trim().length < 10) missingElements.push('specific target audience')
  if (!keyMessage || keyMessage.trim().length < 10) missingElements.push('clear key message')
  if (!tone) missingElements.push('defined tone')
  if (!genre) missingElements.push('specific genre')
  if (!duration) missingElements.push('target duration')
  
  // Identify strengths
  if (title && title.trim().length >= 3) strengths.push('has a title')
  if (description && description.trim().length >= 20) strengths.push('has description')
  if (targetAudience && targetAudience.trim().length >= 10) strengths.push('target audience defined')
  if (keyMessage && keyMessage.trim().length >= 10) strengths.push('key message present')
  
  // Determine development stage
  let developmentStage: 'initial' | 'developing' | 'refined' | 'complete' = 'initial'
  if (missingElements.length <= 2) developmentStage = 'complete'
  else if (missingElements.length <= 4) developmentStage = 'refined'
  else if (missingElements.length <= 6) developmentStage = 'developing'
  
  // Identify areas for improvement
  if (missingElements.length > 0) {
    areasForImprovement.push(...missingElements)
  }
  
  return {
    developmentStage,
    missingElements,
    strengths,
    areasForImprovement
  }
}

/**
 * Generate contextual Cue response based on concept analysis
 */
function generateContextualCueResponse(conceptAnalysis: any, currentConcept: any): string {
  const { developmentStage, missingElements, strengths, areasForImprovement } = conceptAnalysis
  
  let message = ''
  let suggestions: string[] = []
  let completeness_score = 0
  let analysis = {
    narrative_strength: 0,
    audience_alignment: 0,
    market_potential: 0,
    execution_feasibility: 0
  }
  let next_questions: string[] = []
  let concept_refinements: any = {}
  
  // Generate response based on development stage
  switch (developmentStage) {
    case 'initial':
      message = `I can see you're starting to develop your video concept! As both a scriptwriter and audience analyst, I'm excited to help you shape this idea. You have ${strengths.join(', ')} which is a great foundation.`
      
      suggestions = [
        "Let's start by defining your target audience more specifically - who exactly are you trying to reach?",
        "What's the core message you want viewers to take away from this video?",
        "Consider the tone and style that would best connect with your audience"
      ]
      
      completeness_score = 0.2
      analysis = { narrative_strength: 0.3, audience_alignment: 0.2, market_potential: 0.4, execution_feasibility: 0.3 }
      
      next_questions = [
        "Can you describe your ideal viewer in detail?",
        "What emotion do you want to evoke in your audience?",
        "What's the main problem or question your video will address?"
      ]
      
      concept_refinements = {
        title: currentConcept.title || "Untitled Concept",
        description: currentConcept.description || "A compelling video concept in development",
        targetAudience: "Define your specific target audience",
        keyMessage: "Clarify your core message",
        tone: "Determine the emotional tone",
        genre: "Choose a specific genre",
        duration: 60
      }
      break
      
    case 'developing':
      message = `Great progress! You're building a solid foundation for your video concept. I can see you've developed ${strengths.join(', ')}. As a director, I'm noticing some areas where we can strengthen the narrative structure, and as an audience analyst, I see opportunities to better align with your target market.`
      
      suggestions = [
        "Refine your target audience to be more specific - think demographics, interests, and viewing habits",
        "Strengthen your key message to be more compelling and memorable",
        "Consider how your chosen tone will resonate with your specific audience"
      ]
      
      completeness_score = 0.45
      analysis = { narrative_strength: 0.5, audience_alignment: 0.4, market_potential: 0.6, execution_feasibility: 0.5 }
      
      next_questions = [
        "What makes your target audience unique?",
        "How will your video stand out from similar content?",
        "What's the call-to-action you want viewers to take?"
      ]
      
      concept_refinements = {
        ...currentConcept,
        targetAudience: currentConcept.targetAudience || "Refine audience specificity",
        keyMessage: currentConcept.keyMessage || "Strengthen core message",
        tone: currentConcept.tone || "Align tone with audience"
      }
      break
      
    case 'refined':
      message = `Excellent work! You've developed a well-rounded concept that shows strong creative thinking. As a scriptwriter, I can see the narrative elements coming together nicely, and as an audience analyst, the market positioning looks promising. You're very close to having a production-ready concept.`
      
      suggestions = [
        "Fine-tune your duration to match your content and audience attention span",
        "Consider adding specific visual or audio elements that will enhance engagement",
        "Test your key message with a small group to ensure it resonates"
      ]
      
      completeness_score = 0.75
      analysis = { narrative_strength: 0.8, audience_alignment: 0.7, market_potential: 0.8, execution_feasibility: 0.7 }
      
      next_questions = [
        "What specific visual elements will make your video memorable?",
        "How will you measure the success of this video?",
        "What's your distribution strategy to reach your target audience?"
      ]
      
      concept_refinements = {
        ...currentConcept,
        duration: currentConcept.duration || 60,
        genre: currentConcept.genre || "Finalize genre choice"
      }
      break
      
    case 'complete':
      message = `Outstanding! You've developed a comprehensive, production-ready concept. As both a director and audience analyst, I can see this has strong narrative structure, clear audience targeting, and excellent market potential. This concept is ready for the next phase of development.`
      
      suggestions = [
        "Consider creating a mood board or visual reference for your production team",
        "Develop a detailed shot list or storyboard to guide production",
        "Plan your distribution and marketing strategy to maximize reach"
      ]
      
      completeness_score = 0.9
      analysis = { narrative_strength: 0.9, audience_alignment: 0.85, market_potential: 0.9, execution_feasibility: 0.85 }
      
      next_questions = [
        "What's your production timeline and budget?",
        "Who will be on your production team?",
        "How will you measure ROI and audience engagement?"
      ]
      
      concept_refinements = currentConcept
      break
  }
  
  // Add provider-specific suggestions
  if (currentConcept.provider) {
    suggestions.push(`Leverage ${currentConcept.provider} capabilities for optimal video generation`)
  }
  
  // Ensure suggestions array has exactly 3 items
  while (suggestions.length < 3) {
    suggestions.push("Continue refining your concept based on audience feedback")
  }
  
  // Ensure next_questions array has exactly 3 items
  while (next_questions.length < 3) {
    next_questions.push("What aspects would you like to explore further?")
  }
  
  // Construct the JSON response
  const response: CueResponse = {
    message,
    suggestions,
    completeness_score,
    analysis,
    next_questions,
    concept_refinements
  }
  
  return JSON.stringify(response, null, 2)
}

/**
 * Parse Cue's response from LLM
 */
function parseCueResponse(llmResponse: string, currentConcept: any): CueResponse {
  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(llmResponse)
    
    // Validate and structure the response
    return {
      message: parsed.message || "I'm here to help you develop your video concept!",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [
        "Define your target audience more specifically",
        "Clarify your core message and key takeaways",
        "Consider the tone and style that will resonate with your audience"
      ],
      completeness_score: typeof parsed.completeness_score === 'number' ? 
        Math.max(0, Math.min(1, parsed.completeness_score)) : 0.5,
      analysis: {
        narrative_strength: parsed.analysis?.narrative_strength || 0.5,
        audience_alignment: parsed.analysis?.audience_alignment || 0.5,
        market_potential: parsed.analysis?.market_potential || 0.5,
        execution_feasibility: parsed.analysis?.execution_feasibility || 0.5
      },
      next_questions: Array.isArray(parsed.next_questions) ? parsed.next_questions.slice(0, 3) : [
        "What's your target audience?",
        "What's your key message?",
        "What tone are you aiming for?"
      ],
      concept_refinements: {
        ...currentConcept,
        ...parsed.concept_refinements
      }
    }
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    
    // Return a fallback response
    return {
      message: "I'm here to help you develop your video concept! Let me ask you some questions to get started.",
      suggestions: [
        "Define your target audience more specifically",
        "Clarify your core message and key takeaways",
        "Consider the tone and style that will resonate with your audience"
      ],
      completeness_score: 0.3,
      analysis: {
        narrative_strength: 0.4,
        audience_alignment: 0.3,
        market_potential: 0.5,
        execution_feasibility: 0.4
      },
      next_questions: [
        "What's your target audience?",
        "What's your key message?",
        "What tone are you aiming for?"
      ],
      concept_refinements: currentConcept || {}
    }
  }
}
