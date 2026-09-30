import { sequelize } from '@/config/database'
import { hasTables } from '@/lib/database/schemaProbe'
import PushSubscription from '@/models/PushSubscription'

export interface VapidConfig {
  publicKey: string
  privateKey: string
  subject: string
}

export function vapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) return null
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT?.trim() || 'mailto:support@sceneflowai.studio',
  }
}

let schemaReady = false
let schemaInProgress = false

async function ensurePushSchema(): Promise<void> {
  if (schemaReady) return
  if (schemaInProgress) {
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      if (schemaReady) return
    }
    throw new Error('[webPush] Push subscription schema migration timeout')
  }
  schemaInProgress = true
  try {
    if (await hasTables(['push_subscriptions'])) {
      schemaReady = true
      return
    }
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
    `)
    schemaReady = true
  } finally {
    schemaInProgress = false
  }
}

export async function savePushSubscription(input: {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
}): Promise<void> {
  await ensurePushSchema()
  const existing = await PushSubscription.findOne({ where: { endpoint: input.endpoint } })
  if (existing) {
    existing.user_id = input.userId
    existing.p256dh = input.p256dh
    existing.auth = input.auth
    await existing.save()
    return
  }
  await PushSubscription.create({
    user_id: input.userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  })
}

type WebPushApi = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string
  ) => Promise<{ statusCode?: number }>
}

async function loadWebPush(config: VapidConfig): Promise<WebPushApi> {
  const imported = (await import('web-push')) as { default?: WebPushApi } & WebPushApi
  const api = imported.default?.setVapidDetails ? imported.default : imported
  api.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return api
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; message: string; url: string }
): Promise<void> {
  const config = vapidConfig()
  if (!config) return
  await ensurePushSchema()
  const rows = await PushSubscription.findAll({ where: { user_id: userId } })
  if (rows.length === 0) return
  const api = await loadWebPush(config)
  const body = JSON.stringify(payload)
  await Promise.all(
    rows.map(async (row) => {
      try {
        await api.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await row.destroy()
          return
        }
        console.error('[webPush] send failed', statusCode ?? error)
      }
    })
  )
}
