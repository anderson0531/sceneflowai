/**
 * Apply Series Fix API
 * 
 * Applies a recommended fix to the series (episode, character, location, or bible).
 * Uses LLM to regenerate the targeted content based on the fix suggestion.
 * 
 * POST /api/series/[seriesId]/apply-fix
 */

import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'
import { callLLM } from '@/services/llmGateway'
import { v4 as uuidv4 } from 'uuid'
import { ApplySeriesFixRequest, ApplySeriesFixResponse } from '@/types/series'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes for fix generation

/**
 * Normalize targetSection to handle plural and variant forms
 */
function normalizeTargetSection(section: string): string {
  const normalized = section.toLowerCase().trim()
  
  // Map plural and variant forms to canonical names
  const sectionMap: Record<string, string> = {
    'episodes': 'episode',
    'episode': 'episode',
    'characters': 'character',
    'character': 'character',
    'locations': 'location',
    'location': 'location',
    'bible': 'bible',
    'story': 'bible',
    'visual-style': 'visual-style',
    'visual_style': 'visual-style',
    'visualstyle': 'visual-style',
    'style': 'visual-style'
  }
  
  return sectionMap[normalized] || normalized
}

/**
 * Parse episode ID which may be a range like "ep_11-14" or single "ep_5"
 * Also handles special cases like "all" for all episodes
 * Returns array of episode numbers to update, or 'all' string for all episodes
 */
function parseEpisodeRange(episodeId: string): number[] | 'all' {
  const normalized = episodeId.toLowerCase().trim()
  
  // Handle "all" - means apply to all episodes
  if (normalized === 'all' || normalized === 'all_episodes' || normalized === 'all-episodes') {
    return 'all'
  }
  
  // Handle range format: ep_11-14, episodes_11-14, 11-14
  const rangeMatch = episodeId.match(/(\d+)-(\d+)/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    const episodes: number[] = []
    for (let i = start; i <= end; i++) {
      episodes.push(i)
    }
    return episodes
  }
  
  // Handle single episode: ep_5, episode_5, 5
  const singleMatch = episodeId.match(/(\d+)/)
  if (singleMatch) {
    return [parseInt(singleMatch[1], 10)]
  }
  
  return []
}

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * Safely parse JSON from LLM responses
 */
function safeParseJSON(text: string): any {
  let cleaned = text.trim()
  
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let json = cleaned.slice(firstBrace, lastBrace + 1)
      json = json.replace(/,(\s*[\]\}])/g, '$1')
      return JSON.parse(json)
    }
    throw new Error('Invalid JSON from LLM')
  }
}

/**
 * POST /api/series/[seriesId]/apply-fix
 * 
 * Apply a resonance fix to the series
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
    
    const body: ApplySeriesFixRequest = await request.json()
    const { insightId, fixSuggestion, targetSection, targetId } = body
    
    if (!fixSuggestion) {
      return NextResponse.json({
        success: false,
        error: 'fixSuggestion is required'
      }, { status: 400 })
    }
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/apply-fix] Applying fix: ${targetSection}${targetId ? `/${targetId}` : ''}`)
    
    let updatedContent: any
    let changesSummary: string
    
    // Normalize targetSection to handle plural forms
    const normalizedSection = normalizeTargetSection(targetSection)
    
    switch (normalizedSection) {
      case 'episode':
        const result = await applyEpisodeFix(series, targetId!, fixSuggestion)
        updatedContent = result.updatedEpisodes
        changesSummary = result.summary
        await series.update({ episode_blueprints: updatedContent })
        break
        
      case 'character':
        const charResult = await applyCharacterFix(series, targetId!, fixSuggestion)
        await series.update({
          production_bible: {
            ...series.production_bible,
            characters: charResult.updatedCharacters
          }
        })
        changesSummary = charResult.summary
        break
        
      case 'location':
        const locResult = await applyLocationFix(series, targetId!, fixSuggestion)
        await series.update({
          production_bible: {
            ...series.production_bible,
            locations: locResult.updatedLocations
          }
        })
        changesSummary = locResult.summary
        break
        
      case 'bible':
        const bibleResult = await applyBibleFix(series, fixSuggestion)
        await series.update({
          production_bible: bibleResult.updatedBible,
          logline: bibleResult.updatedLogline || series.logline
        })
        changesSummary = bibleResult.summary
        break
        
      case 'visual-style':
        const visualResult = await applyVisualStyleFix(series, fixSuggestion)
        await series.update({
          production_bible: {
            ...series.production_bible,
            aesthetic: visualResult.updatedAesthetic,
            visualGuidelines: visualResult.updatedGuidelines
          }
        })
        changesSummary = visualResult.summary
        break
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown target section: ${targetSection}`
        }, { status: 400 })
    }
    
    await series.reload()
    
    const response: ApplySeriesFixResponse = {
      success: true,
      updatedSeries: formatSeriesResponse(series),
      fixApplied: {
        insightId,
        targetSection,
        targetId,
        changesSummary
      }
    }
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/apply-fix] Fix applied: ${changesSummary}`)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/apply-fix] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply fix'
    }, { status: 500 })
  }
}

/**
 * Apply fix to an episode or range of episodes
 * Handles ranges like "ep_11-14" which should update episodes 11, 12, 13, 14
 * Also handles "all" to apply fix across all episodes with batch processing
 */
