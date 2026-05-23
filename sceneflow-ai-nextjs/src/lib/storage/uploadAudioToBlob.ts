import { put } from '@vercel/blob'

export const AUDIO_BLOB_MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const AUDIO_BLOB_ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
]

export interface UploadAudioToBlobResult {
  url: string
  audioUrl: string
  filename: string
  size: number
}

/**
 * Upload an audio file to Vercel Blob (public URL).
 * Used by /api/audio/upload and as GCS fallback on /api/upload/audio.
 */
export async function uploadAudioToBlob(
  file: File,
  projectId: string
): Promise<UploadAudioToBlobResult> {
  if (!file.type.startsWith('audio/') && !AUDIO_BLOB_ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed types: mp3, wav, ogg, webm`)
  }

  if (file.size > AUDIO_BLOB_MAX_SIZE) {
    throw new Error(
      `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 10MB`
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  const extension = file.name.split('.').pop() || 'mp3'
  const blobPath = `audio/uploads/${projectId}/${timestamp}-${randomId}.${extension}`

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType: file.type || 'audio/mpeg',
  })

  return {
    url: blob.url,
    audioUrl: blob.url,
    filename: file.name,
    size: file.size,
  }
}

/** Server-side: use GCS when explicitly configured; otherwise Vercel Blob. */
export function useGcsForAudioUpload(): boolean {
  return process.env.ASSET_AUDIO_STORAGE?.trim().toLowerCase() === 'gcs'
}
