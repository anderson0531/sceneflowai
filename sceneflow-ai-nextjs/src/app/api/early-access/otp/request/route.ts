import { NextRequest, NextResponse } from 'next/server'
import { requestEmailOtp } from '@/lib/early-access/otp'

export const runtime = 'nodejs'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string }
    const email = normalizeText(body.email).toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }

    await requestEmailOtp(email)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[EAP OTP Request] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to request verification code.' }, { status: 400 })
  }
}
