import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { put } from '@vercel/blob'
import { getPrivateBlobToken, hasPrivateBlobToken } from '@/lib/storage/privateBlob'

export const runtime = 'nodejs'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_SOURCE_LENGTH = 64

interface WaitlistRecord {
  email: string
  source: string
  createdAt: string
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function blobPath(email: string): string {
  const hash = crypto.createHash('sha256').update(email).digest('hex')
  return `waitlist/launch-november-2026/${hash}.json`
}

export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown }
  try {
    body = (await request.json()) as { email?: unknown; source?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const rawEmail = typeof body.email === 'string' ? body.email : ''
  const email = normalizeEmail(rawEmail)

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const source =
    typeof body.source === 'string' ? body.source.slice(0, MAX_SOURCE_LENGTH) : 'landing'

  const record: WaitlistRecord = {
    email,
    source,
    createdAt: new Date().toISOString(),
  }

  // Blob storage is optional so local and preview environments can exercise the
  // full form without a private store configured.
  if (!hasPrivateBlobToken()) {
    console.info('[waitlist] captured without blob storage', { email, source })
    return NextResponse.json({ ok: true, stored: false })
  }

  try {
    await put(blobPath(email), JSON.stringify(record, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      token: getPrivateBlobToken(),
    })
    return NextResponse.json({ ok: true, stored: true })
  } catch (error) {
    console.error('[waitlist] failed to persist signup', error)
    return NextResponse.json(
      { error: 'Could not save your email right now. Try again shortly.' },
      { status: 502 }
    )
  }
}
