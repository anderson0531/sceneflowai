import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string; episodeId: string }>
}

/**
 * POST /api/series/[seriesId]/episodes/[episodeId]/start
 * 
 * Start a project from an episode blueprint
 * Creates a new project linked to the series with pre-populated treatment
 * 
 * Body:
 * - userId: Required. User UUID or email
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId, episodeId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }
    
    let resolvedUserId: string
    try {
      const resolvedUser = await resolveUser(userId)
      resolvedUserId = resolvedUser.id
    } catch (err) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    
    // Find the episode blueprint
    const episodeIndex = series.episode_blueprints?.findIndex(ep => ep.id === episodeId) ?? -1
    if (episodeIndex < 0) {
      return NextResponse.json({ success: false, error: 'Episode not found' }, { status: 404 })
    }
    
    const episode = series.episode_blueprints[episodeIndex]
    
    // Check if episode already has a project
    if (episode.projectId) {
      const existingProject = await Project.findByPk(episode.projectId)
      if (existingProject) {
        return NextResponse.json({
          success: false,
          error: 'Episode already has a project',
          projectId: episode.projectId
        }, { status: 409 })
      }
    }
    
    const bible = series.production_bible || {}
    
    // Build the project metadata with series-inherited data
    const treatmentFromEpisode = buildTreatmentFromEpisode(episode, bible, series)
    const visionPhaseCharacters = buildVisionPhaseCharacters(episode, bible)
    
    // Build Blueprint prime input from series data for auto-generation
    const blueprintPrimeInput = buildBlueprintPrimeInput(episode, bible, series)
    
    // Create the project
    const project = await Project.create({
      user_id: resolvedUserId,
      series_id: seriesId,
      episode_number: episode.episodeNumber,
      title: `${series.title} - Ep ${episode.episodeNumber}: ${episode.title}`,
      description: episode.synopsis || episode.logline,
      genre: series.genre,
      status: 'draft',
      current_step: 'ideation',
      step_progress: {},
      metadata: {
        // Series context
        seriesId,
        seriesTitle: series.title,
        episodeId,
        episodeNumber: episode.episodeNumber,
        
        // Blueprint prime input for auto-generation in Studio
        blueprintPrimeInput,
        
        // Pre-populated from series bible (legacy - kept for compatibility)
        approvedTreatment: treatmentFromEpisode,
        
        // Vision phase with inherited characters
        visionPhase: {
          characters: visionPhaseCharacters,
          scenes: [],
          generationSettings: {
            imageStyle: bible.aesthetic?.visualStyle || 'cinematic',
            aspectRatio: bible.aesthetic?.aspectRatio || '16:9'
          }
        },
        
        // Series production bible reference (for "Save to Bible" feature)
        seriesBibleRef: {
          version: bible.version,
          syncedAt: new Date().toISOString()
        }
      }
    })
    
    // Update episode blueprint with project link
    const updatedBlueprints = [...series.episode_blueprints]
    updatedBlueprints[episodeIndex] = {
      ...episode,
      projectId: project.id,
      status: 'in_progress'
    }
    
    await series.update({
      episode_blueprints: updatedBlueprints,
      status: series.status === 'draft' ? 'active' : series.status
    })
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/episodes/${episodeId}/start] Created project ${project.id}`)
    
    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        seriesId,
        episodeNumber: episode.episodeNumber,
        status: project.status,
        currentStep: project.current_step
      },
      episode: {
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        status: 'in_progress'
      }
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series/${seriesId}/episodes/${episodeId}/start] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Build a treatment object from episode blueprint and series bible
 */
function buildTreatmentFromEpisode(episode: any, bible: any, series: any) {
  // Map episode beats to treatment beat format
  const beats = (episode.beats || []).map((beat: any, index: number) => ({
    id: `beat_${index + 1}`,
    act: beat.act || 1,
    number: beat.beatNumber || index + 1,
    beat_title: beat.title,
    beat_description: beat.description,
    scene_elements: {
      visual: '',
      audio: '',
      narrative_point: beat.description
    }
  }))
  
  // Get character names for the treatment
  const characterNames = (episode.characters || [])
    .map((ec: any) => {
      const char = bible.characters?.find((c: any) => c.id === ec.characterId)
      return char?.name || ec.characterId
    })
    .filter(Boolean)
  
  return {
    title: episode.title,
    logline: episode.logline || `Episode ${episode.episodeNumber} of ${series.title}`,
    synopsis: episode.synopsis || '',
    genre: series.genre || '',
    tone_style: bible.toneGuidelines || '',
    visual_language: bible.visualGuidelines || '',
    characters: characterNames,
    beats,
    // Series context for continuity
    seriesContext: {
      seriesTitle: series.title,
      seriesLogline: series.logline,
      setting: bible.setting,
      protagonist: bible.protagonist,
      antagonistConflict: bible.antagonistConflict
    }
  }
}

