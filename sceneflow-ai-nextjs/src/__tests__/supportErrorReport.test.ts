import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const getServerSessionMock = vi.fn()
const sendEmailMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/email/resendClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email/resendClient')>(
    '@/lib/email/resendClient'
  )
  return {
    ...actual,
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
  }
})

import { POST as submitSupportReport } from '@/app/api/support/report-generation-error/route'
import {
  GET as listAdminReports,
  PATCH as patchAdminReport,
} from '@/app/api/admin/support-reports/route'
import {
  buildSupportEscalationEmailContent,
  generateSupportTicketId,
} from '@/lib/support/generationErrorReport'

describe('Customer Support Generation Error Escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('formats traceable ticket IDs and escaped HTML escalation emails', () => {
    const ticketId = generateSupportTicketId(new Date('2026-11-10T04:00:00Z'))
    expect(ticketId).toMatch(/^SF-261110-[0-9A-F]{4}$/)

    const email = buildSupportEscalationEmailContent({
      ticketId: 'SF-261110-ABCD',
      createdAt: '2026-11-10T04:00:00.000Z',
      updatedAt: '2026-11-10T04:00:00.000Z',
      status: 'open',
      user: { id: 'u1', email: 'creator@example.com', name: 'Alex Director' },
      mediaType: 'clip',
      category: 'unexpected',
      title: 'Clip Generation Failed',
      explanation: 'An unexpected error interrupted this clip generation.',
      recommendedAction: 'Rerun Clip',
      context: {
        projectId: 'proj-1',
        projectTitle: 'Lake Michigan Storm',
        sceneNumber: 3,
        shotNumber: 4,
        segmentId: 'seg_123',
        provider: 'vertex',
      },
      prompt: 'person [1] steps across <icy> boulders',
      technicalDetails: 'Omni error: {"code":"internal","detail":"<boom>"}',
      userNote: 'Failed twice after clicking Rerun.',
      emailSent: false,
    })

    expect(email.subject).toContain('SF-261110-ABCD')
    expect(email.subject).toContain('creator@example.com')
    expect(email.html).toContain('&lt;icy&gt;')
    expect(email.html).toContain('&lt;boom&gt;')
    expect(email.html).toContain('Failed twice after clicking Rerun.')
    expect(email.text).toContain('Scene 3 · Shot 4')
  })

  it('rejects unauthenticated report submissions with 401', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)

    const req = new NextRequest('https://sceneflowai.studio/api/support/report-generation-error', {
      method: 'POST',
      body: JSON.stringify({ mediaType: 'clip', rawError: 'Boom' }),
    })
    const res = await submitSupportReport(req)
    expect(res.status).toBe(401)
  })

  it('records escalated Still/Clip reports, emails support@sceneflowai.studio, and surfaces in Admin API', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    sendEmailMock.mockResolvedValueOnce({
      from: 'SceneFlow Studio <support@sceneflowai.studio>',
      usedFallback: false,
    })

    getServerSessionMock.mockResolvedValueOnce({
      user: { id: 'user-42', email: 'filmmaker@studio.test', name: 'Piper' },
    })

    const postReq = new NextRequest(
      'https://sceneflowai.studio/api/support/report-generation-error',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-agent': 'VitestBrowser/1.0' },
        body: JSON.stringify({
          mediaType: 'clip',
          rawError: 'Vertex AI error 500: Internal error encountered',
          technicalDetails: 'Vertex AI error 500: {"error":{"code":500,"message":"Internal error encountered"}}',
          prompt: 'Wide shot of Lake Michigan seawall in blizzard',
          userNote: 'Tried rerunning Shot 2 twice, still failing.',
          context: {
            projectId: 'proj-seawall',
            projectTitle: 'Seawall',
            sceneNumber: 1,
            shotNumber: 2,
            segmentId: 'seg-2',
            generationMethod: 'REF',
            provider: 'vertex',
          },
        }),
      }
    )

    const postRes = await submitSupportReport(postReq)
    expect(postRes.status).toBe(200)
    const postJson = await postRes.json()
    expect(postJson.success).toBe(true)
    expect(postJson.ticketId).toMatch(/^SF-\d{6}-[0-9A-F]{4}$/)
    expect(postJson.emailSent).toBe(true)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const sentArgs = sendEmailMock.mock.calls[0]?.[0]
    expect(sentArgs.to).toBe('support@sceneflowai.studio')
    expect(sentArgs.replyTo).toBe('filmmaker@studio.test')
    expect(sentArgs.subject).toContain(postJson.ticketId)

    // Non-admin cannot list escalations
    getServerSessionMock.mockResolvedValueOnce({
      user: { email: 'filmmaker@studio.test' },
    })
    const forbiddenRes = await listAdminReports(
      new NextRequest('https://sceneflowai.studio/api/admin/support-reports')
    )
    expect(forbiddenRes.status).toBe(403)

    // Admin can list and resolve the ticket
    getServerSessionMock.mockResolvedValue({
      user: { email: 'brian@sceneflowai.studio' },
    })
    const listRes = await listAdminReports(
      new NextRequest('https://sceneflowai.studio/api/admin/support-reports?limit=10')
    )
    expect(listRes.status).toBe(200)
    const listJson = await listRes.json()
    const matching = listJson.reports.find(
      (r: { ticketId: string }) => r.ticketId === postJson.ticketId
    )
    expect(matching).toBeDefined()
    expect(matching.status).toBe('open')
    expect(matching.userNote).toContain('Tried rerunning Shot 2 twice')

    const patchRes = await patchAdminReport(
      new NextRequest('https://sceneflowai.studio/api/admin/support-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: postJson.ticketId, status: 'resolved' }),
      })
    )
    expect(patchRes.status).toBe(200)
    const patchJson = await patchRes.json()
    expect(patchJson.report.status).toBe('resolved')
    expect(patchJson.report.resolvedBy).toBe('brian@sceneflowai.studio')
  })
})
