import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import type { ReferenceTransferRequest } from '@/types/series'
import {
  buildTransferCatalog,
  applyProjectToSeriesTransfer,
  applySeriesToProjectTransfer,
} from '@/lib/series/referenceTransfer'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string }>
}

/**
 * GET /api/series/[seriesId]/bible/transfer?projectId=
 * Catalog of assets for the transfer UI.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
  }

  try {
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    if (project.series_id !== seriesId) {
      return NextResponse.json(
        { success: false, error: 'Project does not belong to this series' },
        { status: 403 }
      )
    }

    const bible = series.production_bible || ({} as any)
    const metadata = project.metadata || {}
    const episode = series.episode_blueprints?.find((ep) => ep.projectId === projectId)
    const episodeCharacterIds =
      episode?.characters?.map((c) => c.characterId).filter(Boolean) || []
    const bibleRef = metadata.seriesBibleRef as { version?: string } | undefined

    const catalog = buildTransferCatalog(
      bible,
      metadata,
      episodeCharacterIds,
      bibleRef?.version
    )

    return NextResponse.json({
      success: true,
      catalog,
      seriesTitle: series.title,
      projectTitle: project.title,
      episodeNumber: project.episode_number,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/series/[seriesId]/bible/transfer
 * Asset-level transfer with optional preview.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { seriesId } = await params

  try {
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })
    }

    const body = (await request.json()) as ReferenceTransferRequest
    const {
      projectId,
      direction,
      selection,
      mergeStrategy = 'add_new_only',
      preview = false,
    } = body

    if (!projectId || !direction || !selection) {
      return NextResponse.json(
        { success: false, error: 'projectId, direction, and selection are required' },
        { status: 400 }
      )
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    if (project.series_id !== seriesId) {
      return NextResponse.json(
        { success: false, error: 'Project does not belong to this series' },
        { status: 403 }
      )
    }

    const bible = { ...(series.production_bible || {}) } as any
    const metadata = { ...(project.metadata || {}) }
    const episode = series.episode_blueprints?.find((ep) => ep.projectId === projectId)
    const episodeCharacterIds =
      episode?.characters?.map((c) => c.characterId).filter(Boolean) || []

    if (direction === 'project_to_series') {
      const { updatedBible, diff } = applyProjectToSeriesTransfer(
        bible,
        metadata,
        selection,
        mergeStrategy
      )

      if (preview) {
        return NextResponse.json({
          success: true,
          preview: true,
          diff,
          currentVersion: bible.version || '1.0.0',
          wouldUpdateTo: updatedBible.version,
        })
      }

      updatedBible.lastUpdatedBy = `project:${projectId}`
      await series.update({ production_bible: updatedBible })
      await project.update({
        metadata: {
          ...metadata,
          seriesBibleRef: {
            version: updatedBible.version,
            syncedAt: new Date().toISOString(),
            direction: 'push_to_series',
          },
        },
      })

      return NextResponse.json({
        success: true,
        applied: true,
        diff,
        newVersion: updatedBible.version,
      })
    }

    const { updatedMetadata, diff } = applySeriesToProjectTransfer(
      bible,
      metadata,
      selection,
      mergeStrategy,
      episodeCharacterIds
    )

    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        diff,
        bibleVersion: bible.version,
      })
    }

    await project.update({ metadata: updatedMetadata })

    return NextResponse.json({
      success: true,
      applied: true,
      diff,
      bibleVersion: bible.version,
    })
  } catch (error) {
    console.error('[bible/transfer] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
