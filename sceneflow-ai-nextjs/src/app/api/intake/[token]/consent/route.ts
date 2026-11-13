import { NextRequest, NextResponse } from 'next/server'
import { resolveActiveIntakeSession } from '@/lib/intake/intakeService'
import { recordCustomerConsent } from '@/lib/producer/producerProfileService'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

function getRequestIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || null
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const resolved = await resolveActiveIntakeSession(token)
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Intake link not found or expired' },
        { status: 404 }
      )
    }

    const body = await req.json().catch(() => ({}))
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record consent'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
