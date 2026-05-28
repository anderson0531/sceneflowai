import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { isDemoMode } from '@/lib/env'

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

    if (!isDemoMode()) {
      return NextResponse.json(
        { error: 'Registration is closed during beta. Apply at /early-access.' },
        { status: 403 }
      )
    }

    const demoUser = {
      id: 'demo-' + Date.now(),
      email,
      username,
      first_name: first_name || '',
      last_name: last_name || '',
      name: first_name && last_name ? `${first_name} ${last_name}` : username
    }
    const demoToken = 'demo-token-' + Date.now()
    return NextResponse.json({
      message: 'User registered successfully (Demo Mode)',
      user: demoUser,
      token: demoToken,
      demo: true,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
