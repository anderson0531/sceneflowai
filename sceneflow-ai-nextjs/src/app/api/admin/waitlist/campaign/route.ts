import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { getResendFallbackFromEmail, getResendFromEmail } from '@/lib/email/resendClient'
import {
  buildConfirmationPreview,
  readLaunchCampaign,
  sanitizeLaunchCampaign,
  writeLaunchCampaign,
} from '@/lib/email/waitlistAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { authorized } = await requireAdminSession()
  if (!authorized) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  try {
    const campaign = await readLaunchCampaign()
    return NextResponse.json({
      ok: true,
      from: getResendFromEmail(),
      fallbackFrom: getResendFallbackFromEmail(),
      confirmation: buildConfirmationPreview(),
      campaign,
    })
  } catch (error) {
    console.error('[admin/waitlist/campaign] read failed', error)
    return NextResponse.json({ error: 'Could not load the launch campaign.' }, { status: 502 })
  }
}

export async function PUT(request: Request) {
  const { authorized, email } = await requireAdminSession()
  if (!authorized || !email) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  let body: { subject?: unknown; html?: unknown; text?: unknown }
  try {
    body = (await request.json()) as { subject?: unknown; html?: unknown; text?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  try {
    const campaign = sanitizeLaunchCampaign(
      {
        subject: typeof body.subject === 'string' ? body.subject : undefined,
        html: typeof body.html === 'string' ? body.html : undefined,
        text: typeof body.text === 'string' ? body.text : undefined,
      },
      { updatedBy: email }
    )
    await writeLaunchCampaign(campaign)
    return NextResponse.json({ ok: true, from: getResendFromEmail(), campaign })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save the campaign.'
    const status = message.includes('required') ? 400 : 502
    console.error('[admin/waitlist/campaign] save failed', error)
    return NextResponse.json({ error: message }, { status })
  }
}
