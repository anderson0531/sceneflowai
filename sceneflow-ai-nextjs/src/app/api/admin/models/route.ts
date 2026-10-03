import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { listModelRegistry } from '@/lib/models/modelRegistry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }
  return NextResponse.json({ entries: listModelRegistry() })
}
