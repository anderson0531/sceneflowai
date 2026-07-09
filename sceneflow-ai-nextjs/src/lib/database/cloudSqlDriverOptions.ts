import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'

let connector: Connector | null = null

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

/** Writes SA JSON to a temp file so @google-cloud/cloud-sql-connector can authenticate. */
function ensureGoogleApplicationCredentialsFile(): void {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return
  }
  const raw = getGoogleCredentialsJson()
  if (!raw) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON or GCP_SERVICE_ACCOUNT_KEY is required for Cloud SQL'
    )
  }
  const credentials = parseGoogleServiceAccountJson(raw)
  const dir = join(tmpdir(), 'sceneflow-gcp')
  mkdirSync(dir, { recursive: true })
  const credPath = join(dir, 'application_default_credentials.json')
  writeFileSync(credPath, JSON.stringify(credentials), { mode: 0o600 })
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath
}

function getConnector(): Connector {
  if (!connector) {
    ensureGoogleApplicationCredentialsFile()
    connector = new Connector()
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
