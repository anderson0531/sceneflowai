/**
 * Bootstrap Postgres schema for a fresh DB (e.g. Neon). Loads .env.local then runs Sequelize sync.
 *
 * Usage (from sceneflow-ai-nextjs/):
 *   npx tsx scripts/run-bootstrap-schema.ts
 *
 * Or set DATABASE_URL / POSTGRES_* and run from CI.
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env.local') })
dotenv.config({ path: path.join(root, '.env.production.local') })

async function main() {
  const { bootstrapDatabaseSchema } = await import('../src/lib/database/bootstrapSchema')
  const result = await bootstrapDatabaseSchema()
  console.log(result.logs.join('\n'))
  if (!result.success) {
    process.exitCode = 1
  }
}

main()
