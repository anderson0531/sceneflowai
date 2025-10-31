import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { v4 as uuidv4 } from 'uuid'
import { toCanonicalName, generateAliases } from '@/lib/character/canonical'

export const runtime = 'nodejs'
export const maxDuration = 300  // 5 minutes for large script generation (requires Vercel Pro)

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { projectId } = await request.json()
        
        if (!projectId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'projectId required' 
          })}\n\n`))
          controller.close()
          return
        }

        await sequelize.authenticate()
        const project = await Project.findByPk(projectId)
        
        if (!project) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'Project not found' 
          })}\n\n`))
          controller.close()
          return
        }

        const treatment = project.metadata?.filmTreatmentVariant
        if (!treatment) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'No film treatment found' 
          })}\n\n`))
          controller.close()
          return
        }

        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'API key not configured' 
          })}\n\n`))
          controller.close()
          return
        }

        // Calculate scene targets
        const duration = project.duration || 300
        const minScenes = Math.floor(duration / 90)
        const maxScenes = Math.floor(duration / 20)
        const suggestedScenes = Math.ceil(duration / 53)
        
        console.log(`[Script Gen V2] Target: ${duration}s - Scene range: ${minScenes}-${maxScenes} (suggested: ${suggestedScenes})`)

        // Load existing characters - defer alias generation for memory optimization
        let existingCharacters = (project.metadata?.visionPhase?.characters || []).map((c: any) => ({
          ...c,
          id: c.id || uuidv4(),
          name: toCanonicalName(c.name || c.displayName || '') // Normalize to canonical format
        }))
    
        if (existingCharacters.length === 0 && treatment.character_descriptions) {
          existingCharacters = treatment.character_descriptions.map((c: any) => ({
            ...c,
            id: c.id || uuidv4(),
            name: toCanonicalName(c.name || ''), // Normalize to canonical format
            version: 1,
            lastModified: new Date().toISOString(),
            referenceImage: c.referenceImage || null,
            generating: false,
          }))
          
          await project.update({
            metadata: {
              ...project.metadata,
              visionPhase: {
                ...(project.metadata?.visionPhase || {}),
                characters: existingCharacters,
              }
            }
          })
          
          console.log(`[Script Gen V2] Auto-synced ${existingCharacters.length} characters from Film Treatment`)
        }

        // Calculate dynamic batch size based on remaining scenes
        const calculateBatchSize = (remaining: number): number => {
          if (remaining <= 10) return remaining
          if (remaining <= 30) return Math.min(10, remaining)
          return Math.min(10, remaining) // Max 10 for all batches
        }
        
        const INITIAL_BATCH_SIZE = Math.min(10, suggestedScenes)
        const MAX_BATCH_RETRIES = 3
        let actualTotalScenes = suggestedScenes
        let allScenes: any[] = []

        // BATCH 1: Generate first batch
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: 'Generating first batch of scenes...',
          batch: 1,
          scenesGenerated: 0,
          totalScenes: suggestedScenes
        })}\n\n`))

        console.log(`[Script Gen V2] Batch 1: Generating first ${INITIAL_BATCH_SIZE} scenes...`)
        
        const batch1Prompt = buildBatch1Prompt(treatment, 1, INITIAL_BATCH_SIZE, minScenes, maxScenes, suggestedScenes, duration, [], existingCharacters)
        let batch1Response = await callGemini(apiKey, batch1Prompt)
        let batch1Data = parseBatch1(batch1Response, 1, INITIAL_BATCH_SIZE)
        
        // Release memory immediately after parsing
        batch1Response = ''
        
        if (batch1Data.totalScenes && batch1Data.totalScenes >= minScenes && batch1Data.totalScenes <= maxScenes) {
          actualTotalScenes = batch1Data.totalScenes
          console.log(`[Script Gen V2] AI determined ${actualTotalScenes} total scenes`)
          
          const deviation = Math.abs(actualTotalScenes - suggestedScenes)
          if (deviation > suggestedScenes * 0.3) {
            console.warn(`[Script Gen V2] AI chose ${actualTotalScenes}, but suggested is ${suggestedScenes}. Overriding.`)
            actualTotalScenes = suggestedScenes
          }
        }
        
        allScenes.push(...batch1Data.scenes)
        console.log(`[Script Gen V2] Batch 1 complete: ${batch1Data.scenes.length} scenes`)
        
        // Release batch1Data reference
        batch1Data = null
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          status: `Generated ${allScenes.length} scenes...`,
          batch: 1,
          scenesGenerated: allScenes.length,
          totalScenes: actualTotalScenes
        })}\n\n`))
    
        // MULTI-BATCH: Generate remaining scenes with retry logic
        let remainingScenes = actualTotalScenes - allScenes.length
        let batchNumber = 2
        let batchRetries = 0
        let totalPrevDuration = allScenes.reduce((sum, s) => sum + (s.duration || 0), 0)
        
        while (remainingScenes > 0) {
          const batchSize = calculateBatchSize(remainingScenes)
          const startScene = allScenes.length + 1
          const endScene = startScene + batchSize - 1
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            status: `Generating scenes ${startScene}-${endScene}...`,
            batch: batchNumber,
            scenesGenerated: allScenes.length,
            totalScenes: actualTotalScenes
          })}\n\n`))
          
          console.log(`[Script Gen V2] Batch ${batchNumber}: Generating scenes ${startScene}-${endScene}...`)
          
          try {
            // Create lightweight scene summary for prompt (keep last 3 only)
            const prevScenesForPrompt = allScenes.slice(-3)
            const batchPrompt = buildBatch2Prompt(treatment, startScene, actualTotalScenes, duration, prevScenesForPrompt, allScenes.length, totalPrevDuration, existingCharacters)
            let batchResponse = await callGemini(apiKey, batchPrompt)
            let batchData = parseScenes(batchResponse, startScene, endScene)
            
            // Release memory immediately after parsing
            batchResponse = ''
            
            // Log memory usage in development
            if (process.env.NODE_ENV === 'development') {
              const memUsage = process.memoryUsage()
              console.log(`[Memory] Batch ${batchNumber}: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used, ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB total`)
            }
            
            // Check if batch actually generated scenes
            if (batchData.scenes.length === 0) {
              batchRetries++
              console.warn(`[Script Gen V2] Batch ${batchNumber} generated 0 scenes (retry ${batchRetries}/${MAX_BATCH_RETRIES})`)
              
              if (batchRetries >= MAX_BATCH_RETRIES) {
                console.error(`[Script Gen V2] Max retries reached for batch ${batchNumber}, stopping generation`)
                // Send warning event
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'warning',
                  message: `Failed to generate remaining scenes after ${MAX_BATCH_RETRIES} attempts. Generated ${allScenes.length} of ${actualTotalScenes} scenes.`
                })}\n\n`))
                break
              }
              continue // Retry same batch
            }
            
            // Success - reset retry counter and add scenes
            batchRetries = 0
            allScenes.push(...batchData.scenes)
            
            // Update total duration
            totalPrevDuration += batchData.scenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
            
            // Monitor dialogue verbosity
            const avgDialogueLength = batchData.scenes.reduce((sum: number, s: any) => {
              const dialogueChars = s.dialogue?.reduce((dSum: number, d: any) => 
                dSum + (d.line?.length || 0), 0) || 0
              return sum + dialogueChars
            }, 0) / batchData.scenes.length
            
            console.log(`[Script Gen V2] Batch ${batchNumber} complete: ${batchData.scenes.length} scenes (total: ${allScenes.length}), avg dialogue: ${Math.round(avgDialogueLength)} chars`)
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status: `Generated ${allScenes.length} of ${actualTotalScenes} scenes...`,
              batch: batchNumber,
              scenesGenerated: allScenes.length,
              totalScenes: actualTotalScenes
            })}\n\n`))
            
            // Release batch data to free memory
            batchData = null
            
            // Force garbage collection if available and allow GC to run
            if (global.gc) {
              global.gc()
            }
            await new Promise(resolve => setTimeout(resolve, 100))
            
            remainingScenes = actualTotalScenes - allScenes.length
            batchNumber++
            
          } catch (error: any) {
            batchRetries++
            console.error(`[Script Gen V2] Batch ${batchNumber} error (retry ${batchRetries}/${MAX_BATCH_RETRIES}):`, error.message)
            
            if (batchRetries >= MAX_BATCH_RETRIES) {
              console.error(`[Script Gen V2] Max retries reached, stopping generation`)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'warning',
                message: `Failed to generate remaining scenes. Generated ${allScenes.length} of ${actualTotalScenes} scenes.`
              })}\n\n`))
              break
            }
          }
          
          // Safety: Prevent infinite loop
          if (batchNumber > 10) {
            console.error(`[Script Gen V2] Too many batches (${batchNumber}), stopping generation`)
            break
          }
        }
    
        // Process characters and embed IDs (existing logic)
        const dialogueChars = extractCharacters(allScenes)
        const existingCharNamesNormalized = existingCharacters.map((c: any) => 
          normalizeCharacterName(c.name || '')
        )
        const newChars = dialogueChars.filter((c: any) => 
          !existingCharNamesNormalized.includes(normalizeCharacterName(c.name || ''))
        )
        
        const allCharacters = [
          ...existingCharacters,
          ...newChars.map((c: any) => ({
            ...c,
            id: uuidv4(),
            name: toCanonicalName(c.name || ''), // Normalize to canonical format
            role: c.role || 'supporting',
            imagePrompt: `Professional character portrait: ${c.name}, ${c.description}, photorealistic, high detail, studio lighting, neutral background, character design, 8K quality`,
            referenceImage: null,
            generating: false
          }))
        ]

        // Character name validation is now handled during embedding step (below)
        // Removing separate validation to reduce memory overhead

        // Embed characterId in dialogue using canonical matching (with memory optimization)
        // Cache aliases per character to avoid regenerating repeatedly
        const aliasCache = new Map<string, string[]>()
        const getCachedAliases = (canonicalName: string): string[] => {
          if (!aliasCache.has(canonicalName)) {
            aliasCache.set(canonicalName, generateAliases(canonicalName))
          }
          return aliasCache.get(canonicalName)!
        }
        
        const scenesWithCharacterIds = allScenes.map((scene: any) => ({
          ...scene,
          dialogue: scene.dialogue?.map((d: any) => {
            if (!d.character) return d
            
            const normalizedDialogueName = toCanonicalName(d.character)
            
            // Try exact match first
            let character = allCharacters.find((c: any) => 
              toCanonicalName(c.name) === normalizedDialogueName
            )
            
            // Fallback: Use cached aliases for matching
            if (!character) {
              character = allCharacters.find((c: any) => {
                const aliases = getCachedAliases(toCanonicalName(c.name))
                return aliases.some(alias => 
                  toCanonicalName(alias) === normalizedDialogueName
                )
              })
            }
            
            return {
              ...d,
              character: character ? character.name : d.character,
              characterId: character?.id
            }
          })
        }))
        
        // Clear cache to free memory
        aliasCache.clear()

        const totalEstimatedDuration = allScenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
        
        const script = {
          title: treatment.title,
          logline: treatment.logline,
          script: { scenes: scenesWithCharacterIds },
          characters: allCharacters,
          totalDuration: totalEstimatedDuration
        }

        // Save to project
        const existingVisionPhase = project.metadata?.visionPhase || {}
        await project.update({
          metadata: {
            ...project.metadata,
            visionPhase: {
              ...existingVisionPhase,
              script,
              scriptGenerated: true,
              characters: allCharacters,
              scenes: scenesWithCharacterIds
            }
          }
        })

        // Send completion with partial status
        const isPartial = allScenes.length < actualTotalScenes
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          totalScenes: allScenes.length,
          totalDuration: totalEstimatedDuration,
          partial: isPartial,
          expectedScenes: actualTotalScenes,
          projectId: projectId
        })}\n\n`))
        
        controller.close()
        
      } catch (error: any) {
        console.error('[Script Gen V2] Error:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

function buildBatch1Prompt(treatment: any, start: number, end: number, min: number, max: number, suggested: number, targetDuration: number, prev: any[], characters: any[]) {
  // Build character list from Film Treatment
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => 
        `${c.name} (${c.role || 'character'}): ${c.description || ''}
        ${c.appearance ? `Appearance: ${c.appearance}` : ''}
        ${c.demeanor ? `Demeanor: ${c.demeanor}` : ''}
        ${c.clothing ? `Clothing: ${c.clothing}` : ''}`
      ).join('\n\n')}`
    : ''

  return `Generate the FIRST ${end} scenes of a script targeting ${targetDuration} seconds total.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
Genre: ${treatment.genre}
Tone: ${treatment.tone}
${characterList}

CRITICAL CHARACTER RULES:
- The character list below defines the ONLY approved characters
- Character names are formatted in Title Case (e.g., "Brian Anderson Sr", "Dr. Sarah Martinez")
- Use EXACT names in dialogue - NO variations, abbreviations, or nicknames
- "Brian Anderson Sr" ≠ "Brian" ≠ "BRIAN" ≠ "Anderson"
- Match names character-for-character (case-insensitive acceptable in JSON, but use Title Case)
- DO NOT invent new characters unless absolutely necessary (minor roles: waiter, passerby with 1 line)

CRITICAL DIALOGUE RULES:
- Use ONLY the EXACT character names from the list above
- Character names in dialogue MUST match exactly: use the full canonical name
- NO abbreviations or short forms ("Brian Anderson Sr" never becomes "Brian")
- Character names in the "character" field must be identical to the character list
- Example: If character is "Brian Anderson Sr", dialogue MUST use "Brian Anderson Sr" exactly

DIALOGUE INFLECTION AND EMOTION (CRITICAL FOR TTS):
- Add emotion/inflection tags in brackets BEFORE the dialogue text
- Common tags: [excitedly], [whispering], [sadly], [thoughtfully], [angrily], [nervously], [cheerfully], [urgently]
- Use SSML pause tags: <break time="1.0s" /> (seconds) or <break time="500ms" /> (milliseconds)
- Use ellipses (...) for hesitation
- Use dashes (—) for interruptions
- Capitalize for EMPHASIS
- CRITICAL: The "line" field contains ONLY dialogue text + emotion tags, NOT the character name
- Example: {"character": "BRIAN ANDERSON SR", "line": "[excitedly] I can't believe it!"}

SCENE PLANNING:
- Total target: ${targetDuration}s (±10% is fine)
- REQUIRED total scenes: ${suggested} scenes (you MUST use ${suggested}, can adjust ±2 if absolutely necessary for story flow)
- Generate first ${end} scenes now

DURATION ESTIMATION (CRITICAL):
Calculate REALISTIC duration using this verified formula:

1. Count TOTAL words (narration + all dialogue combined)
2. Speech time: (total_words / 150) * 60 seconds (150 WPM for all speech)
3. Buffer time based on scene complexity:
   - Simple scenes (action < 100 chars): +2s
   - Medium scenes (action 100-200 chars): +3s
   - Complex scenes (action 200-300 chars): +4s
   - Very complex (action > 300 chars): +5s
4. Video clip overhead: Math.ceil((speech_time + buffer) / 8) * 0.5s
5. Round up to nearest multiple of 8 (for 8-second video clips)

Formula:
  speech_duration = (total_words / 150) * 60
  required_duration = speech_duration + buffer
  video_clips = Math.ceil(required_duration / 8)
  scene_duration = Math.ceil((speech_duration + buffer + (video_clips * 0.5)) / 8) * 8

Examples (showing total word count):
- 75 words, simple: (75/150*60) + 2 + (7*0.5) = 30 + 2 + 3.5 = 40s (rounded to 40s)
- 150 words, medium: (150/150*60) + 3 + (8*0.5) = 60 + 3 + 4 = 72s (rounded to 72s)
- 300 words, complex: (300/150*60) + 4 + (16*0.5) = 120 + 4 + 8 = 136s (rounded to 136s)

CRITICAL: Use TOTAL word count from narration + dialogue. Base buffer on action description length.

Return JSON:
{
  "totalScenes": ${suggested},  // REQUIRED: Use ${suggested} scenes (±2 max) for ${targetDuration}s story
  "estimatedTotalDuration": 300,  // Sum of first ${end} scenes only
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "characters": ["Character Name 1", "Character Name 2"],  // CRITICAL: List all characters in this scene
      "action": "SOUND of gentle sizzling, a timer beeps. CLOSE UP on character's hands. They move across the room.\n\nSFX: Gentle sizzling, timer beeps\n\nMusic: Soft upbeat piano",
      "narration": "In the quiet hours before dawn, a dream takes shape in flour and fire.",  // NEW: Captivating voiceover narration
      "dialogue": [{"character": "NAME", "line": "..."}],
      "visualDescription": "Camera, lighting",
      "duration": 25,  // REALISTIC based on content (dialogue count + action time)
      "sfx": [{"time": 0, "description": "Gentle sizzling, timer beeps"}],
      "music": {"description": "Soft upbeat piano"}
    }
  ]
}

NARRATION REQUIREMENTS (CRITICAL):
- Each scene MUST include a "narration" field with captivating voiceover narration (1-2 sentences)
- Use vivid, evocative language that engages the audience emotionally
- Focus on: internal thoughts/emotions, thematic significance, foreshadowing, poetic atmosphere
- DO NOT: repeat action description, use technical camera language, state obvious visuals, be generic
- Examples:
  ✓ GOOD: "In the dim glow of his monitor, Brian races against time. Each keystroke brings him closer to his dream—or his breaking point."
  ✓ GOOD: "She had learned that silence could be louder than words, and tonight, it was deafening."
  ✗ BAD: "Brian types on his computer." (Too literal)
  ✗ BAD: "The scene takes place in an office." (States the obvious)

SCRIPT FORMAT REQUIREMENTS (CRITICAL):
- Include sound effects naturally in action description using SOUND OF, HEAR, etc.
- After the main action, add separate labeled lines for audio:
  * "SFX: [description of sound effects]" on its own line
  * "Music: [description of background music]" on its own line
- Keep audio descriptions concise and specific
- Example action format:
  "SOUND of gentle sizzling, a timer beeps. CLOSE UP on Mint's hands, deftly shaping dough, dusting flour.
  
  SFX: Gentle sizzling, timer beeps
  
  Music: Soft upbeat piano"

AUDIO FIELD REQUIREMENTS:
- sfx: Also store as array with timing for playback synchronization
- music: Also store as object for advanced features
- Keep descriptions short (e.g., "car horn", "glass breaking", "suspenseful strings")

CRITICAL:
1. Determine total scene count that best fits ${targetDuration}s story
2. Estimate accurate durations (don't use arbitrary numbers)
3. Quality writing over exact duration matching
4. MUST include "characters" array in EVERY scene - list all characters who appear (speaking or non-speaking)

Generate first ${end} scenes with realistic durations.`
}

