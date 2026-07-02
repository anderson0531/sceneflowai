import { OAuth2Client } from 'google-auth-library'
import { EncryptionService } from '@/services/EncryptionService'
import UserIntegration from '@/models/UserIntegration'

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
]

export type YouTubeTokens = {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope?: string
  token_type?: string
}

function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/publish/youtube/callback`

  if (!clientId || !clientSecret) {
    throw new Error('YouTube OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET)')
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri)
}

export function getYouTubeAuthUrl(state: string): string {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    state,
  })
}

export async function exchangeYouTubeCode(code: string): Promise<YouTubeTokens> {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens as YouTubeTokens
}

export async function saveYouTubeTokens(userId: string, tokens: YouTubeTokens): Promise<void> {
  const encrypted = EncryptionService.encrypt(JSON.stringify(tokens))
  const [row] = await UserIntegration.findOrCreate({
    where: { user_id: userId, provider: 'youtube' },
    defaults: {
      user_id: userId,
      provider: 'youtube',
      encrypted_credentials: encrypted,
      is_valid: true,
    },
  })
  if (row) {
    await row.update({ encrypted_credentials: encrypted, is_valid: true })
  }
}

export async function loadYouTubeTokens(userId: string): Promise<YouTubeTokens | null> {
  const row = await UserIntegration.findOne({
    where: { user_id: userId, provider: 'youtube', is_valid: true },
  })
  if (!row) return null
  try {
    const raw = EncryptionService.decrypt(row.encrypted_credentials)
    return JSON.parse(raw) as YouTubeTokens
  } catch {
    return null
  }
}

export async function getAuthorizedYouTubeClient(userId: string): Promise<OAuth2Client | null> {
  const tokens = await loadYouTubeTokens(userId)
  if (!tokens?.access_token) return null
  const client = getOAuthClient()
  client.setCredentials(tokens)

  client.on('tokens', async (newTokens) => {
    const merged = { ...tokens, ...newTokens }
    await saveYouTubeTokens(userId, merged)
  })

  return client
}

export async function uploadVideoToYouTube(
  userId: string,
  options: {
    videoUrl: string
    title: string
    description: string
    privacyStatus: 'private' | 'unlisted' | 'public'
    language?: string
  }
): Promise<{ videoId: string; url: string }> {
  const client = await getAuthorizedYouTubeClient(userId)
  if (!client) {
    throw new Error('YouTube account not connected. Please authorize first.')
  }

  const { token } = await client.getAccessToken()
  if (!token) throw new Error('YouTube access token unavailable')

  const videoRes = await fetch(options.videoUrl)
  if (!videoRes.ok) {
    throw new Error(`Failed to fetch video for upload: ${videoRes.status}`)
  }
  const videoBuffer = Buffer.from(await videoRes.arrayBuffer())

  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title: options.title,
          description: options.description,
          defaultLanguage: options.language || 'en',
        },
        status: {
          privacyStatus: options.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  )

  if (!initRes.ok) {
    const errText = await initRes.text()
    throw new Error(`YouTube upload init failed: ${initRes.status} ${errText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL')

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(videoBuffer.length),
    },
    body: videoBuffer,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    throw new Error(`YouTube upload failed: ${uploadRes.status} ${errText}`)
  }

  const data = (await uploadRes.json()) as { id?: string }
  const videoId = data.id
  if (!videoId) throw new Error('YouTube upload succeeded but no video ID returned')

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  }
}
