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
