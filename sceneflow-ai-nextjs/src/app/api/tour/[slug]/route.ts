import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  buildPublicDemoPropertyTourDTO,
  isPublicDemoTourSlug,
} from '@/lib/propertyTours/hostingPolicy'
import {
  loadPublishedTourFromVercelBlob,
  saveLeadToVercelBlob,
} from '@/lib/propertyTours/vercelBlobStore'
import type { PropertyLeadInquiryType } from '@/models/PropertyTourLead'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function sendResendLeadNotification(args: {
  recipientEmail: string
  agencyName: string
  tourTitle: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  inquiryType: string
  selectedRoomName: string | null
  selectedStyle: string | null
  message: string | null
}): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (!resendKey || !args.recipientEmail) return

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || 'SceneFlow AI Studio <noreply@sfai.studio>'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [args.recipientEmail],
      reply_to: args.buyerEmail,
      subject: `[${args.agencyName}] New Buyer Inquiry: ${args.tourTitle}`,
      text: [
        `New buyer inquiry from your Interactive Property Tour: ${args.tourTitle}`,
        `Name: ${args.buyerName}`,
        `Email: ${args.buyerEmail}`,
        args.buyerPhone ? `Phone: ${args.buyerPhone}` : null,
        `Inquiry Type: ${args.inquiryType}`,
        args.selectedRoomName ? `Viewing Room: ${args.selectedRoomName}` : null,
        args.selectedStyle ? `Selected Design Vision: ${args.selectedStyle}` : null,
        args.message ? `Message: ${args.message}` : null,
      ]
        .filter((l): l is string => l !== null)
        .join('\n'),
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch((err) => {
    console.warn('[PropertyTour Lead] Resend notification failed:', err)
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    // 1. Built-in public demo slugs resolve instantaneously with zero login & zero GCP/DB dependency
    if (isPublicDemoTourSlug(slug)) {
      return NextResponse.json(
        { tour: buildPublicDemoPropertyTourDTO(slug), storage: 'bundled_demo' },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        }
      )
    }

    // 2. Vercel Blob-hosted published tours (100% Vercel-native, zero GCP dependency)
    const blobTour = await loadPublishedTourFromVercelBlob(slug)
    if (blobTour) {
      return NextResponse.json(
        { tour: blobTour, storage: 'vercel_blob' },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
        }
      )
    }

    // 3. Postgres-backed agency tours (dynamically imported so GCP/DB outages never break Vercel demo tours)
    const [{ ensurePropertyToursSchema }, { PropertyTour }] = await Promise.all([
      import('@/lib/database/migratePropertyTours'),
      import('@/models'),
    ])
    await ensurePropertyToursSchema()

    const tour = await PropertyTour.findOne({ where: { slug } })
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const wantsPreview = searchParams.get('preview') === '1'

    if (tour.status !== 'published') {
      if (!wantsPreview) {
        return NextResponse.json(
          { error: 'This property tour is currently paused or not yet published.' },
          { status: 404 }
        )
      }
      const [{ getServerSession }, { authOptions }, { resolveUser }] = await Promise.all([
        import('next-auth'),
        import('@/lib/auth'),
        import('@/lib/userHelper'),
      ])
      const session = (await getServerSession(authOptions as any)) as {
        user?: { id?: string; email?: string | null }
      } | null
      const rawId = session?.user?.id || session?.user?.email
      const user = rawId ? await resolveUser(rawId).catch(() => null) : null
      if (!user || user.id !== tour.user_id) {
        return NextResponse.json({ error: 'Tour not published' }, { status: 404 })
      }
    } else if (!wantsPreview) {
      void PropertyTour.increment('view_count', { by: 1, where: { id: tour.id } }).catch(() => {})
    }

    return NextResponse.json(
      { tour: tour.toDTO(), storage: 'postgres' },
      {
        status: 200,
        headers:
          tour.status === 'published' && !wantsPreview
            ? { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' }
            : { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error: any) {
    console.error('[GET /api/tour/[slug]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load tour', message: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = (await request.json().catch(() => ({}))) as Record<string, any>

    // Silent honeypot bot filter
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      return NextResponse.json({
        success: true,
        leadId: 'filtered',
        message: 'Thank you! Your inquiry has been sent.',
      })
    }

    const buyerName = String(body.buyerName || '').trim().slice(0, 160)
    const buyerEmail = String(body.buyerEmail || '').trim().toLowerCase().slice(0, 255)
    if (!buyerName || !buyerEmail || !EMAIL_PATTERN.test(buyerEmail)) {
      return NextResponse.json(
        { error: 'Please provide your name and a valid email address.' },
        { status: 400 }
      )
    }

    const allowedInquiryTypes: PropertyLeadInquiryType[] = [
      'schedule_showing',
      'renovation_quote',
      'financing_info',
      'general',
    ]
    const inquiryType: PropertyLeadInquiryType = allowedInquiryTypes.includes(body.inquiryType)
      ? body.inquiryType
      : 'schedule_showing'
    const buyerPhone =
      typeof body.buyerPhone === 'string' ? body.buyerPhone.trim().slice(0, 64) || null : null
    const selectedRoomName =
      typeof body.selectedRoomName === 'string'
        ? body.selectedRoomName.trim().slice(0, 120) || null
        : null
    const selectedStyle =
      typeof body.selectedStyle === 'string'
        ? body.selectedStyle.trim().slice(0, 64) || null
        : null
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, 2000) || null : null

    // 1. Built-in public demo slug (zero DB dependency)
    if (isPublicDemoTourSlug(slug)) {
      return NextResponse.json(
        {
          success: true,
          leadId: `demo-${crypto.randomUUID().slice(0, 8)}`,
          demoMode: true,
          message:
            'Demo inquiry received! In a published agency tour, this lead is saved and emailed directly to your listing advisor.',
        },
        { status: 201 }
      )
    }

    // 2. Vercel Blob-hosted published tour (100% Vercel-native + Resend email)
    const blobTour = await loadPublishedTourFromVercelBlob(slug)
    if (blobTour) {
      const leadId = crypto.randomUUID()
      await saveLeadToVercelBlob({
        id: leadId,
        slug,
        tourTitle: blobTour.title,
        buyerName,
        buyerEmail,
        buyerPhone,
        inquiryType,
        message,
        selectedRoomName,
        selectedStyle,
        createdAt: new Date().toISOString(),
      })

      const recipientEmail = blobTour.branding?.agentEmail?.trim() || ''
      if (recipientEmail && !recipientEmail.endsWith('.example')) {
        void sendResendLeadNotification({
          recipientEmail,
          agencyName: blobTour.branding?.agencyName || 'Property Tour Lead',
          tourTitle: blobTour.title,
          buyerName,
          buyerEmail,
          buyerPhone,
          inquiryType,
          selectedRoomName,
          selectedStyle,
          message,
        })
      }

      return NextResponse.json(
        {
          success: true,
          leadId,
          storage: 'vercel_blob',
          message: `Thank you, ${buyerName}! Your inquiry has been sent to ${blobTour.branding?.agentName || blobTour.branding?.agencyName || 'the listing advisor'}.`,
        },
        { status: 201 }
      )
    }

    // 3. Postgres-backed agency tour
    const [{ ensurePropertyToursSchema }, { PropertyTour, PropertyTourLead, User }] =
      await Promise.all([import('@/lib/database/migratePropertyTours'), import('@/models')])
    await ensurePropertyToursSchema()

    const tour = await PropertyTour.findOne({ where: { slug } })
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
    }

    const lead = await PropertyTourLead.create({
      id: crypto.randomUUID(),
      tour_id: tour.id,
      owner_user_id: tour.user_id,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      inquiry_type: inquiryType,
      selected_room_name: selectedRoomName,
      selected_style: selectedStyle,
      message,
      referrer_url: request.headers.get('referer')?.slice(0, 500) || null,
    })

    await PropertyTour.increment('lead_count', { by: 1, where: { id: tour.id } }).catch(() => {})

    let recipientEmail = tour.branding?.agentEmail?.trim() || ''
    if (!recipientEmail) {
      const owner = await User.findByPk(tour.user_id).catch(() => null)
      recipientEmail = owner?.email || ''
    }

    const notify = () =>
      sendResendLeadNotification({
        recipientEmail,
        agencyName: tour.branding?.agencyName || 'Property Tour Lead',
        tourTitle: tour.title,
        buyerName: lead.buyer_name,
        buyerEmail: lead.buyer_email,
        buyerPhone: lead.buyer_phone,
        inquiryType: lead.inquiry_type,
        selectedRoomName: lead.selected_room_name,
        selectedStyle: lead.selected_style,
        message: lead.message,
      })

    try {
      const nextServer = await import('next/server')
      if (typeof nextServer.after === 'function') {
        nextServer.after(notify)
      } else {
        void notify()
      }
    } catch {
      void notify()
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: `Thank you, ${buyerName}! Your inquiry has been sent to ${tour.branding?.agentName || tour.branding?.agencyName || 'the listing advisor'}.`,
    })
  } catch (error: any) {
    console.error('[POST /api/tour/[slug]] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit inquiry', message: error?.message },
      { status: 500 }
    )
  }
}
