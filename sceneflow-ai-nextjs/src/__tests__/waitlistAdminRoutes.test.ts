import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin/requireAdmin', () => ({
  requireAdminSession: vi.fn(),
}))

vi.mock('@/lib/email/waitlistAdmin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email/waitlistAdmin')>()
  return {
    ...actual,
    listWaitlistRecords: vi.fn(),
    readLaunchCampaign: vi.fn(),
    writeLaunchCampaign: vi.fn(),
    sendLaunchNotification: vi.fn(),
    markLaunchNotified: vi.fn(),
    resendWaitlistConfirmation: vi.fn(),
  }
})

vi.mock('@/lib/email/waitlistConfirm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/email/waitlistConfirm')>()
  return {
    ...actual,
    readWaitlistRecord: vi.fn(),
  }
})

import { requireAdminSession } from '@/lib/admin/requireAdmin'
import {
  listWaitlistRecords,
  markLaunchNotified,
  readLaunchCampaign,
  sendLaunchNotification,
} from '@/lib/email/waitlistAdmin'
import { readFileSync } from 'fs'
import { join } from 'path'
import { GET as getWaitlist } from '@/app/api/admin/waitlist/route'
import { GET as getCampaign } from '@/app/api/admin/waitlist/campaign/route'
import { POST as postAction } from '@/app/api/admin/waitlist/actions/route'

const requireAdminMock = vi.mocked(requireAdminSession)
const listMock = vi.mocked(listWaitlistRecords)
const readCampaignMock = vi.mocked(readLaunchCampaign)
const sendLaunchMock = vi.mocked(sendLaunchNotification)
const markNotifiedMock = vi.mocked(markLaunchNotified)

function actionRequest(body: unknown) {
  return new Request('http://localhost/api/admin/waitlist/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('admin waitlist routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readCampaignMock.mockResolvedValue({
      subject: 'SceneFlow access opens November 2026',
      html: '<p>Launch</p>',
      text: 'Launch',
    })
  })

  it('returns 403 for list, campaign, and actions without an admin session', async () => {
    requireAdminMock.mockResolvedValue({ authorized: false, email: null })

    const listRes = await getWaitlist(new Request('http://localhost/api/admin/waitlist'))
    const campaignRes = await getCampaign()
    const actionRes = await postAction(actionRequest({ action: 'test-launch' }))

    expect(listRes.status).toBe(403)
    expect(campaignRes.status).toBe(403)
    expect(actionRes.status).toBe(403)
    expect(listMock).not.toHaveBeenCalled()
  })

  it('skips pending and already-notified addresses on send-launch', async () => {
    requireAdminMock.mockResolvedValue({ authorized: true, email: 'anderson0531@gmail.com' })
    listMock.mockResolvedValue([
      {
        email: 'pending@studio.com',
        source: 'hero',
        createdAt: '2026-09-01T00:00:00.000Z',
        status: 'pending',
      },
      {
        email: 'sent@studio.com',
        source: 'hero',
        createdAt: '2026-09-02T00:00:00.000Z',
        status: 'confirmed',
        launchNotifiedAt: '2026-09-04T00:00:00.000Z',
      },
    ])

    const pending = await postAction(
      actionRequest({ action: 'send-launch', email: 'pending@studio.com' })
    )
    const notified = await postAction(
      actionRequest({ action: 'send-launch', email: 'sent@studio.com' })
    )

    expect(pending.status).toBe(200)
    expect(await pending.json()).toMatchObject({ sent: 0, reason: 'pending' })
    expect(notified.status).toBe(200)
    expect(await notified.json()).toMatchObject({ sent: 0, reason: 'already_notified' })
    expect(sendLaunchMock).not.toHaveBeenCalled()
    expect(markNotifiedMock).not.toHaveBeenCalled()
  })

  it('mounts the launch email card on Settings Admin', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/dashboard/settings/admin/page.tsx'), 'utf8')
    expect(page).toContain('LaunchEmailCard')
  })

  it('returns the support From on the campaign preview', async () => {
    requireAdminMock.mockResolvedValue({ authorized: true, email: 'anderson0531@gmail.com' })
    const res = await getCampaign()
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.from).toContain('support@sceneflowai.studio')
    expect(data.confirmation.subject).toContain('Confirm')
    expect(data.campaign.subject).toContain('November 2026')
  })
})
