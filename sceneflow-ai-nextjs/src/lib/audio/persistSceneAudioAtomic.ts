import { Transaction } from 'sequelize'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import {
  applySceneAudioPersistToMetadata,
  type PersistSceneAudioAtomicParams,
  type PersistSceneAudioResult,
} from '@/lib/audio/applySceneAudioPersistToMetadata'

export type {
  PersistSceneAudioAtomicParams,
  PersistSceneAudioResult,
  SceneAudioType,
} from '@/lib/audio/applySceneAudioPersistToMetadata'
export {
  applySceneAudioPersistToMetadata,
  shouldBumpScriptUpdatedAtOnAudioPersist,
} from '@/lib/audio/applySceneAudioPersistToMetadata'

/**
 * Atomically persist one scene audio field under a row-level FOR UPDATE lock.
 * Serializes concurrent SFX / dialogue / music / narration writes on the same project.
 */
export async function persistSceneAudioAtomic(
  params: PersistSceneAudioAtomicParams
): Promise<PersistSceneAudioResult> {
  return sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(params.projectId, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    })
    if (!project) {
      throw new Error('Project not found')
    }

    const metadata = structuredClone(project.metadata || {}) as Record<string, unknown>
    const { sfxIndex, oldAudioUrl } = applySceneAudioPersistToMetadata(metadata, params)

    project.set('metadata', metadata)
    project.changed('metadata', true)
    await project.save({ transaction })

    return {
      sfxIndex,
      oldAudioUrl,
    }
  })
}
