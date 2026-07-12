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
}): Promise<string> {
  const res = await fetch('/api/kling/lipsync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(args),
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
  segments: Array<{ segmentId: string; videoUrl: string; dialogueAudioUrl?: string }>
  projectId?: string
  sceneId?: string
  language: string
  durationSeconds?: number
}): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const seg of args.segments) {
    if (!seg.dialogueAudioUrl?.trim()) {
      out[seg.segmentId] = seg.videoUrl
      continue
    }
    out[seg.segmentId] = await requestKlingLipsync({
      videoUrl: seg.videoUrl,
      audioUrl: seg.dialogueAudioUrl,
      projectId: args.projectId,
      sceneId: args.sceneId,
      segmentId: seg.segmentId,
      language: args.language,
      durationSeconds: args.durationSeconds,
    })
  }
  return out
}
