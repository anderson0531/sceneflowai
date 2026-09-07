import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/email/resendClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email/resendClient')>()
  return {
    ...actual,
    sendEmail: vi.fn(),
  }
})

vi.mock('@/lib/storage/privateBlob', () => ({
  hasPrivateBlobToken: vi.fn(() => true),
  getPrivateBlobToken: vi.fn(() => 'blob-token'),
  fetchPrivateBlobJson: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
  put: vi.fn(),
}))

import { sendEmail } from '@/lib/email/resendClient'
import { fetchPrivateBlobJson, hasPrivateBlobToken } from '@/lib/storage/privateBlob'
import { list, put } from '@vercel/blob'
import { POST } from '@/app/api/waitlist/route'
import {
  WAITLIST_CONFIRM_PATH,
  WAITLIST_CONFIRM_SUBJECT,
  WAITLIST_RESEND_COOLDOWN_MS,
  buildConfirmUrl,
  confirmWaitlistEmail,
  createConfirmToken,
  isWithinResendCooldown,
  verifyConfirmToken,
} from '@/lib/email/waitlistConfirm'
import {
  WAITLIST_CAMPAIGN_PATH,
  WAITLIST_LAUNCH_SUBJECT,
  filterWaitlistRecords,
  getDefaultLaunchCampaign,
  isWaitlistRecordPath,
  listWaitlistRecords,
  nextLaunchAllCursor,
  selectLaunchBatch,
} from '@/lib/email/waitlistAdmin'
import { LEGAL_SUPPORT_EMAIL } from '@/config/legal/legalCopy'
import { getResendFromEmail } from '@/lib/email/resendClient'
import { NOTIFY_COPY } from '@/config/landing/valuePropCopy'
import { isPublicRoute } from '@/constants/publicRoutes'
import { readFileSync } from 'fs'
import { join } from 'path'

