import { NextResponse } from 'next/server'
import { testConnection } from '@/config/database'

export async function GET() {
  try {
    console.log('🔍 Health check called')
    
    // Test database connection
    await testConnection()
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
