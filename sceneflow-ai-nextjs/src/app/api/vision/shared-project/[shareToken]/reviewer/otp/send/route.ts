import { NextRequest, NextResponse } from 'next/server'
import { requestReviewerEmailOtp } from '@/lib/email/reviewerOtp'
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
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    await requestReviewerEmailOtp(email)

    return NextResponse.json({ success: true, message: 'Verification code sent' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send verification code'
    console.error('[Reviewer OTP Send]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
