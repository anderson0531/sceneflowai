import 'server-only'

import { randomUUID } from 'crypto'
import '@/models'
import Project from '@/models/Project'
import ReferenceAssetLink from '@/models/ReferenceAssetLink'
import { cancelActiveJobsForProject } from '@/lib/jobs/jobService'
import {
  autoSyncCharactersFromScriptScenes,
  normalizeCharacterName,
} from '@/lib/character/detection'
import { enrichEnsembleCastWithIntelligence } from '@/lib/character/characterIntelligence.server'
import { defaultCharacterWardrobeId } from '@/lib/vision/updateCharacterReference'
import {
  applyLocationUpdateFromSyncDiff,
  autoSyncLocationsFromScriptScenes,
} from '@/lib/vision/libraryKindAgents'
import {
  analyzeLocationVersionsFromScript,
  buildLocationVersionAnalysisScenes,
} from '@/lib/vision/syncLocationVersionsFromScript'
import {
  filterScenesForLocation,
  locationDescriptionWithMountedFixtures,
  rejectMountedSetFixtures,
} from '@/lib/vision/mountedSetFixtures'
import {
  isSceneOutline,
  isSceneScriptReadyForReferences,
} from '@/lib/vision/sceneScriptReadiness'
import {
  countObjectBeatReferences,
  normalizeObjectName,
  selectRecurringObjects,
} from '@/lib/vision/objectBeatUsage'
import { selectCanonicalNewObjects } from '@/lib/vision/objectDuplicateClusters'
import { extractPropScalePhrase } from '@/lib/imagen/propScaleClause'
import { runWithConcurrencyLimit } from '@/lib/utils/concurrency'
import { cleanAndRebindContinuityCrossLinks } from '@/lib/vision/resetContinuityCleanCrossLinks'
import { findSceneCharacters } from '@/lib/character/matching'
import type { LocationReference, VisualReference } from '@/types/visionReferences'

export interface ResetContinuityFromScriptOptions {
  projectId: string
  userId: string
  preservePortraitsAndVoices?: boolean
}

export interface ResetContinuityFromScriptResult {
  characters: Array<Record<string, any>>
  locationReferences: LocationReference[]
  objectReferences: VisualReference[]
  sceneReferences: VisualReference[]
  scenes: Array<Record<string, any>>
  production?: Record<string, any> | null
  metadata: Record<string, any>
  counts: {
    characters: number
    wardrobes: number
    locations: number
    locationVersions: number
    props: number
  }
}

function sceneTextForCharacterWardrobeScenes(scene: Record<string, any>): string {
  const heading =
    typeof scene.heading === 'string'
      ? scene.heading
      : typeof scene.heading?.text === 'string'
        ? scene.heading.text
        : ''
  const dialogueSpeakers = Array.isArray(scene.dialogue)
    ? scene.dialogue.map((d: any) => d?.character || '').join(' ')
    : ''
  const explicitChars = Array.isArray(scene.characters) ? scene.characters.join(' ') : ''
  const beatText = Array.isArray(scene.beats)
    ? scene.beats
        .map((b: any) =>
          [
            b?.character,
            ...(Array.isArray(b?.characters) ? b.characters : []),
            ...(Array.isArray(b?.beatDirection?.castInFrame) ? b.beatDirection.castInFrame : []),
            b?.actionDescription,
          ]
            .filter(Boolean)
            .join(' ')
        )
        .join(' ')
    : ''
  return [heading, scene.action, scene.visualDescription, dialogueSpeakers, explicitChars, beatText]
    .filter(Boolean)
    .join(' ')
}

