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

    // Calculate scenes per beat based on duration (industry standard: 3-7 scenes per beat)
    const beatsCount = Array.isArray(beatSheet) ? beatSheet.length : Math.ceil(targetDuration / 600)
    const targetScenesPerBeat = Math.ceil(targetDuration / 60 / beatsCount) // Minutes per beat determines scenes
    const minScenesPerBeat = 3
    const maxScenesPerBeat = 7

    // Target 25-45 scenes for 60 minutes (industry standard)
    let sceneCount = beatsCount * Math.max(minScenesPerBeat, Math.min(maxScenesPerBeat, targetScenesPerBeat))

    // Ensure within 25-45 range for 60min+ content
    if (targetDuration >= 3000) { // 50+ minutes
      sceneCount = Math.max(25, Math.min(45, sceneCount))
    }

    // Safety cap: Never generate more than 45 scenes regardless of calculation
    if (sceneCount > 45) {
      console.warn(`[Script Gen] Scene count ${sceneCount} exceeds maximum of 45, capping at 45`)
      sceneCount = 45
    }

    console.log(`[Script Gen] Beat expansion: ${beatsCount} beats → ${sceneCount} scenes (${Math.floor(sceneCount / beatsCount)} scenes per beat)`)

    console.log(`[Script Gen] Final scene count: ${sceneCount} scenes for ${targetDuration}s (${Math.floor(targetDuration / 60)} min)`)

    // TWO-STAGE GENERATION for guaranteed completeness
    console.log(`[Script Gen] Starting two-stage generation: ${sceneCount} scenes, ${targetDuration}s`)
    
    // STAGE 1: Generate scene outlines (lightweight, always completes)
    const perSceneDuration = Math.floor(targetDuration / sceneCount)
    const outlinesPrompt = `You are an expert screenwriter and script analyst with deep knowledge of screenplay structure, pacing, and scene construction.

CRITICAL TASK: Expand the provided Beat Structure from a Film Treatment into a detailed, logical Scene Structure suitable for a ${Math.floor(targetDuration / 60)}-minute ${filmTreatmentVariant.genre || 'video'}.

PROJECT DETAILS:
- Title: ${filmTreatmentVariant.title || 'Untitled'}
- Genre: ${filmTreatmentVariant.genre || 'Documentary'}  
- Duration: ${targetDuration} seconds (${Math.floor(targetDuration / 60)} minutes)
- Tone: ${toneDescription}
- Required Scene Count: ${sceneCount} scenes (industry standard: 25-45 for 60 min)

BEAT STRUCTURE TO EXPAND:
${Array.isArray(beatSheet) && beatSheet.length > 0 ? 
  beatSheet.map((b: any, i: number) => 
    `Beat ${i + 1}: "${b.title || b.beat_title}" (${b.minutes || 1} min)
    Intent: ${b.intent || b.synopsis || 'Advance the story'}
    `
  ).join('\n') 
  : 'No beats provided - create logical story progression'
}

CRITICAL INSTRUCTIONS - BEAT TO SCENE EXPANSION:

1. DECONSTRUCT BEATS: Each beat above must be broken into ${minScenesPerBeat}-${maxScenesPerBeat} sequential scenes.

2. SUB-BEATS: For each major beat, create 2-4 Sub-Beats (mini-goals). Each Sub-Beat = 1-2 scenes.
   Example: Beat "Journey to Discovery" → Sub-Beats: "Preparation", "Departure", "Obstacle", "Arrival"

3. SCENE DEFINITION: A scene is ONE continuous action in ONE time and ONE place.
   - New Location = New Scene (INT. OFFICE → EXT. STREET = 2 scenes)
   - New Time = New Scene (MORNING → AFTERNOON = 2 scenes)
   - Simultaneous actions in different places = Separate scenes

4. SCENE PURPOSE: Each scene must:
   - Advance plot OR reveal character OR provide context OR establish mood
   - Have clear beginning, middle, end
   - Connect logically to previous/next scene

5. PACING: 
   - ${sceneCount} total scenes for ${Math.floor(targetDuration / 60)} minutes
   - Average scene length: ${Math.floor(targetDuration / sceneCount)} seconds (1-3 pages)
   - DO NOT merge disparate actions ("drives, argues, arrives" = 3 scenes)

6. CONTINUITY: Use proper scene transitions:
   - CONTINUOUS (same time, different place)
   - LATER (time jump, same place)
   - SAME TIME (parallel action)

CRITICAL: These outlines will be expanded later. Provide SPECIFIC, CONCRETE details, not vague descriptions.

REQUIRED OUTPUT - JSON array of EXACTLY ${sceneCount} scenes with DETAILED summaries:
[
  {
    "num": 1,
    "beat": "Beat 1 title",
    "subBeat": "Sub-beat name (e.g., Setup/Preparation)",
    "heading": "INT./EXT. SPECIFIC LOCATION - TIME",
    "summary": "DETAILED 3-4 sentence description with SPECIFIC actions, emotions, and story beats. Include WHO does WHAT and WHY. Example: 'Sarah enters the abandoned warehouse, her flashlight cutting through dust motes. She discovers the locked safe behind a false wall and realizes someone has been here recently—fresh boot prints in the dust. Her phone buzzes: a threatening text from an unknown number.'",
    "purpose": "Why this scene exists (plot/character/context/mood)",
    "duration": ${Math.floor(targetDuration / sceneCount)},
    "transition": "CONTINUOUS/CUT TO/LATER/etc",
    "characters": ["CHARACTER_NAME"]
  }
]

SUMMARY REQUIREMENTS:
- 3-4 sentences minimum
- Include WHO, WHAT, WHY
- Specific actions, not vague ("they talk" → "Maria confronts John about the missing funds, waving the bank statement in his face")
- Include emotional beats and reactions
- Concrete details that guide expansion

VALIDATION:
- Must return EXACTLY ${sceneCount} scenes
- Each beat must have ${minScenesPerBeat}-${maxScenesPerBeat} scenes
- Each scene is ONE time + ONE place
- Total duration = ${targetDuration} seconds
- Logical sequence from scene 1 to scene ${sceneCount}

Return ONLY the JSON array.`

    // STAGE 1: Generate outlines
    console.log(`[Script Gen] Stage 1: Generating ${sceneCount} scene outlines...`)
    const outlines = await callGeminiWithRetry(apiKey, outlinesPrompt, 8000, 2) // 2 retries with 60s timeout each
    
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
      beat: outline.beat || 'Unknown Beat',
      subBeat: outline.subBeat || '',
      heading: outline.heading || outline.head || `SCENE ${idx + 1}`,
      summary: outline.summary || outline.description || 'Scene content',
      purpose: outline.purpose || 'Advance story',
      duration: outline.duration || Math.floor(targetDuration / sceneCount),
      transition: outline.transition || 'CUT TO',
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
        characters: extractedCharacters,
        // Story Bible for consistency during scene expansion
        storyBible: {
          logline: filmTreatmentVariant.logline || '',
          synopsis: filmTreatmentVariant.synopsis || '',
          genre: filmTreatmentVariant.genre || '',
          tone: toneDescription,
          visualStyle,
          duration: targetDuration,
          beatStructure: beatSheet.map((b: any) => ({
            title: b.title || b.beat_title,
            intent: b.intent || b.synopsis,
            minutes: b.minutes || 1
          })),
          // Map scenes to beats for context
          sceneToBeatMap: outlineScenes.map((scene: any, idx: number) => ({
            sceneNumber: scene.sceneNumber,
            beatIndex: Math.floor(idx / sceneCount * beatSheet.length),
            beatTitle: beatSheet[Math.floor(idx / sceneCount * beatSheet.length)]?.title || ''
          }))
        }
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
  const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout for large outline generation
  
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
  console.log('[Script Gen] Generating fallback outlines with beat expansion')
  
  // Priority 1: Use beats array from Film Treatment and expand to multiple scenes
  if (filmTreatmentVariant.beats && Array.isArray(filmTreatmentVariant.beats)) {
    const beats = filmTreatmentVariant.beats
    const scenesPerBeat = Math.ceil(sceneCount / beats.length)
    const fallbackScenes: any[] = []
    
    beats.forEach((beat: any, beatIdx: number) => {
      // Generate 3-7 scenes per beat
      for (let i = 0; i < scenesPerBeat; i++) {
        fallbackScenes.push({
          num: fallbackScenes.length + 1,
          beat: beat.title || beat.beat_title || `Beat ${beatIdx + 1}`,
          subBeat: `Part ${i + 1}`,
          heading: `SCENE ${fallbackScenes.length + 1}`,
          summary: `${beat.title || beat.intent} - Part ${i + 1}`,
          purpose: 'Advance story',
          duration: (beat.minutes || 1) * 60 / scenesPerBeat,
          transition: i === 0 ? 'CUT TO' : 'CONTINUOUS'
        })
      }
    })
    
    return fallbackScenes.slice(0, sceneCount)
  }
  
  // Priority 2: Try beatSheet if it's an array and expand
  if (Array.isArray(beatSheet)) {
    const scenesPerBeat = Math.ceil(sceneCount / beatSheet.length)
    const fallbackScenes: any[] = []
    
    beatSheet.forEach((beat: any, beatIdx: number) => {
      for (let i = 0; i < scenesPerBeat; i++) {
        fallbackScenes.push({
          num: fallbackScenes.length + 1,
          beat: beat.title || beat.beat_title || `Beat ${beatIdx + 1}`,
          subBeat: `Part ${i + 1}`,
          heading: `SCENE ${fallbackScenes.length + 1}`,
          summary: `${beat.title || beat.beat_title} - Part ${i + 1}`,
          purpose: 'Story progression',
          duration: (beat.minutes || perSceneDuration / 60) * 60 / scenesPerBeat,
          transition: i === 0 ? 'CUT TO' : 'CONTINUOUS'
        })
      }
    })
    
    return fallbackScenes.slice(0, sceneCount)
  }
  
  // Priority 3: Last resort - create generic outlines based on sceneCount with beat grouping
  return Array.from({ length: sceneCount }, (_, idx) => ({
    num: idx + 1,
    beat: `Beat ${Math.floor(idx / 5) + 1}`,
    subBeat: `Scene ${(idx % 5) + 1}`,
    heading: `SCENE ${idx + 1}`,
    summary: `Scene ${idx + 1} from ${filmTreatmentVariant.title || 'the story'}`,
    purpose: 'Story progression',
    duration: perSceneDuration,
    transition: 'CUT TO'
  }))
}