async function applyEpisodeFix(
  series: Series,
  episodeId: string,
  fixSuggestion: string
): Promise<{ updatedEpisodes: any[]; summary: string }> {
  const episodes = [...(series.episode_blueprints || [])]
  
  // Parse episode range - could be single (ep_5), range (ep_11-14), or 'all'
  const episodeNumbers = parseEpisodeRange(episodeId)
  
  // Handle 'all' - get all episode indices
  let targetIndices: number[]
  if (episodeNumbers === 'all') {
    targetIndices = episodes.map((_, idx) => idx)
  } else {
    if (episodeNumbers.length === 0) {
      throw new Error(`Invalid episode ID format: ${episodeId}`)
    }
    
    // Find all target episodes
    targetIndices = episodeNumbers
      .map(num => episodes.findIndex(ep => ep.episodeNumber === num))
      .filter(idx => idx !== -1)
  }
  
  if (targetIndices.length === 0) {
    throw new Error(`No episodes found for: ${episodeId}`)
  }
  
  // For "all" episodes or large batches, use efficient batch processing
  if (targetIndices.length > 5) {
    return applyBatchEpisodeFix(series, episodes, targetIndices, fixSuggestion)
  }
  
  // For smaller sets, do individual updates
  const updatedSummaries: string[] = []
  
  for (const targetIndex of targetIndices) {
    const episode = episodes[targetIndex]
    
    const prompt = `You are improving a TV series episode based on feedback.

CURRENT EPISODE ${episode.episodeNumber}: "${episode.title}"
Logline: ${episode.logline}
Synopsis: ${episode.synopsis}
Beats: ${JSON.stringify(episode.beats, null, 2)}
Episode Hook: ${episode.episodeHook || 'None'}

IMPROVEMENT REQUIRED:
${fixSuggestion}

Generate an improved version of this episode that addresses the feedback.
Keep the episode number and maintain narrative continuity with the series.

Return ONLY valid JSON:
{
  "title": "Updated title if needed",
  "logline": "Updated logline",
  "synopsis": "Updated synopsis addressing the fix",
  "beats": [
    {"beatNumber": 1, "title": "Opening", "description": "Updated description", "act": 1},
    {"beatNumber": 2, "title": "Conflict", "description": "Updated description", "act": 2},
    {"beatNumber": 3, "title": "Resolution", "description": "Updated description", "act": 3}
  ],
  "episodeHook": "Stronger hook/cliffhanger for next episode",
  "changesSummary": "Brief description of what changed"
}`

    const response = await callLLM(
      { provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 8192 },
      prompt
    )
    
    const updated = safeParseJSON(response)
    
    episodes[targetIndex] = {
      ...episode,
      title: updated.title || episode.title,
      logline: updated.logline || episode.logline,
      synopsis: updated.synopsis || episode.synopsis,
      beats: updated.beats || episode.beats,
      episodeHook: updated.episodeHook || episode.episodeHook
    }
    
    updatedSummaries.push(`Ep ${episode.episodeNumber}: ${updated.changesSummary || 'Updated'}`)
  }
  
  const episodeLabel = episodeNumbers === 'all' 
    ? 'all episodes' 
    : Array.isArray(episodeNumbers) && episodeNumbers.length > 1
      ? `episodes ${episodeNumbers.join(', ')}`
      : `episode ${episodeNumbers}`
  
  return {
    updatedEpisodes: episodes,
    summary: targetIndices.length > 1 
      ? `Updated ${targetIndices.length} episodes: ${updatedSummaries[0]}`
      : updatedSummaries[0] || `Updated ${episodeLabel}`
  }
}

/**
 * Batch process multiple episodes efficiently with a single LLM call
 * Used when applying fixes to 'all' episodes or large ranges to avoid timeout
 */
