import { NextRequest, NextResponse } from 'next/server'
import {
  startExpressBlueprintPassOrder,
  startExpressFilmBalanceOrder,
} from '@/lib/showcase/expressShowcaseService'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      orderKind?: 'express_blueprint_pass' | 'express_film_balance'
      offerId?: string
      customerName?: string
      customerEmail?: string
      honoreeOrTitle?: string
      locale?: string
      blueprintToken?: string
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    const orderKind =
      body.orderKind === 'express_film_balance'
        ? 'express_film_balance'
        : 'express_blueprint_pass'

    if (orderKind === 'express_film_balance') {
      const blueprintToken = String(body.blueprintToken || '').trim()
      if (!blueprintToken) {
        return NextResponse.json(
          { success: false, error: 'blueprintToken is required to unlock your Express 4K Film.' },
          { status: 400 }
        )
      }

      const result = await startExpressFilmBalanceOrder({
        blueprintToken,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        origin,
      })

      return NextResponse.json({
        success: true,
        orderKind,
        ...result,
      })
    }

    const result = await startExpressBlueprintPassOrder({
      offerId: body.offerId || 'family_legacy',
      customerName: String(body.customerName || ''),
      customerEmail: String(body.customerEmail || ''),
      honoreeOrTitle: body.honoreeOrTitle ? String(body.honoreeOrTitle) : undefined,
      locale: body.locale ? String(body.locale) : 'en',
      origin,
    })

    return NextResponse.json({
      success: true,
      orderKind,
      ...result,
    })
  } catch (err: unknown) {
    console.error('[POST /api/showcase/checkout] Error:', err)
    const message = err instanceof Error ? err.message : 'Unable to start Whop checkout'
    const isValidation =
      message.includes('Please enter') ||
      message.includes('not found') ||
      message.includes('Only the primary customer')
    return NextResponse.json(
      { success: false, error: message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
