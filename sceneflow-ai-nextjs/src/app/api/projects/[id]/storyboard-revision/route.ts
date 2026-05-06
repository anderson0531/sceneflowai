import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Bump storyboardRevision.version for screening feedback attribution.
 * Share URL stays the same; reviewers who reload see the new current version.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    let body: { label?: string; notes?: string }
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    await sequelize.authenticate()
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const metadata = project.metadata || {}
    const prev = metadata.storyboardRevision
    const prevVersion =
      prev && typeof prev.version === 'number' && prev.version >= 1 ? prev.version : 1

    const nextVersion = prevVersion + 1
    const storyboardRevision = {
      version: nextVersion,
      label: typeof body.label === 'string' && body.label.trim() ? body.label.trim() : undefined,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
      updatedAt: new Date().toISOString(),
    }

    await project.update({
      metadata: {
        ...metadata,
        storyboardRevision,
      },
    })

    return NextResponse.json({
      success: true,
      storyboardRevision,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to bump revision'
    console.error('[storyboard-revision]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
