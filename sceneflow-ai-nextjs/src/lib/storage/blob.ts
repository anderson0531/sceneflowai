import { put } from '@vercel/blob'

/**
 * Upload a base64 image to Vercel Blob Storage
 * @param base64Data - Base64 image data (with or without data URI prefix)
 * @param filename - Filename for the blob (e.g., 'thumbnails/project-123.png')
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToBlob(
  base64Data: string,
  filename: string
): Promise<string> {
  // Convert base64 to buffer
  const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64WithoutPrefix, 'base64')
  
  // Upload to Vercel Blob
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: 'image/png'
  })
  
  return blob.url // Returns permanent public URL
}

/**
 * Upload a video buffer to Vercel Blob Storage
 * @param videoBuffer - Video data as Buffer
 * @param filename - Filename for the blob (e.g., 'segments/segment-123.mp4')
 * @returns Public URL of the uploaded video
 */
export async function uploadVideoToBlob(
  videoBuffer: Buffer,
  filename: string
): Promise<string> {
  // Upload to Vercel Blob
  const blob = await put(filename, videoBuffer, {
    access: 'public',
    contentType: 'video/mp4'
  })
  
  return blob.url // Returns permanent public URL
}

/**
 * Check if a string is a base64 data URI
 */
export function isBase64DataUri(str: string): boolean {
  return typeof str === 'string' && str.startsWith('data:image')
}

