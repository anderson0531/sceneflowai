import { NextRequest, NextResponse } from 'next/server'
import '@/models' // Import all models to register them with Sequelize
import Project from '@/models/Project'
import User from '@/models/User'
import { sequelize } from '@/config/database'
import { SubscriptionService } from '../../../services/SubscriptionService'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/projects?userId=<uuid>
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${timestamp}] [GET /api/projects] Request received`)
    
    // Ensure database connection
    console.log(`[${timestamp}] [GET /api/projects] Authenticating database connection...`)
    await sequelize.authenticate()
    console.log(`[${timestamp}] [GET /api/projects] Database authenticated`)
    
    // Note: Run POST /api/setup/database once to create tables in fresh database
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId') || request.headers.get('x-user-id') || undefined
    
    console.log(`[${timestamp}] [GET /api/projects] Query params:`, { id, userId })
    
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
        currentStep: (p.current_step as any) || 'ideation',
        progress: (typeof (p.step_progress as any)?.overall === 'number' ? (p.step_progress as any).overall : 0) || 0,
        status: (p.status as any) || 'draft',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        completedSteps: Object.entries((p.step_progress as any) || {}).filter(([_, v]) => (v as number) === 100).map(([k]) => k),
        metadata: p.metadata || {}
      }
      console.log(`[${timestamp}] [GET /api/projects] Sending single project response`)
      const response = NextResponse.json({ success: true, project })
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return response
    }

    if (!userId) {
      console.log(`[${timestamp}] [GET /api/projects] Missing userId`)
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }

    console.log(`[${timestamp}] [GET /api/projects] Fetching projects for userId:`, userId)
    
    const where: any = { user_id: userId }
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '20')))
    const offset = (page - 1) * pageSize

    console.log(`[${timestamp}] [GET /api/projects] Query options:`, { where, page, pageSize, offset })

    const { rows, count } = await Project.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: pageSize,
      offset
    })

    console.log(`[${timestamp}] [GET /api/projects] Database returned ${rows.length} rows, total count: ${count}`)

    const projects = rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      currentStep: (p.current_step as any) || 'ideation',
      progress: (typeof (p.step_progress as any)?.overall === 'number' ? (p.step_progress as any).overall : 0) || 0,
      status: (p.status as any) || 'draft',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      completedSteps: Object.entries((p.step_progress as any) || {}).filter(([_, v]) => (v as number) === 100).map(([k]) => k),
      metadata: p.metadata || {}
    }))

    console.log(`[${timestamp}] [GET /api/projects] Sending response with ${projects.length} projects`)
    const response = NextResponse.json({ success: true, projects, page, pageSize, total: count })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    console.log(`[${timestamp}] [GET /api/projects] Response headers set, size: ${JSON.stringify({ success: true, projects, page, pageSize, total: count }).length} bytes`)
    
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
    // Ensure database connection
    await sequelize.authenticate()
    
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
      current_step: (currentStep || 'ideation') as any,
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
    // Ensure database connection
    await sequelize.authenticate()
    
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
    const updated: any = await Project.findByPk(id)
    return NextResponse.json({ success: true, project: updated })
  } catch (error) {
    console.error('PUT /api/projects failed:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

