/**
 * Facebook Page video publish. Requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET.
 */
import { EncryptionService } from '@/services/EncryptionService'
import UserIntegration from '@/models/UserIntegration'

const GRAPH_VERSION = 'v21.0'

export type FacebookPage = {
  id: string
  name: string
  access_token: string
}

export type FacebookTokens = {
  access_token: string
  token_type?: string
  expires_in?: number
  pageId?: string
  pageName?: string
  pageAccessToken?: string
}

function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function facebookRedirectUri(): string {
  return process.env.FACEBOOK_OAUTH_REDIRECT_URI || `${appBaseUrl()}/api/publish/facebook/callback`
}

export function facebookConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET)
}

function requireFacebookConfig(): { appId: string; appSecret: string } {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('Facebook publishing is not configured (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET)')
  }
  return { appId, appSecret }
}

export function getFacebookAuthUrl(state: string): string {
  const { appId } = requireFacebookConfig()
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: facebookRedirectUri(),
    state,
    response_type: 'code',
    scope: 'pages_show_list,pages_manage_posts,pages_read_engagement',
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

export async function exchangeFacebookCode(code: string): Promise<FacebookTokens> {
  const { appId, appSecret } = requireFacebookConfig()
  const shortParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: facebookRedirectUri(),
    code,
  })
  const shortRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${shortParams.toString()}`
  )
  const shortJson = (await shortRes.json()) as FacebookTokens & { error?: { message?: string } }
  if (!shortRes.ok || !shortJson.access_token) {
    throw new Error(shortJson.error?.message || 'Facebook token exchange failed')
  }

  const longParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortJson.access_token,
  })
  const longRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${longParams.toString()}`
  )
  const longJson = (await longRes.json()) as FacebookTokens & { error?: { message?: string } }
  if (!longRes.ok || !longJson.access_token) {
    return { access_token: shortJson.access_token }
  }
  return longJson
}

export async function saveFacebookTokens(userId: string, tokens: FacebookTokens): Promise<void> {
  const encrypted = EncryptionService.encrypt(JSON.stringify(tokens))
  const [row] = await UserIntegration.findOrCreate({
    where: { user_id: userId, provider: 'facebook' },
    defaults: {
      user_id: userId,
      provider: 'facebook',
      encrypted_credentials: encrypted,
      is_valid: true,
    },
  })
  if (row) {
    await row.update({ encrypted_credentials: encrypted, is_valid: true })
  }
}

export async function loadFacebookTokens(userId: string): Promise<FacebookTokens | null> {
  const row = await UserIntegration.findOne({
    where: { user_id: userId, provider: 'facebook', is_valid: true },
  })
  if (!row) return null
  try {
    const raw = EncryptionService.decrypt(row.encrypted_credentials)
    return JSON.parse(raw) as FacebookTokens
  } catch {
    return null
  }
}

export async function listFacebookPages(userId: string): Promise<FacebookPage[]> {
  const tokens = await loadFacebookTokens(userId)
  if (!tokens?.access_token) return []
  const params = new URLSearchParams({ access_token: tokens.access_token })
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?${params.toString()}`)
  const json = (await res.json()) as { data?: FacebookPage[]; error?: { message?: string } }
  if (!res.ok) {
    throw new Error(json.error?.message || 'Could not list Facebook Pages')
  }
  return json.data || []
}

export async function selectFacebookPage(userId: string, pageId: string): Promise<FacebookTokens> {
  const tokens = await loadFacebookTokens(userId)
  if (!tokens?.access_token) {
    throw new Error('Facebook account not connected. Please authorize first.')
  }
  const pages = await listFacebookPages(userId)
  const page = pages.find((item) => item.id === pageId)
  if (!page) throw new Error('That Facebook Page is not available on this account.')
  const next: FacebookTokens = {
    ...tokens,
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
  }
  await saveFacebookTokens(userId, next)
  return next
}

export async function uploadVideoToFacebook(
  userId: string,
  options: {
    videoUrl: string
    title: string
    description?: string
    pageId?: string
    privacyStatus?: 'private' | 'unlisted' | 'public'
  }
): Promise<{ videoId: string; url: string }> {
  let tokens = await loadFacebookTokens(userId)
  if (!tokens?.access_token) {
    throw new Error('Facebook account not connected. Please authorize first.')
  }
  const pageId = options.pageId || tokens.pageId
  if (!pageId) {
    throw new Error('Choose a Facebook Page before publishing.')
  }
  if (!tokens.pageAccessToken || tokens.pageId !== pageId) {
    tokens = await selectFacebookPage(userId, pageId)
  }
  if (!tokens.pageAccessToken) {
    throw new Error('Facebook Page access is missing. Reconnect the Page.')
  }

  const body = new URLSearchParams({
    file_url: options.videoUrl,
    title: options.title,
    description: options.description || '',
    access_token: tokens.pageAccessToken,
    published: options.privacyStatus === 'public' ? 'true' : 'false',
  })
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || 'Facebook video publish failed')
  }
  return {
    videoId: json.id,
    url: `https://www.facebook.com/${pageId}/videos/${json.id}`,
  }
}
