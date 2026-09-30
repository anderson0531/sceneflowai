import { NextResponse } from 'next/server'
import '@/models'
import Project from '@/models/Project'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { buildCompanionPlanCard } from '@/lib/companion/planCard'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const projects = await Project.findAll({
      where: { user_id: userId },
      attributes: ['id', 'title', 'metadata', 'updated_at'],
      order: [['updated_at', 'DESC']],
      limit: 40,
    })

    const plans = projects.map((project) => {
      const updated = project.updated_at instanceof Date ? project.updated_at.toISOString() : String(project.updated_at)
      return buildCompanionPlanCard({
        projectId: project.id,
        title: project.title,
        updatedAt: updated,
        metadata: (project.metadata as Record<string, unknown>) || {},
      })
    })

    return NextResponse.json({ plans })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load plans'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
