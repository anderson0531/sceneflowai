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
import type UserIntegrationModel from '@/models/UserIntegration'

async function getUserIntegrationModel(): Promise<typeof UserIntegrationModel> {
  const mod = await import('@/models/UserIntegration')
  return mod.default
}

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

/** Registered on the Google OAuth web client. The publish callback remains an alias. */
export const YOUTUBE_OAUTH_CALLBACK_PATH = '/api/auth/callback/youtube'

function trimEnv(value: string | undefined): string {
  return value?.trim().replace(/^["']|["']$/g, '').trim() || ''
}

function normalizeStudioOrigin(origin: string): string {
  const cleaned = origin.trim().replace(/\/$/, '')
  if (/^https:\/\/www\.sceneflowai\.studio$/i.test(cleaned)) {
    return 'https://sceneflowai.studio'
  }
  return cleaned
}

/**
 * Parse a Google Cloud Console OAuth client JSON payload (`{"web":{...}}`, `{"installed":{...}}`,
 * or flat `{client_id, client_secret}`) into `{ clientId, clientSecret }`.
 */
export function parseGoogleOAuthClientJson(
  raw: string | undefined | null
): { clientId: string; clientSecret: string } | null {
  const text = raw?.trim()
  if (!text || !text.startsWith('{')) return null
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const container =
      (parsed.web as Record<string, unknown> | undefined) ||
      (parsed.installed as Record<string, unknown> | undefined) ||
      parsed
    const clientId = trimEnv(
      (container.client_id as string | undefined) || (container.clientId as string | undefined)
    )
    const clientSecret = trimEnv(
      (container.client_secret as string | undefined) ||
        (container.clientSecret as string | undefined)
    )
    if (clientId && clientSecret) {
      return { clientId, clientSecret }
    }
  } catch {
    // Not valid JSON
  }
  return null
}

function lookupEnvTrimmedKey(targetKeys: readonly string[]): string {
  const upperTargets = new Set(targetKeys.map((k) => k.toUpperCase()))
  for (const [rawKey, rawVal] of Object.entries(process.env)) {
    if (upperTargets.has(rawKey.trim().toUpperCase())) {
      const val = trimEnv(rawVal)
      if (val) return val
    }
  }
  return ''
}

/** Public site first. VERCEL_URL is the deployment host and is not a registered callback. */
function youtubeAppBaseUrl(): string {
  const explicit =
    trimEnv(process.env.NEXT_PUBLIC_APP_URL) || trimEnv(process.env.NEXTAUTH_URL)
  if (explicit) return normalizeStudioOrigin(explicit)
  const vercel = trimEnv(process.env.VERCEL_URL).replace(/^https?:\/\//, '')
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

/**
 * Callback Google must send the user back to.
 * An explicit redirect wins. Otherwise use the host the connect click came from
 * (normalizing www.sceneflowai.studio to sceneflowai.studio), then the public app URL,
 * then the deployment host.
 */
export function youtubeRedirectUri(requestOrigin?: string): string {
  const explicit = trimEnv(process.env.GOOGLE_OAUTH_REDIRECT_URI)
  if (explicit) return explicit
  const origin = requestOrigin?.trim().replace(/\/$/, '')
  if (
    origin &&
    /^https?:\/\//i.test(origin) &&
    (origin.endsWith(YOUTUBE_OAUTH_CALLBACK_PATH) ||
      origin.endsWith('/api/publish/youtube/callback'))
  ) {
    return origin
  }
  const base =
    origin && /^https?:\/\//i.test(origin)
      ? normalizeStudioOrigin(origin)
      : youtubeAppBaseUrl()
  return `${base}${YOUTUBE_OAUTH_CALLBACK_PATH}`
}

const CLIENT_ID_ENV_KEYS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_CLIENT_ID',
  'YOUTUBE_OAUTH_CLIENT_ID',
  'YOUTUBE_CLIENT_ID',
  'AUTH_GOOGLE_ID',
  'NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
] as const

const CLIENT_SECRET_ENV_KEYS = [
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'YOUTUBE_OAUTH_CLIENT_SECRET',
  'YOUTUBE_CLIENT_SECRET',
  'AUTH_GOOGLE_SECRET',
] as const

const CLIENT_JSON_ENV_KEYS = [
  'GOOGLE_OAUTH_CREDENTIALS_JSON',
  'YOUTUBE_OAUTH_CREDENTIALS_JSON',
  'GOOGLE_CLIENT_SECRET_JSON',
] as const

export function youtubeOAuthCredentials(): { clientId: string; clientSecret: string } {
  const jsonPayload =
    trimEnv(process.env.GOOGLE_OAUTH_CREDENTIALS_JSON) ||
    trimEnv(process.env.YOUTUBE_OAUTH_CREDENTIALS_JSON) ||
    trimEnv(process.env.GOOGLE_CLIENT_SECRET_JSON) ||
    lookupEnvTrimmedKey(CLIENT_JSON_ENV_KEYS)
  const fromJson =
    parseGoogleOAuthClientJson(jsonPayload) ||
    parseGoogleOAuthClientJson(process.env.GOOGLE_OAUTH_CLIENT_ID) ||
    parseGoogleOAuthClientJson(process.env.GOOGLE_OAUTH_CLIENT_SECRET)
  if (fromJson) return fromJson

  const clientId =
    trimEnv(process.env.GOOGLE_OAUTH_CLIENT_ID) ||
    trimEnv(process.env.GOOGLE_CLIENT_ID) ||
    trimEnv(process.env.YOUTUBE_OAUTH_CLIENT_ID) ||
    trimEnv(process.env.YOUTUBE_CLIENT_ID) ||
    trimEnv(process.env.AUTH_GOOGLE_ID) ||
    trimEnv(process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID) ||
    trimEnv(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) ||
    lookupEnvTrimmedKey(CLIENT_ID_ENV_KEYS)
  const clientSecret =
    trimEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET) ||
    trimEnv(process.env.GOOGLE_CLIENT_SECRET) ||
    trimEnv(process.env.YOUTUBE_OAUTH_CLIENT_SECRET) ||
    trimEnv(process.env.YOUTUBE_CLIENT_SECRET) ||
    trimEnv(process.env.AUTH_GOOGLE_SECRET) ||
    lookupEnvTrimmedKey(CLIENT_SECRET_ENV_KEYS)
  if (!clientId || !clientSecret) {
    throw new Error(
      'YouTube OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET)'
    )
  }
  return { clientId, clientSecret }
}

let userIntegrationTableEnsured = false
async function ensureUserIntegrationTable(): Promise<typeof UserIntegrationModel> {
  const UserIntegration = await getUserIntegrationModel()
  if (userIntegrationTableEnsured) return UserIntegration
  try {
    await UserIntegration.sync({ force: false })
    userIntegrationTableEnsured = true
  } catch (err) {
    console.warn('[YouTube OAuth] UserIntegration table sync check failed:', err)
  }
  return UserIntegration
}

export async function saveYouTubeOAuthClientConfig(
  userId: string,
  creds: { clientId: string; clientSecret: string }
): Promise<void> {
  const clientId = trimEnv(creds.clientId)
  const clientSecret = trimEnv(creds.clientSecret)
  if (!clientId || !clientSecret) {
    throw new Error('Both Google OAuth Client ID and Client Secret are required.')
  }
  const UserIntegration = await ensureUserIntegrationTable()
  const encrypted = EncryptionService.encrypt(JSON.stringify({ clientId, clientSecret }))
  const [row] = await UserIntegration.findOrCreate({
    where: { user_id: userId, provider: 'youtube_oauth_app' },
    defaults: {
      user_id: userId,
      provider: 'youtube_oauth_app',
      encrypted_credentials: encrypted,
      is_valid: true,
    },
  })
  if (row) {
    await row.update({ encrypted_credentials: encrypted, is_valid: true })
  }
}

export async function loadYouTubeOAuthClientConfig(
  userId?: string
): Promise<{ clientId: string; clientSecret: string } | null> {
  try {
    const UserIntegration = await ensureUserIntegrationTable()
    let row = userId
      ? await UserIntegration.findOne({
          where: { user_id: userId, provider: 'youtube_oauth_app', is_valid: true },
        })
      : null
    if (!row) {
      row = await UserIntegration.findOne({
        where: { provider: 'youtube_oauth_app', is_valid: true },
        order: [['updated_at', 'DESC']],
      })
    }
    if (!row) return null
    const raw = EncryptionService.decrypt(row.encrypted_credentials)
    const parsed = JSON.parse(raw) as { clientId?: string; clientSecret?: string }
    const clientId = trimEnv(parsed.clientId)
    const clientSecret = trimEnv(parsed.clientSecret)
    if (clientId && clientSecret) {
      return { clientId, clientSecret }
    }
    return null
  } catch {
    return null
  }
}

export async function resolveYouTubeOAuthCredentials(
  userId?: string
): Promise<{ clientId: string; clientSecret: string }> {
  try {
    return youtubeOAuthCredentials()
  } catch (envErr) {
    const stored = await loadYouTubeOAuthClientConfig(userId)
    if (stored) return stored
    throw envErr
  }
}

export async function isYouTubeOAuthConfigured(userId?: string): Promise<boolean> {
  try {
    await resolveYouTubeOAuthCredentials(userId)
    return true
  } catch {
    return false
  }
}

function getOAuthClient(
  requestOrigin?: string,
  credentialsOverride?: { clientId: string; clientSecret: string }
): OAuth2Client {
  const { clientId, clientSecret } = credentialsOverride ?? youtubeOAuthCredentials()
  return new OAuth2Client(clientId, clientSecret, youtubeRedirectUri(requestOrigin))
}

export function getYouTubeAuthUrl(
  state: string,
  requestOrigin?: string,
  credentialsOverride?: { clientId: string; clientSecret: string }
): string {
  const client = getOAuthClient(requestOrigin, credentialsOverride)
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    state,
  })
}

