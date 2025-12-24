import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { SubscriptionService } from '../../../../services/SubscriptionService'

// Paddle Webhook Handler
// Reference: https://developer.paddle.com/webhooks/overview

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('paddle-signature')
    
    // Verify webhook signature
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.warn('[Paddle Webhook] PADDLE_WEBHOOK_SECRET not configured')
      // In development/demo mode, process without verification
      if (process.env.NODE_ENV !== 'development' && process.env.DEMO_MODE !== 'true') {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
      }
    } else if (signature) {
      // Verify Paddle signature
      // Paddle uses ts;h1=<signature> format
      const isValid = verifyPaddleSignature(rawBody, signature, webhookSecret)
      
      if (!isValid) {
        console.error('[Paddle Webhook] Signature verification failed')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }
    
    const event = JSON.parse(rawBody)
    
    // Process the webhook event
    await processWebhookEvent(event)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Paddle Webhook] Error:', error)
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      message: error.message 
    }, { status: 500 })
  }
}

function verifyPaddleSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    // Paddle signature format: ts=<timestamp>;h1=<hash>
    const parts = signature.split(';')
    const tsMatch = parts.find(p => p.startsWith('ts='))
    const h1Match = parts.find(p => p.startsWith('h1='))
    
    if (!tsMatch || !h1Match) {
      console.error('[Paddle Webhook] Invalid signature format')
      return false
    }
    
    const timestamp = tsMatch.replace('ts=', '')
    const receivedHash = h1Match.replace('h1=', '')
    
    // Create signed payload: timestamp:rawBody
    const signedPayload = `${timestamp}:${rawBody}`
    
    // Compute HMAC-SHA256
    const computedHash = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(receivedHash)
    )
  } catch (error) {
    console.error('[Paddle Webhook] Signature verification error:', error)
    return false
  }
}

interface PaddleWebhookEvent {
  event_type: string
  occurred_at: string
  data: {
    id: string
    status?: string
    customer_id?: string
    custom_data?: {
      user_id?: string
      tier_name?: string
    }
    items?: Array<{
      price: {
        id: string
        product_id: string
        name?: string
      }
      quantity: number
    }>
    billing_period?: {
      starts_at: string
      ends_at: string
    }
  }
}

async function processWebhookEvent(event: PaddleWebhookEvent) {
  const eventType = event.event_type
  const customData = event.data.custom_data || {}
  
  console.log(`[Paddle Webhook] Processing event: ${eventType}`)
  
  switch (eventType) {
    case 'transaction.completed':
      // Handle one-time purchases (Coffee Break, Credit Packs)
      await handleTransactionCompleted(customData, event.data)
      break
      
    case 'subscription.created':
      // Handle new subscription
      await handleSubscriptionCreated(customData, event.data)
      break
      
    case 'subscription.updated':
      // Handle plan changes
      await handleSubscriptionUpdated(customData, event.data)
      break
      
    case 'subscription.canceled':
      // Handle cancellation
      await handleSubscriptionCanceled(customData, event.data)
      break
      
    case 'subscription.activated':
      // Handle subscription activation/renewal
      await handleSubscriptionActivated(customData, event.data)
      break
      
    case 'transaction.payment_failed':
      // Handle failed payment
      await handlePaymentFailed(customData, event.data)
      break
      
    default:
      console.log(`[Paddle Webhook] Unhandled event type: ${eventType}`)
  }
}

async function handleTransactionCompleted(
  customData: { user_id?: string; tier_name?: string },
  data: PaddleWebhookEvent['data']
) {
  const userId = customData.user_id
  const tierName = customData.tier_name
  
  if (!userId) {
    console.error('[Paddle Webhook] Missing user_id in transaction.completed event')
    return
  }
  
  // Check if this is a Coffee Break purchase
  if (tierName === 'coffee_break') {
    console.log(`[Paddle Webhook] Processing Coffee Break purchase for user: ${userId}`)
    try {
      await SubscriptionService.grantOneTimeTier(userId, 'coffee_break')
      console.log('[Paddle Webhook] Coffee Break credits granted successfully')
    } catch (error: any) {
      console.error('[Paddle Webhook] Failed to grant Coffee Break credits:', error)
      throw error
    }
    return
  }
  
  // Check if this is a credit pack purchase by looking at item names
  const items = data.items || []
  for (const item of items) {
    const productName = (item.price.name || '').toLowerCase()
    
    if (productName.includes('basic pack')) {
      await SubscriptionService.addCredits(userId, 2000, 'credit_pack', 'basic_pack_purchase')
      console.log(`[Paddle Webhook] Basic Pack credits granted for user: ${userId}`)
    } else if (productName.includes('value pack')) {
      await SubscriptionService.addCredits(userId, 5250, 'credit_pack', 'value_pack_purchase')
      console.log(`[Paddle Webhook] Value Pack credits granted for user: ${userId}`)
    } else if (productName.includes('pro pack')) {
      await SubscriptionService.addCredits(userId, 11000, 'credit_pack', 'pro_pack_purchase')
      console.log(`[Paddle Webhook] Pro Pack credits granted for user: ${userId}`)
    }
  }
  
  console.log(`[Paddle Webhook] Transaction completed for user: ${userId}`)
}

