import { NextResponse } from 'next/server'
import { testConnection, getDatabaseConnectionInfo } from '@/config/database'

export async function GET() {
  const connInfo = getDatabaseConnectionInfo()
  try {
    console.log('🔍 Health check called')
    
    // Test database connection
    await testConnection()
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      mode: connInfo.mode,
      envSource: connInfo.envSource,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        mode: connInfo.mode,
        envSource: connInfo.envSource,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
