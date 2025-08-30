import { NextRequest, NextResponse } from 'next/server'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { videoGenerationGateway } from '@/services/VideoGenerationGateway'

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

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
  conversationHistory: ConversationMessage[]
  finalizedConcept: {
    title?: string
    description?: string
    targetAudience?: string
    keyMessage?: string
    tone?: string
    genre?: string
    duration?: number
    platform?: string
    callToAction?: string
  }
  provider?: AIProvider
}

interface IdeaGenerationResponse {
  success: boolean
  data: {
    ideas: VideoIdea[]
    conceptSummary: {
      targetAudience: string
      keyMessage: string
      tone: string
      genre: string
      estimatedDuration: number
    }
    generationMetadata: {
      totalIdeas: number
      averageStrengthRating: number
      strongestIdea: VideoIdea
      generationTimestamp: string
    }
  }
  message: string
}

/**
 * POST /api/ideation/generate
 * Generate 4 distinct video ideas based on conversation history and concept data
 */
export async function POST(request: NextRequest) {
  try {
    const body: IdeaGenerationRequest = await request.json()
    const { userId, conversationHistory, finalizedConcept, provider = AIProvider.GOOGLE_VEO } = body

    // Validate request
    if (!userId || !conversationHistory || conversationHistory.length === 0) {
      return NextResponse.json(
        { error: 'User ID and conversation history are required' },
        { status: 400 }
      )
    }

    // Allow lightweight requests; fill sensible defaults if fields are missing
    if (!finalizedConcept) {
      return NextResponse.json(
        { error: 'Finalized concept is required' },
        { status: 400 }
      )
    }

    finalizedConcept.targetAudience = finalizedConcept.targetAudience || 'General Audience'
    finalizedConcept.keyMessage = finalizedConcept.keyMessage || (finalizedConcept.title || 'Core message')

    console.log(`🎬 Idea generation initiated for user: ${userId}`)
    console.log(`📝 Conversation length: ${conversationHistory.length} messages`)
    console.log(`🎯 Target audience: ${finalizedConcept.targetAudience}`)
    console.log(`🤖 Using provider: ${provider}`)

    // Get user's provider configuration for context
    let isUsingUserProvider = false
    let providerCapabilities = null

    try {
      const providerStatus = await videoGenerationGateway.testProviderConnection(userId, provider)
      if (providerStatus.success && providerStatus.data) {
        isUsingUserProvider = true
        console.log(`✅ Using user's configured ${provider} credentials`)
        
        // Get provider capabilities for idea generation context
        const capabilities = await videoGenerationGateway.getProviderCapabilities(provider)
        if (capabilities.success) {
          providerCapabilities = capabilities.data
          console.log(`📊 Provider capabilities: ${JSON.stringify(capabilities.data)}`)
        }
      } else {
        console.log(`⚠️ User's ${provider} not configured, using default simulation`)
      }
    } catch (error) {
      console.log(`⚠️ Provider check failed, using default simulation: ${error}`)
    }

    // Generate video ideas using the LLM
    const generatedIdeas = await generateVideoIdeas(
      conversationHistory,
      finalizedConcept,
      provider,
      isUsingUserProvider,
      providerCapabilities
    )

    console.log(`💡 Generated ${generatedIdeas.length} video ideas`)
    console.log(`⭐ Average strength rating: ${(generatedIdeas.reduce((sum, idea) => sum + idea.strength_rating, 0) / generatedIdeas.length).toFixed(1)}`)

    // Create response with metadata
    const response: IdeaGenerationResponse = {
      success: true,
      data: {
        ideas: generatedIdeas,
        conceptSummary: {
          targetAudience: finalizedConcept.targetAudience || 'Not specified',
          keyMessage: finalizedConcept.keyMessage || 'Not specified',
          tone: finalizedConcept.tone || 'Not specified',
          genre: finalizedConcept.genre || 'Not specified',
          estimatedDuration: finalizedConcept.duration || 60
        },
        generationMetadata: {
          totalIdeas: generatedIdeas.length,
          averageStrengthRating: Number((generatedIdeas.reduce((sum, idea) => sum + idea.strength_rating, 0) / generatedIdeas.length).toFixed(1)),
          strongestIdea: generatedIdeas.reduce((strongest, current) => 
            current.strength_rating > strongest.strength_rating ? current : strongest
          ),
          generationTimestamp: new Date().toISOString()
        }
      },
      message: 'Video ideas generated successfully'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('POST /api/ideation/generate error:', error)
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
 * Generate video ideas using LLM (or simulation for demo)
 */
async function generateVideoIdeas(
  conversationHistory: ConversationMessage[],
  finalizedConcept: any,
  provider: AIProvider,
  isUsingUserProvider: boolean,
  providerCapabilities: any
): Promise<VideoIdea[]> {

  // Construct the idea generation prompt
  const systemPrompt = constructIdeaGenerationPrompt(finalizedConcept, provider, providerCapabilities)
  // Format conversation for LLM
  const formattedConversation = formatConversationForIdeaGeneration(systemPrompt, conversationHistory, finalizedConcept)

  // 1) Try OpenAI (if key present) for real generations
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    try {
      const openAIResponse = await callOpenAI([
        { role: 'system', content: 'You are a senior creative strategist. Respond ONLY with valid JSON matching the requested schema. No prose.' },
        { role: 'user', content: formattedConversation }
      ], apiKey)
      const parsedIdeas = parseGeneratedIdeas(openAIResponse, finalizedConcept)
      if (parsedIdeas && parsedIdeas.length >= 1) return parsedIdeas
    } catch (err) {
      console.warn('OpenAI idea generation failed, falling back to simulation:', err)
    }
  }

  // 2) Fallback: simulate
  const llmResponse = await simulateLLMIdeaGeneration(formattedConversation, finalizedConcept)
  return parseGeneratedIdeas(llmResponse, finalizedConcept)
}

async function callOpenAI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  apiKey: string
): Promise<string> {
  const body = {
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    // 30s timeout safeguard
  })
  if (!resp.ok) throw new Error(`OpenAI error: ${await resp.text()}`)
  const json = await resp.json()
  const content: string | undefined = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned no content')
  return content
}

