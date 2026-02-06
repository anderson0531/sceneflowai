import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'

export const maxDuration = 600 // 10min for large scripts with retries + parallel batches
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
  const sceneCount = script.scenes?.length || 0
  
  // Global deadline: 540s hard limit (60s safety margin before Vercel's 600s kill)
  const globalStartTime = Date.now()
  const DEADLINE_MS = 540_000
  
  // BATCHED OPTIMIZATION: Process scenes in batches to avoid token limits
  const SCENES_PER_BATCH = 4
  const PARALLEL_CONCURRENCY = 2 // Process 2 batches at a time
  const batches = Math.ceil(sceneCount / SCENES_PER_BATCH)
  
  console.log(`[Script Optimization] Processing ${sceneCount} scenes in ${batches} batch(es) of ~${SCENES_PER_BATCH} scenes (concurrency: ${PARALLEL_CONCURRENCY})`)
  
  // Build shared context once
  const sharedContext = buildSharedContext(script, instruction, characters, compact, directorReview, audienceReview)
  
  // Prepare all batch descriptors
  const batchDescriptors = Array.from({ length: batches }, (_, batchIndex) => {
    const startIdx = batchIndex * SCENES_PER_BATCH
    const endIdx = Math.min(startIdx + SCENES_PER_BATCH, sceneCount)
    return { batchIndex, startIdx, endIdx, scenes: script.scenes.slice(startIdx, endIdx) }
  })
  
  // Results array preserving batch order
  const batchResults: { scenes: any[], changesSummary: any[] }[] = new Array(batches)
  
  // Process batches in parallel waves of PARALLEL_CONCURRENCY
  for (let wave = 0; wave < batches; wave += PARALLEL_CONCURRENCY) {
    const waveBatches = batchDescriptors.slice(wave, wave + PARALLEL_CONCURRENCY)
    
    const wavePromises = waveBatches.map(async (desc) => {
      const { batchIndex, startIdx, endIdx, scenes: batchScenes } = desc
      const elapsedMs = Date.now() - globalStartTime
      const remainingMs = DEADLINE_MS - elapsedMs
      
      // Check global deadline before starting batch
      if (remainingMs < 30_000) {
        console.warn(`[Script Optimization] Deadline approaching (${Math.round(remainingMs/1000)}s left). Preserving scenes ${startIdx + 1}-${endIdx}`)
        batchResults[batchIndex] = {
          scenes: batchScenes.map((scene: any) => ({ ...scene, effectSummary: 'preserved (deadline)' })),
          changesSummary: [{ category: 'Deadline', changes: `Scenes ${startIdx + 1}-${endIdx} preserved due to time constraints`, rationale: 'Ensuring response completes within server limits' }]
        }
        return
      }
      
      console.log(`[Script Optimization] Batch ${batchIndex + 1}/${batches}: Optimizing scenes ${startIdx + 1}-${endIdx} (${Math.round(remainingMs/1000)}s remaining)`)
      
      try {
        const result = await optimizeBatch(
          batchScenes,
          startIdx,
          sharedContext,
          script.scenes,
          [], // parallel batches don't see each other's results
          compact,
          remainingMs
        )
        batchResults[batchIndex] = { scenes: result.scenes, changesSummary: result.changesSummary || [] }
        console.log(`[Script Optimization] Batch ${batchIndex + 1} complete: ${result.scenes.length} scenes optimized`)
      } catch (error) {
        console.error(`[Script Optimization] Batch ${batchIndex + 1} failed:`, error)
        batchResults[batchIndex] = {
          scenes: batchScenes.map((scene: any) => ({ ...scene, effectSummary: 'preserved (batch error)' })),
          changesSummary: [{ category: 'Batch Error', changes: `Scenes ${startIdx + 1}-${endIdx} preserved due to processing error`, rationale: 'Original content maintained for stability' }]
        }
      }
    })
    
    await Promise.all(wavePromises)
  }
  
  // Flatten results in order
  const allOptimizedScenes: any[] = []
  const allChangesSummaries: any[] = []
  for (const result of batchResults) {
    if (result) {
      allOptimizedScenes.push(...result.scenes)
      allChangesSummaries.push(...result.changesSummary)
    }
  }
  
  // Deduplicate and consolidate changes summaries
  const consolidatedChanges = consolidateChangesSummaries(allChangesSummaries)
  
  return {
    optimizedScript: {
      scenes: allOptimizedScenes
    },
    changesSummary: consolidatedChanges
  }
}

