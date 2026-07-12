import { NextRequest, NextResponse } from 'next/server'
import { getKlingWebhookSecret } from '@/lib/kling/config'
import { parseKlingWebhookPayload } from '@/lib/kling/klingDirectClient'
import { processKlingWebhookPayload } from '@/lib/kling/processKlingCompletion'

export const runtime = 'nodejs'
export const maxDuration = 120

function verifyKlingWebhook(req: NextRequest, rawBody: string): boolean {
  const secret = getKlingWebhookSecret()
  if (!secret) return process.env.NODE_ENV !== 'production'
  const sig =
    req.headers.get('x-kling-signature') ||
    req.headers.get('x-webhook-signature') ||
    req.headers.get('x-signature')
  if (!sig) return false
  return sig === secret
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifyKlingWebhook(req, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const payload = parseKlingWebhookPayload(body)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const result = await processKlingWebhookPayload(payload)
    if (result.error && !result.assetUrl) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({
      ok: true,
      taskId: payload.task_id,
      assetUrl: result.assetUrl,
    })
  } catch (error) {
    console.error('[Kling Webhook] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', provider: 'kling' })
}
