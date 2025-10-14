import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'projectId is required' 
      }, { status: 400 })
    }

    // Ensure database connection
    await sequelize.authenticate()

    // Load project to get Film Treatment variant data
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project not found' 
      }, { status: 404 })
    }

    const filmTreatmentVariant = project.metadata?.filmTreatmentVariant
    if (!filmTreatmentVariant) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Film Treatment variant found in project' 
      }, { status: 400 })
    }

    // Use project duration or parse from variant
    const targetDuration = project.duration || 300 // Default to 5 minutes minimum
    console.log(`[Script Gen] Using project duration: ${targetDuration}s (${Math.floor(targetDuration / 60)} min)`)
    console.log('[Script Gen] DURATION CHECK:', {
      project_duration: project.duration,
      targetDuration: targetDuration,
      metadata_total_duration_seconds: filmTreatmentVariant.total_duration_seconds,
      metadata_beats_count: Array.isArray(filmTreatmentVariant.beats) ? filmTreatmentVariant.beats.length : 0
    })
    
    // Get API key early for character generation
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('Google Gemini API key not configured')
    }
    
    // Build rich prompt using Film Treatment data
    const treatmentContent = filmTreatmentVariant.content || filmTreatmentVariant.synopsis || ''
    let characters = filmTreatmentVariant.character_descriptions || []
    const beatSheet = filmTreatmentVariant.beats || filmTreatmentVariant.act_breakdown // Use beats array first
    const actBreakdown = filmTreatmentVariant.act_breakdown // Keep for prompt context
    const visualStyle = filmTreatmentVariant.visual_style || ''
    const toneDescription = filmTreatmentVariant.tone_description || filmTreatmentVariant.tone || ''

    // Add debugging for character sources
    console.log('[Script Gen] Characters from variant:', {
      hasCharacterDescriptions: !!filmTreatmentVariant.character_descriptions,
      characterCount: Array.isArray(filmTreatmentVariant.character_descriptions) 
        ? filmTreatmentVariant.character_descriptions.length 
        : 0,
      charactersSample: Array.isArray(filmTreatmentVariant.character_descriptions)
        ? filmTreatmentVariant.character_descriptions.slice(0, 2)
        : null
    })

    // If no characters from variant, generate them from treatment content
    if (characters.length === 0 && treatmentContent) {
      console.log('[Script Gen] No characters in variant, generating from treatment...')
      const charPrompt = `Extract main characters from this film treatment:

${treatmentContent.slice(0, 2000)}

Return JSON array of characters (2-5 main characters):
[
  {
    "name": "Character Name",
    "role": "protagonist|antagonist|supporting|narrator",
    "description": "Brief description",
    "age": "Age or N/A",
    "personality": "Key personality traits"
  }
]

CRITICAL: Return ONLY the JSON array, no other text.`

      try {
        const charText = await callGeminiWithRetry(apiKey, charPrompt, 2000)
        const cleanText = charText.replace(/```json\n?|```/g, '').trim()
        const parsed = JSON.parse(cleanText)
        if (Array.isArray(parsed) && parsed.length > 0) {
          characters = parsed
          console.log(`[Script Gen] Generated ${characters.length} characters from treatment:`, 
            characters.map((c: any) => c.name))
        }
      } catch (error) {
        console.error('[Script Gen] Character generation failed:', error)
        // Continue without characters - not critical
      }
    }

    // Add debugging for beat detection
    console.log('[Script Gen] Beat sheet debug:', {
      hasBeatsArray: Array.isArray(filmTreatmentVariant.beats),
      beatsCount: Array.isArray(filmTreatmentVariant.beats) ? filmTreatmentVariant.beats.length : 0,
      hasActBreakdown: !!filmTreatmentVariant.act_breakdown,
      actBreakdownKeys: filmTreatmentVariant.act_breakdown ? Object.keys(filmTreatmentVariant.act_breakdown) : [],
      targetDuration: targetDuration,
      calculatedDefault: Math.ceil(targetDuration / 8)
    })

    // Use beat sheet count if available, otherwise calculate from duration
    let sceneCount = Math.ceil(targetDuration / 8) // Default: ~8s per scene average

    // Check for beats array (PRIMARY source - the actual story beats!)
    if (Array.isArray(beatSheet)) {
      sceneCount = beatSheet.length
      console.log(`[Script Gen] Using beats array: ${sceneCount} beats`)
    }
    // Fallback: Check for beats property
    else if (beatSheet?.beats && Array.isArray(beatSheet.beats)) {
      sceneCount = beatSheet.beats.length
      console.log(`[Script Gen] Using beatSheet.beats: ${sceneCount} beats`)
    }
    // Last resort: Duration-based calculation
    else {
      // If we have a targetDuration suggesting a long video, use reasonable beat count
      if (targetDuration >= 600) { // 10+ minutes
        sceneCount = Math.min(12, Math.ceil(targetDuration / 120)) // ~2 min per scene, max 12
      }
      console.log(`[Script Gen] No beats array found, using duration-based calculation: ${sceneCount} scenes for ${targetDuration}s`)
    }

    // Safety cap: Never generate more than 20 scenes regardless of calculation
    if (sceneCount > 20) {
      console.warn(`[Script Gen] Scene count ${sceneCount} exceeds maximum of 20, capping at 20`)
      sceneCount = 20
    }

    console.log(`[Script Gen] Final scene count: ${sceneCount} scenes for ${targetDuration}s (${Math.floor(targetDuration / 60)} min)`)

    // TWO-STAGE GENERATION for guaranteed completeness
    console.log(`[Script Gen] Starting two-stage generation: ${sceneCount} scenes, ${targetDuration}s`)
    
    // STAGE 1: Generate scene outlines (lightweight, always completes)
    const perSceneDuration = Math.floor(targetDuration / sceneCount)
    const outlinesPrompt = `Create ${sceneCount} scene outlines for a ${Math.floor(targetDuration / 60)}-minute video.

TITLE: ${filmTreatmentVariant.title || 'Untitled'}
GENRE: ${filmTreatmentVariant.genre || 'Documentary'}
DURATION: ${targetDuration} seconds (${Math.floor(targetDuration / 60)} minutes)
TONE: ${toneDescription}

${Array.isArray(beatSheet) && beatSheet.length > 0 ? `
STORY BEATS (${sceneCount} total):
${beatSheet.map((b: any, i: number) => `${i + 1}. ${b.title || b.beat_title || `Beat ${i + 1}`} (${b.minutes || Math.floor(targetDuration / sceneCount / 60)} min)`).join('\n')}

