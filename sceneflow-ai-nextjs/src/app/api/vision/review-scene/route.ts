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

interface SceneReviewRequest {
  projectId: string
  sceneIndex: number
  scene: any
  script: {
    title?: string
    logline?: string
    scenes: any[]
    characters?: any[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, scene, script }: SceneReviewRequest = await req.json()

    if (!projectId || sceneIndex === undefined || !scene || !script) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Scene Review] Generating reviews for scene', sceneIndex, 'in project:', projectId)

    // Generate both director and audience reviews for the scene
    const [directorReview, audienceReview] = await Promise.all([
      generateDirectorSceneReview(scene, sceneIndex, script),
      generateAudienceSceneReview(scene, sceneIndex, script)
    ])

    return NextResponse.json({
      success: true,
      director: directorReview,
      audience: audienceReview,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Scene Review] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate scene reviews' },
      { status: 500 }
    )
  }
}

async function generateDirectorSceneReview(scene: any, sceneIndex: number, script: any): Promise<Review> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const totalScenes = script.scenes?.length || 0
  const characterCount = script.characters?.length || 0
  
  // Build scene context
  const sceneNumber = sceneIndex + 1
  const heading = scene.heading || 'Untitled Scene'
  const action = scene.action || 'No action description'
  const narration = scene.narration || 'No narration'
  const visualDescription = scene.visualDescription || ''
  const dialogueText = (scene.dialogue || []).map((d: any) => 
    `${d.character || 'UNKNOWN'}: ${d.line || d.text || ''}`
  ).join('\n  ') || 'No dialogue'
  const musicSpec = scene.music || 'No music specified'
  const sfxSpec = (scene.sfx || []).join(', ') || 'No sound effects'
  
  // Get adjacent scenes for context
  const prevScene = sceneIndex > 0 ? script.scenes[sceneIndex - 1] : null
  const nextScene = sceneIndex < totalScenes - 1 ? script.scenes[sceneIndex + 1] : null
  
  const prevSceneContext = prevScene 
    ? `Previous Scene: ${prevScene.heading || 'Untitled'} - ${(prevScene.action || '').substring(0, 150)}...`
    : 'This is the first scene'
  const nextSceneContext = nextScene
    ? `Next Scene: ${nextScene.heading || 'Untitled'} - ${(nextScene.action || '').substring(0, 150)}...`
    : 'This is the last scene'

  const prompt = `You are an expert film director reviewing a SPECIFIC SCENE within a larger screenplay. Analyze this scene from a professional filmmaking perspective, considering its role in the overall script.

SCRIPT CONTEXT:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Total Scenes: ${totalScenes}
- Characters: ${characterCount}

SCENE BEING REVIEWED (Scene ${sceneNumber} of ${totalScenes}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Heading: ${heading}
Scene Description: ${visualDescription}
Action: ${action}
Narration: ${narration}
Dialogue:
  ${dialogueText}
Music: ${musicSpec}
SFX: ${sfxSpec}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NARRATIVE CONTEXT:
- ${prevSceneContext}
- ${nextSceneContext}

Evaluate THIS SCENE on these aspects (score each 1-100):
1. Scene Structure (setup, conflict, payoff within the scene)
2. Character Moments (how characters are portrayed, dialogue quality)
3. Pacing (rhythm, timing, scene length appropriateness)
4. Visual Storytelling (cinematic elements, camera opportunities, visual cues)
5. Script Integration (how well this scene fits the overall story)

SCORING RUBRIC:
- 95-100: Exceptional. Ready for production as-is.
- 90-94: Very Good. Minor polish opportunities only.
- 85-89: Good. Solid scene with a few areas needing attention.
- 80-84: Needs Improvement. Multiple noticeable issues.
- 70-79: Significant Work Needed. Structural or craft issues.
- Below 70: Major Revision Required. Fundamental problems.

IMPORTANT: Score based on the scene's effectiveness, not perfection. Most functional scenes should score 85+.

Provide a comprehensive review with:
1. Overall Score (1-100) - weighted average of categories
2. Category scores (1-100 each)
3. Analysis (2-3 paragraphs about this scene's effectiveness and role in the story)
4. Strengths (3-5 specific things this scene does well)
5. Areas for Improvement (3-5 specific areas that could be stronger)
6. Actionable Recommendations (3-5 specific, practical suggestions for this scene)

Format as JSON:
{
  "overallScore": <score 1-100>,
  "categories": [
    {"name": "Scene Structure", "score": <score>},
    {"name": "Character Moments", "score": <score>},
    {"name": "Pacing", "score": <score>},
    {"name": "Visual Storytelling", "score": <score>},
    {"name": "Script Integration", "score": <score>}
  ],
  "analysis": "<detailed analysis of this scene>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
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
          maxOutputTokens: 4096
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Director Scene Review] API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Content blocked by safety filters.')
  }
  
  const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!reviewText) {
    throw new Error('No review generated - empty response from Gemini')
  }

  // Extract JSON from markdown code blocks if present
  let jsonText = reviewText.trim()
  
  // Try multiple patterns to extract JSON from code fences
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /`([\s\S]*?)`/
  ]
  
  for (const pattern of codeBlockPatterns) {
    const match = jsonText.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].trim()
      if (extracted.startsWith('{')) {
        jsonText = extracted
        break
      }
    }
  }
  
  // If still has backticks at start, remove them
  if (jsonText.startsWith('`')) {
    jsonText = jsonText.replace(/^`+/, '').replace(/`+$/, '').trim()
  }

  const review = JSON.parse(jsonText)
  
  return {
    ...review,
    generatedAt: new Date().toISOString()
  }
}

