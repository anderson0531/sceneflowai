import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 300 // Increased timeout for large scripts
export const runtime = 'nodejs'

interface ReviewCategory {
  name: string
  score: number
}

interface Review {
  overallScore: number
  categories: ReviewCategory[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  generatedAt: string
}

interface OptimizeScriptRequest {
  projectId: string
  script: any  // { scenes: Scene[] }
  instruction: string
  characters: any[]
  compact?: boolean
  directorReview?: Review | null
  audienceReview?: Review | null
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, script, instruction, characters, compact, directorReview, audienceReview }: OptimizeScriptRequest = await req.json()
    
    if (!projectId || !script || !instruction) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log('[Script Optimization] Optimizing script for project:', projectId)
    console.log('[Script Optimization] Instruction:', instruction)
    console.log('[Script Optimization] Scene count:', script.scenes?.length || 0)
    console.log('[Script Optimization] Has reviews:', { director: !!directorReview, audience: !!audienceReview })
    
    let result: any
    try {
      result = await optimizeScript(script, instruction, characters, !!compact, directorReview, audienceReview)
    } catch (e: any) {
      const msg = String(e?.message || '')
      const parseErr = msg.includes('Failed to parse optimization response') || msg.includes('no JSON found')
      if (parseErr && !compact) {
        console.warn('[Script Optimization] Parse failed. Retrying compact...')
        result = await optimizeScript(script, instruction, characters, true, directorReview, audienceReview)
      } else {
        throw e
      }
    }
    
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

async function optimizeScript(
  script: any, 
  instruction: string, 
  characters: any[], 
  compact: boolean,
  directorReview?: Review | null,
  audienceReview?: Review | null
) {
  // When reviews are present, include full scene content for targeted improvements
  const hasReviewContext = !!(directorReview || audienceReview)
  
  // Build condensed script summary for context
  const sceneSummaries = (script.scenes || []).slice(0, compact ? 8 : Math.min((script.scenes?.length || 0), 16)).map((scene: any, idx: number) => {
    const dialogueCount = scene.dialogue?.length || 0
    const duration = scene.duration || 0
    return `Scene ${idx + 1}: ${scene.heading || 'Untitled'} (${duration}s, ${dialogueCount} dialogue lines)`
  }).join('\n') || 'No scenes'
  
  // Build full scene content for review-driven optimization
  const fullSceneContent = hasReviewContext ? (script.scenes || []).map((scene: any, idx: number) => {
    const dialogueLines = (scene.dialogue || []).map((d: any) => 
      `  ${d.character}: "${d.line}"`
    ).join('\n')
    return `
--- SCENE ${idx + 1}: ${scene.heading || 'Untitled'} ---
Action: ${scene.action || 'None'}
Narration: ${scene.narration || 'None'}
Dialogue:
${dialogueLines || '  (no dialogue)'}
Music: ${scene.music || 'None'}
SFX: ${Array.isArray(scene.sfx) ? scene.sfx.join(', ') : scene.sfx || 'None'}
Duration: ${scene.duration || 0}s
`
  }).join('\n') : ''
  
  const characterList = characters?.map((c: any) => c.name).join(', ') || 'No characters'
  
  // Build character voice profiles for consistency checking
  const characterProfiles = characters?.map((c: any) => 
    `- ${c.name}: ${c.description || ''} ${c.demeanor ? `(Demeanor: ${c.demeanor})` : ''}`
  ).join('\n') || 'No character profiles'

  // Sanitize instruction to avoid undefined lines
  const normalizedInstruction = String(instruction || '')
    .split(/\r?\n/)
    .map(line => (line || '').trim())
    .filter(line => line && line.toLowerCase() !== 'undefined')
    .join('\n') || 'Improve clarity, pacing, character depth, and visual storytelling across the script.'
  
  // Build comprehensive review context for targeted improvements
  let reviewContext = ''
  if (directorReview || audienceReview) {
    reviewContext = `
=== REVIEW ANALYSIS CONTEXT (CRITICAL) ===
Apply these specific improvements to achieve scores of 85+ in all categories.

`
    if (directorReview) {
      reviewContext += `DIRECTOR REVIEW (Current Score: ${directorReview.overallScore}/100):

Analysis:
${directorReview.analysis}

Category Scores (Target 85+ for each):
${directorReview.categories.map(c => `- ${c.name}: ${c.score}/100 ${c.score < 80 ? '⚠️ PRIORITY: NEEDS SIGNIFICANT IMPROVEMENT' : c.score < 85 ? '⚡ NEEDS IMPROVEMENT' : '✓ Good'}`).join('\n')}

Strengths to PRESERVE (Do NOT change these aspects):
${directorReview.strengths.map(s => `✓ ${s}`).join('\n')}

Areas Requiring Improvement (Focus optimization here):
${directorReview.improvements.map(i => `⚠️ ${i}`).join('\n')}

Specific Recommendations to Implement:
${directorReview.recommendations.map((r, i) => `${i+1}. ${r}`).join('\n')}

`
    }
    
    if (audienceReview) {
      reviewContext += `AUDIENCE REVIEW (Current Score: ${audienceReview.overallScore}/100):

Analysis:
${audienceReview.analysis}

Category Scores (Target 85+ for each):
${audienceReview.categories.map(c => `- ${c.name}: ${c.score}/100 ${c.score < 80 ? '⚠️ PRIORITY: NEEDS SIGNIFICANT IMPROVEMENT' : c.score < 85 ? '⚡ NEEDS IMPROVEMENT' : '✓ Good'}`).join('\n')}

Areas Requiring Improvement:
${audienceReview.improvements.map(i => `⚠️ ${i}`).join('\n')}

`
    }
    
    reviewContext += `=== OPTIMIZATION MANDATE ===
Your task is to rewrite the script to address ALL the issues identified above.
- Every low-scoring category (<85) MUST be improved
- Every recommendation MUST be implemented
- The result should score 85+ in ALL categories
- Do NOT just make minor tweaks - make substantive improvements

`
  }
  
  const prompt = `You are an expert screenwriter and script doctor with deep understanding of narrative craft.

=== PRESERVATION PRINCIPLES (CRITICAL) ===

PRESERVE AUTHOR'S VOICE:
- Maintain the original tone, style, and creative vision
- Enhance what's there, don't replace it with generic alternatives
- Keep unique phrases, metaphors, and stylistic choices that work
- If something is intentionally unconventional, respect that choice

CHARACTER CONSISTENCY:
- Each character has established speech patterns - maintain them
- Character traits and motivations must remain consistent
- Relationships and dynamics should stay intact
- If a character speaks formally in Scene 1, they should in Scene 10

CONTINUITY CHECK:
- Ensure changes don't break story logic or established facts
- Props, settings, and details must remain consistent
- Character knowledge should match what they've learned in the story
- Timeline and cause-effect relationships must hold

QUALITY OVER QUANTITY:
- Make meaningful improvements, not changes for change's sake
- If something works, leave it alone
- Focus energy on weak points, not rewriting strong scenes
- Every change should clearly serve the story

=== USER INSTRUCTION ===
${normalizedInstruction}

${reviewContext}
=== CURRENT SCRIPT OVERVIEW ===
Total Scenes: ${script.scenes?.length || 0}
Characters: ${characterList}

CHARACTER PROFILES (for voice consistency):
${characterProfiles}

SCENE SUMMARIES:
${sceneSummaries}
${hasReviewContext ? `
=== FULL SCENE CONTENT (for targeted improvements) ===
${fullSceneContent}
` : ''}
=== OPTIMIZATION AREAS ===

1. NARRATIVE STRUCTURE:
   - Story arc clarity and pacing
   - Scene order and transitions
   - Setup, conflict, resolution balance
   - Dramatic escalation and payoffs

2. CHARACTER CRAFT:
   - Distinct character voices (each should sound different)
   - Character arc progression
   - Dialogue subtext and layers
   - Motivations clarity and consistency

3. VISUAL STORYTELLING:
   - Show don't tell (action over exposition)
   - Cinematic opportunities
   - Specific sensory details
   - Environmental storytelling

4. EMOTIONAL JOURNEY:
   - Emotional beat clarity
   - Tension and release rhythm
   - Payoff of earlier setups
   - Audience engagement points

5. CRAFT IMPROVEMENTS:
   - Replace exposition with action
   - Add subtext to on-the-nose dialogue
   - Strengthen weak transitions
   - Enhance specificity of details

=== QUALITY CHECKLIST (Apply to each scene) ===
□ Does each character sound distinctly different?
□ Are emotions shown through action, not stated?
□ Does dialogue have layers beyond surface meaning?
□ Is there clear conflict or tension?
□ Are visual details specific and evocative?
□ Does the scene connect smoothly to adjacent scenes?
□ Is the author's original intent preserved?

=== DIALOGUE AUDIO TAGS (Required for TTS) ===
EVERY dialogue line MUST include emotional/vocal direction tags.

STYLE TAGS (In square brackets BEFORE text):
Emotions: [happy], [sad], [angry], [fearful], [surprised], [disgusted], [neutral]
Intensity: [very], [slightly], [extremely]
Vocal Quality: [whispering], [shouting], [mumbling], [singing], [laughing], [crying]
Pace: [quickly], [slowly], [hesitantly], [confidently]

EXAMPLES:
  * {"character": "JOHN", "line": "[very excited] I can't believe it!"}
  * {"character": "MARY", "line": "[sadly, hesitantly] I wish things were different..."}

=== OUTPUT FORMAT ===

Return ONLY JSON with this exact structure (no commentary, do NOT wrap in code fences; escape all embedded quotes; use \\n for newlines; plain ASCII punctuation; no trailing commas). For EVERY scene, the fields "heading", "action", "narration", "dialogue", "music", "sfx", and "duration" MUST be present. If reducing narration, REPLACE it with a concise 1–2 sentence narration (never null/empty/"None"):
{
  "optimizedScript": {
    "scenes": [
      {
        "heading": "INT. LOCATION - TIME",
        "action": "Action description...",
        "narration": "Narration text...",
        "dialogue": [
          { "character": "CHARACTER", "line": "[emotion tag] Dialogue with emotional cues..." }
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

  // Calculate appropriate token limit based on scene count
  // Each scene needs ~200-300 tokens in output, plus changesSummary
  const sceneCount = script.scenes?.length || 0
  const estimatedTokens = Math.min(65536, Math.max(16384, sceneCount * 400 + 2000))
  
  console.log('[Script Optimization] Calling Vertex AI Gemini...')
  
  const result = await generateText(prompt, {
    model: 'gemini-2.0-flash',
    temperature: 0.2,
    maxOutputTokens: estimatedTokens,
    responseMimeType: 'application/json'
  })
  
  const analysisText = result.text
  
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

  // More aggressive JSON repair for common model issues
  const aggressiveJsonRepair = (input: string): string => {
    let s = normalizeForJson(input)
    
    // Fix unescaped quotes inside string values (common in dialogue)
    // Look for patterns like "line": "He said "hello" to her"
    // and convert to "line": "He said \"hello\" to her"
    s = s.replace(/"([^"]*)":\s*"([^"]*)"/g, (match, key, value) => {
      // Check if value has unbalanced quotes (odd number suggests nested quotes)
      const quoteCount = (value.match(/"/g) || []).length
      if (quoteCount % 2 === 1) {
        // Escape internal quotes
        const escapedValue = value.replace(/(?<!\\)"/g, '\\"')
        return `"${key}": "${escapedValue}"`
      }
      return match
    })
    
    // Fix truncated JSON by attempting to close open structures
    let openBraces = 0
    let openBrackets = 0
    let inString = false
    let escaped = false
    
    for (const c of s) {
      if (escaped) { escaped = false; continue }
      if (c === '\\') { escaped = true; continue }
      if (c === '"') { inString = !inString; continue }
      if (inString) continue
      if (c === '{') openBraces++
      if (c === '}') openBraces--
      if (c === '[') openBrackets++
      if (c === ']') openBrackets--
    }
    
    // Close any unclosed structures
    if (inString) s += '"'
    while (openBrackets > 0) { s += ']'; openBrackets-- }
    while (openBraces > 0) { s += '}'; openBraces-- }
    
    return s
  }

  try {
    const optimization = JSON.parse(jsonCandidate)
    
    // Preserve metadata from original scenes
    if (optimization.optimizedScript?.scenes && script.scenes) {
      let anyChange = false
      optimization.optimizedScript.scenes = optimization.optimizedScript.scenes.map((optimizedScene: any, idx: number) => {
        const originalScene = script.scenes[idx]
        const narration = coerceNarration(optimizedScene?.narration, originalScene?.narration, optimizedScene?.action || originalScene?.action)
        const merged = {
          ...optimizedScene,
          // Preserve metadata
          imageUrl: originalScene?.imageUrl,
          narrationAudioUrl: originalScene?.narrationAudioUrl,
          musicAudio: originalScene?.musicAudio,
          visualDescription: originalScene?.visualDescription,
          sceneNumber: originalScene?.sceneNumber || (idx + 1),
          duration: optimizedScene.duration || originalScene?.duration,
          narration
        }
        const { summary, changed } = effectSummary(originalScene, merged)
        if (changed) anyChange = true
        return { ...merged, effectSummary: summary }
      })
      if (!anyChange) {
        optimization.changesSummary = optimization.changesSummary || []
        optimization.changesSummary.unshift({
          category: 'No-op',
          changes: 'Model returned no substantive changes. Original preserved.',
          rationale: 'Try a narrower instruction or run Batch pass for targeted updates.'
        })
      }
    }
    
    return optimization
  } catch (parseError) {
    console.warn('[Script Optimization] JSON parse error on first attempt, applying repairs...')
    const repaired = normalizeForJson(jsonCandidate)
    try {
      const optimization = JSON.parse(repaired)
      if (optimization.optimizedScript?.scenes && script.scenes) {
        let anyChange = false
        optimization.optimizedScript.scenes = optimization.optimizedScript.scenes.map((optimizedScene: any, idx: number) => {
          const originalScene = script.scenes[idx]
          const narration = coerceNarration(optimizedScene?.narration, originalScene?.narration, optimizedScene?.action || originalScene?.action)
          const merged = {
            ...optimizedScene,
            imageUrl: originalScene?.imageUrl,
            narrationAudioUrl: originalScene?.narrationAudioUrl,
            musicAudio: originalScene?.musicAudio,
            visualDescription: originalScene?.visualDescription,
            sceneNumber: originalScene?.sceneNumber || (idx + 1),
            duration: optimizedScene.duration || originalScene?.duration,
            narration
          }
          const { summary, changed } = effectSummary(originalScene, merged)
          if (changed) anyChange = true
          return { ...merged, effectSummary: summary }
        })
        if (!anyChange) {
          optimization.changesSummary = optimization.changesSummary || []
          optimization.changesSummary.unshift({
            category: 'No-op',
            changes: 'Model returned no substantive changes. Original preserved.',
            rationale: 'Try a narrower instruction or run Batch pass for targeted updates.'
          })
        }
      }
      return optimization
    } catch (e2) {
      console.error('[Script Optimization] JSON parse error (after repair):', e2)
      console.error('[Script Optimization] Text attempted (head):', jsonCandidate.substring(0, 500))
      // As a minimal fallback, return original script with changesSummary note
      if (compact) {
        return {
          optimizedScript: script,
          changesSummary: [
            { category: 'Stability', changes: 'Returned original due to model truncation', rationale: 'Will refine in a subsequent compact pass' }
          ]
        }
      }
      throw new Error('Failed to parse optimization response')
    }
  }
}

function coerceNarration(candidate: any, original: any, fallbackSource?: any): string {
  const val = String(candidate ?? '').trim()
  if (val && val.toLowerCase() !== 'none' && val !== 'null' && val !== 'undefined') return val
  const orig = String(original ?? '').trim()
  if (orig) return orig
  const action = String(fallbackSource ?? '').trim()
  if (!action) return ''
  // Use first sentence or truncate
  const firstSentenceMatch = action.match(/[^.!?]*[.!?]/)
  const sentence = (firstSentenceMatch?.[0] || action).replace(/\s+/g, ' ').trim()
  return sentence.length > 220 ? sentence.slice(0, 217) + '...' : sentence
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

function effectSummary(original: any, revised: any): { summary: string; changed: boolean } {
  const effects: string[] = []
  let changed = false
  const safe = (s: any) => (String(s || '').trim())
  if (safe(original.heading) !== safe(revised.heading)) { effects.push('heading'); changed = true }
  if (safe(original.narration) !== safe(revised.narration)) { effects.push('narration'); changed = true }
  if (safe(original.action) !== safe(revised.action)) { effects.push('action'); changed = true }
  const d0 = Array.isArray(original.dialogue) ? original.dialogue.length : 0
  const d1 = Array.isArray(revised.dialogue) ? revised.dialogue.length : 0
  if (d0 !== d1) { effects.push(`dialogue ${d1 >= d0 ? '+' : ''}${d1 - d0}`); changed = true }
  const sfx0 = Array.isArray(original.sfx) ? original.sfx.length : 0
  const sfx1 = Array.isArray(revised.sfx) ? revised.sfx.length : 0
  if (sfx0 !== sfx1) { effects.push(`sfx ${sfx1 >= sfx0 ? '+' : ''}${sfx1 - sfx0}`); changed = true }
  const summary = effects.length ? effects.join(', ') : 'no visible changes'
  return { summary, changed }
}

