import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import Project from '@/models/Project'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import {
  getOrCreateProducerProfile,
  toBrandProfileSnapshot,
} from '@/lib/producer/producerProfileService'
import {
  grantBlueprintIterationPack,
  sendAutomatedClientPortalEmail,
} from '@/lib/intake/automatedClientBlueprint'
import {
  releaseExpressFilmToClient,
  type ExpressDeliveryTier,
  type ExpressReleaseMode,
} from '@/lib/export/expressCinemaPipeline'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      projectId?: string
      action?:
        | 'send_nudge'
        | 'grant_iteration_pack'
        | 'release_express_film'
        | 'set_express_mode'
      customNote?: string
      deliveryTier?: ExpressDeliveryTier
      expressReleaseMode?: ExpressReleaseMode
    }

    const projectId = String(body.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const project = await Project.findByPk(projectId)
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    const md = (project.metadata || {}) as Record<string, unknown>
    const co = (md.clientOrder || {}) as Record<string, unknown>
    const shareToken = typeof co.blueprintShareToken === 'string' ? co.blueprintShareToken : ''
    const shareUrl = typeof co.blueprintShareUrl === 'string' ? co.blueprintShareUrl : ''
    const customerEmail = typeof co.customerEmail === 'string' ? co.customerEmail.trim() : ''
    const customerName = String(co.customerName || co.customerLabel || 'there').trim()
    const origin = new URL(req.url).origin

    const action = body.action || 'send_nudge'

    if (action === 'grant_iteration_pack') {
      if (!shareToken) {
        return NextResponse.json(
          { success: false, error: 'No active Blueprint share link found on this project' },
          { status: 400 }
        )
      }
      const granted = await grantBlueprintIterationPack({
        token: shareToken,
        packsCount: 1,
        origin,
        locale: typeof co.locale === 'string' ? co.locale : 'en',
        source: 'producer_grant',
      })
      if (!granted.ok) {
        return NextResponse.json({ success: false, error: granted.error }, { status: granted.status })
      }
      return NextResponse.json({
        success: true,
        ...granted,
      })
    }

    if (action === 'set_express_mode') {
      const nextTier: ExpressDeliveryTier =
        body.deliveryTier === 'express_cinema_4k' ? 'express_cinema_4k' : 'full_motion_cinema'
      const nextReleaseMode: ExpressReleaseMode =
        body.expressReleaseMode === 'full_autopilot' ? 'full_autopilot' : 'supervised_pm_release'
      await project.update({
        metadata: {
          ...md,
          clientOrder: {
            ...co,
            deliveryTier: nextTier,
            expressReleaseMode: nextReleaseMode,
          },
        },
      })
      return NextResponse.json({
        success: true,
        deliveryTier: nextTier,
        expressReleaseMode: nextReleaseMode,
      })
    }

    if (action === 'release_express_film') {
      const ownerId = access.billingOwnerUserId || actorUserId
      const released = await releaseExpressFilmToClient({
        project,
        ownerUserId: ownerId,
        customNote: body.customNote,
        baseUrl: origin,
      })
      if (!released.ok) {
        return NextResponse.json({ success: false, error: released.error }, { status: released.status })
      }
      return NextResponse.json({
        success: true,
        ...released,
      })
    }

    if (!customerEmail || !shareUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer email and active Blueprint share link are required to send a reminder.',
        },
        { status: 400 }
      )
    }

    const ownerId = access.billingOwnerUserId || actorUserId
    const profile = await getOrCreateProducerProfile(ownerId)
    const brand = toBrandProfileSnapshot(profile, 'Video Studio')
    const customNote = (body.customNote || '').trim().slice(0, 500)

    const sent = await sendAutomatedClientPortalEmail({
      toEmail: customerEmail,
      customerName,
      brandName: brand.brandName,
      subject: `${brand.brandName} — Your Illustrated Blueprint for "${project.title}" Is Ready When You Are`,
      heading: `Pick Up Right Where You Left Off on "${project.title}"`,
      paragraphs: [
        `Hi ${customerName},`,
        `Your illustrated, narrated Blueprint is waiting in your private Director Portal. You can share a comment-only link with family or teammates, apply AI refinements, or click Approve whenever you're ready for your production quote.`,
        ...(customNote ? [customNote] : []),
      ],
      ctaLabel: 'Open My Blueprint Portal',
      ctaUrl: shareUrl,
    })

    const nowIso = new Date().toISOString()
    await project.update({
      metadata: {
        ...md,
        clientOrder: {
          ...co,
          lastBlueprintNudgeSentAt: nowIso,
          blueprintNudgeCount: Math.max(0, Number(co.blueprintNudgeCount ?? 0) || 0) + 1,
        },
      },
    })

    return NextResponse.json({
      success: true,
      sent,
      sentAt: nowIso,
    })
  } catch (err: unknown) {
    console.error('[POST /api/producer/ops/blueprint-nudge] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to process Blueprint nudge'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