function buildBatch2Prompt(treatment: any, start: number, total: number, targetDuration: number, prevScenes: any[], totalPrevScenes: number, prevDuration: number, characters: any[]) {
  const remaining = total - totalPrevScenes
  const remainingDuration = targetDuration - prevDuration
  const avgNeeded = Math.floor(remainingDuration / remaining)
  
  const characterList = characters.length > 0
    ? `\n\nDEFINED CHARACTERS (USE ONLY THESE):\n${characters.map((c: any) => `${c.name} (${c.role || 'character'}): ${c.description || ''}`).join('\n')}`
    : ''
  
  return `Generate scenes ${start}-${total} (final ${remaining} scenes) of a ${total}-scene script.

TREATMENT:
Title: ${treatment.title}
Logline: ${treatment.logline}
Synopsis: ${treatment.synopsis || treatment.content}
${characterList}

CRITICAL CHARACTER RULES:
- Use ONLY these approved characters: ${characters.map((c: any) => c.name).join(', ')}
- Names are in Title Case - use them EXACTLY
- NO abbreviations: "Brian Anderson Sr" not "Brian"
- Match character names exactly as listed in the character list
- DO NOT invent new dialogue speakers

CRITICAL DIALOGUE: Use EXACT character names in the "character" field - do NOT include them in the "line" field.
ADD EMOTION TAGS: Start each "line" with [emotion] tags and use <break time="Xs" /> pauses for expressive TTS.

PREVIOUS SCENES (${prevScenes.length} so far, ${prevDuration}s total):
${prevScenes.slice(-3).map((s: any) => `${s.sceneNumber}. ${s.heading} (${s.duration}s): ${s.action.substring(0, 80)}...`).join('\n')}

DURATION TARGET:
- Remaining: ~${remainingDuration}s for ${remaining} scenes
- Average needed: ~${avgNeeded}s per scene (flexible guidance)
- Estimate realistically based on actual content
- Total target: ${targetDuration}s (±10%)

DURATION ESTIMATION (CRITICAL):
Use this verified formula matching production calculations:

1. Count TOTAL words (narration + all dialogue)
2. Speech: (total_words / 150) * 60 seconds (150 WPM)
3. Buffer: 2-5s based on action description length
4. Video clips: Math.ceil((speech + buffer) / 8) * 0.5s
5. Round to nearest 8 (for 8-second clips)

Formula: Math.ceil((speech_duration + buffer + (video_clips * 0.5)) / 8) * 8

Base estimates on TOTAL word count, not separate narration/dialogue rates.

Return JSON array:
[
  {
    "sceneNumber": ${start},
    "heading": "INT. LOCATION - TIME",
    "characters": ["Character Name 1", "Character Name 2"],  // CRITICAL: List all characters in this scene
    "action": "SOUND of footsteps approaching. Character enters.\n\nSFX: Footsteps on hardwood\n\nMusic: Suspenseful strings",
    "narration": "Every step echoes with the weight of decisions unmade.",  // CRITICAL: Captivating voiceover
    "dialogue": [{"character": "NAME", "line": "..."}],
    "visualDescription": "Camera, lighting",
    "duration": 45,  // REALISTIC estimate
    "sfx": [{"time": 0, "description": "Footsteps on hardwood"}],
    "music": {"description": "Suspenseful strings"}
  }
]

NARRATION REQUIREMENTS (CRITICAL):
- MUST include captivating "narration" field in EVERY scene (1-2 sentences)
- Write engaging, emotionally resonant voiceover narration
- Focus on storytelling, not technical description

SCRIPT FORMAT REQUIREMENTS (CRITICAL):
- Include sound effects naturally in action using SOUND OF, HEAR, etc.
- Add separate "SFX: [description]" line after main action
- Add separate "Music: [description]" line for background music
- Keep audio descriptions concise

FOCUS ON:
1. Quality, engaging writing
2. Natural dialogue
3. Realistic duration estimates
4. Smooth conclusion to story
5. MUST include "characters" array in EVERY scene - list all characters who appear

Complete the script with accurate duration estimates.`
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  return text
}

