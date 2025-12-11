/**
 * Content Hash Utilities for Workflow Sync Tracking
 * 
 * These utilities help detect when scene assets (direction, images, segments)
 * are out of sync with their source content after script edits.
 * 
 * @see /SCENEFLOW_AI_DESIGN_DOCUMENT.md - "Workflow Sync Tracking" section
 */

/**
 * Simple hash function for content comparison
 * Uses djb2 algorithm - fast and sufficient for change detection
 */
function djb2Hash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Generate a content hash for a scene's script content
 * This hash changes when narration, dialogue, or action text changes
 * 
 * Used to detect if Direction needs regeneration after script edits
 */
export function generateSceneContentHash(scene: any): string {
  if (!scene) return ''
  
  const content = {
    narration: scene.narration || '',
    action: scene.action || scene.visualDescription || '',
    dialogue: (scene.dialogue || []).map((d: any) => ({
      character: d.character || '',
      line: d.line || d.text || ''
    })),
    heading: scene.heading || ''
  }
  
  return djb2Hash(JSON.stringify(content))
}

/**
 * Generate a hash for scene direction content
 * This hash changes when direction, camera shots, or blocking changes
 * 
 * Used to detect if Image needs regeneration after direction changes
 */
export function generateDirectionHash(scene: any): string {
  if (!scene?.sceneDirection) return ''
  
  const direction = scene.sceneDirection
  const content = {
    overview: direction.directionOverview || direction.overview || '',
    shots: (direction.shots || []).map((s: any) => ({
      type: s.shotType || s.type || '',
      description: s.description || '',
      framing: s.framing || ''
    })),
    blocking: direction.blocking || '',
    visualStyle: direction.visualStyle || ''
  }
  
  return djb2Hash(JSON.stringify(content))
}

/**
 * Generate a hash combining direction + visual references
 * This is what the image generation is based on
 * 
 * Used to detect if Image is stale relative to direction changes
 */
export function generateImageSourceHash(scene: any, characterWardrobe?: Record<string, string>): string {
  if (!scene) return ''
  
  const content = {
    directionHash: generateDirectionHash(scene),
    visualDescription: scene.visualDescription || '',
    imagePrompt: scene.imagePrompt || '',
    // Include wardrobe references that affect image generation
    wardrobe: characterWardrobe || {}
  }
  
  return djb2Hash(JSON.stringify(content))
}

/**
 * Check if a scene's direction is stale (needs regeneration)
 * 
 * @returns true if direction exists but was based on different content
 */
export function isDirectionStale(scene: any): boolean {
  if (!scene?.sceneDirection) return false // No direction = not stale, just incomplete
  
  const currentContentHash = generateSceneContentHash(scene)
  const directionBasedOn = scene.sceneDirection.basedOnContentHash
  
  // If no hash stored, assume it's from before tracking was implemented
  // Don't show as stale to avoid overwhelming existing projects
  if (!directionBasedOn) return false
  
  return currentContentHash !== directionBasedOn
}

/**
 * Check if a scene's image is stale (needs regeneration)
 * 
 * @returns true if image exists but was based on different direction/content
 */
export function isImageStale(scene: any): boolean {
  if (!scene?.imageUrl) return false // No image = not stale, just incomplete
  
  // Image is stale if direction changed since image was generated
  const currentDirectionHash = generateDirectionHash(scene)
  const imageBasedOn = scene.imageBasedOnDirectionHash
  
  // If no hash stored, check if direction was updated after image
  if (!imageBasedOn) {
    // Fall back to timestamp comparison if available
    if (scene.sceneDirection?.generatedAt && scene.imageGeneratedAt) {
      const directionTime = new Date(scene.sceneDirection.generatedAt).getTime()
      const imageTime = new Date(scene.imageGeneratedAt).getTime()
      return directionTime > imageTime
    }
    return false
  }
  
  return currentDirectionHash !== imageBasedOn
}

/**
 * Get sync status for all workflow steps of a scene
 * 
 * @returns Object with stale status for each step
 */
export function getSceneSyncStatus(scene: any): {
  script: { complete: boolean }
  direction: { complete: boolean; stale: boolean }
  image: { complete: boolean; stale: boolean }
} {
  const hasScript = !!(scene?.narration || (scene?.dialogue && scene.dialogue.length > 0))
  const hasDirection = !!scene?.sceneDirection
  const hasImage = !!scene?.imageUrl
  
  return {
    script: { 
      complete: hasScript 
    },
    direction: { 
      complete: hasDirection, 
      stale: isDirectionStale(scene) 
    },
    image: { 
      complete: hasImage, 
      stale: isImageStale(scene) 
    }
  }
}
