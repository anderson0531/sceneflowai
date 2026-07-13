import { Transaction } from 'sequelize'
import Project from '@/models/Project'
import { sequelize } from '@/config/database'
import { upsertBeatSfxCueOnScene } from '@/lib/script/deriveSfxFromSceneContent'

export type SceneAudioType = 'sfx' | 'music' | 'narration' | 'description' | 'dialogue'

export interface PersistSceneAudioAtomicParams {
  projectId: string
  sceneIndex: number
  audioType: SceneAudioType
  audioUrl: string
  language?: string
  sfxIndex?: number
  sfxAttribution?: Record<string, unknown> | null
  beatId?: string
  beatDescription?: string
  musicDuration?: number
  musicFileDuration?: number
  characterName?: string
  dialogueIndex?: number
  duration?: number | null
  voiceId?: string
  provider?: string
  adaptation?: unknown
  lineMeta?: {
    lineId?: string
    lineKind?: 'narration' | 'dialogue'
    characterId?: string
  }
  /** When true, sets visionPhase.scriptUpdatedAt (dialogue/narration saves). */
  updateScriptUpdatedAt?: boolean
}

export interface PersistSceneAudioResult {
  sfxIndex?: number
  oldAudioUrl?: string | null
}

type SceneRecord = Record<string, unknown>

function locateScenes(metadata: Record<string, unknown>): {
  scenes: SceneRecord[]
  scenePath: 'nested' | 'flat'
} | null {
  const visionPhase = (metadata?.visionPhase ?? {}) as Record<string, unknown>
  const script = (visionPhase?.script ?? {}) as Record<string, unknown>
  const nestedScript = script?.script as Record<string, unknown> | undefined
  const nestedScenes = nestedScript?.scenes
  if (Array.isArray(nestedScenes)) {
    return { scenes: nestedScenes as SceneRecord[], scenePath: 'nested' }
  }
  const flatScenes = script?.scenes
  if (Array.isArray(flatScenes)) {
    return { scenes: flatScenes as SceneRecord[], scenePath: 'flat' }
  }
  return null
}

function writeScenesBack(
  metadata: Record<string, unknown>,
  located: { scenes: SceneRecord[]; scenePath: 'nested' | 'flat' }
): void {
  const visionPhase = (metadata.visionPhase ?? {}) as Record<string, unknown>
  const script = (visionPhase.script ?? {}) as Record<string, unknown>

  if (located.scenePath === 'nested') {
    const nestedScript = (script.script ?? {}) as Record<string, unknown>
    nestedScript.scenes = located.scenes
    script.script = nestedScript
  } else {
    script.scenes = located.scenes
  }

  visionPhase.script = script
  visionPhase.scenes = located.scenes
  metadata.visionPhase = visionPhase
}

function extractOldAudioUrl(
  scene: SceneRecord,
  audioType: SceneAudioType,
  language: string,
  dialogueIndex?: number,
  characterName?: string,
  lineMeta?: PersistSceneAudioAtomicParams['lineMeta']
): string | null {
  if (audioType === 'narration') {
    const narrationAudio = scene.narrationAudio as Record<string, { url?: string }> | undefined
    return (
      narrationAudio?.[language]?.url ??
      (language === 'en' ? (scene.narrationAudioUrl as string | undefined) : undefined) ??
      null
    )
  }
  if (audioType === 'description') {
    const descriptionAudio = scene.descriptionAudio as Record<string, { url?: string }> | undefined
    return (
      descriptionAudio?.[language]?.url ??
      (language === 'en' ? (scene.descriptionAudioUrl as string | undefined) : undefined) ??
      null
    )
  }
  if (audioType === 'music') {
    const url = scene.musicAudio
    return typeof url === 'string' && url.trim() ? url : null
  }
  if (audioType === 'dialogue') {
    const dialogueAudio = scene.dialogueAudio
    let dialogueArray: unknown[] = []
    if (dialogueAudio && typeof dialogueAudio === 'object' && !Array.isArray(dialogueAudio)) {
      dialogueArray = Array.isArray((dialogueAudio as Record<string, unknown>)[language])
        ? ((dialogueAudio as Record<string, unknown>)[language] as unknown[])
        : []
    } else if (Array.isArray(dialogueAudio)) {
      dialogueArray = dialogueAudio
    }

    const targetLineId = lineMeta?.lineId
    let existingEntry: Record<string, unknown> | null = null
    if (targetLineId) {
      existingEntry =
        (dialogueArray.find(
          (d) => typeof d === 'object' && d && (d as Record<string, unknown>).lineId === targetLineId
        ) as Record<string, unknown> | undefined) ?? null
    }
    if (!existingEntry && dialogueIndex !== undefined) {
      existingEntry =
        (dialogueArray.find(
          (d) =>
            typeof d === 'object' &&
            d &&
            (d as Record<string, unknown>).dialogueIndex === dialogueIndex
        ) as Record<string, unknown> | undefined) ?? null
    }
    if (!existingEntry && dialogueIndex !== undefined && characterName) {
      existingEntry =
        (dialogueArray.find(
          (d) =>
            typeof d === 'object' &&
            d &&
            (d as Record<string, unknown>).dialogueIndex === dialogueIndex &&
            String((d as Record<string, unknown>).character ?? '').toLowerCase() ===
              characterName.toLowerCase()
        ) as Record<string, unknown> | undefined) ?? null
    }
    const url = existingEntry?.audioUrl ?? existingEntry?.url
    return typeof url === 'string' && url.trim() ? url : null
  }
  return null
}

