import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailOtp } from '@/lib/early-access/otp'

export const runtime = 'nodejs'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; code?: string }
    const email = normalizeText(body.email).toLowerCase()
    const code = normalizeText(body.code)

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 })
    }

    const verificationToken = await verifyEmailOtp(email, code)
    return NextResponse.json({ success: true, verificationToken })
  } catch (error: any) {
    console.error('[EAP OTP Verify] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to verify email.' }, { status: 400 })
  }
}
