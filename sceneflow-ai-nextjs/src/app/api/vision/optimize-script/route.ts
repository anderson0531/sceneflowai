import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120 // Longer timeout for full script
export const runtime = 'nodejs'

interface OptimizeScriptRequest {
  projectId: string
  script: any  // { scenes: Scene[] }
  instruction: string
  characters: any[]
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, instruction, characters }: OptimizeScriptRequest = await req.json()
    
    if (!projectId || !script || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log('[Script Optimization] Optimizing script for project:', projectId)
    console.log('[Script Optimization] Instruction:', instruction)
    console.log('[Script Optimization] Scene count:', script.scenes?.length || 0)
    
    const result = await optimizeScript(script, instruction, characters)
    
    return NextResponse.json({
      success: true,
      ...result,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Script Optimization] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to optimize script' },
      { status: 500 }
    )
  }
}

async function optimizeScript(script: any, instruction: string, characters: any[]) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')
  
  // Build condensed script summary for context
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => {
    const dialogueCount = scene.dialogue?.length || 0
    const duration = scene.duration || 0
    return `Scene ${idx + 1}: ${scene.heading || 'Untitled'} (${duration}s, ${dialogueCount} dialogue lines)`
  }).join('\n') || 'No scenes'
  
  const characterList = characters?.map((c: any) => c.name).join(', ') || 'No characters'
  
  const prompt = `You are an expert screenwriter and script doctor. Optimize this entire script based on the user's instruction.

USER INSTRUCTION:
${instruction}

CURRENT SCRIPT OVERVIEW:
Total Scenes: ${script.scenes?.length || 0}
Characters: ${characterList}

SCENES:
${sceneSummaries}

FULL SCRIPT (JSON):
${JSON.stringify(script, null, 2)}

OPTIMIZATION TASK:
Based on the user's instruction, optimize the ENTIRE script holistically. Consider:

1. NARRATIVE STRUCTURE:
   - Overall story arc and pacing
   - Scene order and flow
   - Setup, conflict, and resolution
   - Dramatic escalation

2. CHARACTER DEVELOPMENT:
   - Consistent character voices
   - Character arc progression
   - Dialogue authenticity
   - Motivations and relationships

3. VISUAL STORYTELLING:
   - Visual consistency and style
   - Show don't tell
   - Cinematic opportunities
   - Scene variety

4. EMOTIONAL JOURNEY:
   - Audience engagement
   - Emotional beats and payoffs
   - Tone consistency
   - Tension and release

5. TECHNICAL EXECUTION:
   - Scene transitions
   - Duration balance
   - Production feasibility
   - Visual clarity

PROVIDE:
1. Complete optimized script (all scenes with all elements)
2. Changes summary explaining major improvements
3. Rationale for each category of changes

Return ONLY JSON with this exact structure (no commentary, do NOT wrap in code fences):
{
  "optimizedScript": {
    "scenes": [
      {
        "heading": "INT. LOCATION - TIME",
        "action": "Action description...",
        "narration": "Narration text...",
        "dialogue": [
          { "character": "CHARACTER", "line": "Dialogue..." }
        ],
        "music": "Music description",
        "sfx": ["SFX description"],
        "duration": 30
      }
    ]
  },
  "changesSummary": [
    {
      "category": "Narrative Structure",
      "changes": "Specific changes made...",
      "rationale": "Why these changes improve the script..."
    },
    {
      "category": "Character Development",
      "changes": "Specific changes made...",
      "rationale": "Why these changes improve the script..."
    }
  ]
}

CRITICAL: Maintain ALL scene metadata (duration, imageUrl, etc.) from the original. Only optimize content (heading, action, narration, dialogue, music, sfx).`

  console.log('[Script Optimization] Calling Gemini API...')
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384 // Larger for full script
        }
      })
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Script Optimization] Gemini API error:', response.status, errorText)
    throw new Error(`Gemini API error: ${response.status}`)
  }
  
  const data = await response.json()
  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!analysisText) {
    throw new Error('No optimization generated from Gemini')
  }
  
  // Robust JSON extraction: prefer code-fenced JSON, else raw, else first {...}
  let jsonCandidate = ''
  const fence = analysisText.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fence && fence[1]) {
    jsonCandidate = fence[1].trim()
  } else if (analysisText.trim().startsWith('{')) {
    jsonCandidate = analysisText.trim()
  } else {
    const start = analysisText.indexOf('{')
    const end = analysisText.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      jsonCandidate = analysisText.slice(start, end + 1)
    }
  }

  if (!jsonCandidate) {
    console.error('[Script Optimization] No JSON found in response. Raw:', analysisText.substring(0, 500))
    throw new Error('Failed to parse optimization response: no JSON found')
  }

  try {
    const optimization = JSON.parse(jsonCandidate)
    
    // Preserve metadata from original scenes
    if (optimization.optimizedScript?.scenes && script.scenes) {
      optimization.optimizedScript.scenes = optimization.optimizedScript.scenes.map((optimizedScene: any, idx: number) => {
        const originalScene = script.scenes[idx]
        return {
          ...optimizedScene,
          // Preserve metadata
          imageUrl: originalScene?.imageUrl,
          narrationAudioUrl: originalScene?.narrationAudioUrl,
          musicAudio: originalScene?.musicAudio,
          sceneNumber: originalScene?.sceneNumber || (idx + 1),
          duration: optimizedScene.duration || originalScene?.duration
        }
      })
    }
    
    return optimization
  } catch (parseError) {
    console.error('[Script Optimization] JSON parse error:', parseError)
    console.error('[Script Optimization] Text attempted:', jsonCandidate.substring(0, 500))
    throw new Error('Failed to parse optimization response')
  }
}

