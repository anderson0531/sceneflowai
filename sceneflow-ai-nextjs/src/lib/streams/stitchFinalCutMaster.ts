/**
 * Stitch resolved Final Cut clips into a single master MP4 (browser or cloud).
 */

import type { FinalCutSceneClip } from '@/lib/types/finalCut'

export interface StitchFinalCutClipsArgs {
  projectId: string
  filenameLabel?: string
  clips: FinalCutSceneClip[]
  onProgress?: (message: string) => void
}

export async function stitchFinalCutClips({
  projectId,
  filenameLabel,
  clips,
  onProgress,
}: StitchFinalCutClipsArgs): Promise<string> {
  const readyClips = clips.filter((c) => c.status === 'ready' && c.url)
  if (readyClips.length === 0) {
    throw new Error('No clips to stitch')
  }

  let cursor = 0
  const segments = readyClips.map((clip, idx) => {
    const segment = {
      segmentId: `scene-${clip.sceneId}`,
      assetUrl: clip.url as string,
      assetType: 'video' as const,
      startTime: cursor,
      duration: clip.duration,
      includeVideoAudio: true,
      volume: 1,
    }
    cursor += clip.duration
    onProgress?.(`Stitching scene ${idx + 1} of ${readyClips.length}…`)
    return segment
  })

  const safeLabel = (filenameLabel || projectId).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40)

  if (cursor <= 300) {
    const [{ LocalRenderService }, { upload }] = await Promise.all([
      import('@/lib/video/LocalRenderService'),
      import('@vercel/blob/client'),
    ])

    const result = await new LocalRenderService().render(
      {
        segments,
        audioClips: [],
        textOverlays: [],
        resolution: '1080p',
        fps: 30,
        totalDuration: cursor,
        exportFormat: 'mp4',
      },
      (p) => {
        if (p.phase === 'rendering' || p.phase === 'encoding') {
          onProgress?.(`Rendering master: ${Math.round(p.progress)}%`)
        }
      }
    )

    if (!result.success || !result.blob) {
      throw new Error(result.error || 'Local stitch failed')
    }

    const ext =
      result.containerUsed === 'mp4' || (result.mimeType && result.mimeType.includes('mp4'))
        ? 'mp4'
        : 'webm'
    const filename = `final-cut-${safeLabel}-${Date.now()}.${ext}`
    const file = new File([result.blob], filename, { type: result.mimeType || 'video/webm' })
    onProgress?.('Uploading master…')
    const uploaded = await upload(`renders/${filename}`, file, {
      access: 'public',
      handleUploadUrl: '/api/segments/upload-video-url',
    })
    if (result.blobUrl) {
      LocalRenderService.revokeBlobUrl(result.blobUrl)
    }
    return uploaded.url
  }

  onProgress?.(`Cloud stitching ${readyClips.length} scenes…`)
  const response = await fetch('/api/scene/final-cut/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      sceneId: 'final-cut',
      sceneNumber: 0,
      resolution: '1080p',
      audioConfig: {
        includeNarration: false,
        includeDialogue: false,
        includeMusic: false,
        includeSfx: false,
        includeSegmentAudio: true,
        language: 'en',
        narrationVolume: 0,
        dialogueVolume: 0,
        musicVolume: 0,
        sfxVolume: 0,
        segmentAudioVolume: 1,
      },
      segments: segments.map((s, idx) => ({
        segmentId: s.segmentId,
        sequenceIndex: idx,
        videoUrl: s.assetUrl,
        startTime: s.startTime,
        endTime: s.startTime + s.duration,
        audioSource: 'original',
        audioVolume: s.volume,
        pauseDuration: 0,
      })),
      audioTracks: {},
      textOverlays: [],
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `Server stitch failed: ${response.status}`)
  }

  const { jobId } = await response.json()
  const maxAttempts = 360
  let outputUrl = ''

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 5000))
    const pollRes = await fetch(`/api/scene/final-cut/render?jobId=${jobId}`)
    if (!pollRes.ok) continue
    const data = await pollRes.json()
    if (data.status === 'COMPLETED') {
      outputUrl = data.downloadUrl || data.publicUrl || data.outputUrl
      break
    }
    if (data.status === 'FAILED' || data.status === 'error') {
      throw new Error(data.error || 'Cloud stitch failed')
    }
    onProgress?.(`Cloud stitch in progress… (${attempt + 1}/${maxAttempts})`)
  }

  if (!outputUrl) {
    throw new Error('Cloud stitch timed out')
  }

  if (outputUrl.includes('storage.googleapis.com')) {
    const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(outputUrl)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) throw new Error(`Failed to fetch cloud render: ${res.status}`)
    const blob = await res.blob()
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    const filename = `final-cut-${safeLabel}-${Date.now()}.${ext}`
    const file = new File([blob], filename, { type: blob.type })
    const { upload } = await import('@vercel/blob/client')
    onProgress?.('Uploading master…')
    const uploaded = await upload(`renders/${filename}`, file, {
      access: 'public',
      handleUploadUrl: '/api/segments/upload-video-url',
    })
    return uploaded.url
  }

  return outputUrl
}
