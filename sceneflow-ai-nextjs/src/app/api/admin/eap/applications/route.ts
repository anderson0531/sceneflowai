import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { listEapApplications } from '@/lib/early-access/applications'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const status = (params.get('status') || 'all') as any
  const search = params.get('search') || ''
  const page = Number(params.get('page') || '1')
  const limit = Number(params.get('limit') || '25')
  const sort = (params.get('sort') || 'newest') as any

  try {
    const result = await listEapApplications({ status, search, page, limit, sort })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[Admin EAP Applications] Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load applications' }, { status: 500 })
  }
}
