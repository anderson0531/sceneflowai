import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import {
  extractContinuitySlotsFromProject,
  extractScenePromptCardsFromProject,
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
      allowVoiceCapture: payload.allowVoiceCapture !== false,
      allowVideoClips: Boolean(payload.allowVideoClips),
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
      scenePromptCards: Array.isArray(payload.scenePromptCards) ? payload.scenePromptCards : [],
      submissions: submissions.map((s) => ({
        id: s.id,
        slotId: s.slot_id,
        slotType: s.slot_type,
        slotName: s.slot_name,
        customerName: s.customer_name,
        blobUrl: s.blob_url,
        mimeType: s.mime_type,
        fileSizeBytes: s.file_size_bytes,
        caption: s.caption,
        metadata: s.metadata || null,
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
        consentedVisualLikeness: body.consentedVisualLikeness !== false,
        consentedVoiceLocalization: body.consentedVoiceLocalization === true,
      })
      if (typeof body.locale === 'string' && body.locale.trim()) {
        const nextLocale = resolveClientPortalLocale(body.locale)
        if (nextLocale !== resolved.payload.locale) {
          await resolved.session.update({
            payload: {
              ...resolved.payload,
              locale: nextLocale,
            } as unknown as Record<string, unknown>,
          })
        }
      }
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
      await resolved.session.update({ status: 'closed' })
      return NextResponse.json({ success: true, revoked: true })
    }

    if (action === 'reject_submission' && body.submissionId) {
      const sub = await ClientAssetSubmission.findByPk(String(body.submissionId))
      if (sub && sub.project_id === resolved.session.project_id) {
        await sub.update({ approval_status: 'rejected' })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'set_archival_mode' && body.submissionId) {
      const sub = await ClientAssetSubmission.findByPk(String(body.submissionId))
      if (sub && sub.project_id === resolved.session.project_id) {
        const mode =
          body.archivalDisplayMode === 'archival_ken_burns'
            ? 'archival_ken_burns'
            : 'ai_reference'
        await sub.update({
          metadata: {
            ...(sub.metadata || {}),
            archivalDisplayMode: mode,
          },
        })
      }
      return NextResponse.json({ success: true })
    }

    const freshSlots = extractContinuitySlotsFromProject(access.project)
    const freshPromptCards = extractScenePromptCardsFromProject(access.project)
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
      allowVoiceCapture:
        typeof body.allowVoiceCapture === 'boolean'
          ? body.allowVoiceCapture
          : resolved.payload.allowVoiceCapture !== false,
      allowVideoClips:
        typeof body.allowVideoClips === 'boolean'
          ? body.allowVideoClips
          : Boolean(resolved.payload.allowVideoClips),
      slots: mergedSlots,
      scenePromptCards: freshPromptCards,
    }

    await resolved.session.update({
      payload: nextPayload as unknown as Record<string, unknown>,
    })

    return NextResponse.json({
      success: true,
      allowUploads: nextPayload.allowUploads !== false,
      allowVoiceCapture: nextPayload.allowVoiceCapture !== false,
      allowVideoClips: Boolean(nextPayload.allowVideoClips),
      slots: mergedSlots,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update continuity session'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
