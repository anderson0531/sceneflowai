import { readFileSync } from 'fs'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { getYouTubeAuthUrl, youtubeOAuthCredentials, youtubeRedirectUri } from '@/lib/publish/youtubeClient'

const ENV_KEYS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'AUTH_GOOGLE_ID',
  'AUTH_GOOGLE_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI',
  'NEXT_PUBLIC_APP_URL',
  'NEXTAUTH_URL',
  'VERCEL_URL',
] as const

const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('youtube OAuth config', () => {
  it('trims the client pair and falls through known aliases', () => {
    clearEnv()
    process.env.GOOGLE_OAUTH_CLIENT_ID = '  oauth-id  '
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = ' oauth-secret '
    expect(youtubeOAuthCredentials()).toEqual({ clientId: 'oauth-id', clientSecret: 'oauth-secret' })

    clearEnv()
    process.env.GOOGLE_CLIENT_ID = ' client-id '
    process.env.GOOGLE_CLIENT_SECRET = ' client-secret '
    expect(youtubeOAuthCredentials()).toEqual({ clientId: 'client-id', clientSecret: 'client-secret' })

    clearEnv()
    process.env.AUTH_GOOGLE_ID = ' auth-id '
    process.env.AUTH_GOOGLE_SECRET = ' auth-secret '
    expect(youtubeOAuthCredentials()).toEqual({ clientId: 'auth-id', clientSecret: 'auth-secret' })
  })

  it('throws when no client id and secret are set', () => {
    clearEnv()
    expect(() => youtubeOAuthCredentials()).toThrow(/not configured/)
  })

  it('uses the public app URL instead of the deployment host', () => {
    clearEnv()
    process.env.NEXT_PUBLIC_APP_URL = 'https://sceneflowai.studio/'
    process.env.VERCEL_URL = 'sceneflow-ai-nextjs-abc.vercel.app'
    expect(youtubeRedirectUri()).toBe('https://sceneflowai.studio/api/auth/callback/youtube')
  })

  it('uses the request host when no explicit redirect is set', () => {
    clearEnv()
    process.env.NEXT_PUBLIC_APP_URL = 'https://sceneflowai.studio'
    expect(youtubeRedirectUri('https://sceneflow-ai-nextjs.vercel.app')).toBe(
      'https://sceneflow-ai-nextjs.vercel.app/api/auth/callback/youtube'
    )
  })

  it('keeps an explicit redirect ahead of the request host', () => {
    clearEnv()
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://sceneflowai.studio/api/auth/callback/youtube'
    process.env.VERCEL_URL = 'sceneflow-ai-nextjs-abc.vercel.app'
    expect(youtubeRedirectUri('https://sceneflow-ai-nextjs.vercel.app')).toBe(
      'https://sceneflowai.studio/api/auth/callback/youtube'
    )
  })

  it('puts that callback on the Google auth URL', () => {
    clearEnv()
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'oauth-id'
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'oauth-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://sceneflowai.studio'
    process.env.VERCEL_URL = 'sceneflow-ai-nextjs-abc.vercel.app'
    const url = new URL(getYouTubeAuthUrl('state-1'))
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://sceneflowai.studio/api/auth/callback/youtube'
    )
    expect(url.searchParams.get('redirect_uri')).not.toContain('sceneflow-ai-nextjs-abc.vercel.app')
  })

  it('does not store the connect redirects', () => {
    const auth = readFileSync(
      path.join(process.cwd(), 'src/app/api/publish/youtube/auth/route.ts'),
      'utf8'
    )
    const worker = readFileSync(path.join(process.cwd(), 'src/sw.ts'), 'utf8')
    expect(auth).toContain('req.nextUrl.origin')
    expect(auth).toContain("Cache-Control': 'no-store'")
    expect(auth).toContain("dest.searchParams.set('youtube', 'not_configured')")
    expect(worker).toContain('skipWaiting: true')
    expect(worker).toContain('/api/publish/youtube/auth')
    expect(worker).toContain('/api/auth/callback/youtube')
    expect(worker).toContain('/api/publish/youtube/callback')
    const client = readFileSync(path.join(process.cwd(), 'src/lib/publish/youtubeClient.ts'), 'utf8')
    expect(client).toContain('process.env.GOOGLE_OAUTH_CLIENT_ID')
    expect(client).toContain('process.env.GOOGLE_OAUTH_CLIENT_SECRET')
    expect(client).toContain("'/api/auth/callback/youtube'")
    const callback = readFileSync(
      path.join(process.cwd(), 'src/app/api/auth/callback/youtube/route.ts'),
      'utf8'
    )
    const alias = readFileSync(
      path.join(process.cwd(), 'src/app/api/publish/youtube/callback/route.ts'),
      'utf8'
    )
    expect(callback).toContain('handleYouTubeOAuthCallback')
    expect(alias).toContain('handleYouTubeOAuthCallback')
  })
})
