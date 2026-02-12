import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, DEFAULT_MAX_EPISODES, SeriesEpisodeBlueprint, SeriesCharacter } from '@/models/Series'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow longer runtime for AI generation

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
        episodeCount: generatedData.episodeBlueprints?.length || 0
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
 */
async function generateFullSeriesStoryline(
  topic: string,
  episodeCount: number,
  options: { genre?: string; tone?: string }
): Promise<any> {
  const prompt = `You are a professional TV series writer and showrunner. Create a complete series bible for a video series.

TOPIC/CONCEPT: ${topic}
${options.genre ? `GENRE: ${options.genre}` : ''}
${options.tone ? `TONE: ${options.tone}` : ''}
NUMBER OF EPISODES: ${episodeCount}

Generate a complete series storyline including:
1. Series title (creative, memorable)
2. Logline (1-2 sentences that hook the audience)
3. Setting (time, place, world)
4. Protagonist (name, goal, flaw, description, appearance)
5. Antagonist/Conflict (type, description, and if character-based: name and appearance)
6. Synopsis (2-3 paragraphs overview of the series arc)
7. For each episode (${episodeCount} total):
   - Episode title
   - Episode logline
   - Episode synopsis (1 paragraph)
   - 3-5 story beats with act numbers
   - Characters featured (referencing the protagonist/antagonist by ID)

Return ONLY valid JSON matching this exact schema:
{
  "title": "Series Title",
  "logline": "Compelling one-line hook",
  "genre": "Genre",
  "productionBible": {
    "logline": "Same as above",
    "synopsis": "Full series synopsis...",
    "setting": "Detailed setting description",
    "timeframe": "When the story takes place",
    "protagonist": {
      "characterId": "char_protagonist",
      "name": "Protagonist Name",
      "goal": "What they want",
      "flaw": "Their main flaw"
    },
    "antagonistConflict": {
      "type": "character|nature|society|self|technology",
      "description": "The main conflict",
      "characterId": "char_antagonist (if type is character)"
    },
    "characters": [
      {
        "id": "char_protagonist",
        "name": "Name",
        "role": "protagonist",
        "description": "Detailed character description",
        "appearance": "Physical appearance for visual consistency",
        "backstory": "Brief backstory",
        "personality": "Key personality traits"
      }
    ],
    "locations": [
      {
        "id": "loc_1",
        "name": "Location Name",
        "description": "Location description",
        "visualDescription": "Visual details for image generation"
      }
    ],
    "toneGuidelines": "Tone and mood guidelines",
    "visualGuidelines": "Visual style guidelines"
  },
  "episodeBlueprints": [
    {
      "id": "ep_1",
      "episodeNumber": 1,
      "title": "Episode Title",
      "logline": "Episode hook",
      "synopsis": "Episode synopsis",
      "beats": [
        {"beatNumber": 1, "title": "Beat Title", "description": "Beat description", "act": 1}
      ],
      "characters": [
        {"characterId": "char_protagonist", "role": "protagonist", "episodeArc": "Character's journey this episode"}
      ],
      "status": "blueprint"
    }
  ]
}`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20' },
    prompt
  )
  
  const parsed = JSON.parse(response)
  
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
  
  const fieldPrompts: Record<string, string> = {
    title: `Generate a new series title for: ${context}\nCurrent title: ${series.title}\nReturn JSON: {"title": "New Title"}`,
    logline: `Generate a new logline for: ${context}\nReturn JSON: {"logline": "New logline"}`,
    synopsis: `Generate a new synopsis for: ${context}\nReturn JSON: {"productionBible": {"synopsis": "New synopsis"}}`,
    protagonist: `Generate a new protagonist for: ${context}\nReturn JSON matching the protagonist schema`,
    antagonist: `Generate a new antagonist/conflict for: ${context}\nReturn JSON matching the antagonistConflict schema`,
    setting: `Generate a new setting for: ${context}\nReturn JSON: {"productionBible": {"setting": "New setting", "timeframe": "Timeframe"}}`,
    episodes: `Generate ${options.targetEpisodeCount} episode blueprints for: ${context}\nSynopsis: ${currentBible.synopsis}\nReturn JSON with episodeBlueprints array`,
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
    { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20' },
    fullPrompt
  )
  
  return JSON.parse(response)
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
