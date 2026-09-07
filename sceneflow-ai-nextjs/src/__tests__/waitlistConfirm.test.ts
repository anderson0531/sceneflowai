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
    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.to).toBe('support@sceneflowai.studio')
    expect(payload.subject).toBe(WAITLIST_CONFIRM_SUBJECT)
    expect(payload.replyTo).toBe(LEGAL_SUPPORT_EMAIL)
    expect(String(payload.html)).toContain(WAITLIST_CONFIRM_PATH)
    expect(String(payload.text)).toContain(WAITLIST_CONFIRM_PATH)
    expect(getResendFromEmail()).toContain('noreply@sceneflowai.studio')
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

  it('returns 502 when Resend fails', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('Failed to send email'))
    const res = await POST(jsonRequest({ email: 'support@sceneflowai.studio' }))
    const data = await res.json()
    expect(res.status).toBe(502)
    expect(data.code).toBe('email_send_failed')
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
