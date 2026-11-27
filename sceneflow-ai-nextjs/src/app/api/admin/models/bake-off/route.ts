import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { runGoldenBakeOff } from '@/lib/models/bakeOffRunner'
import { getGeminiProductModel } from '@/lib/config/modelConfig'
import type { GoldenFixtureCategory } from '@/lib/models/goldenEvalSuite'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

/**
 * POST /api/admin/models/bake-off
 * Runs a live side-by-side Golden-Fixture Bake-Off comparing a baseline pinned model
 * against a candidate model on JSON reliability, latency, Name Novelty, and USD efficiency.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const baselineModelId =
    typeof body?.baselineModelId === 'string' && body.baselineModelId.trim()
      ? body.baselineModelId.trim()
      : getGeminiProductModel('blueprint')
  const candidateModelId =
    typeof body?.candidateModelId === 'string' && body.candidateModelId.trim()
      ? body.candidateModelId.trim()
      : ''

  if (!candidateModelId) {
    return NextResponse.json({ error: 'candidateModelId is required' }, { status: 400 })
  }

  const limit = Math.max(1, Math.min(8, Number(body?.limit) || 3))
  const categories = Array.isArray(body?.categories)
    ? (body.categories as GoldenFixtureCategory[])
    : undefined

  const result = await runGoldenBakeOff({
    baselineModelId,
    candidateModelId,
    categories,
    limit,
  })

  return NextResponse.json(result)
}
