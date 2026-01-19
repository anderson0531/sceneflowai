/**
 * Local Asset Storage for Demo Mode
 * 
 * Stores images and videos locally when GCS is unavailable (e.g., billing issues).
 * Files are stored in public/demo-assets/ and served via Next.js static file serving.
 * 
 * This is a temporary workaround for creating demo content.
 * 
 * File Size Limits:
 * - Images: 10MB
 * - Videos: 100MB
 */

import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Base directory for demo assets (relative to project root)
const DEMO_ASSETS_DIR = 'public/demo-assets'

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

export interface LocalUploadResult {
  url: string           // Public URL for accessing the asset
  localPath: string     // Filesystem path
  filename: string
  size: number
}

/**
 * Ensure the demo assets directory exists
 */
async function ensureAssetDir(subcategory: string): Promise<string> {
  const dir = path.join(process.cwd(), DEMO_ASSETS_DIR, subcategory)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
    console.log(`[Local Storage] Created directory: ${dir}`)
  }
  return dir
}

/**
 * Generate a unique filename with timestamp
 */
function generateFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now()
  const ext = path.extname(originalName) || '.bin'
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .substring(0, 50)
  
  return prefix 
    ? `${prefix}-${baseName}-${timestamp}${ext}`
    : `${baseName}-${timestamp}${ext}`
}

/**
 * Upload an image to local storage
 */
export async function uploadImageLocally(
  buffer: Buffer,
  options: {
    filename: string
    subcategory?: 'scenes' | 'frames' | 'characters' | 'thumbnails' | 'treatment'
    prefix?: string
  }
): Promise<LocalUploadResult> {
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image size ${Math.round(buffer.length / 1024 / 1024)}MB exceeds limit of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`)
  }

  const subcategory = options.subcategory || 'images'
  const dir = await ensureAssetDir(subcategory)
  
  const filename = generateFilename(options.filename, options.prefix)
  const localPath = path.join(dir, filename)
  
  await writeFile(localPath, buffer)
  
  const url = `/demo-assets/${subcategory}/${filename}`
  console.log(`[Local Storage] Uploaded image: ${url} (${Math.round(buffer.length / 1024)}KB)`)
  
  return { url, localPath, filename, size: buffer.length }
}

/**
 * Upload a base64 image to local storage
 */
export async function uploadBase64ImageLocally(
  base64Data: string,
  options: {
    filename: string
    subcategory?: 'scenes' | 'frames' | 'characters' | 'thumbnails' | 'treatment'
    prefix?: string
  }
): Promise<LocalUploadResult> {
  let cleanBase64 = base64Data
  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:[^;]+;base64,(.+)$/)
    if (matches) cleanBase64 = matches[1]
  }
  
  const buffer = Buffer.from(cleanBase64, 'base64')
  return uploadImageLocally(buffer, options)
}

/**
 * Upload a video to local storage
 */
export async function uploadVideoLocally(
  buffer: Buffer,
  options: {
    filename: string
    segmentId?: string
    prefix?: string
  }
): Promise<LocalUploadResult> {
  if (buffer.length > MAX_VIDEO_SIZE) {
    const sizeMB = Math.round(buffer.length / 1024 / 1024)
    const limitMB = MAX_VIDEO_SIZE / 1024 / 1024
    throw new Error(`Video size ${sizeMB}MB exceeds limit of ${limitMB}MB. Please compress or trim your video.`)
  }

  const dir = await ensureAssetDir('videos')
  
  const prefix = options.prefix || options.segmentId || 'video'
  const filename = generateFilename(options.filename, prefix)
  const localPath = path.join(dir, filename)
  
  await writeFile(localPath, buffer)
  
  const url = `/demo-assets/videos/${filename}`
  console.log(`[Local Storage] Uploaded video: ${url} (${Math.round(buffer.length / 1024 / 1024)}MB)`)
  
  return { url, localPath, filename, size: buffer.length }
}

/**
 * Delete a locally stored asset
 */
export async function deleteLocalAsset(url: string): Promise<void> {
  if (!url.startsWith('/demo-assets/')) {
    console.warn(`[Local Storage] Cannot delete non-local asset: ${url}`)
    return
  }
  
  const localPath = path.join(process.cwd(), 'public', url)
  
  try {
    await unlink(localPath)
    console.log(`[Local Storage] Deleted: ${url}`)
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error(`[Local Storage] Failed to delete ${url}:`, error.message)
    }
  }
}

/**
 * Get the maximum file sizes
 */
export function getFileSizeLimits(): { image: number; video: number } {
  return { image: MAX_IMAGE_SIZE, video: MAX_VIDEO_SIZE }
}
