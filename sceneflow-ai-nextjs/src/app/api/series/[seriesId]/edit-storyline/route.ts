import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes for targeted edits

/**
 * Target aspects for storyline edits
 */
type EditTargetAspect = 'plot' | 'characters' | 'episodes' | 'tone' | 'setting' | 'all'

interface EditStorylineRequest {
  /** Natural language instruction describing the change */
  instruction: string
  /** Target aspect to focus the edit on */
  targetAspect?: EditTargetAspect
  /** Specific episode numbers to edit (optional, for episode-targeted changes) */
  targetEpisodes?: number[]
  /** Whether to preview changes without applying them */
  previewOnly?: boolean
}

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * Attempt to repair common JSON errors from LLM responses
 */
function repairJSON(text: string): string {
  let repaired = text
  
  // Fix trailing commas before closing brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
  
  // Fix missing commas between properties (look for "property": value "nextProperty":)
  repaired = repaired.replace(/(["\d\]}])\s*\n\s*"/g, '$1,\n"')
  
  // Fix unescaped newlines in strings - replace actual newlines between quotes with \n
  repaired = repaired.replace(/"([^"]*)\n([^"]*)"/g, (match, before, after) => {
    return `"${before}\\n${after}"`
  })
  
  // Fix unescaped quotes in strings (basic heuristic)
  repaired = repaired.replace(/: "([^"]*)"([^,}\]:\n]*)"([^"]*)",/g, ': "$1\\"$2\\"$3",')
  
  // Fix missing quotes around property values that look like strings
  repaired = repaired.replace(/: ([a-zA-Z][a-zA-Z0-9_\s]*[a-zA-Z0-9])([,}\]])/g, ': "$1"$2')
  
  // Fix truncated arrays - if array doesn't close, close it
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length
  if (openBrackets > closeBrackets) {
    repaired = repaired + ']'.repeat(openBrackets - closeBrackets)
  }
  
  // Fix truncated objects - if object doesn't close, close it
  const openBraces = (repaired.match(/{/g) || []).length
  const closeBraces = (repaired.match(/}/g) || []).length
  if (openBraces > closeBraces) {
    repaired = repaired + '}'.repeat(openBraces - closeBraces)
  }
  
  return repaired
}

/**
 * Safely parse JSON from LLM responses with aggressive repair
 */
