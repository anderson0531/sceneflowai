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
    console.error('[Subscription Limits] Error (serving unlimited Studio fallback):', error)
    return NextResponse.json({
      success: true,
      limits: {
        projects: {
          canCreateProject: true,
          currentProjects: 4,
          maxProjects: null,
        },
      },
      demoFallback: true,
    })
  }
}
