import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionService } from '../../../../services/SubscriptionService'

// TODO: Paddle webhook integration - placeholder until base app is completed
// Reference: https://developer.paddle.com/webhooks/overview

export async function POST(req: NextRequest) {
  try {
    // Verify Paddle webhook signature (important for production)
    const paddlePublicKey = process.env.PADDLE_PUBLIC_KEY
    
    if (!paddlePublicKey) {
      console.warn('[Paddle Webhook] PADDLE_PUBLIC_KEY not configured')
      // In development/demo mode, process webhook without signature verification
      const body = await req.json()
      await processWebhookEvent(body)
      return NextResponse.json({ success: true })
    }
    
    // Production: Verify Paddle webhook signature
    // TODO: Implement Paddle signature verification
    // Reference: https://developer.paddle.com/webhooks/signature-verification
    /*
    const signature = req.headers.get('paddle-signature')
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    
    const body = await req.text()
    
    const isValid = verifyPaddleSignature(body, signature, paddlePublicKey)
    if (!isValid) {
      console.error('[Paddle Webhook] Signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    const event = JSON.parse(body)
    */
    
    const body = await req.json()
    
    // Process the event
    await processWebhookEvent(body)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Paddle Webhook] Error:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      message: error.message 
    }, { status: 500 })
  }
}

async function processWebhookEvent(event: any) {
  // Handle Paddle payment success events
  // TODO: Update event types based on Paddle's webhook events
  // Reference: https://developer.paddle.com/webhooks/event-types
  
  // Paddle uses 'alert_name' for event types
  const eventType = event.alert_name || event.event_type
  
  if (eventType === 'payment_succeeded' || eventType === 'subscription_payment_succeeded') {
    const passthrough = event.passthrough ? JSON.parse(event.passthrough) : {}
    
    if (passthrough.tierName === 'coffee_break' && passthrough.userId) {
      console.log('[Paddle Webhook] Processing Coffee Break purchase for user:', passthrough.userId)
      
      try {
        await SubscriptionService.grantOneTimeTier(passthrough.userId, 'coffee_break')
        console.log('[Paddle Webhook] Coffee Break credits granted successfully')
      } catch (error: any) {
        console.error('[Paddle Webhook] Failed to grant Coffee Break credits:', error)
        throw error
      }
    }
  }
}

// For Next.js App Router, we handle raw body in the route handler
export const runtime = 'nodejs'
