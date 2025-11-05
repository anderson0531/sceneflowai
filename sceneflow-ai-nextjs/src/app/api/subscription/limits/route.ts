import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SubscriptionService } from '../../../../services/SubscriptionService'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    const projectLimits = await SubscriptionService.checkProjectLimits(userId)
    
    return NextResponse.json({
      success: true,
      limits: {
        projects: projectLimits
      }
    })
  } catch (error: any) {
    console.error('[Subscription Limits] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch limits',
      message: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}
