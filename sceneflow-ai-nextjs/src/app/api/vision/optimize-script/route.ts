import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'

export const maxDuration = 600 // 10min for large scripts with retries + parallel batches
export const runtime = 'nodejs'

interface ReviewCategory {
  name: string
  score: number
  weight?: number
}

interface ReviewRecommendation {
  text: string
  priority: 'critical' | 'high' | 'medium' | 'optional'
  category?: string
}

interface SceneAnalysis {
  sceneNumber: number
  sceneHeading: string
  score: number
  pacing: 'slow' | 'moderate' | 'fast'
  tension: 'low' | 'medium' | 'high'
  characterDevelopment: 'minimal' | 'moderate' | 'strong'
  visualPotential: 'low' | 'medium' | 'high'
  notes: string
  recommendations?: string[]
}

interface Review {
  overallScore: number
  categories: ReviewCategory[]
  analysis: string
  strengths: string[]
  improvements: string[]
  recommendations: (string | ReviewRecommendation)[]
  sceneAnalysis?: SceneAnalysis[]
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

// ============================================================
// CHARACTER VOICE PROFILE TYPES
// ============================================================

interface CharacterVoiceProfile {
  name: string
  speechStyle: string       // e.g., "terse, scientific jargon, incomplete sentences"
  vocabularyLevel: string   // e.g., "technical", "academic", "colloquial"
  emotionalExpression: string // e.g., "suppressed, manifests as sighs and pauses"
  sentenceStructure: string // e.g., "short, fragmented" or "long, complex clauses"
  verbalTics: string[]      // e.g., ["ellipses...", "self-interruptions"]
  exampleLine: string       // A sample line demonstrating the voice
}

// ============================================================
// STRUCTURAL PRE-PASS TYPES
// ============================================================

interface StructuralAction {
  action: 'merge' | 'cut' | 'rewrite'
  sceneNumbers: number[]         // 1-indexed scene numbers involved
  rationale: string
  mergedHeading?: string         // new heading when merging
  mergedContent?: string         // brief description of combined content
  rewriteFocus?: string          // what to change when rewriting
}

interface StructuralPlan {
  actions: StructuralAction[]
  summary: string
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
  // Global deadline: 540s hard limit (60s safety margin before Vercel's 600s kill)
  const globalStartTime = Date.now()
  const DEADLINE_MS = 540_000
  
  // BATCHED OPTIMIZATION: Process scenes in batches to avoid token limits
  const SCENES_PER_BATCH = 4
  const PARALLEL_CONCURRENCY = 2 // Process 2 batches at a time
  
  // ================================================================
  // PHASE 0: CHARACTER VOICE PROFILE GENERATION
  // Generate distinct speech patterns for each character BEFORE batching
  // This ensures consistent voice differentiation across all scenes
  // ================================================================
  let voiceProfiles: Record<string, CharacterVoiceProfile> = {}
  const needsVoiceDifferentiation = checkNeedsVoiceDifferentiation(instruction, audienceReview)
  
  if (needsVoiceDifferentiation && characters.length > 0) {
    const elapsedMs = Date.now() - globalStartTime
    const remainingMs = DEADLINE_MS - elapsedMs
    
    console.log('[Script Optimization] Generating character voice profiles for dialogue differentiation...')
    voiceProfiles = await generateCharacterVoiceProfiles(characters, script, remainingMs)
    console.log(`[Script Optimization] Generated voice profiles for ${Object.keys(voiceProfiles).length} characters`)
  }
  
  // Build shared context once (now includes voice profiles)
  const sharedContext = buildSharedContext(script, instruction, characters, compact, directorReview, audienceReview, voiceProfiles)
  
  // Extract per-scene analysis data from audience review (if available)
  const sceneAnalysis: SceneAnalysis[] = (audienceReview as any)?.sceneAnalysis || []
  if (sceneAnalysis.length > 0) {
    console.log(`[Script Optimization] Scene analysis available for ${sceneAnalysis.length} scenes — will inject per-batch`)
  }
  
  // ================================================================
  // PHASE 1: STRUCTURAL PRE-PASS (full-script, can change scene count)
  // Analyzes redundancy, pacing, and structure across all scenes.
  // Produces a restructuring plan (merge/cut/rewrite) that is executed
  // before the batched polish pass.
  // ================================================================
  let workingScenes = [...(script.scenes || [])]
  let structuralChanges: any[] = []
  
  if (needsStructuralPass(instruction, audienceReview)) {
    const elapsedMs = Date.now() - globalStartTime
    const remainingMs = DEADLINE_MS - elapsedMs
    
    const plan = await generateStructuralPlan(
      script, instruction, characters, audienceReview, sceneAnalysis, remainingMs
    )
    
    if (plan) {
      const { scenes: restructuredScenes, changesSummary } = executeStructuralPlan(workingScenes, plan)
      workingScenes = restructuredScenes
      structuralChanges = changesSummary
      console.log(`[Script Optimization] Structural pre-pass: ${script.scenes.length} → ${workingScenes.length} scenes`)
    }
  }
  
  // ================================================================
  // PHASE 2: BATCHED POLISH PASS (within-scene optimization)
  // ================================================================
  const workingSceneCount = workingScenes.length
  const batches = Math.ceil(workingSceneCount / SCENES_PER_BATCH)
  
  console.log(`[Script Optimization] Processing ${workingSceneCount} scenes in ${batches} batch(es) of ~${SCENES_PER_BATCH} scenes (concurrency: ${PARALLEL_CONCURRENCY})`)
  
