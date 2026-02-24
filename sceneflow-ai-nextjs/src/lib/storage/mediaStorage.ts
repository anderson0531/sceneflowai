/**
 * Media Storage Utilities
 * 
 * Handles migration of base64 images to Vercel Blob storage
 * and provides utilities for lazy loading media files.
 */

import { put, del } from '@vercel/blob'

export interface MediaItem {
  id: string
  type: 'character' | 'wardrobe' | 'scene' | 'backdrop' | 'prop' | 'thumbnail'
  imageUrl?: string
  name?: string
}

export interface MigrationResult {
  success: boolean
  originalSize: number
  newUrl?: string
  error?: string
}

/**
 * Check if a string is a base64 data URI
 */
export function isBase64DataUri(str: string | undefined | null): boolean {
  return typeof str === 'string' && (
    str.startsWith('data:image') || 
    str.startsWith('data:video') ||
    // Also check for raw base64 without data URI prefix
    (str.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(str.substring(0, 100)))
  )
}

/**
 * Get the size of a base64 string in bytes
 */
export function getBase64Size(base64: string): number {
  // Remove data URI prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
  // Base64 encodes 3 bytes as 4 characters
  return Math.round((base64Data.length * 3) / 4)
}

/**
 * Upload a base64 image to Vercel Blob storage
 */
export async function uploadBase64ToBlob(
  base64Data: string,
  filename: string,
  folder: string = 'media'
): Promise<{ url: string; size: number }> {
  // Extract the actual base64 data and mime type
  let mimeType = 'image/png'
  let actualBase64 = base64Data
  
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      mimeType = match[1]
      actualBase64 = match[2]
    }
  }
  
  // Convert to buffer
  const buffer = Buffer.from(actualBase64, 'base64')
  
  // Generate a unique filename with proper extension
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('video') ? 'mp4' : 'jpg'
  const fullPath = `${folder}/${filename}.${ext}`
  
  // Upload to Vercel Blob
  const blob = await put(fullPath, buffer, {
    access: 'public',
    contentType: mimeType,
  })
  
  console.log(`[MediaStorage] Uploaded to blob: ${blob.url} (${buffer.length} bytes)`)
  
  return {
    url: blob.url,
    size: buffer.length
  }
}

/**
 * Migrate a single base64 image to blob storage
 */
export async function migrateBase64Image(
  base64Data: string,
  itemId: string,
  type: MediaItem['type'],
  projectId: string
): Promise<MigrationResult> {
  if (!isBase64DataUri(base64Data)) {
    return { success: false, originalSize: 0, error: 'Not a base64 data URI' }
  }
  
  const originalSize = getBase64Size(base64Data)
  
  try {
    const filename = `${itemId}-${Date.now()}`
    const folder = `projects/${projectId}/${type}s`
    
    const { url } = await uploadBase64ToBlob(base64Data, filename, folder)
    
    return {
      success: true,
      originalSize,
      newUrl: url
    }
  } catch (error: any) {
    console.error(`[MediaStorage] Migration failed for ${type} ${itemId}:`, error)
    return {
      success: false,
      originalSize,
      error: error.message
    }
  }
}

/**
 * Migrate all base64 images in a project's metadata to blob storage
 * Returns updated metadata with URLs instead of base64 data
 */
