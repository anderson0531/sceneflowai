import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, DEFAULT_MAX_EPISODES, SeriesEpisodeBlueprint, SeriesCharacter } from '@/models/Series'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'
import { StoryThread } from '@/types/series'

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // Allow 10 minutes for full series generation

// Generation configuration
const EPISODE_BATCH_SIZE = 5 // Generate in batches of 5 for reliable JSON parsing
const MAX_OUTPUT_TOKENS = 16384 // Token limit for series generation
const GENERATION_TIMEOUT_MS = 90000 // 90 second timeout per batch

/**
 * Safely parse JSON from LLM responses
 * Handles markdown code blocks, trailing text, truncated JSON, and malformed responses
 */
function safeParseJSON(text: string): any {
  let cleaned = text.trim()
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.log('[safeParseJSON] Direct parse failed, attempting repair...')
    
    // Find JSON boundaries - prefer arrays for episode lists
    const firstBracket = cleaned.indexOf('[')
    const firstBrace = cleaned.indexOf('{')
    const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)
    
    const startIndex = isArray ? firstBracket : firstBrace
    const endIndex = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}')
    
    if (startIndex !== -1 && endIndex > startIndex) {
      let json = cleaned.slice(startIndex, endIndex + 1)
      
      // Fix 1: Remove trailing commas before ] or }
      json = json.replace(/,(\s*[\]\}])/g, '$1')
      
      // Fix 2: Check for unbalanced brackets (truncated response)
      const openBrackets = (json.match(/\[/g) || []).length
      const closeBrackets = (json.match(/\]/g) || []).length
      const openBraces = (json.match(/\{/g) || []).length
      const closeBraces = (json.match(/\}/g) || []).length
      
      // If significantly unbalanced, response was truncated
      if (openBrackets > closeBrackets || openBraces > closeBraces) {
        console.log(`[safeParseJSON] Unbalanced: arrays [${openBrackets}/${closeBrackets}], braces {${openBraces}/${closeBraces}}`)
        
        // Find the last complete episode in episodeBlueprints array
        const lastCompleteStatus = json.lastIndexOf('"status"')
        if (lastCompleteStatus !== -1) {
          // Find the closing brace of this episode object by tracking brace depth
          let braceCount = 0
          let foundStart = false
          let episodeEnd = lastCompleteStatus
          
          for (let i = lastCompleteStatus; i < json.length; i++) {
            if (json[i] === '{') {
              braceCount++
              foundStart = true
            } else if (json[i] === '}') {
              braceCount--
              if (foundStart && braceCount === 0) {
                episodeEnd = i
                break
              }
            }
          }
          
          // Truncate to this episode
          json = json.slice(0, episodeEnd + 1)
          
          // Close the episodeBlueprints array and root object
          if (!json.endsWith(']}')) {
            if (json.includes('"episodeBlueprints"')) {
              json += ']}'
            } else if (isArray) {
              json += ']'
            } else {
              json += '}'
            }
          }
          
          console.log('[safeParseJSON] Truncated to last complete episode, adding closing brackets')
        }
      }
      
      // Fix 3: Remove any incomplete object at the end
      json = json.replace(/,\s*\{[^}]*$/g, '')
      
      // Fix 4: Ensure episodeBlueprints array is properly closed
      const epBlueprintStart = json.indexOf('"episodeBlueprints"')
      if (epBlueprintStart !== -1) {
        const arrayStart = json.indexOf('[', epBlueprintStart)
        if (arrayStart !== -1) {
          let bracketCount = 0
          for (let i = arrayStart; i < json.length; i++) {
            if (json[i] === '[') bracketCount++
            else if (json[i] === ']') bracketCount--
          }
          
          // Add missing closing brackets
          while (bracketCount > 0) {
            const lastObjClose = json.lastIndexOf('}')
            if (lastObjClose > 0 && json[lastObjClose + 1] !== ']') {
              json = json.slice(0, lastObjClose + 1) + ']}'
            }
            bracketCount--
          }
        }
      }
      
      try {
        return JSON.parse(json)
      } catch (e2) {
        console.error('[safeParseJSON] Failed after repairs:', (e2 as Error).message)
        console.error('[safeParseJSON] Text length:', text.length, 'JSON length:', json.length)
        console.error('[safeParseJSON] Last 300 chars:', json.slice(-300))
        throw new Error(`Invalid JSON from LLM: ${(e2 as Error).message}`)
      }
    }
    throw new Error('No valid JSON object found in LLM response')
  }
}

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * POST /api/series/[seriesId]/generate
 * 
 * Generate or regenerate series storyline using AI
 * 
 * Body:
 * - topic: Required. The topic/concept for the series
 * - episodeCount: Optional. Number of episodes to generate (default: series.max_episodes, max: 20)
 * - regenerateField: Optional. Specific field to regenerate ('title', 'logline', 'synopsis', 'protagonist', 'antagonist', 'setting', 'episodes', 'characters')
 * - preserveExisting: Optional. Whether to preserve existing data when regenerating (default: false)
 * - genre: Optional. Genre hint for generation
 * - tone: Optional. Tone hint (e.g., 'dramatic', 'comedic', 'dark')
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const body = await request.json()
    const {
      topic,
      episodeCount,
      regenerateField,
      preserveExisting = false,
      genre,
      tone
    } = body
    
    if (!topic && !regenerateField) {
      return NextResponse.json({
        success: false,
        error: 'Either topic or regenerateField is required'
      }, { status: 400 })
    }
    
    const targetEpisodeCount = Math.min(
      episodeCount || series.max_episodes,
      DEFAULT_MAX_EPISODES
    )
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/generate] Generating storyline for topic: "${topic}", episodes: ${targetEpisodeCount}`)
    
    // Build the generation prompt based on what needs to be generated
    let generatedData: any
    
    if (regenerateField) {
      // Regenerate specific field
      generatedData = await regenerateSpecificField(
        series,
        regenerateField,
        topic || series.production_bible?.synopsis || series.title,
        { genre, tone, targetEpisodeCount }
      )
    } else {
      // Generate full series storyline
      generatedData = await generateFullSeriesStoryline(
        topic,
        targetEpisodeCount,
        { genre, tone }
      )
    }
    
    // Merge generated data with existing series
    const currentBible = series.production_bible || {}
    const updatedBible = preserveExisting
      ? { ...currentBible, ...generatedData.productionBible }
      : { ...generatedData.productionBible }
    
    updatedBible.version = incrementVersion(currentBible.version || '1.0.0')
    updatedBible.lastUpdated = new Date().toISOString()
    
    // Update series with generated data
    const updates: any = {
      production_bible: updatedBible,
      metadata: {
        ...series.metadata,
        lastGeneration: {
          timestamp: new Date().toISOString(),
          topic,
          regenerateField,
          episodeCount: targetEpisodeCount
        }
      }
    }
    
    if (generatedData.title && !preserveExisting) {
      updates.title = generatedData.title
    }
    if (generatedData.logline && !preserveExisting) {
      updates.logline = generatedData.logline
    }
    if (generatedData.genre && !series.genre) {
      updates.genre = generatedData.genre
    }
    if (generatedData.episodeBlueprints) {
      updates.episode_blueprints = preserveExisting
        ? mergeEpisodeBlueprints(series.episode_blueprints || [], generatedData.episodeBlueprints)
        : generatedData.episodeBlueprints
    }
    
    await series.update(updates)
    await series.reload()
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/generate] Generation complete`)
    
    return NextResponse.json({
      success: true,
      series: formatSeriesResponse(series),
      generated: {
        fields: Object.keys(generatedData),
        episodeCount: generatedData.episodeBlueprints?.length || 0,
        model: 'gemini-2.5-pro',
        batchSize: EPISODE_BATCH_SIZE
      }
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/generate] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Generate full series storyline from topic
 * Uses Gemini 2.5 Pro for highest intelligence in narrative coherence.
 * Generates episodes in batches for reliable JSON parsing and continuity.
 */
async function generateFullSeriesStoryline(
  topic: string,
  episodeCount: number,
  options: { genre?: string; tone?: string }
): Promise<any> {
  console.log(`[generateFullSeriesStoryline] Generating ${episodeCount} episodes with Pro model`)
  
  // Phase 1: Generate series bible and first batch of episodes
  const firstBatchSize = Math.min(episodeCount, EPISODE_BATCH_SIZE)
  
  const biblePrompt = `You are an expert TV series showrunner creating a comprehensive series bible.

TOPIC: ${topic}
${options.genre ? `GENRE: ${options.genre}` : ''}
${options.tone ? `TONE: ${options.tone}` : ''}
TOTAL PLANNED EPISODES: ${episodeCount}
EPISODES TO GENERATE NOW: ${firstBatchSize}

Create a series bible that can sustain ${episodeCount} episodes with compelling story arcs.

Generate:
1. Series title (memorable, evocative)
2. Logline (1-2 sentences, hooks the audience)
3. Setting (vivid, specific), Protagonist (name, goal, fatal flaw), Antagonist/Conflict
4. Synopsis (2 paragraphs covering the full series arc)
5. ${firstBatchSize} episodes with:
   - title, logline, synopsis
   - 3 story beats (opening/conflict/resolution)
   - storyThreads: ongoing narrative threads introduced or developed
   - plotDevelopments: key events affecting future episodes
   - episodeHook: cliffhanger or setup for next episode

CRITICAL: Each episode must advance the overall series arc. Include "storyThreads" to track ongoing plots.

Return ONLY valid JSON:
{
  "title": "Series Title",
  "logline": "Hook that sells the series",
  "genre": "Genre",
  "productionBible": {
    "logline": "Hook",
    "synopsis": "Full series arc synopsis...",
    "setting": "Where and when",
    "timeframe": "Time period",
    "protagonist": {"characterId": "char_1", "name": "Name", "goal": "What they want", "flaw": "Fatal flaw"},
    "antagonistConflict": {"type": "character|nature|society|self|technology", "description": "Central conflict", "characterId": "char_2"},
    "characters": [
      {"id": "char_1", "name": "Name", "role": "protagonist", "description": "Character arc", "appearance": "Visual look", "personality": "Traits"},
      {"id": "char_2", "name": "Name", "role": "antagonist", "description": "Motivation", "appearance": "Look", "personality": "Traits"}
    ],
    "locations": [
      {"id": "loc_1", "name": "Name", "description": "Significance", "visualDescription": "Visual style"}
    ],
    "toneGuidelines": "Emotional tone and style",
    "visualGuidelines": "Cinematography and visual approach",
    "seriesArcs": ["Main arc description", "Subplot arc description"]
  },
  "episodeBlueprints": [
    {
      "id": "ep_1",
      "episodeNumber": 1,
      "title": "Episode Title",
      "logline": "One sentence hook",
      "synopsis": "Full episode summary",
      "beats": [
        {"beatNumber": 1, "title": "Opening", "description": "Setup", "act": 1},
        {"beatNumber": 2, "title": "Conflict", "description": "Rising action", "act": 2},
        {"beatNumber": 3, "title": "Resolution", "description": "Climax/cliffhanger", "act": 3}
      ],
      "characters": [{"characterId": "char_1", "role": "protagonist"}],
      "storyThreads": [{"id": "thread_1", "name": "Thread Name", "type": "main|subplot|character|mystery|romance", "status": "introduced|developing|climax|resolved", "description": "What this thread explores"}],
      "plotDevelopments": ["Key event 1", "Key revelation 2"],
      "episodeHook": "Cliffhanger or setup for next episode",
      "status": "blueprint"
    }
  ]
}`

  const bibleResponse = await callLLM(
    { 
      provider: 'gemini', 
      model: 'gemini-2.5-flash',  // Use Flash for speed, Pro too slow for Vercel
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      timeoutMs: GENERATION_TIMEOUT_MS
    },
    biblePrompt
  )
  
  const parsed = safeParseJSON(bibleResponse)
  
  // Ensure IDs are properly set
  if (parsed.productionBible?.characters) {
    parsed.productionBible.characters = parsed.productionBible.characters.map((char: any, i: number) => ({
      ...char,
      id: char.id || `char_${i}_${uuidv4().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  }
  
  if (parsed.productionBible?.locations) {
    parsed.productionBible.locations = parsed.productionBible.locations.map((loc: any, i: number) => ({
      ...loc,
      id: loc.id || `loc_${i}_${uuidv4().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))
  }
  
  if (parsed.episodeBlueprints) {
    parsed.episodeBlueprints = parsed.episodeBlueprints.map((ep: any, i: number) => ({
      ...ep,
      id: ep.id || `ep_${i + 1}_${uuidv4().slice(0, 8)}`,
      episodeNumber: ep.episodeNumber || i + 1,
      status: 'blueprint',
      storyThreads: ep.storyThreads || [],
      plotDevelopments: ep.plotDevelopments || [],
      episodeHook: ep.episodeHook || ''
    }))
  }
  
  // Phase 2: Generate remaining episodes in batches if needed
  let generatedCount = parsed.episodeBlueprints?.length || 0
  
  while (generatedCount < episodeCount) {
    const remainingCount = episodeCount - generatedCount
    const batchSize = Math.min(remainingCount, EPISODE_BATCH_SIZE)
    const startEpisodeNum = generatedCount + 1
    
    console.log(`[generateFullSeriesStoryline] Generating batch: episodes ${startEpisodeNum}-${startEpisodeNum + batchSize - 1}`)
    
    // Build continuity context from existing episodes
    const existingEpisodes = parsed.episodeBlueprints || []
    const recentEpisodes = existingEpisodes.slice(-3)
    const episodeSummaries = recentEpisodes
      .map((ep: any) => `Ep ${ep.episodeNumber}: "${ep.title}" - ${ep.logline}${ep.episodeHook ? ` [Hook: ${ep.episodeHook}]` : ''}`)
      .join('\n')
    
    // Gather active story threads
    const activeThreads: StoryThread[] = []
    for (const ep of existingEpisodes) {
      if (ep.storyThreads) {
        for (const thread of ep.storyThreads) {
          const existing = activeThreads.find(t => t.id === thread.id || t.name === thread.name)
          if (existing) {
            existing.status = thread.status
          } else if (thread.status !== 'resolved') {
            activeThreads.push(thread)
          }
        }
      }
    }
    
    const batchPrompt = `You are continuing an existing TV series with consistent story arcs.

SERIES: ${parsed.title}
LOGLINE: ${parsed.logline}
SYNOPSIS: ${parsed.productionBible?.synopsis || ''}
GENRE: ${parsed.genre || options.genre || 'Drama'}
TONE: ${parsed.productionBible?.toneGuidelines || options.tone || ''}

CHARACTERS:
${parsed.productionBible?.characters?.map((c: any) => `- ${c.name} (${c.role}): ${c.description}`).join('\n') || 'Not specified'}

PROTAGONIST: ${parsed.productionBible?.protagonist?.name || 'Not specified'} - Goal: ${parsed.productionBible?.protagonist?.goal || ''}, Flaw: ${parsed.productionBible?.protagonist?.flaw || ''}

ANTAGONIST/CONFLICT: ${parsed.productionBible?.antagonistConflict?.description || 'Not specified'}

PREVIOUS EPISODES (last 3):
${episodeSummaries || 'None'}

ACTIVE STORY THREADS:
${activeThreads.map(t => `- ${t.name} (${t.type}): ${t.status} - ${t.description || ''}`).join('\n') || 'None yet'}

TOTAL SERIES LENGTH: ${episodeCount} episodes
NOW GENERATING: Episodes ${startEpisodeNum} to ${startEpisodeNum + batchSize - 1}

Continue the narrative naturally. Each episode must:
1. Pick up from the previous episode's hook
2. Advance or resolve active story threads
3. Introduce new threads if appropriate (esp. in early/mid series)
4. End with a hook for the next episode (except finale)
5. Build toward series climax if approaching final episodes

Return ONLY valid JSON array:
[
  {
    "episodeNumber": ${startEpisodeNum},
    "title": "Episode Title",
    "logline": "One sentence hook",
    "synopsis": "Full episode summary that continues the story",
    "beats": [
      {"beatNumber": 1, "title": "Opening", "description": "Pickup from previous", "act": 1},
      {"beatNumber": 2, "title": "Conflict", "description": "Rising action", "act": 2},
      {"beatNumber": 3, "title": "Resolution", "description": "Climax/cliffhanger", "act": 3}
    ],
    "characters": [{"characterId": "char_1", "role": "protagonist"}],
    "storyThreads": [{"id": "thread_1", "name": "Name", "type": "main", "status": "developing", "description": "Progress"}],
    "plotDevelopments": ["Key event"],
    "episodeHook": "Setup for next episode",
    "status": "blueprint"
  }
]`

    const batchResponse = await callLLM(
      { 
        provider: 'gemini', 
        model: 'gemini-2.5-flash',  // Use Flash for speed
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        timeoutMs: GENERATION_TIMEOUT_MS
      },
      batchPrompt
    )
    
    const batchParsed = safeParseJSON(batchResponse)
    const newEpisodes = Array.isArray(batchParsed) ? batchParsed : (batchParsed.episodes || batchParsed.episodeBlueprints || [])
    
    // Add IDs and normalize
    const normalizedEpisodes = newEpisodes.map((ep: any, i: number) => ({
      ...ep,
      id: `ep_${startEpisodeNum + i}_${uuidv4().slice(0, 8)}`,
      episodeNumber: startEpisodeNum + i,
      status: 'blueprint',
      storyThreads: ep.storyThreads || [],
      plotDevelopments: ep.plotDevelopments || [],
      episodeHook: ep.episodeHook || ''
    }))
    
    parsed.episodeBlueprints = [...(parsed.episodeBlueprints || []), ...normalizedEpisodes]
    generatedCount = parsed.episodeBlueprints.length
    
    console.log(`[generateFullSeriesStoryline] Generated ${normalizedEpisodes.length} episodes, total: ${generatedCount}`)
  }
  
  return parsed
}

/**
 * Regenerate a specific field of the series
 */
async function regenerateSpecificField(
  series: Series,
  field: string,
  context: string,
  options: { genre?: string; tone?: string; targetEpisodeCount: number }
): Promise<any> {
  const currentBible = series.production_bible || {}
  
  // Limit episode generation to batches of 5 to avoid token limits
  const episodeBatchSize = Math.min(options.targetEpisodeCount, 5)
  
  const fieldPrompts: Record<string, string> = {
    title: `Generate a new series title for: ${context}\nCurrent title: ${series.title}\nReturn JSON: {"title": "New Title"}`,
    logline: `Generate a new logline for: ${context}\nReturn JSON: {"logline": "New logline"}`,
    synopsis: `Generate a new synopsis for: ${context}\nReturn JSON: {"productionBible": {"synopsis": "New synopsis"}}`,
    protagonist: `Generate a new protagonist for: ${context}\nReturn JSON matching the protagonist schema`,
    antagonist: `Generate a new antagonist/conflict for: ${context}\nReturn JSON matching the antagonistConflict schema`,
    setting: `Generate a new setting for: ${context}\nReturn JSON: {"productionBible": {"setting": "New setting", "timeframe": "Timeframe"}}`,
    episodes: `Generate ${episodeBatchSize} episode blueprints (simple: title, logline, synopsis, 3 beats each) for: ${context}\nSynopsis: ${currentBible.synopsis}\nReturn JSON: {"episodeBlueprints": [...]}`,
    characters: `Generate supporting characters for: ${context}\nExisting: ${JSON.stringify(currentBible.characters || [])}\nReturn JSON: {"productionBible": {"characters": [...]}}`
  }
  
  const prompt = fieldPrompts[field]
  if (!prompt) {
    throw new Error(`Unknown field to regenerate: ${field}`)
  }
  
  const fullPrompt = `You are a professional TV series writer. ${prompt}
${options.genre ? `Genre: ${options.genre}` : ''}
${options.tone ? `Tone: ${options.tone}` : ''}

Return ONLY valid JSON.`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    fullPrompt
  )
  
  return safeParseJSON(response)
}

/**
 * Merge new episode blueprints with existing ones
 */
function mergeEpisodeBlueprints(
  existing: SeriesEpisodeBlueprint[],
  generated: SeriesEpisodeBlueprint[]
): SeriesEpisodeBlueprint[] {
  const merged = [...existing]
  
  for (const newEp of generated) {
    const existingIndex = merged.findIndex(ep => ep.episodeNumber === newEp.episodeNumber)
    if (existingIndex >= 0) {
      // Don't overwrite started/completed episodes
      if (merged[existingIndex].status === 'blueprint') {
        merged[existingIndex] = { ...merged[existingIndex], ...newEp, id: merged[existingIndex].id }
      }
    } else {
      merged.push(newEp)
    }
  }
  
  return merged.sort((a, b) => a.episodeNumber - b.episodeNumber)
}

/**
 * Increment semantic version
 */
function incrementVersion(version: string): string {
  const parts = version.split('.')
  const patch = parseInt(parts[2] || '0', 10) + 1
  return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`
}

/**
 * Format series for API response
 */
function formatSeriesResponse(series: Series) {
  return {
    id: series.id,
    userId: series.user_id,
    title: series.title,
    logline: series.logline,
    genre: series.genre,
    targetAudience: series.target_audience,
    status: series.status,
    maxEpisodes: series.max_episodes,
    episodeCount: series.episode_blueprints?.length || 0,
    startedCount: series.episode_blueprints?.filter(ep => ep.projectId).length || 0,
    completedCount: series.episode_blueprints?.filter(ep => ep.status === 'completed').length || 0,
    productionBible: series.production_bible,
    episodeBlueprints: series.episode_blueprints,
    metadata: series.metadata,
    createdAt: series.created_at,
    updatedAt: series.updated_at
  }
}
