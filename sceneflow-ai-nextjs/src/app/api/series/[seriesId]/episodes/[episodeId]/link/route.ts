import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUserId } from '@/lib/userHelper'
import {
  linkedEpisode,
  linkedProjectFields,
  linkRejection,
  rankConnectableProjects,
  type LinkableEpisode,
  type LinkableProject,
} from '@/lib/series/linkEpisodeProject'
import {
  applyProjectToSeriesTransfer,
  projectReferenceSelection,
} from '@/lib/series/referenceTransfer'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ seriesId: string; episodeId: string }>
}

function asEpisodes(series: Series): LinkableEpisode[] {
  return (series.episode_blueprints || []).map((episode) => ({
    id: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    logline: episode.logline,
    synopsis: episode.synopsis,
    projectId: episode.projectId,
    status: episode.status,
  }))
}

function asProject(project: Project): LinkableProject {
  const metadata = (project.metadata || {}) as Record<string, unknown>
  return {
    id: project.id,
    userId: project.user_id,
    title: project.title,
    seriesId: project.series_id,
    metadataSeriesId: typeof metadata.seriesId === 'string' ? metadata.seriesId : null,
  }
}

async function loadOwnedProjects(ownerId: string) {
  return Project.findAll({
    where: { user_id: ownerId },
    attributes: ['id', 'user_id', 'title', 'series_id', 'episode_number', 'description', 'metadata'],
  })
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { seriesId, episodeId } = await params
  try {
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })

    const userId = new URL(request.url).searchParams.get('userId')
    if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })

    let ownerId: string
    try {
      ownerId = await resolveUserId(userId)
    } catch {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    if (ownerId !== series.user_id) {
      return NextResponse.json({ success: false, error: 'You can only connect your own projects' }, { status: 403 })
    }

    const episode = asEpisodes(series).find((item) => item.id === episodeId)
    if (!episode) return NextResponse.json({ success: false, error: 'Episode not found' }, { status: 404 })

    const projects = await loadOwnedProjects(ownerId)
    return NextResponse.json({
      success: true,
      projects: rankConnectableProjects(seriesId, ownerId, asEpisodes(series), projects.map(asProject)),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { seriesId, episodeId } = await params
  try {
    await sequelize.authenticate()
    const series = await Series.findByPk(seriesId)
    if (!series) return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 })

    const body = await request.json()
    const { userId, projectId } = body as { userId?: string; projectId?: string }
    if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 401 })
    if (!projectId) return NextResponse.json({ success: false, error: 'Missing projectId' }, { status: 400 })

    let ownerId: string
    try {
      ownerId = await resolveUserId(userId)
    } catch {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    if (ownerId !== series.user_id) {
      return NextResponse.json({ success: false, error: 'You can only connect your own projects' }, { status: 403 })
    }

    const episodes = asEpisodes(series)
    const episode = episodes.find((item) => item.id === episodeId)
    if (!episode) return NextResponse.json({ success: false, error: 'Episode not found' }, { status: 404 })

    const project = await Project.findByPk(projectId)
    if (!project) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })

    const rejection = linkRejection(ownerId, episode, episodes, asProject(project))
    if (rejection) return NextResponse.json({ success: false, error: rejection }, { status: 409 })

    const fields = linkedProjectFields(seriesId, series.title, episode)
    const metadata = {
      ...(project.metadata || {}),
      ...fields.metadata,
    }
    const selection = projectReferenceSelection(metadata)
    const hasReferences =
      (selection.characterIds?.length || 0) +
        (selection.locationIds?.length || 0) +
        (selection.propIds?.length || 0) >
      0
    const bible = hasReferences
      ? applyProjectToSeriesTransfer(series.production_bible || {}, metadata, selection, 'merge').updatedBible
      : series.production_bible

    const nextEpisodes = (series.episode_blueprints || []).map((item) =>
      item.id === episodeId ? linkedEpisode(item, projectId) : item
    )

    const transaction = await sequelize.transaction()
    try {
      await project.update(
        {
          title: fields.title,
          description: fields.description,
          series_id: fields.series_id,
          episode_number: fields.episode_number,
          metadata,
        },
        { transaction }
      )
      await series.update(
        {
          episode_blueprints: nextEpisodes,
          ...(bible ? { production_bible: bible } : {}),
          status: series.status === 'draft' ? 'active' : series.status,
        },
        { transaction }
      )
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    return NextResponse.json({ success: true, projectId, episodeId })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to connect project' },
      { status: 500 }
    )
  }
}