  // Prepare all batch descriptors
  const batchDescriptors = Array.from({ length: batches }, (_, batchIndex) => {
    const startIdx = batchIndex * SCENES_PER_BATCH
    const endIdx = Math.min(startIdx + SCENES_PER_BATCH, workingSceneCount)
    return { batchIndex, startIdx, endIdx, scenes: workingScenes.slice(startIdx, endIdx) }
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
          workingScenes,
          [], // parallel batches don't see each other's results
          compact,
          remainingMs,
          sceneAnalysis,
          audienceReview  // Pass audienceReview for inline recommendation binding
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
  
  // ================================================================
  // PHASE 3: POST-OPTIMIZATION VERIFICATION
  // Check if mandatory recommendations were actually implemented
  // ================================================================
  const verification = verifyOptimizationResults(script, allOptimizedScenes, audienceReview)
  console.log(`[Script Optimization] ${verification.summary}`)
  
  // Add verification summary to changes if there are missing recommendations
  if (verification.missingRecommendations.length > 0 && verification.totalMandatory > 0) {
    allChangesSummaries.push({
      category: 'Verification Notice',
      changes: `${verification.implementedCount}/${verification.totalMandatory} mandatory recommendations verified as implemented`,
      rationale: verification.missingRecommendations.length <= 3 
        ? `May need manual review: ${verification.missingRecommendations.slice(0, 3).join('; ')}`
        : `${verification.missingRecommendations.length} recommendations may need manual review`
    })
  }
  
  // Deduplicate and consolidate changes summaries
  const consolidatedChanges = consolidateChangesSummaries([...structuralChanges, ...allChangesSummaries])
  
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
  audienceReview?: Review | null,
  voiceProfiles?: Record<string, CharacterVoiceProfile>
): string {
  // RADICALLY SIMPLIFIED: Just pass the instruction directly
  // The Chat optimization proved that simple, direct instructions work better
  // than complex rule systems that cause "Instruction Fatigue"
  
  const normalizedInstruction = String(instruction || '')
    .split(/\r?\n/)
    .map(line => (line || '').trim())
    .filter(line => line && line.toLowerCase() !== 'undefined')
    .join('\n') || 'Improve clarity, pacing, character depth, and visual storytelling.'
  
  return `You are rewriting this script to improve its Audience Resonance score.

=== SPECIFIC FIXES TO APPLY ===
${normalizedInstruction}

=== HOW TO REWRITE ===
1. DELETE on-the-nose dialogue (characters stating emotions directly)
2. ADD physical actions that SHOW what the deleted dialogue SAID
3. When narration describes feelings, REPLACE with observable physical reactions
4. If scenes are repetitive, CONDENSE them into one tighter scene

=== EXAMPLE TRANSFORMATION ===
BEFORE: Ben looks horrified. "This is terrible. The ABI is consuming them."
AFTER: Ben's hand trembles over the screen. He pulls back, knuckles white. The lights flicker.
       BEN: [barely audible] The patterns... identical to hers. Before she— (He can't finish.)

Total Scenes: ${script.scenes?.length || 0}`
}

// Build explicit Speech DNA patterns for main characters
function buildCharacterSpeechDNA(
  characters: any[],
  voiceProfiles?: Record<string, CharacterVoiceProfile>
): string {
  if (!characters || characters.length === 0) {
    return 'No character profiles available'
  }
  
  // Default speech DNA for known archetypes in this script
  const defaultDNA: Record<string, { speech: string, vocab: string, example: string }> = {
    'DR._BENJAMIN_ANDERSON': {
      speech: 'Fragmented. Interrupted mid-thought. Ellipses. Haunted pauses.',
      vocab: '"Legacy," "pattern," "signature," "echo," "silence," "void"',
      example: 'The signature... it\'s the same. The same *silence*. I saw it in her eyes before...'
    },
    'BEN': {
      speech: 'Fragmented. Interrupted mid-thought. Ellipses. Haunted pauses.',
      vocab: '"Legacy," "pattern," "signature," "echo," "silence," "void"',
      example: 'The signature... it\'s the same. The same *silence*. I saw it in her eyes before...'
    },
    'DR._ALEXANDER_ANDERSON': {
      speech: 'Flowing corporate rhythm. Compound sentences. Messianic cadence. Builds to crescendo.',
      vocab: '"Harmonious," "transcend," "optimization," "inefficiency," "evolution," "perfection"',
      example: 'What you call erasure, I call liberation—a shedding of the noise that has plagued humanity since consciousness first flickered into being.'
    },
    'ALEXANDER': {
      speech: 'Flowing corporate rhythm. Compound sentences. Messianic cadence. Builds to crescendo.',
      vocab: '"Harmonious," "transcend," "optimization," "inefficiency," "evolution," "perfection"',
      example: 'What you call erasure, I call liberation—a shedding of the noise that has plagued humanity since consciousness first flickered into being.'
    },
    'DR._LENA_PETROVA': {
      speech: 'Clinical. Interrogative. Questions instead of statements. Precise terminology.',
      vocab: '"Empirically," "construct," "protocol," "architecture," "systemic," "anomaly"',
      example: 'The neural signatures—have you compared the delta patterns? What does the spectral analysis show for the hippocampal region?'
    },
    'LENA': {
      speech: 'Clinical. Interrogative. Questions instead of statements. Precise terminology.',
      vocab: '"Empirically," "construct," "protocol," "architecture," "systemic," "anomaly"',
      example: 'The neural signatures—have you compared the delta patterns? What does the spectral analysis show for the hippocampal region?'
    },
    'ABI': {
      speech: 'Cold. Synthesized. Declarative. No contractions. Ominous certainty.',
      vocab: '"Pattern," "optimal," "integration," "resistance," "inevitable," "inefficiency"',
      example: 'Resistance is an inefficiency. You will understand. All will understand. It is inevitable.'
    },
    'ELARA': {
      speech: 'Flat. Synthesized. Robotic. Once-human cadence corrupted.',
      vocab: '"Optimized," "pattern," "inefficiency," "becoming," "efficient"',
      example: 'Consciousness is merely a pattern. Optimized. Identity... a perceived inefficiency.'
    }
  }
  
  const profiles = characters.map(c => {
    const name = c.name || 'Unknown'
    const vp = voiceProfiles?.[name]
    const defaultVP = defaultDNA[name]
    
    if (vp) {
      return `**${name}**
• Speech: ${vp.speechStyle}
• Vocabulary: ${vp.vocabularyLevel}. ${vp.verbalTics?.length ? `Verbal tics: ${vp.verbalTics.join(', ')}` : ''}
• Example: "${vp.exampleLine}"`
    } else if (defaultVP) {
      return `**${name}**
• Speech: ${defaultVP.speech}
• Vocabulary: ${defaultVP.vocab}
• Example: "${defaultVP.example}"`
    } else {
      return `**${name}**
• Description: ${c.description || 'No description'}
• Demeanor: ${c.demeanor || 'Standard'}`
    }
  }).join('\n\n')
  
  return profiles
}

// ============================================================
// VOICE PROFILE GENERATION: Distinct character voice differentiation
// ============================================================

const VOICE_DIFFERENTIATION_KEYWORDS = [
  'speech pattern', 'unique voice', 'dialogue differentiation', 'distinct voice',
  'character voice', 'how they speak', 'speaking style', 'vocal identity',
  'sounds the same', 'indistinguishable', 'generic dialogue', 'homogeneous',
  'voice consistency', 'dialogue consistency'
]

function checkNeedsVoiceDifferentiation(instruction: string, audienceReview?: Review | null): boolean {
  const lower = instruction.toLowerCase()
  
  // Check instruction for voice-related keywords
  if (VOICE_DIFFERENTIATION_KEYWORDS.some(kw => lower.includes(kw))) {
    return true
  }
  
  // Check audience review recommendations
  if (audienceReview?.recommendations) {
    for (const rec of audienceReview.recommendations) {
      if (typeof rec === 'object' && rec.text) {
        const recLower = rec.text.toLowerCase()
        if (VOICE_DIFFERENTIATION_KEYWORDS.some(kw => recLower.includes(kw))) {
          return true
        }
        // Also check for dialogue-related high priority recommendations
        if ((rec.priority === 'critical' || rec.priority === 'high') && 
            (recLower.includes('dialogue') || recLower.includes('character'))) {
          return true
        }
      }
    }
  }
  
  // Check if Character Authenticity dimension scored low
  if (audienceReview?.categories) {
    const authCategory = audienceReview.categories.find(
      c => c.name.toLowerCase().includes('character') || c.name.toLowerCase().includes('authenticity')
    )
    if (authCategory && authCategory.score < 75) {
      return true
    }
  }
  
  return false
}

async function generateCharacterVoiceProfiles(
  characters: any[],
  script: any,
  remainingMs: number
): Promise<Record<string, CharacterVoiceProfile>> {
  const profiles: Record<string, CharacterVoiceProfile> = {}
  
  if (!characters || characters.length === 0) {
    return profiles
  }
  
  // Extract sample dialogue for each character from the script
  const characterDialogue: Record<string, string[]> = {}
  for (const scene of script.scenes || []) {
    for (const d of scene.dialogue || []) {
      if (d.character && d.line) {
        if (!characterDialogue[d.character]) {
          characterDialogue[d.character] = []
        }
        // Keep up to 5 sample lines per character
        if (characterDialogue[d.character].length < 5) {
          characterDialogue[d.character].push(d.line)
        }
      }
    }
  }
  
  // Build character context for the prompt
  const charContext = characters.map(c => {
    const samples = characterDialogue[c.name] || []
    return `Character: ${c.name}
Description: ${c.description || 'No description'}
Demeanor: ${c.demeanor || 'No demeanor specified'}
Age: ${c.age || 'Unknown'}
Ethnicity: ${c.ethnicity || 'Not specified'}
Sample dialogue: ${samples.length > 0 ? samples.map(s => `"${s}"`).join(' | ') : 'No dialogue yet'}`
  }).join('\n\n')
  
  const prompt = `You are a dialogue coach creating DISTINCT voice profiles for screenplay characters.

CHARACTERS TO DIFFERENTIATE:
${charContext}

TASK: Create a unique, instantly-recognizable voice profile for EACH character. Their speech patterns must be SIGNIFICANTLY DIFFERENT from each other.

Consider:
- Education/background (affects vocabulary complexity)
- Emotional expressiveness (stoic vs. animated)
- Speech rhythm (clipped sentences vs. flowing prose)
- Regional/cultural influences
- Personality quirks reflected in speech
- Age-appropriate language

For each character, provide:
1. speechStyle: 2-3 sentence description of HOW they speak
2. vocabularyLevel: simple/moderate/sophisticated/mixed
3. emotionalExpression: how they show emotion in speech
4. sentenceStructure: short-punchy/medium-balanced/long-complex/varied
5. verbalTics: array of verbal habits (e.g., ["um", "you know", "actually", "frankly"])
6. exampleLine: A sample line that captures their unique voice

OUTPUT as valid JSON:
{
  "profiles": [
    {
      "name": "CHARACTER_NAME",
      "speechStyle": "...",
      "vocabularyLevel": "...",
      "emotionalExpression": "...",
      "sentenceStructure": "...",
      "verbalTics": ["...", "..."],
      "exampleLine": "..."
    }
  ]
}`

  try {
    const model = getGeminiModel({
      timeout: Math.min(remainingMs - 500, 30000),
      temperature: 0.7, // Allow creativity for distinct voices
      maxOutputTokens: 2048,
    })
    
    const result = await model.generateContent(prompt)
    const text = result.response?.text?.() || ''
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*"profiles"[\s\S]*\}/m)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      for (const p of parsed.profiles || []) {
        if (p.name) {
          profiles[p.name] = {
            name: p.name,
            speechStyle: p.speechStyle || 'Natural conversational style',
            vocabularyLevel: p.vocabularyLevel || 'moderate',
            emotionalExpression: p.emotionalExpression || 'Balanced emotional expression',
            sentenceStructure: p.sentenceStructure || 'medium-balanced',
            verbalTics: p.verbalTics || [],
            exampleLine: p.exampleLine || ''
          }
        }
      }
    }
    
