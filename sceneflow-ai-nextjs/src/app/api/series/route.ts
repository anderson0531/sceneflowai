import { NextRequest, NextResponse } from 'next/server'
import '@/models' // Import all models to register associations
import { Series, DEFAULT_MAX_EPISODES, ABSOLUTE_MAX_EPISODES } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/series
 * 
 * Query params:
 * - userId: Required. User UUID or email to resolve
 * - id: Optional. Fetch single series by ID
 * - page: Optional. Pagination page (default: 1)
 * - pageSize: Optional. Items per page (default: 20, max: 50)
 * - status: Optional. Filter by status ('draft', 'active', 'completed', 'archived')
 * - includeEpisodes: Optional. Include linked project data for episodes (default: false)
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${timestamp}] [GET /api/series] Request received`)
    
    await sequelize.authenticate()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    let userIdParam = searchParams.get('userId') || request.headers.get('x-user-id') || undefined
    
    // Fetch single series by ID
    if (id) {
      console.log(`[${timestamp}] [GET /api/series] Fetching single series by id:`, id)
      
      const series = await Series.findByPk(id)
      if (!series) {
        return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
      }
      
      // Optionally include episode project data
      const includeEpisodes = searchParams.get('includeEpisodes') === 'true'
      let episodeProjects: any[] = []
      
      if (includeEpisodes) {
        const projectIds = series.episode_blueprints
          ?.filter(ep => ep.projectId)
          .map(ep => ep.projectId) || []
        
        if (projectIds.length > 0) {
          episodeProjects = await Project.findAll({
            where: { id: projectIds },
            attributes: ['id', 'title', 'status', 'current_step', 'step_progress', 'updated_at']
          })
        }
      }
      
      const response = NextResponse.json({
        success: true,
        series: formatSeriesResponse(series, episodeProjects)
      })
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return response
    }
    
    // List series for user
    if (!userIdParam) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }
    
    let resolvedUserId: string
    try {
      const resolvedUser = await resolveUser(userIdParam)
      resolvedUserId = resolvedUser.id
    } catch (err) {
      console.error(`[${timestamp}] [GET /api/series] Failed to resolve user:`, err)
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '20')))
    const offset = (page - 1) * pageSize
    const status = searchParams.get('status')
    
    const where: any = { user_id: resolvedUserId }
    if (status && ['draft', 'active', 'completed', 'archived'].includes(status)) {
      where.status = status
    }
    
    const { rows, count } = await Series.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: pageSize,
      offset
    })
    
    const seriesList = rows.map(s => formatSeriesResponse(s))
    
    const response = NextResponse.json({
      success: true,
      series: seriesList,
      page,
      pageSize,
      total: count
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
    
  } catch (error) {
    console.error(`[${timestamp}] [GET /api/series] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/series
 * 
 * Create a new series
 * 
 * Body:
 * - userId: Required. User UUID or email
 * - title: Required. Series title
 * - logline: Optional. Series logline
 * - genre: Optional. Series genre
 * - targetAudience: Optional. Target audience
 * - maxEpisodes: Optional. Max episodes (default: 20, max: 30)
 * - productionBible: Optional. Initial production bible data
 * - episodeBlueprints: Optional. Initial episode blueprints
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${timestamp}] [POST /api/series] Request received`)
    
    await sequelize.authenticate()
    
    const body = await request.json()
    const {
      userId,
      title,
      logline,
      genre,
      targetAudience,
      maxEpisodes,
      productionBible,
      episodeBlueprints
    } = body || {}
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }
    
    let resolvedUserId: string
    try {
      const resolvedUser = await resolveUser(userId)
      resolvedUserId = resolvedUser.id
    } catch (err) {
      console.error(`[${timestamp}] [POST /api/series] Failed to resolve user:`, err)
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    
    // Validate maxEpisodes with soft/hard limits
    let validatedMaxEpisodes = DEFAULT_MAX_EPISODES
    if (maxEpisodes !== undefined) {
      const requestedMax = Number(maxEpisodes)
      if (requestedMax > ABSOLUTE_MAX_EPISODES) {
        return NextResponse.json({
          success: false,
          error: `Maximum episode limit is ${ABSOLUTE_MAX_EPISODES}`,
          requestedMaxEpisodes: requestedMax,
          absoluteMax: ABSOLUTE_MAX_EPISODES
        }, { status: 400 })
      }
      if (requestedMax > DEFAULT_MAX_EPISODES) {
        // Allow but warn - client should have shown confirmation
        console.log(`[${timestamp}] [POST /api/series] User requested ${requestedMax} episodes (above soft limit of ${DEFAULT_MAX_EPISODES})`)
      }
      validatedMaxEpisodes = Math.max(1, Math.min(ABSOLUTE_MAX_EPISODES, requestedMax))
    }
    
    // Validate episode blueprints count
    if (episodeBlueprints?.length > validatedMaxEpisodes) {
      return NextResponse.json({
        success: false,
        error: `Episode blueprints (${episodeBlueprints.length}) exceed max episodes (${validatedMaxEpisodes})`
      }, { status: 400 })
    }
    
    // Build initial production bible
    const initialBible = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      logline: logline || '',
      synopsis: productionBible?.synopsis || '',
      setting: productionBible?.setting || '',
      protagonist: productionBible?.protagonist || { characterId: '', name: '', goal: '' },
      antagonistConflict: productionBible?.antagonistConflict || { type: 'character', description: '' },
      aesthetic: productionBible?.aesthetic || {},
      characters: productionBible?.characters || [],
      locations: productionBible?.locations || [],
      ...productionBible
    }
    
    const series = await Series.create({
      user_id: resolvedUserId,
      title,
      logline,
      genre,
      target_audience: targetAudience,
      status: 'draft',
      max_episodes: validatedMaxEpisodes,
      production_bible: initialBible,
      episode_blueprints: episodeBlueprints || [],
      metadata: {}
    })
    
    console.log(`[${timestamp}] [POST /api/series] Created series:`, series.id)
    
    return NextResponse.json({
      success: true,
      series: formatSeriesResponse(series)
    })
    
  } catch (error) {
    console.error(`[${timestamp}] [POST /api/series] Error:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
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