Create ONE scene outline for EACH beat above.
` : ''}

${actBreakdown ? `
ACT STRUCTURE:
- Act 1: ${actBreakdown.act1 || 'Setup'}
- Act 2: ${actBreakdown.act2 || 'Development'}
- Act 3: ${actBreakdown.act3 || 'Resolution'}
` : ''}

Return a JSON array of exactly ${sceneCount} scene outlines:
[
  {
    "num": 1,
    "heading": "EXT. LOCATION - TIME",
    "summary": "What happens in this scene",
    "duration": ${perSceneDuration}
  }
]

CRITICAL: 
- Return ONLY the JSON array
- Must have EXACTLY ${sceneCount} scenes (one per beat)
- Each scene ${perSceneDuration} seconds
- Total ${targetDuration} seconds`

    // STAGE 1: Generate outlines
    console.log(`[Script Gen] Stage 1: Generating ${sceneCount} scene outlines...`)
    const outlines = await callGeminiWithRetry(apiKey, outlinesPrompt, 4000, 3)
    
    let parsedOutlines: any[]
    try {
      parsedOutlines = JSON.parse(outlines)
      if (!Array.isArray(parsedOutlines)) {
        throw new Error('Outlines must be an array')
      }
    } catch (e) {
      // Try to extract array from response
      const arrayMatch = outlines.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        try {
          parsedOutlines = JSON.parse(arrayMatch[0])
        } catch (parseError) {
          console.warn('[Script Gen] Failed to parse outlines, generating fallback')
          parsedOutlines = generateFallbackOutlines(beatSheet, sceneCount, filmTreatmentVariant, perSceneDuration)
        }
      } else {
        console.warn('[Script Gen] Failed to parse outlines, generating fallback')
        parsedOutlines = generateFallbackOutlines(beatSheet, sceneCount, filmTreatmentVariant, perSceneDuration)
      }
    }
    
    if (parsedOutlines.length < sceneCount) {
      console.warn(`[Script Gen] Stage 1: Got ${parsedOutlines.length}/${sceneCount} outlines`)
    } else {
      console.log(`[Script Gen] Stage 1: Successfully generated ${parsedOutlines.length} outlines!`)
    }

    // Convert outlines to lightweight scene objects with isExpanded: false
    const outlineScenes = parsedOutlines.map((outline, idx) => ({
      sceneNumber: idx + 1,
      heading: outline.heading || outline.head || `SCENE ${idx + 1}`,
      summary: outline.summary || outline.description || 'Scene content',
      duration: outline.duration || Math.floor(targetDuration / sceneCount),
      isExpanded: false,
      // Preserve outline data for later expansion
      _outline: outline
    }))

    console.log(`[Script Gen] Returning ${outlineScenes.length} scene outlines (not yet expanded)`)

    // Extract characters from scenes if not provided by variant
    const extractedCharacters = characters.length > 0 ? characters : extractCharactersFromScenes(outlineScenes)
    
    console.log('[Script Gen] Character extraction:', {
      fromVariant: characters.length,
      extracted: extractedCharacters.length,
      finalCount: extractedCharacters.length
    })
    
    // Combine into final script structure (outlines only, not expanded)
    const scriptData = {
      title: filmTreatmentVariant.title || 'Untitled',
      logline: filmTreatmentVariant.logline || '',
      script: {
        scenes: outlineScenes
      },
      characters: extractedCharacters,
      totalDuration: outlineScenes.reduce((sum: number, scene: any) => sum + (scene.duration || 0), 0),
      // Store context for later scene expansion
      _context: {
        visualStyle,
        toneDescription,
        characters: extractedCharacters
      }
    }

    // Merge metadata properly (avoids SQL syntax errors)
    const existingMetadata = project.metadata || {}
    const updatedMetadata = {
      ...existingMetadata,
      visionPhase: {
        ...(existingMetadata.visionPhase || {}),
        script: scriptData,
        scriptGenerated: true,
        characters: scriptData.characters || [],
        scenes: scriptData.script?.scenes || []
      }
    }

    // Update with proper Sequelize method
    await project.update({
      metadata: updatedMetadata
    })

    return NextResponse.json({
      success: true,
      script: scriptData
    })
  } catch (error: any) {
    console.error('[Generate Script] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate script'
    }, { status: 500 })
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
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000
      console.log(`[Gemini API] Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('All retries failed')
}

// Helper: Call Gemini API
async function callGemini(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000) // Increased from 30s to 60s
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, // Switched from experimental to stable
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5, // Reduced from 0.7 to 0.5 for more deterministic JSON
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

// Helper: Expand single scene outline into full scene
async function expandScene(
  apiKey: string,
  outline: any,
  characters: any[],
  visualStyle: string,
  tone: string,
  sceneNumber: number
): Promise<any> {
  const charList = characters.length > 0 
    ? characters.map((c: any) => `${c.name} (${c.role}): ${c.description}`).join(', ')
    : 'Extract characters from scene'
  
  const prompt = `Expand this scene outline into a full production script scene:

SCENE OUTLINE:
- Scene Number: ${sceneNumber}
- Heading: ${outline.heading || outline.head}
- Summary: ${outline.summary}
- Duration: ${outline.duration}s

CONTEXT:
- Characters: ${charList}
- Visual Style: ${visualStyle}
- Tone: ${tone}

Generate a complete scene with dialogue and detailed visual description. Return JSON:
{
  "sceneNumber": ${sceneNumber},
  "heading": "${outline.heading || outline.head}",
  "action": "Detailed action description of what happens visually",
  "dialogue": [
    { "character": "CHARACTER_NAME", "line": "Their dialogue" }
  ],
  "duration": ${outline.duration},
  "visualDescription": "Detailed visual description for AI image generation: specific camera angle (wide/medium/close-up), lighting (natural/dramatic/soft), composition (rule of thirds/center/symmetrical), mood, color palette",
  "characters": ["CHARACTER_NAME"]
}

Include realistic dialogue if characters speak. Make visualDescription very specific and concrete.`

  try {
    const response = await callGemini(apiKey, prompt, 16000) // Increased from 1500 to 16000 for full scene details
    const scene = JSON.parse(response)
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
      characters: []
    }
  }
}

// Helper: Extract unique characters from scenes
function extractCharactersFromScenes(scenes: any[]): any[] {
  const charMap = new Map()
  
  scenes.forEach(scene => {
    scene.dialogue?.forEach((d: any) => {
      if (d.character && !charMap.has(d.character)) {
        charMap.set(d.character, {
          name: d.character,
          role: d.character === 'NARRATOR' ? 'narrator' : 'supporting',
          description: `Character from script`,
          age: 'N/A',
          personality: 'To be determined'
        })
      }
    })
  })
  
  return Array.from(charMap.values())
}

// Helper: Generate fallback outlines when AI fails
function generateFallbackOutlines(beatSheet: any, sceneCount: number, filmTreatmentVariant: any, perSceneDuration: number): any[] {
  console.log('[Script Gen] Generating fallback outlines')
  
  // Priority 1: Use beats array from Film Treatment (PRIMARY source!)
  if (filmTreatmentVariant.beats && Array.isArray(filmTreatmentVariant.beats)) {
    return filmTreatmentVariant.beats.map((beat: any, idx: number) => ({
      num: idx + 1,
      heading: `SCENE ${idx + 1}`,
      summary: beat.title || beat.beat_title || beat.intent || `Beat ${idx + 1}`,
      duration: (beat.minutes || 1) * 60
    }))
  }
  
  // Priority 2: Try beatSheet if it's an array
  if (Array.isArray(beatSheet)) {
    return beatSheet.map((beat: any, idx: number) => ({
      num: idx + 1,
      heading: `SCENE ${idx + 1}`,
      summary: beat.title || beat.beat_title || `Beat ${idx + 1}`,
      duration: (beat.minutes || perSceneDuration / 60) * 60
    }))
  }
  
  // Priority 3: Last resort - create generic outlines based on sceneCount
  return Array.from({ length: sceneCount }, (_, idx) => ({
    num: idx + 1,
    heading: `SCENE ${idx + 1}`,
    summary: `Scene ${idx + 1} from ${filmTreatmentVariant.title || 'the story'}`,
    duration: perSceneDuration
  }))
}