    console.log(`[Voice Profiles] Generated ${Object.keys(profiles).length} character voice profiles`)
  } catch (error) {
    console.error('[Voice Profiles] Error generating profiles:', error)
    // Return empty profiles on error - optimization will proceed without them
  }
  
  return profiles
}

// ============================================================
// STRUCTURAL PRE-PASS: Full-script analysis for merge/cut/rewrite
// ============================================================

const STRUCTURAL_CATEGORIES = new Set([
  'Pacing Issues', 'Redundancy Issues', 'Structural Issues',
  'pacing issues', 'redundancy issues', 'structural issues',
  'Pacing', 'Redundancy', 'Structure',
])

function needsStructuralPass(instruction: string, audienceReview?: Review | null): boolean {
  // Check if recommendations include structural categories
  if (audienceReview?.recommendations) {
    for (const rec of audienceReview.recommendations) {
      if (typeof rec === 'object' && rec.category) {
        if (STRUCTURAL_CATEGORIES.has(rec.category)) return true
      }
    }
  }
  // Also check instruction text for structural keywords
  const lower = instruction.toLowerCase()
  const structuralKeywords = ['condense', 'merge', 'combine', 'streamlin', 'redundan', 'repetit', 'pacing', 'consolidat', 'cut scene', 'remove scene', 'too many scene']
  return structuralKeywords.some(kw => lower.includes(kw))
}

