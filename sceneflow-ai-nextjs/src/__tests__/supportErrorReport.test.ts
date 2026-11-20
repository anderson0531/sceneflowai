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
  redactSensitiveDiagnostics,
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

  it('scrubs bearer tokens, API keys, secrets, and auth query params from diagnostics', () => {
    const dirty =
      'Auth failed: Bearer eyJhbGciOiJIUzI1NiJ9.secret with key AIzaSyD1234567890abcdefghijklmno and sk_live_1234567890abcdef at https://sceneflowai.studio/s/abc?token=topsecret123&view=screening'
    const clean = redactSensitiveDiagnostics(dirty)
    expect(clean).toBeDefined()
    expect(clean).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(clean).not.toContain('AIzaSyD1234567890')
    expect(clean).not.toContain('sk_live_1234567890')
    expect(clean).not.toContain('topsecret123')
    expect(clean).toContain('[REDACTED]')
    expect(clean).toContain('[REDACTED_API_KEY]')
    expect(clean).toContain('[REDACTED_SECRET]')
    expect(clean).toContain('view=screening')
  })

  it('records escalated Still/Clip reports, emails support & creator confirmation, and sends resolution notice from Admin API', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    sendEmailMock.mockResolvedValue({
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
          technicalDetails:
            'Vertex AI error 500 with Bearer secret_token_xyz12345: {"error":{"code":500,"message":"Internal error encountered"}}',
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
    expect(postJson.confirmationEmailSent).toBe(true)

    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    const supportEmailArgs = sendEmailMock.mock.calls[0]?.[0]
    expect(supportEmailArgs.to).toBe('support@sceneflowai.studio')
    expect(supportEmailArgs.replyTo).toBe('filmmaker@studio.test')
    expect(supportEmailArgs.subject).toContain(postJson.ticketId)
    expect(supportEmailArgs.text).not.toContain('secret_token_xyz12345')

    const confirmEmailArgs = sendEmailMock.mock.calls[1]?.[0]
    expect(confirmEmailArgs.to).toBe('filmmaker@studio.test')
    expect(confirmEmailArgs.subject).toContain(postJson.ticketId)

    // Non-admin cannot list escalations
    getServerSessionMock.mockResolvedValueOnce({
      user: { email: 'filmmaker@studio.test' },
    })
    const forbiddenRes = await listAdminReports(
      new NextRequest('https://sceneflowai.studio/api/admin/support-reports')
    )
    expect(forbiddenRes.status).toBe(403)

    // Admin can list and resolve the ticket with a resolution note
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
        body: JSON.stringify({
          ticketId: postJson.ticketId,
          status: 'resolved',
          resolutionNote: 'Fixed retry timeout on Vertex Veo clip pipeline.',
        }),
      })
    )
    expect(patchRes.status).toBe(200)
    const patchJson = await patchRes.json()
    expect(patchJson.report.status).toBe('resolved')
    expect(patchJson.report.resolvedBy).toBe('brian@sceneflowai.studio')
    expect(patchJson.report.resolutionNote).toContain('Fixed retry timeout')
    expect(patchJson.report.resolutionEmailSent).toBe(true)

    expect(sendEmailMock).toHaveBeenCalledTimes(3)
    const resolutionArgs = sendEmailMock.mock.calls[2]?.[0]
    expect(resolutionArgs.to).toBe('filmmaker@studio.test')
    expect(resolutionArgs.text).toContain('Fixed retry timeout')
  })
})
