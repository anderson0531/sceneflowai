/**
 * Blob storage helper functions
 * 
 * These functions delegate to GCS storage backend.
 * They use dynamic imports to avoid bundling @google-cloud/storage in client builds.
 */

/**
 * Upload a base64 image to Google Cloud Storage
 * @param base64Data - Base64 image data (with or without data URI prefix)
 * @param filename - Filename for the blob (e.g., 'thumbnails/project-123.png')
 * @param projectId - Project ID for organizing assets (defaults to 'default')
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToBlob(
  base64Data: string,
  filename: string,
  projectId: string = 'default'
): Promise<string> {
  // Dynamic import to avoid bundling @google-cloud/storage in client builds
  const { uploadBase64ImageToGCS } = await import('./gcsAssets')
  
  // Extract category from filename path (e.g., 'thumbnails/project-123.png')
  const parts = filename.split('/')
  let subcategory: 'scenes' | 'thumbnails' | 'frames' | 'treatment' | 'characters' = 'scenes'
  let actualFilename = filename
  
  if (parts.length > 1) {
    const possibleSubcategory = parts[0] as typeof subcategory
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
 * Upload a video buffer to Google Cloud Storage
 * @param videoBuffer - Video data as Buffer
 * @param filename - Filename for the blob (e.g., 'segments/segment-123.mp4')
 * @param projectId - Project ID for organizing assets (defaults to 'default')
 * @returns Public URL of the uploaded video
 */
export async function uploadVideoToBlob(
  videoBuffer: Buffer,
  filename: string,
  projectId: string = 'default'
): Promise<string> {
  // Dynamic import to avoid bundling @google-cloud/storage in client builds
  const { uploadToGCS } = await import('./gcsAssets')
  
  const result = await uploadToGCS(videoBuffer, {
    projectId,
    category: 'renders',
    subcategory: 'scenes',
    filename,
    contentType: 'video/mp4',
  })
  
  return result.url
}

/**
 * Check if a string is a base64 data URI
 */
export function isBase64DataUri(str: string): boolean {
  return typeof str === 'string' && str.startsWith('data:image')
}