function applySfxMutation(
  scene: SceneRecord,
  params: PersistSceneAudioAtomicParams
): number {
  let sfxIndex = params.sfxIndex

  if (params.beatId?.trim()) {
    const slot = upsertBeatSfxCueOnScene(scene, {
      beatId: params.beatId.trim(),
      actionDescription: String(params.beatDescription ?? '').trim(),
      kind: 'action',
    })
    sfxIndex = slot.sfxIndex
  }

  if (sfxIndex === undefined) {
    throw new Error('sfxIndex is required for SFX persist')
  }

  if (!Array.isArray(scene.sfxAudio)) {
    scene.sfxAudio = []
  }
  while ((scene.sfxAudio as unknown[]).length <= sfxIndex) {
    ;(scene.sfxAudio as unknown[]).push(null)
  }
  ;(scene.sfxAudio as string[])[sfxIndex] = params.audioUrl

  if (!Array.isArray(scene.sfx)) {
    scene.sfx = []
  }
  while ((scene.sfx as unknown[]).length <= sfxIndex) {
    ;(scene.sfx as unknown[]).push(null)
  }

  const sfxEntry = (scene.sfx as unknown[])[sfxIndex]
  if (sfxEntry) {
    if (typeof sfxEntry === 'string') {
      ;(scene.sfx as unknown[])[sfxIndex] = {
        description: sfxEntry,
        audioUrl: params.audioUrl,
      }
    } else if (typeof sfxEntry === 'object') {
      ;(sfxEntry as Record<string, unknown>).audioUrl = params.audioUrl
    }
  }

  if (params.sfxAttribution !== undefined) {
    if (!Array.isArray(scene.sfxSourceMeta)) {
      scene.sfxSourceMeta = []
    }
    while ((scene.sfxSourceMeta as unknown[]).length <= sfxIndex) {
      ;(scene.sfxSourceMeta as unknown[]).push(null)
    }
    ;(scene.sfxSourceMeta as unknown[])[sfxIndex] = params.sfxAttribution
  }

  return sfxIndex
}

function applyMusicMutation(scene: SceneRecord, params: PersistSceneAudioAtomicParams): void {
  scene.musicAudio = params.audioUrl
  if (typeof params.musicDuration === 'number' && params.musicDuration > 0) {
    scene.musicDuration = params.musicDuration
  }
  if (typeof params.musicFileDuration === 'number' && params.musicFileDuration > 0) {
    scene.musicFileDuration = params.musicFileDuration
  }
}

function applyNarrationMutation(
  scene: SceneRecord,
  params: PersistSceneAudioAtomicParams,
  language: string
): void {
  if (!scene.narrationAudio || typeof scene.narrationAudio !== 'object') {
    scene.narrationAudio = {}
  }
  const narrationAudio = scene.narrationAudio as Record<string, Record<string, unknown>>
  narrationAudio[language] = {
    url: params.audioUrl,
    duration: params.duration || undefined,
    generatedAt: new Date().toISOString(),
    voiceId: params.voiceId || undefined,
    provider: params.provider || undefined,
    adaptation: params.adaptation || undefined,
  }
  if (language === 'en') {
    scene.narrationAudioUrl = params.audioUrl
    scene.narrationAudioGeneratedAt = new Date().toISOString()
  }
}

function applyDescriptionMutation(
  scene: SceneRecord,
  params: PersistSceneAudioAtomicParams,
  language: string
): void {
  if (!scene.descriptionAudio || typeof scene.descriptionAudio !== 'object') {
    scene.descriptionAudio = {}
  }
  const descriptionAudio = scene.descriptionAudio as Record<string, Record<string, unknown>>
  descriptionAudio[language] = {
    url: params.audioUrl,
    duration: params.duration || undefined,
    generatedAt: new Date().toISOString(),
    voiceId: params.voiceId || undefined,
    provider: params.provider || undefined,
    adaptation: params.adaptation || undefined,
  }
  if (language === 'en') {
    scene.descriptionAudioUrl = params.audioUrl
    scene.descriptionAudioGeneratedAt = new Date().toISOString()
  }
}

