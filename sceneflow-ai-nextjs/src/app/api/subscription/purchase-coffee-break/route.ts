import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SubscriptionService } from '../../../../services/SubscriptionService'

// Paddle Checkout API
// Reference: https://developer.paddle.com/api-reference/transactions/create-transaction

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    const userEmail = session.user.email
    
    // 2. Check if user already purchased Coffee Break
    const canPurchase = await SubscriptionService.canPurchaseOneTimeTier(userId, 'coffee_break')
    if (!canPurchase) {
      return NextResponse.json({ 
        error: 'Already purchased',
        message: 'Coffee Break can only be purchased once per account'
      }, { status: 400 })
    }
    
    // 3. Get Paddle configuration
    const sellerId = process.env.PADDLE_SELLER_ID
    const apiKey = process.env.PADDLE_API_KEY
    const priceId = process.env.PADDLE_COFFEE_BREAK_PRICE_ID
    const environment = process.env.PADDLE_ENVIRONMENT || 'production'
    
    if (!sellerId || !apiKey || !priceId) {
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
    
    // Production: Return Paddle checkout configuration for client-side Paddle.js
    // The frontend will use Paddle.Checkout.open() with these details
    const paddleConfig = {
      priceId,
      customData: {
        user_id: userId,
        tier_name: 'coffee_break'
      },
      customer: {
        email: userEmail
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?coffee_break=success`,
      // Paddle.js will handle the checkout overlay
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en'
      }
    }
    
    return NextResponse.json({ 
      success: true,
      paddleConfig,
      // Also provide direct checkout URL for fallback
      checkoutUrl: `https://${environment === 'sandbox' ? 'sandbox-' : ''}buy.paddle.com/product/${priceId}?custom_data=${encodeURIComponent(JSON.stringify({ user_id: userId, tier_name: 'coffee_break' }))}&customer_email=${encodeURIComponent(userEmail || '')}`
    })
  } catch (error: any) {
    console.error('[Coffee Break Purchase] Error:', error)
    return NextResponse.json({ 
      error: 'Purchase failed',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}
