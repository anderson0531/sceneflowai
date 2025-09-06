import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Registration API called')
    
    const body = await request.json()
    console.log('📝 Request body:', { ...body, password: '[REDACTED]' })
    
    const { email, username, password, first_name, last_name } = body

    // Validate required fields
    if (!email || !username || !password) {
      console.log('❌ Missing required fields:', { email: !!email, username: !!username, password: !!password })
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      console.log('❌ Password too short:', password.length)
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Demo mode - create fake user data
    console.log('🎭 Using demo mode - database not connected')
    
    const demoUser = {
      id: 'demo-' + Date.now(),
      email: email,
      username: username,
      first_name: first_name || '',
      last_name: last_name || '',
      name: first_name && last_name ? `${first_name} ${last_name}` : username
    }

    // Create a simple JWT-like token
    const demoToken = 'demo-token-' + Date.now()

    console.log('✅ Demo registration successful, returning response')
    
    return NextResponse.json({
      message: 'User registered successfully (Demo Mode)',
      user: demoUser,
      token: demoToken,
      demo: true
    })

  } catch (error) {
    console.error('❌ Registration error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
