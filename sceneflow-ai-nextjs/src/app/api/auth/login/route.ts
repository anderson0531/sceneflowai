import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { isDemoMode } from '@/lib/env'
import { AuthService } from '@/services/AuthService'

export async function OPTIONS() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (isDemoMode()) {
      // Demo mode - accept any credentials
      const demoUser = {
        id: 'demo-user',
        email: email,
        username: email.split('@')[0],
        first_name: 'Demo',
        last_name: 'User',
        name: 'Demo User'
      }
      const demoToken = 'demo-token-' + Date.now()
      return NextResponse.json({ message: 'Login successful (Demo Mode)', user: demoUser, token: demoToken, demo: true })
    }

    // Production: real authentication
    const result = await AuthService.login({ email, password })
    if (!result.success || !result.user || !result.token) {
      return NextResponse.json({ error: result.error || 'Invalid credentials' }, { status: 401 })
    }
    const res = NextResponse.json({ message: 'Login successful', user: result.user, token: result.token, demo: false })
    // Set secure httpOnly cookie in production
    const isProd = process.env.NODE_ENV === 'production'
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    res.headers.set(
      'Set-Cookie',
      `auth_token=${result.token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=${maxAge}`
    )
    return res

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
