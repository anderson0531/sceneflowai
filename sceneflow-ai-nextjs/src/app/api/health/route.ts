import { NextResponse } from 'next/server'
import { EncryptionService } from '@/services/EncryptionService'

/**
 * GET /api/health
 * Health check endpoint for monitoring system status
 */
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check encryption service
    const encryptionOk = EncryptionService.isEncryptionConfigured()
    
    // Check system resources
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    // Calculate response time
    const responseTime = Date.now() - startTime
    
    // Determine overall health status
    const isHealthy = encryptionOk
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        encryption: encryptionOk ? 'configured' : 'not_configured',
        api: 'operational'
      },
      system: {
        uptime: Math.floor(uptime),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        encryptionConfigured: encryptionOk
      }
    }
    
    // Return appropriate status code
    const statusCode = isHealthy ? 200 : 503
    
    return NextResponse.json(healthData, { status: statusCode })
    
  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