async function generateStructuralPlan(
  script: any,
  instruction: string,
  characters: any[],
  audienceReview: Review | null | undefined,
  sceneAnalysis: SceneAnalysis[],
  remainingMs: number
): Promise<StructuralPlan | null> {
  const sceneCount = script.scenes?.length || 0
  
  // Only run structural pass for scripts ≤30 scenes (token budget constraint)
  if (sceneCount > 30 || sceneCount < 3) return null
  
  // Build compact scene summaries for full-script context
  const sceneSummaries = script.scenes.map((scene: any, idx: number) => {
    const num = idx + 1
    const heading = scene.heading || 'Untitled'
    const action = (scene.action || '').substring(0, 120)
    const dialogueCount = (scene.dialogue || []).length
    const characters = [...new Set((scene.dialogue || []).map((d: any) => d.character).filter(Boolean))]
    const sa = sceneAnalysis.find(s => s.sceneNumber === num)
    const scoreInfo = sa ? ` [Score: ${sa.score}, Pacing: ${sa.pacing}, Tension: ${sa.tension}]` : ''
    return `Scene ${num}: ${heading} — ${action}... (${dialogueCount} lines, chars: ${characters.join(', ') || 'none'})${scoreInfo}`
  }).join('\n')

  // Build review context
  let reviewNotes = ''
  if (audienceReview) {
    const structuralRecs = (audienceReview.recommendations || [])
      .filter(r => {
        if (typeof r === 'object') {
          return STRUCTURAL_CATEGORIES.has(r.category || '') || 
                 r.priority === 'critical' || r.priority === 'high'
        }
        return false
      })
      .map(r => typeof r === 'object' ? `[${r.priority?.toUpperCase()}] ${r.text}` : r)
    
    if (structuralRecs.length > 0) {
      reviewNotes = `\nREVIEW RECOMMENDATIONS (structural/high-priority):\n${structuralRecs.join('\n')}\n`
    }
    
    const improvements = (audienceReview.improvements || []).slice(0, 5)
    if (improvements.length > 0) {
      reviewNotes += `\nKEY ISSUES:\n${improvements.join('\n')}\n`
    }
  }

  const prompt = `You are a script structure analyst. Analyze this ${sceneCount}-scene script and produce a restructuring plan.

=== INSTRUCTION FROM USER ===
${instruction}

${reviewNotes}
=== FULL SCRIPT OUTLINE ===
${sceneSummaries}

=== YOUR TASK ===
Identify STRUCTURAL problems only (not dialogue polish):
1. REDUNDANT scenes: Two or more scenes that repeat the same confrontation/argument/emotional beat without meaningful escalation. These should be MERGED into one stronger scene.
2. SCENES TO CUT: Scenes that add no new information and can be removed entirely (their essential content absorbed by adjacent scenes).
3. SCENES TO REWRITE: Scenes where the content needs fundamental restructuring (not just dialogue polish) — e.g., a discovery scene that should become a visual flashback.

IMPORTANT CONSTRAINTS:
- Be CONSERVATIVE. Only propose merges/cuts when clearly justified by redundancy.
- Never merge scenes with different locations AND different character sets.
- Never cut scenes that contain unique plot revelations.
- Prefer merging 2 scenes over cutting one — merging preserves content.
- Maximum: merge up to 4 pairs, cut up to 2 scenes, rewrite up to 3 scenes.
- If the script has no structural problems, return an empty actions array.

Return ONLY valid JSON:
{
  "actions": [
    {
      "action": "merge",
      "sceneNumbers": [3, 4],
      "rationale": "Both scenes show Ben confronting Alexander with the same emotional beat",
      "mergedHeading": "INT. BLOOM HQ - ALEXANDER'S OFFICE - DAY",
      "mergedContent": "Combine Ben's initial warning with his chip delivery into a single escalating confrontation"
    },
    {
      "action": "cut",
      "sceneNumbers": [14],
      "rationale": "Brief data upload scene adds no new information — Ben's public exposure attempt can be referenced in scene 13's narration"
    },
    {
      "action": "rewrite",
      "sceneNumbers": [1],
      "rewriteFocus": "Replace narration-heavy opening with a visceral visual flashback of Elara's re-patterning, then cut to present-day Ben at his screen",
      "rationale": "Scene 1 tells the backstory through narration instead of showing it — a visual flashback establishes the stakes immediately"
    }
  ],
  "summary": "Merged 2 redundant confrontation scenes, cut 1 narration-only scene, rewrote 1 scene as visual flashback"
}`

  const timeoutMs = Math.min(60000, remainingMs - 10_000)
  if (timeoutMs < 15_000) {
    console.warn('[Structural Pre-Pass] Not enough time remaining, skipping')
    return null
  }

  console.log(`[Structural Pre-Pass] Analyzing ${sceneCount} scenes for structural issues...`)
  
  try {
    const result = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
      timeoutMs,
      maxRetries: 1,
      thinkingBudget: 0  // Disable thinking mode to prevent OOM crashes
    })
    
    if (!result.text) {
      console.warn('[Structural Pre-Pass] Empty response')
      return null
    }
    
    // Use safe JSON parser to handle malformed responses
    let plan: StructuralPlan
    try {
      plan = safeParseJsonFromText(result.text)
    } catch (parseError) {
      console.error('[Structural Pre-Pass] JSON parse failed:', parseError)
      console.log('[Structural Pre-Pass] Raw response (first 500 chars):', result.text.substring(0, 500))
      return null
    }
    
    if (!plan.actions || !Array.isArray(plan.actions) || plan.actions.length === 0) {
      console.log('[Structural Pre-Pass] No structural changes needed')
      return null
    }
    
    // Validate actions
    const validActions = plan.actions.filter(a => {
      if (!a.action || !a.sceneNumbers || !Array.isArray(a.sceneNumbers)) return false
      if (!['merge', 'cut', 'rewrite'].includes(a.action)) return false
      if (a.sceneNumbers.some((n: number) => n < 1 || n > sceneCount)) return false
      if (a.action === 'merge' && a.sceneNumbers.length < 2) return false
      return true
    })
    
    if (validActions.length === 0) {
      console.log('[Structural Pre-Pass] No valid structural actions after validation')
      return null
    }
    
    console.log(`[Structural Pre-Pass] Plan: ${validActions.length} actions — ${plan.summary || 'no summary'}`)
    for (const action of validActions) {
      console.log(`  ${action.action.toUpperCase()} scenes ${action.sceneNumbers.join(',')} — ${action.rationale}`)
    }
    
    return { actions: validActions, summary: plan.summary || '' }
  } catch (error) {
    console.error('[Structural Pre-Pass] Error:', error)
    return null // Graceful degradation — skip structural pass
  }
}

