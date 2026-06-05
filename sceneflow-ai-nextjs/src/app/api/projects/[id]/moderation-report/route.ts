import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ModerationEvent } from '@/models/ModerationEvent'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'

const DEFAULT_LIMIT = 50

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await sequelize.authenticate()

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const ownerId = String((project as { user_id?: string }).user_id || '')
    if (ownerId && ownerId !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(req.url)
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || DEFAULT_LIMIT)))
    const stage = url.searchParams.get('stage')

    const where: Record<string, unknown> = { project_id: projectId }
    if (stage) where.stage = stage

    const events = await ModerationEvent.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
    })

    const reports = events
      .map((event) => {
        const json = event.report_json as Record<string, unknown> | null | undefined
        if (json && typeof json === 'object') return json
        return {
          id: event.id,
          stage: event.stage,
          allowed: event.action !== 'blocked',
          action: event.action,
          summary: event.getFlaggedCategoriesDisplay() || event.action,
          projectId,
          createdAt: event.created_at.toISOString(),
          checks: [],
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      projectId,
      count: reports.length,
      reports,
    })
  } catch (error) {
    console.error('[Moderation Report API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load moderation reports' },
      { status: 500 }
    )
  }
}
