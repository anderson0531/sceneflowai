import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

// GET /api/projects?userId=<uuid>
export async function GET(request: NextRequest) {
  try {
    // Ensure database connection
    await sequelize.authenticate()
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const p: any = await Project.findByPk(id)
      if (!p) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
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
      return NextResponse.json({ success: true, project })
    }

    const userId = searchParams.get('userId') || request.headers.get('x-user-id') || undefined
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    }

    const where: any = { user_id: userId }
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '20')))
    const offset = (page - 1) * pageSize

    const { rows, count } = await Project.findAndCountAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: pageSize,
      offset
    })

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

    return NextResponse.json({ success: true, projects, page, pageSize, total: count })
  } catch (error) {
    console.error('GET /api/projects failed:', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

// POST /api/projects
// Body: { userId?: string, title: string, description?: string, metadata?: any, currentStep?: string }
export async function POST(request: NextRequest) {
  try {
    // Ensure database connection
    await sequelize.authenticate()
    
    const body = await request.json()
    const { userId, title, description, metadata, currentStep } = body || {}

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
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

