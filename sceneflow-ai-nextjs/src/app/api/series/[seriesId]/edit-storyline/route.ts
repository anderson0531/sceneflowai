import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for comprehensive storyline refactor

type EditTargetAspect = 'plot' | 'characters' | 'episodes' | 'tone' | 'setting' | 'all'

interface EditStorylineRequest {
  instruction: string
  targetAspect?: EditTargetAspect
  targetEpisodes?: number[]
  previewOnly?: boolean
}

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

const EPISODE_BATCH_SIZE = 3

/**
 * Safe JSON parse with repair
 */
function safeParseJSON(text: string): any {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // Find JSON boundaries
    const firstBracket = cleaned.indexOf('[')
    const firstBrace = cleaned.indexOf('{')
    const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)
    const startChar = isArray ? '[' : '{'
    const endChar = isArray ? ']' : '}'
    
    const start = cleaned.indexOf(startChar)
    const end = cleaned.lastIndexOf(endChar)
    
    if (start !== -1 && end > start) {
      let json = cleaned.slice(start, end + 1)
      // Fix trailing commas
      json = json.replace(/,(\s*[}\]])/g, '$1')
      
      try {
        return JSON.parse(json)
      } catch (e2) {
        console.error('[Edit Storyline] JSON parse failed:', (e2 as Error).message)
      }
    }
    console.error('[Edit Storyline] Could not parse JSON from response')
    return null
  }
}

/**
 * Phase 1: Update production bible (logline, synopsis, characters)
 * This is the core refactor that establishes the new storyline foundation
 */
async function refactorProductionBible(
  instruction: string,
  series: any
): Promise<any> {
  const currentBible = series.production_bible || {}
  
  const prompt = `You are a TV series showrunner refactoring a storyline based on user instruction.

INSTRUCTION: "${instruction}"

CURRENT SERIES:
Title: ${series.title}
Logline: ${series.logline}
Synopsis: ${currentBible.synopsis || 'Not set'}
Protagonist: ${JSON.stringify(currentBible.protagonist || {})}
Characters: ${JSON.stringify((currentBible.characters || []).slice(0, 6))}

TASK: Apply the instruction COMPREHENSIVELY. Update ALL relevant fields to reflect this change consistently.

Return ONLY valid JSON (no markdown, no explanation):
{
  "logline": "Updated logline that reflects the change",
  "synopsis": "Updated 2-3 paragraph synopsis reflecting the change throughout",
  "protagonist": {
    "characterId": "char_1",
    "name": "Character Name",
    "goal": "What they want to achieve",
    "flaw": "Their fatal flaw"
  },
  "characters": [
    {
      "id": "char_1",
      "name": "Character Name",
      "role": "protagonist",
      "description": "Background, motivation, arc",
      "appearance": "Physical description",
      "personality": "Key personality traits"
    }
  ],
  "changesApplied": ["Specific change 1", "Specific change 2"]
}`

  console.log('[Edit Storyline] Phase 1: Calling LLM for production bible refactor...')
  
  const response = await callLLM({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    maxOutputTokens: 4096,
    timeoutMs: 60000
  }, prompt)
  
  return safeParseJSON(response)
}

/**
 * Phase 2: Update episodes in batches to reflect the storyline change
 * Each episode is updated to use the new character/plot elements
 */
