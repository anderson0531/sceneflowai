import '@/models'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'
import {
  castFingerprint,
  locationFingerprint,
  locationVersionFingerprint,
  propFingerprint,
  wardrobeFingerprint,
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
  /** Location set-version still — patch that nested row, not the base. */
  versionId?: string
  /** Cast wardrobe still — patch that nested look, not identity. */
  wardrobeId?: string
}): Promise<{ saved: boolean; staleSource: boolean }> {
  const { projectId, kind, targetId, expectedFingerprint, patch, versionId, wardrobeId } = input

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

        if (wardrobeId) {
          const wardrobes = Array.isArray(character.wardrobes) ? character.wardrobes : []
          let wardrobeFound = false
          const nextWardrobes = wardrobes.map((wardrobe) => {
            if (wardrobe.id !== wardrobeId) return wardrobe
            wardrobeFound = true
            staleSource = wardrobeFingerprint(wardrobe) !== expectedFingerprint
            return { ...wardrobe, ...patch, needsImageRegen: false }
          })
          if (!wardrobeFound) return character
          saved = true
          return { ...character, wardrobes: nextWardrobes }
        }

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

        if (kind === 'location' && versionId) {
          const location = entry as LocationSource
          const versions = Array.isArray(location.versions) ? location.versions : []
          let versionFound = false
          const nextVersions = versions.map((version) => {
            if (version.id !== versionId) return version
            versionFound = true
            staleSource =
              locationVersionFingerprint(location, version) !== expectedFingerprint
            return { ...version, ...patch, needsImageRegen: false }
          })
          if (!versionFound) return entry
          saved = true
          return { ...location, versions: nextVersions }
        }

        saved = true
        staleSource =
          kind === 'location'
            ? locationFingerprint(entry as LocationSource) !== expectedFingerprint
            : propFingerprint(entry as PropSource) !== expectedFingerprint
        return {
          ...entry,
          ...patch,
          ...(kind === 'location' && typeof patch.imageUrl === 'string' && patch.imageUrl
            ? {
                versions: (
                  Array.isArray((entry as { versions?: unknown }).versions)
                    ? ((entry as { versions: Array<{ imageUrl?: string }> }).versions)
                    : []
                ).map((version) =>
                  version?.imageUrl ? { ...version, needsImageRegen: true } : version
                ),
              }
            : {}),
        }
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
