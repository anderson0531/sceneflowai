import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import {
  extractContinuitySlotsFromProject,
  resolveActiveContinuitySession,
  submitContinuityClientReview,
  type ContinuitySessionPayload,
} from '@/lib/continuity/continuityPortalService'
import {
  getLatestCustomerConsent,
  recordCustomerConsent,
} from '@/lib/producer/producerProfileService'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { resolveClientPortalLocale } from '@/lib/intake/clientPortalCopy'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

function getRequestIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || null
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    await ensureProducerPlatformSchema()
    const resolved = await resolveActiveContinuitySession(token)
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Continuity link not found or expired' },
        { status: 404 }
      )
    }

    const { session, payload } = resolved
    const consent = await getLatestCustomerConsent(session.id)
    const submissions = await ClientAssetSubmission.findAll({
      where: {
        collab_session_id: session.id,
        quarantine_status: 'clean',
      },
      order: [['created_at', 'DESC']],
    })

    const langParam = req.nextUrl.searchParams.get('lang')
    const locale = langParam ? resolveClientPortalLocale(langParam) : payload.locale
    const clientMode = Boolean(payload.clientMode)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      projectId: payload.projectId,
      projectTitle: payload.projectTitle || null,
      clientMode,
      allowUploads: payload.allowUploads !== false,
      locale,
      brandProfile: payload.brandProfileSnapshot,
      consentAccepted: clientMode ? Boolean(consent) : true,
      customerName: consent?.customer_name || payload.lastReviewerName || null,
      maxRounds: payload.maxRounds,
      roundsUsed: payload.roundsUsed,
      approvalStatus: payload.approvalStatus,
      lastReviewerName: payload.lastReviewerName || null,
      lastReviewedAt: payload.lastReviewedAt || null,
      generalNotes: payload.generalNotes || null,
      slots: payload.slots,
      submissions: submissions.map((s) => ({
        id: s.id,
        slotId: s.slot_id,
        slotType: s.slot_type,
        slotName: s.slot_name,
        blobUrl: s.blob_url,
        caption: s.caption,
        approvalStatus: s.approval_status,
        createdAt: s.created_at,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load continuity portal'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const body = await req.json().catch(() => ({}))

    if (body.action === 'consent') {
      const resolved = await resolveActiveContinuitySession(token)
      if (!resolved) {
        return NextResponse.json(
          { success: false, error: 'Continuity link not found or expired' },
          { status: 404 }
        )
      }
      const isClientMode = Boolean(resolved.payload.clientMode)
      const consent = await recordCustomerConsent({
        collabSessionId: resolved.session.id,
        projectId: resolved.session.project_id,
        ownerUserId: resolved.session.owner_user_id,
        customerName: String(body.customerName || ''),
        customerEmail: body.customerEmail ? String(body.customerEmail) : null,
        ipAddress: getRequestIp(req),
        userAgent: req.headers.get('user-agent'),
        attestedMediaRights: body.attestedMediaRights === true,
        acknowledgedZeroPrivity: isClientMode ? body.acknowledgedZeroPrivity === true : true,
      })
      return NextResponse.json({
        success: true,
        consentId: consent.id,
        customerName: consent.customer_name,
      })
    }

    const reviewResult = await submitContinuityClientReview({
      token,
      reviewerName: String(body.reviewerName || 'Reviewer'),
      slotDecisions: Array.isArray(body.slotDecisions) ? body.slotDecisions : [],
      generalNotes: body.generalNotes ? String(body.generalNotes) : undefined,
    })

    if (!reviewResult.ok) {
      return NextResponse.json(
        { success: false, error: reviewResult.error },
        { status: reviewResult.status }
      )
    }

    return NextResponse.json({
      success: true,
      approvalStatus: reviewResult.approvalStatus,
      roundsUsed: reviewResult.roundsUsed,
      maxRounds: reviewResult.maxRounds,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update continuity portal'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await ensureProducerPlatformSchema()
    const resolved = await resolveActiveContinuitySession(token)
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Continuity link not found or expired' },
        { status: 404 }
      )
    }

    const access = await assertProjectAccess(resolved.session.project_id, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'resync')

    if (action === 'revoke') {
      await resolved.session.update({ status: 'revoked' })
      return NextResponse.json({ success: true, revoked: true })
    }

    if (action === 'reject_submission' && body.submissionId) {
      const sub = await ClientAssetSubmission.findByPk(String(body.submissionId))
      if (sub && sub.project_id === resolved.session.project_id) {
        await sub.update({ approval_status: 'rejected' })
      }
      return NextResponse.json({ success: true })
    }

    const freshSlots = extractContinuitySlotsFromProject(access.project)
    const prevBySlot = new Map(resolved.payload.slots.map((s) => [s.slotId, s]))
    const mergedSlots = freshSlots.map((slot) => {
      const prev = prevBySlot.get(slot.slotId)
      return prev
        ? {
            ...slot,
            clientDecision: prev.clientDecision,
            clientNote: prev.clientNote,
          }
        : slot
    })

    const nextPayload: ContinuitySessionPayload = {
      ...resolved.payload,
      projectTitle: access.project.title || resolved.payload.projectTitle,
      allowUploads:
        typeof body.allowUploads === 'boolean'
          ? body.allowUploads
          : resolved.payload.allowUploads !== false,
      slots: mergedSlots,
    }

    await resolved.session.update({
      payload: nextPayload as unknown as Record<string, unknown>,
    })

    return NextResponse.json({
      success: true,
      allowUploads: nextPayload.allowUploads !== false,
      slots: mergedSlots,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update continuity session'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
