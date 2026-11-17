import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveUser } from '@/lib/userHelper'
import {
  getUserAccessRequests,
  submitPrelaunchAccessRequest,
  type AccessRequestType,
} from '@/lib/admin/accessControlService'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null

    if (!session?.user?.email && !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let resolvedUserId: string | null = null
    let resolvedEmail = session.user.email || ''

    if (session.user.id) {
      try {
        const user = await resolveUser(session.user.id)
        resolvedUserId = user.id
        resolvedEmail = user.email || resolvedEmail
      } catch {
        // Fallback to session email if DB user lookup fails
      }
    }

    const requests = await getUserAccessRequests(resolvedEmail, resolvedUserId)

    return NextResponse.json({
      success: true,
      prelaunchOnly: isPrelaunchAccessModeEnabled(),
      requests,
    })
  } catch (error: any) {
    console.error('[Access Requests GET] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load access requests',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null; name?: string | null }
    } | null

    const body = await req.json().catch(() => ({}))

    let resolvedUserId: string | null = null
    let resolvedEmail: string = (body?.email || session?.user?.email || '').trim()
    let resolvedName: string | null =
      (body?.fullName || session?.user?.name || '').trim() || null

    if (session?.user?.id) {
      try {
        const user = await resolveUser(session.user.id)
        resolvedUserId = user.id
        resolvedEmail = user.email || resolvedEmail
        if (!resolvedName) {
          const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
          resolvedName = full || user.username || null
        }
      } catch {
        // Continue with session/body fields
      }
    }

    if (!resolvedEmail) {
      return NextResponse.json(
        { error: 'Email required', message: 'Please provide your email address.' },
        { status: 400 }
      )
    }

    const requestType: AccessRequestType =
      body?.requestType === 'additional_credits' ? 'additional_credits' : 'initial_access'

    const saved = await submitPrelaunchAccessRequest({
      email: resolvedEmail,
      userId: resolvedUserId,
      fullName: resolvedName,
      companyName: body?.companyName ?? null,
      useCase: body?.useCase ?? null,
      requestedTier: body?.requestedTier ?? 'explorer',
      requestedCredits:
        body?.requestedCredits !== undefined && body?.requestedCredits !== null && body?.requestedCredits !== ''
          ? Number(body.requestedCredits)
          : null,
      projectDetails: body?.projectDetails ?? null,
      requestType,
    })

    return NextResponse.json({
      success: true,
      request: saved,
      message:
        requestType === 'additional_credits'
          ? 'Your credit request has been submitted for admin review.'
          : 'Your pre-launch Studio access request has been submitted for admin review.',
    })
  } catch (error: any) {
    console.error('[Access Requests POST] Error:', error)
    const isValidation = error?.message?.includes('valid email')
    return NextResponse.json(
      {
        error: isValidation ? 'Invalid email' : 'Failed to submit request',
        message: error?.message || 'Unexpected error submitting access request',
      },
      { status: isValidation ? 400 : 500 }
    )
  }
}
