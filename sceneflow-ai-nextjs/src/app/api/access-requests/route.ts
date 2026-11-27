import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveUser } from '@/lib/userHelper'
import {
  getUserAccessRequests,
  submitPrelaunchAccessRequest,
  type AccessRequestType,
  type PrelaunchAccessRequestRecord,
} from '@/lib/admin/accessControlService'
import {
  getPrelaunchTierPreset,
  isPrelaunchAccessModeEnabled,
} from '@/lib/billing/prelaunchAccess'

async function sendPrelaunchRequestNotifications(
  saved: PrelaunchAccessRequestRecord,
  source?: string | null
): Promise<void> {
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return
  const resendKey = process.env.RESEND_API_KEY?.trim()
  if (!resendKey) return

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || 'SceneFlow AI Studio <noreply@sfai.studio>'
  const adminRecipient =
    process.env.CREDIT_AUDIT_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_ALERT_EMAIL?.trim() ||
    'brian@sceneflowai.studio'
  const preset = getPrelaunchTierPreset(saved.requested_tier)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://sceneflowai.studio').replace(/\/$/, '')

  // 1. Notify admin immediately with one-click review link
  const adminSubject =
    saved.request_type === 'additional_credits'
      ? `[SceneFlow Pre-Launch] Additional Credits Request: ${saved.email}`
      : `[SceneFlow Pre-Launch] New Access Request: ${saved.email} (${preset.id})`

  const adminText = [
    `New Pre-Launch ${saved.request_type === 'additional_credits' ? 'Credits' : 'Access'} Request`,
    `Email: ${saved.email}`,
    saved.full_name ? `Name: ${saved.full_name}` : null,
    saved.company_name ? `Company: ${saved.company_name}` : null,
    saved.use_case ? `Use Case: ${saved.use_case}` : null,
    `Requested Tier: ${preset.label}`,
    saved.requested_credits != null ? `Requested Credits: ${saved.requested_credits.toLocaleString()}` : null,
    source ? `Source: ${source}` : null,
    saved.project_details ? `Project Details: ${saved.project_details}` : null,
    '',
    `Review & approve: ${appUrl}/admin/access`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminRecipient.split(',').map((e) => e.trim()).filter(Boolean),
      reply_to: saved.email,
      subject: adminSubject,
      text: adminText,
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch((err) => {
    console.warn('[Access Requests] Admin Resend notification failed:', err)
  })

  // 2. Send clean receipt confirmation to the requester (initial access only)
  if (saved.request_type === 'initial_access') {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [saved.email],
        subject: 'We received your SceneFlow AI Studio Pre-Launch Access request',
        text: [
          `Hi${saved.full_name ? ` ${saved.full_name}` : ''},`,
          '',
          'Thank you for requesting Pre-Launch Access to SceneFlow AI Studio!',
          '',
          `Requested Tier: ${preset.label}`,
          `No payment is collected today. Our team reviews requests daily and will activate your workspace and credits directly on ${saved.email}.`,
          '',
          `You can create your free account anytime at ${appUrl}/login?mode=signup so your approved access attaches automatically.`,
          '',
          '— The SceneFlow AI Studio Team',
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(8_000),
    }).catch((err) => {
      console.warn('[Access Requests] Requester confirmation email failed:', err)
    })
  }
}

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

    // Silently ignore obvious bot honeypot submissions
    if (typeof body?.website === 'string' && body.website.trim().length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Your pre-launch Studio access request has been submitted for admin review.',
      })
    }

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

    // Flush admin & requester Resend emails after response using Next.js after() when available
    try {
      const nextServer = await import('next/server')
      if (typeof nextServer.after === 'function') {
        nextServer.after(async () => {
          await sendPrelaunchRequestNotifications(saved, body?.source ?? null)
        })
      } else {
        void sendPrelaunchRequestNotifications(saved, body?.source ?? null)
      }
    } catch {
      void sendPrelaunchRequestNotifications(saved, body?.source ?? null)
    }

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
