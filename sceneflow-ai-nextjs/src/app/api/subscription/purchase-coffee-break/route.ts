import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SubscriptionService } from '../../../../services/SubscriptionService'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // 2. Check if user already purchased Coffee Break
    const canPurchase = await SubscriptionService.canPurchaseOneTimeTier(userId, 'coffee_break')
    if (!canPurchase) {
      return NextResponse.json({ 
        error: 'Already purchased',
        message: 'Coffee Break can only be purchased once per account'
      }, { status: 400 })
    }
    
    // 3. Process $5 payment via Paddle
    // TODO: Paddle integration - placeholder until base app is completed
    if (!process.env.PADDLE_VENDOR_ID || !process.env.PADDLE_API_KEY) {
      // In development/demo mode, grant credits directly
      if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
        await SubscriptionService.grantOneTimeTier(userId, 'coffee_break')
        return NextResponse.json({ 
          success: true,
          message: 'Coffee Break credits granted (demo mode)',
          redirectUrl: '/dashboard?coffee_break=success'
        })
      }
      
      return NextResponse.json({ 
        error: 'Payment processing not configured',
        message: 'Paddle payment integration coming soon. Please contact support.'
      }, { status: 500 })
    }
    
    // Production: Create Paddle checkout session
    // TODO: Implement Paddle Checkout API
    // Reference: https://developer.paddle.com/api-reference/checkout-api/overview
    /*
    const paddleCheckout = await createPaddleCheckout({
      vendor_id: process.env.PADDLE_VENDOR_ID,
      product_id: process.env.PADDLE_COFFEE_BREAK_PRODUCT_ID,
      customer_email: session.user.email,
      passthrough: JSON.stringify({
        userId,
        tierName: 'coffee_break'
      }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?coffee_break=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`
    })
    
    return NextResponse.json({ 
      success: true,
      checkoutUrl: paddleCheckout.url
    })
    */
    
    // Temporary placeholder response
    return NextResponse.json({ 
      error: 'Payment integration pending',
      message: 'Paddle integration is being finalized. Please try again soon.'
    }, { status: 503 })
  } catch (error: any) {
    console.error('[Coffee Break Purchase] Error:', error)
    return NextResponse.json({ 
      error: 'Purchase failed',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}
