import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Temporarily disable admin restriction to unblock access
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}


