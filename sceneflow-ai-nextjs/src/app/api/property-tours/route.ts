import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProducerProfile, PropertyTour } from '@/models'
import { resolveUser } from '@/lib/userHelper'
import { SubscriptionService } from '@/services/SubscriptionService'
import { ensurePropertyToursSchema } from '@/lib/database/migratePropertyTours'
import {
  buildSampleDemoRooms,
  EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
  getIncludedActiveListingSlots,
  slugifyPropertyTitle,
} from '@/lib/propertyTours/hostingPolicy'
import { createDefaultRoom } from '@/lib/propertyTours/types'

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

export async function GET() {
  try {
    const userId = await resolveSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensurePropertyToursSchema()

    const [tours, sub] = await Promise.all([
      PropertyTour.findAll({
        where: { user_id: userId },
        order: [['updated_at', 'DESC']],
      }),
      SubscriptionService.getUserSubscription(userId).catch(() => null),
    ])

    const tierName = sub?.tier?.name || 'explorer'
    const includedSlots = getIncludedActiveListingSlots(tierName)
    const activeCount = tours.filter((t) => t.status === 'published').length

    return NextResponse.json({
      tours: tours.map((t) => t.toDTO()),
      activeCount,
      includedSlots,
      extraListingMonthlyCredits: EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
      tierName,
    })
  } catch (error: any) {
    console.error('[GET /api/property-tours] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load property tours', message: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensurePropertyToursSchema()

    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    const seedDemo = body.seedDemo === true
    const rawTitle =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : seedDemo
          ? '418 Ocean Crest Drive — Coastal Remodel Vision'
          : 'Untitled Property Tour'

    const shortSuffix = crypto.randomBytes(3).toString('hex')
    const slug = slugifyPropertyTitle(rawTitle, shortSuffix)

    // Inherit white-label ProducerProfile branding if the agency has configured one
    const producer = await ProducerProfile.findOne({ where: { user_id: userId } }).catch(() => null)
    const inheritedBranding = {
      agencyName: producer?.brand_name || (seedDemo ? 'Pacific Crest Luxury Estates' : ''),
      logoUrl: producer?.brand_logo_url || null,
      primaryColor: producer?.primary_color || '#06b6d4',
      hideSceneFlowBranding: Boolean(producer?.hide_sceneflow_branding),
      agentName: seedDemo ? 'Sofia Laurent' : null,
      agentTitle: seedDemo ? 'Luxury Property Advisor' : null,
      agentEmail: producer?.support_email || null,
      agentPhone: seedDemo ? '(310) 555-0194' : null,
      ctaLabel: 'Schedule Showing / Request Quote',
      disclosureText: 'Virtually Staged · Concept Visualization',
      ...(body.branding && typeof body.branding === 'object' ? body.branding : {}),
    }

    const rooms = seedDemo
      ? buildSampleDemoRooms()
      : [
          createDefaultRoom({
            id: `room-${crypto.randomUUID().slice(0, 8)}`,
            name: 'Living / Great Room',
            roomType: 'living',
            orderIndex: 0,
            description: 'Upload 4 overlapping smartphone photos (N, E, S, W) from the center of the room.',
          }),
          createDefaultRoom({
            id: `room-${crypto.randomUUID().slice(0, 8)}`,
            name: 'Kitchen',
            roomType: 'kitchen',
            orderIndex: 1,
          }),
        ]

    const specs = seedDemo
      ? {
          priceUsd: 4850000,
          beds: 5,
          baths: 5.5,
          sqft: 4620,
          lotSize: '0.42 Acres',
          yearBuilt: 2019,
          propertyType: 'Single Family Residence',
        }
      : body.propertySpecs && typeof body.propertySpecs === 'object'
        ? body.propertySpecs
        : {}

    const tour = await PropertyTour.create({
      id: crypto.randomUUID(),
      user_id: userId,
      producer_profile_id: producer?.id ?? null,
      slug,
      title: rawTitle,
      property_address:
        typeof body.propertyAddress === 'string'
          ? body.propertyAddress.trim().slice(0, 300)
          : seedDemo
            ? '418 Ocean Crest Dr, Laguna Beach, CA 92651'
            : null,
      property_specs: specs,
      status: 'draft',
      hosting_tier: 'standard',
      monthly_hosting_credits: EXTRA_ACTIVE_LISTING_MONTHLY_CREDITS,
      branding: inheritedBranding,
      default_room_id: rooms[0]?.id ?? null,
      blueprint_rooms: rooms,
    })

    return NextResponse.json({ tour: tour.toDTO() }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/property-tours] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create property tour', message: error?.message },
      { status: 500 }
    )
  }
}