export async function migrateProjectMedia(
  projectId: string,
  metadata: any
): Promise<{ metadata: any; stats: MigrationStats }> {
  const stats: MigrationStats = {
    totalFound: 0,
    migrated: 0,
    alreadyUrls: 0,
    failed: 0,
    bytesFreed: 0
  }
  
  // Deep clone metadata to avoid mutating original
  const newMetadata = JSON.parse(JSON.stringify(metadata))
  const visionPhase = newMetadata.visionPhase || {}
  
  // 1. Migrate project thumbnail
  if (isBase64DataUri(newMetadata.thumbnail)) {
    stats.totalFound++
    const result = await migrateBase64Image(
      newMetadata.thumbnail,
      'thumbnail',
      'thumbnail',
      projectId
    )
    if (result.success && result.newUrl) {
      newMetadata.thumbnail = result.newUrl
      stats.migrated++
      stats.bytesFreed += result.originalSize
    } else {
      stats.failed++
    }
  } else if (newMetadata.thumbnail) {
    stats.alreadyUrls++
  }
  
  // 2. Migrate character reference images
  const characters = visionPhase.characters || []
  for (const character of characters) {
    // Character reference image
    if (isBase64DataUri(character.referenceImage)) {
      stats.totalFound++
      const result = await migrateBase64Image(
        character.referenceImage,
        character.id || character.name,
        'character',
        projectId
      )
      if (result.success && result.newUrl) {
        character.referenceImage = result.newUrl
        stats.migrated++
        stats.bytesFreed += result.originalSize
      } else {
        stats.failed++
      }
    } else if (character.referenceImage) {
      stats.alreadyUrls++
    }
    
    // Wardrobe images
    const wardrobes = character.wardrobes || []
    for (const wardrobe of wardrobes) {
      // Full body URL
      if (isBase64DataUri(wardrobe.fullBodyUrl)) {
        stats.totalFound++
        const result = await migrateBase64Image(
          wardrobe.fullBodyUrl,
          `${character.id}-${wardrobe.id}-fullbody`,
          'wardrobe',
          projectId
        )
        if (result.success && result.newUrl) {
          wardrobe.fullBodyUrl = result.newUrl
          stats.migrated++
          stats.bytesFreed += result.originalSize
        } else {
          stats.failed++
        }
      } else if (wardrobe.fullBodyUrl) {
        stats.alreadyUrls++
      }
      
      // Headshot URL
      if (isBase64DataUri(wardrobe.headshotUrl)) {
        stats.totalFound++
        const result = await migrateBase64Image(
          wardrobe.headshotUrl,
          `${character.id}-${wardrobe.id}-headshot`,
          'wardrobe',
          projectId
        )
        if (result.success && result.newUrl) {
          wardrobe.headshotUrl = result.newUrl
          stats.migrated++
          stats.bytesFreed += result.originalSize
        } else {
          stats.failed++
        }
      } else if (wardrobe.headshotUrl) {
        stats.alreadyUrls++
      }
      
      // Legacy preview image URL
      if (isBase64DataUri(wardrobe.previewImageUrl)) {
        stats.totalFound++
        const result = await migrateBase64Image(
          wardrobe.previewImageUrl,
          `${character.id}-${wardrobe.id}-preview`,
          'wardrobe',
          projectId
        )
        if (result.success && result.newUrl) {
          wardrobe.previewImageUrl = result.newUrl
          stats.migrated++
          stats.bytesFreed += result.originalSize
        } else {
          stats.failed++
        }
      } else if (wardrobe.previewImageUrl) {
        stats.alreadyUrls++
      }
    }
  }
  
  // 3. Migrate scene images
  const scenes = visionPhase.script?.script?.scenes || []
  for (const scene of scenes) {
    // Scene storyboard/thumbnail
    if (isBase64DataUri(scene.imageUrl)) {
      stats.totalFound++
      const result = await migrateBase64Image(
        scene.imageUrl,
        scene.id || `scene-${scenes.indexOf(scene)}`,
        'scene',
        projectId
      )
      if (result.success && result.newUrl) {
        scene.imageUrl = result.newUrl
        stats.migrated++
        stats.bytesFreed += result.originalSize
      } else {
        stats.failed++
      }
    } else if (scene.imageUrl) {
      stats.alreadyUrls++
    }
    
    // Scene reference image
    if (isBase64DataUri(scene.sceneReferenceImageUrl)) {
      stats.totalFound++
      const result = await migrateBase64Image(
        scene.sceneReferenceImageUrl,
        `${scene.id || `scene-${scenes.indexOf(scene)}`}-ref`,
        'scene',
        projectId
      )
      if (result.success && result.newUrl) {
        scene.sceneReferenceImageUrl = result.newUrl
        stats.migrated++
        stats.bytesFreed += result.originalSize
      } else {
        stats.failed++
      }
    } else if (scene.sceneReferenceImageUrl) {
      stats.alreadyUrls++
    }
  }
  
  // 4. Migrate backdrop references
  const backdrops = visionPhase.references?.sceneReferences || []
  for (const backdrop of backdrops) {
    if (isBase64DataUri(backdrop.imageUrl)) {
      stats.totalFound++
      const result = await migrateBase64Image(
        backdrop.imageUrl,
        backdrop.id,
        'backdrop',
        projectId
      )
      if (result.success && result.newUrl) {
        backdrop.imageUrl = result.newUrl
        stats.migrated++
        stats.bytesFreed += result.originalSize
      } else {
        stats.failed++
      }
    } else if (backdrop.imageUrl) {
      stats.alreadyUrls++
    }
  }
  
  // 5. Migrate prop/object references
  const props = visionPhase.references?.objectReferences || []
  for (const prop of props) {
    if (isBase64DataUri(prop.imageUrl)) {
      stats.totalFound++
      const result = await migrateBase64Image(
        prop.imageUrl,
        prop.id,
        'prop',
        projectId
      )
      if (result.success && result.newUrl) {
        prop.imageUrl = result.newUrl
        stats.migrated++
        stats.bytesFreed += result.originalSize
      } else {
        stats.failed++
      }
    } else if (prop.imageUrl) {
      stats.alreadyUrls++
    }
  }
  
  // 6. Migrate location references
  const locations = visionPhase.references?.locationReferences || []
  for (const location of locations) {
    if (isBase64DataUri(location.imageUrl)) {
      stats.totalFound++
      const result = await migrateBase64Image(
        location.imageUrl,
        location.id || `loc-${locations.indexOf(location)}`,
        'backdrop',
        projectId
      )
      if (result.success && result.newUrl) {
        location.imageUrl = result.newUrl
        stats.migrated++
        stats.bytesFreed += result.originalSize
      } else {
        stats.failed++
      }
    } else if (location.imageUrl) {
      stats.alreadyUrls++
    }
  }
  
  console.log(`[MediaStorage] Migration complete for project ${projectId}:`, stats)
  
  return { metadata: newMetadata, stats }
}

