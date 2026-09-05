import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import { Series, DEFAULT_MAX_EPISODES } from '@/models/Series'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface RouteParams {
  params: Promise<{ projectId: string }>
}

function extractCharactersFromProject(metadata: Record<string, unknown>) {
  const visionPhase = (metadata.visionPhase || {}) as Record<string, unknown>
  const chars = (visionPhase.characters || []) as Array<Record<string, unknown>>
  const now = new Date().toISOString()
  return chars.map((c) => ({
    id: String(c.id || uuidv4()),
    name: String(c.name || 'Unnamed'),
    role: (c.role as string) || 'supporting',
    description: String(c.description || ''),
    appearance: String(c.appearance || ''),
    voiceId: c.voiceId as string | undefined,
    referenceImageUrl: (c.referenceUrl || c.referenceImageUrl) as string | undefined,
    lockedPromptTokens: c.lockedPromptTokens as string[] | undefined,
    createdAt: now,
    updatedAt: now,
  }))
}

/**
 * POST /api/projects/[projectId]/promote-to-series
 * Creates a new Series from a standalone Production project and links it as Episode 1.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))
    const userKey = body.userId || request.headers.get('x-user-id')
    if (!userKey) {
      return NextResponse.json({ success: false, error: 'User identity required' }, { status: 401 })
    }

    await sequelize.authenticate()
    const user = await resolveUser(String(userKey))
    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    if (project.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    if (project.series_id) {
      return NextResponse.json(
        { success: false, error: 'Project is already linked to a series' },
        { status: 409 }
      )
    }

    const metadata = (project.metadata || {}) as Record<string, unknown>
    const visionPhase = (metadata.visionPhase || {}) as Record<string, unknown>
    const logline =
      (typeof visionPhase.logline === 'string' && visionPhase.logline) ||
      project.description ||
      ''
    const synopsis =
      (typeof visionPhase.synopsis === 'string' && visionPhase.synopsis) || ''

    const characters = extractCharactersFromProject(metadata)
    const now = new Date().toISOString()
    const episodeId = uuidv4()

    const series = await Series.create({
      user_id: user.id,
      title: project.title || 'Untitled Series',
      logline: logline.slice(0, 500) || undefined,
      status: 'draft',
      max_episodes: DEFAULT_MAX_EPISODES,
      production_bible: {
        version: '1.0.0',
        lastUpdated: now,
        logline: logline || '',
        synopsis: synopsis || '',
        setting: '',
        protagonist: {
          characterId: characters.find((c) => c.role === 'protagonist')?.id || '',
          name: characters.find((c) => c.role === 'protagonist')?.name || 'TBD',
          goal: 'TBD',
        },
        antagonistConflict: { type: 'society', description: 'To be defined' },
        aesthetic: (visionPhase.generationSettings as Record<string, unknown>) || {},
        characters,
        locations: [],
        props: [],
      },
      episode_blueprints: [
        {
          id: episodeId,
          episodeNumber: 1,
          title: project.title || 'Episode 1',
          logline: logline || '',
          synopsis: synopsis || '',
          beats: [],
          characters: characters.map((c) => ({
            characterId: c.id,
            role: c.role as 'protagonist' | 'antagonist' | 'supporting' | 'guest',
          })),
          projectId: project.id,
          status: 'in_progress',
        },
      ],
      metadata: {
        source: 'promoted_project',
        promotedFromProjectId: project.id,
        promotedAt: now,
      },
    })

    await project.update({
      series_id: series.id,
      episode_number: 1,
      metadata: {
        ...metadata,
        seriesProvenance: {
          promotedAt: now,
          sourceProjectId: project.id,
        },
      },
    })

    return NextResponse.json({
      success: true,
      seriesId: series.id,
      episodeId,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Promote failed' },
      { status: 500 }
    )
  }
}
