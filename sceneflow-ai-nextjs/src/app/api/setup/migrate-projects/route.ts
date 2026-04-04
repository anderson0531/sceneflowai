import { NextRequest, NextResponse } from 'next/server'
import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import '@/models'

export const dynamic = 'force-dynamic'

const OLD_ID = 'be8aabd4-2a05-4466-abae-6ad4e1bc6498'
const NEW_ID = '36ea1d9d-14a6-465c-be7b-b2da1888993f'

const CHILD_TABLES: { table: string; column: string }[] = [
  { table: 'projects', column: 'user_id' },
  { table: 'series', column: 'user_id' },
  { table: 'credit_ledger', column: 'user_id' },
  { table: 'ai_usage', column: 'user_id' },
  { table: 'user_provider_configs', column: 'user_id' },
  { table: 'collab_sessions', column: 'owner_user_id' },
  { table: 'render_jobs', column: 'user_id' },
  { table: 'voice_consents', column: 'user_id' },
  { table: 'user_voice_clones', column: 'user_id' },
  { table: 'moderation_events', column: 'user_id' },
  { table: 'visionary_reports', column: 'user_id' },
]

const USER_FIELDS_TO_MERGE = [
  'credits', 'subscription_tier_id', 'subscription_status',
  'subscription_start_date', 'subscription_end_date',
  'subscription_credits_monthly', 'subscription_credits_expires_at',
  'addon_credits', 'storage_used_gb',
  'paddle_customer_id', 'paddle_subscription_id',
  'one_time_tiers_purchased', 'trust_score',
  'first_name', 'last_name', 'avatar_url',
]

async function tableExists(name: string): Promise<boolean> {
  const rows = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:name) AS exists`,
    { replacements: { name }, type: QueryTypes.SELECT }
  )
  return rows[0]?.exists === true
}

async function countRows(table: string, col: string, userId: string): Promise<number> {
  const [r] = await sequelize.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM public."${table}" WHERE "${col}" = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  )
  return parseInt(r?.cnt ?? '0', 10)
}

async function migrateTable(table: string, col: string, from: string, to: string): Promise<number> {
  const [, meta] = await sequelize.query(
    `UPDATE public."${table}" SET "${col}" = :to WHERE "${col}" = :from`,
    { replacements: { to, from } }
  )
  return (meta as any)?.rowCount ?? 0
}

export async function GET() {
  try {
    await sequelize.authenticate()

    const [oldUser] = await sequelize.query<Record<string, unknown>>(
      `SELECT * FROM public.users WHERE id = :id`,
      { replacements: { id: OLD_ID }, type: QueryTypes.SELECT }
    ).catch(() => [null])

    const [newUser] = await sequelize.query<Record<string, unknown>>(
      `SELECT * FROM public.users WHERE id = :id`,
      { replacements: { id: NEW_ID }, type: QueryTypes.SELECT }
    ).catch(() => [null])

    const tableData: Record<string, unknown> = {}
    for (const { table, column } of CHILD_TABLES) {
      const exists = await tableExists(table)
      if (!exists) { tableData[table] = { exists: false }; continue }
      tableData[table] = {
        exists: true,
        column,
        old_account: await countRows(table, column, OLD_ID),
        new_account: await countRows(table, column, NEW_ID),
      }
    }

    const projectSample = await sequelize.query<Record<string, unknown>>(
      `SELECT id::text, title, description, status, current_step,
              LEFT(metadata::text, 500) AS metadata_preview,
              created_at, updated_at
       FROM public.projects
       WHERE user_id = :uid
       ORDER BY updated_at DESC LIMIT 3`,
      { replacements: { uid: NEW_ID }, type: QueryTypes.SELECT }
    ).catch(() => [])

    return NextResponse.json({
      old_user: oldUser ? {
        id: (oldUser as any).id,
        email: (oldUser as any).email,
        credits: (oldUser as any).credits,
        addon_credits: (oldUser as any).addon_credits,
        subscription_credits_monthly: (oldUser as any).subscription_credits_monthly,
        subscription_status: (oldUser as any).subscription_status,
        subscription_tier_id: (oldUser as any).subscription_tier_id,
        first_name: (oldUser as any).first_name,
        last_name: (oldUser as any).last_name,
        storage_used_gb: (oldUser as any).storage_used_gb,
        paddle_customer_id: (oldUser as any).paddle_customer_id,
        paddle_subscription_id: (oldUser as any).paddle_subscription_id,
      } : 'NOT FOUND',
      new_user: newUser ? {
        id: (newUser as any).id,
        email: (newUser as any).email,
        credits: (newUser as any).credits,
        addon_credits: (newUser as any).addon_credits,
        subscription_credits_monthly: (newUser as any).subscription_credits_monthly,
        subscription_status: (newUser as any).subscription_status,
        subscription_tier_id: (newUser as any).subscription_tier_id,
        first_name: (newUser as any).first_name,
        last_name: (newUser as any).last_name,
        storage_used_gb: (newUser as any).storage_used_gb,
        paddle_customer_id: (newUser as any).paddle_customer_id,
        paddle_subscription_id: (newUser as any).paddle_subscription_id,
      } : 'NOT FOUND',
      child_tables: tableData,
      sample_projects: projectSample,
      instructions: {
        migrate_all: `POST { "fromUserId": "${OLD_ID}", "toUserId": "${NEW_ID}" } to migrate child rows + merge user fields (credits, subscription, profile)`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await sequelize.authenticate()
    const { fromUserId, toUserId } = (await request.json()) || {}

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'Provide { fromUserId, toUserId }' }, { status: 400 })
    }

    const results: { step: string; detail: string }[] = []

    for (const { table, column } of CHILD_TABLES) {
      if (!(await tableExists(table))) {
        results.push({ step: `${table}`, detail: 'table missing, skipped' })
        continue
      }
      const n = await migrateTable(table, column, fromUserId, toUserId)
      results.push({ step: `${table}`, detail: `${n} rows moved` })
    }

    const setClauses = USER_FIELDS_TO_MERGE.map(
      (f) => `"${f}" = COALESCE(old."${f}", new."${f}")`
    ).join(', ')

    const [, mergeResult] = await sequelize.query(
      `UPDATE public.users AS new
       SET ${setClauses}
       FROM public.users AS old
       WHERE old.id = :fromId AND new.id = :toId`,
      { replacements: { fromId: fromUserId, toId: toUserId } }
    )
    const mergedRows = (mergeResult as any)?.rowCount ?? 0
    results.push({ step: 'user_fields_merge', detail: `${mergedRows} user record updated (credits, subscription, profile copied from old account)` })

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
