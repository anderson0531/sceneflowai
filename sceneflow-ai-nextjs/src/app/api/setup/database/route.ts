import { NextResponse } from 'next/server'
import { bootstrapDatabaseSchema } from '@/lib/database/bootstrapSchema'

export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await bootstrapDatabaseSchema()

  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      logs: result.logs,
    })
  }

  return NextResponse.json(
    {
      success: false,
      error: result.error ?? 'Unknown error',
      logs: result.logs,
    },
    { status: 500 }
  )
}
