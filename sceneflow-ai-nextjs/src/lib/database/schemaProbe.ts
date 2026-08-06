import { QueryTypes } from 'sequelize'
import { sequelize } from '@/models'

/**
 * Cheap "is the schema already current?" checks for the lazy migrations.
 *
 * Those migrations guard themselves with module-level booleans, which only hold
 * within one warm serverless instance. Every cold start therefore re-ran a batch
 * of idempotent DDL — around twenty sequential round trips for the users table
 * alone — and that landed inside whichever user request happened to be first.
 *
 * A single `information_schema` lookup answers the same question, so the common
 * case (schema already migrated) costs one round trip instead of twenty while the
 * self-healing path is left intact for a fresh database.
 */

/** True when `table` exists and has every one of `columns`. */
export async function hasColumns(table: string, columns: string[]): Promise<boolean> {
  if (columns.length === 0) return true
  try {
    const rows = await sequelize.query<{ column_name: string }>(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = :table
          AND column_name IN (:columns)`,
      {
        type: QueryTypes.SELECT,
        replacements: { table, columns },
      }
    )
    const found = new Set(rows.map((row) => row.column_name))
    return columns.every((column) => found.has(column))
  } catch (error) {
    // Probing is an optimization. If it fails, fall through and let the migration
    // run — a slow request beats a request that wrongly assumes a missing column.
    console.warn('[schemaProbe] column probe failed:', (error as Error)?.message)
    return false
  }
}

/** True when every table in `tables` exists. */
export async function hasTables(tables: string[]): Promise<boolean> {
  if (tables.length === 0) return true
  try {
    const rows = await sequelize.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN (:tables)`,
      {
        type: QueryTypes.SELECT,
        replacements: { tables },
      }
    )
    const found = new Set(rows.map((row) => row.table_name))
    return tables.every((table) => found.has(table))
  } catch (error) {
    console.warn('[schemaProbe] table probe failed:', (error as Error)?.message)
    return false
  }
}
