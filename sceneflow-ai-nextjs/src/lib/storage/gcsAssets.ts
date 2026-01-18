/**
 * GCS Assets Storage Service
 * 
 * Unified service for uploading all project assets to Google Cloud Storage.
 * Replaces Vercel Blob storage for new projects to leverage Google Startup credits.
 * 
 * Bucket structure:
 * gs://sceneflow-assets/
 * └── projects/{projectId}/
 *     ├── images/
 *     │   ├── scenes/{filename}
 *     │   ├── thumbnails/{filename}
 *     │   └── frames/{filename}
 *     ├── audio/
 *     │   ├── narration/{language}/{filename}
 *     │   ├── dialogue/{filename}
 *     │   ├── music/{filename}
 *     │   └── sfx/{filename}
 *     └── renders/
 *         ├── animatics/{filename}
 *         └── final/{filename}
 */

import { Storage, Bucket, File } from '@google-cloud/storage'

// Environment configuration
// Note: .trim() is critical - environment variables can have trailing newlines
const GCS_ASSETS_BUCKET = (process.env.GCS_ASSETS_BUCKET || 'sceneflow-assets').trim()
const DEFAULT_SIGNED_URL_EXPIRY_HOURS = 168 // 7 days

// Singleton storage client
let storageClient: Storage | null = null

/**
 * Get or create GCS storage client
 */
function getStorageClient(): Storage {
  if (!storageClient) {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    
    if (!credentialsJson) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured for GCS access')
    }
    
    try {
      const credentials = JSON.parse(credentialsJson)
      
      storageClient = new Storage({
        credentials,
        projectId: credentials.project_id,
      })
      
      console.log('[GCS Assets] Storage client initialized')
    } catch (error) {
      console.error('[GCS Assets] Failed to parse credentials:', error)
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format')
    }
  }
  return storageClient
}

/**
 * Get the assets bucket
 */
function getAssetsBucket(): Bucket {
  return getStorageClient().bucket(GCS_ASSETS_BUCKET)
}

// ============================================================================
// Types
// ============================================================================

export type AssetCategory = 'images' | 'audio' | 'renders'
export type ImageSubcategory = 'scenes' | 'thumbnails' | 'frames' | 'treatment' | 'characters'
export type AudioSubcategory = 'narration' | 'dialogue' | 'music' | 'sfx'
export type RenderSubcategory = 'animatics' | 'final' | 'scenes'

export interface UploadOptions {
  projectId: string
  category: AssetCategory
  subcategory?: ImageSubcategory | AudioSubcategory | RenderSubcategory
  filename: string
  contentType: string
  language?: string // For language-specific assets (narration, renders)
  metadata?: Record<string, string>
}

export interface UploadResult {
  url: string           // Signed URL for immediate access (7 days)
  gcsPath: string       // GCS URI (gs://bucket/path)
  publicUrl?: string    // Public URL if bucket is public
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a buffer to GCS with proper path structure
 */
export async function uploadToGCS(
  data: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  const { projectId, category, subcategory, filename, contentType, language, metadata } = options
  
  // Build path: projects/{projectId}/{category}/{subcategory?}/{language?}/{filename}
  let path = `projects/${projectId}/${category}`
  if (subcategory) {
    path += `/${subcategory}`
  }
  if (language && (subcategory === 'narration' || category === 'renders')) {
    path += `/${language}`
  }
  path += `/${filename}`
  
  const bucket = getAssetsBucket()
  const file = bucket.file(path)
  
  console.log(`[GCS Assets] Uploading to gs://${GCS_ASSETS_BUCKET}/${path}`)
  
  await file.save(data, {
    contentType,
    metadata: {
      ...metadata,
      projectId,
      category,
      subcategory: subcategory || '',
      language: language || '',
      uploadedAt: new Date().toISOString(),
    },
    resumable: data.length > 5 * 1024 * 1024, // Resumable for files > 5MB
  })
  
  // Make the file publicly readable for direct browser access
  // This avoids signed URL signature issues and CORS problems
  try {
    await file.makePublic()
    console.log(`[GCS Assets] Made file public: ${path}`)
  } catch (publicError) {
    console.warn(`[GCS Assets] Could not make file public (bucket may need IAM update): ${publicError}`)
  }
  
  // Use public URL for direct browser access (no signature needed)
  const publicUrl = `https://storage.googleapis.com/${GCS_ASSETS_BUCKET}/${path}`
  
  console.log(`[GCS Assets] Successfully uploaded: gs://${GCS_ASSETS_BUCKET}/${path}`)
  
  return {
    url: publicUrl,  // Use public URL instead of signed URL for browser compatibility
    gcsPath: `gs://${GCS_ASSETS_BUCKET}/${path}`,
    publicUrl: publicUrl,
  }
}

/**
 * Upload a base64 image to GCS
 */
export async function uploadBase64ImageToGCS(
  base64Data: string,
  options: Omit<UploadOptions, 'contentType'>
): Promise<UploadResult> {
  // Remove data URI prefix if present
  const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64WithoutPrefix, 'base64')
  
