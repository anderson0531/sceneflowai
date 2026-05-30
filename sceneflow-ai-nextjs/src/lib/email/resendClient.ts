import { BRAND } from '@/config/brand'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
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

const DEFAULT_RESEND_FROM = 'SceneFlow AI Studio <noreply@sfai.studio>'

/** Resend From header; prefers env when it uses noreply@sfai.studio, else canonical default. */
export function getResendFromEmail(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim()
  if (configured?.includes('noreply@sfai.studio')) return configured
  return DEFAULT_RESEND_FROM
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = getResendFromEmail()

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
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to send email: ${errorBody}`)
  }
}
