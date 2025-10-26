import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { callVertexAIImagen } from '@/lib/vertexai/client'
import { uploadImageToBlob } from '@/lib/storage/blob'
import { optimizePromptForImagen } from '@/lib/imagen/promptOptimizer'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId, sceneNumber } = await request.json()

    if (!projectId || !sceneNumber) {
      return NextResponse.json({
        success: false,
        error: 'projectId and sceneNumber are required'
      }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_GEMINI_API_KEY not configured'
      }, { status: 500 })
    }

    // Ensure database connection
    await sequelize.authenticate()

    const project = await Project.findByPk(projectId)
    
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 })
    }

    const visionPhase = project.metadata?.visionPhase
    if (!visionPhase?.script) {
      return NextResponse.json({
        success: false,
        error: 'Script not found - generate script first'
      }, { status: 400 })
    }

    const scenes = visionPhase.script.script?.scenes || []
    const sceneToExpand = scenes.find((s: any) => s.sceneNumber === sceneNumber)
    
    if (!sceneToExpand) {
      return NextResponse.json({
        success: false,
        error: `Scene ${sceneNumber} not found`
      }, { status: 404 })
    }

    // If already expanded, return as-is
    if (sceneToExpand.isExpanded && sceneToExpand.action) {
      return NextResponse.json({
        success: true,
        scene: sceneToExpand,
        wasAlreadyExpanded: true
      })
    }

    // Get expansion context with story bible
    const context = visionPhase.script._context || {}
    const visualStyle = context.visualStyle || 'Cinematic, high-quality'
    const toneDescription = context.toneDescription || 'Professional'
    const characters = context.characters || []
    const storyBible = context.storyBible || {}
    const outline = sceneToExpand._outline || sceneToExpand

    // Get previous scenes for continuity
    const previousScenes = scenes
      .filter((s: any) => s.sceneNumber < sceneNumber && s.isExpanded)
      .map((s: any) => `Scene ${s.sceneNumber}: ${s.heading} - ${s.action?.substring(0, 150)}...`)
      .slice(-3) // Last 3 scenes

    // Get beat context
    const sceneBeat = storyBible.sceneToBeatMap?.find((m: any) => m.sceneNumber === sceneNumber)
    const currentBeat = storyBible.beatStructure?.[sceneBeat?.beatIndex || 0]

    console.log(`[Expand Scene] Expanding scene ${sceneNumber} with full story bible...`)

    // Expand the scene using Gemini with story bible context
    const expandedScene = await expandScene(
      apiKey,
      outline,
      characters,
      visualStyle,
      toneDescription,
      sceneNumber,
      storyBible,
      previousScenes,
      currentBeat
    )

    // Save expanded scene immediately without waiting for image
    expandedScene.imageUrl = null // Will be generated async
    expandedScene.hasImage = false
    expandedScene.isExpanded = true

    // Generate image asynchronously (don't await to avoid timeout)
    generateSceneImage(sceneNumber, expandedScene, characters, visualStyle, projectId)
      .then(imageUrl => {
        if (imageUrl) {
          console.log(`[Expand Scene] Image generated asynchronously for scene ${sceneNumber}`)
        }
      })
      .catch(err => console.error(`[Scene Image] Async generation failed:`, err))

    // Update the scene in the project metadata
    const updatedScenes = scenes.map((s: any) => 
      s.sceneNumber === sceneNumber ? expandedScene : s
    )

    const existingMetadata = project.metadata || {}
    const updatedMetadata = {
      ...existingMetadata,
      visionPhase: {
        ...visionPhase,
        script: {
          ...visionPhase.script,
          script: {
            scenes: updatedScenes
          }
        }
      }
    }

    await project.update({ metadata: updatedMetadata })

    console.log(`[Expand Scene] Scene ${sceneNumber} expanded successfully`)

    return NextResponse.json({
      success: true,
      scene: expandedScene
    })
  } catch (error: any) {
    console.error('[Expand Scene] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to expand scene'
    }, { status: 500 })
  }
}

