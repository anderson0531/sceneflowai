import { NextRequest, NextResponse } from 'next/server'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { videoGenerationGateway } from '@/services/VideoGenerationGateway'

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface ScriptCharacter {
  name: string
  role: 'Protagonist' | 'Antagonist' | 'Supporting' | 'Narrator' | 'Expert'
  description: string
  importance: 'High' | 'Medium' | 'Low'
}

interface ScriptAnalysis {
  input_title: string
  input_synopsis: string
  input_treatment: string
  characters: ScriptCharacter[]
  core_themes: string[]
}

interface Beat {
  beat_number: number
  beat_title: string
  beat_description: string
  duration_estimate: string
  key_elements: string[]
}

interface ActStructure {
  title: string
  duration: string
  beats: Beat[]
}

interface VideoConcept {
  id: string
  title: string
  concept_synopsis: string
  concept_approach: string
  narrative_structure: '3-Act Structure' | '5-Act Structure' | 'Hero\'s Journey' | 'Documentary Structure' | 'Series Structure' | 'Experimental Structure'
  act_structure: {
    act_1: ActStructure
    act_2: ActStructure
    act_3: ActStructure
  }
  thumbnail_prompt: string
  strength_rating: number
}

interface ScriptAnalysisResponse {
  script_analysis: ScriptAnalysis
  video_concepts: VideoConcept[]
}

// Legacy interface for backward compatibility
interface VideoIdea {
  id: string
  title: string
  synopsis: string
  scene_outline: string[]
  thumbnail_prompt: string
  strength_rating: number
  // New fields for enhanced structure
  film_treatment?: string
  narrative_structure?: string
  characters?: ScriptCharacter[]
  act_structure?: {
    act_1: ActStructure
    act_2: ActStructure
    act_3: ActStructure
  }
  // Legacy fields for backward compatibility
  details?: any
  actStructure?: any
  outline?: string[]
  logline?: string
  beat_outline?: Beat[]
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
    script_analysis: ScriptAnalysis
    video_concepts: VideoConcept[]
    // Legacy fields for backward compatibility
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
    console.log('🎬 Starting idea generation with concept:', JSON.stringify(finalizedConcept, null, 2))
    console.log('📝 Conversation history length:', conversationHistory.length)
    console.log('📝 Last conversation message:', conversationHistory[conversationHistory.length - 1]?.content?.substring(0, 200) + '...')
    
    const result = await generateVideoIdeas(
      conversationHistory,
      finalizedConcept,
      provider,
      isUsingUserProvider,
      providerCapabilities
    )
    
    console.log('💡 Generated ideas result:', JSON.stringify(result, null, 2))

    console.log(`💡 Generated ${result.legacyIdeas.length} video ideas`)
    console.log(`⭐ Average strength rating: ${(result.legacyIdeas.reduce((sum, idea) => sum + idea.strength_rating, 0) / result.legacyIdeas.length).toFixed(1)}`)

