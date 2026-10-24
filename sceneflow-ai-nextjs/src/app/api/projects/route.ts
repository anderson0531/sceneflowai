import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Project from '@/models/Project'
import User from '@/models/User'
import { sequelize } from '@/config/database'
import { SubscriptionService } from '../../../services/SubscriptionService'
import { resolveUserId } from '@/lib/userHelper'
import { normalizeWorkflowStep } from '@/constants/workflowSteps'
import { slimProjectResponseMetadata } from '@/lib/projects/slimProjectPutPayload'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const SUMMARY_METADATA_SQL = `jsonb_strip_nulls(jsonb_build_object(
  'genre', metadata->'genre',
  'format', metadata->'format',
  'duration', metadata->'duration',
  'estimatedCost', metadata->'estimatedCost',
  'Cost', metadata->'Cost',
  'seriesId', metadata->'seriesId',
  'episodeNumber', metadata->'episodeNumber',
  'thumbnailUrl', COALESCE(metadata->'thumbnailUrl', metadata->'visionPhase'->'thumbnailUrl'),
  'posterUrl', metadata->'posterUrl'
))`

const LITE_LIST_METADATA_SQL = `metadata #- '{visionPhase,production}' #- '{visionPhase,scenes}'`

// GET /api/projects?userId=<uuid or email>
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${timestamp}] [GET /api/projects] Request received`)
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const isSummary = searchParams.get('summary') === '1' || searchParams.get('summary') === 'true'
    let userIdParam = searchParams.get('userId') || request.headers.get('x-user-id') || undefined
    
    console.log(`[${timestamp}] [GET /api/projects] Query params:`, { id, userId: userIdParam, isSummary })
    
    if (id) {
      console.log(`[${timestamp}] [GET /api/projects] Fetching single project by id:`, id)
      const p: any = await Project.findByPk(id)
      if (!p) {
        console.log(`[${timestamp}] [GET /api/projects] Project not found:`, id)
        return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
      }
      const project = {
        id: p.id,
        title: p.title,
        description: p.description || '',
        currentStep: normalizeWorkflowStep(p.current_step),
        progress: (typeof (p.step_progress as any)?.overall === 'number' ? (p.step_progress as any).overall : 0) || 0,
        status: (p.status as any) || 'draft',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        completedSteps: Object.entries((p.step_progress as any) || {}).filter(([_, v]) => (v as number) === 100).map(([k]) => k),
        metadata: slimProjectResponseMetadata(p.metadata || {})
      }
      console.log(`[${timestamp}] [GET /api/projects] Sending single project response`)
      const response = NextResponse.json({ success: true, project })
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return response
    }

    if (!userIdParam) {
      console.log(`[${timestamp}] [GET /api/projects] Missing userId`)
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }

    let resolvedUserId: string
    try {
      resolvedUserId = await resolveUserId(userIdParam)
      console.log(`[${timestamp}] [GET /api/projects] Resolved userId: ${userIdParam} -> ${resolvedUserId}`)
    } catch (err) {
      console.error(`[${timestamp}] [GET /api/projects] Failed to resolve user:`, err)
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (!resolvedUserId) {
      console.error(`[${timestamp}] [GET /api/projects] resolveUserId returned empty id for: ${userIdParam}`)
      return NextResponse.json({ success: false, error: 'User has no id' }, { status: 500 })
    }

    console.log(`[${timestamp}] [GET /api/projects] Fetching projects for userId:`, resolvedUserId)
    
    const where: any = { user_id: resolvedUserId }
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '20')))
    const offset = (page - 1) * pageSize

    console.log(`[${timestamp}] [GET /api/projects] Query options:`, { where, page, pageSize, offset, isSummary })

    const metadataProjection = isSummary ? SUMMARY_METADATA_SQL : LITE_LIST_METADATA_SQL

    const { rows, count } = await Project.findAndCountAll({
      where,
      attributes: [
        'id',
        'user_id',
        'series_id',
        'episode_number',
        'title',
        'description',
        'current_step',
        'step_progress',
        'status',
        'created_at',
        'updated_at',
        [sequelize.literal(metadataProjection), 'metadata'],
      ],
      order: [['updated_at', 'DESC']],
      limit: pageSize,
      offset
    })

    console.log(`[${timestamp}] [GET /api/projects] Database returned ${rows.length} rows, total count: ${count}`)

    const projects = rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      currentStep: normalizeWorkflowStep(p.current_step),
      progress: (typeof (p.step_progress as any)?.overall === 'number' ? (p.step_progress as any).overall : 0) || 0,
      status: (p.status as any) || 'draft',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      completedSteps: Object.entries((p.step_progress as any) || {}).filter(([_, v]) => (v as number) === 100).map(([k]) => k),
      metadata: isSummary ? (p.metadata || {}) : slimProjectResponseMetadata(p.metadata || {})
    }))

    console.log(`[${timestamp}] [GET /api/projects] Sending response with ${projects.length} projects`)
    const response = NextResponse.json({ success: true, projects, page, pageSize, total: count })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error(`[${timestamp}] [GET /api/projects] Error:`, error)
    console.error(`[${timestamp}] [GET /api/projects] Error details:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      errorSource: 'database' // Add source identifier
    }, { status: 500 })
  }
}

