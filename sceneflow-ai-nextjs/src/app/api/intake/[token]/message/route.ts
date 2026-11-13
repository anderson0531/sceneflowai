import { NextRequest, NextResponse } from 'next/server'
import { submitCustomerIntakeTurn } from '@/lib/intake/intakeService'

export const runtime = 'nodejs'
export const maxDuration = 60

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const { token } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const result = await submitCustomerIntakeTurn({
      token,
      message: String(body.message || ''),
      locale: body.locale ? String(body.locale) : undefined,
    })

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      turns: result.turns,
      resonatingBeats: result.resonatingBeats,
      customerTurnsUsed: result.customerTurnsUsed,
      maxCustomerTurns: result.maxCustomerTurns,
      readyToComplete: result.readyToComplete,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process message'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
