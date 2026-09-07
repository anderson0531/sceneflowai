import crypto from 'crypto'
import { list, put } from '@vercel/blob'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import { getAuthSecret } from '@/lib/auth/secret'
import { fetchPrivateBlobJson, getPrivateBlobToken, hasPrivateBlobToken } from '@/lib/storage/privateBlob'
import {
  getAppBaseUrl,
  getWaitlistFromCandidates,
  isResendUnverifiedDomainError,
  sendEmail,
} from '@/lib/email/resendClient'

export const WAITLIST_CONFIRM_TTL_MS = 48 * 60 * 60 * 1000
export const WAITLIST_RESEND_COOLDOWN_MS = 60 * 1000
export const WAITLIST_CONFIRM_PATH = '/notify/confirm'

export const WAITLIST_CONFIRM_SUBJECT = 'Confirm your SceneFlow launch notification'

export type WaitlistStatus = 'pending' | 'confirmed'

export interface WaitlistRecord {
  email: string
  source: string
  createdAt: string
  status: WaitlistStatus
  lastSentAt?: string
  confirmedAt?: string
}

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function waitlistBlobPath(email: string): string {
  const hash = crypto.createHash('sha256').update(normalizeWaitlistEmail(email)).digest('hex')
  return `waitlist/launch-november-2026/${hash}.json`
}

export function createConfirmToken(email: string, expMs: number): string {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(`${normalizeWaitlistEmail(email)}|${expMs}`)
    .digest('hex')
}

function tokensEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function isConfirmExpired(expMs: number, now = Date.now()): boolean {
  return !Number.isFinite(expMs) || now > expMs
}

export function verifyConfirmToken(
  email: string,
  token: string,
  expMs: number,
  now = Date.now()
): { ok: true } | { ok: false; reason: 'expired' | 'invalid' } {
  if (isConfirmExpired(expMs, now)) return { ok: false, reason: 'expired' }
  const expected = createConfirmToken(email, expMs)
  if (!token || !tokensEqual(expected, token)) return { ok: false, reason: 'invalid' }
  return { ok: true }
}

export function isWithinResendCooldown(lastSentAt: string | undefined, now = Date.now()): boolean {
  if (!lastSentAt) return false
  const sent = new Date(lastSentAt).getTime()
  if (!Number.isFinite(sent)) return false
  return now - sent < WAITLIST_RESEND_COOLDOWN_MS
}

export function buildConfirmUrl(email: string, now = Date.now()): { url: string; exp: number; token: string } {
  const normalized = normalizeWaitlistEmail(email)
  const exp = now + WAITLIST_CONFIRM_TTL_MS
  const token = createConfirmToken(normalized, exp)
  const url = new URL(WAITLIST_CONFIRM_PATH, `${getAppBaseUrl()}/`)
  url.searchParams.set('email', normalized)
  url.searchParams.set('exp', String(exp))
  url.searchParams.set('token', token)
  return { url: url.toString(), exp, token }
}

export async function readWaitlistRecord(email: string): Promise<WaitlistRecord | null> {
  if (!hasPrivateBlobToken()) return null
  const path = waitlistBlobPath(email)
  const listing = await list({ prefix: path, limit: 1, token: getPrivateBlobToken() })
  const blob = listing.blobs.find((item) => item.pathname === path) || listing.blobs[0]
  if (!blob?.url) return null
  return fetchPrivateBlobJson<WaitlistRecord>(blob.url)
}

export async function writeWaitlistRecord(record: WaitlistRecord): Promise<void> {
  if (!hasPrivateBlobToken()) return
  await put(waitlistBlobPath(record.email), JSON.stringify(record, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token: getPrivateBlobToken(),
  })
}

export function buildWaitlistConfirmationContent(confirmUrl: string): { html: string; text: string } {
  const text = [
    'Confirm your email to join the SceneFlow November 2026 launch list.',
    '',
    `Confirm email: ${confirmUrl}`,
    '',
    'This link expires in 48 hours. If you did not request this, you can ignore this email.',
    `Questions? Reply to this message or write ${LEGAL_SUPPORT_EMAIL}.`,
  ].join('\n')

  const html = `
    <p>Confirm your email to join the SceneFlow November 2026 launch list.</p>
    <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">Confirm email</a></p>
    <p>Or paste this link into your browser:<br /><a href="${confirmUrl}">${confirmUrl}</a></p>
    <p>This link expires in 48 hours. If you did not request this, you can ignore this email.</p>
    <p>Questions? Reply to this message or write <a href="mailto:${LEGAL_SUPPORT_EMAIL}">${LEGAL_SUPPORT_EMAIL}</a>.</p>
  `.trim()

  return { html, text }
}

export async function sendWaitlistConfirmation(email: string, confirmUrl: string): Promise<void> {
  const { html, text } = buildWaitlistConfirmationContent(confirmUrl)
  const payload = {
    to: normalizeWaitlistEmail(email),
    subject: WAITLIST_CONFIRM_SUBJECT,
    html,
    text,
    replyTo: LEGAL_SUPPORT_EMAIL,
  }
  const candidates = getWaitlistFromCandidates()
  let lastError: unknown
  for (let index = 0; index < candidates.length; index++) {
    try {
      await sendEmail({ ...payload, from: candidates[index] })
      return
    } catch (error) {
      lastError = error
      const hasNext = index < candidates.length - 1
      if (!hasNext || !isResendUnverifiedDomainError(error)) {
        throw error
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export type ConfirmWaitlistResult = 'confirmed' | 'already' | 'expired' | 'invalid'

export async function confirmWaitlistEmail(
  rawEmail: string,
  token: string,
  expRaw: string,
  now = Date.now()
): Promise<ConfirmWaitlistResult> {
  const email = normalizeWaitlistEmail(rawEmail)
  const expMs = Number(expRaw)
  const verified = verifyConfirmToken(email, token, expMs, now)
  if (!verified.ok) return verified.reason

  const existing = await readWaitlistRecord(email)
  if (existing?.status === 'confirmed') return 'already'

  const record: WaitlistRecord = {
    email,
    source: existing?.source ?? 'confirm',
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    status: 'confirmed',
    lastSentAt: existing?.lastSentAt,
    confirmedAt: new Date(now).toISOString(),
  }
  await writeWaitlistRecord(record)
  return 'confirmed'
}
