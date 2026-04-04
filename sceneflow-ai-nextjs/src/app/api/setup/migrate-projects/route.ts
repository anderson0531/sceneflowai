import { NextRequest, NextResponse } from 'next/server'
import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import '@/models'

export const dynamic = 'force-dynamic'

/**
 * GET  - Show all users with project counts so you can identify orphaned projects
 * POST - Reassign projects from one user_id to another
 *        Body: { fromUserId: string, toUserId: string }
 *        OR:   { toEmail: string }  (reassigns ALL orphaned projects to the user with this email)
 */

export async function GET() {
  try {
    await sequelize.authenticate()

    const usersWithProjects = await sequelize.query<{
      user_id: string
      project_count: string
      email: string | null
      username: string | null
    }>(
      `SELECT
         p.user_id::text AS user_id,
         COUNT(*)::text AS project_count,
         u.email,
         u.username
       FROM public.projects p
       LEFT JOIN public.users u ON u.id = p.user_id
       GROUP BY p.user_id, u.email, u.username
       ORDER BY COUNT(*) DESC`,
      { type: QueryTypes.SELECT }
    )

    const allUsers = await sequelize.query<{
      id: string
      email: string
      username: string
      created_at: string
    }>(
      `SELECT id::text, email, username, created_at::text
       FROM public.users
       ORDER BY created_at DESC
       LIMIT 50`,
      { type: QueryTypes.SELECT }
    )

    const orphanedUserIds = usersWithProjects
      .filter((r) => r.email === null)
      .map((r) => r.user_id)

    return NextResponse.json({
      summary: {
        total_projects: usersWithProjects.reduce((s, r) => s + parseInt(r.project_count, 10), 0),
        users_with_projects: usersWithProjects.length,
        orphaned_user_ids: orphanedUserIds,
      },
      projects_by_user: usersWithProjects,
      all_users: allUsers,
      instructions: {
        reassign_specific:
          'POST this endpoint with { "fromUserId": "<old-uuid>", "toUserId": "<new-uuid>" }',
        reassign_all_to_email:
          'POST this endpoint with { "toEmail": "your@email.com" } to reassign ALL projects from user_ids that have no matching user record',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await sequelize.authenticate()
    const body = await request.json()
    const { fromUserId, toUserId, toEmail } = body || {}

    if (toEmail && !toUserId && !fromUserId) {
      const [targetUser] = await sequelize.query<{ id: string }>(
        `SELECT id::text FROM public.users WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
        { replacements: { email: toEmail.trim() }, type: QueryTypes.SELECT }
      )
      if (!targetUser) {
        return NextResponse.json({ error: `No user found with email: ${toEmail}` }, { status: 404 })
      }
      const resolvedToId = targetUser.id

      const orphaned = await sequelize.query<{ user_id: string; cnt: string }>(
        `SELECT p.user_id::text, COUNT(*)::text AS cnt
         FROM public.projects p
         LEFT JOIN public.users u ON u.id = p.user_id
         WHERE u.id IS NULL
         GROUP BY p.user_id`,
        { type: QueryTypes.SELECT }
      )

      if (orphaned.length === 0) {
        const allOther = await sequelize.query<{ user_id: string; cnt: string }>(
          `SELECT user_id::text, COUNT(*)::text AS cnt
           FROM public.projects
           WHERE user_id != :targetId
           GROUP BY user_id`,
          { replacements: { targetId: resolvedToId }, type: QueryTypes.SELECT }
        )

        return NextResponse.json({
          message: 'No orphaned projects found (all project user_ids have matching user records).',
          hint: 'Use { "fromUserId": "<uuid>", "toUserId": "<uuid>" } to reassign from a specific user.',
          other_users_with_projects: allOther,
          target_user_id: resolvedToId,
        })
      }

      let totalMigrated = 0
      const details: { fromUserId: string; count: number }[] = []
      for (const row of orphaned) {
        const [, count] = await sequelize.query(
          `UPDATE public.projects SET user_id = :toId WHERE user_id = :fromId`,
          { replacements: { toId: resolvedToId, fromId: row.user_id }, type: QueryTypes.RAW }
        )
        const migrated = typeof count === 'number' ? count : 0
        totalMigrated += migrated
        details.push({ fromUserId: row.user_id, count: migrated })
      }

      return NextResponse.json({
        success: true,
        message: `Migrated ${totalMigrated} orphaned projects to user ${resolvedToId} (${toEmail})`,
        details,
      })
    }

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { error: 'Provide { fromUserId, toUserId } or { toEmail }' },
        { status: 400 }
      )
    }

    const [result, count] = await sequelize.query(
      `UPDATE public.projects SET user_id = :toId WHERE user_id = :fromId`,
      { replacements: { toId: toUserId, fromId: fromUserId }, type: QueryTypes.RAW }
    )

    const migrated = typeof count === 'number' ? count : 0

    return NextResponse.json({
      success: true,
      message: `Reassigned ${migrated} projects from ${fromUserId} to ${toUserId}`,
      migrated,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
