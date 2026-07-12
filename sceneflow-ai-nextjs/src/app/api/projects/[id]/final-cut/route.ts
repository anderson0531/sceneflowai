import { NextRequest, NextResponse } from 'next/server'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'

export const maxDuration = 30

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * PATCH endpoint for updating only metadata.finalCut (Screening Room / Assemble selection).
 * Avoids sending the full project metadata blob from the client.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 })
    }

    const body = await request.json()
    const { finalCut } = body

    if (!finalCut || typeof finalCut !== 'object') {
      return NextResponse.json(
        { error: 'Missing required field: finalCut' },
        { status: 400 }
      )
    }

    await sequelize.authenticate()

    const project = await Project.findByPk(id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const existingMetadata = project.metadata || {}
    const overrideCount = Object.keys(finalCut.perSceneOverrides ?? {}).length

    const updatedMetadata = {
      ...existingMetadata,
      finalCut,
    }

    await project.update({ metadata: updatedMetadata })

    console.log('[Projects PATCH final-cut] Updated successfully:', {
      projectId: id,
      format: finalCut.format,
      language: finalCut.language,
      overrideCount,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      projectId: id,
      updatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update final cut selection'
    console.error('[Projects PATCH final-cut] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
