import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { createClientIntakeLink } from '@/lib/intake/intakeService'
import { isValidIntakeVertical } from '@/lib/intake/intakePlaybooks'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const vertical = body.vertical || 'video_memoir'
    if (!isValidIntakeVertical(vertical)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vertical. Expected video_memoir, real_estate_tour, education_module, or brand_story.' },
        { status: 400 }
      )
    }

    let billingOwnerUserId = actorUserId
    if (typeof body.projectId === 'string' && body.projectId.trim()) {
      const access = await assertProjectAccess(body.projectId.trim(), actorUserId)
      if (!access.ok) {
        return NextResponse.json({ success: false, error: access.error }, { status: access.status })
      }
      billingOwnerUserId = access.billingOwnerUserId || actorUserId
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    const created = await createClientIntakeLink({
      ownerUserId: billingOwnerUserId,
      ownerDisplayName: (session?.user as { name?: string })?.name || 'Studio Producer',
      projectId: body.projectId || null,
      vertical,
      mode: body.mode === 'public_lead' ? 'public_lead' : 'single_project',
      locale: body.locale,
      maxCustomerTurns: body.maxCustomerTurns,
      maxFeedbackRounds: body.maxFeedbackRounds,
      clientPriceUsd:
        typeof body.clientPriceUsd === 'number' ? body.clientPriceUsd : undefined,
      creditBudgetCap:
        typeof body.creditBudgetCap === 'number' ? body.creditBudgetCap : undefined,
      customerLabel: body.customerLabel,
      expiresInDays: body.expiresInDays,
      origin,
    })

    return NextResponse.json({
      success: true,
      shareUrl: created.hostedUrl,
      ...created,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create intake link'
    const status = message.startsWith('COMMERCIAL_ADDENDUM_REQUIRED') ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
