import crypto from 'crypto'
import { list, put } from '@vercel/blob'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import { getAuthSecret } from '@/lib/auth/secret'
import {
  fetchPrivateBlobJson,
  getPrivateBlobToken,
  hasPrivateBlobToken,
} from '@/lib/storage/privateBlob'
import { getAppBaseUrl, getResendFromEmail, sendEmail } from '@/lib/email/resendClient'
import { buildOfficialEmail } from '@/lib/email/officialEmail'

export const ORIGINALS_SEED_CONFIRM_TTL_MS = 48 * 60 * 60 * 1000
export const ORIGINALS_SEED_RESEND_COOLDOWN_MS = 60 * 1000
export const ORIGINALS_SEED_CONFIRM_PATH = '/notify/originals/confirm'
export const ORIGINALS_SEED_BLOB_PREFIX = 'waitlist/originals-seed/'
export const ORIGINALS_SEED_CONFIRM_SUBJECT = 'Confirm your SceneFlow Originals Seed application'

export type OriginalsSeedStatus = 'pending' | 'confirmed'

export interface OriginalsSeedRecord {
  email: string
  name: string
  title: string
  logline: string
  audienceUrl: string
  exclusivePremiere: boolean
  source: string
  createdAt: string
  status: OriginalsSeedStatus
  lastSentAt?: string
  confirmedAt?: string
}

export function normalizeSeedEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function originalsSeedBlobPath(email: string): string {
  const hash = crypto.createHash('sha256').update(normalizeSeedEmail(email)).digest('hex')
  return `${ORIGINALS_SEED_BLOB_PREFIX}${hash}.json`
}

export function isOriginalsSeedRecordPath(pathname: string): boolean {
  return pathname.startsWith(ORIGINALS_SEED_BLOB_PREFIX) && pathname.endsWith('.json')
}

function tokensEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function createOriginalsConfirmToken(email: string, expMs: number): string {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(`originals-seed|${normalizeSeedEmail(email)}|${expMs}`)
    .digest('hex')
}

export function isOriginalsConfirmExpired(expMs: number, now = Date.now()): boolean {
  return !Number.isFinite(expMs) || now > expMs
}

export function verifyOriginalsConfirmToken(
  email: string,
  token: string,
  expMs: number,
  now = Date.now()
): { ok: true } | { ok: false; reason: 'expired' | 'invalid' } {
  if (isOriginalsConfirmExpired(expMs, now)) return { ok: false, reason: 'expired' }
  const expected = createOriginalsConfirmToken(email, expMs)
  if (!token || !tokensEqual(expected, token)) return { ok: false, reason: 'invalid' }
  return { ok: true }
}

export function isWithinOriginalsResendCooldown(
  lastSentAt: string | undefined,
  now = Date.now()
): boolean {
  if (!lastSentAt) return false
  const sent = new Date(lastSentAt).getTime()
  if (!Number.isFinite(sent)) return false
  return now - sent < ORIGINALS_SEED_RESEND_COOLDOWN_MS
}

export function buildOriginalsConfirmUrl(
  email: string,
  now = Date.now()
): { url: string; exp: number; token: string } {
  const normalized = normalizeSeedEmail(email)
  const exp = now + ORIGINALS_SEED_CONFIRM_TTL_MS
  const token = createOriginalsConfirmToken(normalized, exp)
  const url = new URL(ORIGINALS_SEED_CONFIRM_PATH, `${getAppBaseUrl()}/`)
  url.searchParams.set('email', normalized)
  url.searchParams.set('exp', String(exp))
  url.searchParams.set('token', token)
  return { url: url.toString(), exp, token }
}

export async function readOriginalsSeedRecord(email: string): Promise<OriginalsSeedRecord | null> {
  if (!hasPrivateBlobToken()) return null
  const path = originalsSeedBlobPath(email)
  const listing = await list({ prefix: path, limit: 1, token: getPrivateBlobToken() })
  const blob = listing.blobs.find((item) => item.pathname === path) || listing.blobs[0]
  if (!blob?.url) return null
  return fetchPrivateBlobJson<OriginalsSeedRecord>(blob.url)
}

export async function writeOriginalsSeedRecord(record: OriginalsSeedRecord): Promise<void> {
  if (!hasPrivateBlobToken()) return
  await put(originalsSeedBlobPath(record.email), JSON.stringify(record, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token: getPrivateBlobToken(),
  })
}

export async function listOriginalsSeedRecords(): Promise<OriginalsSeedRecord[]> {
  if (!hasPrivateBlobToken()) return []

  const records: OriginalsSeedRecord[] = []
  let cursor: string | undefined

  do {
    const listing = await list({
      prefix: ORIGINALS_SEED_BLOB_PREFIX,
      limit: 1000,
      token: getPrivateBlobToken(),
      ...(cursor ? { cursor } : {}),
    })
    for (const blob of listing.blobs) {
      if (!isOriginalsSeedRecordPath(blob.pathname) || !blob.url) continue
      const record = await fetchPrivateBlobJson<OriginalsSeedRecord>(blob.url)
      if (record?.email) records.push(record)
    }
    cursor = listing.hasMore ? listing.cursor : undefined
  } while (cursor)

  return records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function buildOriginalsConfirmationContent(confirmUrl: string): { html: string; text: string } {
  const landingUrl = `${getAppBaseUrl()}/#for-filmmakers`
  return buildOfficialEmail({
    preheader: 'Confirm your email to submit a SceneFlow Originals Seed application.',
    heading: 'Confirm your Originals Seed application',
    paragraphs: [
      'Confirm your email to lock in your SceneFlow Originals Seed application.',
      'Editors review every submission. This is not a public catalog listing.',
      'This link expires in 48 hours. If you did not request this, you can ignore this email.',
    ],
    ctaLabel: 'Confirm application',
    ctaUrl: confirmUrl,
    whyReceived: 'You received this because you submitted a SceneFlow Originals Seed application.',
    unsubscribeUrl: landingUrl,
  })
}

export async function sendOriginalsSeedConfirmation(email: string, confirmUrl: string): Promise<void> {
  const { html, text } = buildOriginalsConfirmationContent(confirmUrl)
  await sendEmail({
    to: normalizeSeedEmail(email),
    subject: ORIGINALS_SEED_CONFIRM_SUBJECT,
    html,
    text,
    from: getResendFromEmail(),
    replyTo: LEGAL_SUPPORT_EMAIL,
  })
}

export type ConfirmOriginalsResult = 'confirmed' | 'already' | 'expired' | 'invalid'

export async function confirmOriginalsSeedEmail(
  rawEmail: string,
  token: string,
  expRaw: string,
  now = Date.now()
): Promise<ConfirmOriginalsResult> {
  const email = normalizeSeedEmail(rawEmail)
  const expMs = Number(expRaw)
  const verified = verifyOriginalsConfirmToken(email, token, expMs, now)
  if (!verified.ok) return verified.reason

  const existing = await readOriginalsSeedRecord(email)
  if (existing?.status === 'confirmed') return 'already'

  const record: OriginalsSeedRecord = {
    email,
    name: existing?.name ?? '',
    title: existing?.title ?? '',
    logline: existing?.logline ?? '',
    audienceUrl: existing?.audienceUrl ?? '',
    exclusivePremiere: existing?.exclusivePremiere ?? false,
    source: existing?.source ?? 'confirm',
    createdAt: existing?.createdAt ?? new Date(now).toISOString(),
    status: 'confirmed',
    lastSentAt: existing?.lastSentAt,
    confirmedAt: new Date(now).toISOString(),
  }
  await writeOriginalsSeedRecord(record)
  return 'confirmed'
}