export async function exchangeYouTubeCode(
  code: string,
  requestOrigin?: string,
  userId?: string
): Promise<YouTubeTokens> {
  const creds = await resolveYouTubeOAuthCredentials(userId)
  const client = getOAuthClient(requestOrigin, creds)
  const { tokens } = await client.getToken(code)
  return tokens as YouTubeTokens
}

export async function saveYouTubeTokens(userId: string, tokens: YouTubeTokens): Promise<void> {
  const UserIntegration = await ensureUserIntegrationTable()
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
  const UserIntegration = await ensureUserIntegrationTable()
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
  const creds = await resolveYouTubeOAuthCredentials(userId)
  const client = getOAuthClient(undefined, creds)
  client.setCredentials(tokens)

  client.on('tokens', async (newTokens) => {
    const merged = { ...tokens, ...newTokens }
    await saveYouTubeTokens(userId, merged)
  })

  return client
}

export async function uploadYouTubeThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailUrl: string
): Promise<void> {
  const thumbRes = await fetch(thumbnailUrl)
  if (!thumbRes.ok) {
    throw new Error(`Failed to fetch thumbnail: ${thumbRes.status}`)
  }

  const contentType = thumbRes.headers.get('content-type') || 'image/jpeg'
  const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer())

  const setRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: thumbBuffer,
    }
  )

  if (!setRes.ok) {
    const errText = await setRes.text()
    throw new Error(`YouTube thumbnail upload failed: ${setRes.status} ${errText}`)
  }
}

export async function uploadVideoToYouTube(
  userId: string,
  options: {
    videoUrl: string
    title: string
    description: string
    privacyStatus: 'private' | 'unlisted' | 'public'
    language?: string
    tags?: string[]
    categoryId?: string
    thumbnailUrl?: string
  }
): Promise<{ videoId: string; url: string; thumbnailUploaded: boolean }> {
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
          tags: options.tags,
          categoryId: options.categoryId || '28',
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

  let thumbnailUploaded = false
  if (options.thumbnailUrl) {
    try {
      await uploadYouTubeThumbnail(token, videoId, options.thumbnailUrl)
      thumbnailUploaded = true
    } catch (err) {
      console.warn('[YouTube Upload] Thumbnail upload failed:', err)
    }
  }

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUploaded,
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
