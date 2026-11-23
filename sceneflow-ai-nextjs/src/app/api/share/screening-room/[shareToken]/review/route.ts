import { NextRequest, NextResponse } from 'next/server'
import { findActiveShareProject } from '@/lib/storyboard/shareProjectLookup'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import { notifyUser } from '@/lib/jobs/jobService'
import { triggerExpress4kRenderOnScreeningApproval } from '@/lib/export/expressCinemaPipeline'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ shareToken: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { shareToken } = await ctx.params
    const project = await findActiveShareProject(shareToken)
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Share link not found or expired' },
        { status: 404 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const decision =
      body.decision === 'revision_requested' ? 'revision_requested' : 'approved'
    const reviewerName = String(body.reviewerName || 'Client').trim().slice(0, 120) || 'Client'
    const notes = body.notes ? String(body.notes).trim().slice(0, 3000) : ''

    const quarantine = evaluateCustomerTextQuarantine(notes)
    if (quarantine.status === 'flagged') {
      return NextResponse.json(
        { success: false, error: quarantine.reason || 'Notes flagged by safety filter' },
        { status: 422 }
      )
    }

    const md = { ...((project.metadata || {}) as Record<string, any>) }
    const co = { ...(md.clientOrder || {}) }
    const maxRounds = Number(co.maxFeedbackRounds ?? 2)
    const roundsUsed = Number(co.screeningRoundsUsed ?? 0)

    if (decision === 'revision_requested' && roundsUsed >= maxRounds) {
      return NextResponse.json(
        {
          success: false,
          error: 'ROUND_LIMIT_REACHED: Included screening revision rounds are complete.',
        },
        { status: 409 }
      )
    }

    const nextRoundsUsed = decision === 'revision_requested' ? roundsUsed + 1 : roundsUsed
    const nextStatus = decision === 'approved' ? 'approved' : 'changes_requested'

    co.isClientProject = true
    co.screeningRoundsUsed = nextRoundsUsed
    co.screeningApprovalStatus = nextStatus
    co.stage = decision === 'approved' ? 'final_approved' : 'screening_changes_requested'
    co.actionState = decision === 'approved' ? 'client_approved' : 'action_required'
    if (notes) {
      const history = Array.isArray(co.screeningFeedbackHistory)
        ? [...co.screeningFeedbackHistory]
        : []
      history.push({
        reviewerName,
        decision,
        notes,
        createdAt: new Date().toISOString(),
      })
      co.screeningFeedbackHistory = history
    }

    md.clientOrder = co
    await project.update({ metadata: md })

    const ownerId = String((project as { user_id?: string }).user_id || '')

    let expressRender: {
      triggered: boolean
      status?: 'queued' | 'skipped' | 'failed'
      jobId?: string
      reason?: string
    } = { triggered: false, status: 'skipped' }

    if (decision === 'approved') {
      try {
        expressRender = await triggerExpress4kRenderOnScreeningApproval({
          project,
          ownerUserId: ownerId,
        })
      } catch (renderErr) {
        console.warn('[screening review] Express 4K auto-render warning:', renderErr)
        expressRender = {
          triggered: false,
          status: 'failed',
          reason: renderErr instanceof Error ? renderErr.message : 'Auto-render failed',
        }
      }
    }

    if (ownerId) {
      try {
        await notifyUser({
          userId: ownerId,
          projectId: project.id,
          type:
            decision === 'approved' ? 'client_stage_approved' : 'client_feedback_received',
          title:
            decision === 'approved'
              ? `Final Screening Approved: ${project.title}`
              : `Screening Revision Requested: ${project.title}`,
          message:
            decision === 'approved'
              ? expressRender.triggered
                ? `${reviewerName} approved the Screening Room cut! 4K master render has been auto-queued (job ${expressRender.jobId}) and will email the download link upon completion.`
                : `${reviewerName} approved the Screening Room master! Ready to deliver final video.`
              : `${reviewerName} submitted Screening Room revision notes (${nextRoundsUsed}/${maxRounds}).`,
          sendEmail: true,
          metadata: {
            projectId: project.id,
            stage: 'screening',
            decision,
            ...(expressRender.jobId ? { expressRenderJobId: expressRender.jobId } : {}),
            openPath: `/dashboard/workflow/vision/${project.id}`,
          },
        })
      } catch (notifyErr) {
        console.warn('[screening review] notify warning:', notifyErr)
      }
    }

    return NextResponse.json({
      success: true,
      approvalStatus: nextStatus,
      roundsUsed: nextRoundsUsed,
      maxRounds,
      expressRender,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit screening review'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