    // Create response with metadata
    const response: IdeaGenerationResponse = {
      success: true,
      data: {
        script_analysis: result.scriptAnalysis,
        video_concepts: result.videoConcepts,
        // Legacy fields for backward compatibility
        ideas: result.legacyIdeas,
        conceptSummary: {
          targetAudience: finalizedConcept.targetAudience || 'Not specified',
          keyMessage: finalizedConcept.keyMessage || 'Not specified',
          tone: finalizedConcept.tone || 'Not specified',
          genre: finalizedConcept.genre || 'Not specified',
          estimatedDuration: finalizedConcept.duration || 60
        },
        generationMetadata: {
          totalIdeas: result.legacyIdeas.length,
          averageStrengthRating: Number((result.legacyIdeas.reduce((sum, idea) => sum + idea.strength_rating, 0) / result.legacyIdeas.length).toFixed(1)),
          strongestIdea: result.legacyIdeas.reduce((strongest, current) => 
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
): Promise<{ scriptAnalysis: ScriptAnalysis, videoConcepts: VideoConcept[], legacyIdeas: VideoIdea[] }> {

  // Construct the idea generation prompt
  const systemPrompt = constructIdeaGenerationPrompt(finalizedConcept, provider, providerCapabilities)
  // Format conversation for LLM
  const formattedConversation = formatConversationForIdeaGeneration(systemPrompt, conversationHistory, finalizedConcept)

  // 1) Try Google Gemini (if key present) for real generations
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  console.log('Google Gemini API Key present:', !!apiKey)
  if (apiKey) {
    try {
      console.log('🤖 Calling Google Gemini 2.0 Flash with formatted conversation length:', formattedConversation.length)
      console.log('🤖 First 500 chars of conversation:', formattedConversation.substring(0, 500))
      
      const geminiResponse = await callGoogleGemini([
        { role: 'system', content: 'You are a professional script analyst. CRITICAL: Analyze the input carefully, create ORIGINAL summaries (not verbatim copies), identify ALL characters, and separate content properly. Introduction/Description must be brief overview only. Film Treatment must be vision/approach only. Act Structure must be detailed beat breakdown. Respond with valid JSON only.' },
        { role: 'user', content: formattedConversation }
      ], apiKey)
      
      console.log('🤖 Gemini response length:', geminiResponse.length)
      console.log('🤖 First 1000 chars of Gemini response:', geminiResponse.substring(0, 1000))
      
      const parsedIdeas = parseGeneratedIdeas(geminiResponse, finalizedConcept)
      console.log('🤖 Parsed ideas from Gemini:', JSON.stringify(parsedIdeas, null, 2))
      
      if (parsedIdeas && parsedIdeas.legacyIdeas.length >= 1) return parsedIdeas
    } catch (err) {
      console.warn('Google Gemini idea generation failed, falling back to simulation:', err)
    }
  }

  // 2) Fallback: simulate
  console.log('Using simulation fallback for concept:', finalizedConcept)
  const llmResponse = await simulateLLMIdeaGeneration(formattedConversation, finalizedConcept)
  const result = parseGeneratedIdeas(llmResponse, finalizedConcept)
  console.log('Generated ideas from simulation:', result)
  return result
}

async function callGoogleGemini(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  apiKey: string
): Promise<string> {
  // Convert messages to Gemini format
  const contents = messages
    .filter(msg => msg.role !== 'system') // Gemini handles system messages differently
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

  // Add system instruction if present
  const systemMessage = messages.find(msg => msg.role === 'system')
  const systemInstruction = systemMessage ? systemMessage.content : undefined

  const body = {
    contents,
    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
    generationConfig: {
    temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192, // Large context for handling scripts
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  }

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  
  if (!resp.ok) {
    const errorText = await resp.text()
    throw new Error(`Google Gemini error: ${errorText}`)
  }
  
  const json = await resp.json()
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!content) {
    throw new Error('Google Gemini returned no content')
  }
  
  return content
}

/**
 * Construct the idea generation system prompt
 */
function constructIdeaGenerationPrompt(finalizedConcept: any, provider: AIProvider, providerCapabilities: any): string {
  const providerInfo = getProviderInfo(provider)
  const capabilities = providerCapabilities ? `Provider Capabilities: ${JSON.stringify(providerCapabilities)}` : 'Standard video generation capabilities'
  
  return `CRITICAL INSTRUCTIONS: You are a professional script analyst. Follow these steps EXACTLY:

STEP 1: ANALYZE THE INPUT
- Read the input script/content carefully
- Identify the core theme and message
- Extract ALL characters with names, roles, and descriptions
- Determine the most appropriate narrative structure

STEP 2: CREATE CONCISE SUMMARIES (DO NOT COPY SCRIPT CONTENT)
- Write a clear introduction (≤50 words) that captures the essence
- Write a film treatment (≤100 words) that describes the vision and approach
- These must be ORIGINAL summaries, not verbatim script content

STEP 3: GENERATE 4 DISTINCT VIDEO CONCEPTS
- Each concept must have a unique approach and style
- Each concept must have proper act structure with detailed beats
- Beat descriptions should be specific and actionable
- Total beat duration must equal the project duration

STEP 4: SEPARATE CONTENT PROPERLY
- Introduction/Description: Brief overview only
- Film Treatment: Vision and approach only  
- Act Structure: Detailed beat-by-beat breakdown
- Character Breakdown: All characters with roles and descriptions

Create 4 video production ideas that include:

1. Title
2. Description (≤50 words)
3. Genre
4. Duration
5. Audience
6. Tone
7. Act Structure
8. Film Treatment (≤100 words)
9. Character Breakdown
10. Beat Sheet organized by Act and Beats within each Act

Context:
- Target Audience: ${finalizedConcept.targetAudience}
- Key Message: ${finalizedConcept.keyMessage}
- Tone: ${finalizedConcept.tone || 'Not specified'}
- Genre: ${finalizedConcept.genre || 'Not specified'}
- Duration: ${finalizedConcept.duration || 60} seconds
- Platform: ${finalizedConcept.platform || 'Multi-platform'}

Respond with valid JSON in this exact structure:
{
  "script_analysis": {
    "input_title": "Descriptive Title based on the Input Script",
    "input_synopsis": "BRIEF overview summary only (≤50 words) - DO NOT include act content",
    "input_treatment": "Vision and approach only (≤100 words) - DO NOT include detailed beats",
    "characters": [
      {
        "name": "Character Name",
        "role": "Protagonist" | "Antagonist" | "Supporting" | "Narrator" | "Expert",
        "description": "Brief character description",
        "importance": "High" | "Medium" | "Low"
      }
    ],
    "core_themes": ["Theme 1", "Theme 2"]
  },
  "video_concepts": [
    {
      "id": "uuid-string-1",
      "title": "Video Title",
      "concept_synopsis": "BRIEF concept overview (≤50 words) - DO NOT include act details",
      "concept_approach": "Vision and approach only (≤100 words) - DO NOT include beat content",
      "narrative_structure": "3-Act Structure" | "5-Act Structure" | "Hero's Journey" | "Documentary Structure" | "Series Structure" | "Experimental Structure",
      "act_structure": {
        "act_1": {
          "title": "Setup",
          "duration": "25% of total",
          "beats": [
            {
              "beat_number": 1,
              "beat_title": "Opening Hook",
              "beat_description": "Detailed description of what happens",
              "duration_estimate": "5-10% of total",
              "key_elements": ["Element 1", "Element 2"]
            }
          ]
        },
        "act_2": {
          "title": "Development",
          "duration": "50% of total",
          "beats": [
            {
              "beat_number": 2,
              "beat_title": "Main Content",
              "beat_description": "Detailed description of core content",
              "duration_estimate": "30-40% of total",
              "key_elements": ["Element 1", "Element 2"]
            }
          ]
        },
        "act_3": {
          "title": "Resolution",
          "duration": "25% of total",
          "beats": [
            {
              "beat_number": 3,
              "beat_title": "Call to Action",
              "beat_description": "Clear conclusion and CTA",
              "duration_estimate": "15-20% of total",
              "key_elements": ["Element 1", "Element 2"]
            }
          ]
        }
      },
      "thumbnail_prompt": "Description for thumbnail image",
      "strength_rating": 4.5
    }
  ]
}`
}

/**
 * Get provider information for context
 */
function getProviderInfo(provider: AIProvider): { name: string; capabilities: string } {
  const providerInfo = {
    [AIProvider.GOOGLE_VEO]: {
      name: 'Google Gemini 2.0 Flash',
      capabilities: 'Most powerful AI model available, supports full scripts and extensive content, up to 2M tokens, superior script analysis and character identification'
    },
    [AIProvider.RUNWAY]: {
      name: 'Google Gemini 2.0 Flash',
      capabilities: 'Most powerful AI model available, supports full scripts and extensive content, up to 2M tokens, superior script analysis and character identification'
    },
    [AIProvider.STABILITY_AI]: {
      name: 'Google Gemini 2.0 Flash',
      capabilities: 'Most powerful AI model available, supports full scripts and extensive content, up to 2M tokens, superior script analysis and character identification'
    }
  }
  
  return providerInfo[provider] || {
    name: 'Google Gemini 2.0 Flash',
    capabilities: 'Most powerful AI model available, supports full scripts and extensive content, up to 2M tokens, superior script analysis and character identification'
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
function parseGeneratedIdeas(llmResponse: string, finalizedConcept: any): { scriptAnalysis: ScriptAnalysis, videoConcepts: VideoConcept[], legacyIdeas: VideoIdea[] } {
  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(llmResponse)
    console.log('🔍 Parsing LLM response:', JSON.stringify(parsed, null, 2))
    
    // Check if it's the new structure with script_analysis and video_concepts
    if (parsed.script_analysis && parsed.video_concepts) {
      const scriptAnalysis: ScriptAnalysis = {
        input_title: parsed.script_analysis.input_title || 'Script Analysis',
        input_synopsis: parsed.script_analysis.input_synopsis || 'Script summary',
        input_treatment: parsed.script_analysis.input_treatment || 'Script treatment',
        characters: Array.isArray(parsed.script_analysis.characters) ? parsed.script_analysis.characters : [],
        core_themes: Array.isArray(parsed.script_analysis.core_themes) ? parsed.script_analysis.core_themes : []
      }
      
      console.log('🔍 Extracted script analysis:', JSON.stringify(scriptAnalysis, null, 2))
      
      console.log('🔍 Raw video_concepts from API:', JSON.stringify(parsed.video_concepts, null, 2))
      
      const videoConcepts: VideoConcept[] = parsed.video_concepts.slice(0, 4).map((concept: any, index: number) => {
        console.log(`🔍 Processing concept ${index + 1}:`, JSON.stringify(concept, null, 2))
        
        return {
          id: concept.id || generateUUID(),
          title: concept.title || `Video Concept ${index + 1}`,
          concept_synopsis: concept.concept_synopsis || `A compelling video concept based on ${finalizedConcept.keyMessage}`,
          concept_approach: concept.concept_approach || `A focused approach for this concept`,
          narrative_structure: concept.narrative_structure || '3-Act Structure',
        act_structure: concept.act_structure || {
          act_1: {
            title: 'Setup',
            duration: '25% of total',
            beats: [
              {
                beat_number: 1,
                beat_title: 'Opening Hook',
                beat_description: 'Engaging opening that captures attention',
                duration_estimate: '5-10% of total',
                key_elements: ['Hook', 'Introduction']
              }
            ]
          },
          act_2: {
            title: 'Development',
            duration: '50% of total',
            beats: [
              {
                beat_number: 2,
                beat_title: 'Main Content',
                beat_description: 'Core content and message delivery',
                duration_estimate: '30-40% of total',
                key_elements: ['Content', 'Message']
              }
            ]
          },
          act_3: {
            title: 'Resolution',
            duration: '25% of total',
            beats: [
              {
                beat_number: 3,
                beat_title: 'Call to Action',
                beat_description: 'Clear call to action and conclusion',
                duration_estimate: '15-20% of total',
                key_elements: ['CTA', 'Conclusion']
              }
            ]
          }
        },
        thumbnail_prompt: concept.thumbnail_prompt || `An engaging thumbnail representing the video concept`,
        strength_rating: typeof concept.strength_rating === 'number' ? 
          Math.max(1, Math.min(5, concept.strength_rating)) : 4.0
        }
      })
      
      // Create legacy VideoIdea format for backward compatibility
      const legacyIdeas: VideoIdea[] = videoConcepts.map(concept => ({
        id: concept.id,
        title: concept.title,
        synopsis: concept.concept_synopsis,
        film_treatment: concept.concept_approach,
        narrative_structure: concept.narrative_structure,
        characters: scriptAnalysis.characters,
        act_structure: concept.act_structure,
        scene_outline: [
          "Scene 1: Opening and setup",
          "Scene 2: Problem introduction", 
          "Scene 3: Solution demonstration",
          "Scene 4: Call to action"
        ],
        thumbnail_prompt: concept.thumbnail_prompt,
        strength_rating: concept.strength_rating,
        // Legacy fields
        details: {
          genre: finalizedConcept.genre || 'Documentary',
          duration: `${finalizedConcept.duration || 60} seconds`,
          targetAudience: finalizedConcept.targetAudience || 'General Audience',
          keyThemes: finalizedConcept.keyMessage || 'Core themes',
          characterCount: 'Multiple',
          tone: finalizedConcept.tone || 'Professional',
          setting: 'Various locations'
        },
        actStructure: {
          act1: 'Setup and introduction',
          act2: 'Rising action and development', 
          act3: 'Climax and resolution'
        },
        outline: [
          "Opening and setup",
          "Problem introduction",
          "Solution demonstration", 
          "Call to action"
        ],
        logline: concept.concept_synopsis,
        beat_outline: concept.act_structure?.act_1?.beats || []
      }))
      
      console.log('🔍 Final parsed videoConcepts:', JSON.stringify(videoConcepts, null, 2))
      console.log('🔍 Final parsed legacyIdeas:', JSON.stringify(legacyIdeas, null, 2))
      
      return { scriptAnalysis, videoConcepts, legacyIdeas }
    }
    
    // Fallback: try to parse as legacy array format
    if (Array.isArray(parsed)) {
      const legacyIdeas = parsed.slice(0, 4).map((idea, index) => ({
        id: idea.id || generateUUID(),
        title: idea.title || `Video Idea ${index + 1}`,
        synopsis: idea.synopsis || `A compelling video concept based on ${finalizedConcept.keyMessage}`,
        film_treatment: idea.film_treatment || `A comprehensive film treatment for ${idea.title || 'this concept'}`,
        narrative_structure: idea.narrative_structure || '3-Act Structure',
        characters: Array.isArray(idea.characters) ? idea.characters : [],
        act_structure: idea.act_structure || {
          act_1: { title: 'Setup', duration: '25%', beats: [] },
          act_2: { title: 'Development', duration: '50%', beats: [] },
          act_3: { title: 'Resolution', duration: '25%', beats: [] }
        },
        scene_outline: Array.isArray(idea.scene_outline) ? idea.scene_outline.slice(0, 6) : [
          "Scene 1: Opening and setup",
          "Scene 2: Problem introduction", 
          "Scene 3: Solution demonstration",
          "Scene 4: Call to action"
        ],
        thumbnail_prompt: idea.thumbnail_prompt || `An engaging thumbnail representing the video concept`,
        strength_rating: typeof idea.strength_rating === 'number' ? 
          Math.max(1, Math.min(5, idea.strength_rating)) : 4.0,
        // Legacy fields
        details: {
          genre: finalizedConcept.genre || 'Documentary',
          duration: `${finalizedConcept.duration || 60} seconds`,
          targetAudience: finalizedConcept.targetAudience || 'General Audience',
          keyThemes: finalizedConcept.keyMessage || 'Core themes',
          characterCount: 'Multiple',
          tone: finalizedConcept.tone || 'Professional',
          setting: 'Various locations'
        },
        actStructure: {
          act1: 'Setup and introduction',
          act2: 'Rising action and development', 
          act3: 'Climax and resolution'
        },
        outline: [
          "Opening and setup",
          "Problem introduction",
          "Solution demonstration", 
          "Call to action"
        ],
        logline: idea.synopsis || `A compelling video concept based on ${finalizedConcept.keyMessage}`,
        beat_outline: idea.act_structure?.act_1?.beats || []
      }))
      
      // Create default script analysis for legacy format
      const scriptAnalysis: ScriptAnalysis = {
        input_title: 'Script Analysis',
        input_synopsis: 'Script summary extracted from concepts',
        input_treatment: 'Script treatment based on analysis',
        characters: legacyIdeas[0]?.characters || [],
        core_themes: ['Core themes']
      }
      
      const videoConcepts: VideoConcept[] = legacyIdeas.map(idea => ({
        id: idea.id,
        title: idea.title,
        concept_synopsis: idea.synopsis,
        concept_approach: idea.film_treatment || idea.synopsis,
        narrative_structure: idea.narrative_structure || '3-Act Structure',
        act_structure: idea.act_structure || {
          act_1: { title: 'Setup', duration: '25%', beats: [] },
          act_2: { title: 'Development', duration: '50%', beats: [] },
          act_3: { title: 'Resolution', duration: '25%', beats: [] }
        },
        thumbnail_prompt: idea.thumbnail_prompt,
        strength_rating: idea.strength_rating
      }))
      
      return { scriptAnalysis, videoConcepts, legacyIdeas }
    }
    
    throw new Error('Response is not in expected format')
    
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    console.error('LLM Response that failed to parse:', llmResponse.substring(0, 1000))
    
    // Return fallback ideas
    const fallbackIdeas = generateContextualVideoIdeas(finalizedConcept)
    const scriptAnalysis: ScriptAnalysis = {
      input_title: 'Script Analysis',
      input_synopsis: 'Script summary',
      input_treatment: 'Script treatment',
      characters: [],
      core_themes: ['Core themes']
    }
    const videoConcepts: VideoConcept[] = fallbackIdeas.map(idea => ({
      id: idea.id,
      title: idea.title,
      concept_synopsis: idea.synopsis,
      concept_approach: idea.synopsis,
      narrative_structure: '3-Act Structure',
      act_structure: {
        act_1: { title: 'Setup', duration: '25%', beats: [] },
        act_2: { title: 'Development', duration: '50%', beats: [] },
        act_3: { title: 'Resolution', duration: '25%', beats: [] }
      },
      thumbnail_prompt: idea.thumbnail_prompt,
      strength_rating: idea.strength_rating
    }))
    
    return { scriptAnalysis, videoConcepts, legacyIdeas: fallbackIdeas }
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
