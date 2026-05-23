import { NextRequest, NextResponse } from 'next/server'
import { verifyReviewerEmailOtp } from '@/lib/email/reviewerOtp'
import { findActiveShareProject } from '@/lib/storyboard/shareProjectLookup'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params
    if (!shareToken) {
      return NextResponse.json({ error: 'Share token required' }, { status: 400 })
    }

    const project = await findActiveShareProject(shareToken)
    if (!project) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }

    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 })
    }

    const verificationToken = await verifyReviewerEmailOtp(email, code)

    return NextResponse.json({ success: true, verificationToken })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    console.error('[Reviewer OTP Verify]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