async function applyBatchEpisodeFix(
  series: Series,
  episodes: any[],
  targetIndices: number[],
  fixSuggestion: string
): Promise<{ updatedEpisodes: any[]; summary: string }> {
  // Build episode summaries for context
  const episodeSummaries = targetIndices.map(idx => {
    const ep = episodes[idx]
    return `Episode ${ep.episodeNumber}: "${ep.title}" - ${ep.logline}`
  }).join('\n')
  
  const prompt = `You are improving a TV series based on feedback. Apply the improvement across ALL episodes while maintaining narrative continuity.

SERIES: ${series.title}
TOTAL EPISODES: ${episodes.length}
GENRE: ${series.genre || 'Drama'}

EPISODES TO IMPROVE:
${episodeSummaries}

IMPROVEMENT REQUIRED FOR ALL EPISODES:
${fixSuggestion}

For each episode, provide targeted improvements that address the feedback while maintaining story continuity.
Focus on the most impactful changes - primarily loglines and episode hooks.

Return ONLY valid JSON array with one entry per episode:
[
  {
    "episodeNumber": 1,
    "improvedLogline": "Enhanced logline addressing feedback",
    "improvedHook": "Stronger cliffhanger/hook for next episode",
    "keyChange": "Brief 5-10 word description of main improvement"
  }
]

IMPORTANT: Return exactly ${targetIndices.length} entries, one for each episode.`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 16384 },
    prompt
  )
  
  const improvements = safeParseJSON(response)
  const updatedSummaries: string[] = []
  
  // Apply improvements to each episode
  for (const improvement of improvements) {
    const idx = episodes.findIndex(ep => ep.episodeNumber === improvement.episodeNumber)
    if (idx !== -1) {
      episodes[idx] = {
        ...episodes[idx],
        logline: improvement.improvedLogline || episodes[idx].logline,
        episodeHook: improvement.improvedHook || episodes[idx].episodeHook
      }
      updatedSummaries.push(`Ep ${improvement.episodeNumber}: ${improvement.keyChange || 'Updated'}`)
    }
  }
  
  return {
    updatedEpisodes: episodes,
    summary: `Batch updated ${improvements.length} episodes with improvements`
  }
}

/**
 * Apply fix to a character
 */
async function applyCharacterFix(
  series: Series,
  characterId: string,
  fixSuggestion: string
): Promise<{ updatedCharacters: any[]; summary: string }> {
  const bible = series.production_bible || {}
  const characters = [...(bible.characters || [])]
  const charIndex = characters.findIndex(c => c.id === characterId || c.name === characterId)
  
  if (charIndex === -1) {
    throw new Error(`Character not found: ${characterId}`)
  }
  
  const character = characters[charIndex]
  
  const prompt = `You are improving a TV series character based on feedback.

CURRENT CHARACTER: ${character.name}
Role: ${character.role}
Description: ${character.description}
Appearance: ${character.appearance}
Personality: ${character.personality || 'Not specified'}
Backstory: ${character.backstory || 'Not specified'}

IMPROVEMENT REQUIRED:
${fixSuggestion}

Generate an improved version of this character.

Return ONLY valid JSON:
{
  "name": "${character.name}",
  "role": "${character.role}",
  "description": "Enhanced description addressing the fix",
  "appearance": "Updated visual description",
  "personality": "Updated personality traits",
  "backstory": "Updated backstory if relevant",
  "changesSummary": "Brief description of what changed"
}`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 4096 },
    prompt
  )
  
  const updated = safeParseJSON(response)
  
  characters[charIndex] = {
    ...character,
    description: updated.description || character.description,
    appearance: updated.appearance || character.appearance,
    personality: updated.personality || character.personality,
    backstory: updated.backstory || character.backstory,
    updatedAt: new Date().toISOString()
  }
  
  return {
    updatedCharacters: characters,
    summary: updated.changesSummary || `Updated character: ${character.name}`
  }
}

/**
 * Apply fix to a location
 */
async function applyLocationFix(
  series: Series,
  locationId: string,
  fixSuggestion: string
): Promise<{ updatedLocations: any[]; summary: string }> {
  const bible = series.production_bible || {}
  const locations = [...(bible.locations || [])]
  const locIndex = locations.findIndex(l => l.id === locationId || l.name === locationId)
  
  if (locIndex === -1) {
    throw new Error(`Location not found: ${locationId}`)
  }
  
  const location = locations[locIndex]
  
  const prompt = `You are improving a TV series location based on feedback.

CURRENT LOCATION: ${location.name}
Description: ${location.description}
Visual Description: ${location.visualDescription || 'Not specified'}

IMPROVEMENT REQUIRED:
${fixSuggestion}

Generate an improved version of this location.

Return ONLY valid JSON:
{
  "name": "${location.name}",
  "description": "Enhanced description addressing the fix",
  "visualDescription": "Updated visual description for production",
  "changesSummary": "Brief description of what changed"
}`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 4096 },
    prompt
  )
  
  const updated = safeParseJSON(response)
  
  locations[locIndex] = {
    ...location,
    description: updated.description || location.description,
    visualDescription: updated.visualDescription || location.visualDescription,
    updatedAt: new Date().toISOString()
  }
  
  return {
    updatedLocations: locations,
    summary: updated.changesSummary || `Updated location: ${location.name}`
  }
}

