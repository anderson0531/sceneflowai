import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const runtime = 'nodejs'

interface Review {
  overallScore: number
  categories: {
    name: string
    score: number
  }[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  generatedAt: string
}

interface ScriptReviewRequest {
  projectId: string
  script: {
    title?: string
    logline?: string
    scenes: any[]
    characters?: any[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script }: ScriptReviewRequest = await req.json()

    if (!projectId || !script) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Script Review] Generating reviews for project:', projectId)

    // Generate both director and audience reviews
    const [directorReview, audienceReview] = await Promise.all([
      generateDirectorReview(script),
      generateAudienceReview(script)
    ])

    return NextResponse.json({
      success: true,
      director: directorReview,
      audience: audienceReview,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Script Review] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate reviews' },
      { status: 500 }
    )
  }
}

async function generateDirectorReview(script: any): Promise<Review> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const sceneCount = script.scenes?.length || 0
  const characterCount = script.characters?.length || 0
  
  // Extract full scene content for analysis
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => {
    const heading = scene.heading || 'Untitled'
    const action = scene.action || 'No action'
    const narration = scene.narration || ''
    const dialogueLines = (scene.dialogue || []).slice(0, 3).map((d: any) => 
      `${d.character || 'UNKNOWN'}: ${d.line || ''}`
    ).join('\n  ')
    const hasMoreDialogue = (scene.dialogue?.length || 0) > 3
    
    return `Scene ${idx + 1}: ${heading}\nAction: ${action}\n${narration ? `Narration: ${narration}\n` : ''}${dialogueLines ? `Dialogue:\n  ${dialogueLines}${hasMoreDialogue ? '\n  ...' : ''}\n` : ''}`
  }).join('\n---\n') || 'No scenes available'

  const prompt = `You are an expert film director reviewing a screenplay. Analyze this script from a professional filmmaking perspective.

Script Details:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Scenes: ${sceneCount}
- Characters: ${characterCount}

Scene Content:
${sceneSummaries}

Evaluate these aspects (score each 1-100):
1. Story Structure (setup, conflict, resolution, three-act structure)
2. Character Development (arcs, motivations, depth, relatability)
3. Pacing & Flow (rhythm, scene transitions, momentum)
4. Visual Storytelling (cinematic potential, visual elements, shot opportunities)
5. Dialogue Quality (natural, purposeful, character voice, subtext)

Provide a comprehensive review with:
1. Overall Score (1-100) - weighted average of categories
2. Category scores (1-100 each)
3. Analysis (2-3 detailed paragraphs about the script's strengths and weaknesses)                                                                               
4. Strengths (3-5 specific bullet points highlighting what works well)
5. Areas for Improvement (3-5 specific bullet points about what needs work)
6. Actionable Recommendations (3-5 specific, practical suggestions for improvement)

CRITICAL: Calculate scores based on YOUR ANALYSIS of THIS SCRIPT. 
The example below shows structure only - DO NOT copy these placeholder values.
Your scores should reflect the actual quality of this specific screenplay.

Format as JSON with this structure:
{
  "overallScore": <your calculated score 1-100>,
  "categories": [
    {"name": "Story Structure", "score": <your score 1-100>},
    {"name": "Character Development", "score": <your score 1-100>},
    {"name": "Pacing & Flow", "score": <your score 1-100>},
    {"name": "Visual Storytelling", "score": <your score 1-100>},
    {"name": "Dialogue Quality", "score": <your score 1-100>}
  ],
  "analysis": "<your detailed analysis>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", ...],
  "recommendations": ["<specific recommendation 1>", "<specific recommendation 2>", ...]
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Director Review] API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  
  // Log the full response structure for debugging
  console.log('[Director Review] Full API response:', JSON.stringify(data, null, 2))
  console.log('[Director Review] Candidates:', data.candidates)
  console.log('[Director Review] First candidate:', data.candidates?.[0])
  
  // Check for safety ratings or blocked content
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    console.error('[Director Review] Content blocked by safety filters:', data.candidates[0].safetyRatings)
    throw new Error('Content blocked by safety filters. Please try with different script content.')
  }
  
  const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!reviewText) {
    console.error('[Director Review] No text in response. Full candidate:', JSON.stringify(data.candidates?.[0], null, 2))
    throw new Error('No review generated - empty response from Gemini')
  }

  console.log('[Director Review] Raw response text:', reviewText.substring(0, 200))

  // Extract JSON from markdown code blocks if present
  let jsonText = reviewText.trim()
  
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Parse JSON response
  let review
  try {
    review = JSON.parse(jsonText)
  } catch (parseError) {
    console.error('[Director Review] JSON parse error:', parseError)
    console.error('[Director Review] Failed to parse:', jsonText.substring(0, 500))
    throw new Error('Failed to parse director review JSON')
  }
  
  return {
    ...review,
    generatedAt: new Date().toISOString()
  }
}

async function generateAudienceReview(script: any): Promise<Review> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const sceneCount = script.scenes?.length || 0
  const characterCount = script.characters?.length || 0
  
  // Extract full scene content for analysis
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => {
    const heading = scene.heading || 'Untitled'
    const action = scene.action || 'No action'
    const narration = scene.narration || ''
    const dialogueLines = (scene.dialogue || []).slice(0, 3).map((d: any) => 
      `${d.character || 'UNKNOWN'}: ${d.line || ''}`
    ).join('\n  ')
    const hasMoreDialogue = (scene.dialogue?.length || 0) > 3
    
    return `Scene ${idx + 1}: ${heading}\nAction: ${action}\n${narration ? `Narration: ${narration}\n` : ''}${dialogueLines ? `Dialogue:\n  ${dialogueLines}${hasMoreDialogue ? '\n  ...' : ''}\n` : ''}`
  }).join('\n---\n') || 'No scenes available'

  const prompt = `You are a film critic representing audience perspective. Review this screenplay for entertainment value and emotional impact.

