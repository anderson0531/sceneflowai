import { NextResponse, type NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
