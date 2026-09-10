import '@/models'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import {
  castFingerprint,
  locationFingerprint,
  propFingerprint,
  type CastSource,
  type LocationSource,
  type PropSource,
} from './planItems'
import type { ReferenceExpressKind } from './types'

/**
 * Writes one generated reference image into project metadata.
 *
 * Deliberately narrow. A background batch finishes after the user may have kept
 * editing, and the interactive save paths (`persistVisionCharacters`,
 * `persistLocationReferences`) PUT the entire metadata blob — including
 * `visionPhase.script`. A late job taking that route would win and destroy
 * newer edits. Touching only the one target entry, under a row lock, is what
 * makes running this in the background safe.
 *
 * Staleness is reported, never enforced: the fingerprint recorded at enqueue is
 * compared against the target's current prompt inputs, so an image generated
 * from a description the user has since rewritten is still saved but flagged.
 */
export async function persistReferenceImage(input: {
  projectId: string
  kind: ReferenceExpressKind
  targetId: string
  /** Prompt-input digest captured when the item was planned. */
  expectedFingerprint: string
  /** Fields to merge onto the target entry, and nothing else. */
  patch: Record<string, unknown>
}): Promise<{ saved: boolean; staleSource: boolean }> {
  const { projectId, kind, targetId, expectedFingerprint, patch } = input

  return sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(projectId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!project) return { saved: false, staleSource: false }

    const metadata: Record<string, any> = { ...(project.metadata || {}) }
    const visionPhase: Record<string, any> = { ...(metadata.visionPhase || {}) }

    let saved = false
    let staleSource = false

    if (kind === 'cast') {
      const characters: CastSource[] = Array.isArray(visionPhase.characters)
        ? visionPhase.characters
        : []
      const nextCharacters = characters.map((character, index) => {
        if (resolveCharacterId(character, index) !== targetId) return character
        saved = true
        staleSource = castFingerprint(character) !== expectedFingerprint
        return { ...character, ...patch }
      })
      if (!saved) return { saved: false, staleSource: false }
      visionPhase.characters = nextCharacters
    } else {
      const references: Record<string, any> = { ...(visionPhase.references || {}) }
      const key = kind === 'location' ? 'locationReferences' : 'objectReferences'
      const list: Array<LocationSource | PropSource> = Array.isArray(references[key])
        ? references[key]
        : []

      const nextList = list.map((entry) => {
        if (entry?.id !== targetId) return entry
        saved = true
        staleSource =
          kind === 'location'
            ? locationFingerprint(entry as LocationSource) !== expectedFingerprint
            : propFingerprint(entry as PropSource) !== expectedFingerprint
        return { ...entry, ...patch }
      })
      if (!saved) return { saved: false, staleSource: false }

      references[key] = nextList
      visionPhase.references = references
    }

    metadata.visionPhase = visionPhase
    project.metadata = metadata
    project.changed('metadata', true)
    await project.save({ transaction })

    return { saved, staleSource }
  })
}
