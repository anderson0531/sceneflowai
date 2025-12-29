import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

/**
 * Sync project ownership from localStorage UUID to authenticated user ID
 * This migrates projects created before login to the authenticated user's account
 */
export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { oldUserId, newUserId } = await req.json()

    if (!oldUserId || !newUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing oldUserId or newUserId' },
        { status: 400 }
      )
    }

    // Ensure newUserId matches the authenticated user
    if (newUserId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      )
    }

    // Ensure database connection
    await sequelize.authenticate()

    // Resolve the session email to a proper user UUID
    const resolvedUserId = await resolveUser(newUserId)
    
    if (!resolvedUserId) {
      console.log('[sync-ownership] Could not resolve user:', newUserId)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Migrate projects from old localStorage UUID to authenticated user UUID
    const [, migratedCount] = await sequelize.query(
      `UPDATE projects 
       SET user_id = :newUserId, updated_at = NOW() 
       WHERE user_id = :oldUserId`,
      {
        replacements: { 
          oldUserId, 
          newUserId: resolvedUserId 
        }
      }
    ) as [unknown, number]

    console.log('[sync-ownership] Migrated', migratedCount, 'projects from', oldUserId, 'to', resolvedUserId)

    return NextResponse.json({
      success: true,
      migratedCount: migratedCount || 0
    })

  } catch (error) {
    console.error('[sync-ownership] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync ownership' },
      { status: 500 }
    )
  }
}
