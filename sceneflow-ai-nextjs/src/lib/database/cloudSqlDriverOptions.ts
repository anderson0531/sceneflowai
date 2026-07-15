import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'
import { GoogleAuth } from 'google-auth-library'

let connector: Connector | null = null

/** Drop cached connector so the next connection mints a fresh ephemeral client cert. */
export function resetCloudSqlConnector(): void {
  connector = null
}

function parseGoogleServiceAccountJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    const fixed = raw.replace(
      /("private_key"\s*:\s*")([\s\S]*?)("\s*,\s*"client_email")/,
      (_match, start: string, keyBody: string, end: string) =>
        `${start}${keyBody.replace(/\r?\n/g, '\\n')}${end}`
    )
    return JSON.parse(fixed) as Record<string, unknown>
  }
}

function getGoogleCredentialsJson(): string | null {
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim() ||
    process.env.GCP_SERVICE_ACCOUNT_KEY?.trim()
  return raw || null
}

function createConnectorAuth(): GoogleAuth | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return undefined
  }
  const raw = getGoogleCredentialsJson()
  if (!raw) {
    return undefined
  }
  const credentials = parseGoogleServiceAccountJson(raw)
  return new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/sqlservice.admin'],
  })
}

function getConnector(): Connector {
  if (!connector) {
    const auth = createConnectorAuth()
    if (!auth && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const raw = getGoogleCredentialsJson()
      if (!raw) {
        throw new Error(
          'GOOGLE_APPLICATION_CREDENTIALS_JSON or GCP_SERVICE_ACCOUNT_KEY is required for Cloud SQL'
        )
      }
    }
    connector = auth ? new Connector({ auth }) : new Connector()
  }
  return connector
}

/** Driver options for pg/Sequelize via Cloud SQL Connector (no authorized networks required). */
export async function getCloudSqlDriverOptions(instanceConnectionName: string): Promise<{
  stream: () => import('node:tls').TLSSocket
}> {
  return getConnector().getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
  })
}
