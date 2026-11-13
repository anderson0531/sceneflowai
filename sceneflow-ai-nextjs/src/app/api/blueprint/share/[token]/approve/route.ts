import { NextRequest, NextResponse } from 'next/server'
import { sequelize } from '@/config/database'
import CollabSession from '@/models/CollabSession'
import Project from '@/models/Project'
import { getPayload, resolveSessionByToken } from '@/lib/blueprint/shareSession'
import { sessionDbId } from '@/lib/blueprint/shareAuth'
import { notifyUser } from '@/lib/jobs/jobService'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await sequelize.authenticate()

    const session = await resolveSessionByToken(token)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }
    const payload = getPayload(session)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 400 })
    }

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

    if (projectId) {
      const project = await Project.findByPk(projectId).catch(() => null)
      if (project) {
        const md = ((project.metadata || {}) as Record<string, unknown>)
        const co = ((md.clientOrder || {}) as Record<string, unknown>)
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
            },
          },
        })
      }
    }

    if (ownerId && projectId) {
      try {
        await notifyUser({
          userId: ownerId,
          projectId,
          type: 'client_stage_approved',
          title: 'Blueprint Approved by Client',
          message: `${approverName} approved the Blueprint. Ready to send Continuity Library link or start production.`,
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
