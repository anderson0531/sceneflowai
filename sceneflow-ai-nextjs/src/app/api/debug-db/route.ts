import { NextRequest, NextResponse } from 'next/server'
import { extractConnectionErrorCodes } from '@/lib/database/connectionDiagnostics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      DB_DATABASE_URL: process.env.DB_DATABASE_URL ? 'Set' : 'Not set',
      DB_URL: process.env.DB_URL ? 'Set' : 'Not set',
      POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set',
      Neon_DATABASE_URL: process.env.Neon_DATABASE_URL ? 'Set' : 'Not set',
      Neon_POSTGRES_URL: process.env.Neon_POSTGRES_URL ? 'Set' : 'Not set',
      Neon_DATABASE_URL_UNPOOLED: process.env.Neon_DATABASE_URL_UNPOOLED ? 'Set' : 'Not set',
      Neon_POSTGRES_URL_NON_POOLING: process.env.Neon_POSTGRES_URL_NON_POOLING ? 'Set' : 'Not set',
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ? 'Set' : 'Not set',
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? 'Set' : 'Not set',
      PGHOST_UNPOOLED: process.env.PGHOST_UNPOOLED ? 'Set' : 'Not set',
      Neon_PGHOST_UNPOOLED: process.env.Neon_PGHOST_UNPOOLED ? 'Set' : 'Not set',
      PGUSER: process.env.PGUSER ? 'Set' : 'Not set',
      Neon_PGUSER: process.env.Neon_PGUSER ? 'Set' : 'Not set',
      PGPASSWORD: process.env.PGPASSWORD ? 'Set' : 'Not set',
      Neon_PGPASSWORD: process.env.Neon_PGPASSWORD ? 'Set' : 'Not set',
      PGDATABASE: process.env.PGDATABASE ? 'Set' : 'Not set',
      Neon_PGDATABASE: process.env.Neon_PGDATABASE ? 'Set' : 'Not set',
      DB_HOST: process.env.DB_HOST || 'Not set',
      DB_PORT: process.env.DB_PORT || 'Not set',
      DB_USERNAME: process.env.DB_USERNAME || 'Not set',
      DB_NAME: process.env.DB_NAME || 'Not set',
      CLOUD_SQL_INSTANCE_CONNECTION_NAME: process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME ? 'Set' : 'Not set',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'Set' : 'Not set',
      GCP_SERVICE_ACCOUNT_KEY: process.env.GCP_SERVICE_ACCOUNT_KEY ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set'
    }

    // Try to import and test database connection
    let dbStatus = 'Not tested'
    let dbError = null
    let dbErrorDetails = null
    let pgImport = 'Not tried'
    let nodeVersion = process.versions?.node || 'unknown'
    let vercelRegion = process.env.VERCEL_REGION || 'unknown'
    let nextRuntime = process.env.NEXT_RUNTIME || 'unknown'

    try {
      await import('pg')
      pgImport = 'Imported successfully'
    } catch (err) {
      pgImport = `Import failed: ${err instanceof Error ? err.message : String(err)}`
    }

    const databaseModule = await import('@/config/database')

    try {
      await databaseModule.ensureDatabaseConnection('debug-db')
      dbStatus = 'Connected successfully'
    } catch (error) {
      dbStatus = 'Connection failed'
      dbError = error instanceof Error ? error.message : String(error)
      dbErrorDetails = extractConnectionErrorCodes(error)
    }

    return NextResponse.json({
      message: 'Debug information',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      runtime: { nodeVersion, vercelRegion, nextRuntime, pgImport },
      database: {
        status: dbStatus,
        error: dbError,
        errorDetails: dbErrorDetails,
        connectionEnv: databaseModule.connectionEnvName,
        host: databaseModule.selectedConnectionHost,
        pooled: databaseModule.selectedConnectionIsPooled,
        connectionInfo: databaseModule.getDatabaseConnectionInfo(),
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
