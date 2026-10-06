import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { FOR_FILMMAKERS_COPY } from '@/config/landing/forFilmmakersCopy'

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

vi.mock('@/lib/admin/requireAdmin', () => ({
  requireAdminSession: vi.fn(),
}))

import { sendEmail } from '@/lib/email/resendClient'
import { fetchPrivateBlobJson, hasPrivateBlobToken } from '@/lib/storage/privateBlob'
import { list, put } from '@vercel/blob'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { POST } from '@/app/api/originals-seed/route'
import { GET as getSeedAdmin } from '@/app/api/admin/originals-seed/route'
import { NextRequest } from 'next/server'
import {
  ORIGINALS_SEED_CONFIRM_PATH,
  ORIGINALS_SEED_CONFIRM_SUBJECT,
  ORIGINALS_SEED_BLOB_PREFIX,
  confirmOriginalsSeedEmail,
  createOriginalsConfirmToken,
  verifyOriginalsConfirmToken,
} from '@/lib/email/originalsSeed'

const sendEmailMock = vi.mocked(sendEmail)
const listMock = vi.mocked(list)
const putMock = vi.mocked(put)
const fetchJsonMock = vi.mocked(fetchPrivateBlobJson)
const hasBlobMock = vi.mocked(hasPrivateBlobToken)
const requireAdminMock = vi.mocked(requireAdminSession)

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/originals-seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  email: 'director@studio.com',
  name: 'Ada Director',
  title: 'Night Bus',
  logline: 'A driver finds a second city under the highway.',
  audienceUrl: 'https://youtube.com/@ada',
  exclusivePremiere: true,
  source: 'for-filmmakers',
}

describe('Originals Seed application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hasBlobMock.mockReturnValue(true)
    listMock.mockResolvedValue({ blobs: [] } as never)
    putMock.mockResolvedValue({} as never)
    fetchJsonMock.mockResolvedValue(null)
    sendEmailMock.mockResolvedValue(undefined)
  })

  it('accepts a fresh HMAC token and rejects expired ones', () => {
    const email = 'director@studio.com'
    const now = Date.now()
    const exp = now + 60_000
    const token = createOriginalsConfirmToken(email, exp)
    expect(verifyOriginalsConfirmToken(email, token, exp, now)).toEqual({ ok: true })
    expect(verifyOriginalsConfirmToken(email, token, exp, exp + 1)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('rejects incomplete or invalid applications', async () => {
    const missing = await POST(jsonRequest({ email: 'director@studio.com' }))
    expect(missing.status).toBe(400)
    const badUrl = await POST(jsonRequest({ ...validBody, audienceUrl: 'not-a-url' }))
    expect(badUrl.status).toBe(400)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('stores a pending application and emails a confirm link', async () => {
    const res = await POST(jsonRequest(validBody))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.emailed).toBe(true)
    expect(putMock).toHaveBeenCalled()
    const storedPath = String(putMock.mock.calls[0][0])
    expect(storedPath.startsWith(ORIGINALS_SEED_BLOB_PREFIX)).toBe(true)
    expect(storedPath).not.toContain('launch-november-2026')
    const payload = sendEmailMock.mock.calls[0][0]
    expect(payload.subject).toBe(ORIGINALS_SEED_CONFIRM_SUBJECT)
    expect(String(payload.html)).toContain(ORIGINALS_SEED_CONFIRM_PATH)
  })

  it('confirms a pending application', async () => {
    const now = Date.now()
    const exp = now + 60_000
    const token = createOriginalsConfirmToken(validBody.email, exp)
    fetchJsonMock.mockResolvedValue({
      ...validBody,
      createdAt: new Date(now).toISOString(),
      status: 'pending',
    })
    const result = await confirmOriginalsSeedEmail(validBody.email, token, String(exp), now)
    expect(result).toBe('confirmed')
  })
})

describe('Originals Seed admin inbox', () => {
  it('returns 403 without an admin session', async () => {
    requireAdminMock.mockResolvedValue({ authorized: false, email: null })
    const res = await getSeedAdmin(new NextRequest('http://localhost/api/admin/originals-seed'))
    expect(res.status).toBe(403)
  })

  it('lists applications for an admin', async () => {
    requireAdminMock.mockResolvedValue({ authorized: true, email: 'anderson0531@gmail.com' })
    listMock.mockResolvedValue({
      blobs: [{ pathname: `${ORIGINALS_SEED_BLOB_PREFIX}abc.json`, url: 'https://blob.test/s' }],
    } as never)
    fetchJsonMock.mockResolvedValue({
      ...validBody,
      createdAt: '2026-10-01T00:00:00.000Z',
      status: 'confirmed',
      confirmedAt: '2026-10-01T01:00:00.000Z',
    })
    const res = await getSeedAdmin(new NextRequest('http://localhost/api/admin/originals-seed'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.counts.confirmed).toBe(1)
    expect(data.items[0].title).toBe('Night Bus')
  })

  it('mounts the Seed inbox on Settings Admin and the landing filmmaker section', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/app/dashboard/settings/admin/page.tsx'),
      'utf8'
    )
    const landing = readFileSync(join(process.cwd(), 'src/app/LandingPageClient.tsx'), 'utf8')
    expect(page).toContain('OriginalsSeedCard')
    expect(landing).toContain('ForFilmmakersSection')
    expect(FOR_FILMMAKERS_COPY.badge).toBe('Apply for the SceneFlow Originals Seed Program')
    expect(FOR_FILMMAKERS_COPY.heading).toContain('For Filmmakers')
    expect(FOR_FILMMAKERS_COPY.subtitle).toContain('Founding Creator')
    expect(FOR_FILMMAKERS_COPY.subtitle).toContain('5 to 10')
  })
})
