import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, DEFAULT_MAX_EPISODES, SeriesEpisodeBlueprint, SeriesCharacter } from '@/models/Series'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow longer runtime for AI generation

/**
 * Safely parse JSON from LLM responses
 * Handles markdown code blocks, trailing text, and malformed JSON
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
    
    // Find JSON boundaries
    const firstBrace = cleaned.indexOf('{')
    let lastBrace = cleaned.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let json = cleaned.slice(firstBrace, lastBrace + 1)
      
      // Fix 1: Remove trailing commas before ] or }
      json = json.replace(/,(\s*[\]\}])/g, '$1')
      
      // Fix 2: Try to balance brackets if truncated
      const openBrackets = (json.match(/\[/g) || []).length
      const closeBrackets = (json.match(/\]/g) || []).length
      const openBraces = (json.match(/\{/g) || []).length
      const closeBraces = (json.match(/\}/g) || []).length
      
      // If arrays are unbalanced, try to close them
      if (openBrackets > closeBrackets) {
        console.log(`[safeParseJSON] Unbalanced arrays: ${openBrackets} open, ${closeBrackets} closed`)
        // Find the last complete array element and truncate there
        const lastCompleteStatus = json.lastIndexOf('"status": "blueprint"')
        if (lastCompleteStatus !== -1) {
          // Find the closing brace after this
          const closeAfterStatus = json.indexOf('}', lastCompleteStatus)
          if (closeAfterStatus !== -1) {
            json = json.slice(0, closeAfterStatus + 1)
            // Add missing closing brackets
            json += ']}'
            console.log('[safeParseJSON] Truncated to last complete episode')
          }
        }
      }
      
      // Fix 3: Remove any incomplete object at the end
      json = json.replace(/,\s*\{[^}]*$/g, '')
      
      try {
        return JSON.parse(json)
      } catch (e2) {
        console.error('[safeParseJSON] Failed after repairs:', (e2 as Error).message)
        console.error('[safeParseJSON] Text length:', text.length, 'JSON length:', json.length)
        console.error('[safeParseJSON] Last 200 chars:', json.slice(-200))
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
        // Inform if more episodes were requested than generated
        note: targetEpisodeCount > 10 && generatedData.episodeBlueprints?.length <= 10
          ? `Generated ${generatedData.episodeBlueprints?.length || 0} episodes initially. Use regenerateField='episodes' to add more.`
          : undefined
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
 * Note: For >10 episodes, we generate in phases to avoid LLM token limits
 */
async function generateFullSeriesStoryline(
  topic: string,
  episodeCount: number,
  options: { genre?: string; tone?: string }
): Promise<any> {
  // Limit first generation to 10 episodes max to avoid token limits
  // Additional episodes can be generated later
  const initialEpisodeCount = Math.min(episodeCount, 10)
  
  const prompt = `You are a professional TV series writer. Create a series bible.

TOPIC: ${topic}
${options.genre ? `GENRE: ${options.genre}` : ''}
${options.tone ? `TONE: ${options.tone}` : ''}
EPISODES TO GENERATE: ${initialEpisodeCount}

Generate:
1. Series title
2. Logline (1-2 sentences)
3. Setting, Protagonist (name, goal, flaw), Antagonist/Conflict
4. Synopsis (2 paragraphs)
5. ${initialEpisodeCount} episodes with: title, logline, synopsis, 3 beats

IMPORTANT: Return ONLY valid JSON. No markdown, no extra text.

{
  "title": "Series Title",
  "logline": "Hook",
  "genre": "Genre",
  "productionBible": {
    "logline": "Hook",
    "synopsis": "Synopsis...",
    "setting": "Setting",
    "timeframe": "When",
    "protagonist": {"characterId": "char_1", "name": "Name", "goal": "Goal", "flaw": "Flaw"},
    "antagonistConflict": {"type": "character", "description": "Conflict", "characterId": "char_2"},
    "characters": [
      {"id": "char_1", "name": "Name", "role": "protagonist", "description": "Desc", "appearance": "Look"}
    ],
    "locations": [
      {"id": "loc_1", "name": "Name", "description": "Desc", "visualDescription": "Visual"}
    ],
    "toneGuidelines": "Tone",
    "visualGuidelines": "Visual style"
  },
  "episodeBlueprints": [
    {
      "id": "ep_1",
      "episodeNumber": 1,
      "title": "Title",
      "logline": "Hook",
      "synopsis": "Synopsis",
      "beats": [
        {"beatNumber": 1, "title": "Opening", "description": "Desc", "act": 1},
        {"beatNumber": 2, "title": "Conflict", "description": "Desc", "act": 2},
        {"beatNumber": 3, "title": "Resolution", "description": "Desc", "act": 3}
      ],
      "characters": [{"characterId": "char_1", "role": "protagonist"}],
      "status": "blueprint"
    }
  ]
}`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    prompt
  )
  
  const parsed = safeParseJSON(response)
  
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
      status: 'blueprint'
    }))
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
