import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '@/models'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'
import {
  YOUTUBE_OAUTH_CALLBACK_PATH,
  getYouTubeOAuthPlatformSource,
  isYouTubeOAuthConfigured,
  parseGoogleOAuthClientJson,
  saveYouTubeOAuthClientConfig,
  youtubeRedirectUri,
} from '@/lib/publish/youtubeClient'
import { facebookConfigured, facebookRedirectUri } from '@/lib/publish/facebookClient'
import { tiktokConfigured, tiktokRedirectUri } from '@/lib/publish/tiktokClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

function buildRecommendedRedirectUris(originRedirectUri: string): string[] {
  const prodUri = `https://sceneflowai.studio${YOUTUBE_OAUTH_CALLBACK_PATH}`
  const vercelUri = `https://sceneflow-ai-nextjs.vercel.app${YOUTUBE_OAUTH_CALLBACK_PATH}`
  return Array.from(new Set([prodUri, originRedirectUri, vercelUri].filter(Boolean)))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = isAdminEmail(session?.user?.email)
    const configured = await isYouTubeOAuthConfigured()

    if (!isAdmin) {
      return NextResponse.json({
        isAdmin: false,
        configured,
        facebookConfigured: facebookConfigured(),
        tiktokConfigured: tiktokConfigured(),
      })
    }

    const source = await getYouTubeOAuthPlatformSource()
    const redirectUri = youtubeRedirectUri(req.nextUrl.origin)
    return NextResponse.json({
      isAdmin: true,
      configured,
      source,
      redirectUri,
      recommendedRedirectUris: buildRecommendedRedirectUris(redirectUri),
      callbackPath: YOUTUBE_OAUTH_CALLBACK_PATH,
      facebookConfigured: facebookConfigured(),
      facebookRedirectUri: facebookRedirectUri(),
      tiktokConfigured: tiktokConfigured(),
      tiktokRedirectUri: tiktokRedirectUri(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to inspect social OAuth status'
    return NextResponse.json({ isAdmin: false, configured: false, error: message }, { status: 500 })
  }
}

/**
 * Platform-level OAuth configuration endpoint (SceneFlow Admin ONLY).
 * End users never configure OAuth apps — they only authorize their social accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return NextResponse.json(
        { error: 'Forbidden — platform OAuth credentials can only be managed by a SceneFlow administrator.' },
        { status: 403 }
      )
    }

    const body = (await req.json()) as {
      clientId?: string
      clientSecret?: string
      credentialsJson?: string
    }

    const adminUserId = await resolveUserId(session.user.id || session.user.email)

    const parsedJson =
      parseGoogleOAuthClientJson(body.credentialsJson) ||
      parseGoogleOAuthClientJson(body.clientId) ||
      parseGoogleOAuthClientJson(body.clientSecret)

    const clientId = (parsedJson?.clientId || body.clientId || '').trim()
    const clientSecret = (parsedJson?.clientSecret || body.clientSecret || '').trim()

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            'Provide both SceneFlow Google OAuth Client ID and Client Secret (or paste client_secret.json).',
        },
        { status: 400 }
      )
    }

    await saveYouTubeOAuthClientConfig(adminUserId, { clientId, clientSecret })
    const redirectUri = youtubeRedirectUri(req.nextUrl.origin)

    return NextResponse.json({
      isAdmin: true,
      configured: true,
      source: await getYouTubeOAuthPlatformSource(),
      redirectUri,
      recommendedRedirectUris: buildRecommendedRedirectUris(redirectUri),
      callbackPath: YOUTUBE_OAUTH_CALLBACK_PATH,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save platform OAuth config'
    console.error('[Social OAuth Admin Config]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
