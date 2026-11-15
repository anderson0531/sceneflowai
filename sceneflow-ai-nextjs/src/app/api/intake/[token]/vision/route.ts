import { NextRequest, NextResponse } from 'next/server'
import {
  clarifyCustomerIntakeVision,
  confirmCustomerIntakeVision,
  reopenCustomerIntakeVision,
} from '@/lib/intake/intakeService'

export const runtime = 'nodejs'
export const maxDuration = 60

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'clarify').toLowerCase()
    const locale = body.locale ? String(body.locale) : undefined

    if (action === 'confirm') {
      const result = await confirmCustomerIntakeVision({ token, locale })
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        phase: result.phase,
        visionProposal: result.visionProposal,
        turns: result.turns,
      })
    }

    if (action === 'reopen') {
      const result = await reopenCustomerIntakeVision({ token })
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: result.status }
        )
      }
      return NextResponse.json({
        success: true,
        phase: result.phase,
        visionProposal: result.visionProposal || null,
      })
    }

    const result = await clarifyCustomerIntakeVision({
      token,
      message: String(body.message || ''),
      locale,
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      )
    }

    return NextResponse.json({
      success: true,
      phase: result.phase,
      visionProposal: result.visionProposal,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process project vision'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
