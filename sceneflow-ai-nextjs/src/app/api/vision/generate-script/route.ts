import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body
    
    if (!projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'projectId is required' 
      }, { status: 400 })
    }

    // Check if client wants SSE progress updates
    const wantsSSE = request.headers.get('accept')?.includes('text/event-stream')
    
    if (wantsSSE) {
      // Return SSE stream with real-time progress
      return generateScriptWithProgress(projectId, body)
    }

    // Regular JSON response (fallback)
    const result = await generateScriptInternal(projectId, null)
    return NextResponse.json(result)
    
  } catch (error: any) {
    console.error('[Generate Script] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate script'
    }, { status: 500 })
  }
}

// SSE Streaming Response
async function generateScriptWithProgress(projectId: string, body: any) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      
      try {
        await generateScriptInternal(projectId, sendProgress)
        controller.close()
      } catch (error: any) {
        sendProgress({
          type: 'error',
          error: error.message || 'Generation failed'
        })
        controller.close()
      }
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

// Core generation logic (works with or without progress callback)
async function generateScriptInternal(projectId: string, sendProgress: ((data: any) => void) | null) {
  try {
    // Ensure database connection
    await sequelize.authenticate()

    // Load project to get Film Treatment variant data
    const project = await Project.findByPk(projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const filmTreatmentVariant = project.metadata?.filmTreatmentVariant
    if (!filmTreatmentVariant) {
      throw new Error('No Film Treatment variant found in project')
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
    
    // SINGLE-PASS: Generate complete script with all scenes fully written
    const perSceneDuration = Math.floor(targetDuration / sceneCount)
    const fullScriptPrompt = `You are an expert screenwriter. Generate a COMPLETE, PRODUCTION-READY script based on the approved film treatment.

STORY BIBLE (MUST FOLLOW):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${filmTreatmentVariant.title || 'Untitled'}
Logline: ${filmTreatmentVariant.logline || ''}
Genre: ${filmTreatmentVariant.genre || 'Documentary'}
Duration: ${targetDuration} seconds (${Math.floor(targetDuration / 60)} minutes)
Tone: ${toneDescription}
Visual Style: ${visualStyle}

Synopsis:
${filmTreatmentVariant.synopsis || 'Follow the treatment closely'}

BEAT STRUCTURE:
${Array.isArray(beatSheet) && beatSheet.length > 0 ? 
  beatSheet.map((b: any, i: number) => 
    `Beat ${i + 1}: "${b.title || b.beat_title}" (${b.minutes || 1} min)
  Intent: ${b.intent || b.synopsis || 'Advance the story'}`
  ).join('\n') 
  : 'No beats provided - create logical story progression'
}

CHARACTERS:
${characters.map((c: any) => `${c.name} (${c.role}): ${c.description || ''}`).join('\n') || 'Extract characters from story'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL REQUIREMENTS:
1. Generate a COMPLETE, CONTINUOUS script with ${sceneCount} scenes
2. Each scene must have: heading, action, dialogue, visual description
3. Stay 100% faithful to the logline, synopsis, and beat structure
4. Use ONLY the characters defined above
5. Write in industry-standard screenplay format
6. Ensure smooth transitions between scenes
7. Maintain consistent pacing aligned with beat structure
8. Create natural, character-appropriate dialogue
9. Each scene is ONE time + ONE location

SCREENPLAY FORMAT - Return ONLY valid JSON:
{
  "title": "${filmTreatmentVariant.title || 'Untitled'}",
  "logline": "${filmTreatmentVariant.logline || ''}",
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "action": "Detailed action description of what happens in this scene",
      "dialogue": [
        {"character": "CHARACTER_NAME", "line": "Their dialogue"},
        {"character": "CHARACTER_NAME", "line": "Response"}
      ],
      "visualDescription": "Specific camera angles, lighting, composition for image generation",
      "duration": ${perSceneDuration},
      "beat": "Beat title this scene belongs to",
      "purpose": "Why this scene exists",
      "transition": "CUT TO",
      "characters": ["CHARACTER_NAME"]
    }
    // ... all ${sceneCount} scenes in sequence
  ]
}

Generate COMPLETE scenes with full dialogue and action.`

    // BATCHED GENERATION: Split into batches to avoid MAX_TOKENS
    const SCENES_PER_BATCH = 12
    const batches = Math.ceil(sceneCount / SCENES_PER_BATCH)
    
    console.log(`[Script Gen] Generating ${sceneCount} scenes in ${batches} batch(es) of ~${SCENES_PER_BATCH} scenes`)
    
    const allScenes: any[] = []

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const startScene = batchIndex * SCENES_PER_BATCH + 1
      const endScene = Math.min((batchIndex + 1) * SCENES_PER_BATCH, sceneCount)
      const scenesInBatch = endScene - startScene + 1
      
      console.log(`[Script Gen] Batch ${batchIndex + 1}/${batches}: Generating scenes ${startScene}-${endScene}`)
      
      // Send progress: batch started
      if (sendProgress) {
        sendProgress({
          type: 'batch_start',
          batch: batchIndex + 1,
          totalBatches: batches,
          startScene,
          endScene,
          scenesInBatch,
          message: `Generating scenes ${startScene}-${endScene}...`
        })
      }
      
      // Build prompt with context from previous batch
      const previousScenesSummary = allScenes.length > 0
        ? `\n\nPREVIOUS SCENES (for continuity):\n${allScenes.slice(-5).map((s: any) => 
            `Scene ${s.sceneNumber}: ${s.heading} - ${s.action?.substring(0, 100)}...`
          ).join('\n')}`
        : ''
      
      // Determine which beats apply to this batch
      const batchBeats = beatSheet.filter((b: any, i: number) => {
        const beatStartScene = Math.floor((i / beatSheet.length) * sceneCount) + 1
        const beatEndScene = Math.floor(((i + 1) / beatSheet.length) * sceneCount)
        return beatStartScene <= endScene && beatEndScene >= startScene
      })
      
      const batchPrompt = `You are an expert screenwriter. Generate scenes ${startScene}-${endScene} of a ${sceneCount}-scene script.

STORY BIBLE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: ${filmTreatmentVariant.title}
Logline: ${filmTreatmentVariant.logline}
Genre: ${filmTreatmentVariant.genre}
Total Duration: ${targetDuration} seconds
Tone: ${toneDescription}

Synopsis: ${filmTreatmentVariant.synopsis}

BEATS FOR THIS BATCH:
${batchBeats.map((b: any) => `"${b.title}" - ${b.intent}`).join('\n')}

CHARACTERS:
${characters.map((c: any) => `${c.name} (${c.role}): ${c.description}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${previousScenesSummary}

Generate scenes ${startScene}-${endScene} (${scenesInBatch} scenes total).
${batchIndex === 0 ? 'This is the BEGINNING of the script.' : ''}
${batchIndex === batches - 1 ? 'This is the END of the script - provide satisfying conclusion.' : ''}
${batchIndex > 0 ? 'Maintain continuity with previous scenes listed above.' : ''}

Return ONLY valid JSON:
{
  "scenes": [
    {
      "sceneNumber": ${startScene},
      "heading": "INT. LOCATION - TIME",
      "action": "Detailed action...",
      "dialogue": [{"character": "NAME", "line": "..."}],
      "visualDescription": "Camera, lighting...",
      "duration": ${Math.floor(targetDuration / sceneCount)},
      "beat": "Beat name",
      "purpose": "Scene purpose",
      "transition": "CUT TO",
      "characters": ["NAME"]
    }
    // ... scenes ${startScene} through ${endScene}
  ]
}

Generate COMPLETE scenes with full dialogue and action.`

      try {
        const batchScript = await callGeminiWithRetry(apiKey, batchPrompt, 16000, 2)
        const parsedBatch = JSON.parse(batchScript)
        
        if (parsedBatch.scenes && Array.isArray(parsedBatch.scenes)) {
          allScenes.push(...parsedBatch.scenes)
          console.log(`[Script Gen] Batch ${batchIndex + 1} complete: ${parsedBatch.scenes.length} scenes`)
        } else {
          throw new Error('Batch does not contain scenes array')
        }
      } catch (error) {
        console.error(`[Script Gen] Batch ${batchIndex + 1} failed:`, error)
        // Generate fallback for this batch
        const fallbackScenes = generateFallbackOutlines(
          beatSheet, 
          scenesInBatch, 
          filmTreatmentVariant, 
          Math.floor(targetDuration / sceneCount)
        ).map((s: any, idx: number) => ({
          ...s,
          sceneNumber: startScene + idx,
          isExpanded: true
        }))
        allScenes.push(...fallbackScenes)
      }
      
      // Send progress: batch completed
      if (sendProgress) {
        const progress = Math.floor((allScenes.length / sceneCount) * 100)
        sendProgress({
          type: 'batch_complete',
          batch: batchIndex + 1,
          totalBatches: batches,
          scenesCompleted: allScenes.length,
          totalScenes: sceneCount,
          progress,
          message: `${allScenes.length}/${sceneCount} scenes completed`
        })
      }
    }

    console.log(`[Script Gen] All batches complete: ${allScenes.length} total scenes`)

    // Convert full scenes to scene objects with dialogue and action (already expanded)
    const outlineScenes = allScenes.map((scene: any, idx: number) => ({
      sceneNumber: idx + 1,
      beat: scene.beat || 'Unknown Beat',
      heading: scene.heading || `SCENE ${idx + 1}`,
      action: scene.action || scene.summary || 'Scene content',
      dialogue: Array.isArray(scene.dialogue) ? scene.dialogue : [],
      visualDescription: scene.visualDescription || scene.action || 'Cinematic shot',
      purpose: scene.purpose || 'Advance story',
      duration: scene.duration || Math.floor(targetDuration / sceneCount),
      transition: scene.transition || 'CUT TO',
      characters: Array.isArray(scene.characters) ? scene.characters : [],
      isExpanded: true, // Already fully generated with dialogue and action
      // Preserve summary for reference
      _outline: { summary: scene.action?.substring(0, 150) || scene.heading }
    }))

    console.log(`[Script Gen] Returning ${outlineScenes.length} fully expanded scenes with dialogue`)

    // Extract characters from scenes if not provided by variant
    const extractedCharacters = characters.length > 0 ? characters : extractCharactersFromScenes(outlineScenes)
    
    console.log('[Script Gen] Character extraction:', {
      fromVariant: characters.length,
      extracted: extractedCharacters.length,
      finalCount: extractedCharacters.length
    })
    
    // Combine into final script structure (fully expanded scenes with dialogue)
    const scriptData = {
      title: filmTreatmentVariant.title || 'Untitled',
      logline: filmTreatmentVariant.logline || '',
      script: {
        scenes: outlineScenes
      },
      characters: extractedCharacters,
      totalDuration: outlineScenes.reduce((sum: number, scene: any) => sum + (scene.duration || 0), 0),
      // Store context for reference and potential regeneration
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

    // Send final progress: generation complete
    if (sendProgress) {
      sendProgress({
        type: 'complete',
        script: scriptData
      })
    }

    // Return data (for non-SSE mode)
    return {
      success: true,
      script: scriptData
    }
  } catch (error: any) {
    console.error('[Generate Script Internal] Error:', error)
    throw error
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

// Normalize character names for deduplication
function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Remove voice-over indicators: (V.O.), (O.S.), (O.C.), (CONT'D)
  let normalized = name.replace(/\s*\([^)]*\)\s*/g, '').trim()
  
  // Convert to uppercase for case-insensitive comparison
  normalized = normalized.toUpperCase()
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ')
  
  return normalized
}

// Helper: Extract unique characters from scenes
function extractCharactersFromScenes(scenes: any[]): any[] {
  const charMap = new Map()
  
  scenes.forEach(scene => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      
      const normalizedName = normalizeCharacterName(d.character)
      
      if (!charMap.has(normalizedName)) {
        const cleanName = d.character.replace(/\s*\([^)]*\)\s*/g, '').trim()
        
        charMap.set(normalizedName, {
          name: cleanName,
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

