import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  loadPremiereScreeningForEmbed,
  PremiereScreeningLoadError,
} from '@/lib/premiere/premiereScreeningEmbedLoader'
import { getLandingScreeningShareHref } from '@/config/landingSamples'

describe('getLandingScreeningShareHref', () => {
  it('returns null when premiereScreeningId is not configured', () => {
    expect(getLandingScreeningShareHref()).toBeNull()
  })
})

describe('loadPremiereScreeningForEmbed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads premiere video payload from screening APIs', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/video') && init?.method !== 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            screeningType: 'premiere',
            videoUrl: 'https://example.com/animatic.mp4',
            title: 'Express animatic',
            description: 'Demo cut',
            feedbackEnabled: true,
            collectBiometrics: false,
            collectDemographics: false,
          }),
          { status: 200 }
        )
      }
      if (url.endsWith('/session') && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, sessionId: 'session-abc' }), {
          status: 200,
        })
      }
      return new Response(
        JSON.stringify({
          success: true,
          screening: {
            id: 'premiere-demo-1',
            title: 'Express animatic',
            requiresPassword: false,
          },
        }),
        { status: 200 }
      )
    })

    const result = await loadPremiereScreeningForEmbed('premiere-demo-1', fetchMock as typeof fetch)

    expect(result.videoUrl).toBe('https://example.com/animatic.mp4')
    expect(result.title).toBe('Express animatic')
    expect(result.screeningId).toBe('premiere-demo-1')
    expect(result.sessionId).toBe('session-abc')
  })

  it('throws when screening is not found', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))

    await expect(loadPremiereScreeningForEmbed('premiere-missing', fetchMock as typeof fetch)).rejects.toMatchObject({
      status: 404,
    })
    await expect(loadPremiereScreeningForEmbed('premiere-missing', fetchMock as typeof fetch)).rejects.toBeInstanceOf(
      PremiereScreeningLoadError
    )
  })

  it('rejects password-protected screenings for embed', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            screening: { requiresPassword: true, title: 'Private' },
          }),
          { status: 200 }
        )
    )

    await expect(loadPremiereScreeningForEmbed('premiere-private', fetchMock as typeof fetch)).rejects.toMatchObject({
      status: 401,
    })
  })
})
