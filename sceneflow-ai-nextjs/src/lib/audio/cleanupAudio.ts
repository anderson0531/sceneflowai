/**
 * Audio cleanup utilities for scene edits
 * 
 * When scene content (dialogue, narration, description) changes,
 * the associated audio files become stale and should be cleared.
 */

/**
 * Compare two scenes and clean up stale audio from the revised scene
 * 
 * Clears audio when:
 * - Dialogue text changes
 * - Dialogue is removed
 * - Character changes for a dialogue line
 * - Narration text changes
 * - Description text changes
 */
export function cleanupStaleAudio(originalScene: any, revisedScene: any): any {
  const cleanedScene = { ...revisedScene }
  
  // Get dialogue lines from both scenes for comparison
  const originalDialogueLines = (originalScene?.dialogue || []).map((d: any, idx: number) => ({
    character: d.character,
    line: d.line || d.text || '',
    index: idx
  }))
  
  const revisedDialogueLines = (revisedScene.dialogue || []).map((d: any, idx: number) => ({
    character: d.character,
    line: d.line || d.text || '',
    index: idx
  }))

  // Check if narration text changed - if so, clear narration audio
  const originalNarration = originalScene?.narration || ''
  const revisedNarration = revisedScene.narration || ''
  if (originalNarration !== revisedNarration && originalScene?.narrationAudio) {
    delete cleanedScene.narrationAudio
    delete cleanedScene.narrationAudioUrl
  }
  
  // Check if description text changed - if so, clear description audio
  const originalDescription = originalScene?.description || originalScene?.action || ''
  const revisedDescription = revisedScene.description || revisedScene.action || ''
  if (originalDescription !== revisedDescription && originalScene?.descriptionAudio) {
    delete cleanedScene.descriptionAudio
    delete cleanedScene.descriptionAudioUrl
  }

  // If no dialogue audio exists, we're done
  if (!originalScene?.dialogueAudio) {
    return cleanedScene
  }

  // Handle multi-language audio format (object with language keys)
  if (typeof originalScene.dialogueAudio === 'object' && !Array.isArray(originalScene.dialogueAudio)) {
    cleanedScene.dialogueAudio = {}
    
    // Process each language
    for (const [language, audioArray] of Object.entries(originalScene.dialogueAudio)) {
      if (Array.isArray(audioArray)) {
        // Filter audio: keep only if character+index exists AND text hasn't changed
        const filteredAudio = (audioArray as any[]).filter((audio: any) => {
          const dialogueIdx = audio.dialogueIndex
          const originalLine = originalDialogueLines[dialogueIdx]
          const revisedLine = revisedDialogueLines[dialogueIdx]
          
          // Remove if: dialogue was removed, character changed, or text changed
          const shouldKeep = (
            revisedLine && 
            originalLine &&
            revisedLine.character === audio.character &&
            originalLine.line === revisedLine.line  // Text must match
          )
          
          return shouldKeep
        })
        
        if (filteredAudio.length > 0) {
          cleanedScene.dialogueAudio[language] = filteredAudio
        }
      }
    }
    
    // Clean up empty dialogueAudio object
    if (Object.keys(cleanedScene.dialogueAudio).length === 0) {
      delete cleanedScene.dialogueAudio
    }
  }
  // Handle legacy array format
  else if (Array.isArray(originalScene.dialogueAudio)) {
    const filteredAudio = originalScene.dialogueAudio.filter((audio: any) => {
      const dialogueIdx = audio.dialogueIndex
      const originalLine = originalDialogueLines[dialogueIdx]
      const revisedLine = revisedDialogueLines[dialogueIdx]
      
      const shouldKeep = (
        revisedLine && 
        originalLine &&
        revisedLine.character === audio.character &&
        originalLine.line === revisedLine.line
      )
      
      return shouldKeep
    })
    
    if (filteredAudio.length > 0) {
      cleanedScene.dialogueAudio = filteredAudio
    } else {
      delete cleanedScene.dialogueAudio
    }
  }

  return cleanedScene
}

/**
 * Clear ALL audio from a scene
 * Use when you want to force audio regeneration
 */
export function clearAllSceneAudio(scene: any): any {
  const cleanedScene = { ...scene }
  
  // Clear all audio fields
  delete cleanedScene.dialogueAudio
  delete cleanedScene.narrationAudio
  delete cleanedScene.narrationAudioUrl
  delete cleanedScene.descriptionAudio
  delete cleanedScene.descriptionAudioUrl
  delete cleanedScene.musicAudio
  delete cleanedScene.sfxAudio
  delete cleanedScene.dialogueAudioGeneratedAt
  
  return cleanedScene
}

/**
 * Clean up stale audio from all scenes in a script
 */
export function cleanupScriptAudio(originalScenes: any[], revisedScenes: any[]): any[] {
  return revisedScenes.map((revisedScene, idx) => {
    const originalScene = originalScenes[idx]
    if (originalScene) {
      return cleanupStaleAudio(originalScene, revisedScene)
    }
    return revisedScene
  })
}
