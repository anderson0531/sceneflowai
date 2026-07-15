/**
 * Blob storage helper functions — Vercel Blob (public).
 */

import { put } from '@vercel/blob'

function parseBase64Image(base64Data: string): { buffer: Buffer; contentType: string } {
  if (base64Data.startsWith('data:')) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      return {
        buffer: Buffer.from(match[2], 'base64'),
        contentType: match[1],
      }
    }
  }

  return {
    buffer: Buffer.from(base64Data.replace(/^data:[^;]+;base64,/, ''), 'base64'),
    contentType: 'image/png',
  }
}

function inferContentType(filename: string, fallback = 'image/png'): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'png':
      return 'image/png'
    default:
      return fallback
  }
}

function buildBlobPath(filename: string, projectId = 'default'): string {
  if (filename.startsWith('projects/') || filename.startsWith('http')) {
    return filename.replace(/^https?:\/\/[^/]+\//, '')
  }

  const parts = filename.split('/')
  let subcategory = 'scenes'
  let actualFilename = filename

  if (parts.length > 1) {
    const possibleSubcategory = parts[0] as
      | 'scenes'
      | 'thumbnails'
      | 'frames'
      | 'treatment'
      | 'characters'
    if (
      ['scenes', 'thumbnails', 'frames', 'treatment', 'characters'].includes(
        possibleSubcategory
      )
    ) {
      subcategory = possibleSubcategory
      actualFilename = parts.slice(1).join('/')
    }
  }

  if (projectId && projectId !== 'default') {
    return `projects/${projectId}/images/${subcategory}/${actualFilename}`
  }
  return `images/${subcategory}/${actualFilename}`
}

/**
 * Upload a base64 image to Vercel Blob storage.
 */
export async function uploadImageToBlob(
  base64Data: string,
  filename: string,
  projectId: string = 'default'
): Promise<string> {
  const { buffer, contentType } = parseBase64Image(base64Data)
  const blobPath = buildBlobPath(filename, projectId)

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: inferContentType(blobPath, contentType),
  })

  console.log('[Blob Storage] Uploaded to Vercel Blob:', blob.url)
  return blob.url
}

/**
 * Upload a video buffer to Vercel Blob storage.
 */
export async function uploadVideoToBlob(
  videoBuffer: Buffer,
  filename: string,
  projectId: string = 'default',
  metadata?: Record<string, string>
): Promise<string> {
  const blobPath = buildBlobPath(filename, projectId)
  const blob = await put(blobPath, videoBuffer, {
    access: 'public',
    contentType: 'video/mp4',
    ...(metadata ? { addRandomSuffix: false } : {}),
  })
  console.log('[Blob Storage] Uploaded video to Vercel Blob:', blob.url)
  return blob.url
}

export function isBase64DataUri(str: string): boolean {
  return typeof str === 'string' && str.startsWith('data:image')
}
