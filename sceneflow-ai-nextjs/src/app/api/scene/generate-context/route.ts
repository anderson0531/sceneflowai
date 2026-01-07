import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const maxDuration = 60
export const runtime = 'nodejs'

const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta'
const GEMINI_API_HOST = process.env.GEMINI_API_HOST || 'https://generativelanguage.googleapis.com'

interface GenerateContextRequest {
  projectId: string
  sceneIndex: number
  scene: {
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
    dialogue?: Array<{ character: string; text?: string; line?: string }>
    characters?: string[]
    [key: string]: any
  }
  // Optional: provide all scenes for narrative context
  allScenes?: Array<{
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
  }>
}

interface SceneContext {
  beat: string
  characterArc: string
  thematicContext: string
  generatedAt: string
}

interface GeminiRequestError extends Error {
  status?: number
}

const DEFAULT_MODEL_SEQUENCE = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

const configuredSequence = process.env.GEMINI_MODEL_SEQUENCE || process.env.GEMINI_MODEL_PRIORITY
const preferredModel = process.env.GEMINI_MODEL?.trim()

const prioritizedModels: string[] = preferredModel ? [preferredModel] : []
const configuredModels: string[] = configuredSequence
  ? configuredSequence.split(',').map(model => model.trim()).filter(Boolean)
  : DEFAULT_MODEL_SEQUENCE

const GEMINI_MODEL_SEQUENCE = Array.from(new Set([...prioritizedModels, ...configuredModels]))

/**
 * Attempts Gemini generation using preferred models in sequence
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastError: Error | null = null

  for (const model of GEMINI_MODEL_SEQUENCE) {
    try {
      return await callGeminiWithModel(apiKey, prompt, model)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Gemini error')
      const status = (error as GeminiRequestError)?.status
      const canFallback = status === 404 || status === 403 || status === 429
      console.warn(`[Gemini API] Model ${model} failed${status ? ` (${status})` : ''}: ${lastError.message}`)

      if (!canFallback) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Gemini API failed for all configured models')
}

/**
 * Call Gemini API for a specific model
 */
async function callGeminiWithModel(apiKey: string, prompt: string, model: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  
  try {
    const endpoint = `${GEMINI_API_HOST}/${GEMINI_API_VERSION}/models/${model}:generateContent?key=${apiKey}`
    const response = await fetch(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        }),
      }
    )
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      const err = new Error(`Gemini API error: ${response.status} - ${errorBody}`) as GeminiRequestError
      err.status = response.status
      throw err
    }
    
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      throw new Error('No content in Gemini response')
    }
    
    return text
  } finally {
    clearTimeout(timeout)
  }
}

function buildSceneContextPrompt(
  scene: GenerateContextRequest['scene'],
  sceneIndex: number,
  allScenes?: GenerateContextRequest['allScenes']
): string {
  const heading = typeof scene.heading === 'object' ? scene.heading.text : scene.heading
  const description = scene.visualDescription || scene.action || ''
  const narration = scene.narration || ''
  const characters = scene.characters?.join(', ') || 'Not specified'
  
  // Build dialogue summary
  let dialogueSummary = ''
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    dialogueSummary = scene.dialogue
      .map(d => `${d.character}: "${d.text || d.line || ''}"`)
      .slice(0, 5)
      .join('\n')
  }
  
  // Build narrative context from surrounding scenes
  let narrativeContext = ''
  if (allScenes && allScenes.length > 1) {
    const prevScene = sceneIndex > 0 ? allScenes[sceneIndex - 1] : null
    const nextScene = sceneIndex < allScenes.length - 1 ? allScenes[sceneIndex + 1] : null
    
    if (prevScene) {
      const prevHeading = typeof prevScene.heading === 'object' ? prevScene.heading.text : prevScene.heading
      narrativeContext += `Previous scene: ${prevHeading || 'Unknown'}\n`
    }
    if (nextScene) {
      const nextHeading = typeof nextScene.heading === 'object' ? nextScene.heading.text : nextScene.heading
      narrativeContext += `Next scene: ${nextHeading || 'Unknown'}\n`
    }
  }
  
  return `You are a professional story analyst and screenplay consultant. Analyze this scene and provide narrative context to help the filmmaker understand its role in the story.

SCENE ${sceneIndex + 1}:
Heading: ${heading || 'Not specified'}
Description: ${description || 'Not specified'}
Narration: ${narration || 'None'}
Characters: ${characters}
${dialogueSummary ? `Key Dialogue:\n${dialogueSummary}` : ''}
${narrativeContext ? `\nNarrative Position:\n${narrativeContext}` : ''}

Analyze this scene and provide:

1. **Beat**: What narrative beat does this scene represent in the story structure? (e.g., "Inciting incident", "Rising action - complication", "Midpoint reversal", "All is lost moment", "Climactic confrontation", "Resolution")

2. **Character Arc**: How do the characters evolve or reveal themselves in this scene? What emotional journey happens here? Focus on the protagonist or key character in this scene.

3. **Thematic Context**: What themes or ideas are being explored? How does this scene contribute to the film's overall message?

Respond in JSON format:
{
  "beat": "Brief description of the narrative beat (1-2 sentences)",
  "characterArc": "Description of character development in this scene (1-2 sentences)",
  "thematicContext": "Themes explored and their significance (1-2 sentences)"
}

Keep each field concise but insightful - aim for professional screenplay analysis quality.`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateContextRequest
    const { projectId, sceneIndex, scene, allScenes } = body
    
    if (!projectId || sceneIndex === undefined || !scene) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, sceneIndex, scene' },
        { status: 400 }
      )
    }
    
    // Get API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }
    
    // Build and execute prompt
    const prompt = buildSceneContextPrompt(scene, sceneIndex, allScenes)
    const responseText = await callGemini(apiKey, prompt)
    
    // Parse JSON response
    let sceneContext: SceneContext
    try {
      // Handle potential markdown code blocks
      const jsonText = responseText.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(jsonText)
      sceneContext = {
        beat: parsed.beat || 'Unable to determine',
        characterArc: parsed.characterArc || 'Unable to determine',
        thematicContext: parsed.thematicContext || 'Unable to determine',
        generatedAt: new Date().toISOString(),
      }
    } catch (parseError) {
      console.error('[Generate Context] Failed to parse response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }
    
    // Optionally save to project database
    try {
      await sequelize.authenticate()
      const project = await Project.findByPk(projectId)
      
      if (project) {
        const script = project.get('script') as any
        if (script?.script?.scenes?.[sceneIndex]) {
          script.script.scenes[sceneIndex].sceneContext = sceneContext
          await project.update({ script })
          console.log(`[Generate Context] Saved context for Scene ${sceneIndex + 1} in project ${projectId}`)
        }
      }
    } catch (dbError) {
      // Don't fail the request if DB save fails - context is still returned
      console.error('[Generate Context] Failed to save to database:', dbError)
    }
    
    return NextResponse.json({ 
      success: true, 
      sceneContext,
      sceneIndex 
    })
    
  } catch (error) {
    console.error('[Generate Context] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate scene context' },
      { status: 500 }
    )
  }
}