  // Detect image type from data URI or default to PNG
  let contentType = 'image/png'
  if (base64Data.startsWith('data:image/jpeg')) {
    contentType = 'image/jpeg'
  } else if (base64Data.startsWith('data:image/webp')) {
    contentType = 'image/webp'
  } else if (base64Data.startsWith('data:image/gif')) {
    contentType = 'image/gif'
  }
  
  return uploadToGCS(buffer, { ...options, contentType })
}

/**
 * Upload a File object to GCS
 */
export async function uploadFileToGCS(
  file: File,
  options: Omit<UploadOptions, 'contentType' | 'filename'>
): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'bin'
  const safeName = file.name.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()
  const filename = `${safeName.replace(`.${extension}`, '')}-${timestamp}.${extension}`
  
  return uploadToGCS(buffer, {
    ...options,
    filename,
    contentType: file.type || 'application/octet-stream',
  })
}

/**
 * Upload a video buffer to GCS
 */
export async function uploadVideoToGCS(
  videoBuffer: Buffer,
  options: Omit<UploadOptions, 'contentType' | 'category'>
): Promise<UploadResult> {
  return uploadToGCS(videoBuffer, {
    ...options,
    category: 'renders',
    contentType: 'video/mp4',
  })
}

/**
 * Upload audio from a URL (downloads and re-uploads to GCS)
 * Used for TTS audio that comes as a URL from external services
 */
export async function uploadAudioFromUrl(
  audioUrl: string,
  options: Omit<UploadOptions, 'contentType'>
): Promise<UploadResult> {
  console.log(`[GCS Assets] Downloading audio from: ${audioUrl.substring(0, 60)}...`)
  
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: HTTP ${response.status}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const contentType = response.headers.get('content-type') || 'audio/mpeg'
  
  return uploadToGCS(buffer, { ...options, contentType })
}

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Generate a new signed URL for an existing GCS path
 * Use this to refresh expired URLs
 */
export async function refreshSignedUrl(
  gcsPath: string,
  expiryHours: number = DEFAULT_SIGNED_URL_EXPIRY_HOURS
): Promise<string> {
  // Parse gs://bucket/path format
  const match = gcsPath.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!match) {
    throw new Error(`Invalid GCS path: ${gcsPath}`)
  }
  
  const [, bucketName, filePath] = match
  const storage = getStorageClient()
  const file = storage.bucket(bucketName).file(filePath)
  
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiryHours * 60 * 60 * 1000,
  })
  
  return signedUrl
}

/**
 * Check if a URL is a GCS signed URL (may need refresh)
 */
export function isGcsSignedUrl(url: string): boolean {
  return url.includes('storage.googleapis.com') && url.includes('Signature=')
}

/**
 * Check if a URL is a GCS URI
 */
export function isGcsUri(url: string): boolean {
  return url.startsWith('gs://')
}

/**
 * Check if a URL is a GCS public URL (storage.googleapis.com)
 */
export function isGcsPublicUrl(url: string): boolean {
  return url.includes('storage.googleapis.com') || url.includes('storage.cloud.google.com')
}

/**
 * Download a file from GCS using authenticated access
 * Works for both signed URLs and public URLs that might have access issues
 */
export async function downloadFromGCS(urlOrPath: string): Promise<Buffer> {
  let bucketName: string
  let filePath: string
  
  // Parse gs://bucket/path format
  if (urlOrPath.startsWith('gs://')) {
    const match = urlOrPath.match(/^gs:\/\/([^/]+)\/(.+)$/)
    if (!match) {
      throw new Error(`Invalid GCS path: ${urlOrPath}`)
    }
    [, bucketName, filePath] = match
  } 
  // Parse https://storage.googleapis.com/bucket/path format
  else if (isGcsPublicUrl(urlOrPath)) {
    try {
      const url = new URL(urlOrPath.split('?')[0]) // Remove query params (signed URL params)
      const pathParts = url.pathname.split('/').filter(Boolean)
      if (pathParts.length < 2) {
        throw new Error(`Invalid GCS URL path: ${url.pathname}`)
      }
      bucketName = pathParts[0]
      filePath = pathParts.slice(1).join('/')
    } catch (error) {
      throw new Error(`Failed to parse GCS URL: ${urlOrPath}`)
    }
  } else {
    throw new Error(`Not a GCS URL or path: ${urlOrPath}`)
  }
  
  console.log(`[GCS Assets] Downloading authenticated: gs://${bucketName}/${filePath}`)
  
  const storage = getStorageClient()
  const file = storage.bucket(bucketName).file(filePath)
  
  const [contents] = await file.download()
  console.log(`[GCS Assets] Downloaded ${contents.length} bytes`)
  
  return contents
}

