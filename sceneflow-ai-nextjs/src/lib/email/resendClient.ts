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
      ...(options.headers && Object.keys(options.headers).length > 0
        ? { headers: options.headers }
        : {}),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to send email (${response.status}): ${errorBody}`)
  }
}