function sanitizeJsonString(jsonStr: string): string {
  // Remove markdown code fences
  let cleaned = jsonStr.replace(/```json\n?|```/g, '').trim()
  
  // First attempt: try to parse as-is (FAST PATH)
  try {
    JSON.parse(cleaned)
    return cleaned  // Success - return immediately without heavy processing
  } catch (firstError: any) {
    // Only proceed with heavy sanitization if parse failed
    console.warn('[Sanitize] Initial parse failed, applying fixes:', firstError.message.substring(0, 100))
  }
  
  // SLOW PATH: Only run if needed
  try {
    // CRITICAL: Remove control chars from ENTIRE response first
    // This handles control chars in property names, not just string values
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ')
    
    // Now do proper escaping for any control chars in string values
    cleaned = cleaned.replace(
      /"([^"\\]|\\.)*"/g,  // Match complete strings
      (match) => {
        // Escape common control sequences within strings
        return match.replace(/([\\])/g, '\\\\')  // Escape backslashes first
      }
    )
    
    // Remove trailing commas first (lightweight fix)
    cleaned = cleaned
      .replace(/,\s*([}\]])/g, '$1')
      .trim()
    
    // Try again after lightweight fixes
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // Check if response looks truncated (ends mid-structure)
    const endsWithComma = /,\s*$/.test(cleaned)
    const endsWithColon = /:\s*$/.test(cleaned)
    const endsWithOpenBrace = /[{\[]\s*$/.test(cleaned)

    if (endsWithComma || endsWithColon || endsWithOpenBrace) {
      console.warn('[Sanitize] Response appears truncated, removing incomplete structure')
      // Remove the incomplete trailing structure
      cleaned = cleaned.replace(/,\s*$/, '')
      cleaned = cleaned.replace(/:\s*$/, ': ""')
      cleaned = cleaned.replace(/[{\[]\s*$/, '')
      
      // IMMEDIATELY balance braces/brackets after truncation
      const openBraces = (cleaned.match(/{/g) || []).length
      const closeBraces = (cleaned.match(/}/g) || []).length
      const openBrackets = (cleaned.match(/\[/g) || []).length
      const closeBrackets = (cleaned.match(/\]/g) || []).length
      
      if (openBraces > closeBraces) cleaned += '}'.repeat(openBraces - closeBraces)
      if (openBrackets > closeBrackets) cleaned += ']'.repeat(openBrackets - closeBrackets)
    }
    
    // Try again after truncation fix
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // Handle unterminated strings (common with truncated responses)
    const lastQuoteIndex = cleaned.lastIndexOf('"')
    const hasUnclosedString = lastQuoteIndex !== -1 && (cleaned.match(/"/g) || []).length % 2 !== 0

    if (hasUnclosedString) {
      // Find the last properly closed structure before the unterminated string
      let truncateAt = lastQuoteIndex
      
      // Look backwards for the last comma or opening brace before this quote
      for (let i = lastQuoteIndex - 1; i >= 0; i--) {
        if (cleaned[i] === ',' || cleaned[i] === '{' || cleaned[i] === '[') {
          truncateAt = i
          break
        }
      }
      
      // Truncate at that point
      cleaned = cleaned.substring(0, truncateAt)
      console.warn('[Sanitize] Truncated unterminated string at position', lastQuoteIndex)
      
      // Immediately balance braces/brackets after truncation
      const openBraces = (cleaned.match(/{/g) || []).length
      const closeBraces = (cleaned.match(/}/g) || []).length
      const openBrackets = (cleaned.match(/\[/g) || []).length
      const closeBrackets = (cleaned.match(/\]/g) || []).length
      
      if (openBraces > closeBraces) cleaned += '}'.repeat(openBraces - closeBraces)
      if (openBrackets > closeBrackets) cleaned += ']'.repeat(openBrackets - closeBrackets)
    }
    
    // Try again after unterminated string fix
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // Fix unescaped newlines in strings (lightweight, targeted approach)
    // This regex is much simpler and won't cause memory issues
    cleaned = cleaned.replace(/"([^"]*?)(\r?\n)([^"]*?)"/g, (match, before, newline, after) => {
      // Only process if this looks like an error (newline in middle of string content)
      if (before && after) {
        return `"${before}\\n${after}"`
      }
      return match
    })
    
    // Try again after newline fix
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {}
    
    // HEAVY FIX: Only if lightweight fixes didn't work
    // Process control characters in strings
    cleaned = cleaned.replace(
      /"((?:[^"\\]|\\.){0,5000})"/g,  // Add length limit to prevent catastrophic backtracking
      (match, stringContent) => {
        if (stringContent.length > 5000) {
          // Truncate extremely long strings to prevent memory issues
          stringContent = stringContent.substring(0, 5000) + '...'
        }
        
        const fixed = stringContent
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, (char: string) => {
            const code = char.charCodeAt(0)
            if (code === 9) return '\\t'
            if (code === 10) return '\\n'
            if (code === 13) return '\\r'
            return ' '
          })
        
        return `"${fixed}"`
      }
    )
    
    // Balance braces/brackets
    const openBraces = (cleaned.match(/{/g) || []).length
    const closeBraces = (cleaned.match(/}/g) || []).length
    const openBrackets = (cleaned.match(/\[/g) || []).length
    const closeBrackets = (cleaned.match(/\]/g) || []).length
    
    if (openBraces > closeBraces) cleaned += '}'.repeat(openBraces - closeBraces)
    if (openBrackets > closeBrackets) cleaned += ']'.repeat(openBrackets - closeBrackets)
    
    JSON.parse(cleaned)
    return cleaned
    
  } catch (secondError: any) {
    console.error('[Sanitize] Failed after all attempts')
    throw secondError
  }
}

