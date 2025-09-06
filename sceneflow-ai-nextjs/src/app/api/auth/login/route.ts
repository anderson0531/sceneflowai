import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Login API called')
    
    const body = await request.json()
    console.log('📝 Request body:', { ...body, password: '[REDACTED]' })
    
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Demo mode - accept any credentials
    console.log('🎭 Using demo mode - database not connected')
    
    const demoUser = {
      id: 'demo-user',
      email: email,
      username: email.split('@')[0],
      first_name: 'Demo',
      last_name: 'User',
      name: 'Demo User'
    }

    // Create a simple JWT-like token
    const demoToken = 'demo-token-' + Date.now()

    console.log('✅ Demo login successful, returning response')

    return NextResponse.json({
      message: 'Login successful (Demo Mode)',
      user: demoUser,
      token: demoToken,
      demo: true
    })

  } catch (error) {
    console.error('❌ Login error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
