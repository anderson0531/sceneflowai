import { list, put } from '@vercel/blob'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import { fetchPrivateBlobJson, getPrivateBlobToken, hasPrivateBlobToken } from '@/lib/storage/privateBlob'
import { getAppBaseUrl, getResendFromEmail, sendEmail } from '@/lib/email/resendClient'
import { ensureOfficialHtml, listUnsubscribeHeaders } from '@/lib/email/officialEmail'
import {
  WAITLIST_CONFIRM_SUBJECT,
  buildConfirmUrl,
  buildUnsubscribeUrls,
  buildWaitlistConfirmationContent,
  normalizeWaitlistEmail,
  sendWaitlistConfirmation,
  writeWaitlistRecord,
  type WaitlistRecord,
} from '@/lib/email/waitlistConfirm'

export const WAITLIST_BLOB_PREFIX = 'waitlist/launch-november-2026/'
export const WAITLIST_CAMPAIGN_PATH = `${WAITLIST_BLOB_PREFIX}_campaign.json`
export const WAITLIST_LAUNCH_SUBJECT = 'SceneFlow access opens November 2026'
export const LAUNCH_SEND_BATCH_SIZE = 40

export type WaitlistListFilter = 'all' | 'pending' | 'confirmed' | 'notified' | 'unsubscribed'

export interface LaunchCampaign {
  subject: string
  html: string
  text: string
  updatedAt?: string
  updatedBy?: string
}

export interface WaitlistCounts {
  total: number
  pending: number
  confirmed: number
  notified: number
  unsubscribed: number
}

export interface LaunchBatchResult {
  recipients: WaitlistRecord[]
  skipped: number
  remaining: number
  nextCursor: string | null
}

export function isWaitlistRecordPath(pathname: string): boolean {
  return (
    pathname.startsWith(WAITLIST_BLOB_PREFIX) &&
    pathname.endsWith('.json') &&
    pathname !== WAITLIST_CAMPAIGN_PATH
  )
}

export function isLaunchEligible(record: WaitlistRecord): boolean {
  return record.status === 'confirmed' && !record.launchNotifiedAt && !record.unsubscribedAt
}

export function getLaunchSignInUrl(): string {
  return `${getAppBaseUrl()}/login?mode=signup`
}

export function getDefaultLaunchCampaign(): LaunchCampaign {
  const signInUrl = getLaunchSignInUrl()
  const { pageUrl } = buildUnsubscribeUrls('preview@sceneflowai.studio')
  const rendered = renderLaunchCampaign(
    {
      subject: WAITLIST_LAUNCH_SUBJECT,
      html: '<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#e2e8f0">SceneFlow studio access is opening in November 2026.</p>',
      text: `SceneFlow studio access is opening in November 2026.\n\nSign in to start your production: ${signInUrl}`,
    },
    pageUrl
  )
  return {
    subject: WAITLIST_LAUNCH_SUBJECT,
    html: rendered.html,
    text: rendered.text,
  }
}

export function renderLaunchCampaign(campaign: LaunchCampaign, unsubscribeUrl: string) {
  return ensureOfficialHtml(campaign.html, {
    preheader: 'SceneFlow studio access is opening in November 2026.',
    heading: campaign.subject || WAITLIST_LAUNCH_SUBJECT,
    ctaLabel: 'Start your production',
    ctaUrl: getLaunchSignInUrl(),
    whyReceived: 'You received this because you confirmed a SceneFlow November 2026 launch notification.',
    unsubscribeUrl,
    bodyText: campaign.text,
  })
}

export function sanitizeLaunchCampaign(
  input: Partial<LaunchCampaign>,
  meta?: { updatedBy?: string; now?: number }
): LaunchCampaign {
  const subject = typeof input.subject === 'string' ? input.subject.trim() : ''
  const html = typeof input.html === 'string' ? input.html.trim() : ''
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  if (!subject || !html || !text) {
    throw new Error('Campaign subject, html, and text are required.')
  }
  return {
    subject: subject.slice(0, 200),
    html,
    text,
    updatedAt: new Date(meta?.now ?? Date.now()).toISOString(),
    updatedBy: meta?.updatedBy,
  }
}

export async function readLaunchCampaign(): Promise<LaunchCampaign> {
  const fallback = getDefaultLaunchCampaign()
  if (!hasPrivateBlobToken()) return fallback
  const listing = await list({
    prefix: WAITLIST_CAMPAIGN_PATH,
    limit: 1,
    token: getPrivateBlobToken(),
  })
  const blob = listing.blobs.find((item) => item.pathname === WAITLIST_CAMPAIGN_PATH)
  if (!blob?.url) return fallback
  const stored = await fetchPrivateBlobJson<LaunchCampaign>(blob.url)
  if (!stored?.subject?.trim() || !stored.html?.trim() || !stored.text?.trim()) {
    return fallback
  }
  return stored
}

export async function writeLaunchCampaign(campaign: LaunchCampaign): Promise<void> {
  if (!hasPrivateBlobToken()) {
    throw new Error('Private blob storage is not configured.')
  }
  await put(WAITLIST_CAMPAIGN_PATH, JSON.stringify(campaign, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token: getPrivateBlobToken(),
  })
}