function safeParseJSON(text: string): any {
  let cleaned = text.trim()
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  // First attempt: direct parse
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.log('[Edit Storyline] Initial JSON parse failed:', (e as Error).message)
  }
  
  // Second attempt: find JSON boundaries
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1)
    
    try {
      return JSON.parse(jsonCandidate)
    } catch (e) {
      console.log('[Edit Storyline] Bounded JSON parse failed:', (e as Error).message)
    }
    
    // Third attempt: repair common issues
    try {
      const repaired = repairJSON(jsonCandidate)
      return JSON.parse(repaired)
    } catch (e) {
      console.log('[Edit Storyline] Repaired JSON parse failed:', (e as Error).message)
      // Log portion around error position for debugging
      const errMsg = (e as Error).message
      const posMatch = errMsg.match(/position (\d+)/)
      if (posMatch) {
        const pos = parseInt(posMatch[1])
        console.log('[Edit Storyline] JSON near error:', jsonCandidate.slice(Math.max(0, pos - 100), pos + 100))
      }
    }
    
    // Fourth attempt: progressively truncate until valid
    try {
      let truncated = jsonCandidate
      for (let i = 0; i < 10; i++) {
        // Find the last complete array or object
        const lastCompleteArray = truncated.lastIndexOf(']')
        const lastCompleteObj = truncated.lastIndexOf('}')
        const cutPoint = Math.max(lastCompleteArray, lastCompleteObj)
        
        if (cutPoint > 100) {
          truncated = truncated.slice(0, cutPoint + 1)
          const repaired = repairJSON(truncated)
          try {
            const result = JSON.parse(repaired)
            console.log('[Edit Storyline] Parsed truncated JSON successfully')
            return result
          } catch {
            // Continue truncating
          }
        }
      }
    } catch (e) {
      console.log('[Edit Storyline] Truncation attempts failed')
    }
    
    // Fifth attempt: extract key fields with regex
    try {
      console.log('[Edit Storyline] Attempting regex extraction...')
      
      // Build a minimal valid response
      const minimalJSON: any = {
        changesApplied: [],
        fieldsModified: [],
        productionBible: {},
        episodeBlueprints: []
      }
      
      // Try to extract changesApplied array
      const changesMatch = jsonCandidate.match(/"changesApplied"\s*:\s*\[([\s\S]*?)\]/)
      if (changesMatch) {
        try {
          const arr = JSON.parse(`{"changesApplied": [${changesMatch[1]}]}`)
          minimalJSON.changesApplied = arr.changesApplied || []
        } catch {
          // Try individual items
          const items = changesMatch[1].match(/"[^"]+"/g) || []
          minimalJSON.changesApplied = items.map(s => s.replace(/^"|"$/g, ''))
        }
      }
      
      // Try to extract fieldsModified array  
      const fieldsMatch = jsonCandidate.match(/"fieldsModified"\s*:\s*\[([\s\S]*?)\]/)
      if (fieldsMatch) {
        try {
          const arr = JSON.parse(`{"fieldsModified": [${fieldsMatch[1]}]}`)
          minimalJSON.fieldsModified = arr.fieldsModified || []
        } catch {
          const items = fieldsMatch[1].match(/"[^"]+"/g) || []
          minimalJSON.fieldsModified = items.map(s => s.replace(/^"|"$/g, ''))
        }
      }
      
      // Try to extract productionBible (look for characters array specifically)
      const charactersMatch = jsonCandidate.match(/"characters"\s*:\s*\[[\s\S]*?\}\s*\]/)
      if (charactersMatch) {
        try {
          const parsed = JSON.parse(`{${charactersMatch[0]}}`)
          minimalJSON.productionBible = { characters: parsed.characters }
        } catch {}
      }
      
      console.log('[Edit Storyline] Extracted minimal response:', {
        changesCount: minimalJSON.changesApplied.length,
        fieldsCount: minimalJSON.fieldsModified.length,
        hasCharacters: !!minimalJSON.productionBible?.characters
      })
      
      return minimalJSON
    } catch (e5) {
      console.error('[Edit Storyline] All parsing attempts failed')
      throw new Error(`Invalid JSON from LLM - could not repair or extract`)
    }
  }
  
  throw new Error('No valid JSON object found in LLM response')
}

/**
 * Build the edit prompt based on target aspect
 * Uses focused, minimal context to prevent JSON parsing errors from large responses
 */
