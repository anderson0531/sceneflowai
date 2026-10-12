import { NextRequest } from 'next/server'
import Project from '../../../../models/Project'
import { sequelize } from '../../../../config/database'
import {
  migrateProjectBeatDirection,
  migrateProjectBeatSetContext,
} from '@/lib/script/beatMigration'
import {
  attachSceneDirectionsToScript,
  mergeSceneDirectionsOntoFresh,
  readScenesFromVisionMetadata,
  writeScenesIntoVisionMetadata,
  SCENE_DIRECTION_BUDGET_MS,
  SCENE_DIRECTION_CONCURRENCY,
  SCENE_DIRECTION_PERSIST_RESERVE_MS,
} from '@/lib/sceneGeneration/attachSceneDirectionsToScript'

export const runtime = 'nodejs'
export const maxDuration = 600

/**
 * Scene-direction inception pass.
 *
 * Runs after the script is saved, with the full route budget and four
 * concurrent Pro calls. Beat-direction migration runs once directions exist
 * so coverage lands before shot direction.
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      try {
        const { projectId } = await request.json()
        if (!projectId || typeof projectId !== 'string') {
          send({ type: 'error', error: 'projectId required' })
          controller.close()
          return
        }

        await sequelize.authenticate()
        const project = await Project.findByPk(projectId)
        if (!project) {
          send({ type: 'error', error: 'Project not found' })
          controller.close()
          return
        }

        const scenes = readScenesFromVisionMetadata(project.metadata)
        if (scenes.length === 0) {
          send({
            type: 'complete',
            directionsAttached: false,
            attached: 0,
            skipped: 0,
            deferred: 0,
            directionFailures: [],
            cancelled: false,
          })
          controller.close()
          return
        }

        send({
          type: 'progress',
          phase: 'direction',
          status: 'Generating scene directions…',
          done: 0,
          total: scenes.filter((scene) => !scene?.sceneDirection).length,
        })

        const attachResult = await attachSceneDirectionsToScript(scenes, {
          concurrency: SCENE_DIRECTION_CONCURRENCY,
          deadlineMs: SCENE_DIRECTION_BUDGET_MS - SCENE_DIRECTION_PERSIST_RESERVE_MS,
          shouldContinue: () => !request.signal.aborted,
          onProgress: (done, total) => {
            send({
              type: 'progress',
              phase: 'direction',
              status: `Scene directions ${done}/${total}`,
              done,
              total,
            })
          },
        })

        const fresh = await Project.findByPk(projectId)
        if (!fresh) {
          send({ type: 'error', error: 'Project not found after scene direction' })
          controller.close()
          return
        }

        const merged = mergeSceneDirectionsOntoFresh(
          readScenesFromVisionMetadata(fresh.metadata),
          attachResult.scenes
        )
        let metadata = writeScenesIntoVisionMetadata(fresh.metadata, merged)
        try {
          const beatDirectionResult = migrateProjectBeatDirection(metadata)
          metadata = beatDirectionResult.metadata
          if (beatDirectionResult.changed) {
            console.log('[Scene Direction Pass] Beat-direction backfill:', {
              migratedSceneCount: beatDirectionResult.migratedSceneCount,
            })
          }
        } catch (bdErr) {
          console.warn('[Scene Direction Pass] Beat-direction backfill failed:', bdErr)
        }

        // Runs after the direction backfill, which copies a beat's action text
        // into frozenMoment and re-matches the scene prop catalog out of it.
        try {
          const setContextResult = migrateProjectBeatSetContext(metadata)
          metadata = setContextResult.metadata
          if (setContextResult.changed) {
            console.log('[Scene Direction Pass] Beat set-context cleanup:', {
              migratedSceneCount: setContextResult.migratedSceneCount,
            })
          }
        } catch (scErr) {
          console.warn('[Scene Direction Pass] Beat set-context cleanup failed:', scErr)
        }

        await fresh.update({ metadata })
        console.log('[Scene Direction Pass] Attached:', {
          attached: attachResult.attachedCount,
          skipped: attachResult.skippedCount,
          deferred: attachResult.deferredCount,
          failures: attachResult.directionFailures,
          cancelled: request.signal.aborted,
        })

        send({
          type: 'complete',
          directionsAttached: attachResult.directionsAttached,
          attached: attachResult.attachedCount,
          skipped: attachResult.skippedCount,
          deferred: attachResult.deferredCount,
          directionFailures: attachResult.directionFailures,
          cancelled: request.signal.aborted,
        })
        controller.close()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to generate scene directions'
        console.error('[Scene Direction Pass] Error:', error)
        send({ type: 'error', error: message })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
