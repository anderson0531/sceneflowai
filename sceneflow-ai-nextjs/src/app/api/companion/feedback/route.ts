import { NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import CollabBlueprintFeedback from '@/models/CollabBlueprintFeedback'
import CollabSession from '@/models/CollabSession'
import Project from '@/models/Project'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { isBlueprintPayload } from '@/lib/blueprint/shareSession'
import { feedbackExcerpt } from '@/lib/companion/feedbackNotification'
import { listPremiereFeedback } from '@/lib/premiere/feedback'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export interface CompanionFeedbackItem {
  id: string
  source: 'blueprint' | 'screening'
  projectId: string
  projectTitle: string
  reviewer: string
  score: number | null
  excerpt: string
  status: 'open' | 'in_review' | 'resolved' | null
  createdAt: string
  screeningId?: string
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await fn(items[current])
    }
  })
  await Promise.all(workers)
  return results
}

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessions = await CollabSession.findAll({
      where: { owner_user_id: userId },
      order: [['updated_at', 'DESC']],
      limit: 40,
    })
    const blueprintSessions = sessions.filter((session) => isBlueprintPayload(session.payload))
    const sessionById = new Map(blueprintSessions.map((session) => [session.id, session]))
    const projectIds = [
      ...new Set(blueprintSessions.map((session) => session.project_id).filter(Boolean)),
    ]
    const titled = projectIds.length
      ? await Project.findAll({
          where: { id: { [Op.in]: projectIds }, user_id: userId },
          attributes: ['id', 'title'],
        })
      : []
    const titleById = new Map(titled.map((project) => [project.id, project.title]))

    const notes = blueprintSessions.length
      ? await CollabBlueprintFeedback.findAll({
          where: { sessionId: { [Op.in]: blueprintSessions.map((session) => session.id) } },
          order: [['createdAt', 'DESC']],
          limit: 50,
        })
      : []

    const blueprintItems: CompanionFeedbackItem[] = notes.map((note) => {
      const session = sessionById.get(note.sessionId)
      const projectId = session?.project_id || ''
      return {
        id: note.id,
        source: 'blueprint',
        projectId,
        projectTitle: titleById.get(projectId) || 'Project',
        reviewer: note.reviewerName,
        score: note.overallScore,
        excerpt: feedbackExcerpt(note.freeformNotes || ''),
        status: null,
        createdAt: note.createdAt.toISOString(),
      }
    })

    const projects = await Project.findAll({
      where: { user_id: userId },
      attributes: ['id', 'title'],
      order: [['updated_at', 'DESC']],
      limit: 20,
    })
    const screeningGroups = await mapPool(projects, 3, async (project) => {
      try {
        const records = await listPremiereFeedback(project.id)
        return records.slice(0, 20).map((record) => ({
          id: record.id,
          source: 'screening' as const,
          projectId: project.id,
          projectTitle: project.title,
          reviewer: record.author,
          score: record.rating,
          excerpt: feedbackExcerpt(record.comment),
          status: record.status,
          createdAt: record.createdAt,
          screeningId: record.screeningId,
        }))
      } catch (error) {
        console.error('[companion feedback] screening list failed', project.id, error)
        return [] as CompanionFeedbackItem[]
      }
    })

    const items = [...blueprintItems, ...screeningGroups.flat()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 80)

    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load feedback'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