function buildSharedContext(
  script: any,
  instruction: string,
  characters: any[],
  compact: boolean,
  directorReview?: Review | null,
  audienceReview?: Review | null
): string {
  const characterList = characters?.map((c: any) => c.name).join(', ') || 'No characters'
  
  const characterProfiles = characters?.map((c: any) => 
    `- ${c.name}: ${c.description || ''} ${c.demeanor ? `(Demeanor: ${c.demeanor})` : ''}`
  ).join('\n') || 'No character profiles'

  const normalizedInstruction = String(instruction || '')
    .split(/\r?\n/)
    .map(line => (line || '').trim())
    .filter(line => line && line.toLowerCase() !== 'undefined')
    .join('\n') || 'Improve clarity, pacing, character depth, and visual storytelling.'
  
  // Build review context if available
  let reviewContext = ''
  if (directorReview || audienceReview) {
    reviewContext = `
=== REVIEW ANALYSIS CONTEXT ===
`
    if (directorReview) {
      reviewContext += `DIRECTOR REVIEW (Score: ${directorReview.overallScore}/100):
Key Issues: ${directorReview.improvements.slice(0, 3).join('; ')}
`
    }
    if (audienceReview) {
      reviewContext += `AUDIENCE REVIEW (Score: ${audienceReview.overallScore}/100):
Key Issues: ${audienceReview.improvements.slice(0, 3).join('; ')}
`
    }
  }

  return `=== USER INSTRUCTION ===
${normalizedInstruction}

${reviewContext}
=== SCRIPT CONTEXT ===
Total Scenes: ${script.scenes?.length || 0}
Characters: ${characterList}

CHARACTER PROFILES:
${characterProfiles}

=== OPTIMIZATION GUIDELINES ===
1. Preserve author's voice and style
2. Maintain character consistency
3. Show don't tell - use action over exposition
4. Add emotional/vocal tags to ALL dialogue: [happy], [sad], [angry], etc.
5. Keep continuity with other scenes
${compact ? '6. Keep content concise to reduce output size' : ''}

=== DIALOGUE AUDIO TAGS (Required) ===
Every dialogue line needs emotional tags in square brackets:
  * {"character": "JOHN", "line": "[excited] I can't believe it!"}
  * {"character": "MARY", "line": "[sadly] I wish things were different..."}`
}

