import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/services/AuthService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, first_name, last_name } = body

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Register user
    const result = await AuthService.register({
      email,
      username,
      password,
      first_name,
      last_name
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: result.user,
      token: result.token
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: 500 }
    )
  }
}
