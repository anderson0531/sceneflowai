/**
 * Cast Ensemble Catalog Sync for Reference Express & Cast Agent
 *
 * Ensures that before any cast identity portrait is generated, the entire cast
 * ensemble is analyzed holistically against the script, setting, locations,
 * props, audience localization signals, and biological/mixed-heritage family ties.
 *
 * Uses a narrow row-locked transaction on `visionPhase.characters` (mirroring
 * `persistLocationCatalogPatch`) so background Reference Express runs never
 * clobber concurrent script, wardrobe, or portrait updates.
 */

import '@/models'
import { Project } from '@/models/Project'
import { sequelize } from '@/config/database'
import { normalizeCharacterName } from '@/lib/character/detection'
import {
  characterNeedsBaselineEnrichment,
  enrichEnsembleCastWithIntelligence,
  isMinimalAppearanceDescription,
  isMinimalCharacterDescription,
  isPoisonedPlaceholderImagePrompt,
  type CastCharacterSyncUpdate,
} from '@/lib/character/characterIntelligence'
import { loadBlueprintARFromMetadata } from '@/lib/types/audienceResonance'
import { resolveStoryLocale } from '@/i18n/server/storyLocale'
import { resolveProjectArtStyle } from '@/lib/vision/artStyle'
import { resolveCharacterId } from '@/lib/vision/updateCharacterReference'

export interface PersistCastCatalogEnrichmentInput {
  projectId: string
  updates: CastCharacterSyncUpdate[]
  forceOverwrite?: boolean
}

export async function persistCastCatalogEnrichment(
  input: PersistCastCatalogEnrichmentInput
): Promise<{ saved: boolean; characters: Array<Record<string, any>> }> {
  const { projectId, updates, forceOverwrite = false } = input
  if (!updates.length || !sequelize?.transaction) {
    return { saved: false, characters: [] }
  }

  return sequelize.transaction(async (transaction) => {
    const project = await Project.findByPk(projectId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!project) return { saved: false, characters: [] }

    const metadata: Record<string, any> = { ...(project.metadata || {}) }
    const visionPhase: Record<string, any> = { ...(metadata.visionPhase || {}) }
    const existingList: Array<Record<string, any>> = Array.isArray(visionPhase.characters)
      ? [...visionPhase.characters]
      : []

    if (existingList.length === 0) {
      return { saved: false, characters: [] }
    }

    const updateById = new Map<string, CastCharacterSyncUpdate>()
    const updateByNormName = new Map<string, CastCharacterSyncUpdate>()
    for (const u of updates) {
      if (u.characterId) updateById.set(u.characterId, u)
      const norm = normalizeCharacterName(u.characterName || '')
      if (norm) updateByNormName.set(norm, u)
    }

    let changed = false
    const nextCharacters = existingList.map((entry, idx) => {
      const resolvedId = resolveCharacterId(entry as any, idx)
      const normName = normalizeCharacterName(String(entry?.name || ''))
      const match =
        updateById.get(resolvedId) ||
        (entry?.id ? updateById.get(String(entry.id)) : undefined) ||
        (normName ? updateByNormName.get(normName) : undefined)

      if (!match) return entry

      const patch = match.patch || {}
      const next: Record<string, any> = { ...entry }

      for (const [key, val] of Object.entries(patch)) {
        if (val === undefined) continue
        if (key === 'imagePrompt') {
          if (isPoisonedPlaceholderImagePrompt(next.imagePrompt)) {
            delete next.imagePrompt
            changed = true
          }
          continue
        }
        if (key === 'appearanceDescription' || key === 'appearance') {
          if (forceOverwrite || isMinimalAppearanceDescription(next[key])) {
            next[key] = val
            changed = true
          }
          continue
        }
        if (key === 'description') {
          if (forceOverwrite || isMinimalCharacterDescription(next.description)) {
            next.description = val
            changed = true
          }
          continue
        }
        if (key === 'familyRelationships') {
          if (Array.isArray(val) && val.length > 0) {
            next.familyRelationships = val
            changed = true
          }
          continue
        }
        // For ethnicity & age: allow family/localization reconciliation when empty or when patch explicitly updates it
        if (key === 'ethnicity' || key === 'age' || key === 'ageRange') {
          if (forceOverwrite || !String(next[key] ?? '').trim() || match.enrichedFields.includes(key)) {
            next[key] = val
            changed = true
          }
          continue
        }
        if (forceOverwrite || !String(next[key] ?? '').trim()) {
          next[key] = val
          changed = true
        }
      }

      if (isPoisonedPlaceholderImagePrompt(next.imagePrompt)) {
        delete next.imagePrompt
        changed = true
      }

      return next
    })

    if (!changed) {
      return { saved: false, characters: existingList }
    }

    visionPhase.characters = nextCharacters
    metadata.visionPhase = visionPhase
    project.metadata = metadata
    project.changed('metadata', true)
    await project.save({ transaction })
    return { saved: true, characters: nextCharacters }
  })
}

