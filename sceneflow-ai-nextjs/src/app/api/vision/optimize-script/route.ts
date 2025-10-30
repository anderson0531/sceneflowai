import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120 // Longer timeout for full script
export const runtime = 'nodejs'

interface OptimizeScriptRequest {
  projectId: string
  script: any  // { scenes: Scene[] }
  instruction: string
  characters: any[]
  compact?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, instruction, characters, compact }: OptimizeScriptRequest = await req.json()
    
    if (!projectId || !script || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log('[Script Optimization] Optimizing script for project:', projectId)
    console.log('[Script Optimization] Instruction:', instruction)
    console.log('[Script Optimization] Scene count:', script.scenes?.length || 0)
    
    const result = await optimizeScript(script, instruction, characters, !!compact)
    
    return NextResponse.json({
      success: true,
      ...result,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Script Optimization] Error:', error)
    const msg = String(error?.message || '')
    const isParse = msg.includes('Failed to parse optimization response') || msg.includes('no JSON found')
    const status = isParse ? 422 : 500
    const diagnosticId = `opt-${Date.now()}`
    if (isParse) {
      console.error('[Script Optimization] Diagnostic ID:', diagnosticId)
    }
    return NextResponse.json({ error: msg || 'Failed to optimize script', diagnosticId }, { status })
  }
}

async function optimizeScript(script: any, instruction: string, characters: any[], compact: boolean) {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error('Google API key not configured')
  
  // Build condensed script summary for context
  const sceneSummaries = script.scenes?.map((scene: any, idx: number) => {
    const dialogueCount = scene.dialogue?.length || 0
    const duration = scene.duration || 0
    return `Scene ${idx + 1}: ${scene.heading || 'Untitled'} (${duration}s, ${dialogueCount} dialogue lines)`
  }).join('\n') || 'No scenes'
  
  const characterList = characters?.map((c: any) => c.name).join(', ') || 'No characters'

  // Sanitize instruction to avoid undefined lines
  const normalizedInstruction = String(instruction || '')
    .split(/\r?\n/)
    .map(line => (line || '').trim())
    .filter(line => line && line.toLowerCase() !== 'undefined')
    .join('\n') || 'Improve clarity, pacing, character depth, and visual storytelling across the script.'
  
  const prompt = `You are an expert screenwriter and script doctor. Optimize this entire script based on the user's instruction.

USER INSTRUCTION:
${normalizedInstruction}

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
1. Complete optimized script ${compact ? '(limit to first 12 scenes to keep response size manageable)' : '(all scenes with all elements)'}
2. Changes summary explaining major improvements
3. Rationale for each category of changes

Return ONLY JSON with this exact structure (no commentary, do NOT wrap in code fences; escape all embedded quotes; use \\n for newlines; plain ASCII punctuation; no trailing commas):
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

CRITICAL:
- Maintain ALL scene metadata (duration, imageUrl, etc.) from the original. Only optimize content (heading, action, narration, dialogue, music, sfx).
- All string values MUST be valid JSON strings. Escape quotes and newlines (use \\n for line breaks). Do NOT include raw line breaks inside JSON strings.
${compact ? '- Keep dialogue concise; prefer summaries where needed to reduce size.\n' : ''}`

  console.log('[Script Optimization] Calling Gemini API...')
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: compact ? 8192 : 16384,
          responseMimeType: 'application/json'
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
  
  // Robust JSON extraction: prefer code-fenced JSON, else raw, else balanced {...}
  let jsonCandidate = ''
  const fence = analysisText.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fence && fence[1]) {
    jsonCandidate = fence[1].trim()
  } else if (analysisText.trim().startsWith('{')) {
    jsonCandidate = analysisText.trim()
  } else {
    const balanced = extractBalancedJson(analysisText)
    if (balanced) jsonCandidate = balanced
  }

  if (!jsonCandidate) {
    console.error('[Script Optimization] No JSON found in response. Raw:', analysisText.substring(0, 500))
    throw new Error('Failed to parse optimization response: no JSON found')
  }

  // Attempt parse; on failure, apply light repairs for common model issues
  const normalizeForJson = (input: string): string => {
    // Normalize newlines
    let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Normalize smart quotes/dashes to ASCII
    s = s
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
    // Remove trailing commas before ] or }
    s = s.replace(/,\s*(\]|\})/g, '$1')
    // Escape newlines occurring inside JSON strings
    const chars = Array.from(s)
    let out = ''
    let inStr = false
    let esc = false
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]
      if (inStr) {
        if (esc) {
          out += c
          esc = false
        } else if (c === '\\') {
          out += c
          esc = true
        } else if (c === '"') {
          // Heuristic: if a quote appears in the middle of a sentence (next non-space isn't , ] } or \n), treat it as a content quote and escape it
          let j = i + 1
          while (j < chars.length && /\s/.test(chars[j])) j++
          const nxt = chars[j]
          if (nxt && ![',', ']', '}', '\n'].includes(nxt)) {
            out += '\\"' // keep string open, escape the quote
          } else {
            out += '"'
            inStr = false
          }
        } else if (c === '\n') {
          out += '\\n'
        } else if (c === '\t') {
          out += '\\t'
        } else {
          out += c
        }
      } else {
        if (c === '"') {
          out += c
          inStr = true
        } else {
          out += c
        }
      }
    }
    // If JSON ended while still in a string, close it
    if (inStr) out += '"'
    return out
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
    console.warn('[Script Optimization] JSON parse error on first attempt, applying repairs...')
    const repaired = normalizeForJson(jsonCandidate)
    try {
      const optimization = JSON.parse(repaired)
      if (optimization.optimizedScript?.scenes && script.scenes) {
        optimization.optimizedScript.scenes = optimization.optimizedScript.scenes.map((optimizedScene: any, idx: number) => {
          const originalScene = script.scenes[idx]
          return {
            ...optimizedScene,
            imageUrl: originalScene?.imageUrl,
            narrationAudioUrl: originalScene?.narrationAudioUrl,
            musicAudio: originalScene?.musicAudio,
            sceneNumber: originalScene?.sceneNumber || (idx + 1),
            duration: optimizedScene.duration || originalScene?.duration
          }
        })
      }
      return optimization
    } catch (e2) {
      console.error('[Script Optimization] JSON parse error (after repair):', e2)
      console.error('[Script Optimization] Text attempted (head):', jsonCandidate.substring(0, 500))
      throw new Error('Failed to parse optimization response')
    }
  }
}

function extractBalancedJson(text: string): string | '' {
  const start = text.indexOf('{')
  if (start === -1) return ''
  const chars = Array.from(text)
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < chars.length; i++) {
    const c = chars[i]
    if (inStr) {
      if (esc) {
        esc = false
      } else if (c === '\\') {
        esc = true
      } else if (c === '"') {
        inStr = false
      }
    } else {
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          return chars.slice(start, i + 1).join('')
        }
      }
    }
  }
  if (depth > 0) {
    return chars.slice(start).join('') + '}'.repeat(depth)
  }
  return ''
}

