import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import Project from '@/models/Project'
import { resolveBlueprintShareByToken } from '@/lib/blueprint/shareSession'
import { sessionDbId } from '@/lib/blueprint/shareAuth'
import { notifyUser } from '@/lib/jobs/jobService'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await sequelize.authenticate()

    const resolved = await resolveBlueprintShareByToken(token)
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }
    if (resolved.accessRole === 'guest_reviewer') {
      return NextResponse.json(
        {
          success: false,
          error: 'GUEST_READ_ONLY: Only the primary customer can approve this Blueprint.',
        },
        { status: 403 }
      )
    }
    const { session, payload } = resolved

    const body = await req.json().catch(() => ({}))
    const approverName = String(body.reviewerName || 'Client').trim().slice(0, 120) || 'Client'
    const nowIso = new Date().toISOString()

    const nextPayload = {
      ...payload,
      shareSettings: {
        ...payload.shareSettings,
        approvalStatus: 'approved' as const,
        approvedByName: approverName,
        approvedAt: nowIso,
      },
    }

    await CollabSession.update(
      { payload: nextPayload },
      { where: { id: sessionDbId(session) } }
    )

    const projectId = (session as { project_id?: string }).project_id
    const ownerId = (session as { owner_user_id?: string }).owner_user_id

    let resolvedLocale = payload.sectionAudioLanguage || 'en'
    if (projectId) {
      const project = await Project.findByPk(projectId).catch(() => null)
      if (project) {
        const md = ((project.metadata || {}) as Record<string, unknown>)
        const co = ((md.clientOrder || {}) as Record<string, unknown>)
        if (typeof co.locale === 'string' && co.locale.trim()) {
          resolvedLocale = co.locale.trim()
        }
        await project.update({
          metadata: {
            ...md,
            clientOrder: {
              ...co,
              isClientProject: true,
              stage: 'blueprint_approved',
              actionState: 'action_required',
              blueprintApprovedAt: nowIso,
              blueprintApprovedBy: approverName,
              lastClientActivityAt: nowIso,
            },
          },
        })
      }
    }

    // Assign Video Service PM right when the customer approves the Blueprint (zero PM load before approval!)
    if (ownerId && projectId) {
      try {
        const { autoAssignProjectByLocale } = await import('@/lib/producer/workspaceAccess')
        await autoAssignProjectByLocale({
          ownerUserId: ownerId,
          projectId,
          locale: resolvedLocale,
        })
      } catch (routeErr) {
        console.warn('[blueprint approve] Locale PM auto-routing warning:', routeErr)
      }

      try {
        await notifyUser({
          userId: ownerId,
          projectId,
          type: 'client_stage_approved',
          title: 'Blueprint Approved by Client — Ready for Production Quote',
          message: `${approverName} approved their Blueprint. A PM has been routed and the project is ready for Continuity Library setup & production quoting.`,
          sendEmail: true,
          metadata: {
            projectId,
            stage: 'blueprint',
            approverName,
            openPath: `/dashboard/studio/${projectId}`,
          },
        })
      } catch (notifyErr) {
        console.warn('[blueprint approve] notify warning:', notifyErr)
      }
    }

    return NextResponse.json({
      success: true,
      approvalStatus: 'approved',
      approvedAt: nowIso,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Approval failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
