import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { AuthService } from '@/services/AuthService'

export async function POST(request: NextRequest) {
  try {
    // Prefer cookie, fallback to body.token for legacy callers
    const cookieToken = request.cookies.get('auth_token')?.value
    const body = cookieToken ? null : await request.json()
    const token = cookieToken || body?.token

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Verify token
    const result = await AuthService.verifyToken(token)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: 'Token verified successfully',
      user: result.user
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
