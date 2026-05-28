import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getAuthSecret, hasAuthSecretConfigured } from '@/lib/auth/secret'

const PRODUCTION_SESSION_COOKIE = '__Secure-next-auth.session-token'
const DEVELOPMENT_SESSION_COOKIE = 'next-auth.session-token'

const SESSION_COOKIE_CANDIDATES =
  process.env.NODE_ENV === 'production'
    ? [PRODUCTION_SESSION_COOKIE, DEVELOPMENT_SESSION_COOKIE]
    : [DEVELOPMENT_SESSION_COOKIE, PRODUCTION_SESSION_COOKIE]

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_CANDIDATES.some((name) => req.cookies.has(name))
}

async function getSessionToken(req: NextRequest) {
  const secret = getAuthSecret()

  for (const cookieName of SESSION_COOKIE_CANDIDATES) {
    const token = await getToken({ req, secret, cookieName })
    if (token) return token
  }

  return null
}

function redirectToLogin(req: NextRequest, returnPath: string) {
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  url.searchParams.set('returnUrl', returnPath)
  return NextResponse.redirect(url)
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    const token = await getSessionToken(req)

    if (token) {
      return NextResponse.next()
    }

    if (hasSessionCookie(req)) {
      console.warn('[proxy] Session cookie present but JWT verification failed; allowing through', {
        pathname,
        hasAuthSecretConfigured: hasAuthSecretConfigured(),
      })
      return NextResponse.next()
    }

    console.warn('[proxy] Unauthenticated access blocked', {
      pathname,
      hasAuthSecretConfigured: hasAuthSecretConfigured(),
      cookieNamesTried: SESSION_COOKIE_CANDIDATES,
    })
    return redirectToLogin(req, pathname)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
