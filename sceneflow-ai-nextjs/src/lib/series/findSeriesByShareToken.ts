import { QueryTypes } from 'sequelize'
import '@/models'
import { Series } from '@/models/Series'
import { sequelize } from '@/config/database'

export async function findSeriesByShareToken(token: string) {
  await sequelize.authenticate()
  const rows = await sequelize.query<{ id: string }>(
    `SELECT id FROM series WHERE metadata->>'shareToken' = :token LIMIT 1`,
    { replacements: { token }, type: QueryTypes.SELECT }
  )
  const row = Array.isArray(rows) ? rows[0] : undefined
  if (!row?.id) return null
  return Series.findByPk(row.id)
}
