/**
 * Audio cleanup utilities for scene edits
 * 
 * When scene content (dialogue, narration, description) changes,
 * the associated audio files become stale and should be cleared.
 */

/**
 * Result type for cleanupStaleAudio with URLs for deletion
 */
export interface CleanupResult {
  cleanedScene: any
  deletedUrls: string[]
}

/**
 * Compare two scenes and clean up stale audio from the revised scene
 * 
 * Clears audio when:
 * - Dialogue text changes
 * - Dialogue is removed
 * - Character changes for a dialogue line
 * - Narration text changes
 * - Description text changes
 * 
 * @returns Object with cleanedScene and deletedUrls (URLs of audio blobs to delete)
 */
export function cleanupStaleAudio(originalScene: any, revisedScene: any): CleanupResult {
  const cleanedScene = { ...revisedScene }
  const deletedUrls: string[] = []
  
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
    // Collect URLs from all languages before deleting
    if (typeof originalScene.narrationAudio === 'object') {
      for (const langAudio of Object.values(originalScene.narrationAudio)) {
        if ((langAudio as any)?.url) {
          deletedUrls.push((langAudio as any).url)
        }
      }
    }
    if (originalScene.narrationAudioUrl) {
      // Only add if not already in deletedUrls (avoid duplicates with .en.url)
      if (!deletedUrls.includes(originalScene.narrationAudioUrl)) {
        deletedUrls.push(originalScene.narrationAudioUrl)
      }
    }
    delete cleanedScene.narrationAudio
    delete cleanedScene.narrationAudioUrl
  }
  
  // Check if description text changed - if so, clear description audio
  const originalDescription = originalScene?.description || originalScene?.action || ''
  const revisedDescription = revisedScene.description || revisedScene.action || ''
  if (originalDescription !== revisedDescription && originalScene?.descriptionAudio) {
    // Collect URLs from all languages before deleting
    if (typeof originalScene.descriptionAudio === 'object') {
      for (const langAudio of Object.values(originalScene.descriptionAudio)) {
        if ((langAudio as any)?.url) {
          deletedUrls.push((langAudio as any).url)
        }
      }
    }
    if (originalScene.descriptionAudioUrl) {
      if (!deletedUrls.includes(originalScene.descriptionAudioUrl)) {
        deletedUrls.push(originalScene.descriptionAudioUrl)
      }
    }
    delete cleanedScene.descriptionAudio
    delete cleanedScene.descriptionAudioUrl
  }

  // If no dialogue audio exists, we're done
  if (!originalScene?.dialogueAudio) {
    return { cleanedScene, deletedUrls }
  }

  // Handle multi-language audio format (object with language keys)
  if (typeof originalScene.dialogueAudio === 'object' && !Array.isArray(originalScene.dialogueAudio)) {
    cleanedScene.dialogueAudio = {}
    
    // Process each language
    for (const [language, audioArray] of Object.entries(originalScene.dialogueAudio)) {
      if (Array.isArray(audioArray)) {
        const keptAudio: any[] = []
        
        // Filter audio: keep only if character+index exists AND text hasn't changed
        for (const audio of audioArray as any[]) {
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
          
          if (shouldKeep) {
            keptAudio.push(audio)
          } else {
            // Collect URL for deletion
            if (audio.audioUrl) {
              deletedUrls.push(audio.audioUrl)
            }
          }
        }
        
        if (keptAudio.length > 0) {
          cleanedScene.dialogueAudio[language] = keptAudio
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
    const keptAudio: any[] = []
    
    for (const audio of originalScene.dialogueAudio) {
      const dialogueIdx = audio.dialogueIndex
      const originalLine = originalDialogueLines[dialogueIdx]
      const revisedLine = revisedDialogueLines[dialogueIdx]
      
      const shouldKeep = (
        revisedLine && 
        originalLine &&
        revisedLine.character === audio.character &&
        originalLine.line === revisedLine.line
      )
      
      if (shouldKeep) {
        keptAudio.push(audio)
      } else {
        if (audio.audioUrl) {
          deletedUrls.push(audio.audioUrl)
        }
      }
    }
    
    if (keptAudio.length > 0) {
      cleanedScene.dialogueAudio = keptAudio
    } else {
      delete cleanedScene.dialogueAudio
    }
  }

  return { cleanedScene, deletedUrls }
}

/**
 * Clear ALL audio from a scene and return URLs for deletion
 * Use when you want to force audio regeneration
 */
export function clearAllSceneAudio(scene: any): CleanupResult {
  const cleanedScene = { ...scene }
  const deletedUrls: string[] = []
  
  // Collect URLs before deleting
  // Narration audio
  if (scene.narrationAudio && typeof scene.narrationAudio === 'object') {
    for (const langAudio of Object.values(scene.narrationAudio)) {
      if ((langAudio as any)?.url) deletedUrls.push((langAudio as any).url)
    }
  }
  if (scene.narrationAudioUrl && !deletedUrls.includes(scene.narrationAudioUrl)) {
    deletedUrls.push(scene.narrationAudioUrl)
  }
  
  // Description audio
  if (scene.descriptionAudio && typeof scene.descriptionAudio === 'object') {
    for (const langAudio of Object.values(scene.descriptionAudio)) {
      if ((langAudio as any)?.url) deletedUrls.push((langAudio as any).url)
    }
  }
  if (scene.descriptionAudioUrl && !deletedUrls.includes(scene.descriptionAudioUrl)) {
    deletedUrls.push(scene.descriptionAudioUrl)
  }
  
  // Dialogue audio - from dialogueAudio object
  if (scene.dialogueAudio) {
    if (typeof scene.dialogueAudio === 'object' && !Array.isArray(scene.dialogueAudio)) {
      for (const audioArray of Object.values(scene.dialogueAudio)) {
        if (Array.isArray(audioArray)) {
          for (const audio of audioArray) {
            if ((audio as any).audioUrl) deletedUrls.push((audio as any).audioUrl)
            if ((audio as any).url) deletedUrls.push((audio as any).url)
          }
        }
      }
    } else if (Array.isArray(scene.dialogueAudio)) {
      for (const audio of scene.dialogueAudio) {
        if (audio.audioUrl) deletedUrls.push(audio.audioUrl)
        if (audio.url) deletedUrls.push(audio.url)
      }
    }
  }
  
  // Dialogue audio - from individual dialogue items (scene.dialogue[].audioUrl)
  // Also clear the audioUrl from each dialogue item
  if (scene.dialogue && Array.isArray(scene.dialogue)) {
    cleanedScene.dialogue = scene.dialogue.map((d: any) => {
      if (d.audioUrl) deletedUrls.push(d.audioUrl)
      if (d.url) deletedUrls.push(d.url)
      // Return dialogue item without audio properties
      const { audioUrl, url, audioDuration, ...dialogueWithoutAudio } = d
      return dialogueWithoutAudio
    })
  }
  
  // Music audio
  if (scene.musicAudio) {
    deletedUrls.push(scene.musicAudio)
  }
  if (scene.music?.url) {
    deletedUrls.push(scene.music.url)
  }
  if (scene.musicUrl) {
    deletedUrls.push(scene.musicUrl)
  }
  
  // SFX audio
  if (Array.isArray(scene.sfxAudio)) {
    for (const sfxUrl of scene.sfxAudio) {
      if (sfxUrl) deletedUrls.push(sfxUrl)
    }
  }
  
  // Clear all audio fields
  delete cleanedScene.dialogueAudio
  delete cleanedScene.narrationAudio
  delete cleanedScene.narrationAudioUrl
  delete cleanedScene.narrationDuration
  delete cleanedScene.descriptionAudio
  delete cleanedScene.descriptionAudioUrl
  delete cleanedScene.descriptionDuration
  delete cleanedScene.musicAudio
  delete cleanedScene.musicUrl
  delete cleanedScene.musicDuration
  if (cleanedScene.music) {
    delete cleanedScene.music.url
  }
  delete cleanedScene.sfxAudio
  delete cleanedScene.dialogueAudioGeneratedAt
  
  // Dedupe URLs
  const uniqueUrls = [...new Set(deletedUrls.filter(url => url && typeof url === 'string'))]
  
  return { cleanedScene, deletedUrls: uniqueUrls }
}

/**
 * Result type for cleanupScriptAudio
 */
export interface ScriptCleanupResult {
  cleanedScenes: any[]
  deletedUrls: string[]
}

/**
 * Clean up stale audio from all scenes in a script
 */
export function cleanupScriptAudio(originalScenes: any[], revisedScenes: any[]): ScriptCleanupResult {
  const allDeletedUrls: string[] = []
  
  const cleanedScenes = revisedScenes.map((revisedScene, idx) => {
    const originalScene = originalScenes[idx]
    if (originalScene) {
      const { cleanedScene, deletedUrls } = cleanupStaleAudio(originalScene, revisedScene)
      allDeletedUrls.push(...deletedUrls)
      return cleanedScene
    }
    return revisedScene
  })
  
  return { cleanedScenes, deletedUrls: allDeletedUrls }
}
