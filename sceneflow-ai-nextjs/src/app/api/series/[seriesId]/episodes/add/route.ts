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

// Maximum episodes to generate in a single batch (5 for reliable JSON parsing)
const BATCH_SIZE = 5
const ABSOLUTE_MAX_EPISODES = 40

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

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
      
      // Fix 2: Try to balance brackets if truncated
      const openBrackets = (json.match(/\[/g) || []).length
      const closeBrackets = (json.match(/\]/g) || []).length
      const openBraces = (json.match(/\{/g) || []).length
      const closeBraces = (json.match(/\}/g) || []).length
      
      // If arrays are unbalanced, try to close them
      if (openBrackets > closeBrackets || openBraces > closeBraces) {
        console.log(`[safeParseJSON] Unbalanced: arrays [${openBrackets}/${closeBrackets}], braces {${openBraces}/${closeBraces}}`)
        // Find the last complete episode object and truncate there
        const lastCompleteStatus = json.lastIndexOf('"status"')
        if (lastCompleteStatus !== -1) {
          // Find the closing brace after this
          const closeAfterStatus = json.indexOf('}', lastCompleteStatus)
          if (closeAfterStatus !== -1) {
            json = json.slice(0, closeAfterStatus + 1)
            // Add missing closing bracket for array
            if (isArray && openBrackets > closeBrackets) {
              json += ']'
            }
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
    throw new Error('No valid JSON found in LLM response')
  }
}

/**
 * Generate a batch of new episodes with enhanced continuity tracking
 */
async function generateEpisodeBatch(
  series: Series,
  startEpisodeNumber: number,
  count: number
): Promise<SeriesEpisodeBlueprint[]> {
  const bible = series.production_bible || {}
  const existingEpisodes = series.episode_blueprints || []
  const totalPlannedEpisodes = series.max_episodes || 40
  
  // Build context from existing episodes (last 5 for better continuity)
  const recentEpisodes = existingEpisodes.slice(-5)
  const episodeSummaries = recentEpisodes
    .map(ep => {
      const hook = (ep as any).episodeHook ? ` [Hook: ${(ep as any).episodeHook}]` : ''
      return `Ep ${ep.episodeNumber}: "${ep.title}" - ${ep.logline}${hook}`
    })
    .join('\n')
  
  // Gather active story threads from existing episodes
  const activeThreads: Array<{id: string, name: string, type: string, status: string, description?: string}> = []
  for (const ep of existingEpisodes) {
    const threads = (ep as any).storyThreads || []
    for (const thread of threads) {
      const existing = activeThreads.find(t => t.id === thread.id || t.name === thread.name)
      if (existing) {
        existing.status = thread.status
      } else if (thread.status !== 'resolved') {
        activeThreads.push(thread)
      }
    }
  }
  
  // Build character roster
  const characterList = bible.characters?.map((c: any) => 
    `- ${c.name} (${c.role}): ${c.description}`
  ).join('\n') || 'Not specified'
  
  const prompt = `You are continuing an existing TV series with consistent story arcs.

SERIES: ${series.title}
LOGLINE: ${series.logline || bible.logline}
SYNOPSIS: ${bible.synopsis || 'Not specified'}
GENRE: ${series.genre || 'Drama'}
TONE: ${bible.toneGuidelines || 'Not specified'}

CHARACTERS:
${characterList}

PROTAGONIST: ${bible.protagonist?.name || 'Not specified'} - Goal: ${bible.protagonist?.goal || ''}, Flaw: ${bible.protagonist?.flaw || ''}

ANTAGONIST/CONFLICT: ${bible.antagonistConflict?.description || 'Not specified'}

EXISTING EPISODES (last 5 for context):
${episodeSummaries || 'None yet'}

ACTIVE STORY THREADS:
${activeThreads.map(t => `- ${t.name} (${t.type}): ${t.status} - ${t.description || ''}`).join('\n') || 'None tracked'}

SERIES LENGTH: ${totalPlannedEpisodes} total episodes
CURRENT POSITION: Episodes ${startEpisodeNumber} to ${startEpisodeNumber + count - 1} of ${totalPlannedEpisodes}

Generate ${count} NEW episodes starting from Episode ${startEpisodeNumber}.
Each episode must:
1. Continue naturally from the last episode's hook
2. Advance or resolve active story threads
3. Introduce new threads if appropriate for pacing
4. End with a hook for the next episode (except if this is the finale)
5. Consider series position (early=setup, middle=complications, late=resolution)

Return ONLY valid JSON array:
[
  {
    "episodeNumber": ${startEpisodeNumber},
    "title": "Episode Title",
    "logline": "One sentence hook",
    "synopsis": "Full episode summary continuing the narrative",
    "beats": [
      {"beatNumber": 1, "title": "Opening", "description": "Pickup from previous", "act": 1},
      {"beatNumber": 2, "title": "Conflict", "description": "Rising action", "act": 2},
      {"beatNumber": 3, "title": "Resolution", "description": "Climax/cliffhanger", "act": 3}
    ],
    "characters": [{"characterId": "${bible.protagonist?.characterId || 'char_1'}", "role": "protagonist"}],
    "storyThreads": [{"id": "thread_1", "name": "Thread Name", "type": "main|subplot|character|mystery|romance", "status": "developing|climax|resolved", "description": "Progress in this episode"}],
    "plotDevelopments": ["Key event in this episode"],
    "episodeHook": "Setup for next episode",
    "status": "blueprint"
  }
]`

  const response = await callLLM(
    { 
      provider: 'gemini', 
      model: 'gemini-2.5-pro',  // Use Pro for better narrative coherence
      maxOutputTokens: 16384,
      timeoutMs: 120000
    },
    prompt
  )
  
  const parsed = safeParseJSON(response)
  
  // Handle both array and object with array property
  const episodes = Array.isArray(parsed) ? parsed : (parsed.episodes || parsed.episodeBlueprints || [])
  
  // Ensure proper IDs and episode numbers with continuity fields
  return episodes.map((ep: any, i: number) => ({
    ...ep,
    id: `ep_${startEpisodeNumber + i}_${uuidv4().slice(0, 8)}`,
    episodeNumber: startEpisodeNumber + i,
    status: 'blueprint',
    beats: ep.beats || [],
    characters: ep.characters || [],
    storyThreads: ep.storyThreads || [],
    plotDevelopments: ep.plotDevelopments || [],
    episodeHook: ep.episodeHook || ''
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
