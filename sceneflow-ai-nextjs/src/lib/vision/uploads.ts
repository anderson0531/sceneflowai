/**
 * Upload an asset (image or audio) for a project.
 * Images in the browser go to Vercel Blob via a client token
 * (`/api/upload/image-url`) so they never hit the 4.5MB Function body cap.
 * Audio defaults to Vercel Blob (`/api/audio/upload`).
 */

import {
  IMAGE_CLIENT_MAX_BYTES,
  IMAGE_CLIENT_UPLOAD_PATH,
  formatImageUploadError,
} from '@/lib/vision/imageUploadLimits'

/** Client-side audio endpoint (Vercel Blob). Legacy GCS: set NEXT_PUBLIC_ASSET_AUDIO_STORAGE=gcs */
export function getAudioUploadEndpoint(): string {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_ASSET_AUDIO_STORAGE?.trim().toLowerCase() === 'gcs'
  ) {
    return '/api/upload/audio'
  }
  return '/api/audio/upload'
}

function imagePathname(file: File, projectId: string): string {
  const rawExt = file.name.split('.').pop()?.toLowerCase() || ''
  const ext = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(rawExt) ? rawExt : 'png'
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '') || 'default'
  return `images/frames/${safeProject}/${Date.now()}.${ext}`
}

async function uploadImageViaBlobClient(file: File, projectId: string): Promise<string> {
  if (file.size > IMAGE_CLIENT_MAX_BYTES) {
    throw new Error(formatImageUploadError(new Error('too large'), file.size))
  }

  try {
    const { upload } = await import('@vercel/blob/client')
    const blob = await upload(imagePathname(file, projectId), file, {
      access: 'public',
      handleUploadUrl: IMAGE_CLIENT_UPLOAD_PATH,
    })
    if (!blob.url) throw new Error('Upload failed')
    return blob.url
  } catch (err) {
    throw new Error(formatImageUploadError(err, file.size))
  }
}

async function uploadViaFormEndpoint(file: File, projectId: string, endpoint: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    const details = (error as { details?: string }).details
    const message =
      (error as { error?: string }).error || details || 'Upload failed'
    throw new Error(
      endpoint.includes('/audio')
        ? message
        : formatImageUploadError(message, file.size)
    )
  }

  const result = await response.json()
  return result.url || result.imageUrl || result.audioUrl
}

export async function uploadAssetViaAPI(file: File, projectId: string): Promise<string> {
  const isAudio = file.type.startsWith('audio/')

  if (!isAudio && typeof window !== 'undefined') {
    return uploadImageViaBlobClient(file, projectId)
  }

  if (!isAudio && file.size > IMAGE_CLIENT_MAX_BYTES) {
    throw new Error(formatImageUploadError(new Error('too large'), file.size))
  }

  const endpoint = isAudio ? getAudioUploadEndpoint() : '/api/upload/image'
  return uploadViaFormEndpoint(file, projectId, endpoint)
}
