import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 60
export const runtime = 'nodejs'

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

/**
 * Call Vertex AI Gemini for scene context generation
 */
async function callGemini(prompt: string): Promise<string> {
  console.log('[Generate Context] Calling Vertex AI Gemini...')
  const result = await generateText(prompt, {
    model: 'gemini-2.0-flash',
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json'
  })
  return result.text
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
    
    // Build and execute prompt
    const prompt = buildSceneContextPrompt(scene, sceneIndex, allScenes)
    const responseText = await callGemini(prompt)
    
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
