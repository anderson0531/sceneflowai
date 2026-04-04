import { NextRequest, NextResponse } from 'next/server'
import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import '@/models'

export const dynamic = 'force-dynamic'

const TABLES_WITH_USER_ID = [
  'projects',
  'series',
  'credit_ledger',
  'ai_usages',
  'api_usage_logs',
  'user_provider_configs',
  'collab_sessions',
  'render_jobs',
  'voice_consents',
  'user_voice_clones',
  'moderation_events',
  'visionary_reports',
] as const

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = :tableName
     ) AS exists`,
    { replacements: { tableName }, type: QueryTypes.SELECT }
  )
  return rows[0]?.exists === true
}

async function countRows(tableName: string, userId: string): Promise<number> {
  const [row] = await sequelize.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM public."${tableName}" WHERE user_id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  )
  return parseInt(row?.cnt ?? '0', 10)
}

async function migrateTable(
  tableName: string,
  fromId: string,
  toId: string
): Promise<number> {
  const [, meta] = await sequelize.query(
    `UPDATE public."${tableName}" SET user_id = :toId WHERE user_id = :fromId`,
    { replacements: { toId, fromId } }
  )
  return (meta as any)?.rowCount ?? 0
}

/**
 * GET  - Show data distribution across ALL tables for each user_id
 * POST - Migrate ALL data from one user_id to another across every table
 *        Body: { fromUserId: string, toUserId: string }
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

    const dataByTable: Record<string, { table: string; exists: boolean; rows_for_old?: number; rows_for_new?: number }> = {}
    const OLD_ID = 'be8aabd4-2a05-4466-abae-6ad4e1bc6498'
    const NEW_ID = '36ea1d9d-14a6-465c-be7b-b2da1888993f'

    for (const table of TABLES_WITH_USER_ID) {
      const exists = await tableExists(table)
      if (exists) {
        const oldCount = await countRows(table, OLD_ID)
        const newCount = await countRows(table, NEW_ID)
        dataByTable[table] = { table, exists, rows_for_old: oldCount, rows_for_new: newCount }
      } else {
        dataByTable[table] = { table, exists: false }
      }
    }

    return NextResponse.json({
      summary: {
        total_projects: usersWithProjects.reduce((s, r) => s + parseInt(r.project_count, 10), 0),
        users_with_projects: usersWithProjects.length,
        old_account: OLD_ID,
        new_account: NEW_ID,
      },
      data_by_table: dataByTable,
      projects_by_user: usersWithProjects,
      instructions: {
        migrate_all:
          `POST this endpoint with { "fromUserId": "${OLD_ID}", "toUserId": "${NEW_ID}" } to migrate ALL data across all tables`,
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
    const { fromUserId, toUserId } = body || {}

    if (!fromUserId || !toUserId) {
      return NextResponse.json(
        { error: 'Provide { "fromUserId": "<old-uuid>", "toUserId": "<new-uuid>" }' },
        { status: 400 }
      )
    }

    const results: { table: string; migrated: number; skipped?: string }[] = []
    let totalMigrated = 0

    for (const table of TABLES_WITH_USER_ID) {
      const exists = await tableExists(table)
      if (!exists) {
        results.push({ table, migrated: 0, skipped: 'table does not exist' })
        continue
      }
      const count = await migrateTable(table, fromUserId, toUserId)
      results.push({ table, migrated: count })
      totalMigrated += count
    }

    return NextResponse.json({
      success: true,
      message: `Migrated ${totalMigrated} total rows across ${results.filter(r => r.migrated > 0).length} tables from ${fromUserId} to ${toUserId}`,
      total_migrated: totalMigrated,
      details: results,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
