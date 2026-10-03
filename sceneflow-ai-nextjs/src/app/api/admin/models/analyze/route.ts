import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { fetchModelCatalogs } from '@/lib/models/fetchModelCatalogs'
import { listModelRegistry } from '@/lib/models/modelRegistry'
import { analyzeModelReleases } from '@/lib/models/modelReleaseAnalyzer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const entries = listModelRegistry()
  const catalogs = await fetchModelCatalogs()
  const recommendations = analyzeModelReleases(entries, catalogs)
  return NextResponse.json({ entries, catalogs, recommendations })
}
