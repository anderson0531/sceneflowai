import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { getResendFromEmail } from '@/lib/email/resendClient'
import { normalizeWaitlistEmail, readWaitlistRecord } from '@/lib/email/waitlistConfirm'
import {
  listWaitlistRecords,
  markLaunchNotified,
  readLaunchCampaign,
  resendWaitlistConfirmation,
  selectLaunchBatch,
  sendLaunchNotification,
} from '@/lib/email/waitlistAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type WaitlistAction = 'test-launch' | 'resend-confirm' | 'send-launch' | 'send-launch-all'

function isAction(value: unknown): value is WaitlistAction {
  return (
    value === 'test-launch' ||
    value === 'resend-confirm' ||
    value === 'send-launch' ||
    value === 'send-launch-all'
  )
}

export async function POST(request: Request) {
  const { authorized, email: adminEmail } = await requireAdminSession()
  if (!authorized || !adminEmail) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  let body: { action?: unknown; email?: unknown; dryRun?: unknown; cursor?: unknown }
  try {
    body = (await request.json()) as {
      action?: unknown
      email?: unknown
      dryRun?: unknown
      cursor?: unknown
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!isAction(body.action)) {
    return NextResponse.json({ error: 'Unknown waitlist action.' }, { status: 400 })
  }

  const targetEmail = typeof body.email === 'string' ? normalizeWaitlistEmail(body.email) : ''
  const dryRun = body.dryRun === true
  const cursor = typeof body.cursor === 'string' ? body.cursor : undefined

  try {
    if (body.action === 'test-launch') {
      const campaign = await readLaunchCampaign()
      if (!dryRun) {
        await sendLaunchNotification(adminEmail, campaign)
      }
      return NextResponse.json({
        ok: true,
        action: body.action,
        dryRun,
        from: getResendFromEmail(),
        sent: dryRun ? 0 : 1,
        to: adminEmail,
      })
    }

    if (body.action === 'resend-confirm') {
      if (!targetEmail) {
        return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
      }
      const record = await readWaitlistRecord(targetEmail)
      if (!record) {
        return NextResponse.json({ error: 'Waitlist record not found.' }, { status: 404 })
      }
      if (record.unsubscribedAt) {
        return NextResponse.json({
          ok: true,
          action: body.action,
          skipped: 1,
          reason: 'unsubscribed',
        })
      }
      if (record.status === 'confirmed') {
        return NextResponse.json({
          ok: true,
          action: body.action,
          skipped: 1,
          reason: 'already_confirmed',
        })
      }
      if (!dryRun) {
        await resendWaitlistConfirmation(record)
      }
      return NextResponse.json({
        ok: true,
        action: body.action,
        dryRun,
        sent: dryRun ? 0 : 1,
        email: record.email,
      })
    }

    const records = await listWaitlistRecords()
    const batch = selectLaunchBatch(records, {
      email: body.action === 'send-launch' ? targetEmail : undefined,
      cursor: body.action === 'send-launch-all' ? cursor : undefined,
    })

    if (body.action === 'send-launch' && !targetEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (body.action === 'send-launch' && targetEmail && batch.recipients.length === 0) {
      const existing = records.find((record) => record.email === targetEmail)
      return NextResponse.json({
        ok: true,
        action: body.action,
        dryRun,
        sent: 0,
        skipped: 1,
        remaining: 0,
        reason: !existing
          ? 'not_found'
          : existing.unsubscribedAt
            ? 'unsubscribed'
            : existing.status !== 'confirmed'
              ? 'pending'
              : 'already_notified',
      })
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        action: body.action,
        dryRun: true,
        from: getResendFromEmail(),
        sent: 0,
        skipped: batch.skipped,
        remaining: batch.remaining,
        cursor: batch.nextCursor,
        recipients: batch.recipients.map((record) => record.email),
      })
    }

    const campaign = await readLaunchCampaign()
    const sent: string[] = []
    const failed: { email: string; error: string }[] = []

    for (const record of batch.recipients) {
      try {
        await sendLaunchNotification(record.email, campaign)
        await markLaunchNotified(record)
        sent.push(record.email)
      } catch (error) {
        failed.push({
          email: record.email,
          error: error instanceof Error ? error.message : 'Send failed',
        })
      }
    }

    return NextResponse.json({
      ok: failed.length === 0,
      action: body.action,
      dryRun: false,
      from: getResendFromEmail(),
      sent: sent.length,
      skipped: batch.skipped,
      remaining: batch.remaining,
      cursor: batch.nextCursor,
      emails: sent,
      failed,
    })
  } catch (error) {
    console.error('[admin/waitlist/actions] failed', error)
    return NextResponse.json(
      { error: 'Could not complete the waitlist action.' },
      { status: 502 }
    )
  }
}
