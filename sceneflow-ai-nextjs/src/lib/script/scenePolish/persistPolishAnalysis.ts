import '@/models'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { applyPolishAnalysisToVisionPhase } from './applyPolishAnalysis'
import type { ScenePolishAnalysis } from './types'

export async function persistPolishAnalysis(input: {
  projectId: string
  sceneIndex: number
  sceneId?: string
  analysis: ScenePolishAnalysis
}): Promise<{ saved: boolean; stale: boolean; sceneIndex: number }> {
  const { projectId, sceneIndex, sceneId, analysis } = input

  return sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(projectId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!project) return { saved: false, stale: false, sceneIndex }

    const metadata: Record<string, any> = { ...(project.metadata || {}) }
    const applied = applyPolishAnalysisToVisionPhase(metadata.visionPhase || {}, {
      sceneIndex,
      sceneId,
      analysis,
    })
    if (!applied.saved) return { saved: false, stale: false, sceneIndex }

    metadata.visionPhase = applied.visionPhase
    project.metadata = metadata
    project.changed('metadata', true)
    await project.save({ transaction })

    return { saved: true, stale: applied.stale, sceneIndex: applied.sceneIndex }
  })
}
