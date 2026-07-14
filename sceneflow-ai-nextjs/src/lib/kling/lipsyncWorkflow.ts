/**
 * Client helper for multilanguage Kling lip-sync using per-beat TTS MP3.
 */

export async function requestKlingLipsync(args: {
  videoUrl: string
  audioUrl: string
  projectId?: string
  sceneId?: string
  segmentId?: string
  language?: string
  durationSeconds?: number
  audioDurationSeconds?: number
}): Promise<string> {
  const res = await fetch('/api/kling/lipsync/segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      ...args,
      audioDurationSeconds: args.audioDurationSeconds ?? args.durationSeconds,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Lip-sync failed (${res.status})`)
  }
  const data = await res.json()
  if (!data.assetUrl) throw new Error('Lip-sync response missing assetUrl')
  return data.assetUrl as string
}

export async function lipsyncSegmentVideosForLanguage(args: {
  segments: Array<{
    segmentId: string
    videoUrl: string
    dialogueAudioUrl?: string
    audioDurationSeconds?: number
  }>
  projectId?: string
  sceneId?: string
  language: string
  durationSeconds?: number
  onProgress?: (segmentId: string, index: number, total: number) => void
}): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const withDialogue = args.segments.filter((s) => s.dialogueAudioUrl?.trim())
  let idx = 0
  for (const seg of args.segments) {
    if (!seg.dialogueAudioUrl?.trim()) {
      out[seg.segmentId] = seg.videoUrl
      continue
    }
    args.onProgress?.(seg.segmentId, idx, withDialogue.length)
    out[seg.segmentId] = await requestKlingLipsync({
      videoUrl: seg.videoUrl,
      audioUrl: seg.dialogueAudioUrl,
      projectId: args.projectId,
      sceneId: args.sceneId,
      segmentId: seg.segmentId,
      language: args.language,
      audioDurationSeconds: seg.audioDurationSeconds,
      durationSeconds: args.durationSeconds,
    })
    idx += 1
  }
  return out
}