// Helper: Expand a single scene outline into full detail with story bible context
async function expandScene(
  apiKey: string,
  outline: any,
  characters: any[],
  visualStyle: string,
  toneDescription: string,
  sceneNumber: number,
  storyBible: any = {},
  previousScenes: string[] = [],
  currentBeat: any = null
): Promise<any> {
  
  // Build character bible
  const characterBible = characters.map(c => 
    `${c.name} (${c.role}): ${c.description || ''}`
  ).join('\n  ') || 'No predefined characters'
  
  // Build previous scene context
  const sceneHistory = previousScenes.length > 0
    ? `\n\nPREVIOUS SCENES (for continuity):\n${previousScenes.join('\n')}`
    : ''
  
  // Build beat context
  const beatContext = currentBeat
    ? `\n\nCURRENT STORY BEAT:\nBeat: "${currentBeat.title}"\nIntent: ${currentBeat.intent}`
    : ''
  
  const prompt = `You are a professional screenwriter working on a specific production. You MUST stay faithful to the approved film treatment and story bible.

CRITICAL: This scene is part of a larger narrative. DO NOT invent new storylines or contradict the treatment.

STORY BIBLE (APPROVED TREATMENT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Logline: ${storyBible.logline || 'N/A'}
Genre: ${storyBible.genre || 'N/A'}
Tone: ${toneDescription}
Visual Style: ${visualStyle}

Synopsis:
${storyBible.synopsis || 'Follow the treatment closely'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHARACTERS (USE THESE EXACT NAMES IN DIALOGUE):
  ${characterBible}

CRITICAL DIALOGUE RULES:
- Use ONLY the EXACT character names from the list above
- DO NOT abbreviate, modify, or create variations of character names
- Example: If character is "Brian Anderson Sr", dialogue MUST be "BRIAN ANDERSON SR:" not "BRIAN:" or "Brian:"
- Character names in dialogue must match the character list EXACTLY

DIALOGUE INFLECTION AND EMOTION (CRITICAL FOR TTS):
- Add emotion/inflection tags in brackets: [excitedly], [whispering], [sadly], [thoughtfully]
- Use SSML pauses: <break time="1.0s" />
- Use ellipses (...) for hesitation, dashes (—) for interruptions
- Capitalize words for EMPHASIS
- Example: "BRIAN: [thoughtfully] I... <break time="0.5s" /> I think you're right."

${beatContext}

${sceneHistory}

SCENE TO EXPAND:
Scene Number: ${sceneNumber}
Heading: ${outline.heading || outline.head}
Summary: ${outline.summary}
Duration: ${outline.duration}s

STRICT REQUIREMENTS:
1. Stay 100% faithful to the logline and synopsis above
2. Use ONLY the exact character names defined in the character list - do not modify them
3. Maintain continuity with previous scenes
4. Align with the current story beat's intent
5. Do NOT introduce new plot elements not in the treatment
6. Do NOT change character personalities or relationships
7. Expand the summary into detailed action and dialogue WITHOUT changing the core story

Generate a complete scene that EXPANDS (not changes) the outline. Return ONLY valid JSON:
{
  "sceneNumber": ${sceneNumber},
  "heading": "INT. LOCATION - TIME",
  "action": "Detailed action description that MATCHES the synopsis and beat intent...",
  "dialogue": [{"character": "NAME", "line": "dialogue that matches character voice"}],
  "duration": ${outline.duration || 5},
  "visualDescription": "Specific camera angles, lighting, composition matching visual style...",
  "characters": ["CHARACTER_NAME"],
  "isExpanded": true
}

Remember: You are EXPANDING an approved treatment, not creating a new story. Stay faithful to the source material.`

  try {
    const response = await callGeminiWithRetry(apiKey, prompt, 16000, 1)
    const scene = JSON.parse(response)
    
    // Add story bible reference for future edits
    scene._storyBibleRef = {
      beat: currentBeat?.title,
      logline: storyBible.logline
    }
    
    return scene
  } catch (error) {
    console.error(`[Scene Expand] Failed to expand scene ${sceneNumber}:`, error)
    // Return basic scene if expansion fails
    return {
      sceneNumber,
      heading: outline.heading || outline.head || `SCENE ${sceneNumber}`,
      action: outline.summary || 'Scene content',
      dialogue: [],
      duration: outline.duration || 8,
      visualDescription: `${outline.summary}, cinematic shot`,
      characters: [],
      isExpanded: true
    }
  }
}