// POST /api/projects
// Body: { userId?: string, title: string, description?: string, metadata?: any, currentStep?: string }
export async function POST(request: NextRequest) {
  try {
    // Note: Run POST /api/setup/database once to create tables in fresh database
    
    const body = await request.json()
    const { userId, title, description, metadata, currentStep } = body || {}

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }
    
    // Ensure user exists (auto-create if doesn't exist)
    if (userId) {
      let user = await User.findByPk(userId)
      if (!user) {
        console.log('[POST /api/projects] User not found, creating user:', userId)
        user = await User.create({
          id: userId,
          email: `user-${userId}@temp.sceneflow.ai`,
          username: `user_${userId.slice(0, 8)}`,
          password_hash: 'oauth-user', // Placeholder for OAuth users
          is_active: true,
          email_verified: false
        })
        console.log('[POST /api/projects] User created successfully')
      }
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }
    
    // Check project limits for user's subscription tier
    try {
      const limits = await SubscriptionService.checkProjectLimits(userId)
      if (!limits.canCreateProject) {
        return NextResponse.json({
          success: false,
          error: 'Project limit reached',
          message: `Your plan allows max ${limits.maxProjects} active projects. Upgrade to create more.`,
          currentProjects: limits.currentProjects,
          maxProjects: limits.maxProjects
        }, { status: 403 })
      }
    } catch (error) {
      // If limit check fails, log but don't block project creation (fail open)
      console.warn('[POST /api/projects] Project limit check failed:', error)
    }
    
    // Create
    const created = await Project.create({
      user_id: userId,
      title,
      description: description || '',
      status: 'draft',
      current_step: normalizeWorkflowStep(currentStep || 'blueprint'),
      step_progress: {},
      metadata: metadata || {}
    } as any)

    return NextResponse.json({ success: true, project: created })
  } catch (error) {
    console.error('POST /api/projects failed:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}


// PUT /api/projects
// Body: { id: string, metadata?: any, title?, description?, status?, currentStep?, step_progress? }
export async function PUT(request: NextRequest) {
  try {
    // Note: Run POST /api/setup/database once to create tables in fresh database
    
    const body = await request.json()
    const { id, metadata, title, description, status, currentStep, step_progress } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

    const updateData: any = {}
    if (typeof title === 'string') updateData.title = title
    if (typeof description === 'string') updateData.description = description
    if (metadata !== undefined) updateData.metadata = metadata
    if (status) updateData.status = status
    if (currentStep) updateData.current_step = currentStep
    if (step_progress) updateData.step_progress = step_progress

    const [count] = await Project.update(updateData, { where: { id } })
    if (count === 0) return NextResponse.json({ success: false, error: 'Project not found or no changes' }, { status: 404 })
    return NextResponse.json({ success: true, project: { id, ...updateData, metadata: updateData.metadata ? slimProjectResponseMetadata(updateData.metadata) : undefined } })
  } catch (error) {
    console.error('PUT /api/projects failed:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

