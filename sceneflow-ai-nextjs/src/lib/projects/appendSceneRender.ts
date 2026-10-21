import { QueryTypes } from 'sequelize'
import { sequelize } from '@/config/database'
import type { ProductionStream } from '@/components/vision/scene-production/types'
import { planSceneRenderAppend } from '@/lib/projects/planSceneRenderAppend'

export interface AppendSceneRenderInput {
  projectId: string
  sceneId: string
  stream: ProductionStream
  /** Signed URL this permanent file replaces. A newer rendered URL is left in place. */
  previousUrl?: string
}

interface SceneStreamRow {
  streams: ProductionStream[] | string | null
  deleted_stream_ids: string[] | string | null
  rendered_scene_url: string | null
}

function storedStreams(value: ProductionStream[] | string | null): ProductionStream[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? (parsed as ProductionStream[]) : []
    } catch {
      return []
    }
  }
  return []
}

function storedDeletedStreamIds(value: string[] | string | null | undefined): Set<string> {
  if (Array.isArray(value)) {
    return new Set(value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed)
        ? new Set(parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
        : new Set()
    } catch {
      return new Set()
    }
  }
  return new Set()
}

/**
 * Store one finished scene render.
 *
 * Reads and writes the stream list, rendered URL, and timestamps for this
 * scene only. The rest of the project row is not loaded into the function.
 */
export async function appendSceneRender(input: AppendSceneRenderInput): Promise<boolean> {
  const downloadUrl = input.stream.mp4Url?.trim()
  if (!input.projectId || !input.sceneId || !input.stream.id || !downloadUrl) return false

  return sequelize.transaction(async (transaction) => {
    const rows = await sequelize.query<SceneStreamRow>(
      `
      SELECT
        COALESCE(
          metadata #> ARRAY['visionPhase','production','scenes', :sceneId, 'productionStreams'],
          '[]'::jsonb
        ) AS streams,
        COALESCE(
          metadata #> ARRAY['visionPhase','production','scenes', :sceneId, 'deletedStreamIds'],
          '[]'::jsonb
        ) AS deleted_stream_ids,
        metadata #>> ARRAY['visionPhase','production','scenes', :sceneId, 'renderedSceneUrl'] AS rendered_scene_url
      FROM projects
      WHERE id = :projectId
      FOR UPDATE
      `,
      {
        replacements: { projectId: input.projectId, sceneId: input.sceneId },
        type: QueryTypes.SELECT,
        transaction,
      }
    )
    const row = rows[0]
    if (!row) return false

    const deletedIds = storedDeletedStreamIds(row.deleted_stream_ids)
    const activeStreams = storedStreams(row.streams).filter(
      (stream) => !stream?.id || !deletedIds.has(stream.id)
    )

    const planned = planSceneRenderAppend({
      streams: activeStreams,
      renderedSceneUrl: row.rendered_scene_url,
      stream: { ...input.stream, mp4Url: downloadUrl },
      previousUrl: input.previousUrl,
    })

    await sequelize.query(
      `
      UPDATE projects
      SET
        metadata = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{visionPhase,production,lastUpdated}',
                to_jsonb(:lastUpdated::text),
                true
              ),
              ARRAY['visionPhase','production','scenes', :sceneId, 'productionStreams'],
              CAST(:streams AS jsonb),
              true
            ),
            ARRAY['visionPhase','production','scenes', :sceneId, 'renderedSceneUrl'],
            to_jsonb(:renderedSceneUrl::text),
            true
          ),
          ARRAY['visionPhase','production','scenes', :sceneId, 'renderedAt'],
          to_jsonb(:renderedAt::text),
          true
        ),
        updated_at = NOW()
      WHERE id = :projectId
      `,
      {
        replacements: {
          projectId: input.projectId,
          sceneId: input.sceneId,
          streams: JSON.stringify(planned.streams),
          renderedSceneUrl: planned.renderedSceneUrl,
          renderedAt: planned.renderedAt,
          lastUpdated: planned.renderedAt,
        },
        transaction,
      }
    )
    return true
  })
}
