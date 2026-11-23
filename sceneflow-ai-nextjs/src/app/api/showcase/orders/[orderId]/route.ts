import { NextRequest, NextResponse } from 'next/server'
import CollabSession from '@/models/CollabSession'
import { sequelize } from '@/config/database'
import {
  isExpressShowcaseOrderPayload,
  reconcileExpressShowcaseOrderViaWhop,
} from '@/lib/showcase/expressShowcaseService'
import { getShowcaseOfferById } from '@/config/showcase/expressCinemaCatalog'

export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ orderId: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const { orderId } = await ctx.params
    const shouldReconcile = req.nextUrl.searchParams.get('checkout') === 'success'

    await sequelize.authenticate()
    let order = shouldReconcile
      ? await reconcileExpressShowcaseOrderViaWhop(orderId)
      : null

    if (!order) {
      const session = await CollabSession.findOne({ where: { token: orderId } })
      if (!session || !isExpressShowcaseOrderPayload(session.payload)) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }
      order = session.payload
    }

    const offer = getShowcaseOfferById(order.offerId)

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        orderKind: order.orderKind,
        status: order.status,
        offerId: order.offerId,
        offerTitle: offer.title,
        locale: order.locale || 'en',
        customerName: order.customerName,
        honoreeOrTitle: order.honoreeOrTitle || null,
        amountUsd: order.amountUsd,
        totalPriceUsd: order.totalPriceUsd,
        balanceDueUsd: order.balanceDueUsd,
        intakeUrl: order.intakeUrl || null,
        continuityUrl: order.continuityUrl || null,
        whopPurchaseUrl: order.status === 'pending_payment' ? order.whopPurchaseUrl || null : null,
        paidAt: order.paidAt || null,
        fulfilledAt: order.fulfilledAt || null,
      },
    })
  } catch (err: unknown) {
    console.error('[GET /api/showcase/orders/[orderId]] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to load order status'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