export interface MigrationStats {
  totalFound: number
  migrated: number
  alreadyUrls: number
  failed: number
  bytesFreed: number
}

/**
 * Calculate the total size of base64 images in metadata
 */
export function calculateBase64Size(metadata: any): number {
  let totalSize = 0
  
  const checkAndAdd = (value: any) => {
    if (isBase64DataUri(value)) {
      totalSize += getBase64Size(value)
    }
  }
  
  // Check thumbnail
  checkAndAdd(metadata?.thumbnail)
  
  const visionPhase = metadata?.visionPhase || {}
  
  // Check characters
  const characters = visionPhase.characters || []
  for (const char of characters) {
    checkAndAdd(char.referenceImage)
    for (const wardrobe of char.wardrobes || []) {
      checkAndAdd(wardrobe.fullBodyUrl)
      checkAndAdd(wardrobe.headshotUrl)
      checkAndAdd(wardrobe.previewImageUrl)
    }
  }
  
  // Check scenes
  const scenes = visionPhase.script?.script?.scenes || []
  for (const scene of scenes) {
    checkAndAdd(scene.imageUrl)
    checkAndAdd(scene.sceneReferenceImageUrl)
  }
  
  // Check references
  const refs = visionPhase.references || {}
  for (const backdrop of refs.sceneReferences || []) {
    checkAndAdd(backdrop.imageUrl)
  }
  for (const prop of refs.objectReferences || []) {
    checkAndAdd(prop.imageUrl)
  }
  for (const loc of refs.locationReferences || []) {
    checkAndAdd(loc.imageUrl)
  }
  
  return totalSize
}

/**
 * Strip base64 data from metadata for lite mode
 * Replaces base64 data URIs with "deferred" placeholder
 */
export function stripBase64FromMetadata(metadata: any): any {
  const newMetadata = JSON.parse(JSON.stringify(metadata))
  
  const stripIfBase64 = (obj: any, key: string) => {
    if (obj && isBase64DataUri(obj[key])) {
      obj[key] = 'deferred'
    }
  }
  
  // Strip thumbnail
  stripIfBase64(newMetadata, 'thumbnail')
  
  const visionPhase = newMetadata.visionPhase || {}
  
  // Strip character images
  const characters = visionPhase.characters || []
  for (const char of characters) {
    stripIfBase64(char, 'referenceImage')
    for (const wardrobe of char.wardrobes || []) {
      stripIfBase64(wardrobe, 'fullBodyUrl')
      stripIfBase64(wardrobe, 'headshotUrl')
      stripIfBase64(wardrobe, 'previewImageUrl')
    }
  }
  
  // Strip scene images
  const scenes = visionPhase.script?.script?.scenes || []
  for (const scene of scenes) {
    stripIfBase64(scene, 'imageUrl')
    stripIfBase64(scene, 'sceneReferenceImageUrl')
  }
  
  // Strip reference images
  const refs = visionPhase.references || {}
  for (const backdrop of refs.sceneReferences || []) {
    stripIfBase64(backdrop, 'imageUrl')
  }
  for (const prop of refs.objectReferences || []) {
    stripIfBase64(prop, 'imageUrl')
  }
  for (const loc of refs.locationReferences || []) {
    stripIfBase64(loc, 'imageUrl')
  }
  
  return newMetadata
}