/**
 * Detects and extracts SFX entries that were incorrectly placed in dialogue array
 * 
 * Detection criteria:
 * - Entire line wrapped in parentheses: (text)
 * - Contains sound-related keywords
 * - Does NOT contain conversational dialogue patterns
 */
function extractSFXFromDialogue(scene: any): any {
  if (!scene.dialogue || !Array.isArray(scene.dialogue) || scene.dialogue.length === 0) {
    return scene
  }
  
  // Keywords that indicate sound effects (not dialogue)
  const sfxKeywords = [
    'HUM', 'SOUND', 'NOISE', 'BEEP', 'BUZZ', 'CLICK', 'RING', 'BANG', 
    'CRASH', 'THUD', 'WHOOSH', 'RUSTLE', 'CREAK', 'SLAM', 'WHISTLE', 
    'ECHO', 'RUMBLE', 'DISTANT', 'APPROACHING', 'FADING', 'HISSING',
    'DRIPPING', 'SCRAPING', 'FOOTSTEPS', 'KNOCKING', 'TAPPING'
  ]
  
  const extractedSFX: Array<{time: number, description: string}> = []
  const cleanedDialogue: Array<any> = []
  
  scene.dialogue.forEach((d: any) => {
    const line = (d.line || '').trim()
    
    // Check 1: Is the entire line wrapped in parentheses?
    const isWrappedInParens = /^\(.*\)$/.test(line)
    
    if (!isWrappedInParens) {
      // Not wrapped in parens -> keep as dialogue
      cleanedDialogue.push(d)
      return
    }
    
    // Check 2: Contains SFX keywords?
    const upperLine = line.toUpperCase()
    const containsSFXKeyword = sfxKeywords.some(keyword => upperLine.includes(keyword))
    
    // Check 3: Does NOT look like actual dialogue
    const hasQuotationMarks = line.includes('"') || line.includes("'")
    const hasConversationalWords = /\b(I|you|we|they|my|your|our|their|yes|no|okay|please|thank|sorry|hello|hi|hey|what|when|where|why|how)\b/i.test(line)
    
    // If it's wrapped in parens, has SFX keywords, and doesn't look like dialogue -> it's SFX
    if (containsSFXKeyword && !hasQuotationMarks && !hasConversationalWords) {
      const description = line.replace(/^\(|\)$/g, '').trim()
      extractedSFX.push({
        time: 0,  // Default to start of scene
        description
      })
      console.log(`[SFX Extraction] Moved from dialogue (${d.character}) to SFX: "${description}"`)
    } else {
      // Keep as dialogue
      cleanedDialogue.push(d)
    }
  })
  
  // Only update if we actually extracted something
  if (extractedSFX.length > 0) {
    return {
      ...scene,
      dialogue: cleanedDialogue,
      sfx: [...(scene.sfx || []), ...extractedSFX]
    }
  }
  
  return scene
}

