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
  
  // Extract scene summaries for analysis
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => 
    `Scene ${idx + 1}: ${scene.heading || 'Untitled'} - ${scene.action?.substring(0, 100) || 'No action'}...`
  ).join('\n') || 'No scenes available'

  const prompt = `You are an expert film director reviewing a screenplay. Analyze this script from a professional filmmaking perspective.

Script Details:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Scenes: ${sceneCount}
- Characters: ${characterCount}

Scene Summaries:
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

Format as JSON with this exact structure:
{
  "overallScore": 85,
  "categories": [
    {"name": "Story Structure", "score": 82},
    {"name": "Character Development", "score": 88},
    {"name": "Pacing & Flow", "score": 79},
    {"name": "Visual Storytelling", "score": 91},
    {"name": "Dialogue Quality", "score": 84}
  ],
  "analysis": "Detailed analysis paragraphs...",
  "strengths": ["Specific strength 1", "Specific strength 2", "..."],
  "improvements": ["Specific improvement 1", "Specific improvement 2", "..."],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2", "..."]
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
          maxOutputTokens: 2048
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!reviewText) {
    throw new Error('No review generated')
  }

  console.log('[Director Review] Raw response:', reviewText.substring(0, 200))

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
  
  // Extract scene summaries for analysis
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => 
    `Scene ${idx + 1}: ${scene.heading || 'Untitled'} - ${scene.action?.substring(0, 100) || 'No action'}...`
  ).join('\n') || 'No scenes available'

  const prompt = `You are a film critic representing audience perspective. Review this screenplay for entertainment value and emotional impact.

Script Details:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Scenes: ${sceneCount}
- Characters: ${characterCount}

Scene Summaries:
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

Format as JSON with this exact structure:
{
  "overallScore": 78,
  "categories": [
    {"name": "Entertainment Value", "score": 82},
    {"name": "Emotional Impact", "score": 75},
    {"name": "Clarity & Accessibility", "score": 85},
    {"name": "Character Relatability", "score": 79},
    {"name": "Satisfying Payoff", "score": 71}
  ],
  "analysis": "Detailed analysis paragraphs...",
  "strengths": ["Specific strength 1", "Specific strength 2", "..."],
  "improvements": ["Specific improvement 1", "Specific improvement 2", "..."],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2", "..."]
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
          maxOutputTokens: 2048
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!reviewText) {
    throw new Error('No review generated')
  }

  console.log('[Audience Review] Raw response:', reviewText.substring(0, 200))

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
