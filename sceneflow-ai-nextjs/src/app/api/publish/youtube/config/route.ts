import { NextRequest, NextResponse } from 'next/server'
import '@/models'
import {
  YOUTUBE_OAUTH_CALLBACK_PATH,
  isYouTubeOAuthConfigured,
  parseGoogleOAuthClientJson,
  saveYouTubeOAuthClientConfig,
  youtubeRedirectUri,
} from '@/lib/publish/youtubeClient'
import { resolveUserId } from '@/lib/userHelper'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userIdParam = req.nextUrl.searchParams.get('userId')
    const userId = userIdParam ? await resolveUserId(userIdParam).catch(() => undefined) : undefined
    const configured = await isYouTubeOAuthConfigured(userId)
    return NextResponse.json({
      configured,
      redirectUri: youtubeRedirectUri(req.nextUrl.origin),
      callbackPath: YOUTUBE_OAUTH_CALLBACK_PATH,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to inspect YouTube OAuth config'
    return NextResponse.json({ configured: false, error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId?: string
      clientId?: string
      clientSecret?: string
      credentialsJson?: string
    }

    if (!body.userId) {
      return NextResponse.json({ error: 'Sign in required (`userId` missing).' }, { status: 400 })
    }

    const userId = await resolveUserId(body.userId)

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
            'Provide both a Google OAuth Client ID and Client Secret (or paste the downloaded client_secret.json).',
        },
        { status: 400 }
      )
    }

    await saveYouTubeOAuthClientConfig(userId, { clientId, clientSecret })

    return NextResponse.json({
      configured: true,
      redirectUri: youtubeRedirectUri(req.nextUrl.origin),
      callbackPath: YOUTUBE_OAUTH_CALLBACK_PATH,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save YouTube OAuth config'
    console.error('[YouTube OAuth Config]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