async function refactorEpisodes(
  instruction: string,
  series: any,
  updatedBible: any
): Promise<any[]> {
  const episodes = series.episode_blueprints || []
  if (episodes.length === 0) {
    console.log('[Edit Storyline] No episodes to refactor')
    return []
  }
  
  const updatedEpisodes: any[] = []
  const protagonistName = updatedBible?.protagonist?.name || 'the protagonist'
  const protagonistDesc = updatedBible?.protagonist?.goal || ''
  
  // Process episodes in batches to avoid token limits
  for (let i = 0; i < episodes.length; i += EPISODE_BATCH_SIZE) {
    const batch = episodes.slice(i, i + EPISODE_BATCH_SIZE)
    const batchNum = Math.floor(i / EPISODE_BATCH_SIZE) + 1
    
    console.log(`[Edit Storyline] Phase 2: Processing episode batch ${batchNum}...`)
    
    const prompt = `You are updating TV series episodes to reflect a storyline change.

CHANGE INSTRUCTION: "${instruction}"

NEW PROTAGONIST: ${protagonistName}
${protagonistDesc ? `Goal: ${protagonistDesc}` : ''}

NEW SYNOPSIS CONTEXT: ${updatedBible?.synopsis?.slice(0, 500) || 'Not available'}

EPISODES TO UPDATE:
${batch.map((ep: any) => `
Episode ${ep.episodeNumber}: "${ep.title}"
Logline: ${ep.logline}
Synopsis: ${ep.synopsis?.slice(0, 300) || 'Not set'}
`).join('\n---\n')}

TASK: Update EACH episode to reflect the storyline change. Replace old character references with new ones. Adjust plot points to fit the new storyline.

Return ONLY a valid JSON array (no markdown):
[
  {
    "episodeNumber": ${batch[0]?.episodeNumber || 1},
    "title": "Updated episode title",
    "logline": "Updated logline reflecting the change",
    "synopsis": "Updated synopsis with new character/plot"
  }
]`

    try {
      const response = await callLLM({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        maxOutputTokens: 4096,
        timeoutMs: 60000
      }, prompt)
      
      const parsed = safeParseJSON(response)
      
      if (Array.isArray(parsed)) {
        // Merge updates with original episode data
        for (const update of parsed) {
          const original = batch.find((ep: any) => ep.episodeNumber === update.episodeNumber)
          if (original) {
            updatedEpisodes.push({
              ...original,
              title: update.title || original.title,
              logline: update.logline || original.logline,
              synopsis: update.synopsis || original.synopsis,
              id: original.id // Preserve original ID
            })
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        // Single episode object returned
        const epNum = parsed.episodeNumber || batch[0]?.episodeNumber
        const original = batch.find((ep: any) => ep.episodeNumber === epNum)
        if (original) {
          updatedEpisodes.push({
            ...original,
            title: parsed.title || original.title,
            logline: parsed.logline || original.logline,
            synopsis: parsed.synopsis || original.synopsis,
            id: original.id
          })
        }
      }
    } catch (err) {
      console.error(`[Edit Storyline] Error processing batch ${batchNum}:`, err)
      // Keep original episodes on error
      updatedEpisodes.push(...batch)
    }
  }
  
  // Add any episodes that weren't in batches (shouldn't happen but safety check)
  for (const ep of episodes) {
    if (!updatedEpisodes.find(u => u.episodeNumber === ep.episodeNumber)) {
      updatedEpisodes.push(ep)
    }
  }
  
  // Sort by episode number
  return updatedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
}

/**
 * POST /api/series/[seriesId]/edit-storyline
 * 
 * Comprehensive storyline refactor - propagates changes across:
 * - Logline
 * - Synopsis  
 * - Protagonist
 * - Characters
 * - All episodes
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
    
    const body: EditStorylineRequest = await request.json()
    const { instruction, previewOnly = false } = body
    
    if (!instruction?.trim()) {
      return NextResponse.json({ success: false, error: 'instruction is required' }, { status: 400 })
    }
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/edit-storyline] Starting comprehensive refactor`)
    console.log(`[${timestamp}] Instruction: "${instruction.slice(0, 100)}"`)
    
    // ========== PHASE 1: Refactor Production Bible ==========
    console.log(`[${timestamp}] Phase 1: Refactoring production bible...`)
    const bibleUpdates = await refactorProductionBible(instruction, series)
    
    if (!bibleUpdates) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to process storyline changes - LLM returned invalid response' 
      }, { status: 500 })
    }
    
    console.log(`[${timestamp}] Phase 1 complete. Changes: ${bibleUpdates.changesApplied?.join(', ') || 'none listed'}`)
    
    // ========== PHASE 2: Refactor All Episodes ==========
    console.log(`[${timestamp}] Phase 2: Refactoring ${series.episode_blueprints?.length || 0} episodes...`)
    const updatedEpisodes = await refactorEpisodes(instruction, series, bibleUpdates)
    console.log(`[${timestamp}] Phase 2 complete. Updated ${updatedEpisodes.length} episodes`)
    
    // Preview mode - return proposed changes without saving
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        proposedChanges: {
          logline: bibleUpdates.logline,
          synopsis: bibleUpdates.synopsis,
          protagonist: bibleUpdates.protagonist,
          characters: bibleUpdates.characters,
          episodesUpdated: updatedEpisodes.length,
          changesApplied: bibleUpdates.changesApplied || []
        }
      })
    }
    
    // ========== PHASE 3: Apply Updates to Database ==========
    const currentBible = series.production_bible || {}
    const updatedBible = {
      ...currentBible,
      synopsis: bibleUpdates.synopsis || currentBible.synopsis,
      protagonist: bibleUpdates.protagonist || currentBible.protagonist,
      characters: bibleUpdates.characters || currentBible.characters,
      version: incrementVersion(currentBible.version || '1.0.0'),
      lastUpdated: new Date().toISOString()
    }
    
    await series.update({
      logline: bibleUpdates.logline || series.logline,
      production_bible: updatedBible,
      episode_blueprints: updatedEpisodes.length > 0 ? updatedEpisodes : series.episode_blueprints,
      metadata: {
        ...series.metadata,
        lastEdit: {
          timestamp: new Date().toISOString(),
          instruction: instruction.slice(0, 200),
          changesApplied: bibleUpdates.changesApplied || [],
          episodesUpdated: updatedEpisodes.length
        }
      }
    })
    
    await series.reload()
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/edit-storyline] Refactor complete!`)
    
    return NextResponse.json({
      success: true,
      changesApplied: bibleUpdates.changesApplied || [],
      fieldsModified: ['logline', 'synopsis', 'protagonist', 'characters', 'episodes'],
      episodesModified: updatedEpisodes.length,
      series: {
        id: series.id,
        title: series.title,
        logline: series.logline,
        synopsis: series.production_bible?.synopsis,
        protagonist: series.production_bible?.protagonist,
        episodeCount: series.episode_blueprints?.length || 0
      }
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/edit-storyline] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function incrementVersion(version: string): string {
  const parts = version.split('.')
  if (parts.length === 3) {
    parts[2] = String(parseInt(parts[2]) + 1)
    return parts.join('.')
  }
  return '1.0.1'
}
