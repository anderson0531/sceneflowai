import type { SceneAudioData } from '@/components/vision/scene-production/GuidePromptEditor'

/** Map a vision script scene object into GuidePromptEditor scene props */
export function visionSceneToGuideAudioData(scene: Record<string, unknown> | null | undefined): SceneAudioData | null {
  if (!scene) return null

  return {
    filmTitle: scene.filmTitle as string | undefined,
    logline: scene.logline as string | undefined,
    genre: scene.genre as string | string[] | undefined,
    tone: scene.tone as string | undefined,
    visualStyle: scene.visualStyle as string | undefined,
    sceneHeading: (scene.heading || scene.sceneHeading) as string | undefined,
    narration: scene.narration as string | undefined,
    narrationAudio: scene.narrationAudio as SceneAudioData['narrationAudio'],
    narrationAudioUrl: scene.narrationAudioUrl as string | undefined,
    dialogue: scene.dialogue as SceneAudioData['dialogue'],
    dialogueAudio: scene.dialogueAudio as SceneAudioData['dialogueAudio'],
    music: scene.music as SceneAudioData['music'],
    musicAudio: scene.musicAudio as string | undefined,
    sfx: scene.sfx as SceneAudioData['sfx'],
    sceneDirection: scene.sceneDirection as SceneAudioData['sceneDirection'],
    visualDescription: scene.visualDescription as string | undefined,
    action: scene.action as string | undefined,
  }
}
