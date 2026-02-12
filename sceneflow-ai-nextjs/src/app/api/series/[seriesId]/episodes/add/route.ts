/**
 * Add More Episodes API
 * 
 * Dedicated endpoint for batch expansion of episode blueprints
 * Generates episodes in smaller batches to avoid LLM token limits
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { callLLM } from '@/services/llmGateway'
import { SeriesEpisodeBlueprint } from '@/types/series'

// Maximum episodes to generate in a single batch
const BATCH_SIZE = 10
const ABSOLUTE_MAX_EPISODES = 40

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * Safe JSON parser that handles LLM response quirks
 */
function safeParseJSON(text: string): any {
  // Remove markdown code blocks if present
  let json = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  
  // Find the JSON object boundaries
  const startBrace = json.indexOf('{')
  const startBracket = json.indexOf('[')
  const start = startBrace >= 0 && (startBracket < 0 || startBrace < startBracket) ? startBrace : startBracket
  
  if (start > 0) {
    json = json.slice(start)
  }
  
  // Find matching end
  let depth = 0
  let inString = false
  let escapeNext = false
  let endIndex = -1
  const openChar = json[0]
  const closeChar = openChar === '{' ? '}' : ']'
  
  for (let i = 0; i < json.length; i++) {
    const char = json[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"') {
      inString = !inString
      continue
    }
    
    if (inString) continue
    
    if (char === openChar || char === '{' || char === '[') {
      depth++
    } else if (char === closeChar || char === '}' || char === ']') {
      depth--
      if (depth === 0) {
        endIndex = i
        break
      }
    }
  }
  
  if (endIndex > 0) {
    json = json.slice(0, endIndex + 1)
  }
  
  // Remove trailing commas
  json = json.replace(/,(\s*[}\]])/g, '$1')
  
  try {
    return JSON.parse(json)
  } catch (e) {
    console.error('[safeParseJSON] Failed to parse:', (e as Error).message)
    throw new Error(`Invalid JSON from LLM: ${(e as Error).message}`)
  }
}

/**
 * Generate a batch of new episodes
 */
async function generateEpisodeBatch(
  series: Series,
  startEpisodeNumber: number,
  count: number
): Promise<SeriesEpisodeBlueprint[]> {
  const bible = series.production_bible || {}
  const existingEpisodes = series.episode_blueprints || []
  
  // Build context from existing episodes
  const episodeSummaries = existingEpisodes
    .slice(-3) // Last 3 episodes for context
    .map(ep => `Ep ${ep.episodeNumber}: "${ep.title}" - ${ep.logline}`)
    .join('\n')
  
  const prompt = `You are a TV series writer continuing an existing series.

SERIES: ${series.title}
LOGLINE: ${series.logline || bible.logline}
SYNOPSIS: ${bible.synopsis || 'Not specified'}
GENRE: ${series.genre || 'Drama'}

EXISTING EPISODES (last 3 for context):
${episodeSummaries || 'None yet'}

PROTAGONIST: ${bible.protagonist?.name || 'Not specified'} - ${bible.protagonist?.goal || ''}

Generate ${count} NEW episodes starting from Episode ${startEpisodeNumber}.
Each episode needs: title, logline (1 sentence), synopsis (1 paragraph), and 3 story beats.
Continue the narrative arc naturally from existing episodes.

Return ONLY valid JSON array:
[
  {
    "episodeNumber": ${startEpisodeNumber},
    "title": "Episode Title",
    "logline": "One sentence hook",
    "synopsis": "One paragraph summary",
    "beats": [
      {"beatNumber": 1, "title": "Opening", "description": "Setup", "act": 1},
      {"beatNumber": 2, "title": "Conflict", "description": "Rising action", "act": 2},
      {"beatNumber": 3, "title": "Resolution", "description": "Climax/cliffhanger", "act": 3}
    ],
    "characters": [{"characterId": "${bible.protagonist?.characterId || 'char_1'}", "role": "protagonist"}],
    "status": "blueprint"
  }
]`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    prompt
  )
  
  const parsed = safeParseJSON(response)
  
  // Handle both array and object with array property
  const episodes = Array.isArray(parsed) ? parsed : (parsed.episodes || parsed.episodeBlueprints || [])
  
  // Ensure proper IDs and episode numbers
  return episodes.map((ep: any, i: number) => ({
    ...ep,
    id: `ep_${startEpisodeNumber + i}_${uuidv4().slice(0, 8)}`,
    episodeNumber: startEpisodeNumber + i,
    status: 'blueprint',
    beats: ep.beats || [],
    characters: ep.characters || []
  }))
}

