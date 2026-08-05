export type DatabaseConnectionInfo = {
  mode: 'cloud-sql' | 'direct' | 'local'
  envSource: string
  host?: string
  database?: string
  user?: string
}

export function extractConnectionErrorCodes(error: unknown): {
  code?: string
  errno?: string
  sqlState?: string
  reason?: string
  message: string
} {
  const err = error as {
    message?: string
    code?: string
    errno?: string
    sqlState?: string
    parent?: { code?: string; errno?: string; sqlState?: string; message?: string }
    original?: { code?: string; errno?: string; sqlState?: string; message?: string }
  }

  const message = err?.message || String(error)
  const nested = err?.original ?? err?.parent ?? err

  return {
    message,
    code: nested?.code ?? err?.code,
    errno: nested?.errno ?? err?.errno,
    sqlState: nested?.sqlState ?? err?.sqlState,
    reason: message.includes('bad certificate')
      ? 'TLS alert 42 (bad_certificate) — server rejected client cert during mTLS handshake'
      : message.includes('SSL') || message.includes('TLS')
        ? 'SSL/TLS handshake failure'
        : undefined,
  }
}

export function isSslOrCertConnectionError(error: unknown): boolean {
  const { message, code } = extractConnectionErrorCodes(error)
  const normalized = message.toLowerCase()

  if (code && /^ERR_SSL_/i.test(code)) return true
  if (/ssl\/tls alert bad certificate/i.test(message)) return true
  if (/ssl alert number 42/i.test(message)) return true
  if (/bad_certificate/i.test(normalized)) return true
  if (/self signed certificate/i.test(normalized)) return true
  if (/certificate has expired/i.test(normalized)) return true
  if (/unable to verify the first certificate/i.test(normalized)) return true

  return false
}

/**
 * Postgres refused the connection because the server is at `max_connections`.
 *
 * Distinct from an SSL fault: nothing is wrong with this process, so resetting
 * the connector would not help and would throw away a healthy pool. Slots free
 * up as other requests finish, which makes the failure worth retrying.
 *
 * Wording differs across server versions ("non-replication superuser" on 14/15,
 * "roles with the SUPERUSER attribute" on 16), and pg's own pool reports
 * "sorry, too many clients already", so match all three.
 */
export function isTransientConnectionCapacityError(error: unknown): boolean {
  const { message, code } = extractConnectionErrorCodes(error)
  const normalized = message.toLowerCase()

  // 53300 too_many_connections, 53400 configuration_limit_exceeded.
  if (code === '53300' || code === '53400') return true
  if (normalized.includes('remaining connection slots are reserved')) return true
  if (normalized.includes('too many clients already')) return true
  if (normalized.includes('too many connections')) return true

  return false
}

export function formatDatabaseConnectionFailure(
  error: unknown,
  connectionInfo: DatabaseConnectionInfo,
  context: string
): string {
  const details = extractConnectionErrorCodes(error)
  const parts = [
    `[database] ${context} failed`,
    `mode=${connectionInfo.mode}`,
    `env=${connectionInfo.envSource}`,
    connectionInfo.host ? `host=${connectionInfo.host}` : null,
    details.code ? `code=${details.code}` : null,
    details.errno ? `errno=${details.errno}` : null,
    details.sqlState ? `sqlState=${details.sqlState}` : null,
    details.reason ?? details.message,
  ].filter(Boolean)

  return parts.join(' | ')
}

export function logDatabaseConnectionFailure(
  error: unknown,
  context: string,
  getConnectionInfo: () => DatabaseConnectionInfo
): void {
  console.error(formatDatabaseConnectionFailure(error, getConnectionInfo(), context))
}