async function optimizeBatch(
  batchScenes: any[],
  startIdx: number,
  sharedContext: string,
  allOriginalScenes: any[],
  previousOptimizedScenes: any[],
  compact: boolean,
  remainingMs: number = 540_000
): Promise<{ scenes: any[], changesSummary?: any[] }> {
  
  // Build context from adjacent scenes for continuity
  const prevSceneSummary = startIdx > 0 
    ? `Previous scene: ${allOriginalScenes[startIdx - 1]?.heading || 'Unknown'} - ${(allOriginalScenes[startIdx - 1]?.action || '').substring(0, 100)}...`
    : 'This is the start of the script.'
    
  const nextSceneIdx = startIdx + batchScenes.length
  const nextSceneSummary = nextSceneIdx < allOriginalScenes.length
    ? `Next scene: ${allOriginalScenes[nextSceneIdx]?.heading || 'Unknown'} - ${(allOriginalScenes[nextSceneIdx]?.action || '').substring(0, 100)}...`
    : 'This is the end of the script.'
  
  // Build the batch-specific content
  const scenesContent = batchScenes.map((scene: any, idx: number) => {
    const sceneNum = startIdx + idx + 1
    const dialogueLines = (scene.dialogue || []).map((d: any) => 
      `  ${d.character}: "${d.line}"`
    ).join('\n')
    return `
--- SCENE ${sceneNum}: ${scene.heading || 'Untitled'} ---
Action: ${scene.action || 'None'}
Narration: ${scene.narration || 'None'}
Dialogue:
${dialogueLines || '  (no dialogue)'}
Music: ${scene.music || 'None'}
SFX: ${Array.isArray(scene.sfx) ? scene.sfx.join(', ') : scene.sfx || 'None'}
Duration: ${scene.duration || 0}s`
  }).join('\n')
  
  const prompt = `You are an expert screenwriter optimizing a batch of scenes.

${sharedContext}

=== CONTINUITY CONTEXT ===
${prevSceneSummary}
${nextSceneSummary}

=== SCENES TO OPTIMIZE (${batchScenes.length} scenes) ===
${scenesContent}

=== OUTPUT FORMAT ===
Return ONLY valid JSON with this structure (no markdown, no code fences):
{
  "scenes": [
    {
      "heading": "INT. LOCATION - TIME",
      "action": "Action description...",
      "narration": "Brief narration (1-2 sentences, never empty)...",
      "dialogue": [
        { "character": "CHARACTER", "line": "[emotion] Dialogue..." }
      ],
      "music": "Music description",
      "sfx": ["SFX items"],
      "duration": 30
    }
  ],
  "changesSummary": [
    { "category": "Category", "changes": "What changed", "rationale": "Why" }
  ]
}

CRITICAL RULES:
- Output EXACTLY ${batchScenes.length} scenes (scenes ${startIdx + 1} to ${startIdx + batchScenes.length})
- Preserve scene duration values
- All dialogue must have [emotion] tags
- Escape quotes in JSON strings
- Never use raw line breaks inside strings (use \\n)
- If narration should be removed, replace with a 1-sentence summary (never null/empty)`

  // Token budget: 3500 per scene + 4000 base (increased to prevent MAX_TOKENS truncation)
  const estimatedTokens = Math.min(32768, batchScenes.length * 3500 + 4000)
  const baseTimeout = Math.min(180000, 60000 + batchScenes.length * 15000)
  // Cap per-batch timeout to remaining global deadline minus safety margin
  const timeoutMs = Math.min(baseTimeout, remainingMs - 10_000)
  
  console.log(`[Script Optimization] Batch call: ${batchScenes.length} scenes, ${estimatedTokens} tokens, ${timeoutMs/1000}s timeout, ${Math.round(remainingMs/1000)}s remaining`)
  
  // First attempt
  let result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: estimatedTokens,
    responseMimeType: 'application/json',
    timeoutMs,
    maxRetries: 1
  })
  
  let analysisText = result.text
  let wasTruncated = result.finishReason === 'MAX_TOKENS'
  
  // Check for truncation and retry with 2x tokens if deadline allows
  if (wasTruncated) {
    const elapsedSinceStart = Date.now() - (Date.now() - remainingMs) // approximate
    const timeLeftMs = remainingMs - (Date.now() % 1) // will be recalculated below
    const retryTokens = Math.min(65536, Math.floor(estimatedTokens * 2))
    const retryTimeout = Math.min(240000, timeoutMs * 1.5)
    
    // Only retry if we have enough time remaining (at least 60s)
    if (remainingMs > 90_000) {
      console.warn(`[Script Optimization] Response truncated (MAX_TOKENS). Retrying with ${retryTokens} tokens (${Math.round(remainingMs/1000)}s remaining)...`)
      
      result = await generateText(prompt, {
        model: 'gemini-2.5-flash',
        temperature: 0.2,
        maxOutputTokens: retryTokens,
        responseMimeType: 'application/json',
        timeoutMs: Math.min(retryTimeout, remainingMs - 10_000),
        maxRetries: 1
      })
      
      analysisText = result.text
      wasTruncated = result.finishReason === 'MAX_TOKENS'
      
      if (wasTruncated) {
        console.warn('[Script Optimization] Still truncated after retry, will attempt repair')
      }
    } else {
      console.warn(`[Script Optimization] Response truncated but only ${Math.round(remainingMs/1000)}s remaining — skipping retry, will attempt repair of partial response`)
    }
  }
  
  if (!analysisText) {
    throw new Error('No optimization generated from Gemini')
  }
  
  // Parse the response (with truncation awareness)
  const parsed = parseOptimizationResponse(analysisText, wasTruncated, batchScenes.length)
  
  // Merge with original scene metadata
  const mergedScenes = parsed.scenes.map((optimizedScene: any, idx: number) => {
    const originalScene = batchScenes[idx] || {}
    const narration = coerceNarration(optimizedScene?.narration, originalScene?.narration, optimizedScene?.action || originalScene?.action)
    
    // Ensure dialogue is always an array (prevent ".map is not a function" errors)
    const dialogue = Array.isArray(optimizedScene?.dialogue) 
      ? optimizedScene.dialogue 
      : Array.isArray(originalScene?.dialogue) 
        ? originalScene.dialogue 
        : []
    
    // Ensure sfx is always an array
    const sfx = Array.isArray(optimizedScene?.sfx) 
      ? optimizedScene.sfx 
      : Array.isArray(originalScene?.sfx) 
        ? originalScene.sfx 
        : []
    
    const merged = {
      ...optimizedScene,
      // Ensure array fields are arrays
      dialogue,
      sfx,
      // Preserve metadata from original
      imageUrl: originalScene?.imageUrl,
      narrationAudioUrl: originalScene?.narrationAudioUrl,
      musicAudio: originalScene?.musicAudio,
      visualDescription: originalScene?.visualDescription,
      sceneNumber: originalScene?.sceneNumber || (startIdx + idx + 1),
      duration: optimizedScene.duration || originalScene?.duration,
      narration
    }
    const { summary, changed } = effectSummary(originalScene, merged)
    return { ...merged, effectSummary: summary }
  })
  
  return {
    scenes: mergedScenes,
    changesSummary: parsed.changesSummary || []
  }
}

