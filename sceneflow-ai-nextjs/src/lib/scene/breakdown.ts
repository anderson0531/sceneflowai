import { SceneSegment, SceneSegmentStatus } from '@/components/vision/scene-production/types'

interface SceneData {
  heading?: string
  action?: string
  dialogue?: Array<{ character: string; line: string; parenthetical?: string }>
  visualDescription?: string
}

export function breakdownSceneScript(scene: SceneData, sceneId: string): SceneSegment[] {
  const segments: SceneSegment[] = []
  let currentTime = 0
  let sequenceIndex = 0

  // Helper to create a segment
  const createSegment = (
    duration: number, 
    trigger: string, 
    description: string,
    shotType: string = 'medium-shot',
    angle: string = 'eye-level'
  ): SceneSegment => {
    const segment: SceneSegment = {
      segmentId: `${sceneId}-shot-${sequenceIndex + 1}`,
      sequenceIndex: sequenceIndex,
      startTime: currentTime,
      endTime: currentTime + duration,
      status: 'DRAFT',
      assetType: null,
      references: {
        characterIds: [],
        sceneRefIds: [],
        objectRefIds: []
      },
      takes: [],
      shotType: shotType,
      cameraAngle: angle,
      action: description,
      trigger: trigger,
      transition: 'cut'
    }
    currentTime += duration
    sequenceIndex++
    return segment
  }

  // 1. Initial Establishing Shot (from Action/Description)
  if (scene.action || scene.visualDescription) {
    const desc = scene.action || scene.visualDescription || ''
    // Estimate duration: 1 sec per 3 words, min 3s
    const wordCount = desc.split(/\s+/).length
    const duration = Math.max(3, Math.ceil(wordCount / 3))
    
    segments.push(createSegment(
      duration,
      'Change in Action',
      desc,
      'wide-shot', // Establishing shot
      'eye-level'
    ))
  }

  // 2. Dialogue Shots
  if (scene.dialogue && scene.dialogue.length > 0) {
    scene.dialogue.forEach((d, index) => {
      // Estimate duration: 150 wpm -> 2.5 words per sec
      const wordCount = d.line.split(/\s+/).length
      const duration = Math.max(2, Math.ceil(wordCount / 2.5))
      
      // Determine shot type based on context (heuristic)
      // If it's a new speaker, it's a trigger
      const trigger = index === 0 || scene.dialogue![index - 1].character !== d.character
        ? 'Change in Speaker'
        : 'Dialogue Continuation'

      // Simple heuristic for shot type
      // Alternating shots for dialogue
      const shotType = 'medium-close-up'
      
      segments.push(createSegment(
        duration,
        trigger,
        `${d.character}: ${d.line}`,
        shotType,
        'eye-level'
      ))
    })
  }

  // If no segments created (empty scene), create one placeholder
  if (segments.length === 0) {
    segments.push(createSegment(5, 'Scene Start', 'Scene action...', 'medium-shot'))
  }

  return segments
}
