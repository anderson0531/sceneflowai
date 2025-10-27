/**
 * Character Name Validation
 * 
 * Validates character names in generated scripts against canonical characters
 */

import { CanonicalCharacter, toCanonicalName, matchCharacter } from './canonical'

export interface ValidationResult {
  valid: boolean
  mismatches: Array<{
    sceneName: string
    sceneIndex: number
    dialogueName: string
    suggestion: string | null
  }>
}

/**
 * Validate character names in generated scenes
 * Returns validation result with mismatches and suggestions
 */
export function validateCharacterNames(
  scenes: any[],
  canonicalCharacters: CanonicalCharacter[]
): ValidationResult {
  const mismatches: ValidationResult['mismatches'] = []
  
  scenes.forEach((scene, sceneIndex) => {
    if (!scene.dialogue || !Array.isArray(scene.dialogue)) return
    
    scene.dialogue.forEach((dialogue: any) => {
      const characterName = dialogue.character
      if (!characterName) return
      
      const match = matchCharacter(characterName, canonicalCharacters)
      
      if (!match) {
        // No match found
        mismatches.push({
          sceneName: scene.sceneHeading || `Scene ${sceneIndex + 1}`,
          sceneIndex,
          dialogueName: characterName,
          suggestion: null
        })
      } else if (match.name !== characterName) {
        // Match found but name differs - suggest canonical
        mismatches.push({
          sceneName: scene.sceneHeading || `Scene ${sceneIndex + 1}`,
          sceneIndex,
          dialogueName: characterName,
          suggestion: match.name
        })
      }
    })
  })
  
  return {
    valid: mismatches.length === 0,
    mismatches
  }
}

/**
 * Auto-correct character names in scenes to match canonical names
 * Returns corrected scenes
 */
export function autoCorrectCharacterNames(
  scenes: any[],
  canonicalCharacters: CanonicalCharacter[]
): any[] {
  return scenes.map(scene => {
    if (!scene.dialogue || !Array.isArray(scene.dialogue)) return scene
    
    return {
      ...scene,
      dialogue: scene.dialogue.map((dialogue: any) => {
        const match = matchCharacter(dialogue.character, canonicalCharacters)
        
        if (match && match.name !== dialogue.character) {
          console.log(`[Character Validation] Auto-correcting: "${dialogue.character}" → "${match.name}"`)
          return {
            ...dialogue,
            character: match.name
          }
        }
        
        return dialogue
      })
    }
  })
}

