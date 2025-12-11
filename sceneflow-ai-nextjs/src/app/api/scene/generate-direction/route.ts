import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { DetailedSceneDirection } from '../../../../types/scene-direction'
import { generateSceneContentHash } from '../../../../lib/utils/contentHash'

export const maxDuration = 300
export const runtime = 'nodejs'

const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta'
const GEMINI_API_HOST = process.env.GEMINI_API_HOST || 'https://generativelanguage.googleapis.com'

interface GenerateDirectionRequest {
  projectId: string
  sceneIndex: number
  scene: {
    heading?: string | { text: string }
    action?: string
    visualDescription?: string
    narration?: string
    dialogue?: Array<{ character: string; text?: string; line?: string }>
    characters?: string[]  // List of characters appearing in this scene
    [key: string]: any
  }
}

interface GeminiRequestError extends Error {
  status?: number
}

const DEFAULT_MODEL_SEQUENCE = [
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
]

const configuredSequence = process.env.GEMINI_MODEL_SEQUENCE || process.env.GEMINI_MODEL_PRIORITY
const preferredModel = process.env.GEMINI_MODEL?.trim()

const prioritizedModels: string[] = preferredModel ? [preferredModel] : []
const configuredModels: string[] = configuredSequence
  ? configuredSequence.split(',').map(model => model.trim()).filter(Boolean)
  : DEFAULT_MODEL_SEQUENCE

const GEMINI_MODEL_SEQUENCE = Array.from(new Set([...prioritizedModels, ...configuredModels]))

/**
 * Attempts Gemini generation using preferred models in sequence, falling back when models return 404/403
 */
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastError: Error | null = null

  for (const model of GEMINI_MODEL_SEQUENCE) {
    try {
      return await callGeminiWithModel(apiKey, prompt, model)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Gemini error')
      const status = (error as GeminiRequestError)?.status
      const canFallback = status === 404 || status === 403
      console.warn(`[Gemini API] Model ${model} failed${status ? ` (${status})` : ''}: ${lastError.message}`)

      if (!canFallback) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Gemini API failed for all configured models')
}

/**
 * Call Gemini API for a specific model with retry logic for rate limiting (429 errors)
 */
async function callGeminiWithModel(apiKey: string, prompt: string, model: string, retryCount = 0): Promise<string> {
  const maxRetries = 3
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // 60 second timeout
  
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
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        }),
      }
    )
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error')
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.warn(`[Gemini API] Rate limited (429) on model ${model}. Retrying in ${waitTime}ms... (attempt ${retryCount + 1}/${maxRetries})`)
        clearTimeout(timeout)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return callGeminiWithModel(apiKey, prompt, model, retryCount + 1)
      }
      
      console.error(`[Gemini API] HTTP ${response.status} on model ${model}:`, errorBody)
      const error: GeminiRequestError = new Error(
        `Gemini API error: ${response.status}${response.status === 429 ? ' (Rate limit exceeded. Please try again in a moment.)' : ''}`
      )
      error.status = response.status
      throw error
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
    
    console.log(`[Gemini API] Scene direction generated with model ${model}`)
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
  const characters = scene.characters || []
  
  // Support both 'line' (from script generation) and 'text' (legacy) field names
  const dialogueText = dialogue.map(d => `${d.character}: ${d.line || d.text || ''}`).join('\n')
  const charactersList = characters.length > 0 
    ? `\nCharacters in scene: ${characters.join(', ')}\n`
    : ''
  
  return `You are a world-class film director and cinematographer. Your task is to generate detailed, professional-grade technical instructions for a live-action film crew based on the following scene information.

SCENE INFORMATION:
${heading ? `Heading: ${heading}\n` : ''}${charactersList}${action ? `Action: ${action}\n` : ''}${visualDescription ? `Visual Description: ${visualDescription}\n` : ''}${narration ? `Narration: ${narration}\n` : ''}${dialogueText ? `Dialogue:\n${dialogueText}\n` : ''}
CRITICAL TALENT RULE:
- The talent blocking MUST reference ONLY the characters listed above
- DO NOT invent new characters or add characters not in this scene
- Reference characters by name exactly as listed

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

    // Get API key (prioritize GEMINI_API_KEY, fallback to legacy)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured (GEMINI_API_KEY)' },
        { status: 500 }
      )
    }

    // Build prompt
    const prompt = buildSceneDirectionPrompt(scene)
    console.log('[Scene Direction] Generating direction for scene', sceneIndex)
    console.log('[Scene Direction] Using API key:', apiKey.substring(0, 20) + '...' + apiKey.substring(apiKey.length - 4))

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

    // Add timestamp and content hash for workflow sync tracking
    sceneDirection.generatedAt = new Date().toISOString()
    // Track which version of the scene content this direction was based on
    sceneDirection.basedOnContentHash = generateSceneContentHash(scene)

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

