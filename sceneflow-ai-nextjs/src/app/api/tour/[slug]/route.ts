import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PropertyTour, PropertyTourLead, User } from '@/models'
import { resolveUser } from '@/lib/userHelper'
import { ensurePropertyToursSchema } from '@/lib/database/migratePropertyTours'
import {
  buildPublicDemoPropertyTourDTO,
  isPublicDemoTourSlug,
} from '@/lib/propertyTours/hostingPolicy'
import type { PropertyLeadInquiryType } from '@/models/PropertyTourLead'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function notifyAgentOfLead(args: {
  tour: PropertyTour
  lead: PropertyTourLead
}): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (!resendKey) return

  let recipient = args.tour.branding?.agentEmail?.trim() || ''
  if (!recipient) {
    const owner = await User.findByPk(args.tour.user_id).catch(() => null)
    recipient = owner?.email || ''
  }
  if (!recipient) return

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || 'SceneFlow AI Studio <noreply@sfai.studio>'
  const agency = args.tour.branding?.agencyName || 'Property Tour Lead'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      reply_to: args.lead.buyer_email,
      subject: `[${agency}] New Buyer Inquiry: ${args.tour.title}`,
      text: [
        `New buyer inquiry from your Interactive Property Tour: ${args.tour.title}`,
        `Name: ${args.lead.buyer_name}`,
        `Email: ${args.lead.buyer_email}`,
        args.lead.buyer_phone ? `Phone: ${args.lead.buyer_phone}` : null,
        `Inquiry Type: ${args.lead.inquiry_type}`,
        args.lead.selected_room_name ? `Viewing Room: ${args.lead.selected_room_name}` : null,
        args.lead.selected_style ? `Selected Design Vision: ${args.lead.selected_style}` : null,
        args.lead.message ? `Message: ${args.lead.message}` : null,
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

    // Built-in public demo slugs always resolve instantaneously with zero login & zero DB dependency
    if (isPublicDemoTourSlug(slug)) {
      return NextResponse.json(
        { tour: buildPublicDemoPropertyTourDTO(slug) },
        {
          status: 200,
          headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        }
      )
    }

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
      // Verify previewer is the tour owner
      const session = (await getServerSession(authOptions as any)) as {
        user?: { id?: string; email?: string | null }
      } | null
      const rawId = session?.user?.id || session?.user?.email
      const user = rawId ? await resolveUser(rawId).catch(() => null) : null
      if (!user || user.id !== tour.user_id) {
        return NextResponse.json({ error: 'Tour not published' }, { status: 404 })
      }
    } else if (!wantsPreview) {
      // Increment public view counter non-blockingly
      void PropertyTour.increment('view_count', { by: 1, where: { id: tour.id } }).catch(() => {})
    }

    return NextResponse.json(
      { tour: tour.toDTO() },
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

    // Allow interactive buyer lead capture testing on built-in public demo without DB dependency
    if (isPublicDemoTourSlug(slug)) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>
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
      return NextResponse.json(
        {
          success: true,
          leadId: `demo-${crypto.randomUUID().slice(0, 8)}`,
          demoMode: true,
          message:
            'Demo inquiry received! In a published agency tour, this lead is saved to your dashboard and emailed directly to your listing advisor.',
        },
        { status: 201 }
      )
    }

    await ensurePropertyToursSchema()

    const tour = await PropertyTour.findOne({ where: { slug } })
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
    }

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

    const lead = await PropertyTourLead.create({
      id: crypto.randomUUID(),
      tour_id: tour.id,
      owner_user_id: tour.user_id,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: typeof body.buyerPhone === 'string' ? body.buyerPhone.trim().slice(0, 64) || null : null,
      inquiry_type: inquiryType,
      selected_room_name:
        typeof body.selectedRoomName === 'string'
          ? body.selectedRoomName.trim().slice(0, 120) || null
          : null,
      selected_style:
        typeof body.selectedStyle === 'string'
          ? body.selectedStyle.trim().slice(0, 64) || null
          : null,
      message: typeof body.message === 'string' ? body.message.trim().slice(0, 2000) || null : null,
      referrer_url: request.headers.get('referer')?.slice(0, 500) || null,
    })

    await PropertyTour.increment('lead_count', { by: 1, where: { id: tour.id } }).catch(() => {})

    try {
      const nextServer = await import('next/server')
      if (typeof nextServer.after === 'function') {
        nextServer.after(async () => {
          await notifyAgentOfLead({ tour, lead })
        })
      } else {
        void notifyAgentOfLead({ tour, lead })
      }
    } catch {
      void notifyAgentOfLead({ tour, lead })
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
