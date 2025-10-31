// Beat interfaces defined locally for self-contained module

export interface Beat {
  title: string
  intent?: string
  synopsis?: string
  minutes: number
  // Calculated fields
  index: number
  total: number
  startScene: number
  endScene: number
  sceneCount: number
  targetDuration: number
}

/**
 * Extract beats from Film Treatment and calculate scene distribution
 */
export function extractBeatsFromTreatment(treatment: any, targetDuration: number = 1200): Beat[] {
  if (!treatment?.beats || !Array.isArray(treatment.beats) || treatment.beats.length === 0) {
    // Fallback: create default beats if none exist
    const fallbackBeats = [
      { title: 'Act I: Setup', minutes: 0.25 },
      { title: 'Act II: Confrontation', minutes: 0.50 },
      { title: 'Act III: Resolution', minutes: 0.25 }
    ]
    return distributeBeats(fallbackBeats, targetDuration)
  }

  // Parse and validate beats
  const rawBeats = treatment.beats
  
  // Calculate total weight (in minutes or proportion)
  const hasMinutes = rawBeats.some((b: any) => typeof b.minutes === 'number')
  
  if (hasMinutes) {
    // Use explicit minute values from treatment
    return distributeBeats(rawBeats, targetDuration)
  } else {
    // Treat as proportional weights (like Save the Cat structure)
    const totalWeight = rawBeats.reduce((sum: number, b: any) => sum + (b.weight || 1), 0)
    const normalizedBeats = rawBeats.map((b: any) => ({
      ...b,
      minutes: ((b.weight || 1) / totalWeight) * (targetDuration / 60)
    }))
    return distributeBeats(normalizedBeats, targetDuration)
  }
}

function distributeBeats(rawBeats: any[], targetDuration: number): Beat[] {
  // Calculate scene count based on target duration (average 40s per scene)
  const avgSceneDuration = 40
  const totalScenes = Math.ceil(targetDuration / avgSceneDuration)
  
  // Distribute scenes across beats based on duration proportion
  let sceneOffset = 1
  const beats: Beat[] = []
  
  for (let i = 0; i < rawBeats.length; i++) {
    const rawBeat = rawBeats[i]
    const minutes = rawBeat.minutes || 1
    const durationSecs = minutes * 60
    
    // Calculate how many scenes this beat should have
    const sceneCount = Math.max(1, Math.ceil(durationSecs / avgSceneDuration))
    
    const beat: Beat = {
      title: rawBeat.title || `Beat ${i + 1}`,
      intent: rawBeat.intent,
      synopsis: rawBeat.synopsis,
      minutes,
      index: i,
      total: rawBeats.length,
      startScene: sceneOffset,
      endScene: sceneOffset + sceneCount - 1,
      sceneCount,
      targetDuration: durationSecs
    }
    
    beats.push(beat)
    sceneOffset += sceneCount
  }
  
  return beats
}

