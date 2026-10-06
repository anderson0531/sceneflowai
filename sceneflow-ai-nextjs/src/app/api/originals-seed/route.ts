import { NextResponse } from 'next/server'
import {
  buildOriginalsConfirmUrl,
  isWithinOriginalsResendCooldown,
  normalizeSeedEmail,
  readOriginalsSeedRecord,
  sendOriginalsSeedConfirmation,
  writeOriginalsSeedRecord,
  type OriginalsSeedRecord,
} from '@/lib/email/originalsSeed'
import { hasPrivateBlobToken } from '@/lib/storage/privateBlob'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_PATTERN = /^https?:\/\/\S+$/i
const MAX_TEXT = 500
const MAX_LOGLINE = 800
const MAX_SOURCE_LENGTH = 64

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = normalizeSeedEmail(clip(body.email, 320))
  const name = clip(body.name, MAX_TEXT)
  const title = clip(body.title, MAX_TEXT)
  const logline = clip(body.logline, MAX_LOGLINE)
  const audienceUrl = clip(body.audienceUrl, 500)
  const exclusivePremiere = body.exclusivePremiere === true
  const source = clip(body.source, MAX_SOURCE_LENGTH) || 'for-filmmakers'

  if (!email || !name || !title || !logline || !audienceUrl) {
    return NextResponse.json({ error: 'Fill in every field so we can review your pilot.' }, { status: 400 })
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (!URL_PATTERN.test(audienceUrl)) {
    return NextResponse.json({ error: 'Add a public URL for your existing audience.' }, { status: 400 })
  }

  const now = Date.now()

  let existing: OriginalsSeedRecord | null = null
  try {
    existing = await readOriginalsSeedRecord(email)
  } catch (error) {
    console.error('[originals-seed] failed to read application', error)
    return NextResponse.json(
      { error: 'Could not save your application right now. Try again shortly.' },
      { status: 502 }
    )
  }

  if (existing?.status === 'confirmed') {
    const updated: OriginalsSeedRecord = {
      ...existing,
      name,
      title,
      logline,
      audienceUrl,
      exclusivePremiere,
    }
    try {
      await writeOriginalsSeedRecord(updated)
    } catch (error) {
      console.error('[originals-seed] failed to update confirmed application', error)
    }
    return NextResponse.json({ ok: true, stored: hasPrivateBlobToken(), alreadyConfirmed: true })
  }

  if (isWithinOriginalsResendCooldown(existing?.lastSentAt, now)) {
    return NextResponse.json({ ok: true, stored: hasPrivateBlobToken() })
  }

  const pending: OriginalsSeedRecord = {
    email,
    name,
    title,
    logline,
    audienceUrl,
    exclusivePremiere,
    source: existing?.source ?? source,
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    status: 'pending',
    lastSentAt: existing?.lastSentAt,
  }

  try {
    await writeOriginalsSeedRecord(pending)
  } catch (error) {
    console.error('[originals-seed] failed to persist application', error)
    return NextResponse.json(
      { error: 'Could not save your application right now. Try again shortly.' },
      { status: 502 }
    )
  }

  const { url } = buildOriginalsConfirmUrl(email, now)

  try {
    await sendOriginalsSeedConfirmation(email, url)
  } catch (error) {
    console.error('[originals-seed] failed to send confirmation', error)
    return NextResponse.json({
      ok: true,
      stored: hasPrivateBlobToken(),
      emailed: false,
    })
  }

  try {
    await writeOriginalsSeedRecord({
      ...pending,
      lastSentAt: new Date(now).toISOString(),
    })
  } catch (error) {
    console.error('[originals-seed] confirmation sent but persist of lastSentAt failed', error)
  }

  return NextResponse.json({ ok: true, stored: hasPrivateBlobToken(), emailed: true })
}