function parseOptimizationResponse(
  text: string, 
  wasTruncated: boolean = false,
  expectedSceneCount: number = 0
): { scenes: any[], changesSummary?: any[] } {
  // Log full response on truncation for debugging
  if (wasTruncated) {
    console.warn('[Script Optimization] Parsing truncated response, length:', text.length)
    console.warn('[Script Optimization] Response tail:', text.slice(-300))
  }
  
  // Extract JSON from response
  let jsonCandidate = ''
  const fence = text.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fence && fence[1]) {
    jsonCandidate = fence[1].trim()
  } else if (text.trim().startsWith('{')) {
    jsonCandidate = text.trim()
  } else {
    const balanced = extractBalancedJson(text)
    if (balanced) jsonCandidate = balanced
  }

  if (!jsonCandidate) {
    console.error('[Script Optimization] No JSON found in batch response. Raw:', text.substring(0, 500))
    throw new Error('Failed to parse optimization response: no JSON found')
  }

  try {
    return JSON.parse(jsonCandidate)
  } catch (e) {
    console.warn('[Script Optimization] JSON parse error, applying repairs...')
    
    // Apply standard normalization first
    let repaired = normalizeForJson(jsonCandidate)
    
    // If truncated, apply truncation-specific repair
    if (wasTruncated) {
      repaired = repairTruncatedJson(repaired)
    }
    
    try {
      const parsed = JSON.parse(repaired)
      
      // Validate we got scenes array
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error('Missing scenes array in response')
      }
      
      // If we got fewer scenes than expected due to truncation, try partial recovery
      if (wasTruncated && parsed.scenes.length < expectedSceneCount) {
        console.warn(`[Script Optimization] Truncation lost scenes: got ${parsed.scenes.length}/${expectedSceneCount}`)
      }
      
      return parsed
    } catch (e2) {
      // Last resort: try to extract any complete scenes from truncated response
      if (wasTruncated) {
        console.warn('[Script Optimization] Attempting partial scene recovery...')
        const partialScenes = extractPartialScenes(repaired)
        if (partialScenes.length > 0) {
          console.log(`[Script Optimization] Recovered ${partialScenes.length} complete scenes from truncated response`)
          return { scenes: partialScenes, changesSummary: [] }
        }
      }
      
      console.error('[Script Optimization] JSON parse error (after repair):', e2)
      console.error('[Script Optimization] Text attempted (head):', jsonCandidate.substring(0, 500))
      console.error('[Script Optimization] Text attempted (tail):', jsonCandidate.slice(-500))
      throw new Error('Failed to parse optimization response')
    }
  }
}

