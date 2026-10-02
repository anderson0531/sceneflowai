import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { collectProductionReferenceImages } from '@/lib/series/referenceTransfer'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * GET /api/series/[seriesId]/production-references
 * Character, location, and object pictures from linked Production Stage projects.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params

  try {
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const projectIds = (series.episode_blueprints || [])
      .map((episode) => episode.projectId)
      .filter((id): id is string => Boolean(id))

    const projects = projectIds.length
      ? await Project.findAll({
          where: { id: projectIds },
          attributes: ['id', 'metadata'],
        })
      : []
    const metadataById = new Map(projects.map((project) => [project.id, project.metadata || {}]))
    const images = collectProductionReferenceImages(
      projectIds.map((id) => metadataById.get(id))
    )

    return NextResponse.json({ success: true, images })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load reference images' },
      { status: 500 }
    )
  }
}
