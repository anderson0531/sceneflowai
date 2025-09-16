import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { isDemoMode, allowDemoFallback } from '@/lib/env'
import { AuthService } from '@/services/AuthService'

export async function OPTIONS() {
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any))
    const { email, username, password, first_name, last_name } = body as any

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Email, username, and password are required' }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: 'Invalid password: must be at least 8 characters' }, { status: 400 })
    }

    if (isDemoMode()) {
      const demoUser = {
        id: 'demo-' + Date.now(),
        email,
        username,
        first_name: first_name || '',
        last_name: last_name || '',
        name: first_name && last_name ? `${first_name} ${last_name}` : username
      }
      const demoToken = 'demo-token-' + Date.now()
      return NextResponse.json({ message: 'User registered successfully (Demo Mode)', user: demoUser, token: demoToken, demo: true })
    }

    // Production: real registration
    const result = await AuthService.register({ email, username, password, first_name, last_name })
    if (!result.success || !result.user || !result.token) {
      if (allowDemoFallback()) {
        // Fallback to demo user creation if backend is not available
        const demoUser = {
          id: 'demo-' + Date.now(),
          email,
          username,
          first_name: first_name || '',
          last_name: last_name || '',
          name: first_name && last_name ? `${first_name} ${last_name}` : username
        }
        const demoToken = 'demo-token-' + Date.now()
        return NextResponse.json({ message: 'User registered successfully (Demo Mode)', user: demoUser, token: demoToken, demo: true })
      }
      return NextResponse.json({ error: result.error || 'Registration failed' }, { status: 400 })
    }
    const res = NextResponse.json({ message: 'User registered successfully', user: result.user, token: result.token, demo: false })
    const isProd = process.env.NODE_ENV === 'production'
    const maxAge = 60 * 60 * 24 * 7
    res.headers.set(
      'Set-Cookie',
      `auth_token=${result.token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=${maxAge}`
    )
    return res
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