// Helper: Generate scene image using Vertex AI Imagen 3
async function generateSceneImage(
  sceneNumber: number,
  scene: any,
  characters: any[],
  visualStyle: string,
  projectId?: string,
  customPrompt?: string
): Promise<string | null> {
  try {
    // Build character list with references
    const characterList = characters.length > 0 
      ? `\n\nCHARACTERS:\n${characters.map(c => {
          let desc = `- ${c.name || c}`
          if (typeof c === 'object') {
            if (c.referenceImage) desc += ` (Reference: ${c.referenceImage})`
            const attrs = []
            if (c.ethnicity) attrs.push(c.ethnicity)
            if (c.keyFeature) attrs.push(c.keyFeature)
            if (c.hairStyle) attrs.push(`${c.hairColor || ''} ${c.hairStyle}`.trim())
            if (attrs.length > 0) desc += ` - ${attrs.join(', ')}`
          }
          return desc
        }).join('\n')}`
      : ''
    
    const hasCharacterRefs = characters.some((c: any) => typeof c === 'object' && c.referenceImage)
    const refInstruction = hasCharacterRefs 
      ? '\n\nCRITICAL: Match character appearances from their reference images exactly.'
      : ''
    
    const defaultPrompt = `Generate a cinematic scene image:

Scene: ${scene.heading}
Action: ${scene.visualDescription || scene.action || scene.summary}
Visual Style: ${visualStyle}${characterList}${refInstruction}

Requirements:
- Professional film production quality
- Cinematic composition and framing
- ${visualStyle} visual aesthetic
- Proper blocking and staging
- Authentic lighting for scene mood
- 16:9 landscape aspect ratio
- High detail and photorealistic rendering
${hasCharacterRefs ? '- Characters MUST match their reference images' : ''}
- No text, titles, or watermarks
- Film-ready production value`

    const prompt = customPrompt || defaultPrompt

    console.log(`[Scene Image] Generating with Vertex AI Imagen 3 for scene ${sceneNumber}`)
    
    // Filter characters with GCS references
    const charactersWithGCS = characters.filter((c: any) => c.referenceImageGCS)
    const characterNames = characters.map((c: any) => c.name || c)
    
    let finalPrompt = prompt
    
    // Optimize prompt if GCS references available
    if (charactersWithGCS.length > 0) {
      try {
        finalPrompt = await optimizePromptForImagen({
          rawPrompt: prompt,
          sceneAction: scene.action || '',
          visualDescription: scene.visualDescription || prompt,
          characterNames,
          hasCharacterReferences: true,
          characterMetadata: charactersWithGCS.map((char: any) => ({
            name: char.name,
            referenceImageGCS: char.referenceImageGCS,
            appearanceDescription: char.appearanceDescription || `${char.ethnicity || ''} ${char.subject || 'person'}`.trim()
          }))
        })
        console.log(`[Scene Image] Using ${charactersWithGCS.length} character GCS references for consistency`)
      } catch (error) {
        console.error('[Prompt Optimizer] Failed, using original prompt:', error)
      }
    }

    // Generate with Vertex AI Imagen 3 (GCS references embedded in prompt)
    const base64Image = await callVertexAIImagen(finalPrompt, {
      aspectRatio: '16:9',
      numberOfImages: 1
    })

    // Upload to Vercel Blob
    const blobUrl = await uploadImageToBlob(
      base64Image,
      `scenes/${projectId || 'unknown'}-scene-${sceneNumber}-${Date.now()}.png`
    )

    console.log(`[Scene Image] Scene ${sceneNumber} image uploaded to Blob`)
    return blobUrl
  } catch (error) {
    console.error(`[Scene Image] Error generating image for scene ${sceneNumber}:`, error)
    return null // Don't fail the whole scene if image fails
  }
}

// Helper: Call Gemini API with retry logic
async function callGeminiWithRetry(
  apiKey: string, 
  prompt: string, 
  maxTokens: number,
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini API] Attempt ${attempt}/${maxRetries}`)
      return await callGemini(apiKey, prompt, maxTokens)
    } catch (error: any) {
      console.error(`[Gemini API] Attempt ${attempt} failed:`, error.message)
      
      if (attempt === maxRetries) {
        throw error // Last attempt, give up
      }
      
      // Shorter delay: 1s, 2s instead of 2s, 4s, 8s
      const delay = Math.pow(2, attempt - 1) * 1000
      console.log(`[Gemini API] Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('All retries failed')
}

// Helper: Call Gemini API
async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            topP: 0.9,
            maxOutputTokens: maxTokens,
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
    
    // Log the full response structure for debugging
    console.log('[Gemini API] Response structure:', {
      hasCandidates: !!data?.candidates,
      candidateCount: data?.candidates?.length || 0,
      hasContent: !!data?.candidates?.[0]?.content,
      hasParts: !!data?.candidates?.[0]?.content?.parts,
      partsCount: data?.candidates?.[0]?.content?.parts?.length || 0,
      finishReason: data?.candidates?.[0]?.finishReason,
      safetyRatings: data?.candidates?.[0]?.safetyRatings
    })
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!text) {
      // Check for safety filter blocks
      const finishReason = data?.candidates?.[0]?.finishReason
      if (finishReason === 'SAFETY') {
        console.error('[Gemini API] Content blocked by safety filter:', data?.candidates?.[0]?.safetyRatings)
        throw new Error('Content blocked by safety filter - try adjusting the prompt')
      }
      
      // Log full response for debugging
      console.error('[Gemini API] Empty content. Full response:', JSON.stringify(data, null, 2))
      throw new Error(`Gemini returned empty content. Finish reason: ${finishReason || 'unknown'}`)
    }
    
    return text
  } finally {
    clearTimeout(timeout)
  }
}

