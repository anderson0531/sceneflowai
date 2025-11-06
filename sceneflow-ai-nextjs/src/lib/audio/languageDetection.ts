/**
 * Language detection utilities for multi-language audio support
 */

/**
 * Detect which languages have audio files across all scenes
 */
export function getAvailableLanguages(scenes: any[]): string[] {
  const languages = new Set<string>()
  
  scenes.forEach(scene => {
    // Check narration audio - new multi-language structure
    if (scene.narrationAudio && typeof scene.narrationAudio === 'object') {
      Object.keys(scene.narrationAudio).forEach(lang => {
        if (scene.narrationAudio[lang]?.url) {
          languages.add(lang)
        }
      })
    }
    // Legacy support - check old narrationAudioUrl
    if (scene.narrationAudioUrl && !scene.narrationAudio) {
      languages.add('en')
    }
    
    // Check dialogue audio - new multi-language structure
    if (scene.dialogueAudio && typeof scene.dialogueAudio === 'object' && !Array.isArray(scene.dialogueAudio)) {
      Object.keys(scene.dialogueAudio).forEach(lang => {
        const dialogueArray = scene.dialogueAudio[lang]
        if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
          // Check if any dialogue has audioUrl
          const hasAudio = dialogueArray.some((d: any) => d.audioUrl)
          if (hasAudio) {
            languages.add(lang)
          }
        }
      })
    }
    // Legacy support - check old dialogueAudio array
    if (Array.isArray(scene.dialogueAudio) && scene.dialogueAudio.length > 0) {
      const hasAudio = scene.dialogueAudio.some((d: any) => d.audioUrl)
      if (hasAudio) {
        languages.add('en')
      }
    }
  })
  
  return Array.from(languages).sort()
}

/**
 * Check if a specific language has audio for a scene
 */
export function hasLanguageAudio(scene: any, language: string): boolean {
  // Check narration
  const hasNarration = 
    (scene.narrationAudio?.[language]?.url) ||
    (language === 'en' && scene.narrationAudioUrl)
  
  // Check dialogue
  const dialogueArray = scene.dialogueAudio?.[language] || (language === 'en' ? scene.dialogueAudio : null)
  const hasDialogue = Array.isArray(dialogueArray) && dialogueArray.some((d: any) => d.audioUrl)
  
  return hasNarration || hasDialogue
}

/**
 * Get audio URL for a specific language and audio type
 */
export function getAudioUrl(
  scene: any,
  language: string,
  audioType: 'narration' | 'dialogue',
  dialogueIndex?: number
): string | null {
  if (audioType === 'narration') {
    return scene.narrationAudio?.[language]?.url || (language === 'en' ? scene.narrationAudioUrl : null) || null
  } else {
    const dialogueArray = scene.dialogueAudio?.[language] || (language === 'en' ? scene.dialogueAudio : null)
    if (Array.isArray(dialogueArray) && dialogueIndex !== undefined) {
      return dialogueArray[dialogueIndex]?.audioUrl || null
    }
    return null
  }
}

/**
 * Get audio duration for a specific language and audio type
 */
export function getAudioDuration(
  scene: any,
  language: string,
  audioType: 'narration' | 'dialogue',
  dialogueIndex?: number
): number | null {
  if (audioType === 'narration') {
    return scene.narrationAudio?.[language]?.duration || null
  } else {
    const dialogueArray = scene.dialogueAudio?.[language] || (language === 'en' ? scene.dialogueAudio : null)
    if (Array.isArray(dialogueArray) && dialogueIndex !== undefined) {
      return dialogueArray[dialogueIndex]?.duration || null
    }
    return null
  }
}