export async function listWaitlistRecords(): Promise<WaitlistRecord[]> {
  if (!hasPrivateBlobToken()) return []

  const records: WaitlistRecord[] = []
  let cursor: string | undefined

  do {
    const listing = await list({
      prefix: WAITLIST_BLOB_PREFIX,
      limit: 1000,
      token: getPrivateBlobToken(),
      ...(cursor ? { cursor } : {}),
    })
    for (const blob of listing.blobs) {
      if (!isWaitlistRecordPath(blob.pathname) || !blob.url) continue
      const record = await fetchPrivateBlobJson<WaitlistRecord>(blob.url)
      if (record?.email) records.push(record)
    }
    cursor = listing.hasMore ? listing.cursor : undefined
  } while (cursor)

  return records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

export function countWaitlistRecords(records: WaitlistRecord[]): WaitlistCounts {
  return records.reduce<WaitlistCounts>(
    (counts, record) => {
      counts.total += 1
      if (record.status === 'pending') counts.pending += 1
      if (record.status === 'confirmed') counts.confirmed += 1
      if (record.launchNotifiedAt) counts.notified += 1
      if (record.unsubscribedAt) counts.unsubscribed += 1
      return counts
    },
    { total: 0, pending: 0, confirmed: 0, notified: 0, unsubscribed: 0 }
  )
}

export function filterWaitlistRecords(
  records: WaitlistRecord[],
  status: WaitlistListFilter = 'all'
): WaitlistRecord[] {
  if (status === 'pending') return records.filter((record) => record.status === 'pending')
  if (status === 'confirmed') return records.filter((record) => record.status === 'confirmed')
  if (status === 'notified') return records.filter((record) => Boolean(record.launchNotifiedAt))
  if (status === 'unsubscribed') return records.filter((record) => Boolean(record.unsubscribedAt))
  return records
}

export function paginateWaitlistRecords<T>(
  records: T[],
  offset = 0,
  limit = 50
): { items: T[]; offset: number; limit: number; total: number } {
  const safeOffset = Math.max(0, offset)
  const safeLimit = Math.min(200, Math.max(1, limit))
  return {
    items: records.slice(safeOffset, safeOffset + safeLimit),
    offset: safeOffset,
    limit: safeLimit,
    total: records.length,
  }
}

export function selectLaunchBatch(
  records: WaitlistRecord[],
  options: { email?: string; cursor?: string; limit?: number } = {}
): LaunchBatchResult {
  const eligible = records
    .filter(isLaunchEligible)
    .sort((a, b) => a.email.localeCompare(b.email))
  const skipped = records.length - eligible.length

  if (options.email) {
    const email = normalizeWaitlistEmail(options.email)
    const match = eligible.find((record) => record.email === email)
    return {
      recipients: match ? [match] : [],
      skipped: match ? skipped : records.length,
      remaining: 0,
      nextCursor: null,
    }
  }

  const start = options.cursor
    ? eligible.findIndex((record) => record.email > options.cursor!)
    : 0
  const from = start < 0 ? eligible.length : start
  const limit = Math.min(LAUNCH_SEND_BATCH_SIZE, Math.max(1, options.limit ?? LAUNCH_SEND_BATCH_SIZE))
  const recipients = eligible.slice(from, from + limit)
  const remaining = Math.max(0, eligible.length - from - recipients.length)
  const nextCursor = remaining > 0 ? recipients[recipients.length - 1]?.email ?? null : null

  return { recipients, skipped, remaining, nextCursor }
}

export function nextLaunchAllCursor(
  remaining: number,
  cursor: string | null | undefined
): string | undefined {
  if (remaining <= 0 || !cursor) return undefined
  return cursor
}

export function buildConfirmationPreview(now = Date.now()): {
  subject: string
  html: string
  text: string
} {
  const { url } = buildConfirmUrl('preview@sceneflowai.studio', now)
  const { pageUrl } = buildUnsubscribeUrls('preview@sceneflowai.studio')
  return {
    subject: WAITLIST_CONFIRM_SUBJECT,
    ...buildWaitlistConfirmationContent(url, pageUrl),
  }
}

export async function sendLaunchNotification(
  email: string,
  campaign: LaunchCampaign,
  options: { allowFallbackFrom?: boolean } = {}
): Promise<{ from: string; usedFallback: boolean }> {
  const { pageUrl, apiUrl } = buildUnsubscribeUrls(email)
  const rendered = renderLaunchCampaign(campaign, pageUrl)
  return sendEmail({
    to: normalizeWaitlistEmail(email),
    subject: campaign.subject,
    html: rendered.html,
    text: rendered.text || campaign.text,
    from: getResendFromEmail(),
    replyTo: LEGAL_SUPPORT_EMAIL,
    headers: listUnsubscribeHeaders(apiUrl),
    allowFallbackFrom: options.allowFallbackFrom,
  })
}

export async function markLaunchNotified(
  record: WaitlistRecord,
  now = Date.now()
): Promise<WaitlistRecord> {
  const updated: WaitlistRecord = {
    ...record,
    launchNotifiedAt: new Date(now).toISOString(),
  }
  await writeWaitlistRecord(updated)
  return updated
}

export async function resendWaitlistConfirmation(
  record: WaitlistRecord,
  now = Date.now()
): Promise<WaitlistRecord> {
  if (record.unsubscribedAt) {
    throw new Error('This address has unsubscribed.')
  }
  const { url } = buildConfirmUrl(record.email, now)
  await sendWaitlistConfirmation(record.email, url)
  const updated: WaitlistRecord = {
    ...record,
    lastSentAt: new Date(now).toISOString(),
  }
  await writeWaitlistRecord(updated)
  return updated
}