/**
 * Apply fix to the production bible (synopsis, logline, etc.)
 */
async function applyBibleFix(
  series: Series,
  fixSuggestion: string
): Promise<{ updatedBible: any; updatedLogline?: string; summary: string }> {
  const bible = series.production_bible || {}
  
  const prompt = `You are improving a TV series production bible based on feedback.

CURRENT BIBLE:
Title: ${series.title}
Logline: ${series.logline || bible.logline}
Synopsis: ${bible.synopsis}
Setting: ${bible.setting}
Protagonist: ${JSON.stringify(bible.protagonist)}
Antagonist/Conflict: ${JSON.stringify(bible.antagonistConflict)}
Tone Guidelines: ${bible.toneGuidelines || 'Not specified'}

IMPROVEMENT REQUIRED:
${fixSuggestion}

Generate improvements to the bible elements that address the feedback.
Only include fields that need to change.

Return ONLY valid JSON:
{
  "logline": "Updated logline if needed",
  "synopsis": "Updated synopsis if needed",
  "setting": "Updated setting if needed",
  "protagonist": {
    "characterId": "${bible.protagonist?.characterId || 'char_1'}",
    "name": "${bible.protagonist?.name || 'Protagonist'}",
    "goal": "Updated goal if needed",
    "flaw": "Updated flaw if needed"
  },
  "antagonistConflict": {
    "type": "${bible.antagonistConflict?.type || 'character'}",
    "description": "Updated conflict description if needed"
  },
  "toneGuidelines": "Updated tone if needed",
  "changesSummary": "Brief description of what changed"
}`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 8192 },
    prompt
  )
  
  const updated = safeParseJSON(response)
  
  const updatedBible = {
    ...bible,
    synopsis: updated.synopsis || bible.synopsis,
    setting: updated.setting || bible.setting,
    protagonist: updated.protagonist || bible.protagonist,
    antagonistConflict: updated.antagonistConflict || bible.antagonistConflict,
    toneGuidelines: updated.toneGuidelines || bible.toneGuidelines,
    logline: updated.logline || bible.logline,
    lastUpdated: new Date().toISOString(),
    version: incrementVersion(bible.version || '1.0.0')
  }
  
  return {
    updatedBible,
    updatedLogline: updated.logline,
    summary: updated.changesSummary || 'Updated production bible'
  }
}

/**
 * Apply fix to visual style
 */
async function applyVisualStyleFix(
  series: Series,
  fixSuggestion: string
): Promise<{ updatedAesthetic: any; updatedGuidelines: string; summary: string }> {
  const bible = series.production_bible || {}
  const aesthetic = bible.aesthetic || {}
  
  const prompt = `You are improving a TV series visual style based on feedback.

CURRENT VISUAL STYLE:
Visual Guidelines: ${bible.visualGuidelines || 'Not specified'}
Cinematography: ${aesthetic.cinematography || 'Not specified'}
Color Palette: ${JSON.stringify(aesthetic.colorPalette || {})}
Aspect Ratio: ${aesthetic.aspectRatio || 'Not specified'}
Visual Style: ${aesthetic.visualStyle || 'Not specified'}
Lighting Style: ${aesthetic.lightingStyle || 'Not specified'}

IMPROVEMENT REQUIRED:
${fixSuggestion}

Generate improvements to the visual style.

Return ONLY valid JSON:
{
  "visualGuidelines": "Updated comprehensive visual guidelines",
  "aesthetic": {
    "cinematography": "Updated cinematography notes",
    "colorPalette": {"primary": ["#hex1", "#hex2"], "accent": ["#hex3"]},
    "aspectRatio": "16:9 or 2.39:1 etc",
    "visualStyle": "Updated style description",
    "lightingStyle": "Updated lighting approach"
  },
  "changesSummary": "Brief description of what changed"
}`

  const response = await callLLM(
    { provider: 'gemini', model: 'gemini-2.5-flash', maxOutputTokens: 4096 },
    prompt
  )
  
  const updated = safeParseJSON(response)
  
  return {
    updatedAesthetic: { ...aesthetic, ...updated.aesthetic },
    updatedGuidelines: updated.visualGuidelines || bible.visualGuidelines || '',
    summary: updated.changesSummary || 'Updated visual style'
  }
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