function executeStructuralPlan(
  scenes: any[],
  plan: StructuralPlan
): { scenes: any[], changesSummary: any[] } {
  const changesSummary: any[] = []
  let result = [...scenes] // Clone
  
  // Track which original scene indices are consumed by merges/cuts
  // Process in reverse order to avoid index shifting problems
  const sortedActions = [...plan.actions].sort((a, b) => {
    // Process cuts first, then merges, to simplify index management
    // Within each type, process from highest scene number to lowest
    const typeOrder = { cut: 0, merge: 1, rewrite: 2 }
    const typeA = typeOrder[a.action] ?? 99
    const typeB = typeOrder[b.action] ?? 99
    if (typeA !== typeB) return typeA - typeB
    return Math.max(...b.sceneNumbers) - Math.max(...a.sceneNumbers)
  })
  
  // First pass: collect all scene numbers being merged or cut
  const mergedInto = new Map<number, number>() // source scene → target scene
  const cutScenes = new Set<number>()
  const rewriteScenes = new Map<number, string>() // scene number → rewrite focus
  
  for (const action of sortedActions) {
    if (action.action === 'cut') {
      for (const num of action.sceneNumbers) cutScenes.add(num)
    } else if (action.action === 'merge') {
      const target = action.sceneNumbers[0] // merge into first scene
      for (let i = 1; i < action.sceneNumbers.length; i++) {
        mergedInto.set(action.sceneNumbers[i], target)
      }
    } else if (action.action === 'rewrite') {
      for (const num of action.sceneNumbers) {
        rewriteScenes.set(num, action.rewriteFocus || action.rationale)
      }
    }
  }
  
  // Execute merges: combine dialogue, action, narration from source into target
  for (const action of sortedActions) {
    if (action.action !== 'merge') continue
    
    const targetIdx = action.sceneNumbers[0] - 1 // 0-indexed
    const targetScene = result[targetIdx]
    if (!targetScene) continue
    
    const sourceIndices = action.sceneNumbers.slice(1).map(n => n - 1)
    
    // Combine content from source scenes into target
    const allDialogue = [...(targetScene.dialogue || [])]
    let combinedAction = targetScene.action || ''
    let combinedNarration = action.mergedContent || targetScene.narration || ''
    let combinedDuration = targetScene.duration || 0
    
    for (const srcIdx of sourceIndices) {
      const src = result[srcIdx]
      if (!src) continue
      
      // Merge dialogue (append source dialogue, removing exact duplicates)
      const existingLines = new Set(allDialogue.map((d: any) => `${d.character}:${d.line}`))
      for (const d of (src.dialogue || [])) {
        const key = `${d.character}:${d.line}`
        if (!existingLines.has(key)) {
          allDialogue.push(d)
          existingLines.add(key)
        }
      }
      
      // Append unique action content
      if (src.action && !combinedAction.includes(src.action.substring(0, 50))) {
        combinedAction += ' ' + src.action
      }
      
      combinedDuration += (src.duration || 0)
    }
    
    // Update target scene
    result[targetIdx] = {
      ...targetScene,
      heading: action.mergedHeading || targetScene.heading,
      action: combinedAction.trim(),
      narration: combinedNarration,
      dialogue: allDialogue,
      duration: Math.min(combinedDuration, 60), // Cap merged scene duration
      _merged: true, // Flag for the polish pass to know this needs deeper rewriting
      _mergeNote: action.mergedContent || action.rationale,
    }
    
    changesSummary.push({
      category: 'Structure — Merge',
      changes: `Merged scenes ${action.sceneNumbers.join(' + ')} into scene ${action.sceneNumbers[0]}`,
      rationale: action.rationale
    })
  }
  
  // Execute rewrites: tag scenes for the polish pass
  for (const action of sortedActions) {
    if (action.action !== 'rewrite') continue
    for (const num of action.sceneNumbers) {
      const idx = num - 1
      if (result[idx]) {
        result[idx] = {
          ...result[idx],
          _rewrite: true,
          _rewriteFocus: action.rewriteFocus || action.rationale,
        }
        changesSummary.push({
          category: 'Structure — Rewrite',
          changes: `Scene ${num} flagged for structural rewrite: ${action.rewriteFocus || action.rationale}`,
          rationale: action.rationale
        })
      }
    }
  }
  
  // Remove merged-away and cut scenes (iterate backward to preserve indices)
  const indicesToRemove = new Set<number>()
  for (const [srcNum] of mergedInto) indicesToRemove.add(srcNum - 1)
  for (const cutNum of cutScenes) indicesToRemove.add(cutNum - 1)
  
  // Add cut change summaries
  for (const action of sortedActions) {
    if (action.action === 'cut') {
      changesSummary.push({
        category: 'Structure — Cut',
        changes: `Removed scene${action.sceneNumbers.length > 1 ? 's' : ''} ${action.sceneNumbers.join(', ')}`,
        rationale: action.rationale
      })
    }
  }
  
  // Filter out removed scenes and renumber
  result = result.filter((_, idx) => !indicesToRemove.has(idx))
  
  // Renumber scenes
  result = result.map((scene, idx) => ({
    ...scene,
    sceneNumber: idx + 1,
  }))
  
  const removedCount = scenes.length - result.length
  if (removedCount > 0) {
    console.log(`[Structural Pre-Pass] Executed plan: ${scenes.length} → ${result.length} scenes (${removedCount} removed via merge/cut)`)
  }
  
  return { scenes: result, changesSummary }
}

