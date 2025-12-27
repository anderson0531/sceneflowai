import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreditService } from '@/services/CreditService'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/credits
 * Returns the current user's credit balance breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    const breakdown = await CreditService.getCreditBreakdown(userId)
    
    return NextResponse.json(breakdown)
  } catch (error: any) {
    console.error('[Credits API] Error fetching credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits', details: error.message },
      { status: 500 }
    )
  }
}
