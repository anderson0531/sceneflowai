import '@/models'
import { Project } from '@/models/Project'
import {
  cancelActiveJobsForProject,
  createGenerationJob,
} from '@/lib/jobs/jobService'
import { getSceneBeats } from '@/lib/script/beatMigration'
import {
  scenePolishBeatFingerprint,
  slimPolishScene,
} from '@/lib/script/scenePolish/formatPolishBeats'
import type { PolishSceneInput } from '@/lib/script/scenePolish/types'
import type GenerationJob from '@/models/GenerationJob'
import { polishActivityLabel } from './polishJobConstants'

export {
  POLISH_PROGRESS_QUEUED,
  POLISH_PROGRESS_ANALYZING,
  POLISH_PROGRESS_PERSISTING,
  POLISH_PROGRESS_DONE,
  polishActivityLabel,
} from './polishJobConstants'

export async function enqueueScenePolish(input: {
  userId: string
  projectId: string
  sceneIndex: number
  scene: PolishSceneInput
  previousScene?: PolishSceneInput | null
  nextScene?: PolishSceneInput | null
}): Promise<{
  job: GenerationJob
  dispatched: boolean
  replacedPreviousCount: number
  beatCount: number
  activity: string
}> {
  const { userId, projectId, sceneIndex } = input
  if (!Number.isInteger(sceneIndex) || sceneIndex < 0) {
    throw new Error('sceneIndex is required')
  }

  const slimScene = slimPolishScene(input.scene)
  if (!slimScene) {
    throw new Error('Scene is required')
  }

  const beatCount = getSceneBeats(slimScene as Record<string, unknown>).length
  if (beatCount === 0) {
    throw new Error('Scene has no beats to polish')
  }

  const project = await Project.findByPk(projectId)
  if (!project) {
    throw new Error('Project not found')
  }
  const visionPhase: Record<string, unknown> = (project.metadata as Record<string, any>)?.visionPhase || {}
  const baseScriptUpdatedAt =
    typeof visionPhase.scriptUpdatedAt === 'string' ? visionPhase.scriptUpdatedAt : null

  const sceneId =
    typeof slimScene.id === 'string'
      ? slimScene.id
      : typeof slimScene.sceneId === 'string'
        ? slimScene.sceneId
        : undefined

  const activity = polishActivityLabel(beatCount, 'analyzing')

  const { cancelledIds } = await cancelActiveJobsForProject({
    userId,
    projectId,
    jobType: 'scene_polish',
  })

  const { job, dispatched } = await createGenerationJob({
    userId,
    projectId,
    jobType: 'scene_polish',
    payload: {
      sceneIndex,
      ...(sceneId ? { sceneId } : {}),
      beatCount,
      beatFingerprint: scenePolishBeatFingerprint(slimScene),
      baseScriptUpdatedAt,
      activity,
      scene: slimScene,
      previousScene: slimPolishScene(input.previousScene ?? null),
      nextScene: slimPolishScene(input.nextScene ?? null),
    },
  })

  return {
    job,
    dispatched,
    replacedPreviousCount: cancelledIds.length,
    beatCount,
    activity,
  }
}