export async function resetContinuityFromScript(
  options: ResetContinuityFromScriptOptions
): Promise<ResetContinuityFromScriptResult> {
  const { projectId, userId, preservePortraitsAndVoices = false } = options

  const project = await Project.findOne({
    where: { id: projectId, user_id: userId },
  })
  if (!project) {
    throw Object.assign(new Error('Project not found'), { statusCode: 404 })
  }

  // Cancel any in-flight Reference Express jobs so background steps cannot write stale items back
  try {
    await cancelActiveJobsForProject(projectId, 'reference_express')
  } catch (err) {
    console.warn('[ResetContinuity] Failed to cancel active jobs:', err)
  }

  const metadata: Record<string, any> =
    project.metadata && typeof project.metadata === 'object' ? { ...project.metadata } : {}
  const visionPhase: Record<string, any> =
    metadata.visionPhase && typeof metadata.visionPhase === 'object'
      ? { ...metadata.visionPhase }
      : {}
  const treatment: Record<string, any> =
    metadata.filmTreatmentVariant && typeof metadata.filmTreatmentVariant === 'object'
      ? metadata.filmTreatmentVariant
      : {}

  const rawScenes: Array<Record<string, any>> = Array.isArray(visionPhase.script?.script?.scenes)
    ? visionPhase.script.script.scenes
    : Array.isArray(visionPhase.scenes)
      ? visionPhase.scenes
      : []

  if (rawScenes.length === 0) {
    throw Object.assign(
      new Error('No script scenes found to rebuild Continuity from.'),
      { statusCode: 400 }
    )
  }

  const now = new Date().toISOString()

  // Snapshot previous assets in case preservePortraitsAndVoices is requested
  const prevCharacters: Array<Record<string, any>> = Array.isArray(visionPhase.characters)
    ? visionPhase.characters
    : []
  const prevRefs: Record<string, any> =
    visionPhase.references && typeof visionPhase.references === 'object'
      ? visionPhase.references
      : {}
  const prevLocations: LocationReference[] = Array.isArray(prevRefs.locationReferences)
    ? prevRefs.locationReferences
    : []
  const prevObjects: VisualReference[] = Array.isArray(prevRefs.objectReferences)
    ? prevRefs.objectReferences
    : []

  const prevCharByNormName = new Map<string, Record<string, any>>()
  const prevCharIdToNormName = new Map<string, string>()
  for (const prev of prevCharacters) {
    const norm = normalizeCharacterName(String(prev?.name || ''))
    if (!norm) continue
    if (!prevCharByNormName.has(norm)) {
      prevCharByNormName.set(norm, prev)
    }
    if (prev?.id) {
      prevCharIdToNormName.set(String(prev.id), norm)
    }
  }

  // 1. Rebuild Cast strictly from script scenes (retaining only project narrator voice slot if present)
  const narratorOnly = prevCharacters.filter((c) => {
    const role = String(c?.role || '').trim().toLowerCase()
    const type = String(c?.type || '').trim().toLowerCase()
    return role === 'narrator' || type === 'narrator'
  })

  const syncedCast = autoSyncCharactersFromScriptScenes(rawScenes, narratorOnly)

  // Enrich cast attributes, age, ethnicity, and family consistency from script & world context
  const enrichedCastResult = await enrichEnsembleCastWithIntelligence({
    characters: syncedCast.characters,
    scenes: rawScenes,
    storyContext: {
      title: project.title,
      logline: visionPhase.script?.logline || project.description,
      synopsis: treatment.synopsis || project.description,
      genre: project.genre,
      tone: project.tone || treatment.tone_description || treatment.tone,
      setting: treatment.setting,
      timeframe: treatment.timeframe,
    },
    localization: {
      setting: treatment.setting,
      timeframe: treatment.timeframe,
      targetAudience: treatment.target_audience,
    },
    forceOverwrite: false,
  })

  let rebuiltCharacters: Array<Record<string, any>> = enrichedCastResult.characters.map(
    (char, idx) => {
      const role = String(char?.role || '').trim().toLowerCase()
      const type = String(char?.type || '').trim().toLowerCase()
      if (role === 'narrator' || type === 'narrator') {
        return { ...char }
      }

      const norm = normalizeCharacterName(String(char?.name || ''))
      const prevMatch = preservePortraitsAndVoices && norm ? prevCharByNormName.get(norm) : undefined
      const charId = String(prevMatch?.id || char.id || `char-reset-${idx}-${randomUUID().slice(0, 8)}`)

      // Compute sceneNumbers where this character appears for default baseline wardrobe
      const matchedSceneNums: number[] = []
      rawScenes.forEach((scene, sIdx) => {
        const matchedInScene = findSceneCharacters(
          sceneTextForCharacterWardrobeScenes(scene),
          [{ id: charId, name: String(char.name || ''), aliases: char.aliases }]
        )
        if (matchedInScene.length > 0) {
          matchedSceneNums.push(sIdx + 1)
        }
      })

      const defaultOutfit =
        String(char.defaultWardrobe || '').trim() || 'Period-accurate everyday attire'
      const baselineWardrobe = {
        id: defaultCharacterWardrobeId(charId),
        name: 'Default Look',
        description: defaultOutfit,
        ...(char.wardrobeAccessories ? { accessories: String(char.wardrobeAccessories) } : {}),
        sceneNumbers: matchedSceneNums,
        isDefault: true,
        createdAt: now,
        needsImageRegen: true,
      }

      return {
        ...char,
        id: charId,
        referenceImage: preservePortraitsAndVoices ? prevMatch?.referenceImage || null : null,
        visionDescription: preservePortraitsAndVoices
          ? prevMatch?.visionDescription
          : undefined,
        imageApproved: preservePortraitsAndVoices ? Boolean(prevMatch?.imageApproved) : false,
        imagePrompt: undefined,
        ...(preservePortraitsAndVoices && prevMatch?.voiceConfig
          ? {
              voiceConfig: prevMatch.voiceConfig,
              ...(prevMatch.voiceDescription
                ? { voiceDescription: prevMatch.voiceDescription }
                : {}),
            }
          : {
              voiceConfig: undefined,
            }),
        ...(preservePortraitsAndVoices && prevMatch
          ? {
              likenessSourceType: prevMatch.likenessSourceType,
              likenessImageUrl: prevMatch.likenessImageUrl,
              likenessTransformNote: prevMatch.likenessTransformNote,
              _prevLikenessCharId: prevMatch.likenessCharacterId,
            }
          : {
              likenessSourceType: undefined,
              likenessCharacterId: undefined,
              likenessImageUrl: undefined,
              likenessTransformNote: undefined,
            }),
        wardrobes: [baselineWardrobe],
      }
    }
  )

  // Remap preserved likenessCharacterId if donor is also present in the rebuilt cast
  if (preservePortraitsAndVoices) {
    const newIdByNormName = new Map<string, string>()
    for (const c of rebuiltCharacters) {
      const norm = normalizeCharacterName(String(c?.name || ''))
      if (norm && c?.id) newIdByNormName.set(norm, String(c.id))
    }
    rebuiltCharacters = rebuiltCharacters.map((c) => {
      const next = { ...c }
      const oldDonorId = next._prevLikenessCharId
      delete next._prevLikenessCharId
      if (oldDonorId) {
        const donorNorm = prevCharIdToNormName.get(String(oldDonorId))
        const remappedId = donorNorm ? newIdByNormName.get(donorNorm) : undefined
        if (remappedId && remappedId !== next.id) {
          next.likenessCharacterId = remappedId
        } else {
          next.likenessCharacterId = undefined
          if (next.likenessSourceType === 'character') {
            next.likenessSourceType = 'none'
          }
        }
      }
      return next
    })
  }

  // 2. Rebuild Locations (+ set versions) strictly from script headings & scene bodies
  const prevLocImageByKey = new Map<string, string>()
  if (preservePortraitsAndVoices) {
    for (const loc of prevLocations) {
      const key = String(loc?.location || '').trim().toUpperCase()
      if (key && loc?.imageUrl?.trim()) {
        prevLocImageByKey.set(key, loc.imageUrl.trim())
      }
    }
  }

  const syncedLocationsResult = autoSyncLocationsFromScriptScenes(rawScenes as any, [])
  const screenplayContext = {
    genre: project.genre,
    tone: project.tone || treatment.tone_description || treatment.tone,
    setting: treatment.setting,
    logline: visionPhase.script?.logline || project.description,
  }

  let rebuiltLocations: LocationReference[] = syncedLocationsResult.locations.map((loc) => {
    const preservedImg = preservePortraitsAndVoices
      ? prevLocImageByKey.get(String(loc.location || '').trim().toUpperCase()) || ''
      : ''
    const enrichedDesc = locationDescriptionWithMountedFixtures(loc, rawScenes as any)
    return {
      ...loc,
      ...(enrichedDesc ? { description: enrichedDesc } : {}),
      imageUrl: preservedImg,
      versions: [],
    }
  })

  // Analyze lasting location state versions from script scenes (concurrency-limited, non-fatal)
  await runWithConcurrencyLimit(rebuiltLocations, 3, async (loc, idx) => {
    try {
      const matched = filterScenesForLocation(
        {
          location: loc.location || loc.locationDisplay,
          sceneNumbers: loc.sceneNumbers,
        },
        rawScenes as any
      )
      const pool = matched.length > 0 ? matched : (rawScenes as any)
      const ready = pool.filter((s: any) => isSceneScriptReadyForReferences(s))
      const scoped = ready.length > 0 ? ready : pool.filter((s: any) => !isSceneOutline(s))
      if (scoped.length === 0) return

      const analysis = await analyzeLocationVersionsFromScript({
        location: {
          id: loc.id,
          location: loc.location || loc.locationDisplay || '',
          description: loc.description,
          versions: [],
        },
        scenes: buildLocationVersionAnalysisScenes(scoped),
        screenplayContext,
      })
      const applied = applyLocationUpdateFromSyncDiff(loc, analysis.diff)
      rebuiltLocations[idx] = {
        ...applied.location,
        imageUrl: loc.imageUrl || '',
        versions: (applied.location.versions || []).map((v) => ({
          ...v,
          imageUrl: '',
        })),
      }
    } catch (err) {
      console.warn(`[ResetContinuity] Location version sync skipped for "${loc.location}":`, err)
    }
  })

  // 3. Rebuild Props strictly from recurring beat usage & directed keyProps (excluding mounted set fixtures)
  const prevObjImageByKey = new Map<string, string>()
  if (preservePortraitsAndVoices) {
    for (const obj of prevObjects) {
      const key = normalizeObjectName(obj?.name || '')
      if (key && obj?.imageUrl?.trim()) {
        prevObjImageByKey.set(key, obj.imageUrl.trim())
      }
    }
  }

  const usages = countObjectBeatReferences(rawScenes as any)
  const recurring = rejectMountedSetFixtures(selectRecurringObjects(usages))
  const candidateObjects = selectCanonicalNewObjects(
    [],
    recurring.map((u) => ({
      name: u.name,
      description: `Continuity prop handled across ${u.beatCount} script beats`,
      category: 'prop' as const,
      importance: (u.beatCount >= 4 ? 'critical' : 'important') as 'critical' | 'important',
      sceneNumbers: u.sceneNumbers,
    }))
  )

  const rebuiltObjects: VisualReference[] = candidateObjects.map((cand, idx) => {
    const normKey = normalizeObjectName(cand.name)
    const preservedImg = preservePortraitsAndVoices ? prevObjImageByKey.get(normKey) || '' : ''
    const extractedScale = extractPropScalePhrase(cand.name)
    return {
      id: `obj-reset-${Date.now()}-${idx}-${randomUUID().slice(0, 6)}`,
      type: 'object',
      name: cand.name,
      description: cand.description || cand.name,
      ...(extractedScale ? { dimensions: extractedScale } : {}),
      imageUrl: preservedImg,
      category: (cand.category as any) || 'prop',
      importance: cand.importance || 'important',
      sceneNumbers: cand.sceneNumbers || [],
      createdAt: now,
    }
  })

  // 4. Clean all stale cross-links & re-bind scenes, beats, and production segments
  const rebound = cleanAndRebindContinuityCrossLinks({
    scenes: rawScenes,
    production: visionPhase.production ?? null,
    characters: rebuiltCharacters,
    locationReferences: rebuiltLocations,
    objectReferences: rebuiltObjects,
    preservePortraitsAndVoices,
    resolvedAt: now,
  })

  // 5. Clear ReferenceAssetLink project links if full wipe (non-fatal if table absent)
  if (!preservePortraitsAndVoices) {
    try {
      await ReferenceAssetLink.destroy({ where: { project_id: projectId } })
    } catch (err) {
      console.warn('[ResetContinuity] ReferenceAssetLink cleanup skipped:', err)
    }
  }

  // 6. Atomically overwrite Continuity slices on Project.metadata (bypassing PUT merge resurrection!)
  const updatedReferences = {
    sceneReferences: [] as VisualReference[],
    objectReferences: rebound.objectReferences,
    locationReferences: rebound.locationReferences,
    objectDuplicateIgnores: [] as string[],
    droppedObjectReferenceIds: [] as string[],
  }

  const updatedScriptWrapper =
    visionPhase.script && typeof visionPhase.script === 'object'
      ? visionPhase.script.script && typeof visionPhase.script.script === 'object'
        ? {
            ...visionPhase.script,
            script: {
              ...visionPhase.script.script,
              scenes: rebound.scenes,
            },
          }
        : {
            ...visionPhase.script,
            scenes: rebound.scenes,
          }
      : { script: { scenes: rebound.scenes } }

  const updatedMetadata: Record<string, any> = {
    ...metadata,
    visionPhase: {
      ...visionPhase,
      characters: rebound.characters,
      references: updatedReferences,
      scenes: rebound.scenes,
      script: updatedScriptWrapper,
      ...(rebound.production ? { production: rebound.production } : {}),
    },
  }

  project.set('metadata', updatedMetadata)
  project.changed('metadata', true)
  await project.save()

  const wardrobeCount = rebound.characters.reduce(
    (sum, c) => sum + (Array.isArray(c?.wardrobes) ? c.wardrobes.length : 0),
    0
  )
  const locationVersionCount = rebound.locationReferences.reduce(
    (sum, l) => sum + (Array.isArray(l?.versions) ? l.versions.length : 0),
    0
  )

  return {
    characters: rebound.characters,
    locationReferences: rebound.locationReferences,
    objectReferences: rebound.objectReferences,
    sceneReferences: [],
    scenes: rebound.scenes,
    production: rebound.production,
    metadata: updatedMetadata,
    counts: {
      characters: rebound.characters.filter((c) => c?.type !== 'description').length,
      wardrobes: wardrobeCount,
      locations: rebound.locationReferences.length,
      locationVersions: locationVersionCount,
      props: rebound.objectReferences.length,
    },
  }
}
