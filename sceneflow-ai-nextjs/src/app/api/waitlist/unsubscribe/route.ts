import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeWaitlistEmail } from '@/lib/email/waitlistConfirm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function readParams(request: NextRequest, body?: { email?: unknown; token?: unknown }) {
  const email =
    (typeof body?.email === 'string' && body.email) || request.nextUrl.searchParams.get('email') || ''
  const token =
    (typeof body?.token === 'string' && body.token) || request.nextUrl.searchParams.get('token') || ''
  return { email, token }
}

async function handleUnsubscribe(request: NextRequest, body?: { email?: unknown; token?: unknown }) {
  const { email, token } = readParams(request, body)
  const result = await unsubscribeWaitlistEmail(email, token)
  if (result === 'invalid') {
    return NextResponse.json({ error: 'That unsubscribe link is not valid.' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, result })
}

export async function GET(request: NextRequest) {
  return handleUnsubscribe(request)
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; token?: unknown } | undefined
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    body = (await request.json().catch(() => ({}))) as { email?: unknown; token?: unknown }
  }
  return handleUnsubscribe(request, body)
}
