import { put } from '@vercel/blob'

/**
 * Reference Library image storage.
 *
 * Temporary workaround for GCP billing: defaults to Vercel Blob.
 * Set REFERENCE_LIBRARY_STORAGE=gcs to revert to Google Cloud Storage.
 */
export function useGcsForReferenceLibraryImages(): boolean {
  return process.env.REFERENCE_LIBRARY_STORAGE?.trim().toLowerCase() === 'gcs'
}

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
  if (filename.startsWith('projects/') || filename.startsWith('references/')) {
    return filename
  }

  if (projectId && projectId !== 'default') {
    return `projects/${projectId}/references/${filename}`
  }

  return `references/${filename}`
}

/**
 * Upload a Reference Library image (base64) to storage.
 */
export async function uploadReferenceLibraryBase64Image(
  base64Data: string,
  filename: string,
  projectId = 'default'
): Promise<string> {
  if (useGcsForReferenceLibraryImages()) {
    const { uploadImageToBlob } = await import('./blob')
    return uploadImageToBlob(base64Data, filename, projectId)
  }

  const { buffer, contentType } = parseBase64Image(base64Data)
  const blobPath = buildBlobPath(filename, projectId)

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: inferContentType(blobPath, contentType),
  })

  console.log('[Reference Library Storage] Uploaded to Vercel Blob:', blob.url)
  return blob.url
}

/**
 * Upload a Reference Library image (buffer) to storage.
 */
export async function uploadReferenceLibraryBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
  projectId = 'default'
): Promise<string> {
  if (useGcsForReferenceLibraryImages()) {
    const { uploadToGCS } = await import('./gcsAssets')
    const result = await uploadToGCS(buffer, {
      projectId,
      category: 'images',
      subcategory: 'characters',
      filename,
      contentType,
    })
    return result.url
  }

  const blobPath = buildBlobPath(filename, projectId)
  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType,
  })

  console.log('[Reference Library Storage] Uploaded to Vercel Blob:', blob.url)
  return blob.url
}
