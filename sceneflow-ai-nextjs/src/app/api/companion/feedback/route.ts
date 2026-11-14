import { NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import CollabBlueprintFeedback from '@/models/CollabBlueprintFeedback'
import CollabSession from '@/models/CollabSession'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import Project from '@/models/Project'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { isBlueprintPayload } from '@/lib/blueprint/shareSession'
import { isContinuityPayload } from '@/lib/continuity/continuityPortalService'
import { feedbackExcerpt } from '@/lib/companion/feedbackNotification'
import { listPremiereFeedback } from '@/lib/premiere/feedback'
import { buildAccessibleProjectsWhere } from '@/lib/producer/workspaceProjectsQuery'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export interface CompanionFeedbackItem {
  id: string
  source: 'blueprint' | 'continuity' | 'screening'
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

    const where = await buildAccessibleProjectsWhere(userId)
    const projects = await Project.findAll({
      where,
      attributes: ['id', 'title', 'metadata'],
      order: [['updated_at', 'DESC']],
      limit: 30,
    })

    const projectIds = projects.map((p) => p.id)
    const titleById = new Map(projects.map((project) => [project.id, project.title]))

    const sessions = projectIds.length
      ? await CollabSession.findAll({
          where: { project_id: { [Op.in]: projectIds } },
          order: [['updated_at', 'DESC']],
          limit: 60,
        })
      : []

    const blueprintSessions = sessions.filter((session) => isBlueprintPayload(session.payload))
    const continuitySessions = sessions.filter((session) =>
      isContinuityPayload(session.payload as Record<string, unknown>)
    )
    const sessionById = new Map(blueprintSessions.map((session) => [session.id, session]))

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

    // Continuity review notes & mobile photo upload items
    const continuityItems: CompanionFeedbackItem[] = []
    for (const cs of continuitySessions) {
      const p = cs.payload as Record<string, any>
      const revSlots = (Array.isArray(p.slots) ? p.slots : []).filter(
        (s: any) => s.clientDecision === 'revision_requested' || s.clientNote
      )
      if (revSlots.length > 0 || p.generalNotes) {
        const noteText = [
          p.generalNotes || '',
          ...revSlots.map((s: any) => `${s.name}: ${s.clientNote || 'Update requested'}`),
        ]
          .filter(Boolean)
          .join(' · ')
        continuityItems.push({
          id: `cont-rev-${cs.id}`,
          source: 'continuity',
          projectId: cs.project_id,
          projectTitle: titleById.get(cs.project_id) || p.projectTitle || 'Project',
          reviewer: p.lastReviewerName || 'Client Reviewer',
          score: null,
          excerpt: feedbackExcerpt(noteText),
          status: p.approvalStatus === 'approved' ? 'resolved' : 'open',
          createdAt:
            p.lastReviewedAt ||
            (cs.updated_at instanceof Date ? cs.updated_at.toISOString() : new Date().toISOString()),
        })
      }
    }

    if (projectIds.length > 0) {
      try {
        const uploads = await ClientAssetSubmission.findAll({
          where: {
            project_id: { [Op.in]: projectIds },
            quarantine_status: 'clean',
          },
          order: [['created_at', 'DESC']],
          limit: 25,
        })
        for (const u of uploads) {
          continuityItems.push({
            id: `cont-up-${u.id}`,
            source: 'continuity',
            projectId: u.project_id,
            projectTitle: titleById.get(u.project_id) || 'Project',
            reviewer: u.customer_name,
            score: null,
            excerpt: feedbackExcerpt(
              `Uploaded photo for ${u.slot_name}${u.caption ? ` — "${u.caption}"` : ''}`
            ),
            status: u.approval_status === 'promoted' ? 'resolved' : 'open',
            createdAt: u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at),
          })
        }
      } catch {
        // Optional table guard
      }
    }

    const screeningGroups = await mapPool(projects.slice(0, 20), 3, async (project) => {
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

    const items = [...blueprintItems, ...continuityItems, ...screeningGroups.flat()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 80)

    return NextResponse.json({ items })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load feedback'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
