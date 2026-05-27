import crypto from 'crypto'
import { PaymentWebhookEvent } from '@/models'

export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  const existing = await PaymentWebhookEvent.findOne({
    where: { event_id: eventId },
  })
  return Boolean(existing)
}

export async function markWebhookEventProcessed(
  provider: string,
  eventId: string,
  eventType: string,
  rawBody: string
): Promise<void> {
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')

  try {
    await PaymentWebhookEvent.create({
      provider,
      event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      processed_at: new Date(),
    })
  } catch (error: any) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return
    }
    throw error
  }
}
