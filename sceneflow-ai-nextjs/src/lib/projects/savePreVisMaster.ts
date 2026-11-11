import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import type { PreVisMasterAsset } from '@/types/publishingAssets'

export interface SavePreVisMasterInput {
  projectId: string
  asset: PreVisMasterAsset
}

interface PublishingPreVisRow {
  previs_by_language: Record<string, PreVisMasterAsset> | string | null
}

function parsePreVisMap(
  value: Record<string, PreVisMasterAsset> | string | null | undefined
): Record<string, PreVisMasterAsset> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, PreVisMasterAsset>)
        : {}
    } catch {
      return {}
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {}
}

/**
 * Atomically persist a stitched combined Pre-Vis video URL under
 * `metadata.visionPhase.publishing.previsByLanguage[language]` (and legacy
 * `metadata.exportedAnimaticUrl` for English) without loading the full project row.
 */
export async function savePreVisMaster(input: SavePreVisMasterInput): Promise<boolean> {
  const mp4Url = input.asset.mp4Url?.trim()
  const language = input.asset.language?.trim() || 'en'
  if (!input.projectId || !mp4Url) return false

  return sequelize.transaction(async (transaction) => {
    const rows = await sequelize.query<PublishingPreVisRow>(
      `
      SELECT
        COALESCE(
          metadata #> '{visionPhase,publishing,previsByLanguage}',
          '{}'::jsonb
        ) AS previs_by_language
      FROM projects
      WHERE id = :projectId
      FOR UPDATE
      `,
      {
        replacements: { projectId: input.projectId },
        type: QueryTypes.SELECT,
        transaction,
      }
    )

    const row = rows[0]
    if (!row) return false

    const currentMap = parsePreVisMap(row.previs_by_language)
    const normalizedAsset: PreVisMasterAsset = {
      mp4Url,
      language,
      durationSec:
        typeof input.asset.durationSec === 'number' && Number.isFinite(input.asset.durationSec)
          ? input.asset.durationSec
          : 0,
      sceneCount:
        typeof input.asset.sceneCount === 'number' && Number.isFinite(input.asset.sceneCount)
          ? input.asset.sceneCount
          : 0,
      resolution: input.asset.resolution,
      renderedAt: input.asset.renderedAt || new Date().toISOString(),
      status: input.asset.status ?? 'ready',
    }
    const nextMap: Record<string, PreVisMasterAsset> = {
      ...currentMap,
      [language]: normalizedAsset,
    }

    if (language === 'en') {
      await sequelize.query(
        `
        UPDATE projects
        SET
          metadata = jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(metadata, '{}'::jsonb),
                  '{visionPhase}',
                  COALESCE(metadata #> '{visionPhase}', '{}'::jsonb),
                  true
                ),
                '{visionPhase,publishing}',
                COALESCE(metadata #> '{visionPhase,publishing}', '{}'::jsonb),
                true
              ),
              '{visionPhase,publishing,previsByLanguage}',
              CAST(:previsByLanguage AS jsonb),
              true
            ),
            '{exportedAnimaticUrl}',
            to_jsonb(:mp4Url::text),
            true
          ),
          updated_at = NOW()
        WHERE id = :projectId
        `,
        {
          replacements: {
            projectId: input.projectId,
            previsByLanguage: JSON.stringify(nextMap),
            mp4Url,
          },
          type: QueryTypes.UPDATE,
          transaction,
        }
      )
    } else {
      await sequelize.query(
        `
        UPDATE projects
        SET
          metadata = jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{visionPhase}',
                COALESCE(metadata #> '{visionPhase}', '{}'::jsonb),
                true
              ),
              '{visionPhase,publishing}',
              COALESCE(metadata #> '{visionPhase,publishing}', '{}'::jsonb),
              true
            ),
            '{visionPhase,publishing,previsByLanguage}',
            CAST(:previsByLanguage AS jsonb),
            true
          ),
          updated_at = NOW()
        WHERE id = :projectId
        `,
        {
          replacements: {
            projectId: input.projectId,
            previsByLanguage: JSON.stringify(nextMap),
          },
          type: QueryTypes.UPDATE,
          transaction,
        }
      )
    }

    return true
  })
}