const sendEmailMock = vi.mocked(sendEmail)
const listMock = vi.mocked(list)
const putMock = vi.mocked(put)
const fetchJsonMock = vi.mocked(fetchPrivateBlobJson)
const hasBlobMock = vi.mocked(hasPrivateBlobToken)

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('waitlist confirmation tokens', () => {
  it('accepts a fresh HMAC token and rejects expired or tampered ones', () => {
    const email = 'support@sceneflowai.studio'
    const now = Date.now()
    const exp = now + 60_000
    const token = createConfirmToken(email, exp)

    expect(verifyConfirmToken(email, token, exp, now)).toEqual({ ok: true })
    expect(verifyConfirmToken(email, token, exp, exp + 1)).toEqual({ ok: false, reason: 'expired' })
    expect(verifyConfirmToken(email, 'deadbeef', exp, now)).toEqual({ ok: false, reason: 'invalid' })
    expect(verifyConfirmToken('other@sceneflowai.studio', token, exp, now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
  })

  it('builds a confirm URL with email, exp, and token', () => {
    const { url } = buildConfirmUrl('Support@SceneFlowAI.studio')
    expect(url).toContain(WAITLIST_CONFIRM_PATH)
    expect(url).toContain('email=support%40sceneflowai.studio')
    expect(url).toContain('token=')
    expect(url).toContain('exp=')
  })

  it('treats lastSentAt within 60s as cooldown', () => {
    const now = Date.now()
    expect(isWithinResendCooldown(new Date(now - 1_000).toISOString(), now)).toBe(true)
    expect(
      isWithinResendCooldown(new Date(now - WAITLIST_RESEND_COOLDOWN_MS - 1).toISOString(), now)
    ).toBe(false)
  })
})

describe('POST /api/waitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    hasBlobMock.mockReturnValue(true)
    listMock.mockResolvedValue({ blobs: [] } as never)
    putMock.mockResolvedValue({} as never)
    fetchJsonMock.mockResolvedValue(null)
    sendEmailMock.mockResolvedValue(undefined)
  })

  it('returns 400 for an invalid email and does not send', async () => {
    const res = await POST(jsonRequest({ email: 'not-an-email', source: 'hero' }))
    expect(res.status).toBe(400)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('sends one confirmation with Reply-To support and a confirm link', async () => {
    const res = await POST(
      jsonRequest({ email: 'support@sceneflowai.studio', source: 'confirm-test' })
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.emailed).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.to).toBe('support@sceneflowai.studio')
    expect(payload.subject).toBe(WAITLIST_CONFIRM_SUBJECT)
    expect(payload.replyTo).toBe(LEGAL_SUPPORT_EMAIL)
    expect(String(payload.html)).toContain(WAITLIST_CONFIRM_PATH)
    expect(String(payload.text)).toContain(WAITLIST_CONFIRM_PATH)
    expect(payload.from).toContain('support@sceneflowai.studio')
    expect(getResendFromEmail()).toContain('support@sceneflowai.studio')
  })

  it('skips a second send during cooldown', async () => {
    listMock.mockResolvedValue({
      blobs: [{ pathname: 'waitlist/launch-november-2026/abc.json', url: 'https://blob.test/w' }],
    } as never)
    fetchJsonMock.mockResolvedValue({
      email: 'support@sceneflowai.studio',
      source: 'hero',
      createdAt: new Date().toISOString(),
      status: 'pending',
      lastSentAt: new Date().toISOString(),
    })

    const res = await POST(jsonRequest({ email: 'support@sceneflowai.studio', source: 'hero' }))
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('does not send when the address is already confirmed', async () => {
    listMock.mockResolvedValue({
      blobs: [{ pathname: 'waitlist/launch-november-2026/abc.json', url: 'https://blob.test/w' }],
    } as never)
    fetchJsonMock.mockResolvedValue({
      email: 'support@sceneflowai.studio',
      source: 'hero',
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    })

    const res = await POST(jsonRequest({ email: 'support@sceneflowai.studio' }))
    expect(res.status).toBe(200)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('returns 200 emailed:false after persist when Resend rejects the support From', async () => {
    sendEmailMock.mockRejectedValue(
      new Error('Failed to send email (403): {"message":"The sceneflowai.studio domain is not verified."}')
    )
    const res = await POST(jsonRequest({ email: 'support@sceneflowai.studio' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.emailed).toBe(false)
    expect(putMock).toHaveBeenCalledTimes(1)
  })
})

describe('confirmWaitlistEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasBlobMock.mockReturnValue(true)
    listMock.mockResolvedValue({ blobs: [] } as never)
    putMock.mockResolvedValue({} as never)
    fetchJsonMock.mockResolvedValue(null)
  })

  it('marks a valid token as confirmed', async () => {
    const email = 'support@sceneflowai.studio'
    const { token, exp } = buildConfirmUrl(email)
    const result = await confirmWaitlistEmail(email, token, String(exp))
    expect(result).toBe('confirmed')
    expect(putMock).toHaveBeenCalled()
    const body = JSON.parse(String(putMock.mock.calls[0][1]))
    expect(body.status).toBe('confirmed')
  })

  it('returns already when the record is confirmed', async () => {
    const email = 'support@sceneflowai.studio'
    const { token, exp } = buildConfirmUrl(email)
    listMock.mockResolvedValue({
      blobs: [{ pathname: 'waitlist/launch-november-2026/abc.json', url: 'https://blob.test/w' }],
    } as never)
    fetchJsonMock.mockResolvedValue({
      email,
      source: 'hero',
      createdAt: new Date().toISOString(),
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    })
    expect(await confirmWaitlistEmail(email, token, String(exp))).toBe('already')
  })
})

describe('notify copy and public confirm route', () => {
  it('asks visitors to confirm before they are on the list', () => {
    expect(NOTIFY_COPY.successTitle).toBe('Check your inbox.')
    expect(NOTIFY_COPY.successBody).toContain('confirmation link')
    expect(NOTIFY_COPY.confirmTitle).toBe('You’re on the list.')
  })

  it('keeps /notify/confirm off the app chrome', () => {
    expect(isPublicRoute('/notify/confirm')).toBe(true)
    const page = readFileSync(
      join(process.cwd(), 'src/app/notify/confirm/page.tsx'),
      'utf8'
    )
    expect(page).toContain('confirmWaitlistEmail')
  })
})

describe('waitlist admin helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasBlobMock.mockReturnValue(true)
    listMock.mockResolvedValue({ blobs: [], hasMore: false } as never)
    fetchJsonMock.mockResolvedValue(null)
  })

  it('skips the campaign blob when listing waitlist records', async () => {
    expect(isWaitlistRecordPath(WAITLIST_CAMPAIGN_PATH)).toBe(false)
    listMock.mockResolvedValue({
      blobs: [
        { pathname: WAITLIST_CAMPAIGN_PATH, url: 'https://blob.test/campaign' },
        { pathname: 'waitlist/launch-november-2026/aaa.json', url: 'https://blob.test/a' },
      ],
      hasMore: false,
    } as never)
    fetchJsonMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/campaign')) return { subject: 'ignore' }
      return {
        email: 'alex@studio.com',
        source: 'hero',
        createdAt: '2026-09-01T00:00:00.000Z',
        status: 'pending',
      }
    })

    const records = await listWaitlistRecords()
    expect(records).toHaveLength(1)
    expect(records[0].email).toBe('alex@studio.com')
    expect(fetchJsonMock).not.toHaveBeenCalledWith('https://blob.test/campaign')
  })

  it('filters pending, confirmed, and notified rows', () => {
    const records = [
      {
        email: 'pending@studio.com',
        source: 'hero',
        createdAt: '2026-09-01T00:00:00.000Z',
        status: 'pending' as const,
      },
      {
        email: 'ready@studio.com',
        source: 'hero',
        createdAt: '2026-09-02T00:00:00.000Z',
        status: 'confirmed' as const,
        confirmedAt: '2026-09-02T01:00:00.000Z',
      },
      {
        email: 'sent@studio.com',
        source: 'hero',
        createdAt: '2026-09-03T00:00:00.000Z',
        status: 'confirmed' as const,
        confirmedAt: '2026-09-03T01:00:00.000Z',
        launchNotifiedAt: '2026-09-04T00:00:00.000Z',
      },
    ]

    expect(filterWaitlistRecords(records, 'pending').map((row) => row.email)).toEqual([
      'pending@studio.com',
    ])
    expect(filterWaitlistRecords(records, 'confirmed').map((row) => row.email)).toEqual([
      'ready@studio.com',
      'sent@studio.com',
    ])
    expect(filterWaitlistRecords(records, 'notified').map((row) => row.email)).toEqual([
      'sent@studio.com',
    ])
  })

  it('selects only confirmed addresses that have not been notified', () => {
    const records = [
      {
        email: 'pending@studio.com',
        source: 'hero',
        createdAt: '2026-09-01T00:00:00.000Z',
        status: 'pending' as const,
      },
      {
        email: 'already@studio.com',
        source: 'hero',
        createdAt: '2026-09-02T00:00:00.000Z',
        status: 'confirmed' as const,
        launchNotifiedAt: '2026-09-04T00:00:00.000Z',
      },
      {
        email: 'ready@studio.com',
        source: 'hero',
        createdAt: '2026-09-03T00:00:00.000Z',
        status: 'confirmed' as const,
      },
    ]

    const all = selectLaunchBatch(records)
    expect(all.recipients.map((row) => row.email)).toEqual(['ready@studio.com'])
    expect(all.skipped).toBe(2)

    const pendingOnly = selectLaunchBatch(records, { email: 'pending@studio.com' })
    expect(pendingOnly.recipients).toEqual([])

    const notifiedOnly = selectLaunchBatch(records, { email: 'already@studio.com' })
    expect(notifiedOnly.recipients).toEqual([])
  })

  it('pages launch send-all so later batches are not dropped', () => {
    const records = ['a@studio.com', 'b@studio.com', 'c@studio.com'].map((email) => ({
      email,
      source: 'hero',
      createdAt: '2026-09-01T00:00:00.000Z',
      status: 'confirmed' as const,
    }))
    const first = selectLaunchBatch(records, { limit: 1 })
    expect(first.recipients.map((row) => row.email)).toEqual(['a@studio.com'])
    expect(first.remaining).toBe(2)
    expect(nextLaunchAllCursor(first.remaining, first.nextCursor)).toBe('a@studio.com')

    const second = selectLaunchBatch(records, { cursor: first.nextCursor!, limit: 1 })
    expect(second.recipients.map((row) => row.email)).toEqual(['b@studio.com'])
    expect(nextLaunchAllCursor(second.remaining, second.nextCursor)).toBe('b@studio.com')

    const third = selectLaunchBatch(records, { cursor: second.nextCursor!, limit: 1 })
    expect(third.recipients.map((row) => row.email)).toEqual(['c@studio.com'])
    expect(third.remaining).toBe(0)
    expect(nextLaunchAllCursor(third.remaining, third.nextCursor)).toBeUndefined()
  })

  it('defaults the launch campaign subject and uses the support From', () => {
    const campaign = getDefaultLaunchCampaign()
    expect(campaign.subject).toBe(WAITLIST_LAUNCH_SUBJECT)
    expect(campaign.text).toContain('November 2026')
    expect(getResendFromEmail()).toContain('support@sceneflowai.studio')
  })
})
