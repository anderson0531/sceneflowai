import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatResendError,
  getResendFallbackFromEmail,
  getResendFromEmail,
  isUnverifiedDomainError,
  sendEmail,
} from '@/lib/email/resendClient'

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

  it('uses a non-noreply RESEND_FROM_EMAIL as the unverified-domain fallback', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'Brian <brian@sfai.studio>')
    expect(getResendFallbackFromEmail()).toBe('Brian <brian@sfai.studio>')
    expect(getResendFromEmail()).toContain('noreply@sceneflowai.studio')
  })

  it('prefers RESEND_FALLBACK_FROM over other fallbacks', () => {
    vi.stubEnv('RESEND_FROM_EMAIL', 'Brian <brian@sfai.studio>')
    vi.stubEnv('RESEND_FALLBACK_FROM', 'SceneFlow <hello@sfai.studio>')
    expect(getResendFallbackFromEmail()).toBe('SceneFlow <hello@sfai.studio>')
  })

  it('extracts Resend domain-not-verified errors', () => {
    const error = new Error(
      'Failed to send email (403): {"statusCode":403,"message":"The sceneflowai.studio domain is not verified. Please, add and verify your domain on https://resend.com/domains","name":"validation_error"}'
    )
    expect(isUnverifiedDomainError(error)).toBe(true)
    expect(formatResendError(error)).toContain('domain is not verified')
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

  it('retries admin sends from the fallback sender when the official domain is unverified', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Brian <brian@sfai.studio>')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () =>
          '{"statusCode":403,"message":"The sceneflowai.studio domain is not verified. Please, add and verify your domain on https://resend.com/domains","name":"validation_error"}',
      })
      .mockResolvedValueOnce({ ok: true, text: async () => '' })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendEmail({
      to: 'anderson0531@gmail.com',
      subject: 'SceneFlow access opens November 2026',
      html: '<p>Launch</p>',
      allowFallbackFrom: true,
    })

    expect(result).toEqual({ from: 'Brian <brian@sfai.studio>', usedFallback: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as { from: string }
    const second = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as { from: string }
    expect(first.from).toContain('noreply@sceneflowai.studio')
    expect(second.from).toBe('Brian <brian@sfai.studio>')
  })

  it('does not retry public sends when the official domain is unverified', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Brian <brian@sfai.studio>')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () =>
        '{"statusCode":403,"message":"The sceneflowai.studio domain is not verified. Please, add and verify your domain on https://resend.com/domains","name":"validation_error"}',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      sendEmail({
        to: 'alex@studio.com',
        subject: 'Confirm your SceneFlow launch notification',
        html: '<p>Confirm</p>',
      })
    ).rejects.toThrow('domain is not verified')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