async function handleSubscriptionCreated(
  customData: { user_id?: string; tier_name?: string },
  data: PaddleWebhookEvent['data']
) {
  const userId = customData.user_id
  const tierName = customData.tier_name
  
  if (!userId || !tierName) {
    console.error('[Paddle Webhook] Missing user_id or tier_name in subscription.created')
    return
  }
  
  console.log(`[Paddle Webhook] Subscription created: ${tierName} for user: ${userId}`)
  
  // Grant initial monthly credits based on tier
  const creditAmounts: Record<string, number> = {
    starter: 3000,
    pro: 12000,
    studio: 40000
  }
  
  const credits = creditAmounts[tierName] || 0
  if (credits > 0) {
    await SubscriptionService.grantSubscriptionCredits(userId, credits)
    console.log(`[Paddle Webhook] Granted ${credits} initial credits for ${tierName} tier`)
  }
}

async function handleSubscriptionUpdated(
  customData: { user_id?: string; tier_name?: string },
  data: PaddleWebhookEvent['data']
) {
  const userId = customData.user_id
  
  if (!userId) {
    console.error('[Paddle Webhook] Missing user_id in subscription.updated')
    return
  }
  
  console.log(`[Paddle Webhook] Subscription updated for user: ${userId}`)
  // TODO: Implement plan upgrade/downgrade logic
  // - If upgrading, prorate and add additional credits
  // - If downgrading, adjust next billing cycle credits
}

async function handleSubscriptionCanceled(
  customData: { user_id?: string; tier_name?: string },
  data: PaddleWebhookEvent['data']
) {
  const userId = customData.user_id
  
  if (!userId) {
    console.error('[Paddle Webhook] Missing user_id in subscription.canceled')
    return
  }
  
  console.log(`[Paddle Webhook] Subscription canceled for user: ${userId}`)
  // Subscription will remain active until end of billing period
  // Credits expire at subscription_credits_expires_at
}

async function handleSubscriptionActivated(
  customData: { user_id?: string; tier_name?: string },
  data: PaddleWebhookEvent['data']
) {
  const userId = customData.user_id
  const tierName = customData.tier_name
  
  if (!userId || !tierName) {
    console.error('[Paddle Webhook] Missing user_id or tier_name in subscription.activated')
    return
  }
  
  console.log(`[Paddle Webhook] Subscription activated for user: ${userId}`)
  
  // Grant monthly credits renewal
  const creditAmounts: Record<string, number> = {
    starter: 3000,
    pro: 12000,
    studio: 40000
  }
  
  const credits = creditAmounts[tierName] || 0
  if (credits > 0) {
    await SubscriptionService.grantSubscriptionCredits(userId, credits)
    console.log(`[Paddle Webhook] Renewed ${credits} credits for ${tierName} tier`)
  }
}

async function handlePaymentFailed(
  customData: { user_id?: string; tier_name?: string },
  data: PaddleWebhookEvent['data']
) {
  const userId = customData.user_id
  
  if (!userId) {
    console.error('[Paddle Webhook] Missing user_id in transaction.payment_failed')
    return
  }
  
  console.log(`[Paddle Webhook] Payment failed for user: ${userId}`)
  // TODO: Implement notification/at-risk logic
  // - Send email notification
  // - Mark subscription as at-risk
  // - Paddle Retain handles dunning automatically
}

// For Next.js App Router, we handle raw body in the route handler
export const runtime = 'nodejs'
