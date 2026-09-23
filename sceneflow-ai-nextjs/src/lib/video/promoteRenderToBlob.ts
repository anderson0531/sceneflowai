/**
 * Copy a Cloud Storage render into Vercel Blob.
 *
 * Signed GCS URLs expire. The background job stores one immediately so the
 * stream exists even if this tab is closed; this promotion replaces it with
 * a permanent URL the next time the studio is open.
 */

export function isEphemeralRenderUrl(url: string): boolean {
  return url.includes('storage.googleapis.com') || url.startsWith('gs://')
}

export async function promoteRenderToBlob(sourceUrl: string, filename: string): Promise<string> {
  if (!isEphemeralRenderUrl(sourceUrl)) return sourceUrl
  if (sourceUrl.startsWith('gs://')) {
    throw new Error('Render URL is not downloadable yet')
  }

  const response = await fetch(`/api/proxy-video?url=${encodeURIComponent(sourceUrl)}`)
  if (!response.ok) {
    throw new Error(`Proxy fetch failed: ${response.status}`)
  }
  const blob = await response.blob()
  const file = new File([blob], filename, { type: blob.type || 'video/mp4' })
  const { upload } = await import('@vercel/blob/client')
  const uploaded = await upload(filename, file, {
    access: 'public',
    handleUploadUrl: '/api/segments/upload-video-url',
  })
  return uploaded.url
}

type PromotableJob = {
  id: string
  payload?: Record<string, unknown> | null
  result?: Record<string, unknown> | null
}

/** Upload a finished render when needed, then mark the job promoted. */
export async function promoteCompletedSceneRender(job: PromotableJob): Promise<boolean> {
  const result = job.result ?? {}
  if (result.promoted === true) return false
  const downloadUrl = typeof result.downloadUrl === 'string' ? result.downloadUrl : ''
  if (!downloadUrl) return false

  const payload = job.payload ?? {}
  const extension = payload.mode === 'headless' ? 'webm' : 'mp4'
  const sceneNumber = payload.sceneNumber ?? 'scene'
  const language = typeof payload.language === 'string' ? payload.language : 'en'
  const filename = `renders/scene-${sceneNumber}-${language}-${Date.now()}.${extension}`

  const permanentUrl = isEphemeralRenderUrl(downloadUrl)
    ? await promoteRenderToBlob(downloadUrl, filename)
    : downloadUrl

  const response = await fetch('/api/jobs', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'promote-scene-render',
      jobId: job.id,
      downloadUrl: permanentUrl,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to save the permanent render URL')
  }
  return true
}