// ============================================================================
// Deletion
// ============================================================================

/**
 * Delete a file from GCS
 */
export async function deleteFromGCS(gcsPath: string): Promise<void> {
  const match = gcsPath.match(/^gs:\/\/([^/]+)\/(.+)$/)
  if (!match) {
    throw new Error(`Invalid GCS path: ${gcsPath}`)
  }
  
  const [, bucketName, filePath] = match
  const storage = getStorageClient()
  const file = storage.bucket(bucketName).file(filePath)
  
  try {
    await file.delete()
    console.log(`[GCS Assets] Deleted: ${gcsPath}`)
  } catch (error: any) {
    if (error.code === 404) {
      console.warn(`[GCS Assets] File not found (already deleted?): ${gcsPath}`)
      return
    }
    throw error
  }
}

/**
 * Delete all assets for a project
 */
export async function deleteProjectAssets(projectId: string): Promise<number> {
  const bucket = getAssetsBucket()
  const prefix = `projects/${projectId}/`
  
  console.log(`[GCS Assets] Deleting all files with prefix: ${prefix}`)
  
  const [files] = await bucket.getFiles({ prefix })
  
  if (files.length === 0) {
    console.log(`[GCS Assets] No files found for project ${projectId}`)
    return 0
  }
  
  // Delete in batches of 100
  const batchSize = 100
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    await Promise.all(batch.map(file => file.delete()))
  }
  
  console.log(`[GCS Assets] Deleted ${files.length} files for project ${projectId}`)
  return files.length
}

// ============================================================================
// Listing
// ============================================================================

/**
 * List all assets for a project
 */
export async function listProjectAssets(
  projectId: string,
  category?: AssetCategory
): Promise<Array<{ name: string; size: number; updated: Date }>> {
  const bucket = getAssetsBucket()
  let prefix = `projects/${projectId}/`
  if (category) {
    prefix += `${category}/`
  }
  
  const [files] = await bucket.getFiles({ prefix })
  
  return files.map(file => ({
    name: file.name,
    size: parseInt(file.metadata.size as string) || 0,
    updated: new Date(file.metadata.updated as string),
  }))
}

// ============================================================================
// Convenience Functions (drop-in replacements for Vercel Blob)
// ============================================================================

/**
 * Upload image - drop-in replacement for uploadImageToBlob
 */
export async function uploadImage(
  base64Data: string,
  filename: string,
  projectId: string = 'default'
): Promise<string> {
  // Extract category from filename path (e.g., 'thumbnails/project-123.png')
  const parts = filename.split('/')
  let subcategory: ImageSubcategory = 'scenes'
  let actualFilename = filename
  
  if (parts.length > 1) {
    const possibleSubcategory = parts[0] as ImageSubcategory
    if (['scenes', 'thumbnails', 'frames', 'treatment', 'characters'].includes(possibleSubcategory)) {
      subcategory = possibleSubcategory
      actualFilename = parts.slice(1).join('/')
    }
  }
  
  const result = await uploadBase64ImageToGCS(base64Data, {
    projectId,
    category: 'images',
    subcategory,
    filename: actualFilename,
  })
  
  return result.url
}

/**
 * Upload video - drop-in replacement for uploadVideoToBlob
 */
export async function uploadVideo(
  videoBuffer: Buffer,
  filename: string,
  projectId: string = 'default'
): Promise<string> {
  const result = await uploadVideoToGCS(videoBuffer, {
    projectId,
    subcategory: 'scenes',
    filename,
  })
  
  return result.url
}

/**
 * Upload asset - drop-in replacement for uploadAssetToBlob
 */
export async function uploadAsset(
  file: File | Blob,
  filename: string,
  projectId: string
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Determine category from content type
  let category: AssetCategory = 'images'
  const contentType = file.type || 'application/octet-stream'
  
  if (contentType.startsWith('audio/')) {
    category = 'audio'
  } else if (contentType.startsWith('video/')) {
    category = 'renders'
  }
  
  const result = await uploadToGCS(buffer, {
    projectId,
    category,
    filename: `${filename}-${Date.now()}`,
    contentType,
  })
  
  return result.url
}
