/**
 * Postgres error classification.
 *
 * Kept free of `@/config/database` so callers (and tests) can classify a
 * failure without opening a connection.
 */

/** Postgres `undefined_table`. */
export const PG_UNDEFINED_TABLE = '42P01'

/**
 * True when a query failed because the relation does not exist.
 *
 * Sequelize wraps the driver error, so the pg code can sit on the error itself
 * or on `parent`/`original`.
 */
export function isUndefinedTableError(error: unknown): boolean {
  const candidates = [
    error,
    (error as { parent?: unknown } | null | undefined)?.parent,
    (error as { original?: unknown } | null | undefined)?.original,
  ]
  return candidates.some(
    (candidate) =>
      (candidate as { code?: string } | null | undefined)?.code === PG_UNDEFINED_TABLE
  )
}
