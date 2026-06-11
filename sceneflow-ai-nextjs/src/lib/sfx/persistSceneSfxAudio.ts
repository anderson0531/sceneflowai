import Project from '@/models/Project'
import { upsertBeatSfxCueOnScene } from '@/lib/script/deriveSfxFromSceneContent'

export interface PersistSceneSfxAudioParams {
  projectId: string
  sceneIndex: number
  audioUrl: string
  sfxIndex?: number
  sfxAttribution?: Record<string, unknown> | null
  beatId?: string
  beatDescription?: string
}

function locateScenes(metadata: Record<string, unknown>): {
  scenes: Record<string, unknown>[]
  scenePath: 'nested' | 'flat'
} | null {
  const visionPhase = (metadata?.visionPhase ?? {}) as Record<string, unknown>
  const script = (visionPhase?.script ?? {}) as Record<string, unknown>
  const nestedScript = script?.script as Record<string, unknown> | undefined
  const nestedScenes = nestedScript?.scenes
  if (Array.isArray(nestedScenes)) {
    return { scenes: nestedScenes as Record<string, unknown>[], scenePath: 'nested' }
  }
  const flatScenes = script?.scenes
  if (Array.isArray(flatScenes)) {
    return { scenes: flatScenes as Record<string, unknown>[], scenePath: 'flat' }
  }
  return null
}

/**
 * Atomically persist one SFX URL into project metadata (mirrors projects PATCH atomicAudioUpdate).
 */
export async function persistSceneSfxAudioAtomic(
  params: PersistSceneSfxAudioParams
): Promise<{ sfxIndex: number }> {
  const project = await Project.findByPk(params.projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  const metadata = { ...(project.metadata || {}) } as Record<string, unknown>
  const located = locateScenes(metadata)
  if (!located || params.sceneIndex >= located.scenes.length) {
    throw new Error('Invalid scene index or scenes not found')
  }

  const scene = located.scenes[params.sceneIndex]
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
  metadata.visionPhase = visionPhase

  project.set('metadata', metadata)
  project.changed('metadata', true)
  await project.save()

  return { sfxIndex }
}
