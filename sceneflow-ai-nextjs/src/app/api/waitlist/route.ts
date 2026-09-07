import { NextResponse } from 'next/server'
import {
  buildConfirmUrl,
  isWithinResendCooldown,
  normalizeWaitlistEmail,
  readWaitlistRecord,
  sendWaitlistConfirmation,
  writeWaitlistRecord,
  type WaitlistRecord,
} from '@/lib/email/waitlistConfirm'
import { hasPrivateBlobToken } from '@/lib/storage/privateBlob'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_SOURCE_LENGTH = 64

export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown }
  try {
    body = (await request.json()) as { email?: unknown; source?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawEmail = typeof body.email === 'string' ? body.email : ''
  const email = normalizeWaitlistEmail(rawEmail)

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const source =
    typeof body.source === 'string' ? body.source.slice(0, MAX_SOURCE_LENGTH) : 'landing'
  const now = Date.now()

  let existing: WaitlistRecord | null = null
  try {
    existing = await readWaitlistRecord(email)
  } catch (error) {
    console.error('[waitlist] failed to read signup', error)
    return NextResponse.json(
      { error: 'Could not save your email right now. Try again shortly.' },
      { status: 502 }
    )
  }

  if (existing?.status === 'confirmed') {
    return NextResponse.json({ ok: true, stored: hasPrivateBlobToken() })
  }

  if (isWithinResendCooldown(existing?.lastSentAt, now)) {
    return NextResponse.json({ ok: true, stored: hasPrivateBlobToken() })
  }

  const pending: WaitlistRecord = {
    email,
    source: existing?.source ?? source,
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    status: 'pending',
    lastSentAt: existing?.lastSentAt,
  }

  try {
    await writeWaitlistRecord(pending)
  } catch (error) {
    console.error('[waitlist] failed to persist signup', error)
    return NextResponse.json(
      { error: 'Could not save your email right now. Try again shortly.' },
      { status: 502 }
    )
  }

  const { url } = buildConfirmUrl(email, now)

  try {
    await sendWaitlistConfirmation(email, url)
  } catch (error) {
    console.error('[waitlist] failed to send confirmation', error)
    // Signup is already persisted. Do not 502 the visitor — they are on the list.
    return NextResponse.json({
      ok: true,
      stored: hasPrivateBlobToken(),
      emailed: false,
    })
  }

  try {
    await writeWaitlistRecord({
      ...pending,
      lastSentAt: new Date(now).toISOString(),
    })
  } catch (error) {
    console.error('[waitlist] confirmation sent but persist of lastSentAt failed', error)
  }

  return NextResponse.json({ ok: true, stored: hasPrivateBlobToken(), emailed: true })
}
