import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId, assertProjectAccess } from '@/lib/projectAccess'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const userId = await getAuthenticatedUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const access = await assertProjectAccess(projectId, userId, body.legacyOwnerId)
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      )
    }

    const nowIso = new Date().toISOString()
    const prevMeta = ((access.project.metadata || {}) as Record<string, unknown>)
    const prevOrder = ((prevMeta.clientOrder || {}) as Record<string, unknown>)

    const nextClientOrder: Record<string, unknown> = {
      ...prevOrder,
      isClientProject: true,
      stage:
        prevOrder.stage === 'blueprint_approved'
          ? 'blueprint_approved'
          : 'awaiting_blueprint_approval',
      actionState:
        prevOrder.stage === 'blueprint_approved'
          ? 'action_required'
          : 'waiting_on_client',
      acceptedAt: prevOrder.acceptedAt || nowIso,
      blueprintSharedAt: nowIso,
      ...(typeof body.clientPriceUsd === 'number'
        ? { clientPriceUsd: body.clientPriceUsd }
        : {}),
      ...(typeof body.creditsBudget === 'number'
        ? { creditBudgetCap: Math.round(body.creditsBudget) }
        : {}),
    }

    const nextMeta: Record<string, unknown> = {
      ...prevMeta,
      clientOrder: nextClientOrder,
      ...(typeof body.creditsBudget === 'number' && body.creditsBudget > 0
        ? { creditsBudget: Math.round(body.creditsBudget) }
        : {}),
      ...(body.creditsBudgetParams && typeof body.creditsBudgetParams === 'object'
        ? { creditsBudgetParams: body.creditsBudgetParams }
        : {}),
    }

    await access.project.update({ metadata: nextMeta })

    return NextResponse.json({
      success: true,
      clientOrder: nextClientOrder,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to accept project Blueprint'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
