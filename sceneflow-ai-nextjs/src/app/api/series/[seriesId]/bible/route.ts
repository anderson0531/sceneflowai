import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, SeriesCharacter, SeriesLocation } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { visionPhaseToScriptData } from '@/lib/script/scriptExporter'
import type { KeyEvent, StoryThread, EpisodeSummary, SeriesProductionBible, SeriesBibleEvent } from '@/types/series'
import { getUiSandboxSeries, isDemoSeriesId } from '@/lib/demo/uiSandboxSeries'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * GET /api/series/[seriesId]/bible
 * 
 * Get the series reference library
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params
  
  try {
    if (isDemoSeriesId(seriesId)) {
      const demo = getUiSandboxSeries(seriesId)
      return NextResponse.json({
        success: true,
        bible: demo.productionBible,
        seriesTitle: demo.title,
        version: demo.productionBible.version || '1.4.0',
        demoMode: true,
      })
    }

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
 * Sync project data to series reference library
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
    if (isDemoSeriesId(seriesId)) {
      const demo = getUiSandboxSeries(seriesId)
      return NextResponse.json({
        success: true,
        bible: demo.productionBible,
        seriesTitle: demo.title,
        version: demo.productionBible.version || '1.4.0',
        demoMode: true,
      })
    }

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
      aesthetic: { before: {}, after: {} },
      storyline: undefined
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
    
    // Sync aesthetic settings (preserve Series-locked artStyle & artStyleSpec!)
    if (syncAll || syncFields.includes('aesthetic')) {
      const projectAesthetic = visionPhase.generationSettings || {}
      const lockedSeriesArtStyle = currentBible.aesthetic?.artStyle
      const lockedSeriesArtStyleSpec = currentBible.aesthetic?.artStyleSpec
      changes.aesthetic = {
        before: currentBible.aesthetic || {},
        after: {
          ...currentBible.aesthetic,
          ...projectAesthetic,
          ...(lockedSeriesArtStyle ? { artStyle: lockedSeriesArtStyle } : {}),
          ...(lockedSeriesArtStyleSpec ? { artStyleSpec: lockedSeriesArtStyleSpec } : {}),
          ...(currentBible.aesthetic?.artStyleLocked !== undefined
            ? { artStyleLocked: currentBible.aesthetic.artStyleLocked }
            : {}),
        },
      }
      if (!preview) {
        updatedBible.aesthetic = changes.aesthetic.after
      }
    }
    
    // Sync storyline (AI-assisted key event extraction)
    if (syncAll || syncFields.includes('storyline')) {
      const episodeNumber = project.episode_number || projectMetadata.episodeNumber || 1
      const storylineResult = await extractAndSyncStoryline(
        project,
        currentBible as SeriesProductionBible,
        series.title,
        episodeNumber,
        mergeStrategy
      )
      changes.storyline = storylineResult.changes
      if (!preview) {
        updatedBible.episodeSummaries = storylineResult.updatedEpisodeSummaries
        updatedBible.keyEvents = storylineResult.updatedKeyEvents
        updatedBible.storyThreads = storylineResult.updatedStoryThreads
        updatedBible.unresolvedHooks = storylineResult.updatedUnresolvedHooks
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
    
    await series.update({
      production_bible: updatedBible,
      metadata: appendBibleEvent(series.metadata, {
        id: `evt_${Date.now()}`,
        direction: 'push_to_series',
        projectId,
        episodeNumber: project.episode_number || projectMetadata.episodeNumber,
        syncFields,
        bibleVersion: updatedBible.version,
        status: 'applied',
        createdAt: new Date().toISOString(),
      }),
    })
    
    // Update project's bible reference
    await project.update({
      metadata: {
        ...projectMetadata,
        seriesBibleRef: {
          version: updatedBible.version,
          seriesTitle: series.title,
          aesthetic: updatedBible.aesthetic,
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
    if (isDemoSeriesId(seriesId)) {
      const demo = getUiSandboxSeries(seriesId)
      return NextResponse.json({
        success: true,
        bible: demo.productionBible,
        seriesTitle: demo.title,
        version: demo.productionBible.version || '1.4.0',
        demoMode: true,
      })
    }

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
      
      const existingProjectChars: Array<Record<string, any>> = Array.isArray(updatedVisionPhase.characters)
        ? updatedVisionPhase.characters
        : []
      const existingById = new Map(existingProjectChars.map((c) => [c.id, c]))

      updatedVisionPhase.characters = relevantChars.map((char: SeriesCharacter) => {
        const prev = existingById.get(char.id) || {}
        const standingAppearance =
          char.appearanceDescription || char.appearance || prev.appearanceDescription || prev.appearance || ''
        const refImg =
          char.referenceImageUrl || prev.referenceImage || prev.referenceUrl || null
        return {
          ...prev,
          id: char.id,
          name: char.name,
          role: char.role || prev.role,
          description: char.description || prev.description,
          appearance: standingAppearance,
          appearanceDescription: standingAppearance,
          age: char.age ?? prev.age,
          gender: char.gender ?? prev.gender,
          ethnicity: char.ethnicity ?? prev.ethnicity,
          build: char.build ?? prev.build,
          hairStyle: char.hairStyle ?? prev.hairStyle,
          hairColor: char.hairColor ?? prev.hairColor,
          eyeColor: char.eyeColor ?? prev.eyeColor,
          keyFeature: char.keyFeature ?? prev.keyFeature,
          expression: char.expression ?? prev.expression,
          defaultWardrobe: char.defaultWardrobe ?? prev.defaultWardrobe,
          wardrobeAccessories: char.wardrobeAccessories ?? prev.wardrobeAccessories,
          voiceDescription: char.voiceDescription ?? prev.voiceDescription,
          familyRelationships: char.familyRelationships ?? prev.familyRelationships,
          wardrobes: char.wardrobes ?? prev.wardrobes,
          referenceUrl: refImg,
          referenceImage: refImg,
          voiceId: char.voiceId ?? prev.voiceId,
          lockedPromptTokens: char.lockedPromptTokens ?? prev.lockedPromptTokens,
        }
      })
    }
    
    // Pull aesthetic settings & Series-locked Global Art Style
    const { applyArtStyleToProjectMetadata, resolveSeriesArtStyleSpec, serializeArtStyleValue } =
      await import('@/lib/artStyle/globalArtStyle')
    const seriesArtStyleSpec = {
      ...resolveSeriesArtStyleSpec({
        seriesId,
        seriesTitle: series.title,
        metadata: series.metadata,
        productionBible: bible,
      }),
      confirmed: true,
      source: 'series' as const,
      lockedBySeriesId: seriesId,
      lockedBySeriesTitle: series.title,
    }
    const serializedSeriesArtStyle = serializeArtStyleValue(seriesArtStyleSpec)

    if (syncFields.includes('aesthetic') || syncFields.includes('all')) {
      updatedVisionPhase.artStyle = serializedSeriesArtStyle
      updatedVisionPhase.artStyleSpec = seriesArtStyleSpec
      updatedVisionPhase.generationSettings = {
        ...visionPhase.generationSettings,
        imageStyle: bible.aesthetic?.visualStyle || seriesArtStyleSpec.title,
        aspectRatio: bible.aesthetic?.aspectRatio || visionPhase.generationSettings?.aspectRatio,
        colorPalette: bible.aesthetic?.colorPalette || visionPhase.generationSettings?.colorPalette,
      }
    }
    
    // Build continuity context for project metadata
    const continuitySnapshot: Record<string, any> = {}
    if (syncFields.includes('storyline') || syncFields.includes('all')) {
      continuitySnapshot.episodeSummaries = bible.episodeSummaries || []
      continuitySnapshot.keyEvents = bible.keyEvents || []
      continuitySnapshot.storyThreads = bible.storyThreads || []
      continuitySnapshot.unresolvedHooks = bible.unresolvedHooks || []
      continuitySnapshot.consistencyRules = bible.consistencyRules || []
    }
    
    const baseMergedMeta = {
      ...projectMetadata,
      visionPhase: updatedVisionPhase,
      ...(Object.keys(continuitySnapshot).length > 0 ? { seriesContinuity: continuitySnapshot } : {}),
      seriesBibleRef: {
        version: bible.version,
        seriesTitle: series.title,
        aesthetic: {
          ...(bible.aesthetic || {}),
          artStyle: serializedSeriesArtStyle,
          artStyleSpec: seriesArtStyleSpec,
          artStyleLocked: true,
        },
        syncedAt: new Date().toISOString(),
        direction: 'pull_from_series'
      }
    }
    const finalMergedMeta =
      syncFields.includes('aesthetic') || syncFields.includes('all')
        ? applyArtStyleToProjectMetadata(baseMergedMeta, seriesArtStyleSpec)
        : baseMergedMeta

    await project.update({
      metadata: finalMergedMeta as any,
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
  storyline?: {
    episodeSummary?: EpisodeSummary
    keyEventsAdded: KeyEvent[]
    storyThreadsUpdated: StoryThread[]
    unresolvedHooksUpdated: string[]
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
        const pcAppearance = pc.appearanceDescription || pc.appearance
        const pcRefImg = pc.referenceImage || pc.referenceUrl
        if (pcAppearance && pcAppearance !== existing.appearance) updatedFields.push('appearance')
        if (pcRefImg && pcRefImg !== existing.referenceImageUrl) updatedFields.push('referenceImageUrl')
        if (pc.voiceId && pc.voiceId !== existing.voiceId) updatedFields.push('voiceId')
        if (pc.ethnicity && pc.ethnicity !== existing.ethnicity) updatedFields.push('ethnicity')
        if (pc.age && pc.age !== existing.age) updatedFields.push('age')
        if (pc.lockedPromptTokens) updatedFields.push('lockedPromptTokens')
        
        if (updatedFields.length > 0) {
          const idx = merged.findIndex(c => c.id === pc.id)
          merged[idx] = {
            ...existing,
            appearance: pcAppearance || existing.appearance,
            appearanceDescription: pcAppearance || existing.appearanceDescription,
            age: pc.age ?? existing.age,
            gender: pc.gender ?? existing.gender,
            ethnicity: pc.ethnicity ?? existing.ethnicity,
            build: pc.build ?? existing.build,
            hairStyle: pc.hairStyle ?? existing.hairStyle,
            hairColor: pc.hairColor ?? existing.hairColor,
            eyeColor: pc.eyeColor ?? existing.eyeColor,
            keyFeature: pc.keyFeature ?? existing.keyFeature,
            expression: pc.expression ?? existing.expression,
            defaultWardrobe: pc.defaultWardrobe ?? existing.defaultWardrobe,
            wardrobeAccessories: pc.wardrobeAccessories ?? existing.wardrobeAccessories,
            voiceDescription: pc.voiceDescription ?? existing.voiceDescription,
            familyRelationships: pc.familyRelationships ?? existing.familyRelationships,
            wardrobes: pc.wardrobes ?? existing.wardrobes,
            referenceImageUrl: pcRefImg || existing.referenceImageUrl,
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
  const standingAppearance = pc.appearanceDescription || pc.appearance || ''
  return {
    id: pc.id,
    name: pc.name,
    role: pc.role || 'supporting',
    description: pc.description || '',
    appearance: standingAppearance,
    appearanceDescription: standingAppearance || undefined,
    age: pc.age ?? pc.ageRange,
    gender: pc.gender,
    ethnicity: pc.ethnicity,
    build: pc.build,
    hairStyle: pc.hairStyle,
    hairColor: pc.hairColor,
    eyeColor: pc.eyeColor,
    keyFeature: pc.keyFeature,
    expression: pc.expression,
    defaultWardrobe: pc.defaultWardrobe,
    wardrobeAccessories: pc.wardrobeAccessories,
    voiceDescription: pc.voiceDescription,
    familyRelationships: pc.familyRelationships,
    backstory: pc.backstory,
    personality: pc.personality,
    voiceId: pc.voiceId || pc.voiceConfig?.voiceId,
    referenceImageUrl: pc.referenceImage || pc.referenceUrl,
    lockedPromptTokens: pc.lockedPromptTokens,
    ...(Array.isArray(pc.wardrobes) ? { wardrobes: pc.wardrobes } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

// ─── Storyline Sync (AI-assisted) ────────────────────────────────────────────

interface StorylineSyncResult {
  changes: BibleSyncChanges['storyline']
  updatedEpisodeSummaries: EpisodeSummary[]
  updatedKeyEvents: KeyEvent[]
  updatedStoryThreads: StoryThread[]
  updatedUnresolvedHooks: string[]
}

/**
 * Extract key events, episode summary, and story thread updates from a
 * completed episode's script using AI, then merge into the series bible.
 */
async function extractAndSyncStoryline(
  project: any,
  currentBible: SeriesProductionBible,
  seriesTitle: string,
  episodeNumber: number,
  mergeStrategy: string
): Promise<StorylineSyncResult> {
  const metadata = project.metadata || {}
  const visionPhase = metadata.visionPhase || {}

  // Flatten script content for AI analysis
  const scriptData = visionPhaseToScriptData(visionPhase, project.title)
  const characters = visionPhase.characters || []

  // Build a condensed script representation for the AI prompt
  const scriptSummary = scriptData.scenes.map(scene => {
    const dialogueLines = scene.dialogue?.map(
      d => `  ${d.character}${d.parenthetical ? ` ${d.parenthetical}` : ''}: ${d.line}`
    ).join('\n') || ''
    return [
      `SCENE ${scene.sceneNumber}: ${scene.heading || scene.action?.substring(0, 80) || 'Untitled'}`,
      scene.action ? `  Action: ${scene.action.substring(0, 300)}` : '',
      dialogueLines ? `  Dialogue:\n${dialogueLines}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  // Character name → ID mapping for the AI to reference
  const characterMap = characters.map((c: any) => `${c.name} (ID: ${c.id || c.name})`).join(', ')

  // Existing bible context so AI can update (not duplicate) threads
  const existingThreads = (currentBible.storyThreads || []).map(
    t => `- ${t.name} (${t.id}): ${t.status} — ${t.description || 'no description'}`
  ).join('\n')

  const existingHooks = (currentBible.unresolvedHooks || []).map(
    h => `- ${h}`
  ).join('\n')

  const prompt = `You are a professional TV script analyst and story continuity editor.

Analyze the following script for Episode ${episodeNumber} of "${seriesTitle}" and extract structured storyline data.

## CHARACTERS IN SERIES
${characterMap || 'No character data available'}

## EXISTING STORY THREADS
${existingThreads || 'None yet — this may be the first episode'}

## EXISTING UNRESOLVED HOOKS
${existingHooks || 'None yet'}

## EPISODE ${episodeNumber} SCRIPT
${scriptSummary}

## YOUR TASK
Extract the following from this episode's script:

1. **Episode Summary**: A 2-3 sentence canonical summary of what happened in this episode
2. **Key Events**: Important events that affect future episodes. For each, identify:
   - type: one of: death, relocation, reveal, relationship_change, acquisition, injury, transformation, departure, arrival, conflict_resolution, betrayal, other
   - description: what happened
   - affectedCharacterIds: array of character IDs affected (use the IDs from the character list above; if a character isn't in the list, use their name as ID)
   - irreversible: true if this cannot be undone (deaths, permanent departures, major reveals)
3. **Story Thread Updates**: For each existing story thread, update its status if this episode progressed it. Also add any NEW threads introduced in this episode.
   - Statuses: introduced, developing, climax, resolved
4. **Unresolved Hooks**: End-of-episode cliffhangers or open questions that future episodes should address. Include existing hooks that were NOT resolved in this episode, and add any new ones. Remove hooks that WERE resolved.

## RESPONSE FORMAT (JSON only, no markdown)
{
  "episodeSummary": "2-3 sentence summary of the episode",
  "keyEvents": [
    {
      "type": "death|relocation|reveal|relationship_change|acquisition|injury|transformation|departure|arrival|conflict_resolution|betrayal|other",
      "description": "What happened",
      "affectedCharacterIds": ["char_id_1"],
      "affectedLocationIds": [],
      "irreversible": true
    }
  ],
  "storyThreadUpdates": [
    {
      "id": "existing_thread_id or new_thread_id",
      "name": "Thread name",
      "type": "main|subplot|character|mystery|romance",
      "status": "introduced|developing|climax|resolved",
      "description": "Current state of this thread",
      "isNew": false
    }
  ],
  "unresolvedHooks": ["Hook description 1", "Hook description 2"]
}`

  try {
    const result = await generateText(prompt, {
      temperature: 0.3,
      responseMimeType: 'application/json',
      systemInstruction: 'You are a screenplay continuity analyst. Return ONLY valid JSON matching the specified schema. Be thorough but precise — only flag events that genuinely affect future episodes.',
      maxOutputTokens: 4096,
    })

    const extracted = safeParseJsonFromText(result.text)

    if (!extracted || typeof extracted !== 'object') {
      console.error('[BibleSync] AI extraction returned invalid data')
      return emptyStorylineResult(currentBible)
    }

    // Build the episode summary
    const newSummary: EpisodeSummary = {
      episodeNumber,
      title: project.title || `Episode ${episodeNumber}`,
      summary: extracted.episodeSummary || `Episode ${episodeNumber} completed`,
      keyEventIds: [],
      characterStatuses: {},
      createdAt: new Date().toISOString(),
    }

    // Build key events with IDs
    const newKeyEvents: KeyEvent[] = (extracted.keyEvents || []).map((e: any, idx: number) => {
      const event: KeyEvent = {
        id: `ke_ep${episodeNumber}_${idx + 1}_${Date.now()}`,
        episodeNumber,
        type: e.type || 'other',
        description: e.description || '',
        affectedCharacterIds: e.affectedCharacterIds || [],
        affectedLocationIds: e.affectedLocationIds || [],
        irreversible: e.irreversible === true,
        createdAt: new Date().toISOString(),
      }
      return event
    })

    // Link key event IDs to the summary
    newSummary.keyEventIds = newKeyEvents.map(e => e.id)

    // Derive character statuses from this episode's events
    const charNameMap = new Map<string, string>()
    for (const c of characters) {
      charNameMap.set(c.id || c.name, c.name)
    }
    for (const event of newKeyEvents) {
      for (const charId of event.affectedCharacterIds) {
        const charName = charNameMap.get(charId) || charId
        switch (event.type) {
          case 'death': newSummary.characterStatuses![charName] = 'DECEASED'; break
          case 'departure': newSummary.characterStatuses![charName] = `Departed (Ep ${episodeNumber})`; break
          case 'relocation': newSummary.characterStatuses![charName] = `Relocated: ${event.description}`; break
          case 'injury': newSummary.characterStatuses![charName] = `Injured: ${event.description}`; break
          case 'transformation': newSummary.characterStatuses![charName] = `Transformed: ${event.description}`; break
          default: newSummary.characterStatuses![charName] = event.description; break
        }
      }
    }

    // Merge episode summaries (replace if exists for this episode, add if new)
    const existingSummaries = [...(currentBible.episodeSummaries || [])]
    const existingIdx = existingSummaries.findIndex(s => s.episodeNumber === episodeNumber)
    if (existingIdx >= 0) {
      existingSummaries[existingIdx] = newSummary
    } else {
      existingSummaries.push(newSummary)
    }
    existingSummaries.sort((a, b) => a.episodeNumber - b.episodeNumber)

    // Merge key events
    let updatedKeyEvents = [...(currentBible.keyEvents || [])]
    if (mergeStrategy === 'replace') {
      // Replace all events for this episode
      updatedKeyEvents = updatedKeyEvents.filter(e => e.episodeNumber !== episodeNumber)
    }
    // Remove any existing events from this episode if re-syncing, then add new
    updatedKeyEvents = updatedKeyEvents.filter(e => e.episodeNumber !== episodeNumber)
    updatedKeyEvents.push(...newKeyEvents)
    updatedKeyEvents.sort((a, b) => a.episodeNumber - b.episodeNumber)

    // Update story threads
    const threadMap = new Map<string, StoryThread>()
    for (const t of (currentBible.storyThreads || [])) {
      threadMap.set(t.id, t)
    }
    for (const update of (extracted.storyThreadUpdates || [])) {
      if (update.isNew) {
        const newThread: StoryThread = {
          id: update.id || `thread_${update.name?.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
          name: update.name,
          type: update.type || 'subplot',
          status: update.status || 'introduced',
          description: update.description,
          introducedInEpisode: episodeNumber,
        }
        threadMap.set(newThread.id, newThread)
      } else if (threadMap.has(update.id)) {
        const existing = threadMap.get(update.id)!
        existing.status = update.status || existing.status
        if (update.description) existing.description = update.description
        if (update.status === 'resolved') existing.resolvedInEpisode = episodeNumber
      }
    }
    const updatedStoryThreads = Array.from(threadMap.values())

    // Update unresolved hooks
    const updatedUnresolvedHooks: string[] = extracted.unresolvedHooks || currentBible.unresolvedHooks || []

    return {
      changes: {
        episodeSummary: newSummary,
        keyEventsAdded: newKeyEvents,
        storyThreadsUpdated: updatedStoryThreads,
        unresolvedHooksUpdated: updatedUnresolvedHooks,
      },
      updatedEpisodeSummaries: existingSummaries,
      updatedKeyEvents,
      updatedStoryThreads,
      updatedUnresolvedHooks,
    }
  } catch (error) {
    console.error('[BibleSync] Storyline extraction failed:', error)
    return emptyStorylineResult(currentBible)
  }
}

/**
 * Return a no-op result that preserves the current bible data when extraction fails
 */
function emptyStorylineResult(bible: SeriesProductionBible): StorylineSyncResult {
  return {
    changes: {
      keyEventsAdded: [],
      storyThreadsUpdated: [],
      unresolvedHooksUpdated: [],
    },
    updatedEpisodeSummaries: bible.episodeSummaries || [],
    updatedKeyEvents: bible.keyEvents || [],
    updatedStoryThreads: bible.storyThreads || [],
    updatedUnresolvedHooks: bible.unresolvedHooks || [],
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

function appendBibleEvent(
  metadata: Record<string, unknown> | null | undefined,
  event: SeriesBibleEvent
): Record<string, unknown> {
  const base = { ...(metadata || {}) }
  const existing = (base.series_bible_events as SeriesBibleEvent[] | undefined) || []
  base.series_bible_events = [event, ...existing].slice(0, 50)
  return base
}
