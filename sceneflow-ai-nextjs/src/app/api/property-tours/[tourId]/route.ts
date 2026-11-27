import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PropertyTour, PropertyTourHostingEvent, PropertyTourLead } from '@/models'
import { resolveUser } from '@/lib/userHelper'
import { CreditService } from '@/services/CreditService'
import { SubscriptionService } from '@/services/SubscriptionService'
import { ensurePropertyToursSchema } from '@/lib/database/migratePropertyTours'
import {
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  getCurrentBillingMonth,
  getIncludedActiveListingSlots,
} from '@/lib/propertyTours/hostingPolicy'
import type { PropertyTourStatus } from '@/lib/propertyTours/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveSessionUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string | null }
  } | null
  const rawId = session?.user?.id || session?.user?.email
  if (!rawId) return null
  try {
    const user = await resolveUser(rawId)
    return user.id
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tourId: string }> }
) {
  try {
    const userId = await resolveSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { tourId } = await context.params
    await ensurePropertyToursSchema()

    const tour = await PropertyTour.findOne({ where: { id: tourId, user_id: userId } })
    if (!tour) {
      return NextResponse.json({ error: 'Property tour not found' }, { status: 404 })
    }

    const [leads, hostingEvents, activeCount, sub] = await Promise.all([
      PropertyTourLead.findAll({
        where: { tour_id: tour.id },
        order: [['created_at', 'DESC']],
        limit: 100,
      }),
      PropertyTourHostingEvent.findAll({
        where: { tour_id: tour.id },
        order: [['created_at', 'DESC']],
        limit: 24,
      }),
      PropertyTour.count({ where: { user_id: userId, status: 'published' } }),
      SubscriptionService.getUserSubscription(userId).catch(() => null),
    ])

    const tierName = sub?.tier?.name || 'explorer'
    const includedSlots = getIncludedActiveListingSlots(tierName)

    return NextResponse.json({
      tour: tour.toDTO(),
      leads: leads.map((l) => ({
        id: l.id,
        buyerName: l.buyer_name,
        buyerEmail: l.buyer_email,
        buyerPhone: l.buyer_phone,
        inquiryType: l.inquiry_type,
        selectedRoomName: l.selected_room_name,
        selectedStyle: l.selected_style,
        message: l.message,
        createdAt: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
      })),
      hostingEvents: hostingEvents.map((e) => ({
        id: e.id,
        billingMonth: e.billing_month,
        eventType: e.event_type,
        creditsCharged: e.credits_charged,
        createdAt: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString(),
      })),
      activeCount,
      includedSlots,
      extraListingMonthlyCredits: EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
      tierName,
    })
  } catch (error: any) {
    console.error('[GET /api/property-tours/[tourId]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load property tour', message: error?.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tourId: string }> }
) {
  try {
    const userId = await resolveSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { tourId } = await context.params
    await ensurePropertyToursSchema()

    const tour = await PropertyTour.findOne({ where: { id: tourId, user_id: userId } })
    if (!tour) {
      return NextResponse.json({ error: 'Property tour not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    let hostingBilledCredits = 0

    // Handle publishing -> enforce included active listing quota or bill 150 cr/mo overage (idempotent per month!)
    const nextStatus = body.status as PropertyTourStatus | undefined
    if (nextStatus === 'published' && tour.status !== 'published') {
      const billingMonth = getCurrentBillingMonth()
      const alreadyBilledThisMonth = await PropertyTourHostingEvent.findOne({
        where: { tour_id: tour.id, billing_month: billingMonth },
      })

      if (!alreadyBilledThisMonth) {
        const [activeCount, sub] = await Promise.all([
          PropertyTour.count({ where: { user_id: userId, status: 'published' } }),
          SubscriptionService.getUserSubscription(userId).catch(() => null),
        ])
        const tierName = sub?.tier?.name || 'explorer'
        const includedSlots = getIncludedActiveListingSlots(tierName)
        const needsOverageFee = activeCount >= includedSlots
        const feeCredits = needsOverageFee
          ? Number(tour.monthly_hosting_credits || EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS)
          : 0

        let ledgerId: string | null = null
        if (feeCredits > 0) {
          const hasCredits = await CreditService.ensureCredits(userId, feeCredits)
          if (!hasCredits) {
            return NextResponse.json(
              {
                error: 'INSUFFICIENT_CREDITS',
                message: `Your plan includes ${includedSlots} active listing(s). Publishing an additional active listing requires ${feeCredits} credits/month ($${(feeCredits / 100).toFixed(2)}/mo).`,
                requiredCredits: feeCredits,
                includedSlots,
                activeCount,
              },
              { status: 402 }
            )
          }

          const charged = await CreditService.charge(
            userId,
            feeCredits,
            'ai_usage',
            `property_tour_host:${tour.id}:${billingMonth}`,
            {
              operation: 'property_tour_monthly_hosting',
              tourId: tour.id,
              slug: tour.slug,
              billingMonth,
              tierName,
            },
            { idempotencyKey: `property_tour_host:${tour.id}:${billingMonth}` }
          )
          ledgerId = charged?.ledgerId ?? null
          hostingBilledCredits = feeCredits
        }

        await PropertyTourHostingEvent.create({
          id: crypto.randomUUID(),
          tour_id: tour.id,
          user_id: userId,
          billing_month: billingMonth,
          event_type: feeCredits > 0 ? 'publish_activation' : 'included_plan_slot',
          credits_charged: feeCredits,
          ledger_id: ledgerId,
          meta: { tierName, includedSlots, activeCountBefore: activeCount },
        })
      }

      tour.status = 'published'
      if (!tour.published_at) tour.published_at = new Date()
      tour.hosting_renewed_at = new Date()
    } else if (
      nextStatus &&
      ['draft', 'paused', 'archived'].includes(nextStatus)
    ) {
      tour.status = nextStatus
    }

    if (typeof body.title === 'string' && body.title.trim()) {
      tour.title = body.title.trim().slice(0, 200)
    }
    if (body.propertyAddress !== undefined) {
      tour.property_address =
        typeof body.propertyAddress === 'string'
          ? body.propertyAddress.trim().slice(0, 300) || null
          : null
    }
    if (body.propertySpecs && typeof body.propertySpecs === 'object') {
      tour.property_specs = { ...(tour.property_specs || {}), ...body.propertySpecs }
    }
    if (body.branding && typeof body.branding === 'object') {
      tour.branding = { ...(tour.branding || {}), ...body.branding }
    }
    if (Array.isArray(body.rooms)) {
      tour.blueprint_rooms = body.rooms
      tour.changed('blueprint_rooms', true)
    }
    if (body.defaultRoomId !== undefined) {
      tour.default_room_id = typeof body.defaultRoomId === 'string' ? body.defaultRoomId : null
    }
    if (Array.isArray(body.availableStyles)) {
      tour.available_styles = body.availableStyles
    }
    if (Array.isArray(body.availableLighting)) {
      tour.available_lighting = body.availableLighting
    }
    if (Array.isArray(body.availableLifestyles)) {
      tour.available_lifestyles = body.availableLifestyles
    }

    await tour.save()

    return NextResponse.json({
      tour: tour.toDTO(),
      hostingBilledCredits,
    })
  } catch (error: any) {
    console.error('[PATCH /api/property-tours/[tourId]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update property tour', message: error?.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ tourId: string }> }
) {
  try {
    const userId = await resolveSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { tourId } = await context.params
    await ensurePropertyToursSchema()

    const deleted = await PropertyTour.destroy({ where: { id: tourId, user_id: userId } })
    if (!deleted) {
      return NextResponse.json({ error: 'Property tour not found' }, { status: 404 })
    }
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    console.error('[DELETE /api/property-tours/[tourId]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete property tour', message: error?.message },
      { status: 500 }
    )
  }
}
