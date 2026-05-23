/**
 * Upload an asset (image or audio) for a project via the dedicated API routes.
 * Audio defaults to Vercel Blob (/api/audio/upload); images use Vercel Blob (/api/upload/image).
 */

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

export async function uploadAssetViaAPI(file: File, projectId: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)

  const isAudio = file.type.startsWith('audio/')
  const endpoint = isAudio ? getAudioUploadEndpoint() : '/api/upload/image'

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    const details = (error as { details?: string }).details
    throw new Error((error as { error?: string }).error || details || 'Upload failed')
  }

  const result = await response.json()
  return result.url || result.imageUrl || result.audioUrl
}
