import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { DetailedSceneDirection } from '../../../../types/scene-direction'

export const maxDuration = 60
export const runtime = 'nodejs'

interface GenerateDirectionRequest {
  projectId: string
  sceneIndex: number
  scene: {
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
    dialogue?: Array<{ character: string; text: string }>
    [key: string]: any
  }
}

/**
 * Call Gemini 2.5 Pro API to generate scene direction
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60 second timeout
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        }),
      }
    )
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      console.error(`[Gemini API] HTTP ${response.status}:`, errorBody)
      throw new Error(`Gemini API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      const finishReason = data?.candidates?.[0]?.finishReason
      if (finishReason === 'SAFETY') {
        console.error('[Gemini API] Content blocked by safety filter:', data?.candidates?.[0]?.safetyRatings)
        throw new Error('Content blocked by safety filter')
      }
      throw new Error(`Gemini returned empty content. Finish reason: ${finishReason || 'unknown'}`)
    }
    
    return text
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Build prompt for scene direction generation
 */
function buildSceneDirectionPrompt(scene: GenerateDirectionRequest['scene']): string {
  const heading = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text || ''
  const action = scene.action || ''
  const visualDescription = scene.visualDescription || ''
  const narration = scene.narration || ''
  const dialogue = scene.dialogue || []
  
  const dialogueText = dialogue.map(d => `${d.character}: ${d.text}`).join('\n')
  
  return `You are a world-class film director and cinematographer. Your task is to generate detailed, professional-grade technical instructions for a live-action film crew based on the following scene information.

SCENE INFORMATION:
${heading ? `Heading: ${heading}\n` : ''}${action ? `Action: ${action}\n` : ''}${visualDescription ? `Visual Description: ${visualDescription}\n` : ''}${narration ? `Narration: ${narration}\n` : ''}${dialogueText ? `Dialogue:\n${dialogueText}\n` : ''}

Generate comprehensive technical direction suitable for professional film production crews. Return ONLY valid JSON with this exact structure:

{
  "camera": {
    "shots": ["array of shot types, e.g., 'Wide Shot', 'Medium Close-Up', 'Insert Shot'"],
    "angle": "camera angle, e.g., 'Eye-Level', 'Low Angle', 'High Angle', 'Over-the-Shoulder'",
    "movement": "camera movement, e.g., 'Static', 'Handheld', 'Steadicam', 'Dolly In', 'Pan Left', 'Jib Up'",
    "lensChoice": "lens specification, e.g., 'Wide-Angle (24mm) for depth', 'Standard (50mm)', 'Telephoto (85mm) for compression'",
    "focus": "focus description, e.g., 'Deep Focus', 'Shallow Depth-of-Field', 'Rack Focus from [Prop] to [Actor]'"
  },
  "lighting": {
    "overallMood": "lighting mood, e.g., 'High-Key', 'Low-Key', 'Soft & Natural', 'Hard & Dramatic', 'Film Noir'",
    "timeOfDay": "time of day, e.g., 'Golden Hour', 'Mid-day', 'Night', 'Twilight'",
    "keyLight": "key light setup, e.g., 'Hard light from camera left'",
    "fillLight": "fill light setup, e.g., 'Soft fill from camera right, 50% power'",
    "backlight": "backlight/rim light, e.g., 'To create separation from the background'",
    "practicals": "practical lights, e.g., 'Desk lamp ON', 'TV screen as primary source'",
    "colorTemperature": "color temperature, e.g., 'Warm (Tungsten)', 'Cool (Daylight)', 'Stylized (e.g., blue/orange)'"
  },
  "scene": {
    "location": "location description, e.g., 'Messy apartment living room', 'Sterile office environment'",
    "keyProps": ["array of key props, e.g., 'A steaming coffee mug', 'A flickering neon sign', 'A specific document on the desk'"],
    "atmosphere": "atmospheric description, e.g., 'Hazy/Smoky', 'Clean & Minimalist', 'Cluttered & Chaotic'"
  },
  "talent": {
    "blocking": "actor blocking, e.g., 'Actor A starts at the window, walks to the desk on [line]', 'Actor B enters from screen left'",
    "keyActions": ["array of key actions, e.g., 'Slams the phone down', 'Looks away wistfully', 'Taps fingers impatiently'"],
    "emotionalBeat": "emotional beat, e.g., 'Convey anxiety', 'A moment of realization', 'Suppressed anger'"
  },
  "audio": {
    "priorities": "audio priorities, e.g., 'Capture clean dialogue', 'Prioritize environmental sounds', 'Silence on set'",
    "considerations": "audio considerations, e.g., 'Be aware of HVAC noise', 'Room tone needed for this location'"
  }
}

IMPORTANT:
- Use professional film terminology
- Be specific and actionable for crew members
- Consider the emotional tone and narrative context
- Ensure all arrays contain at least one item
- Return ONLY valid JSON, no markdown formatting, no explanations`
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex, scene }: GenerateDirectionRequest = await req.json()

    if (!projectId || sceneIndex === undefined || !scene) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, sceneIndex, or scene' },
        { status: 400 }
      )
    }

    // Ensure database connection
    await sequelize.authenticate()

    // Get project
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Build prompt
    const prompt = buildSceneDirectionPrompt(scene)
    console.log('[Scene Direction] Generating direction for scene', sceneIndex)

    // Call Gemini API
    const responseText = await callGemini(apiKey, prompt)
    
    // Parse JSON response
    let sceneDirection: DetailedSceneDirection
    try {
      // Clean up response if it has markdown code blocks
      let cleanedText = responseText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      sceneDirection = JSON.parse(cleanedText)
      
      // Validate structure
      if (!sceneDirection.camera || !sceneDirection.lighting || !sceneDirection.scene || 
          !sceneDirection.talent || !sceneDirection.audio) {
        throw new Error('Invalid scene direction structure')
      }
    } catch (parseError) {
      console.error('[Scene Direction] JSON parse error:', parseError)
      console.error('[Scene Direction] Response text:', responseText.substring(0, 500))
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Add timestamp
    sceneDirection.generatedAt = new Date().toISOString()

    // Update project metadata
    const metadata = project.metadata || {}
    const visionPhase = metadata.visionPhase || {}
    const script = visionPhase.script || {}
    const scriptScenes = script.script?.scenes || script.scenes || []
    
    if (sceneIndex < 0 || sceneIndex >= scriptScenes.length) {
      return NextResponse.json(
        { success: false, error: `Invalid scene index: ${sceneIndex}` },
        { status: 400 }
      )
    }

    // Update the specific scene
    const updatedScenes = scriptScenes.map((s: any, idx: number) =>
      idx === sceneIndex
        ? { ...s, sceneDirection }
        : s
    )

    // Update script structure
    const updatedScript = script.script
      ? { ...script, script: { ...script.script, scenes: updatedScenes } }
      : { ...script, scenes: updatedScenes }

    // Update project
    await project.update({
      metadata: {
        ...metadata,
        visionPhase: {
          ...visionPhase,
          script: updatedScript,
        },
      },
    })

    console.log('[Scene Direction] Successfully generated and saved direction for scene', sceneIndex)

    return NextResponse.json({
      success: true,
      sceneDirection,
    })
  } catch (error: any) {
    console.error('[Scene Direction] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate scene direction' },
      { status: 500 }
    )
  }
}