function buildEditPrompt(
  instruction: string,
  targetAspect: EditTargetAspect,
  currentStoryline: any,
  targetEpisodes?: number[]
): string {
  // For character edits, use a focused simple prompt - DON'T send full series data
  if (targetAspect === 'characters') {
    const currentCharacters = currentStoryline.productionBible?.characters || []
    const protagonist = currentStoryline.productionBible?.protagonist || {}
    
    return `You are a TV showrunner making a character change.

INSTRUCTION: "${instruction}"

CURRENT PROTAGONIST: ${JSON.stringify(protagonist)}
CURRENT CHARACTERS (first 5): ${JSON.stringify(currentCharacters.slice(0, 5))}

SERIES: ${currentStoryline.title} - ${currentStoryline.logline}

Apply the instruction to create/modify characters. Return ONLY valid JSON:
{
  "changesApplied": ["Description of each change made"],
  "fieldsModified": ["protagonist", "characters"],
  "productionBible": {
    "protagonist": {"characterId": "char_1", "name": "Full Name", "goal": "Their main goal", "flaw": "Fatal flaw"},
    "characters": [
      {"id": "char_1", "name": "Full Name", "role": "protagonist", "description": "Background and arc", "appearance": "Physical description", "personality": "Key traits"}
    ]
  },
  "episodeBlueprints": []
}`
  }

  // For plot edits
  if (targetAspect === 'plot') {
    return `You are a TV showrunner making a plot change.

INSTRUCTION: "${instruction}"

SERIES: ${currentStoryline.title}
CURRENT SYNOPSIS: ${currentStoryline.productionBible?.synopsis || currentStoryline.logline}

Apply the instruction. Return ONLY valid JSON:
{
  "changesApplied": ["Description of plot changes"],
  "fieldsModified": ["synopsis", "seriesArcs"],
  "productionBible": {
    "synopsis": "Updated series synopsis",
    "seriesArcs": ["Arc 1 description", "Arc 2 description"]
  },
  "episodeBlueprints": []
}`
  }

  // For tone edits
  if (targetAspect === 'tone') {
    return `You are a TV showrunner adjusting tone/style.

INSTRUCTION: "${instruction}"

SERIES: ${currentStoryline.title} - ${currentStoryline.logline}

Apply the instruction. Return ONLY valid JSON:
{
  "changesApplied": ["Description of tone changes"],
  "fieldsModified": ["toneGuidelines", "visualGuidelines"],
  "productionBible": {
    "toneGuidelines": "Updated tone description",
    "visualGuidelines": "Updated visual style"
  },
  "episodeBlueprints": []
}`
  }

  // For setting edits
  if (targetAspect === 'setting') {
    const currentLocations = currentStoryline.productionBible?.locations || []
    return `You are a TV showrunner changing the setting.

INSTRUCTION: "${instruction}"

SERIES: ${currentStoryline.title}
CURRENT SETTING: ${currentStoryline.productionBible?.setting || 'Not specified'}
CURRENT LOCATIONS: ${JSON.stringify(currentLocations.slice(0, 3))}

Apply the instruction. Return ONLY valid JSON:
{
  "changesApplied": ["Description of setting changes"],
  "fieldsModified": ["setting", "timeframe", "locations"],
  "productionBible": {
    "setting": "Updated setting description",
    "timeframe": "Time period",
    "locations": [{"id": "loc_1", "name": "Location Name", "description": "Description", "visualDescription": "Visual style"}]
  },
  "episodeBlueprints": []
}`
  }

  // For episode or general edits - keep it simple
  return `You are a TV showrunner making a targeted edit.

INSTRUCTION: "${instruction}"
TARGET: ${targetAspect}
${targetEpisodes?.length ? `EPISODES TO MODIFY: ${targetEpisodes.join(', ')}` : ''}

SERIES: ${currentStoryline.title}
LOGLINE: ${currentStoryline.logline}

Apply the instruction with minimal changes. Return ONLY valid JSON:
{
  "changesApplied": ["Description of changes"],
  "fieldsModified": ["list of modified fields"],
  "productionBible": {},
  "episodeBlueprints": []
}`
}

