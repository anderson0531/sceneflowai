/** Client-side description of a mixer render that the studio can track. */
export type SceneRenderQueuedInfo = {
  generationJobId: string
  sceneId: string
  sceneNumber: number
  language: string
  languageLabel: string
  streamType: 'video' | 'animatic'
  durationSeconds: number
  mode: 'cloud' | 'headless'
}
