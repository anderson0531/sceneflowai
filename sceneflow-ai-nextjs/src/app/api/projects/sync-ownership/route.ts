import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sequelize } from '@/config/database'
import { resolveUser } from '@/lib/userHelper'

/**
 * Sync project ownership from localStorage UUID to authenticated user ID
 * This migrates projects created before login to the authenticated user's account
 * 
 * GET - Debug endpoint to list users and projects
 * POST - Migrate projects to authenticated user
 */

// GET /api/projects/sync-ownership - Debug endpoint
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    await sequelize.authenticate()

    // Get all users
    const [users] = await sequelize.query(
      `SELECT id, email, username, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 20`
    ) as [any[], unknown]

    // Get all projects with owner info
    const [projects] = await sequelize.query(
      `SELECT p.id, p.title, p.user_id, p.created_at, u.email as owner_email 
       FROM projects p 
       LEFT JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC LIMIT 50`
    ) as [any[], unknown]

    // Resolve current user
    let resolvedUser = null
    try {
      resolvedUser = await resolveUser(session.user.id)
    } catch (e) {
      console.log('[sync-ownership GET] Could not resolve current user:', e)
    }

    return NextResponse.json({
      success: true,
      currentSession: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      resolvedUser: resolvedUser ? {
        id: resolvedUser.id,
        email: resolvedUser.email,
        username: (resolvedUser as any).username,
        fullName: (resolvedUser as any).full_name
      } : null,
      users: users,
      projects: projects
    })
  } catch (error) {
    console.error('[sync-ownership GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get data' }, { status: 500 })
  }
}

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

    const body = await req.json()
    const { oldUserId, newUserId, fixAll } = body

    // Ensure database connection
    await sequelize.authenticate()

    // Resolve the session user to get their proper UUID
    const resolvedUser = await resolveUser(session.user.id)
    
    if (!resolvedUser) {
      console.log('[sync-ownership] Could not resolve user:', session.user.id)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUserId = resolvedUser.id

    // If fixAll is true, migrate ALL projects to this user
    if (fixAll === true) {
      console.log('[sync-ownership] Fix all mode: Reassigning ALL projects to:', targetUserId)
      
      // First get count of projects to migrate
      const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as count FROM projects WHERE user_id != :targetUserId`,
        { replacements: { targetUserId } }
      ) as [any[], unknown]
      
      const projectsToMigrate = countResult[0]?.count || 0
      
      if (projectsToMigrate > 0) {
        await sequelize.query(
          `UPDATE projects 
           SET user_id = :targetUserId, updated_at = NOW() 
           WHERE user_id != :targetUserId`,
          { replacements: { targetUserId } }
        )
      }

      console.log('[sync-ownership] Reassigned', projectsToMigrate, 'projects to', targetUserId)

      return NextResponse.json({
        success: true,
        mode: 'fixAll',
        migratedCount: projectsToMigrate,
        targetUserId,
        targetEmail: resolvedUser.email
      })
    }

    // Standard mode: migrate from specific oldUserId
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

    // Get count first
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as count FROM projects WHERE user_id = :oldUserId`,
      { replacements: { oldUserId } }
    ) as [any[], unknown]
    
    const migratedCount = countResult[0]?.count || 0

    // Migrate projects from old localStorage UUID to authenticated user UUID
    if (migratedCount > 0) {
      await sequelize.query(
        `UPDATE projects 
         SET user_id = :newUserId, updated_at = NOW() 
         WHERE user_id = :oldUserId`,
        {
          replacements: { 
            oldUserId, 
            newUserId: targetUserId 
          }
        }
      )
    }

    console.log('[sync-ownership] Migrated', migratedCount, 'projects from', oldUserId, 'to', targetUserId)

    return NextResponse.json({
      success: true,
      migratedCount: migratedCount
    })

  } catch (error) {
    console.error('[sync-ownership] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync ownership' },
      { status: 500 }
    )
  }
}