function parseBatch1(response: string, start: number, end: number): any {
  try {
    const cleaned = sanitizeJsonString(response)
    const parsed = JSON.parse(cleaned)
    
    // Batch 1 returns object with totalScenes and scenes
        return {
          totalScenes: parsed.totalScenes || null,
          estimatedTotalDuration: parsed.estimatedTotalDuration || 0,
          scenes: (parsed.scenes || []).map((s: any, idx: number) => {
            const scene = {
              sceneNumber: start + idx,
              heading: s.heading || `SCENE ${start + idx}`,
              action: s.action || 'Scene content',
              narration: s.narration || '',  // NEW: Preserve captivating narration
              dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
              visualDescription: s.visualDescription || s.action || 'Cinematic shot',
              duration: s.duration || 30,  // Use AI's realistic estimate
              sfx: Array.isArray(s.sfx) ? s.sfx.map((sfx: any) => ({
                time: sfx.time || 0,
                description: sfx.description || ''
              })) : [],
              music: s.music ? {
                description: s.music.description || '',
                duration: s.music.duration
              } : undefined,
              isExpanded: true
            }
            
            // Extract SFX from dialogue (post-processing fix)
            return extractSFXFromDialogue(scene)
          })
        }
  } catch (error) {
    console.error('[Parse Batch 1] Error:', error)
    // Fallback
    return {
      totalScenes: null,
      estimatedTotalDuration: 0,
      scenes: []
    }
  }
}

