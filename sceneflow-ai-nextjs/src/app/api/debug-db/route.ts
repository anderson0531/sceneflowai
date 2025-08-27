import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      DB_HOST: process.env.DB_HOST || 'Not set',
      DB_PORT: process.env.DB_PORT || 'Not set',
      DB_USERNAME: process.env.DB_USERNAME || 'Not set',
      DB_NAME: process.env.DB_NAME || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
    }

    // Try to import and test database connection
    let dbStatus = 'Not tested'
    let dbError = null
    
    try {
      const { sequelize } = await import('@/config/database')
      await sequelize.authenticate()
      dbStatus = 'Connected successfully'
    } catch (error) {
      dbStatus = 'Connection failed'
      dbError = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json({
      message: 'Debug information',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: {
        status: dbStatus,
        error: dbError
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
