import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, SeriesCharacter, SeriesLocation } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * GET /api/series/[seriesId]/bible
 * 
 * Get the series production bible
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      bible: series.production_bible,
      seriesTitle: series.title,
      version: series.production_bible?.version || '1.0.0'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/series/[seriesId]/bible
 * 
 * Sync project data to series production bible
 * Implements the "explicit save with diff preview" pattern
 * 
 * Body:
 * - projectId: Required. Source project ID
 * - syncFields: Required. Array of fields to sync: 'characters', 'locations', 'aesthetic', 'all'
 * - preview: Optional. If true, returns diff without applying changes (default: false)
 * - mergeStrategy: Optional. 'replace' | 'merge' | 'add_new_only' (default: 'merge')
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
      projectId,
      syncFields,
      preview = false,
      mergeStrategy = 'merge'
    } = body
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }
    
    if (!syncFields || !Array.isArray(syncFields) || syncFields.length === 0) {
      return NextResponse.json({ success: false, error: 'syncFields array is required' }, { status: 400 })
    }
    
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    
    // Verify project belongs to this series
    if (project.series_id !== seriesId) {
      return NextResponse.json({
        success: false,
        error: 'Project does not belong to this series'
      }, { status: 403 })
    }
    
    const currentBible = series.production_bible || {}
    const projectMetadata = project.metadata || {}
    const visionPhase = projectMetadata.visionPhase || {}
    
    // Build diff/changes
    const changes: BibleSyncChanges = {
      characters: { added: [], updated: [], removed: [] },
      locations: { added: [], updated: [], removed: [] },
      aesthetic: { before: {}, after: {} }
    }
    
    const updatedBible = { ...currentBible }
    const syncAll = syncFields.includes('all')
    
    // Sync characters
    if (syncAll || syncFields.includes('characters')) {
      const result = syncCharacters(
        currentBible.characters || [],
        visionPhase.characters || [],
        mergeStrategy
      )
      changes.characters = result.changes
      updatedBible.characters = result.merged
    }
    
    // Sync locations (from scenes/settings)
    if (syncAll || syncFields.includes('locations')) {
      const projectLocations = extractLocationsFromProject(projectMetadata)
      const result = syncLocations(
        currentBible.locations || [],
        projectLocations,
        mergeStrategy
      )
      changes.locations = result.changes
      updatedBible.locations = result.merged
    }
    
    // Sync aesthetic settings
    if (syncAll || syncFields.includes('aesthetic')) {
      const projectAesthetic = visionPhase.generationSettings || {}
      changes.aesthetic = {
        before: currentBible.aesthetic || {},
        after: { ...currentBible.aesthetic, ...projectAesthetic }
      }
      if (!preview) {
        updatedBible.aesthetic = changes.aesthetic.after
      }
    }
    
    // If preview mode, return diff without applying
    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        diff: changes,
        currentVersion: currentBible.version || '1.0.0',
        wouldUpdateTo: incrementVersion(currentBible.version || '1.0.0')
      })
    }
    
    // Apply changes
    updatedBible.version = incrementVersion(currentBible.version || '1.0.0')
    updatedBible.lastUpdated = new Date().toISOString()
    updatedBible.lastUpdatedBy = `project:${projectId}`
    
    await series.update({ production_bible: updatedBible })
    
    // Update project's bible reference
    await project.update({
      metadata: {
        ...projectMetadata,
        seriesBibleRef: {
          version: updatedBible.version,
          syncedAt: new Date().toISOString(),
          direction: 'push_to_series'
        }
      }
    })
    
    console.log(`[${timestamp}] [POST /api/series/${seriesId}/bible] Synced from project ${projectId}`)
    
    return NextResponse.json({
      success: true,
      applied: true,
      changes,
      newVersion: updatedBible.version
    })
    
  } catch (error) {
    console.error(`[POST /api/series/${seriesId}/bible] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/series/[seriesId]/bible
 * 
 * Pull series bible into a project (inverse of POST)
 * Updates project with latest series bible data
 * 
 * Body:
 * - projectId: Required. Target project ID
 * - syncFields: Optional. Array of fields to sync (default: all)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    const body = await request.json()
    const { projectId, syncFields = ['characters', 'locations', 'aesthetic'] } = body
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }
    
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    
    if (project.series_id !== seriesId) {
      return NextResponse.json({
        success: false,
        error: 'Project does not belong to this series'
      }, { status: 403 })
    }
    
    const bible = series.production_bible || {}
    const projectMetadata = project.metadata || {}
    const visionPhase = projectMetadata.visionPhase || {}
    
    const updatedVisionPhase = { ...visionPhase }
    
    // Pull characters from series bible
    if (syncFields.includes('characters') || syncFields.includes('all')) {
      const seriesChars = bible.characters || []
      const episodeBlueprint = series.episode_blueprints?.find(
        ep => ep.projectId === projectId
      )
      const episodeCharIds = episodeBlueprint?.characters?.map(c => c.characterId) || []
      
      // Get characters relevant to this episode, or all if not found
      const relevantChars = episodeCharIds.length > 0
        ? seriesChars.filter(c => episodeCharIds.includes(c.id))
        : seriesChars
      
      updatedVisionPhase.characters = relevantChars.map((char: SeriesCharacter) => ({
        id: char.id,
        name: char.name,
        role: char.role,
        description: char.description,
        appearance: char.appearance,
        referenceUrl: char.referenceImageUrl,
        voiceId: char.voiceId,
        lockedPromptTokens: char.lockedPromptTokens
      }))
    }
    
    // Pull aesthetic settings
    if (syncFields.includes('aesthetic') || syncFields.includes('all')) {
      updatedVisionPhase.generationSettings = {
        ...visionPhase.generationSettings,
        imageStyle: bible.aesthetic?.visualStyle,
        aspectRatio: bible.aesthetic?.aspectRatio,
        colorPalette: bible.aesthetic?.colorPalette
      }
    }
    
    await project.update({
      metadata: {
        ...projectMetadata,
        visionPhase: updatedVisionPhase,
        seriesBibleRef: {
          version: bible.version,
          syncedAt: new Date().toISOString(),
          direction: 'pull_from_series'
        }
      }
    })
    
    console.log(`[${timestamp}] [PUT /api/series/${seriesId}/bible] Pulled to project ${projectId}`)
    
    return NextResponse.json({
      success: true,
      syncedFields: syncFields,
      bibleVersion: bible.version
    })
    
  } catch (error) {
    console.error(`[PUT /api/series/${seriesId}/bible] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Types for sync changes
interface BibleSyncChanges {
  characters: {
    added: SeriesCharacter[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  locations: {
    added: SeriesLocation[]
    updated: Array<{ id: string; fields: string[] }>
    removed: string[]
  }
  aesthetic: {
    before: any
    after: any
  }
}

/**
 * Sync characters between bible and project
 */
function syncCharacters(
  bibleChars: SeriesCharacter[],
  projectChars: any[],
  strategy: string
): { merged: SeriesCharacter[]; changes: BibleSyncChanges['characters'] } {
  const changes: BibleSyncChanges['characters'] = { added: [], updated: [], removed: [] }
  const bibleMap = new Map(bibleChars.map(c => [c.id, c]))
  const projectMap = new Map(projectChars.map(c => [c.id, c]))
  
  let merged: SeriesCharacter[] = []
  
  if (strategy === 'replace') {
    // Full replacement
    merged = projectChars.map(pc => toSeriesCharacter(pc))
    changes.added = merged.filter(c => !bibleMap.has(c.id))
    changes.removed = bibleChars.filter(c => !projectMap.has(c.id)).map(c => c.id)
  } else if (strategy === 'add_new_only') {
    // Keep existing, add new
    merged = [...bibleChars]
    for (const pc of projectChars) {
      if (!bibleMap.has(pc.id)) {
        const newChar = toSeriesCharacter(pc)
        merged.push(newChar)
        changes.added.push(newChar)
      }
    }
  } else {
    // Merge (default)
    merged = [...bibleChars]
    for (const pc of projectChars) {
      const existing = bibleMap.get(pc.id)
      if (existing) {
        // Update existing
        const updatedFields: string[] = []
        if (pc.appearance && pc.appearance !== existing.appearance) updatedFields.push('appearance')
        if (pc.referenceUrl && pc.referenceUrl !== existing.referenceImageUrl) updatedFields.push('referenceImageUrl')
        if (pc.voiceId && pc.voiceId !== existing.voiceId) updatedFields.push('voiceId')
        if (pc.lockedPromptTokens) updatedFields.push('lockedPromptTokens')
        
        if (updatedFields.length > 0) {
          const idx = merged.findIndex(c => c.id === pc.id)
          merged[idx] = {
            ...existing,
            appearance: pc.appearance || existing.appearance,
            referenceImageUrl: pc.referenceUrl || existing.referenceImageUrl,
            voiceId: pc.voiceId || existing.voiceId,
            lockedPromptTokens: pc.lockedPromptTokens || existing.lockedPromptTokens,
            updatedAt: new Date().toISOString()
          }
          changes.updated.push({ id: pc.id, fields: updatedFields })
        }
      } else {
        // Add new
        const newChar = toSeriesCharacter(pc)
        merged.push(newChar)
        changes.added.push(newChar)
      }
    }
  }
  
  return { merged, changes }
}

/**
 * Sync locations
 */
function syncLocations(
  bibleLocs: SeriesLocation[],
  projectLocs: SeriesLocation[],
  strategy: string
): { merged: SeriesLocation[]; changes: BibleSyncChanges['locations'] } {
  const changes: BibleSyncChanges['locations'] = { added: [], updated: [], removed: [] }
  const bibleMap = new Map(bibleLocs.map(l => [l.id, l]))
  
  let merged: SeriesLocation[] = []
  
  if (strategy === 'replace') {
    merged = projectLocs
    changes.added = projectLocs.filter(l => !bibleMap.has(l.id))
  } else if (strategy === 'add_new_only') {
    merged = [...bibleLocs]
    for (const pl of projectLocs) {
      if (!bibleMap.has(pl.id)) {
        merged.push(pl)
        changes.added.push(pl)
      }
    }
  } else {
    // Merge
    merged = [...bibleLocs]
    for (const pl of projectLocs) {
      if (!bibleMap.has(pl.id)) {
        merged.push(pl)
        changes.added.push(pl)
      }
    }
  }
  
  return { merged, changes }
}

/**
 * Extract locations from project metadata
 */
function extractLocationsFromProject(metadata: any): SeriesLocation[] {
  const locations: SeriesLocation[] = []
  const scenes = metadata.visionPhase?.scenes || []
  
  for (const scene of scenes) {
    if (scene.heading) {
      // Parse scene heading: "INT. LOCATION - TIME"
      const match = scene.heading.match(/^(?:INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-\s*.+)?$/i)
      const locName = match?.[1]?.trim() || scene.heading
      
      if (locName && !locations.find(l => l.name === locName)) {
        locations.push({
          id: `loc_${locName.toLowerCase().replace(/\s+/g, '_')}`,
          name: locName,
          description: scene.visualDescription || '',
          visualDescription: scene.visualDescription,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }
  }
  
  return locations
}

/**
 * Convert project character to series character format
 */
function toSeriesCharacter(pc: any): SeriesCharacter {
  return {
    id: pc.id,
    name: pc.name,
    role: pc.role || 'supporting',
    description: pc.description || '',
    appearance: pc.appearance || '',
    backstory: pc.backstory,
    personality: pc.personality,
    voiceId: pc.voiceId,
    referenceImageUrl: pc.referenceUrl,
    lockedPromptTokens: pc.lockedPromptTokens,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Increment version
 */
function incrementVersion(version: string): string {
  const parts = version.split('.')
  const patch = parseInt(parts[2] || '0', 10) + 1
  return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`
}