function parseScenes(response: string, start: number, end: number): any {
  try {
    const cleaned = sanitizeJsonString(response)
    const parsed = JSON.parse(cleaned)
    const scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || [])
    
    // Batch 2+ returns just scenes array
      return {
        scenes: scenes.map((s: any, idx: number) => {
          const scene = {
            sceneNumber: start + idx,
            heading: s.heading || `SCENE ${start + idx}`,
            characters: s.characters || [],  // CRITICAL: Preserve characters array from AI
            action: s.action || 'Scene content',
            narration: s.narration || '',  // NEW: Preserve captivating narration
            dialogue: Array.isArray(s.dialogue) ? s.dialogue : [],
            visualDescription: s.visualDescription || s.action || 'Cinematic shot',
            duration: s.duration || 30,  // Use AI's realistic estimate
            sfx: Array.isArray(s.sfx) ? s.sfx.map((sfx: any) => ({
              time: sfx.time || 0,
              description: sfx.description || ''
            })) : [],
            music: s.music ? {
              description: s.music.description || '',
              duration: s.music.duration
            } : undefined,
            isExpanded: true
          }
          
          // Extract SFX from dialogue (post-processing fix)
          return extractSFXFromDialogue(scene)
        })
      }
  } catch (error) {
    console.error('[Parse Scenes] Error:', error)
    // Fallback
    return { scenes: [] }
  }
}

// Normalize character names for deduplication
function normalizeCharacterName(name: string): string {
  if (!name) return ''
  
  // Use canonical normalization
  return toCanonicalName(name).toUpperCase()
}

function extractCharacters(scenes: any[]): any[] {
  const charMap = new Map()
  scenes.forEach((scene: any) => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      
      const normalizedName = normalizeCharacterName(d.character)
      
      // Use normalized name as key, but keep original (cleaned) name for display
      if (!charMap.has(normalizedName)) {
        // Clean the display name (remove V.O., etc. but keep proper case)
        const cleanName = d.character.replace(/\s*\([^)]*\)\s*/g, '').trim()
        
        charMap.set(normalizedName, {
          name: cleanName,  // Use cleaned version (e.g., "Brian Anderson" not "BRIAN ANDERSON (V.O.)")
          role: 'character',
          description: `Character from script`
        })
      }
    })
  })
  return Array.from(charMap.values())
}

