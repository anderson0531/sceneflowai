/**
 * TikTok Content Posting via PULL_FROM_URL.
 * Requires TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.
 * Apps that have not passed TikTok's audit can only post as private.
 */
import { EncryptionService } from '@/services/EncryptionService'
import UserIntegration from '@/models/UserIntegration'

export type TikTokTokens = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  open_id?: string
  scope?: string
}

function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function tiktokRedirectUri(): string {
  return process.env.TIKTOK_OAUTH_REDIRECT_URI || `${appBaseUrl()}/api/publish/tiktok/callback`
}

export function tiktokConfigured(): boolean {
  return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET)
}

function requireTikTokConfig(): { clientKey: string; clientSecret: string } {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) {
    throw new Error('TikTok publishing is not configured (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET)')
  }
  return { clientKey, clientSecret }
}

export function getTikTokAuthUrl(state: string): string {
  const { clientKey } = requireTikTokConfig()
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: 'user.info.basic,video.publish',
    response_type: 'code',
    redirect_uri: tiktokRedirectUri(),
    state,
  })
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
}

export async function exchangeTikTokCode(code: string): Promise<TikTokTokens> {
  const { clientKey, clientSecret } = requireTikTokConfig()
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: tiktokRedirectUri(),
  })
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as TikTokTokens & {
    error?: string
    error_description?: string
    data?: TikTokTokens
  }
  const tokens = json.access_token ? json : json.data
  if (!res.ok || !tokens?.access_token) {
    throw new Error(json.error_description || json.error || 'TikTok token exchange failed')
  }
  return tokens
}

export async function saveTikTokTokens(userId: string, tokens: TikTokTokens): Promise<void> {
  const encrypted = EncryptionService.encrypt(JSON.stringify(tokens))
  const [row] = await UserIntegration.findOrCreate({
    where: { user_id: userId, provider: 'tiktok' },
    defaults: {
      user_id: userId,
      provider: 'tiktok',
      encrypted_credentials: encrypted,
      is_valid: true,
    },
  })
  if (row) {
    await row.update({ encrypted_credentials: encrypted, is_valid: true })
  }
}

export async function loadTikTokTokens(userId: string): Promise<TikTokTokens | null> {
  const row = await UserIntegration.findOne({
    where: { user_id: userId, provider: 'tiktok', is_valid: true },
  })
  if (!row) return null
  try {
    const raw = EncryptionService.decrypt(row.encrypted_credentials)
    return JSON.parse(raw) as TikTokTokens
  } catch {
    return null
  }
}

export async function uploadVideoToTikTok(
  userId: string,
  options: {
    videoUrl: string
    title: string
    privacyStatus?: 'private' | 'unlisted' | 'public'
  }
): Promise<{ publishId: string; privacyLevel: string }> {
  const tokens = await loadTikTokTokens(userId)
  if (!tokens?.access_token) {
    throw new Error('TikTok account not connected. Please authorize first.')
  }

  const privacyLevel = options.privacyStatus === 'public' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY'
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: options.title.slice(0, 2200),
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: options.videoUrl,
      },
    }),
  })
  const json = (await res.json()) as {
    data?: { publish_id?: string }
    error?: { code?: string; message?: string }
  }
  const errorCode = json.error?.code
  const failed = !res.ok || (Boolean(errorCode) && errorCode !== 'ok') || !json.data?.publish_id
  if (failed) {
    const message = json.error?.message || 'TikTok publish failed'
    if (privacyLevel === 'PUBLIC_TO_EVERYONE') {
      throw new Error(
        `${message} Unaudited TikTok apps can only post as private. Choose Private and try again.`
      )
    }
    throw new Error(message)
  }
  return { publishId: json.data.publish_id, privacyLevel }
}