/**
 * POST /api/series/[seriesId]/episodes/add
 * 
 * Add more episodes to an existing series
 * 
 * Body:
 * - count: Number of episodes to add (default: 5, max: 10 per request)
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
    const requestedCount = Math.min(body.count || BATCH_SIZE, 20) // Max 20 per request (will batch internally)
    
    const currentEpisodes = series.episode_blueprints || []
    const currentCount = currentEpisodes.length
    const maxAllowed = series.max_episodes || ABSOLUTE_MAX_EPISODES
    
    // Check if we can add more episodes
    if (currentCount >= maxAllowed) {
      return NextResponse.json({
        success: false,
        error: `Series already has maximum ${maxAllowed} episodes`,
        currentCount,
        maxAllowed
      }, { status: 400 })
    }
    
    // Calculate how many we can actually add
    const canAdd = Math.min(requestedCount, maxAllowed - currentCount)
    const startEpisodeNumber = currentCount + 1
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/episodes/add] Adding ${canAdd} episodes starting at ${startEpisodeNumber}`)
    
    // Generate in batches if needed
    const newEpisodes: SeriesEpisodeBlueprint[] = []
    let remaining = canAdd
    let nextEpisodeNum = startEpisodeNumber
    
    while (remaining > 0) {
      const batchSize = Math.min(remaining, BATCH_SIZE)
      console.log(`[${timestamp}] Generating batch of ${batchSize} episodes starting at ${nextEpisodeNum}`)
      
      const batch = await generateEpisodeBatch(series, nextEpisodeNum, batchSize)
      newEpisodes.push(...batch)
      
      remaining -= batchSize
      nextEpisodeNum += batchSize
    }
    
    // Merge with existing episodes
    const updatedEpisodes = [...currentEpisodes, ...newEpisodes]
    
    // Update series
    await series.update({
      episode_blueprints: updatedEpisodes,
      metadata: {
        ...series.metadata,
        lastEpisodeAddition: {
          timestamp: new Date().toISOString(),
          added: newEpisodes.length,
          totalEpisodes: updatedEpisodes.length
        }
      }
    })
    
    await series.reload()
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/episodes/add] Added ${newEpisodes.length} episodes. Total: ${updatedEpisodes.length}`)
    
    return NextResponse.json({
      success: true,
      added: newEpisodes.length,
      totalEpisodes: updatedEpisodes.length,
      maxEpisodes: maxAllowed,
      newEpisodes: newEpisodes,
      canAddMore: updatedEpisodes.length < maxAllowed
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/episodes/add] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add episodes'
    }, { status: 500 })
  }
}

/**
 * GET /api/series/[seriesId]/episodes/add
 * 
 * Get info about adding more episodes
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const currentCount = series.episode_blueprints?.length || 0
    const maxAllowed = series.max_episodes || ABSOLUTE_MAX_EPISODES
    
    return NextResponse.json({
      success: true,
      currentEpisodes: currentCount,
      maxEpisodes: maxAllowed,
      canAdd: maxAllowed - currentCount,
      recommendedBatchSize: BATCH_SIZE
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get episode info'
    }, { status: 500 })
  }
}
