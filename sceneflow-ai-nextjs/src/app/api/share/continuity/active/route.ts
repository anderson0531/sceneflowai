import { NextRequest, NextResponse } from 'next/server'
import ClientAssetSubmission from '@/models/ClientAssetSubmission'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { getActiveContinuitySessionForProject } from '@/lib/continuity/continuityPortalService'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      )
    }

    const access = await assertProjectAccess(projectId, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    await ensureProducerPlatformSchema()
    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    const active = await getActiveContinuitySessionForProject(projectId, origin)
    const submissions = await ClientAssetSubmission.findAll({
      where: { project_id: projectId, quarantine_status: 'clean' },
      order: [['created_at', 'DESC']],
      limit: 60,
    })

    return NextResponse.json({
      success: true,
      active: active
        ? {
            token: active.session.token,
            sessionId: active.session.id,
            shareUrl: active.shareUrl,
            clientMode: Boolean(active.payload.clientMode),
            allowUploads: active.payload.allowUploads !== false,
            locale: active.payload.locale,
            approvalStatus: active.payload.approvalStatus,
            roundsUsed: active.payload.roundsUsed,
            maxRounds: active.payload.maxRounds,
            lastReviewerName: active.payload.lastReviewerName || null,
            lastReviewedAt: active.payload.lastReviewedAt || null,
            generalNotes: active.payload.generalNotes || null,
            slots: active.payload.slots,
          }
        : null,
      submissions: submissions.map((s) => ({
        id: s.id,
        slotId: s.slot_id,
        slotType: s.slot_type,
        slotName: s.slot_name,
        customerName: s.customer_name,
        blobUrl: s.blob_url,
        caption: s.caption,
        approvalStatus: s.approval_status,
        createdAt: s.created_at,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load continuity share status'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
