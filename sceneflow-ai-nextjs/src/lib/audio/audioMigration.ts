/**
 * Migration utilities for converting legacy audio structure to multi-language structure
 */

/**
 * Migrate a single scene's audio from legacy format to multi-language format
 */
export function migrateSceneAudio(scene: any): any {
  const migrated = { ...scene }
  let needsMigration = false
  
  // Migrate narration audio
  if (scene.narrationAudioUrl && !scene.narrationAudio) {
    migrated.narrationAudio = {
      en: {
        url: scene.narrationAudioUrl,
        generatedAt: scene.narrationAudioGeneratedAt || new Date().toISOString()
      }
    }
    needsMigration = true
    console.log('[Audio Migration] Migrated narration audio for scene', scene.sceneNumber || 'unknown')
  }
  
  // Migrate dialogue audio
  if (Array.isArray(scene.dialogueAudio) && (!scene.dialogueAudio || typeof scene.dialogueAudio !== 'object' || Array.isArray(scene.dialogueAudio))) {
    // Check if it's the old array format
    const isOldFormat = Array.isArray(scene.dialogueAudio) && scene.dialogueAudio.length > 0 && 
                       (typeof scene.dialogueAudio[0] === 'object' && 'audioUrl' in scene.dialogueAudio[0])
    
    if (isOldFormat) {
      migrated.dialogueAudio = {
        en: scene.dialogueAudio
      }
      needsMigration = true
      console.log('[Audio Migration] Migrated dialogue audio for scene', scene.sceneNumber || 'unknown')
    }
  }
  
  return { scene: migrated, needsMigration }
}

/**
 * Migrate all scenes in a script
 */
export function migrateScriptAudio(script: any): { script: any; needsMigration: boolean } {
  if (!script) return { script, needsMigration: false }
  
  const scenes = script.script?.scenes || script.scenes || []
  if (scenes.length === 0) return { script, needsMigration: false }
  
  let overallNeedsMigration = false
  const migratedScenes = scenes.map((scene: any) => {
    const { scene: migratedScene, needsMigration } = migrateSceneAudio(scene)
    if (needsMigration) {
      overallNeedsMigration = true
    }
    return migratedScene
  })
  
  if (!overallNeedsMigration) {
    return { script, needsMigration: false }
  }
  
  // Update script structure
  const migratedScript = script.script?.scenes
    ? { ...script, script: { ...script.script, scenes: migratedScenes } }
    : { ...script, scenes: migratedScenes }
  
  return { script: migratedScript, needsMigration: true }
}

