import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import {
  resolveActiveContinuitySession,
  submitContinuityClientReview,
} from '@/lib/continuity/continuityPortalService'
import {
  getLatestCustomerConsent,
  recordCustomerConsent,
} from '@/lib/producer/producerProfileService'
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

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      projectId: payload.projectId,
      locale,
      brandProfile: payload.brandProfileSnapshot,
      consentAccepted: Boolean(consent),
      customerName: consent?.customer_name || null,
      maxRounds: payload.maxRounds,
      roundsUsed: payload.roundsUsed,
      approvalStatus: payload.approvalStatus,
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
      const consent = await recordCustomerConsent({
        collabSessionId: resolved.session.id,
        projectId: resolved.session.project_id,
        ownerUserId: resolved.session.owner_user_id,
        customerName: String(body.customerName || ''),
        customerEmail: body.customerEmail ? String(body.customerEmail) : null,
        ipAddress: getRequestIp(req),
        userAgent: req.headers.get('user-agent'),
        attestedMediaRights: body.attestedMediaRights === true,
        acknowledgedZeroPrivity: body.acknowledgedZeroPrivity === true,
      })
      return NextResponse.json({
        success: true,
        consentId: consent.id,
        customerName: consent.customer_name,
      })
    }

    const reviewResult = await submitContinuityClientReview({
      token,
      reviewerName: String(body.reviewerName || 'Client'),
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
