import { afterEach, describe, expect, it, vi } from 'vitest'
import { getResendFromEmail, sendEmail } from '@/lib/email/resendClient'

describe('resendClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('defaults From to noreply@sceneflowai.studio', () => {
    expect(getResendFromEmail()).toContain('noreply@sceneflowai.studio')
  })

  it('ignores RESEND_FROM_EMAIL when it is not noreply@sceneflowai.studio', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'Brian <brian@sfai.studio>')
    expect(getResendFromEmail()).toContain('noreply@sceneflowai.studio')
    expect(getResendFromEmail()).not.toContain('brian@sfai.studio')
    vi.stubEnv('RESEND_FROM_EMAIL', 'SceneFlow Support <support@sceneflowai.studio>')
    expect(getResendFromEmail()).toContain('noreply@sceneflowai.studio')
  })

  it('honors RESEND_FROM_EMAIL only for noreply@sceneflowai.studio', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'SceneFlow <noreply@sceneflowai.studio>')
    expect(getResendFromEmail()).toBe('SceneFlow <noreply@sceneflowai.studio>')
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

  it('sends List-Unsubscribe headers to Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' })
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail({
      to: 'alex@studio.com',
      subject: 'SceneFlow access opens November 2026',
      html: '<p>Launch</p>',
      text: 'Launch',
      replyTo: 'support@sceneflowai.studio',
      headers: {
        'List-Unsubscribe': '<https://sceneflowai.studio/api/waitlist/unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Record<string, unknown>
    expect(body.headers).toEqual({
      'List-Unsubscribe': '<https://sceneflowai.studio/api/waitlist/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
  })
})
