import { NextRequest, NextResponse } from 'next/server'
import { completeClientIntakeToBlueprint } from '@/lib/intake/intakeService'

export const runtime = 'nodejs'
export const maxDuration = 120

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const result = await completeClientIntakeToBlueprint({ token })
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      title: result.title,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete intake'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
