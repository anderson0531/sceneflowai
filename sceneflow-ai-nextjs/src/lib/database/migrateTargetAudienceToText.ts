/**
 * Widen target_audience columns from VARCHAR(255) to TEXT for free-text audience descriptions.
 * Safe to run multiple times — only alters when column is still character varying.
 */

import { sequelize } from '@/config/database'
import { QueryTypes } from 'sequelize'

const WIDEN_TARGET_AUDIENCE_SQL = `
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'series'
          AND column_name = 'target_audience'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE series ALTER COLUMN target_audience TYPE TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects'
          AND column_name = 'target_audience'
          AND data_type = 'character varying'
    ) THEN
        ALTER TABLE projects ALTER COLUMN target_audience TYPE TEXT;
    END IF;
END
$$;
`

export async function migrateTargetAudienceToText(): Promise<{
  success: boolean
  actions: string[]
  errors: string[]
}> {
  const actions: string[] = []
  const errors: string[] = []

  try {
    await sequelize.query(WIDEN_TARGET_AUDIENCE_SQL)
    actions.push('Ran widen_target_audience_to_text.sql')

    const columns = (await sequelize.query(
      `
      SELECT table_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('series', 'projects')
        AND column_name = 'target_audience'
      ORDER BY table_name
      `,
      { type: QueryTypes.SELECT }
    )) as Array<{ table_name: string; data_type: string }>

    for (const row of columns) {
      actions.push(`${row.table_name}.target_audience is ${row.data_type}`)
      if (row.data_type !== 'text') {
        errors.push(`${row.table_name}.target_audience is still ${row.data_type}, expected text`)
      }
    }

    return { success: errors.length === 0, actions, errors }
  } catch (error: any) {
    errors.push(error?.message || String(error))
    return { success: false, actions, errors }
  }
}