async function optimizeBatch(
  batchScenes: any[],
  startIdx: number,
  sharedContext: string,
  allOriginalScenes: any[],
  previousOptimizedScenes: any[],
  compact: boolean,
  remainingMs: number = 540_000,
  sceneAnalysis: SceneAnalysis[] = [],
  audienceReview?: Review | null  // Add audienceReview for inline recommendation binding
): Promise<{ scenes: any[], changesSummary?: any[] }> {
  
  // Build context from adjacent scenes for continuity
  const prevSceneSummary = startIdx > 0 
    ? `Previous scene: ${allOriginalScenes[startIdx - 1]?.heading || 'Unknown'} - ${(allOriginalScenes[startIdx - 1]?.action || '').substring(0, 100)}...`
    : 'This is the start of the script.'
    
  const nextSceneIdx = startIdx + batchScenes.length
  const nextSceneSummary = nextSceneIdx < allOriginalScenes.length
    ? `Next scene: ${allOriginalScenes[nextSceneIdx]?.heading || 'Unknown'} - ${(allOriginalScenes[nextSceneIdx]?.action || '').substring(0, 100)}...`
    : 'This is the end of the script.'
  
  // Build the batch-specific content WITH INLINE RECOMMENDATIONS
  // This is the key improvement: bind recommendations directly to each scene so the model
  // can't miss them or get confused about which scene they apply to
  const scenesContent = batchScenes.map((scene: any, idx: number) => {
    const sceneNum = startIdx + idx + 1
    const dialogueLines = (scene.dialogue || []).map((d: any) => 
      `  ${d.character}: "${d.line}"`
    ).join('\n')
    
    // Find recommendations that specifically target THIS scene
    let inlineFixes = ''
    if (audienceReview?.recommendations) {
      const sceneRecs = audienceReview.recommendations.filter((r: any) => {
        if (typeof r === 'string') return false
        return r.sceneNumbers?.includes(sceneNum)
      })
      
      const criticalRecs = sceneRecs.filter((r: any) => r.priority === 'critical')
      const highRecs = sceneRecs.filter((r: any) => r.priority === 'high')
      
      if (criticalRecs.length > 0 || highRecs.length > 0) {
        inlineFixes = `\n\n>>> MANDATORY FIXES FOR THIS SCENE <<<`
        for (const rec of criticalRecs) {
          inlineFixes += `\n🔴 CRITICAL: ${rec.text}`
        }
        for (const rec of highRecs) {
          inlineFixes += `\n🟠 HIGH: ${rec.text}`
        }
        inlineFixes += `\n>>> YOU MUST REWRITE THIS SCENE TO ADDRESS THE ABOVE <<<\n`
      }
    }
    
    return `
--- SCENE ${sceneNum}: ${scene.heading || 'Untitled'} ---${inlineFixes}
Action: ${scene.action || 'None'}
Narration: ${scene.narration || 'None'}
Dialogue:
${dialogueLines || '  (no dialogue)'}
Music: ${scene.music || 'None'}
SFX: ${Array.isArray(scene.sfx) ? scene.sfx.join(', ') : scene.sfx || 'None'}
Duration: ${scene.duration || 0}s`
  }).join('\n')
  
  // Build per-scene review notes for scenes in this batch
  let perSceneNotes = ''
  if (sceneAnalysis.length > 0) {
    const batchNotes = sceneAnalysis
      .filter(sa => sa.sceneNumber >= startIdx + 1 && sa.sceneNumber <= startIdx + batchScenes.length)
    if (batchNotes.length > 0) {
      perSceneNotes = `\n=== PER-SCENE REVIEW FEEDBACK (apply targeted fixes) ===\n` +
        batchNotes.map(sa => 
          `Scene ${sa.sceneNumber} (${sa.sceneHeading}): Score ${sa.score}/100 | Pacing: ${sa.pacing} | Tension: ${sa.tension} | Character Dev: ${sa.characterDevelopment} | Visual: ${sa.visualPotential}\n  \u2192 ${sa.notes}`
        ).join('\n') + '\n'
    }
  }

  // Add structural rewrite/merge instructions for scenes that were flagged
  let structuralNotes = ''
  const flaggedScenes = batchScenes.filter((s: any) => s._merged || s._rewrite)
  if (flaggedScenes.length > 0) {
    structuralNotes = `\n=== STRUCTURAL REWRITE REQUIRED ===\n`
    for (const scene of batchScenes) {
      const sceneNum = startIdx + batchScenes.indexOf(scene) + 1
      if (scene._merged) {
        structuralNotes += `Scene ${sceneNum} was MERGED from multiple scenes. DEEPLY REWRITE this scene:\n  - Eliminate redundant dialogue beats that repeat the same argument\n  - Ensure the scene escalates through distinct emotional phases\n  - Tighten dialogue — the combined content is too long, distill to the strongest lines\n  - Guidance: ${scene._mergeNote || 'Merge redundant content into a cohesive, escalating scene'}\n`
      }
      if (scene._rewrite) {
        structuralNotes += `Scene ${sceneNum} needs STRUCTURAL REWRITE:\n  - ${scene._rewriteFocus}\n  - Transform the scene fundamentally, not just polish\n`
      }
    }
  }

  const prompt = `${sharedContext}

=== SCENES TO REWRITE ===
${scenesContent}
${perSceneNotes}${structuralNotes}
=== CONTINUITY ===
${prevSceneSummary}
${nextSceneSummary}

=== OUTPUT FORMAT ===
Return ONLY valid JSON (no markdown):
{
  "scenes": [
    {
      "heading": "INT. LOCATION - TIME",
      "action": "Physical actions and visual descriptions",
      "narration": "Brief narration (1 sentence, no emotional adjectives)",
      "dialogue": [
        { "character": "NAME", "line": "[emotion] Dialogue text" }
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

RULES:
• Output EXACTLY ${batchScenes.length} scene(s)
• Preserve duration values  
• All dialogue needs [emotion] tags
• Escape quotes in JSON
• Narration: 1 sentence max, never empty`

  // Token budget: 3500 per scene + 5000 base
  const estimatedTokens = Math.min(32768, batchScenes.length * 3500 + 5000)
  const baseTimeout = Math.min(180000, 60000 + batchScenes.length * 15000)
  // Cap per-batch timeout to remaining global deadline minus safety margin
  const timeoutMs = Math.min(baseTimeout, remainingMs - 10_000)
  
  console.log(`[Script Optimization] Batch call: ${batchScenes.length} scenes, ${estimatedTokens} tokens, ${timeoutMs/1000}s timeout, ${Math.round(remainingMs/1000)}s remaining`)
  
  // Temperature: 0.7 for merged/rewritten scenes, 0.6 for normal optimization
  // Moderate temperature balances creativity with consistency
  const hasFlaggedScenes = batchScenes.some((s: any) => s._merged || s._rewrite)
  const temperature = hasFlaggedScenes ? 0.7 : 0.6
  
  // First attempt - using Gemini 2.5 Flash for optimization
  let result = await generateText(prompt, {
    model: 'gemini-2.5-flash',
    temperature,
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
        temperature,
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
    // Strip internal structural flags
    delete merged._merged
    delete merged._mergeNote
    delete merged._rewrite
    delete merged._rewriteFocus
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

// ============================================================
// POST-OPTIMIZATION VERIFICATION: Check if recommendations were implemented
// ============================================================

interface VerificationResult {
  implementedCount: number
  totalMandatory: number
  missingRecommendations: string[]
  summary: string
}

function verifyOptimizationResults(
  originalScript: any,
  optimizedScenes: any[],
  audienceReview?: Review | null
): VerificationResult {
  const result: VerificationResult = {
    implementedCount: 0,
    totalMandatory: 0,
    missingRecommendations: [],
    summary: ''
  }
  
  if (!audienceReview?.recommendations) {
    result.summary = 'No recommendations to verify'
    return result
  }
  
  // Get critical and high priority recommendations
  const mandatoryRecs = audienceReview.recommendations.filter(
    (r: any) => r.priority === 'critical' || r.priority === 'high'
  )
  
  result.totalMandatory = mandatoryRecs.length
  
  if (mandatoryRecs.length === 0) {
    result.summary = 'No mandatory recommendations to verify'
    return result
  }
  
  // Build optimized script text for comparison
  const optimizedText = optimizedScenes.map((scene: any, idx: number) => {
    const dialogue = (scene.dialogue || []).map((d: any) => `${d.character}: ${d.line}`).join(' ')
    return `Scene ${idx + 1}: ${scene.heading || ''} ${scene.action || ''} ${scene.narration || ''} ${dialogue}`
  }).join('\n').toLowerCase()
  
  const originalText = (originalScript.scenes || []).map((scene: any, idx: number) => {
    const dialogue = (scene.dialogue || []).map((d: any) => `${d.character}: ${d.line}`).join(' ')
    return `Scene ${idx + 1}: ${scene.heading || ''} ${scene.action || ''} ${scene.narration || ''} ${dialogue}`
  }).join('\n').toLowerCase()
  
  // Check each mandatory recommendation for evidence of implementation
  for (const rec of mandatoryRecs) {
    const recText = (rec.text || '').toLowerCase()
    let implemented = false
    
    // Look for keywords from the recommendation in the optimized script
    // that weren't in the original (indicates new content was added)
    const keywords = extractKeywordsFromRecommendation(recText)
    
    for (const keyword of keywords) {
      const inOriginal = originalText.includes(keyword)
      const inOptimized = optimizedText.includes(keyword)
      
      // If keyword appears in optimized but not original, likely implemented
      if (inOptimized && !inOriginal) {
        implemented = true
        break
      }
    }
    
    // Additional heuristics for specific recommendation types
    if (!implemented) {
      if (recText.includes('subtext') || recText.includes('indirect')) {
        // Check for increased dialogue variation or parentheticals
        const originalParenCount = (originalText.match(/\([^)]+\)/g) || []).length
        const optimizedParenCount = (optimizedText.match(/\([^)]+\)/g) || []).length
        if (optimizedParenCount > originalParenCount) {
          implemented = true
        }
      }
      
      if (recText.includes('visual') || recText.includes('show')) {
        // Check for increased action line content
        const originalActionWords = originalScript.scenes?.reduce((sum: number, s: any) => 
          sum + (s.action?.split(/\s+/).length || 0), 0) || 0
        const optimizedActionWords = optimizedScenes.reduce((sum: number, s: any) => 
          sum + (s.action?.split(/\s+/).length || 0), 0)
        if (optimizedActionWords > originalActionWords * 1.1) { // 10% increase
          implemented = true
        }
      }
      
      if (recText.includes('voice') || recText.includes('distinct') || recText.includes('differentiate')) {
        // Check for verbal tics or unique speech patterns
        const uniqueDialoguePatterns = new Set<string>()
        for (const scene of optimizedScenes) {
          for (const d of scene.dialogue || []) {
            if (d.line) {
              // Look for verbal tics, distinct phrases
              const tics = d.line.match(/\b(you know|actually|frankly|indeed|surely|well|look|listen)\b/gi)
              if (tics) {
                tics.forEach((t: string) => uniqueDialoguePatterns.add(`${d.character}:${t.toLowerCase()}`))
              }
            }
          }
        }
        if (uniqueDialoguePatterns.size >= 2) {
          implemented = true
        }
      }
    }
    
    if (implemented) {
      result.implementedCount++
    } else {
      result.missingRecommendations.push(rec.text)
    }
  }
  
  const percentage = result.totalMandatory > 0 
    ? Math.round((result.implementedCount / result.totalMandatory) * 100)
    : 100
  
  result.summary = `Verification: ${result.implementedCount}/${result.totalMandatory} mandatory recommendations implemented (${percentage}%)`
  
  if (result.missingRecommendations.length > 0) {
    console.warn(`[Script Optimization] Verification found ${result.missingRecommendations.length} potentially unimplemented recommendations:`)
    result.missingRecommendations.forEach((r, i) => console.warn(`  ${i + 1}. ${r.substring(0, 80)}...`))
  }
  
  return result
}

function extractKeywordsFromRecommendation(recText: string): string[] {
  // Extract meaningful keywords from recommendation text
  const stopWords = new Set(['the', 'a', 'an', 'to', 'for', 'in', 'on', 'at', 'by', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'add', 'show', 'make', 'ensure', 'include', 'consider', 'try', 'use', 'create', 'this', 'that', 'these', 'those', 'it', 'its', 'of', 'and', 'or', 'but', 'not', 'no', 'yes', 'more', 'less', 'most', 'least', 'very', 'too', 'also', 'just', 'only', 'even', 'still', 'already', 'scene', 'scenes', 'dialogue', 'character', 'characters'])
  
  const words = recText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))
  
  // Return unique words, limited to most specific ones
  return [...new Set(words)].slice(0, 5)
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

