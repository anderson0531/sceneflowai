import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'

function getAuthSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET || process.env.NEXT_AUTH_SECRET
}

async function getSessionToken(req: NextRequest) {
  return getToken({
    req,
    secret: getAuthSecret(),
    cookieName: SESSION_COOKIE_NAME,
  })
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

    if (!token) {
      return redirectToLogin(req, pathname)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
