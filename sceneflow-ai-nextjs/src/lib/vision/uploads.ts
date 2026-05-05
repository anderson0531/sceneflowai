/**
 * Upload an asset (image or audio) for a project via the dedicated API routes.
 * Routes use Vercel Blob server-side and return the public URL.
 */
export async function uploadAssetViaAPI(file: File, projectId: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)

  const isAudio = file.type.startsWith('audio/')
  const endpoint = isAudio ? '/api/upload/audio' : '/api/upload/image'

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error((error as any).error || 'Upload failed')
  }

  const result = await response.json()
  return result.url || result.imageUrl || result.audioUrl
}