/**
 * Build vision phase characters from series bible
 */
function buildVisionPhaseCharacters(episode: any, bible: any) {
  const episodeCharacterIds = (episode.characters || []).map((ec: any) => ec.characterId)
  
  return (bible.characters || [])
    .filter((char: any) => episodeCharacterIds.includes(char.id))
    .map((char: any) => {
      const episodeChar = episode.characters?.find((ec: any) => ec.characterId === char.id)
      return {
        id: char.id,
        name: char.name,
        role: episodeChar?.role || char.role,
        description: char.description,
        appearance: char.appearance,
        referenceUrl: char.referenceImageUrl,
        voiceId: char.voiceId,
        // Inherited from series for visual consistency
        lockedPromptTokens: char.lockedPromptTokens,
        // Episode-specific arc
        episodeArc: episodeChar?.episodeArc
      }
    })
}

/**
 * Build Blueprint prime input from series data for auto-generation in Studio
 * Combines: Series overview, episode details, characters, locations, and visual style
 */
function buildBlueprintPrimeInput(episode: any, bible: any, series: any): string {
  const lines: string[] = []
  
  // Series and Episode header
  lines.push(`Series: ${series.title}`)
  lines.push(`Episode ${episode.episodeNumber}: ${episode.title}`)
  lines.push('')
  
  // Episode logline and synopsis
  if (episode.logline) {
    lines.push(`Logline: ${episode.logline}`)
  }
  if (episode.synopsis) {
    lines.push('')
    lines.push(`Synopsis: ${episode.synopsis}`)
  }
  lines.push('')
  
  // Setting from production bible
  if (bible.setting?.description || bible.setting?.timePeriod) {
    lines.push('Setting:')
    if (bible.setting.description) {
      lines.push(bible.setting.description)
    }
    if (bible.setting.timePeriod) {
      lines.push(`Time Period: ${bible.setting.timePeriod}`)
    }
    if (bible.setting.location) {
      lines.push(`Location: ${bible.setting.location}`)
    }
    lines.push('')
  }
  
  // Protagonist from production bible
  if (bible.protagonist?.name || bible.protagonist?.goal) {
    lines.push('Protagonist:')
    if (bible.protagonist.name) {
      lines.push(`${bible.protagonist.name}`)
    }
    if (bible.protagonist.goal) {
      lines.push(`Goal: ${bible.protagonist.goal}`)
    }
    lines.push('')
  }
  
  // Antagonist/Conflict from production bible
  if (bible.antagonistConflict?.description) {
    lines.push('Antagonist/Conflict:')
    lines.push(bible.antagonistConflict.description)
    if (bible.antagonistConflict.type) {
      lines.push(`Type: ${bible.antagonistConflict.type}`)
    }
    lines.push('')
  }
  
  // Characters from production bible (those appearing in this episode)
  const episodeCharacterIds = (episode.characters || []).map((ec: any) => ec.characterId)
  const episodeCharacters = (bible.characters || []).filter((char: any) => 
    episodeCharacterIds.includes(char.id)
  )
  
  if (episodeCharacters.length > 0) {
    lines.push('Characters in this episode:')
    episodeCharacters.forEach((char: any) => {
      const episodeChar = episode.characters?.find((ec: any) => ec.characterId === char.id)
      const role = episodeChar?.role || char.role || 'supporting'
      lines.push(`- ${char.name} (${role}): ${char.description || 'No description'}`)
      if (episodeChar?.episodeArc) {
        lines.push(`  Episode arc: ${episodeChar.episodeArc}`)
      }
    })
    lines.push('')
  }
  
  // Locations from production bible
  if (bible.locations?.length > 0) {
    lines.push('Locations:')
    bible.locations.forEach((loc: any) => {
      lines.push(`- ${loc.name}: ${loc.description || 'No description'}`)
    })
    lines.push('')
  }
  
  // Visual style from production bible aesthetic
  if (bible.aesthetic) {
    lines.push('Visual Style:')
    if (bible.aesthetic.visualStyle) {
      lines.push(`Style: ${bible.aesthetic.visualStyle}`)
    }
    if (bible.aesthetic.mood) {
      lines.push(`Mood: ${bible.aesthetic.mood}`)
    }
    if (bible.aesthetic.colorPalette) {
      lines.push(`Color Palette: ${bible.aesthetic.colorPalette}`)
    }
    if (bible.aesthetic.lightingStyle) {
      lines.push(`Lighting: ${bible.aesthetic.lightingStyle}`)
    }
    lines.push('')
  }
  
  // Episode beats if available (gives structure hints)
  if (episode.beats?.length > 0) {
    lines.push('Story Beats:')
    episode.beats.forEach((beat: any) => {
      lines.push(`Act ${beat.act}, Beat ${beat.beatNumber}: ${beat.title}`)
      if (beat.description) {
        lines.push(`  ${beat.description}`)
      }
    })
  }
  
  return lines.join('\n').trim()
}
