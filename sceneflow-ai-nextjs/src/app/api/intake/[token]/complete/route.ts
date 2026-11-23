import { NextRequest, NextResponse } from 'next/server'
import { completeClientIntakeToBlueprint } from '@/lib/intake/intakeService'

export const runtime = 'nodejs'
export const maxDuration = 120

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const locale = body?.locale ? String(body.locale) : undefined
    const finalQuickAddNote =
      typeof body?.finalQuickAddNote === 'string' ? body.finalQuickAddNote : undefined
    const selectedCoverageTopics = Array.isArray(body?.selectedCoverageTopics)
      ? body.selectedCoverageTopics.map((s: unknown) => String(s || ''))
      : undefined
    const origin = new URL(req.url).origin
    const result = await completeClientIntakeToBlueprint({
      token,
      locale,
      origin,
      finalQuickAddNote,
      selectedCoverageTopics,
    })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      title: result.title,
      blueprintShareToken: result.blueprintShareToken,
      blueprintShareUrl: result.blueprintShareUrl,
      guestShareUrl: result.guestShareUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete intake'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