function applyDialogueMutation(
  scene: SceneRecord,
  params: PersistSceneAudioAtomicParams,
  language: string
): void {
  if (!scene.dialogueAudio || Array.isArray(scene.dialogueAudio)) {
    if (Array.isArray(scene.dialogueAudio) && scene.dialogueAudio.length > 0) {
      scene.dialogueAudio = { en: scene.dialogueAudio }
    } else {
      scene.dialogueAudio = {}
    }
  }

  const dialogueAudio = scene.dialogueAudio as Record<string, unknown[]>
  if (!Array.isArray(dialogueAudio[language])) {
    dialogueAudio[language] = []
  }

  const dialogueArray = [...dialogueAudio[language]]
  const targetLineId = params.lineMeta?.lineId
  const dialogueIndex = params.dialogueIndex
  const characterName = params.characterName

  let existingIndex = -1
  if (targetLineId) {
    existingIndex = dialogueArray.findIndex(
      (d) => typeof d === 'object' && d && (d as Record<string, unknown>).lineId === targetLineId
    )
  }
  if (existingIndex < 0 && dialogueIndex !== undefined) {
    existingIndex = dialogueArray.findIndex(
      (d) =>
        typeof d === 'object' && d && (d as Record<string, unknown>).dialogueIndex === dialogueIndex
    )
  }
  if (existingIndex < 0 && dialogueIndex !== undefined && characterName) {
    existingIndex = dialogueArray.findIndex(
      (d) =>
        typeof d === 'object' &&
        d &&
        String((d as Record<string, unknown>).character ?? '').toLowerCase() ===
          characterName.toLowerCase() &&
        (d as Record<string, unknown>).dialogueIndex === dialogueIndex
    )
  }

  const dialogueEntry: Record<string, unknown> = {
    character: characterName!,
    dialogueIndex: dialogueIndex!,
    ...(targetLineId ? { lineId: targetLineId } : {}),
    ...(params.lineMeta?.lineKind ? { kind: params.lineMeta.lineKind } : {}),
    ...(params.lineMeta?.characterId ? { characterId: params.lineMeta.characterId } : {}),
    audioUrl: params.audioUrl,
    duration: params.duration || undefined,
    voiceId: params.voiceId || undefined,
    provider: params.provider || undefined,
    adaptation: params.adaptation || undefined,
  }

  if (existingIndex >= 0) {
    dialogueArray[existingIndex] = {
      ...(dialogueArray[existingIndex] as Record<string, unknown>),
      ...dialogueEntry,
    }
  } else {
    dialogueArray.push(dialogueEntry)
  }

  const deduplicatedArray = dialogueArray.filter((d, idx, arr) => {
    if (typeof d !== 'object' || !d) return true
    const entry = d as Record<string, unknown>
    if (targetLineId && entry.lineId === targetLineId) {
      const lastIdx = arr.findLastIndex(
        (x) => typeof x === 'object' && x && (x as Record<string, unknown>).lineId === targetLineId
      )
      return idx === lastIdx
    }
    if (entry.dialogueIndex === dialogueIndex && (!entry.lineId || !targetLineId)) {
      const lastIdx = arr.findLastIndex(
        (x) =>
          typeof x === 'object' &&
          x &&
          (x as Record<string, unknown>).dialogueIndex === dialogueIndex &&
          (!(x as Record<string, unknown>).lineId || !targetLineId)
      )
      return idx === lastIdx
    }
    return true
  })

  dialogueAudio[language] = deduplicatedArray
  scene.dialogueAudioGeneratedAt = new Date().toISOString()
}

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
    const located = locateScenes(metadata)
    if (!located || params.sceneIndex >= located.scenes.length) {
      throw new Error('Invalid scene index or scenes not found')
    }

    const scene = located.scenes[params.sceneIndex]
    const language = params.language ?? 'en'

    const oldAudioUrl = extractOldAudioUrl(
      scene,
      params.audioType,
      language,
      params.dialogueIndex,
      params.characterName,
      params.lineMeta
    )

    let sfxIndex: number | undefined

    switch (params.audioType) {
      case 'sfx':
        sfxIndex = applySfxMutation(scene, params)
        break
      case 'music':
        applyMusicMutation(scene, params)
        break
      case 'narration':
        applyNarrationMutation(scene, params, language)
        break
      case 'description':
        applyDescriptionMutation(scene, params, language)
        break
      case 'dialogue':
        applyDialogueMutation(scene, params, language)
        break
      default:
        throw new Error(`Unsupported audioType: ${params.audioType}`)
    }

    writeScenesBack(metadata, located)

    if (params.updateScriptUpdatedAt) {
      const visionPhase = (metadata.visionPhase ?? {}) as Record<string, unknown>
      visionPhase.scriptUpdatedAt = new Date().toISOString()
      metadata.visionPhase = visionPhase
    }

    project.set('metadata', metadata)
    project.changed('metadata', true)
    await project.save({ transaction })

    return {
      sfxIndex,
      oldAudioUrl,
    }
  })
}
