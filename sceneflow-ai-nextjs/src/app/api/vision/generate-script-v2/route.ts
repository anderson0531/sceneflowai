import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import { v4 as uuidv4 } from 'uuid'

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

        // Load existing characters
        let existingCharacters = (project.metadata?.visionPhase?.characters || []).map((c: any) => ({
          ...c,
          id: c.id || uuidv4()
        }))
    
        if (existingCharacters.length === 0 && treatment.character_descriptions) {
          existingCharacters = treatment.character_descriptions.map((c: any) => ({
            ...c,
            id: c.id || uuidv4(),
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

        const BATCH_SIZE = 20  // Reduced from 30 for faster processing
        const INITIAL_BATCH_SIZE = Math.min(15, suggestedScenes)
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
        const batch1Response = await callGemini(apiKey, batch1Prompt)
        const batch1Data = parseBatch1(batch1Response, 1, INITIAL_BATCH_SIZE)
        
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
        
        while (remainingScenes > 0) {
          const batchSize = Math.min(BATCH_SIZE, remainingScenes)
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
            const batchPrompt = buildBatch2Prompt(treatment, startScene, actualTotalScenes, duration, allScenes, existingCharacters)
            const batchResponse = await callGemini(apiKey, batchPrompt)
            const batchData = parseScenes(batchResponse, startScene, endScene)
            
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
            console.log(`[Script Gen V2] Batch ${batchNumber} complete: ${batchData.scenes.length} scenes (total: ${allScenes.length})`)
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              status: `Generated ${allScenes.length} of ${actualTotalScenes} scenes...`,
              batch: batchNumber,
              scenesGenerated: allScenes.length,
              totalScenes: actualTotalScenes
            })}\n\n`))
            
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
            role: c.role || 'supporting',
            imagePrompt: `Professional character portrait: ${c.name}, ${c.description}, photorealistic, high detail, studio lighting, neutral background, character design, 8K quality`,
            referenceImage: null,
            generating: false
          }))
        ]

        // Embed characterId in dialogue
        const scenesWithCharacterIds = allScenes.map((scene: any) => ({
          ...scene,
          dialogue: scene.dialogue?.map((d: any) => {
            if (!d.character) return d
            const character = allCharacters.find((c: any) => 
              c.name.toLowerCase() === d.character.toLowerCase()
            )
            return {
              ...d,
              characterId: character?.id
            }
          })
        }))

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

CRITICAL CHARACTER RULE:
- Use ONLY the characters listed above (${characters.map((c: any) => c.name).join(', ')})
- DO NOT invent new characters unless absolutely necessary (e.g., waiter, passerby with 1 line)
- Match character names EXACTLY as defined
- Maintain character descriptions and traits from Film Treatment

CRITICAL DIALOGUE RULES:
- Use ONLY the EXACT character names from the list above
- DO NOT abbreviate, modify, or create variations of character names
- Example: If character is "Brian Anderson Sr", dialogue MUST be "BRIAN ANDERSON SR:" not "BRIAN:" or "Brian:"
- Character names in dialogue must match the character list EXACTLY (case-insensitive is acceptable but use consistent formatting)

DIALOGUE INFLECTION AND EMOTION (CRITICAL FOR TTS):
- Add emotion/inflection tags in brackets BEFORE the dialogue text
- Common tags: [excitedly], [whispering], [sadly], [thoughtfully], [angrily], [nervously], [cheerfully], [urgently]
- Use SSML pause tags: <break time="1.0s" /> (seconds) or <break time="500ms" /> (milliseconds)
- Use ellipses (...) for hesitation
- Use dashes (—) for interruptions
- Capitalize for EMPHASIS

SCENE PLANNING:
- Total target: ${targetDuration}s (±10% is fine)
- REQUIRED total scenes: ${suggested} scenes (you MUST use ${suggested}, can adjust ±2 if absolutely necessary for story flow)
- Generate first ${end} scenes now

DURATION ESTIMATION (CRITICAL):
Calculate REALISTIC duration based on SPEECH TIME (narration + dialogue):
- Narration: ~150 words per minute (WPM) = 0.4s per word
- Dialogue: ~130 words per minute (natural speech) = 0.46s per word
- Add 2-5s setup/transition time per scene

Formula: 
  duration = (narration_words * 0.4) + (dialogue_words * 0.46) + (setup_time: 2-5s)

Examples:
- Narration (30 words) + 1 dialogue (15 words) + setup (3s) = 12s + 7s + 3s = 22s
- Narration (50 words) + 3 dialogues (40 words total) + setup (5s) = 20s + 18s + 5s = 43s
- Narration (80 words) + 6 dialogues (90 words total) + action (10s) = 32s + 41s + 10s = 83s

CRITICAL: Estimate duration based on actual word count of narration and dialogue, not arbitrary numbers.

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

function buildBatch2Prompt(treatment: any, start: number, total: number, targetDuration: number, prevScenes: any[], characters: any[]) {
  const remaining = total - prevScenes.length
  const prevDuration = prevScenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
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

CRITICAL: Use ONLY the defined characters above (${characters.map((c: any) => c.name).join(', ')}).
CRITICAL DIALOGUE: Use EXACT character names - do NOT abbreviate or modify them (e.g., "BRIAN ANDERSON SR:" not "BRIAN:").
ADD EMOTION TAGS: Include [emotion] tags and <break time="Xs" /> pauses for expressive TTS.

PREVIOUS SCENES (${prevScenes.length} so far, ${prevDuration}s total):
${prevScenes.slice(-3).map((s: any) => `${s.sceneNumber}. ${s.heading} (${s.duration}s): ${s.action.substring(0, 80)}...`).join('\n')}

DURATION TARGET:
- Remaining: ~${remainingDuration}s for ${remaining} scenes
- Average needed: ~${avgNeeded}s per scene (flexible guidance)
- Estimate realistically based on actual content
- Total target: ${targetDuration}s (±10%)

DURATION ESTIMATION (CRITICAL):
Calculate based on SPEECH TIME (narration + dialogue):
- Narration: ~150 WPM = 0.4s per word
- Dialogue: ~130 WPM = 0.46s per word
- Formula: (narration_words * 0.4) + (dialogue_words * 0.46) + (setup: 2-5s)
- Base estimates on actual word count

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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function sanitizeJsonString(jsonStr: string): string {
  // Remove markdown code fences
  let cleaned = jsonStr.replace(/```json\n?|```/g, '').trim()
  
  // First attempt: try to parse as-is
  try {
    JSON.parse(cleaned)
    return cleaned
  } catch (firstError: any) {
    console.error('[Sanitize] Original error:', firstError.message)
    console.error('[Sanitize] First 200 chars:', cleaned.substring(0, 200))
    
    // Enhanced sanitization approach
    try {
      // Remove control characters (ASCII 0-31 except tab, newline, carriage return)
      cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
      
      // Fix common JSON issues
      cleaned = cleaned
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,])\s*([}\]])/g, '$1"":$2') // Fix empty values
        .trim()
      
      // If JSON is truncated, try to close it properly
      const openBraces = (cleaned.match(/{/g) || []).length
      const closeBraces = (cleaned.match(/}/g) || []).length
      const openBrackets = (cleaned.match(/\[/g) || []).length
      const closeBrackets = (cleaned.match(/\]/g) || []).length
      
      // Add missing closing braces/brackets
      while (openBraces > closeBraces) {
        cleaned += '}'
      }
      while (openBrackets > closeBrackets) {
        cleaned += ']'
      }
      
      // Try parsing the enhanced version
      JSON.parse(cleaned)
      return cleaned
    } catch (secondError: any) {
      console.error('[Sanitize] After enhanced sanitization:', secondError.message)
      
      // Final fallback: Try more aggressive approach
      try {
        const aggressive = cleaned.replace(
          /"((?:[^"\\]|\\.)*)"/g,
          (match, stringContent) => {
            // Replace any literal control chars with escaped versions
            const fixed = stringContent
              .split('')
              .map((char: string) => {
                const code = char.charCodeAt(0)
                if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
                  return ' ' // Replace with space
                }
                if (code === 9) return '\\t'
                if (code === 10) return '\\n'
                if (code === 13) return '\\r'
                return char
              })
              .join('')
            
            return `"${fixed}"`
          }
        )
        
        JSON.parse(aggressive)
        return aggressive
      } catch (finalError: any) {
        console.error('[Sanitize] Final attempt failed:', finalError.message)
        // Return original as last resort
        return cleaned
      }
    }
  }
}

function parseBatch1(response: string, start: number, end: number): any {
  try {
    const cleaned = sanitizeJsonString(response)
    const parsed = JSON.parse(cleaned)
    
    // Batch 1 returns object with totalScenes and scenes
        return {
          totalScenes: parsed.totalScenes || null,
          estimatedTotalDuration: parsed.estimatedTotalDuration || 0,
          scenes: (parsed.scenes || []).map((s: any, idx: number) => ({
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
          }))
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
        scenes: scenes.map((s: any, idx: number) => ({
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
        }))
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
  
  // Remove voice-over indicators: (V.O.), (O.S.), (O.C.), (CONT'D)
  let normalized = name.replace(/\s*\([^)]*\)\s*/g, '').trim()
  
  // Convert to uppercase for case-insensitive comparison
  normalized = normalized.toUpperCase()
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ')
  
  return normalized
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

