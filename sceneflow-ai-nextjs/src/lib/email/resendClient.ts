import { BRAND } from '@/config/brand'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string | string[]
  from?: string
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://sceneflowai.studio'
  ).replace(/\/$/, '')
}

export function getBrandBadgeUrl(): string {
  return `${getAppBaseUrl()}${BRAND.badge.src}`
}

export const DEFAULT_RESEND_FROM = 'SceneFlow AI Studio <noreply@sceneflowai.studio>'
/** Account domain used when sceneflowai.studio is not verified in Resend. */
export const FALLBACK_RESEND_FROM = 'SceneFlow AI Studio <noreply@sfai.studio>'
export const PREVIEW_RESEND_FROM = 'SceneFlow AI Studio <onboarding@resend.dev>'

function fromAddressKey(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match?.[1] ?? from).trim().toLowerCase()
}

/** Resend From header. Honors RESEND_FROM_EMAIL when it looks like an address. */
export function getResendFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (configured?.includes('@')) return configured
  return DEFAULT_RESEND_FROM
}

export function getWaitlistFromCandidates(): string[] {
  const candidates = [getResendFromEmail(), FALLBACK_RESEND_FROM]
  if (process.env.VERCEL_ENV === 'preview') {
    candidates.push(PREVIEW_RESEND_FROM)
  }
  const unique: string[] = []
  const seen = new Set<string>()
  for (const from of candidates) {
    const key = fromAddressKey(from)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(from)
  }
  return unique
}

export function isResendUnverifiedDomainError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /domain is not verified/i.test(message) || /\(403\)/.test(message)
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = options.from?.trim() || getResendFromEmail()

  if (!resendApiKey) {
    throw new Error('Email delivery is not configured. Set RESEND_API_KEY.')
  }

  const to = Array.isArray(options.to) ? options.to : [options.to]

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(options.replyTo
        ? {
            reply_to: Array.isArray(options.replyTo) && options.replyTo.length === 1
              ? options.replyTo[0]
              : options.replyTo,
          }
        : {}),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to send email (${response.status}): ${errorBody}`)
  }
}
