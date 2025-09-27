import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const secret = process.env.NEXTAUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'sceneflow-dev-secret'
  const token: any = await getToken({ req, secret })
  const email = token?.email as string | undefined
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

  if (!email || !admins.includes(email.toLowerCase())) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}


