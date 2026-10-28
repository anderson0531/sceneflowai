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
    const { email, username, password, first_name, last_name, name } = body as any

    const normalizedEmail = String(email || '').trim().toLowerCase()
    const resolvedFirstName =
      first_name || (typeof name === 'string' ? name.trim().split(/\s+/)[0] : '') || ''
    const resolvedLastName =
      last_name ||
      (typeof name === 'string' && name.trim().split(/\s+/).length > 1
        ? name.trim().split(/\s+/).slice(1).join(' ')
        : '') ||
      ''
    const resolvedUsername = String(
      username || resolvedFirstName || normalizedEmail.split('@')[0] || ''
    ).trim()

    // Validate required fields
    if (!normalizedEmail || !resolvedUsername || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: 'Invalid password: must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (isDemoMode()) {
      const demoUser = {
        id: 'demo-' + Date.now(),
        email: normalizedEmail,
        username: resolvedUsername,
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        name:
          resolvedFirstName && resolvedLastName
            ? `${resolvedFirstName} ${resolvedLastName}`
            : resolvedUsername,
      }
      const demoToken = 'demo-token-' + Date.now()
      return NextResponse.json({
        message: 'User registered successfully (Demo Mode)',
        user: demoUser,
        token: demoToken,
        demo: true,
      })
    }

    // Production: real user registration via AuthService
    const result = await AuthService.register({
      email: normalizedEmail,
      username: resolvedUsername,
      password: String(password),
      first_name: resolvedFirstName || undefined,
      last_name: resolvedLastName || undefined,
    })

    if (!result.success || !result.user || !result.token) {
      const status =
        result.error === 'Email already registered' || result.error === 'Username already taken'
          ? 409
          : 400
      return NextResponse.json({ error: result.error || 'Registration failed' }, { status })
    }

    const res = NextResponse.json({
      message: 'User registered successfully',
      user: {
        ...result.user,
        name:
          result.user.first_name && result.user.last_name
            ? `${result.user.first_name} ${result.user.last_name}`
            : result.user.first_name || result.user.username,
      },
      token: result.token,
      demo: false,
    })

    const isProd = process.env.NODE_ENV === 'production'
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    res.headers.set(
      'Set-Cookie',
      `auth_token=${result.token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? 'Secure; ' : ''}Max-Age=${maxAge}`
    )
    return res
  } catch (error) {
    console.error('[POST /api/auth/register] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
