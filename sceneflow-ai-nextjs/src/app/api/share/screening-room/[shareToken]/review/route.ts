import { NextRequest, NextResponse } from 'next/server'
import { findActiveShareProject } from '@/lib/storyboard/shareProjectLookup'
import { evaluateCustomerTextQuarantine } from '@/lib/producer/quarantineCheck'
import { notifyUser } from '@/lib/jobs/jobService'

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
              ? `${reviewerName} approved the Screening Room master! Ready to deliver final video.`
              : `${reviewerName} submitted Screening Room revision notes (${nextRoundsUsed}/${maxRounds}).`,
          sendEmail: true,
          metadata: {
            projectId: project.id,
            stage: 'screening',
            decision,
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
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit screening review'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
