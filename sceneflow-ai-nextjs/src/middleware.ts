import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware is currently not performing any logic.
// NextAuth.js handles session management.
// We are keeping the file to adjust the matcher config.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}


