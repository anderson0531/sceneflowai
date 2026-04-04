import { NextResponse } from 'next/server'
import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import '@/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  try {
    await sequelize.authenticate()
    results.connected = true

    const [connInfo] = await sequelize.query<{
      db: string
      user: string
      host: string
      version: string
    }>(
      `SELECT current_database() AS db,
              current_user AS "user",
              inet_server_addr()::text AS host,
              version() AS version`,
      { type: QueryTypes.SELECT }
    ).catch(() => [{ db: 'unknown', user: 'unknown', host: 'unknown', version: 'unknown' }])
    results.connection = connInfo

    const [sp] = await sequelize.query<{ search_path: string }>(
      `SHOW search_path`,
      { type: QueryTypes.SELECT }
    )
    results.search_path = sp?.search_path

    const tables = await sequelize.query<{ schemaname: string; tablename: string }>(
      `SELECT schemaname, tablename
       FROM pg_tables
       WHERE schemaname = 'public'
       ORDER BY tablename`,
      { type: QueryTypes.SELECT }
    )
    results.public_tables = tables.map((t) => t.tablename)

    const tableCounts: Record<string, string> = {}
    for (const t of tables) {
      try {
        const [row] = await sequelize.query<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt FROM public."${t.tablename}"`,
          { type: QueryTypes.SELECT }
        )
        tableCounts[t.tablename] = row?.cnt ?? '?'
      } catch {
        tableCounts[t.tablename] = 'error'
      }
    }
    results.row_counts = tableCounts

    const usersSchemas = await sequelize.query<{ schemaname: string }>(
      `SELECT schemaname FROM pg_tables WHERE tablename = 'users'`,
      { type: QueryTypes.SELECT }
    )
    results.users_table_schemas = usersSchemas.map((r) => r.schemaname)

    if (tables.some((t) => t.tablename === 'projects')) {
      const projectSample = await sequelize.query<{ user_id: string; cnt: string }>(
        `SELECT user_id::text, COUNT(*)::text AS cnt
         FROM public.projects
         GROUP BY user_id
         ORDER BY cnt DESC
         LIMIT 10`,
        { type: QueryTypes.SELECT }
      ).catch(() => [] as { user_id: string; cnt: string }[])
      results.projects_by_user = projectSample
    }

    if (tables.some((t) => t.tablename === 'users')) {
      const userSample = await sequelize.query<{ id: string; email: string }>(
        `SELECT id::text, email FROM public.users ORDER BY created_at DESC LIMIT 10`,
        { type: QueryTypes.SELECT }
      ).catch(() => [] as { id: string; email: string }[])
      results.recent_users = userSample
    }

    const envSource =
      process.env.DATABASE_URL_DIRECT ? 'DATABASE_URL_DIRECT' :
      process.env.POSTGRES_URL_NON_POOLING ? 'POSTGRES_URL_NON_POOLING' :
      process.env.SUPABASE_DATABASE_URL ? 'SUPABASE_DATABASE_URL' :
      process.env.DATABASE_URL ? 'DATABASE_URL' : 'NONE'

    let envHost = 'unknown'
    const raw = process.env.DATABASE_URL_DIRECT || process.env.POSTGRES_URL_NON_POOLING || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
    if (raw) {
      try { envHost = new URL(raw).hostname } catch { /* */ }
    }
    results.env = { source: envSource, host: envHost }

  } catch (err: any) {
    results.connected = false
    results.error = err.message
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
