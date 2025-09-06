import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/AuthService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
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
