import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import {
  adminDeclineAccessRequest,
  adminGrantUserAccessAndCredits,
  adminRevokeUserAccess,
  getAdminAccessDashboardData,
  type AdminCreditMode,
} from '@/lib/admin/accessControlService'
import { isPrelaunchAccessModeEnabled } from '@/lib/billing/prelaunchAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminSession()
    if (!admin.authorized || !admin.email) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const requestStatus = searchParams.get('status') || 'all'
    const userFilter = searchParams.get('userFilter') || 'all'
    const search = searchParams.get('q') || ''
    const limit = Number(searchParams.get('limit') || '100')

    const data = await getAdminAccessDashboardData({
      requestStatus,
      userFilter,
      search,
      limit,
    })

    return NextResponse.json({
      success: true,
      adminEmail: admin.email,
      prelaunchOnly: isPrelaunchAccessModeEnabled(),
      ...data,
    })
  } catch (error: any) {
    console.error('[Admin Access GET] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load admin access data',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminSession()
    if (!admin.authorized || !admin.email) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || '').trim().toLowerCase()

    if (action === 'approve' || action === 'grant') {
      const credits = Number(body?.credits ?? 0)
      if (!Number.isFinite(credits) || credits < 0) {
        return NextResponse.json(
          { error: 'Invalid credits', message: 'Credits must be a non-negative number.' },
          { status: 400 }
        )
      }

      const creditMode: AdminCreditMode =
        body?.creditMode === 'add'
          ? 'add'
          : body?.creditMode === 'keep'
            ? 'keep'
            : 'set'

      const result = await adminGrantUserAccessAndCredits({
        requestId: body?.requestId || null,
        targetEmailOrUserId: body?.targetEmailOrUserId || body?.email || body?.userId || null,
        tierName: body?.tierName || null,
        credits,
        creditMode,
        durationDays: body?.durationDays ? Number(body.durationDays) : undefined,
        adminEmail: admin.email,
        adminNotes: body?.adminNotes || null,
      })

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    if (action === 'set-credits' || action === 'add-credits') {
      const target = String(body?.targetEmailOrUserId || body?.email || body?.userId || '').trim()
      if (!target) {
        return NextResponse.json(
          { error: 'Missing target', message: 'targetEmailOrUserId is required.' },
          { status: 400 }
        )
      }
      const credits = Number(body?.credits ?? 0)
      if (!Number.isFinite(credits) || credits < 0) {
        return NextResponse.json(
          { error: 'Invalid credits', message: 'Credits must be a non-negative number.' },
          { status: 400 }
        )
      }

      const result = await adminGrantUserAccessAndCredits({
        targetEmailOrUserId: target,
        tierName: 'keep',
        credits,
        creditMode: action === 'add-credits' ? 'add' : 'set',
        adminEmail: admin.email,
        adminNotes: body?.adminNotes || null,
      })

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    if (action === 'decline') {
      const requestId = String(body?.requestId || '').trim()
      if (!requestId) {
        return NextResponse.json(
          { error: 'Missing requestId', message: 'requestId is required.' },
          { status: 400 }
        )
      }

      const result = await adminDeclineAccessRequest({
        requestId,
        adminEmail: admin.email,
        adminNotes: body?.adminNotes || null,
      })

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    if (action === 'revoke') {
      const target = String(body?.targetEmailOrUserId || body?.email || body?.userId || '').trim()
      if (!target) {
        return NextResponse.json(
          { error: 'Missing target', message: 'targetEmailOrUserId is required.' },
          { status: 400 }
        )
      }

      const result = await adminRevokeUserAccess({
        targetEmailOrUserId: target,
        clearCredits: Boolean(body?.clearCredits),
        adminEmail: admin.email,
        adminNotes: body?.adminNotes || null,
      })

      return NextResponse.json({
        success: true,
        ...result,
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        message: 'Supported actions: approve, grant, set-credits, add-credits, decline, revoke',
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[Admin Access POST] Error:', error)
    return NextResponse.json(
      {
        error: 'Admin action failed',
        message: error?.message || 'Unexpected error',
      },
      { status: 500 }
    )
  }
}
