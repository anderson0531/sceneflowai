import { afterEach, describe, expect, it, vi } from 'vitest'
import { getResendFromEmail, sendEmail } from '@/lib/email/resendClient'

describe('resendClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('keeps From on noreply@sceneflowai.studio', () => {
    expect(getResendFromEmail()).toContain('noreply@sceneflowai.studio')
  })

  it('sends reply_to to Resend when replyTo is set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' })
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail({
      to: 'support@sceneflowai.studio',
      subject: 'Confirm your SceneFlow launch notification',
      html: '<p>Confirm</p>',
      text: 'Confirm',
      replyTo: 'support@sceneflowai.studio',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Record<string, unknown>
    expect(body.from).toContain('noreply@sceneflowai.studio')
    expect(body.reply_to).toBe('support@sceneflowai.studio')
    expect(body.to).toEqual(['support@sceneflowai.studio'])
  })
})
