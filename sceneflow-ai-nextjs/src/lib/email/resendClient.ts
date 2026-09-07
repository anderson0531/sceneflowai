import { BRAND } from '@/config/brand'
import { LEGAL_NOREPLY_EMAIL } from '@/config/legal/legalCopy'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string | string[]
  from?: string
  headers?: Record<string, string>
  /** Retry with a verified Resend sender when the official domain is rejected. */
  allowFallbackFrom?: boolean
}

export interface SendEmailResult {
  from: string
  usedFallback: boolean
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

export const DEFAULT_RESEND_FROM = `SceneFlow AI Studio <${LEGAL_NOREPLY_EMAIL}>`
export const RESEND_ONBOARDING_FROM = 'SceneFlow AI Studio <onboarding@resend.dev>'

function fromAddressKey(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match?.[1] ?? from).trim().toLowerCase()
}

/** Resend From header. Locked to noreply@sceneflowai.studio; ignores other env senders. */
export function getResendFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (configured && fromAddressKey(configured) === LEGAL_NOREPLY_EMAIL) {
    return configured
  }
  return DEFAULT_RESEND_FROM
}

/**
 * Verified-domain sender used only when the official From is rejected.
 * Prefers RESEND_FALLBACK_FROM, then a non-noreply RESEND_FROM_EMAIL, then Resend's onboarding address.
 */
export function getResendFallbackFromEmail(): string {
  const official = fromAddressKey(getResendFromEmail())
  const candidates = [
    process.env.RESEND_FALLBACK_FROM?.trim(),
    process.env.RESEND_FROM_EMAIL?.trim(),
    RESEND_ONBOARDING_FROM,
  ]
  for (const candidate of candidates) {
    if (candidate && fromAddressKey(candidate) !== official) {
      return candidate
    }
  }
  return RESEND_ONBOARDING_FROM
}

export function isUnverifiedDomainError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /domain is not verified/i.test(message)
}

export function formatResendError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const start = raw.indexOf('{')
  if (start >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(start)) as { message?: string }
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message
      }
    } catch {
      // keep the raw send error
    }
  }
  return raw
}

async function postResendEmail(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to send email (${response.status}): ${errorBody}`)
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY
  const officialFrom = options.from?.trim() || getResendFromEmail()

  if (!resendApiKey) {
    throw new Error('Email delivery is not configured. Set RESEND_API_KEY.')
  }

  const to = Array.isArray(options.to) ? options.to : [options.to]
  const payload = {
    from: officialFrom,
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
    ...(options.headers && Object.keys(options.headers).length > 0
      ? { headers: options.headers }
      : {}),
  }

  try {
    await postResendEmail(resendApiKey, payload)
    return { from: officialFrom, usedFallback: false }
  } catch (error) {
    const fallbackFrom = getResendFallbackFromEmail()
    if (
      !options.allowFallbackFrom ||
      !isUnverifiedDomainError(error) ||
      fromAddressKey(fallbackFrom) === fromAddressKey(officialFrom)
    ) {
      throw error
    }
    await postResendEmail(resendApiKey, { ...payload, from: fallbackFrom })
    return { from: fallbackFrom, usedFallback: true }
  }
}
