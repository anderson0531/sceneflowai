import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 300  // 5 minutes for large script generation (requires Vercel Pro)

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 })
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const treatment = project.metadata?.filmTreatmentVariant
    if (!treatment) {
      return NextResponse.json({ success: false, error: 'No film treatment found' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 })
    }

    // Variable scene count - AI decides based on content
    const duration = project.duration || 300
    const minScenes = Math.floor(duration / 90)   // Conservative (scenes avg 90s)
    const maxScenes = Math.floor(duration / 20)   // Aggressive (scenes avg 20s)  
    const suggestedScenes = Math.ceil(duration / 53)  // Realistic: 53s avg per scene (user empirical data)
    
    console.log(`[Script Gen V2] Target: ${duration}s - Scene range: ${minScenes}-${maxScenes} (suggested: ${suggestedScenes})`)

    // Load existing characters BEFORE generating script
    // Priority: visionPhase.characters (user-refined) > treatment.character_descriptions (AI-generated)
    let existingCharacters = project.metadata?.visionPhase?.characters || []
    
    // If no vision phase characters, sync from treatment
    if (existingCharacters.length === 0 && treatment.character_descriptions) {
      existingCharacters = treatment.character_descriptions.map((c: any) => ({
        ...c,
        version: 1,
        lastModified: new Date().toISOString(),
        referenceImage: c.referenceImage || null,
        generating: false,
      }))
      
      // Auto-save to vision phase
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
    } else {
      console.log(`[Script Gen V2] Using ${existingCharacters.length} characters from Vision Phase`)
    }

    // Scale batch size based on story duration
    const BATCH_SIZE = 30  // Max scenes per batch to avoid timeout
    const INITIAL_BATCH_SIZE = Math.min(15, suggestedScenes)  // First batch
    let actualTotalScenes = suggestedScenes
    let allScenes: any[] = []

    // BATCH 1: Generate first batch, AI determines total scene count
    console.log(`[Script Gen V2] Batch 1: Generating first ${INITIAL_BATCH_SIZE} scenes (AI will determine total)...`)
    
    const batch1Prompt = buildBatch1Prompt(treatment, 1, INITIAL_BATCH_SIZE, minScenes, maxScenes, suggestedScenes, duration, [], existingCharacters)
    const batch1Response = await callGemini(apiKey, batch1Prompt)
    const batch1Data = parseBatch1(batch1Response, 1, INITIAL_BATCH_SIZE)
    
    // Extract AI's determined total
    if (batch1Data.totalScenes && batch1Data.totalScenes >= minScenes && batch1Data.totalScenes <= maxScenes) {
      actualTotalScenes = batch1Data.totalScenes
      console.log(`[Script Gen V2] AI determined ${actualTotalScenes} total scenes`)
      
      // OVERRIDE: If AI chose value significantly different from suggested, use suggested
      const deviation = Math.abs(actualTotalScenes - suggestedScenes)
      if (deviation > suggestedScenes * 0.3) {  // >30% deviation
        console.warn(`[Script Gen V2] AI chose ${actualTotalScenes}, but suggested is ${suggestedScenes}. Overriding.`)
        actualTotalScenes = suggestedScenes
      }
    } else {
      console.log(`[Script Gen V2] Using suggested ${actualTotalScenes} scenes (AI total out of range or not provided)`)
    }
    
    allScenes.push(...batch1Data.scenes)
    console.log(`[Script Gen V2] Batch 1 complete: ${batch1Data.scenes.length} scenes`)
    
    // MULTI-BATCH: Generate remaining scenes in chunks
    let remainingScenes = actualTotalScenes - allScenes.length
    let batchNumber = 2
    
    while (remainingScenes > 0) {
      const batchSize = Math.min(BATCH_SIZE, remainingScenes)
      const startScene = allScenes.length + 1
      const endScene = startScene + batchSize - 1
      
      console.log(`[Script Gen V2] Batch ${batchNumber}: Generating scenes ${startScene}-${endScene} (${batchSize} scenes)...`)
      
      const batchPrompt = buildBatch2Prompt(treatment, startScene, actualTotalScenes, duration, allScenes, existingCharacters)
      const batchResponse = await callGemini(apiKey, batchPrompt)
      const batchData = parseScenes(batchResponse, startScene, endScene)
      
      allScenes.push(...batchData.scenes)
      console.log(`[Script Gen V2] Batch ${batchNumber} complete: ${batchData.scenes.length} scenes (total: ${allScenes.length})`)
      
      remainingScenes = actualTotalScenes - allScenes.length
      batchNumber++
      
      // Safety: Prevent infinite loop
      if (batchNumber > 10) {
        console.error(`[Script Gen V2] Too many batches (${batchNumber}), stopping generation`)
        break
      }
    }
    
    // Validation and logging
    const totalEstimatedDuration = allScenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
    const durationAccuracy = ((totalEstimatedDuration / duration) * 100).toFixed(1)
    
    console.log(`[Script Gen V2] Generation complete:`)
    console.log(`  - Scenes: ${allScenes.length} (suggested ${suggestedScenes})`)
    console.log(`  - Estimated: ${totalEstimatedDuration}s vs Target: ${duration}s`)
    console.log(`  - Accuracy: ${durationAccuracy}%`)
    
    if (Math.abs(totalEstimatedDuration - duration) / duration > 0.15) {
      console.warn(`[Script Gen V2] Duration accuracy >15% off - may need regeneration`)
    }

    // Extract characters that appear in dialogue (for validation)
    const dialogueChars = extractCharacters(allScenes)
    
    // Normalize existing character names for comparison
    const existingCharNamesNormalized = existingCharacters.map((c: any) => 
      normalizeCharacterName(c.name || '')
    )
    
    // Find NEW characters that appeared in dialogue but aren't in Film Treatment
    const newChars = dialogueChars.filter((c: any) => 
      !existingCharNamesNormalized.includes(normalizeCharacterName(c.name || ''))
    )
    
    // Combine: existing (with all Film Treatment details) + any new ones
    const allCharacters = [
      ...existingCharacters,  // Keep Film Treatment characters with appearance, demeanor, clothing
      ...newChars.map((c: any) => ({
        ...c,
        role: c.role || 'supporting', // Default to supporting if no role specified
        imagePrompt: `Professional character portrait: ${c.name}, ${c.description}, photorealistic, high detail, studio lighting, neutral background, character design, 8K quality`,
        referenceImage: null,
        generating: false
      }))
    ]

    console.log(`[Script Gen V2] Characters: ${existingCharacters.length} from Film Treatment + ${newChars.length} new from dialogue (${allCharacters.length} total)`)
    
    if (newChars.length > 0) {
      console.warn(`[Script Gen V2] WARNING: Script introduced ${newChars.length} characters not in Film Treatment:`, newChars.map((c: any) => c.name))
    }

    // Build final script
    const script = {
      title: treatment.title,
      logline: treatment.logline,
      script: { scenes: allScenes },
      characters: allCharacters,  // Film Treatment characters + any new ones
      totalDuration: totalEstimatedDuration  // Use accurate estimated duration
    }

    // Save to project (preserve existing visionPhase data)
    const existingVisionPhase = project.metadata?.visionPhase || {}
    await project.update({
      metadata: {
        ...project.metadata,
        visionPhase: {
          ...existingVisionPhase,
          script,
          scriptGenerated: true,
          characters: allCharacters,  // Update with combined characters
          scenes: allScenes  // Update with generated scenes
        }
      }
    })

    console.log(`[Script Gen V2] === FINAL RESULT ===`)
    console.log(`[Script Gen V2] Returning ${allScenes.length} scenes to client`)
    console.log(`[Script Gen V2] Scene numbers: ${allScenes.map((s: any) => s.sceneNumber).join(', ')}`)
    console.log(`[Script Gen V2] First scene: ${JSON.stringify(allScenes[0]).substring(0, 100)}`)
    console.log(`[Script Gen V2] Last scene: ${JSON.stringify(allScenes[allScenes.length - 1]).substring(0, 100)}`)

    return NextResponse.json({ success: true, script })
    
  } catch (error: any) {
    console.error('[Script Gen V2] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
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
    
    // Second attempt: Fix control characters within string values only
    // This regex finds strings and replaces literal control chars
    try {
      // Match string values in JSON (between quotes, handling escaped quotes)
      const sanitized = cleaned.replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (match, stringContent) => {
          // Only sanitize the content inside the string
          const fixed = stringContent
            .replace(/\r\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            // Don't replace if already escaped
            .replace(/([^\\])\\n/g, '$1\\n')
            .replace(/([^\\])\\t/g, '$1\\t')
            .replace(/([^\\])\\r/g, '$1\\r')
          
          return `"${fixed}"`
        }
      )
      
      // Third attempt: try parsing the sanitized version
      JSON.parse(sanitized)
      return sanitized
    } catch (secondError: any) {
      console.error('[Sanitize] After sanitization:', secondError.message)
      
      // Final fallback: Try more aggressive approach
      // Replace any literal control characters with spaces as last resort
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

