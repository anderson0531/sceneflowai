import { NextRequest, NextResponse } from 'next/server'
import { resolveActiveIntakeSession } from '@/lib/intake/intakeService'
import { getLatestCustomerConsent } from '@/lib/producer/producerProfileService'
import { INTAKE_PLAYBOOKS } from '@/lib/intake/intakePlaybooks'
import { resolveClientPortalLocale } from '@/lib/intake/clientPortalCopy'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const resolved = await resolveActiveIntakeSession(token)
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: 'Intake link not found or expired' },
        { status: 404 }
      )
    }

    const { session, payload } = resolved
    const consent = await getLatestCustomerConsent(session.id)
    const langOverride = req.nextUrl.searchParams.get('lang')
    const activeLocale = langOverride
      ? resolveClientPortalLocale(langOverride)
      : payload.locale

    const playbook = INTAKE_PLAYBOOKS[payload.vertical]
    const localizedTurns =
      payload.customerTurnsUsed === 0 && langOverride
        ? [
            {
              role: 'assistant' as const,
              content: playbook.welcomeByLocale[activeLocale] || playbook.welcomeByLocale.en,
              createdAt: payload.turns[0]?.createdAt || new Date().toISOString(),
            },
          ]
        : payload.turns

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      vertical: payload.vertical,
      mode: payload.mode,
      locale: activeLocale,
      brandProfile: payload.brandProfileSnapshot,
      consentAccepted: Boolean(consent),
      customerName: consent?.customer_name || null,
      customerTurnsUsed: payload.customerTurnsUsed,
      maxCustomerTurns: payload.maxCustomerTurns,
      turns: localizedTurns,
      resonatingBeats: Array.isArray(payload.resonatingBeats) ? payload.resonatingBeats : [],
      completed: Boolean(payload.completedAt || session.status === 'closed'),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load intake session'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
