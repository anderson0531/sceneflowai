import { NextResponse } from 'next/server'
import { Op } from 'sequelize'
import '@/models'
import CollabSession from '@/models/CollabSession'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import Project from '@/models/Project'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { isBlueprintPayload } from '@/lib/blueprint/shareSession'
import { isContinuityPayload } from '@/lib/continuity/continuityPortalService'
import {
  buildCompanionPlanCard,
  type CompanionContinuitySummary,
  type CompanionShareLinks,
} from '@/lib/companion/planCard'
import { buildAccessibleProjectsWhere } from '@/lib/producer/workspaceProjectsQuery'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const where = await buildAccessibleProjectsWhere(userId)
    const projects = await Project.findAll({
      where,
      attributes: ['id', 'title', 'metadata', 'updated_at'],
      order: [['updated_at', 'DESC']],
      limit: 40,
    })

    const projectIds = projects.map((p) => p.id)
    const linksByProject = new Map<string, CompanionShareLinks>()
    const continuityByProject = new Map<string, CompanionContinuitySummary>()

    if (projectIds.length > 0) {
      try {
        const [sessions, pendingSubmissions] = await Promise.all([
          CollabSession.findAll({
            where: {
              project_id: { [Op.in]: projectIds },
              status: 'active',
            },
            order: [['created_at', 'DESC']],
          }),
          ClientAssetSubmission.findAll({
            where: {
              project_id: { [Op.in]: projectIds },
              quarantine_status: 'clean',
              approval_status: 'pending',
            },
            attributes: ['project_id'],
          }).catch(() => []),
        ])

        const pendingCountByProject = new Map<string, number>()
        for (const row of pendingSubmissions) {
          pendingCountByProject.set(
            row.project_id,
            (pendingCountByProject.get(row.project_id) || 0) + 1
          )
        }

        const now = new Date()
        for (const s of sessions) {
          const expiresAt = (s as { expires_at?: Date | null }).expires_at
          if (expiresAt && new Date(expiresAt) < now) continue
          const payload = (s.payload || {}) as Record<string, any>
          const current = linksByProject.get(s.project_id) || {}

          if (isBlueprintPayload(payload) && !current.blueprintUrl) {
            current.blueprintUrl = `/blueprint/share/${encodeURIComponent(s.token)}`
          } else if (payload.type === 'script-resonance' && !current.resonanceUrl) {
            current.resonanceUrl = `/share/script-resonance/${encodeURIComponent(s.token)}`
          } else if (isContinuityPayload(payload) && !current.continuityUrl) {
            current.continuityUrl = `/share/continuity/${encodeURIComponent(s.token)}`
            const slots = Array.isArray(payload.slots) ? payload.slots : []
            continuityByProject.set(s.project_id, {
              totalSlots: slots.length,
              approvedSlots: slots.filter((sl) => sl.clientDecision === 'approved').length,
              pendingUploads: pendingCountByProject.get(s.project_id) || 0,
            })
          }

          linksByProject.set(s.project_id, current)
        }
      } catch (sessionErr) {
        console.warn('[companion plans] Share session enrichment skipped:', sessionErr)
      }
    }

    const plans = projects.map((project) => {
      const updated =
        project.updated_at instanceof Date
          ? project.updated_at.toISOString()
          : String(project.updated_at)
      return buildCompanionPlanCard({
        projectId: project.id,
        title: project.title,
        updatedAt: updated,
        metadata: (project.metadata as Record<string, unknown>) || {},
        shareLinks: linksByProject.get(project.id),
        continuitySummary: continuityByProject.get(project.id) ?? null,
      })
    })

    return NextResponse.json({ plans })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load plans'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