/**
 * Construct the idea generation system prompt
 */
function constructIdeaGenerationPrompt(finalizedConcept: any, provider: AIProvider, providerCapabilities: any): string {
  const providerInfo = getProviderInfo(provider)
  const capabilities = providerCapabilities ? `Provider Capabilities: ${JSON.stringify(providerCapabilities)}` : 'Standard video generation capabilities'
  
  return `You are an expert video concept developer and creative strategist. Your task is to generate 4 distinct, compelling video ideas based on the finalized concept and conversation history.

CONCEPT ANALYSIS:
- Target Audience: ${finalizedConcept.targetAudience}
- Key Message: ${finalizedConcept.keyMessage}
- Tone: ${finalizedConcept.tone || 'Not specified'}
- Genre: ${finalizedConcept.genre || 'Not specified'}
- Duration: ${finalizedConcept.duration || 60} seconds
- Platform: ${finalizedConcept.platform || 'Multi-platform'}
- Call to Action: ${finalizedConcept.callToAction || 'Not specified'}

TECHNICAL CONTEXT:
- AI Provider: ${providerInfo.name}
- ${capabilities}

CREATIVE REQUIREMENTS:
1. Generate exactly 4 distinct video ideas
2. Each idea must be unique in approach and execution
3. Ideas should vary in style, format, and storytelling approach
4. Consider different engagement strategies for the target audience
5. Ensure each idea can be executed within the specified duration
6. Optimize for the specified platform and audience behavior

STRENGTH RATING CRITERIA (1-5 scale):
- 1-2: Basic concept, limited audience appeal
- 3: Good concept, moderate audience appeal
- 4: Strong concept, high audience appeal
- 5: Exceptional concept, maximum audience appeal

Consider these factors for rating:
- Relevance to target audience
- Clarity of message delivery
- Emotional engagement potential
- Shareability and virality potential
- Brand alignment and positioning
- Execution feasibility

RESPONSE FORMAT:
You must respond with valid JSON in this exact structure:
[
  {
    "id": "uuid-string-1",
    "title": "Compelling video title",
    "synopsis": "2-3 sentence description of the video concept",
    "scene_outline": [
      "Scene 1: Opening hook and setup",
      "Scene 2: Problem introduction",
      "Scene 3: Solution demonstration",
      "Scene 4: Call to action"
    ],
    "thumbnail_prompt": "Detailed description for generating an engaging thumbnail image",
    "strength_rating": 4.5
  },
  {
    "id": "uuid-string-2",
    "title": "Second video title",
    "synopsis": "Description of second concept",
    "scene_outline": ["Scene 1...", "Scene 2...", "Scene 3...", "Scene 4..."],
    "thumbnail_prompt": "Thumbnail description for second concept",
    "strength_rating": 4.2
  }
  // ... continue for all 4 ideas
]

IMPORTANT: 
- Ensure your response is valid JSON
- Generate exactly 4 ideas
- Each idea must have a unique strength_rating
- Strength ratings should range from 3.0 to 5.0 for quality concepts
- Scene outlines should be specific and actionable
- Thumbnail prompts should be detailed and visual`
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
function formatConversationForIdeaGeneration(systemPrompt: string, conversationHistory: ConversationMessage[], finalizedConcept: any): string {
  let formatted = `SYSTEM PROMPT:\n${systemPrompt}\n\nFINALIZED CONCEPT:\n`
  
  // Add finalized concept details
  Object.entries(finalizedConcept).forEach(([key, value]) => {
    if (value) {
      formatted += `${key}: ${value}\n`
    }
  })
  
  formatted += `\nCONVERSATION HISTORY:\n`
  
  // Add relevant conversation context (last 10 messages for context)
  const recentMessages = conversationHistory.slice(-10)
  recentMessages.forEach((message) => {
    const role = message.role === 'user' ? 'USER' : 'ASSISTANT'
    formatted += `${role}: ${message.content}\n`
  })
  
  formatted += `\nASSISTANT: Generate 4 distinct video ideas based on the above concept and conversation:`
  return formatted
}

/**
 * Simulate LLM idea generation for demo purposes
 */
async function simulateLLMIdeaGeneration(formattedConversation: string, finalizedConcept: any): Promise<string> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Generate contextual ideas based on the concept
  const ideas = generateContextualVideoIdeas(finalizedConcept)
  
  return JSON.stringify(ideas, null, 2)
}

