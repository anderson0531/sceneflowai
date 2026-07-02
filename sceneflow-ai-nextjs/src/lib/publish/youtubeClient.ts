/**
 * YouTube OAuth + upload client for SceneFlow Publish.
 *
 * Multi-Language Audio (MLA):
 * - Requires channel advanced-features access (YouTube rolls out gradually).
 * - OAuth scope `youtube.force-ssl` is required for audiotracks API.
 * - Users who connected before MLA support must reconnect to grant the new scope.
 */
import { OAuth2Client } from 'google-auth-library'
import { EncryptionService } from '@/services/EncryptionService'
import UserIntegration from '@/models/UserIntegration'

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl',
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

/** Map SceneFlow language codes to BCP-47 for YouTube MLA */
const BCP47_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  it: 'it-IT',
  nl: 'nl-NL',
  ru: 'ru-RU',
  pl: 'pl-PL',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar-SA',
  he: 'he-IL',
  hi: 'hi-IN',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  sv: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  no: 'nb-NO',
  cs: 'cs-CZ',
  uk: 'uk-UA',
  ro: 'ro-RO',
  hu: 'hu-HU',
  el: 'el-GR',
  fil: 'fil-PH',
  ms: 'ms-MY',
}

export function toBcp47(lang: string): string {
  if (lang.includes('-')) return lang
  return BCP47_MAP[lang] || `${lang}-${lang.toUpperCase()}`
}

export class MlaNotAvailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MlaNotAvailableError'
  }
}

export async function uploadAudioTrackToYouTube(
  userId: string,
  options: {
    videoId: string
    languageCode: string
    audioUrl: string
  }
): Promise<{ audioTrackId?: string }> {
  const client = await getAuthorizedYouTubeClient(userId)
  if (!client) {
    throw new Error('YouTube account not connected. Please authorize first.')
  }

  const { token } = await client.getAccessToken()
  if (!token) throw new Error('YouTube access token unavailable')

  const bcp47 = toBcp47(options.languageCode)

  const audioRes = await fetch(options.audioUrl)
  if (!audioRes.ok) {
    throw new Error(`Failed to fetch audio for MLA upload: ${audioRes.status}`)
  }
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

  const initUrl = new URL('https://www.googleapis.com/upload/youtube/v3/audiotracks')
  initUrl.searchParams.set('uploadType', 'resumable')
  initUrl.searchParams.set('part', 'snippet')
  initUrl.searchParams.set('videoId', options.videoId)
  initUrl.searchParams.set('languageCode', bcp47)

  const initRes = await fetch(initUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'audio/mpeg',
      'X-Upload-Content-Length': String(audioBuffer.length),
    },
    body: JSON.stringify({
      snippet: {
        videoId: options.videoId,
        language: bcp47,
      },
    }),
  })

  if (initRes.status === 403 || initRes.status === 401) {
    const errText = await initRes.text()
    throw new MlaNotAvailableError(
      `YouTube Multi-Language Audio is not available for this channel (${initRes.status}). ${errText}`
    )
  }

  if (!initRes.ok) {
    const errText = await initRes.text()
    const lower = errText.toLowerCase()
    if (
      initRes.status === 400 &&
      (lower.includes('not enabled') ||
        lower.includes('not available') ||
        lower.includes('permission'))
    ) {
      throw new MlaNotAvailableError(`MLA not enabled: ${errText}`)
    }
    throw new Error(`YouTube audio track init failed: ${initRes.status} ${errText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube did not return an audio upload URL')

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.length),
    },
    body: audioBuffer,
  })

  if (uploadRes.status === 403) {
    const errText = await uploadRes.text()
    throw new MlaNotAvailableError(`MLA upload denied: ${errText}`)
  }

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    throw new Error(`YouTube audio track upload failed: ${uploadRes.status} ${errText}`)
  }

  const data = (await uploadRes.json()) as { id?: string }
  return { audioTrackId: data.id }
}
