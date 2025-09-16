import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { testConnection } from '@/config/database'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await testConnection()
    
    return NextResponse.json({
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      status: 'connected'
    })

  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
