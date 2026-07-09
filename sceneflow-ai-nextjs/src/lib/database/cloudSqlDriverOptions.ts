import { GoogleAuth } from 'google-auth-library'

type ConnectSettingsResponse = {
  ipAddresses?: Array<{ type?: string; ipAddress?: string }>
  serverCaCert?: { cert?: string }
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

async function getCloudSqlAccessToken(): Promise<string> {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is required for Cloud SQL')
  }
  const credentials = parseGoogleServiceAccountJson(credentialsJson)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const token = await auth.getAccessToken()
  if (!token) {
    throw new Error('Failed to obtain Cloud SQL access token')
  }
  return token
}

/** Driver options for pg/Sequelize via Cloud SQL public IP + server CA. */
export async function getCloudSqlDriverOptions(instanceConnectionName: string): Promise<{
  host: string
  port: number
  ssl: { rejectUnauthorized: boolean; ca: string }
}> {
  const [projectId, , instanceId] = instanceConnectionName.split(':')
  if (!projectId || !instanceId) {
    throw new Error(`Invalid CLOUD_SQL_INSTANCE_CONNECTION_NAME: ${instanceConnectionName}`)
  }

  const token = await getCloudSqlAccessToken()
  const url = `https://sqladmin.googleapis.com/sql/v1beta4/projects/${projectId}/instances/${instanceId}/connectSettings`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Cloud SQL connectSettings failed (${res.status}): ${body}`)
  }

  const data = (await res.json()) as ConnectSettingsResponse
  const publicIp = data.ipAddresses?.find((entry) => entry.type === 'PRIMARY')?.ipAddress
  const ca = data.serverCaCert?.cert
  if (!publicIp || !ca) {
    throw new Error('Cloud SQL connectSettings missing public IP or server CA cert')
  }

  const strictTls = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  return {
    host: publicIp,
    port: 5432,
    ssl: {
      rejectUnauthorized: strictTls,
      ca,
    },
  }
}
