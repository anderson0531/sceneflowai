import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, ABSOLUTE_MAX_EPISODES, SeriesEpisodeBlueprint } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * GET /api/series/[seriesId]
 * 
 * Fetch single series with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    // Get episode project data
    const projectIds = series.episode_blueprints
      ?.filter(ep => ep.projectId)
      .map(ep => ep.projectId) || []
    
    let episodeProjects: any[] = []
    if (projectIds.length > 0) {
      episodeProjects = await Project.findAll({
        where: { id: projectIds },
        attributes: ['id', 'title', 'status', 'current_step', 'step_progress', 'updated_at', 'metadata']
      })
    }
    
    const response = NextResponse.json({
      success: true,
      series: formatSeriesResponse(series, episodeProjects)
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
    
  } catch (error) {
    console.error(`[${timestamp}] [GET /api/series/${seriesId}] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/series/[seriesId]
 * 
 * Update series details
 * 
 * Body fields:
 * - title: Series title
 * - logline: Series logline
 * - genre: Genre
 * - targetAudience: Target audience
 * - status: 'draft' | 'active' | 'completed' | 'archived'
 * - maxEpisodes: Max episode count (requires confirmation for > 20)
 * - productionBible: Update production bible (partial merge)
 * - episodeBlueprints: Replace episode blueprints array
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
      title,
      logline,
      genre,
      targetAudience,
      status,
      maxEpisodes,
      productionBible,
      episodeBlueprints,
      metadata
    } = body
    
    // Build update object
    const updates: any = {}
    
    if (title !== undefined) updates.title = title
    if (logline !== undefined) updates.logline = logline
    if (genre !== undefined) updates.genre = genre
    if (targetAudience !== undefined) updates.target_audience = targetAudience
    
    if (status !== undefined) {
      if (!['draft', 'active', 'completed', 'archived'].includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status
    }
    
    if (maxEpisodes !== undefined) {
      const newMax = Number(maxEpisodes)
      if (newMax > ABSOLUTE_MAX_EPISODES) {
        return NextResponse.json({
          success: false,
          error: `Maximum episode limit is ${ABSOLUTE_MAX_EPISODES}`
        }, { status: 400 })
      }
      // Check if reducing below current episode count
      const currentCount = series.episode_blueprints?.length || 0
      if (newMax < currentCount) {
        return NextResponse.json({
          success: false,
          error: `Cannot reduce max episodes below current count (${currentCount})`
        }, { status: 400 })
      }
      updates.max_episodes = Math.max(1, newMax)
    }
    
    // Merge production bible (partial update)
    if (productionBible !== undefined) {
      const currentBible = series.production_bible || {}
      updates.production_bible = {
        ...currentBible,
        ...productionBible,
        version: incrementVersion(currentBible.version || '1.0.0'),
        lastUpdated: new Date().toISOString()
      }
    }
    
    // Replace episode blueprints (full replacement)
    if (episodeBlueprints !== undefined) {
      const max = updates.max_episodes || series.max_episodes
      if (episodeBlueprints.length > max) {
        return NextResponse.json({
          success: false,
          error: `Episode blueprints (${episodeBlueprints.length}) exceed max episodes (${max})`
        }, { status: 400 })
      }
      updates.episode_blueprints = episodeBlueprints
    }
    
    // Merge metadata
    if (metadata !== undefined) {
      updates.metadata = { ...(series.metadata || {}), ...metadata }
    }
    
    await series.update(updates)
    await series.reload()
    
    console.log(`[${timestamp}] [PATCH /api/series/${seriesId}] Updated series`)
    
    return NextResponse.json({
      success: true,
      series: formatSeriesResponse(series)
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [PATCH /api/series/${seriesId}] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/series/[seriesId]
 * 
 * Delete series (sets linked projects' series_id to null)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const timestamp = new Date().toISOString()
  const { seriesId } = await params
  
  try {
    await sequelize.authenticate()
    
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }
    
    // Unlink any projects from this series
    await Project.update(
      { series_id: null, episode_number: null },
      { where: { series_id: seriesId } }
    )
    
    await series.destroy()
    
    console.log(`[${timestamp}] [DELETE /api/series/${seriesId}] Deleted series`)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error(`[${timestamp}] [DELETE /api/series/${seriesId}] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Increment semantic version (patch level)
 */
function incrementVersion(version: string): string {
  const parts = version.split('.')
  const patch = parseInt(parts[2] || '0', 10) + 1
  return `${parts[0] || '1'}.${parts[1] || '0'}.${patch}`
}

/**
 * Format series for API response
 */
function formatSeriesResponse(series: Series, episodeProjects?: any[]) {
  const episodeCount = series.episode_blueprints?.length || 0
  const startedCount = series.episode_blueprints?.filter(ep => ep.projectId).length || 0
  const completedCount = series.episode_blueprints?.filter(ep => ep.status === 'completed').length || 0
  
  // Merge episode project data if available
  let blueprintsWithProjectData = series.episode_blueprints || []
  if (episodeProjects?.length) {
    const projectMap = new Map(episodeProjects.map(p => [p.id, p]))
    blueprintsWithProjectData = blueprintsWithProjectData.map(ep => ({
      ...ep,
      project: ep.projectId ? projectMap.get(ep.projectId) : undefined
    }))
  }
  
  return {
    id: series.id,
    userId: series.user_id,
    title: series.title,
    logline: series.logline,
    genre: series.genre,
    targetAudience: series.target_audience,
    status: series.status,
    maxEpisodes: series.max_episodes,
    episodeCount,
    startedCount,
    completedCount,
    productionBible: series.production_bible,
    episodeBlueprints: blueprintsWithProjectData,
    metadata: series.metadata,
    createdAt: series.created_at,
    updatedAt: series.updated_at
  }
}
