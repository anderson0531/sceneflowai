import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: join(process.cwd(), '.env.local') })

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

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()
if (!raw) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON missing')
  process.exit(1)
}

const dir = join(tmpdir(), 'sceneflow-cloudsql')
mkdirSync(dir, { recursive: true })
const keyPath = join(dir, 'sa-key.json')
writeFileSync(keyPath, JSON.stringify(parseGoogleServiceAccountJson(raw), null, 2), { mode: 0o600 })
console.log(keyPath)