async function generateAudienceSceneReview(scene: any, sceneIndex: number, script: any): Promise<Review> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')

  const totalScenes = script.scenes?.length || 0
  const characterCount = script.characters?.length || 0
  
  // Build scene context
  const sceneNumber = sceneIndex + 1
  const heading = scene.heading || 'Untitled Scene'
  const action = scene.action || 'No action description'
  const narration = scene.narration || 'No narration'
  const visualDescription = scene.visualDescription || ''
  const dialogueText = (scene.dialogue || []).map((d: any) => 
    `${d.character || 'UNKNOWN'}: ${d.line || d.text || ''}`
  ).join('\n  ') || 'No dialogue'
  
  // Get adjacent scenes for context
  const prevScene = sceneIndex > 0 ? script.scenes[sceneIndex - 1] : null
  const nextScene = sceneIndex < totalScenes - 1 ? script.scenes[sceneIndex + 1] : null
  
  const prevSceneContext = prevScene 
    ? `Previous Scene: ${prevScene.heading || 'Untitled'} - ${(prevScene.action || '').substring(0, 150)}...`
    : 'This is the first scene'
  const nextSceneContext = nextScene
    ? `Next Scene: ${nextScene.heading || 'Untitled'} - ${(nextScene.action || '').substring(0, 150)}...`
    : 'This is the last scene'

  const prompt = `You are a film critic representing the audience perspective. Review this SPECIFIC SCENE for entertainment value and emotional impact within the context of the overall story.

SCRIPT CONTEXT:
- Title: ${script.title || 'Untitled Script'}
- Logline: ${script.logline || 'No logline provided'}
- Total Scenes: ${totalScenes}
- Characters: ${characterCount}

SCENE BEING REVIEWED (Scene ${sceneNumber} of ${totalScenes}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Heading: ${heading}
Scene Description: ${visualDescription}
Action: ${action}
Narration: ${narration}
Dialogue:
  ${dialogueText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NARRATIVE CONTEXT:
- ${prevSceneContext}
- ${nextSceneContext}

Evaluate THIS SCENE on these aspects (score each 1-100):
1. Entertainment Value (is this scene engaging and compelling?)
2. Emotional Impact (does this scene evoke emotion?)
3. Clarity (is it clear what's happening and why it matters?)
4. Character Connection (do we connect with the characters here?)
5. Story Momentum (does this scene move the story forward effectively?)

SCORING RUBRIC:
- 95-100: Exceptional. Audiences will love this scene.
- 90-94: Very Good. Engaging and emotionally resonant.
- 85-89: Good. Solid entertainment with minor opportunities.
- 80-84: Needs Improvement. Some disconnect with audience.
- 70-79: Significant Work Needed. May lose audience interest.
- Below 70: Major Revision Required. Fundamental engagement problems.

IMPORTANT: Score based on audience appeal. Most coherent scenes with clear purpose should score 85+.

Provide a comprehensive review with:
1. Overall Score (1-100) - weighted average of categories
2. Category scores (1-100 each)
3. Analysis (2-3 paragraphs about audience appeal and engagement)
4. Strengths (3-5 things audiences will appreciate)
5. Areas for Improvement (3-5 audience experience concerns)
6. Actionable Recommendations (3-5 suggestions to improve audience appeal)

Format as JSON:
{
  "overallScore": <score 1-100>,
  "categories": [
    {"name": "Entertainment Value", "score": <score>},
    {"name": "Emotional Impact", "score": <score>},
    {"name": "Clarity", "score": <score>},
    {"name": "Character Connection", "score": <score>},
    {"name": "Story Momentum", "score": <score>}
  ],
  "analysis": "<detailed analysis of audience appeal>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<improvement 1>", "<improvement 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
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
          maxOutputTokens: 4096
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Audience Scene Review] API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Content blocked by safety filters.')
  }
  
  const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!reviewText) {
    throw new Error('No review generated - empty response from Gemini')
  }

  // Extract JSON from markdown code blocks if present
  let jsonText = reviewText.trim()
  
  // Try multiple patterns to extract JSON from code fences
  const audienceCodeBlockPatterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /`([\s\S]*?)`/
  ]
  
  for (const pattern of audienceCodeBlockPatterns) {
    const match = jsonText.match(pattern)
    if (match && match[1]) {
      const extracted = match[1].trim()
      if (extracted.startsWith('{')) {
        jsonText = extracted
        break
      }
    }
  }
  
  // If still has backticks at start, remove them
  if (jsonText.startsWith('`')) {
    jsonText = jsonText.replace(/^`+/, '').replace(/`+$/, '').trim()
  }

  const review = JSON.parse(jsonText)
  
  return {
    ...review,
    generatedAt: new Date().toISOString()
  }
}
