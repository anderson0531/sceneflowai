import { persistSceneAudioAtomic } from '@/lib/audio/persistSceneAudioAtomic'

export interface PersistSceneSfxAudioParams {
  projectId: string
  sceneIndex: number
  audioUrl: string
  sfxIndex?: number
  sfxAttribution?: Record<string, unknown> | null
  beatId?: string
  beatDescription?: string
}

/**
 * Atomically persist one SFX URL into project metadata (mirrors projects PATCH atomicAudioUpdate).
 */
export async function persistSceneSfxAudioAtomic(
  params: PersistSceneSfxAudioParams
): Promise<{ sfxIndex: number }> {
  const result = await persistSceneAudioAtomic({
    projectId: params.projectId,
    sceneIndex: params.sceneIndex,
    audioType: 'sfx',
    audioUrl: params.audioUrl,
    sfxIndex: params.sfxIndex,
    sfxAttribution: params.sfxAttribution,
    beatId: params.beatId,
    beatDescription: params.beatDescription,
  })

  if (result.sfxIndex === undefined) {
    throw new Error('SFX persist did not return sfxIndex')
  }

  return { sfxIndex: result.sfxIndex }
}
