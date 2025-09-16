import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { sequelize } from '@/config/database'
import '@/models/User' // Import User model to register it

export async function POST() {
  try {
    console.log('🔌 Setting up database...')
    
    // Test connection first
    await sequelize.authenticate()
    console.log('✅ Database connection established successfully.')

    // Sync database models (create tables if they don't exist)
    await sequelize.sync({ alter: true }) // Use alter instead of force to preserve data
    console.log('✅ Database models synchronized successfully.')

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
