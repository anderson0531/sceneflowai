import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import {
  listCanaryOverrides,
  setCanaryOverride,
  type CanaryMode,
  type CanarySurface,
} from '@/lib/models/canaryOverrideStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }
  return NextResponse.json({ overrides: listCanaryOverrides() })
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession()
  if (!session.authorized) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const surface = body?.surface as CanarySurface
  const mode = (body?.mode || 'off') as CanaryMode
  const candidateModelId = typeof body?.candidateModelId === 'string' ? body.candidateModelId : ''
  const provider = body?.provider === 'vertex' || body?.provider === 'ai_gateway' ? body.provider : 'auto'
  const percent = Number(body?.percent ?? 0)
  const note = typeof body?.note === 'string' ? body.note : undefined

  try {
    const updated = setCanaryOverride({
      surface,
      mode,
      candidateModelId,
      provider,
      percent,
      updatedBy: session.email || 'admin',
      note,
    })
    return NextResponse.json({ updated, overrides: listCanaryOverrides() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid canary override' },
      { status: 400 }
    )
  }
}
