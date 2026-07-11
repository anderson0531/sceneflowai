/**
 * Server-only: co-generate scene direction after a scene edit revision.
 */

import { normalizePreserveElements, type PreserveElementInput } from '@/lib/audio/cleanupAudio'
import { generateSceneDirection } from '@/lib/sceneGeneration/generateDirection'

export async function attachCoGeneratedSceneDirection(params: {
  finalizedScene: Record<string, unknown>
  currentScene: Record<string, unknown>
  context: { characters?: Array<{ name?: string }> }
  sceneIndex: number
  preserveElements: PreserveElementInput[]
  skipDirection?: boolean
}): Promise<Record<string, unknown>> {
  const {
    finalizedScene,
    currentScene,
    context,
    sceneIndex,
    preserveElements,
    skipDirection = false,
  } = params

  const normalizedPreserve = normalizePreserveElements(preserveElements)
  if (normalizedPreserve.includes('sceneDirection') || skipDirection) {
    return finalizedScene
  }

  try {
    const characterNames = (context.characters ?? [])
      .map((c) => c?.name)
      .filter((name): name is string => Boolean(name))
    const sceneCharacters = Array.isArray(finalizedScene.characters)
      ? (finalizedScene.characters as string[])
      : []

    const { sceneDirection } = await generateSceneDirection({
      scene: {
        heading: finalizedScene.heading as string | { text: string } | undefined,
        action: finalizedScene.action as string | undefined,
        visualDescription: finalizedScene.visualDescription as string | undefined,
        narration: finalizedScene.narration as string | undefined,
        dialogue: finalizedScene.dialogue as
          | Array<{ character: string; text?: string; line?: string }>
          | undefined,
        characters: characterNames.length > 0 ? characterNames : sceneCharacters,
      },
      sceneIndex,
    })

    return { ...finalizedScene, sceneDirection }
  } catch (error) {
    console.warn(
      '[Scene Revision] Direction co-generation failed — keeping existing direction',
      error
    )
    if (currentScene.sceneDirection) {
      return { ...finalizedScene, sceneDirection: currentScene.sceneDirection }
    }
    return finalizedScene
  }
}