/**
 * POST /api/series/[seriesId]/edit-storyline
 * 
 * Apply directed edits to series storyline without full regeneration
 * 
 * Body:
 * - instruction: Required. Natural language description of the change
 * - targetAspect: Optional. Focus area ('plot', 'characters', 'episodes', 'tone', 'setting', 'all')
 * - targetEpisodes: Optional. Specific episode numbers to edit
 * - previewOnly: Optional. If true, return proposed changes without applying
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
    const {
      instruction,
      targetAspect = 'all',
      targetEpisodes,
      previewOnly = false
    } = body
    
    if (!instruction || instruction.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'instruction is required'
      }, { status: 400 })
    }
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/edit-storyline] Editing storyline:`, {
      instruction: instruction.slice(0, 100),
      targetAspect,
      targetEpisodes,
      previewOnly
    })
    
    // Build current storyline data for context
    const currentStoryline = {
      title: series.title,
      logline: series.logline,
      genre: series.genre,
      productionBible: series.production_bible || {},
      episodeBlueprints: series.episode_blueprints || []
    }
    
    // Generate edit prompt
    const editPrompt = buildEditPrompt(instruction, targetAspect, currentStoryline, targetEpisodes)
    
    // Call LLM for directed edits
    const editResponse = await callLLM(
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        maxOutputTokens: 8192,
        timeoutMs: 60000
      },
      editPrompt
    )
    
    const parsedEdits = safeParseJSON(editResponse)
    
    // If preview only, return the proposed changes
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        preview: true,
        proposedChanges: {
          changesApplied: parsedEdits.changesApplied || [],
          fieldsModified: parsedEdits.fieldsModified || [],
          productionBible: parsedEdits.productionBible,
          episodeBlueprints: parsedEdits.episodeBlueprints
        }
      })
    }
    
    // Apply the edits
    const currentBible = series.production_bible || {}
    const currentEpisodes = series.episode_blueprints || []
    
    // Merge production bible changes
    let updatedBible = { ...currentBible }
    if (parsedEdits.productionBible) {
      // Deep merge for nested objects
      for (const key of Object.keys(parsedEdits.productionBible)) {
        if (Array.isArray(parsedEdits.productionBible[key])) {
          // For arrays like characters, locations - merge by ID
          if (key === 'characters' || key === 'locations') {
            const existingItems = updatedBible[key] || []
            const newItems = parsedEdits.productionBible[key]
            
            // Update existing items, add new ones
            updatedBible[key] = existingItems.map((item: any) => {
              const updated = newItems.find((n: any) => n.id === item.id)
              return updated ? { ...item, ...updated, updatedAt: new Date().toISOString() } : item
            })
            
            // Add any new items not in existing
            const existingIds = new Set(existingItems.map((i: any) => i.id))
            const newOnes = newItems.filter((n: any) => !existingIds.has(n.id))
            if (newOnes.length > 0) {
              updatedBible[key] = [
                ...updatedBible[key],
                ...newOnes.map((item: any) => ({
                  ...item,
                  id: item.id || `${key.slice(0, 4)}_${uuidv4().slice(0, 8)}`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }))
              ]
            }
          } else {
            updatedBible[key] = parsedEdits.productionBible[key]
          }
        } else if (typeof parsedEdits.productionBible[key] === 'object' && parsedEdits.productionBible[key] !== null) {
          updatedBible[key] = { ...updatedBible[key], ...parsedEdits.productionBible[key] }
        } else {
          updatedBible[key] = parsedEdits.productionBible[key]
        }
      }
    }
    
    // Update version
    updatedBible.version = incrementVersion(currentBible.version || '1.0.0')
    updatedBible.lastUpdated = new Date().toISOString()
    
    // Merge episode blueprint changes
    let updatedEpisodes = [...currentEpisodes]
    if (parsedEdits.episodeBlueprints && parsedEdits.episodeBlueprints.length > 0) {
      for (const editedEp of parsedEdits.episodeBlueprints) {
        const idx = updatedEpisodes.findIndex(ep => 
          ep.id === editedEp.id || ep.episodeNumber === editedEp.episodeNumber
        )
        
        if (idx >= 0) {
          // Update existing episode, preserve ID
          updatedEpisodes[idx] = {
            ...updatedEpisodes[idx],
            ...editedEp,
            id: updatedEpisodes[idx].id // Preserve original ID
          }
        } else if (editedEp.episodeNumber) {
          // New episode
          updatedEpisodes.push({
            ...editedEp,
            id: editedEp.id || `ep_${editedEp.episodeNumber}_${uuidv4().slice(0, 8)}`,
            status: 'blueprint'
          })
        }
      }
      
      // Sort by episode number
      updatedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
    }
    
    // Update series
    const updates: any = {
      production_bible: updatedBible,
      episode_blueprints: updatedEpisodes,
      metadata: {
        ...series.metadata,
        lastEdit: {
          timestamp: new Date().toISOString(),
          instruction: instruction.slice(0, 200),
          targetAspect,
          changesApplied: parsedEdits.changesApplied || []
        }
      }
    }
    
    // Update top-level fields if changed
    if (parsedEdits.productionBible?.logline && !currentBible.logline) {
      updates.logline = parsedEdits.productionBible.logline
    }
    
    await series.update(updates)
    await series.reload()
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/edit-storyline] Edit complete:`, {
      fieldsModified: parsedEdits.fieldsModified,
      episodesModified: parsedEdits.episodeBlueprints?.length || 0
    })
    
    return NextResponse.json({
      success: true,
      changesApplied: parsedEdits.changesApplied || [],
      fieldsModified: parsedEdits.fieldsModified || [],
      episodesModified: parsedEdits.episodeBlueprints?.length || 0,
      series: formatSeriesResponse(series)
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/edit-storyline] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Increment semantic version
 */
function incrementVersion(version: string): string {
  const parts = version.split('.')
  if (parts.length === 3) {
    parts[2] = String(parseInt(parts[2]) + 1)
    return parts.join('.')
  }
  return '1.0.1'
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
    startedCount: series.started_count || 0,
    completedCount: series.completed_count || 0,
    productionBible: series.production_bible,
    episodeBlueprints: series.episode_blueprints || [],
    metadata: series.metadata || {},
    createdAt: series.created_at?.toISOString(),
    updatedAt: series.updated_at?.toISOString()
  }
}
