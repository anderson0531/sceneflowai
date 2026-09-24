import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'

/**
 * Lite reads drop production in Postgres so the function never parses take blobs.
 * Production reads select only that key.
 */
export const LITE_PROJECT_SQL = `
SELECT
  id,
  title,
  description,
  current_step,
  step_progress,
  status,
  created_at,
  updated_at,
  metadata #- '{visionPhase,production}' AS metadata
FROM projects
WHERE id = :id
LIMIT 1
`.trim()

export const PROJECT_WITH_PRODUCTION_SQL = `
SELECT
  id,
  title,
  description,
  current_step,
  step_progress,
  status,
  created_at,
  updated_at,
  metadata
FROM projects
WHERE id = :id
LIMIT 1
`.trim()

export const PRODUCTION_ONLY_SQL = `
SELECT metadata->'visionPhase'->'production' AS production
FROM projects
WHERE id = :id
LIMIT 1
`.trim()

export interface ProjectReadRow {
  id: string
  title: string
  description: string | null
  current_step: string | null
  step_progress: Record<string, number> | null
  status: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
  metadata: Record<string, unknown> | null
}

export async function loadProjectForRead(
  projectId: string,
  options?: { includeProduction?: boolean }
): Promise<ProjectReadRow | null> {
  const sql = options?.includeProduction ? PROJECT_WITH_PRODUCTION_SQL : LITE_PROJECT_SQL
  const rows = await sequelize.query<ProjectReadRow>(sql, {
    replacements: { id: projectId },
    type: QueryTypes.SELECT,
  })
  return rows[0] ?? null
}

export async function loadProjectProduction(
  projectId: string
): Promise<Record<string, unknown> | null> {
  const rows = await sequelize.query<{ production: Record<string, unknown> | null }>(
    PRODUCTION_ONLY_SQL,
    {
      replacements: { id: projectId },
      type: QueryTypes.SELECT,
    }
  )
  if (!rows.length) return null
  const production = rows[0]?.production
  return production && typeof production === 'object' ? production : {}
}
