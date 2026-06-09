/**
 * Pure scene direction helpers (no server/AI dependencies).
 */

export type SceneType = 'title' | 'establishing' | 'narrative' | 'montage' | 'outro' | 'credits'

export interface FilmContext {
  title?: string
  logline?: string
  genre?: string[]
  tone?: string
  visualStyle?: string
}

export interface SceneDirectionMetadata {
  lightingMood?: string
  colorTemperature?: string
  timeOfDay?: string
  framingHint?: string
  atmosphere?: string
  keyProps?: string[]
  locationDescription?: string
}

export function detectSceneType(
  heading: string,
  action: string,
  sceneNumber: number,
  totalScenes?: number
): SceneType {
  const headingLower = (heading || '').toLowerCase()
  const actionLower = (action || '').toLowerCase()

  if (
    headingLower.includes('title sequence') ||
    headingLower.includes('title card') ||
    headingLower.includes('opening title') ||
    headingLower.includes('main title') ||
    (/\btitle\b/.test(headingLower) && sceneNumber <= 2)
  ) {
    return 'title'
  }

  if (
    headingLower.includes('credits') ||
    headingLower.includes('end title') ||
    headingLower.includes('outro') ||
    (totalScenes && sceneNumber === totalScenes && /\b(credits?|end|final)\b/.test(headingLower))
  ) {
    return 'credits'
  }

  if (
    headingLower.includes('establishing') ||
    (headingLower.startsWith('ext.') && actionLower.length < 100 && !actionLower.includes('dialogue'))
  ) {
    return 'establishing'
  }

  if (
    headingLower.includes('montage') ||
    actionLower.includes('montage') ||
    actionLower.includes('series of shots')
  ) {
    return 'montage'
  }

  return 'narrative'
}

export function extractDirectionMetadata(sceneDirection: any): SceneDirectionMetadata {
  if (!sceneDirection) return {}

  const metadata: SceneDirectionMetadata = {}

  if (sceneDirection.lighting) {
    const lighting = sceneDirection.lighting
    metadata.lightingMood = lighting.overallMood || undefined
    metadata.colorTemperature = lighting.colorTemperature || undefined
    metadata.timeOfDay = lighting.timeOfDay || undefined
  }

  if (sceneDirection.camera) {
    const camera = sceneDirection.camera
    const shots = camera.shots || []
    const shotsLower = shots.map((s: string) => s.toLowerCase()).join(' ')

    if (shotsLower.includes('close-up') || shotsLower.includes('closeup') || shotsLower.includes('close up')) {
      metadata.framingHint = 'close-up'
    } else if (shotsLower.includes('medium close') || shotsLower.includes('mcu')) {
      metadata.framingHint = 'medium close-up'
    } else if (
      shotsLower.includes('wide shot') ||
      shotsLower.includes('wide angle') ||
      shotsLower.includes('establishing')
    ) {
      metadata.framingHint = 'wide shot'
    } else if (shotsLower.includes('two-shot') || shotsLower.includes('two shot')) {
      metadata.framingHint = 'two-shot'
    } else if (shotsLower.includes('over-the-shoulder') || shotsLower.includes('ots')) {
      metadata.framingHint = 'over-the-shoulder'
    } else if (shotsLower.includes('medium shot') || shotsLower.includes('medium')) {
      metadata.framingHint = 'medium shot'
    }
  }

  if (sceneDirection.scene) {
    metadata.atmosphere = sceneDirection.scene.atmosphere || undefined
    metadata.keyProps = sceneDirection.scene.keyProps || undefined
    metadata.locationDescription = sceneDirection.scene.location || undefined
  }

  return metadata
}