export async function ensureProjectCastEnsembleEnriched(
  projectId: string,
  options?: {
    forceOverwrite?: boolean
    storyLocale?: string
  }
): Promise<{
  enriched: boolean
  characters: Array<Record<string, any>>
  updates: CastCharacterSyncUpdate[]
  analysis: string
  usedFallback: boolean
}> {
  if (!projectId) {
    return {
      enriched: false,
      characters: [],
      updates: [],
      analysis: '',
      usedFallback: false,
    }
  }

  const project = await Project.findByPk(projectId)
  if (!project) {
    return {
      enriched: false,
      characters: [],
      updates: [],
      analysis: '',
      usedFallback: false,
    }
  }

  const metadata: Record<string, any> = project.metadata || {}
  const visionPhase: Record<string, any> = metadata.visionPhase || {}
  const characters: Array<Record<string, any>> = Array.isArray(visionPhase.characters)
    ? visionPhase.characters
    : []

  if (characters.length === 0) {
    return {
      enriched: false,
      characters: [],
      updates: [],
      analysis: '',
      usedFallback: false,
    }
  }

  const needsPass =
    options?.forceOverwrite === true ||
    characters.some(
      (c) => characterNeedsBaselineEnrichment(c) || isPoisonedPlaceholderImagePrompt(c?.imagePrompt)
    )

  if (!needsPass) {
    return {
      enriched: false,
      characters,
      updates: [],
      analysis: 'Cast profiles already complete.',
      usedFallback: false,
    }
  }

  const scenes: Array<Record<string, any>> = Array.isArray(visionPhase.scenes) && visionPhase.scenes.length > 0
    ? visionPhase.scenes
    : Array.isArray(visionPhase.script?.script?.scenes)
      ? visionPhase.script.script.scenes
      : []

  const refs: Record<string, any> = visionPhase.references || {}
  const locationRefs: Array<Record<string, any>> = Array.isArray(refs.locationReferences)
    ? refs.locationReferences
    : []
  const objectRefs: Array<Record<string, any>> = Array.isArray(refs.objectReferences)
    ? refs.objectReferences
    : []

  const treatment: Record<string, any> = metadata.filmTreatmentVariant || {}
  const arState = loadBlueprintARFromMetadata(metadata)
  const artStyle = resolveProjectArtStyle(metadata)

  let storyLocale = options?.storyLocale || 'en'
  try {
    const resolved = await resolveStoryLocale({
      explicit: options?.storyLocale,
      projectId,
      userIdOrEmail: (project as any).user_id,
      includeProperNouns: false,
    })
    storyLocale = resolved.storyLocale
  } catch {
    // Default to 'en' if storyLocale lookup is mocked or unavailable
  }

  const result = await enrichEnsembleCastWithIntelligence({
    characters: characters.map((c, idx) => ({
      ...c,
      id: resolveCharacterId(c as any, idx),
    })),
    storyContext: {
      title: treatment.title || project.title,
      logline: visionPhase.script?.logline || treatment.logline || project.description,
      synopsis: treatment.synopsis || treatment.film_treatment,
      genre: project.genre || treatment.genre,
      tone: project.tone || treatment.tone_description || treatment.tone,
      setting: treatment.setting,
      artStyle,
    },
    localization: {
      setting: treatment.setting,
      storyLocale,
      targetAudience: treatment.target_audience || treatment.audience,
      audienceDefinition: arState.audienceDefinition,
      locations: locationRefs.map((l) => ({
        name: l.locationDisplay || l.location,
        description: l.description,
      })),
      props: objectRefs.map((o) => ({
        name: o.name,
        category: o.category,
        description: o.description,
      })),
    },
    scenes,
    forceOverwrite: options?.forceOverwrite,
  })

  if (result.updates.length === 0) {
    return {
      enriched: false,
      characters: result.characters,
      updates: [],
      analysis: result.analysis,
      usedFallback: result.usedFallback,
    }
  }

  const persisted = await persistCastCatalogEnrichment({
    projectId,
    updates: result.updates,
    forceOverwrite: options?.forceOverwrite,
  })

  return {
    enriched: persisted.saved,
    characters: persisted.saved ? persisted.characters : result.characters,
    updates: result.updates,
    analysis: result.analysis,
    usedFallback: result.usedFallback,
  }
}
