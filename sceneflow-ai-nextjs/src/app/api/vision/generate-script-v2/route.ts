import { NextRequest, NextResponse } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'

export const runtime = 'nodejs'
export const maxDuration = 120  // Allow 2 minutes for 2 batches

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
    const suggestedScenes = Math.floor(duration / 50)  // Recommended (scenes avg 50s)
    
    console.log(`[Script Gen V2] Target: ${duration}s - Scene range: ${minScenes}-${maxScenes} (suggested: ${suggestedScenes})`)

    // Load existing characters BEFORE generating script
    const existingCharacters = project.metadata?.visionPhase?.characters || 
                              treatment.character_descriptions || []
    
    console.log(`[Script Gen V2] Using ${existingCharacters.length} characters from Film Treatment`)

    const INITIAL_BATCH_SIZE = 12  // First batch size
    let actualTotalScenes = suggestedScenes  // Will be updated by AI
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
    } else {
      console.log(`[Script Gen V2] Using suggested ${actualTotalScenes} scenes (AI total out of range or not provided)`)
    }
    
    allScenes.push(...batch1Data.scenes)
    console.log(`[Script Gen V2] Batch 1 complete: ${batch1Data.scenes.length} scenes`)
    
    // BATCH 2: Generate remaining scenes if needed
    const remainingScenes = actualTotalScenes - allScenes.length
    if (remainingScenes > 0) {
      console.log(`[Script Gen V2] Batch 2: Generating remaining ${remainingScenes} scenes...`)
      
      const batch2Prompt = buildBatch2Prompt(treatment, allScenes.length + 1, actualTotalScenes, duration, allScenes, existingCharacters)
      const batch2Response = await callGemini(apiKey, batch2Prompt)
      const batch2Data = parseScenes(batch2Response, allScenes.length + 1, actualTotalScenes)
      
      allScenes.push(...batch2Data.scenes)
      console.log(`[Script Gen V2] Batch 2 complete: ${batch2Data.scenes.length} scenes`)
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
    const existingCharNames = existingCharacters.map((c: any) => c.name?.toUpperCase() || '')
    
    // Find NEW characters that appeared in dialogue but aren't in Film Treatment
    const newChars = dialogueChars.filter((c: any) => 
      !existingCharNames.includes(c.name?.toUpperCase())
    )
    
    // Combine: existing (with all Film Treatment details) + any new ones
    const allCharacters = [
      ...existingCharacters,  // Keep Film Treatment characters with appearance, demeanor, clothing
      ...newChars.map((c: any) => ({
        ...c,
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
- Suggested total scenes: ${suggested} (you can choose ${min}-${max})
- YOU DECIDE: How many total scenes best tells this story?
- Generate first ${end} scenes now, determine total count

DURATION ESTIMATION (CRITICAL):
For each scene, estimate REALISTIC duration based on actual content:
- Count dialogue lines × 10s each
- Add action/setup time (5-30s depending on complexity)
- Examples:
  * 1 dialogue + setup = 15-30s
  * 3 dialogues + action = 40-60s
  * 6 dialogues + complex action = 70-90s

Return JSON:
{
  "totalScenes": 24,  // YOUR DECISION (${min}-${max}) - how many scenes total for this story?
  "estimatedTotalDuration": 300,  // Sum of first ${end} scenes only
  "scenes": [
    {
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "action": "SOUND of gentle sizzling, a timer beeps. CLOSE UP on character's hands. They move across the room.\n\nSFX: Gentle sizzling, timer beeps\n\nMusic: Soft upbeat piano",
      "dialogue": [{"character": "NAME", "line": "..."}],
      "visualDescription": "Camera, lighting",
      "duration": 25,  // REALISTIC based on content (dialogue count + action time)
      "sfx": [{"time": 0, "description": "Gentle sizzling, timer beeps"}],
      "music": {"description": "Soft upbeat piano"}
    }
  ]
}

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

DURATION ESTIMATION:
- 1-2 dialogues + setup = 15-30s
- 3-4 dialogues + action = 40-60s
- 5-8 dialogues + complex = 70-90s

Return JSON array:
[
  {
    "sceneNumber": ${start},
    "heading": "INT. LOCATION - TIME",
    "action": "SOUND of footsteps approaching. Character enters.\n\nSFX: Footsteps on hardwood\n\nMusic: Suspenseful strings",
    "dialogue": [{"character": "NAME", "line": "..."}],
    "visualDescription": "Camera, lighting",
    "duration": 45,  // REALISTIC estimate
    "sfx": [{"time": 0, "description": "Footsteps on hardwood"}],
    "music": {"description": "Suspenseful strings"}
  }
]

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

function parseBatch1(response: string, start: number, end: number): any {
  try {
    const cleaned = response.replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    
    // Batch 1 returns object with totalScenes and scenes
        return {
          totalScenes: parsed.totalScenes || null,
          estimatedTotalDuration: parsed.estimatedTotalDuration || 0,
          scenes: (parsed.scenes || []).map((s: any, idx: number) => ({
            sceneNumber: start + idx,
            heading: s.heading || `SCENE ${start + idx}`,
            action: s.action || 'Scene content',
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
    const cleaned = response.replace(/```json\n?|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const scenes = Array.isArray(parsed) ? parsed : (parsed.scenes || [])
    
    // Batch 2+ returns just scenes array
      return {
        scenes: scenes.map((s: any, idx: number) => ({
          sceneNumber: start + idx,
          heading: s.heading || `SCENE ${start + idx}`,
          action: s.action || 'Scene content',
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

function extractCharacters(scenes: any[]): any[] {
  const charMap = new Map()
  scenes.forEach((scene: any) => {
    scene.dialogue?.forEach((d: any) => {
      if (!charMap.has(d.character)) {
        charMap.set(d.character, {
          name: d.character,
          role: 'character',
          description: `Character from script`
        })
      }
    })
  })
  return Array.from(charMap.values())
}