Script Details:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Scenes: ${sceneCount}
- Characters: ${characterCount}

Scene Content:
${sceneSummaries}

Evaluate these aspects (score each 1-100):
1. Entertainment Value (engaging, compelling, holds attention)
2. Emotional Impact (resonance, connection, emotional journey)
3. Clarity & Accessibility (easy to follow, understandable, clear stakes)
4. Character Relatability (audience connection, likable characters, investment)
5. Satisfying Payoff (fulfilling conclusion, resolution, closure)

Provide a comprehensive review with:
1. Overall Score (1-100) - weighted average of categories
2. Category scores (1-100 each)
3. Analysis (2-3 detailed paragraphs about audience appeal and engagement)
4. Strengths (3-5 specific bullet points about what audiences will love)
5. Areas for Improvement (3-5 specific bullet points about audience concerns)
6. Actionable Recommendations (3-5 specific suggestions to improve audience appeal)

CRITICAL: Calculate scores based on YOUR ANALYSIS of THIS SCRIPT.
The example below shows structure only - DO NOT copy these placeholder values.
Your scores should reflect the actual entertainment value of this specific screenplay.

Format as JSON with this structure:
{
  "overallScore": <your calculated score 1-100>,
  "categories": [
    {"name": "Entertainment Value", "score": <your score 1-100>},
    {"name": "Emotional Impact", "score": <your score 1-100>},
    {"name": "Clarity & Accessibility", "score": <your score 1-100>},
    {"name": "Character Relatability", "score": <your score 1-100>},
    {"name": "Satisfying Payoff", "score": <your score 1-100>}
  ],
  "analysis": "<your detailed analysis>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", ...],
  "recommendations": ["<specific recommendation 1>", "<specific recommendation 2>", ...]
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Audience Review] API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  
  // Log the full response structure for debugging
  console.log('[Audience Review] Full API response:', JSON.stringify(data, null, 2))
  console.log('[Audience Review] Candidates:', data.candidates)
  console.log('[Audience Review] First candidate:', data.candidates?.[0])
  
  // Check for safety ratings or blocked content
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    console.error('[Audience Review] Content blocked by safety filters:', data.candidates[0].safetyRatings)
    throw new Error('Content blocked by safety filters. Please try with different script content.')
  }
  
  const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!reviewText) {
    console.error('[Audience Review] No text in response. Full candidate:', JSON.stringify(data.candidates?.[0], null, 2))
    throw new Error('No review generated - empty response from Gemini')
  }

  console.log('[Audience Review] Raw response text:', reviewText.substring(0, 200))

  // Extract JSON from markdown code blocks if present
  let jsonText = reviewText.trim()
  
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Parse JSON response
  let review
  try {
    review = JSON.parse(jsonText)
  } catch (parseError) {
    console.error('[Audience Review] JSON parse error:', parseError)
    console.error('[Audience Review] Failed to parse:', jsonText.substring(0, 500))
    throw new Error('Failed to parse audience review JSON')
  }
  
  return {
    ...review,
    generatedAt: new Date().toISOString()
  }
}