/**
 * Generate contextual video ideas based on the concept
 */
function generateContextualVideoIdeas(finalizedConcept: any): VideoIdea[] {
  const { targetAudience, keyMessage, tone, genre, duration, platform } = finalizedConcept
  const ta = (targetAudience || 'Audience') as string
  const km = (keyMessage || 'Your key message') as string
  const tn = (tone || 'Professional') as string
  
  // Generate ideas based on concept characteristics
  const ideas: VideoIdea[] = []
  
  // Idea 1: Story-driven approach
  ideas.push({
    id: generateUUID(),
    title: `${ta} Success Story: ${km.split(' ').slice(0, 3).join(' ')}`,
    synopsis: `A compelling narrative following a relatable ${ta.toLowerCase()} who discovers the solution to their problem. This ${tn.toLowerCase()} story showcases the transformation and results, making the ${km.toLowerCase()} tangible and inspiring.`,
    scene_outline: [
      "Scene 1: Introduce the protagonist and their initial struggle",
      "Scene 2: Show the moment of discovery and first steps",
      "Scene 3: Demonstrate the transformation and positive changes",
      "Scene 4: Call to action with social proof and next steps"
    ],
    thumbnail_prompt: `A ${tn.toLowerCase()} scene showing a ${ta.toLowerCase()} looking confident and successful, with visual elements representing transformation and achievement. Warm lighting, professional setting, inspiring composition.`,
    strength_rating: 4.7
  })
  
  // Idea 2: Educational/How-to approach
  ideas.push({
    id: generateUUID(),
    title: `Master ${km.split(' ').slice(0, 2).join(' ')} in ${duration || 60} Seconds`,
    synopsis: `A fast-paced, ${tn.toLowerCase()} tutorial that breaks down the ${km.toLowerCase()} into actionable steps. Perfect for ${platform || 'social media'} where viewers want quick, valuable insights they can implement immediately.`,
    scene_outline: [
      "Scene 1: Hook with a surprising fact or statistic",
      "Scene 2: Present the problem and why it matters",
      "Scene 3: Show the solution with step-by-step demonstration",
      "Scene 4: Quick recap and call to action"
    ],
    thumbnail_prompt: `A split-screen showing before/after states, with clear step indicators and a confident presenter. Clean, modern design with ${tn.toLowerCase()} color scheme and engaging typography.`,
    strength_rating: 4.4
  })
  
  // Idea 3: Comparison/Contrast approach
  ideas.push({
    id: generateUUID(),
    title: `${km.split(' ').slice(0, 2).join(' ')}: The Right Way vs. Wrong Way`,
    synopsis: `An engaging comparison that clearly shows the difference between effective and ineffective approaches to ${km.toLowerCase()}. This ${tn.toLowerCase()} format helps ${ta.toLowerCase()} understand best practices through visual examples.`,
    scene_outline: [
      "Scene 1: Set up the comparison scenario",
      "Scene 2: Show the wrong way with humorous consequences",
      "Scene 3: Demonstrate the right way with positive outcomes",
      "Scene 4: Key takeaways and call to action"
    ],
    thumbnail_prompt: `Side-by-side comparison with clear visual contrast - left side showing frustration/confusion, right side showing success/confidence. Bold arrows and checkmarks, ${tn.toLowerCase()} color palette.`,
    strength_rating: 4.6
  })
  
  // Idea 4: Behind-the-scenes/Process approach
  ideas.push({
    id: generateUUID(),
    title: `Behind the Scenes: How We ${km.split(' ').slice(0, 3).join(' ')}`,
    synopsis: `A ${tn.toLowerCase()} behind-the-scenes look at the process, people, and passion behind ${km.toLowerCase()}. This approach builds trust and connection with ${ta.toLowerCase()} by showing authenticity and expertise.`,
    scene_outline: [
      "Scene 1: Introduce the team and their mission",
      "Scene 2: Show the process and methodology in action",
      "Scene 3: Highlight the results and impact",
      "Scene 4: Invite viewers to join the journey"
    ],
    thumbnail_prompt: `A candid behind-the-scenes moment showing passionate team members working together. Natural lighting, authentic expressions, workspace details, and subtle branding elements. ${tn.toLowerCase()} and inviting atmosphere.`,
    strength_rating: 4.3
  })
  
  return ideas
}

/**
 * Parse generated ideas from LLM response
 */
function parseGeneratedIdeas(llmResponse: string, finalizedConcept: any): VideoIdea[] {
  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(llmResponse)
    
    // Validate and structure the response
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 4).map((idea, index) => ({
        id: idea.id || generateUUID(),
        title: idea.title || `Video Idea ${index + 1}`,
        synopsis: idea.synopsis || `A compelling video concept based on ${finalizedConcept.keyMessage}`,
        scene_outline: Array.isArray(idea.scene_outline) ? idea.scene_outline.slice(0, 6) : [
          "Scene 1: Opening and setup",
          "Scene 2: Problem introduction",
          "Scene 3: Solution demonstration",
          "Scene 4: Call to action"
        ],
        thumbnail_prompt: idea.thumbnail_prompt || `An engaging thumbnail representing the video concept with ${finalizedConcept.tone || 'professional'} styling`,
        strength_rating: typeof idea.strength_rating === 'number' ? 
          Math.max(1, Math.min(5, idea.strength_rating)) : 4.0
      }))
    }
    
    throw new Error('Response is not an array')
    
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    
    // Return fallback ideas
    return generateContextualVideoIdeas(finalizedConcept)
  }
}

/**
 * Generate a simple UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