function consolidateChangesSummaries(summaries: any[]): any[] {
  // Group by category and deduplicate
  const byCategory: Record<string, any[]> = {}
  for (const item of summaries) {
    const cat = item.category || 'General'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }
  
  return Object.entries(byCategory).map(([category, items]) => ({
    category,
    changes: items.map(i => i.changes).filter(Boolean).join('; '),
    rationale: items.map(i => i.rationale).filter(Boolean)[0] || ''
  }))
}

function normalizeForJson(input: string): string {
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
        let j = i + 1
        while (j < chars.length && /\s/.test(chars[j])) j++
        const nxt = chars[j]
        if (nxt && ![',', ']', '}', '\n'].includes(nxt)) {
          out += '\\"'
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
  if (inStr) out += '"'
  return out
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

/**
 * Repair truncated JSON by properly closing unclosed structures
 * Handles mid-string truncation, unclosed arrays, and unclosed objects
 */
function repairTruncatedJson(text: string): string {
  let s = text.trim()
  
  // Count structures
  const openBraces = (s.match(/{/g) || []).length
  const closeBraces = (s.match(/}/g) || []).length
  const openBrackets = (s.match(/\[/g) || []).length
  const closeBrackets = (s.match(/\]/g) || []).length
  const quotes = (s.match(/"/g) || []).length
  
  // Close unclosed string
  if (quotes % 2 !== 0) {
    // Find last quote and check if we're in a truncated value
    const lastQuoteIdx = s.lastIndexOf('"')
    const afterQuote = s.slice(lastQuoteIdx + 1).trim()
    
    // If truncated mid-value, close the string
    if (!afterQuote.match(/^[,}\]]/)) {
      s += '"'
    }
  }
  
  // Remove trailing comma if present
  s = s.replace(/,\s*$/, '')
  
  // Close arrays before objects (CRITICAL: order matters for nested structures)
  const missingBrackets = openBrackets - closeBrackets
  for (let i = 0; i < missingBrackets; i++) {
    s += ']'
  }
  
  const missingBraces = openBraces - closeBraces
  for (let i = 0; i < missingBraces; i++) {
    s += '}'
  }
  
  return s
}

/**
 * Extract any complete scene objects from a truncated JSON response
 * This is a last-resort recovery when standard parsing fails
 */
function extractPartialScenes(text: string): any[] {
  const scenes: any[] = []
  
  // Look for complete scene objects within the "scenes" array
  // Pattern: { "heading": ..., "action": ..., ... } followed by comma or ]
  const scenePattern = /\{\s*"heading"\s*:\s*"[^"]*"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
  
  let match
  while ((match = scenePattern.exec(text)) !== null) {
    try {
      const sceneCandidate = match[0]
      const parsed = JSON.parse(sceneCandidate)
      
      // Validate it looks like a scene
      if (parsed.heading && (parsed.action || parsed.dialogue)) {
        scenes.push(parsed)
      }
    } catch {
      // Skip invalid matches
    }
  }
  
  return scenes
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

