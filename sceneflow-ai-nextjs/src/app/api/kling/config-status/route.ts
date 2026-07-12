import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  hasDirectKlingCredentials,
  isKlingConfigured,
  isKlingAsyncEnabled,
  isKlingPrimaryEnabled,
  getKlingDefaultModel,
} from '@/lib/kling/config'

export const runtime = 'nodejs'

/** Masked runtime check — never returns secret values. */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.KLING_API_KEY?.trim() ?? ''
  const accessKey = process.env.KLING_ACCESS_KEY?.trim() ?? ''
  const secretKey = process.env.KLING_SECRET_KEY?.trim() ?? ''

  let authMode: 'bearer_api_key' | 'jwt' | 'none' = 'none'
  if (apiKey) authMode = 'bearer_api_key'
  else if (accessKey && secretKey) authMode = 'jwt'
  else if (accessKey || secretKey) authMode = 'none'

  return NextResponse.json({
    klingConfigured: isKlingConfigured(),
    hasDirectKlingCredentials: hasDirectKlingCredentials(),
    klingPrimaryEnabled: isKlingPrimaryEnabled(),
    klingAsyncEnabled: isKlingAsyncEnabled(),
    defaultModel: getKlingDefaultModel(),
    authMode,
    credentials: {
      KLING_API_KEY: { present: apiKey.length > 0, length: apiKey.length },
      KLING_ACCESS_KEY: { present: accessKey.length > 0, length: accessKey.length },
      KLING_SECRET_KEY: { present: secretKey.length > 0, length: secretKey.length },
      partialJwtPair: (accessKey.length > 0) !== (secretKey.length > 0),
    },
    hint:
      authMode === 'bearer_api_key'
        ? 'Using KLING_API_KEY bearer mode. Official klingai.com API usually needs KLING_ACCESS_KEY + KLING_SECRET_KEY (JWT) instead.'
        : authMode === 'jwt'
          ? 'JWT auth ready (ACCESS_KEY + SECRET_KEY).'
          : accessKey.length > 0 || secretKey.length > 0
            ? 'Incomplete JWT pair — set both KLING_ACCESS_KEY and KLING_SECRET_KEY.'
            : 'No Kling credentials visible at runtime.',
  })
}
