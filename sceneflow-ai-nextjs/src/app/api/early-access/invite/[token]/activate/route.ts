import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/AuthService'
import { User } from '@/models/User'
import {
  findApplicationByInviteToken,
  hashInviteToken,
  isInviteExpired,
} from '@/lib/early-access/invite'
import { upsertEapReview } from '@/lib/early-access/applications'

export const runtime = 'nodejs'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  const data = await findApplicationByInviteToken(token)
  if (!data) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  const { application, review } = data

  if (review.status !== 'approved') {
    return NextResponse.json({ error: 'Invite is no longer valid' }, { status: 410 })
  }

  if (isInviteExpired(review)) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 })
  }

  if (review.inviteTokenHash !== hashInviteToken(token)) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const username = normalizeText(body.username)
  const password = normalizeText(body.password)
  const firstName = normalizeText(body.first_name || body.firstName)
  const lastName = normalizeText(body.last_name || body.lastName)

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const applicationEmail = application.email.trim().toLowerCase()

  let userId: string
  const existingUser = await User.findOne({ where: { email: applicationEmail } })

  if (existingUser) {
    userId = existingUser.id
  } else {
    const result = await AuthService.register({
      email: applicationEmail,
      username,
      password,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
    })

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error || 'Account creation failed' }, { status: 400 })
    }

    userId = result.user.id
  }

  const activatedAt = review.activatedAt || new Date().toISOString()
  const updated = await upsertEapReview(application.applicationId, {
    activatedAt,
  })

  return NextResponse.json({
    success: true,
    userId,
    email: applicationEmail,
    existingAccount: Boolean(existingUser),
    activatedAt,
    review: updated?.review,
  })
}
