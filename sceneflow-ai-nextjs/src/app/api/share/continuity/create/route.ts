import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertProjectAccess, getAuthenticatedUserId } from '@/lib/projectAccess'
import { createOrUpdateContinuityPortalLink } from '@/lib/continuity/continuityPortalService'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const authSession = await getServerSession(authOptions as any).catch(() => null)
    const actorUserId = await getAuthenticatedUserId(req)
    if (!actorUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const projectId = String(body.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    const access = await assertProjectAccess(projectId, actorUserId)
    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status })
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    const created = await createOrUpdateContinuityPortalLink({
      project: access.project,
      ownerUserId: access.billingOwnerUserId || actorUserId,
      ownerDisplayName: (authSession?.user as { name?: string })?.name || 'Studio Producer',
      clientMode: body.clientMode === true,
      allowUploads: body.allowUploads !== false,
      locale: body.locale,
      maxRounds: body.maxRounds,
      clientGroupSlug: body.clientGroupSlug,
      expiresInDays: body.expiresInDays,
      origin,
    })

    return NextResponse.json({
      success: true,
      shareUrl: created.url,
      ...created,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create continuity portal link'
    const status = message.startsWith('COMMERCIAL_ADDENDUM_REQUIRED') ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
