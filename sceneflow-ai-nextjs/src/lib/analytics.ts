'use client'

export type CtaEvent = {
  event: 'click'
  label: string
  variant?: string
  location?: string
  metadata?: Record<string, any>
}

export async function trackCta(payload: CtaEvent) {
  try {
    await fetch('/api/analytics/cta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        ts: Date.now(),
      }),
      keepalive: true,
    })
  } catch (_err) {
    // best-effort only
  }
}


