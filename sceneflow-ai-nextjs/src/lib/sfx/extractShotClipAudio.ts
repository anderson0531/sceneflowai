import { downloadProductionVideo } from '@/lib/gemini/productionVideoClient'
import { extractAudioFromVideoBuffer } from '@/lib/sfx/extractAudioFromVideo'
import { uploadToGCS } from '@/lib/storage/gcsAssets'

async function downloadClip(videoUrl: string): Promise<Buffer> {
  const buffer = await downloadProductionVideo(videoUrl, 'vertex')
  if (buffer?.length) return buffer
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`Could not download shot clip (HTTP ${response.status})`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (!bytes.length) throw new Error('Shot clip download was empty')
  return bytes
}

/** Pull the audio track off a rendered shot clip and store it as MP3. */
export async function extractShotClipAudio(params: {
  projectId: string
  videoUrl: string
  beatId?: string
}): Promise<{ url: string; gcsPath: string }> {
  const videoUrl = params.videoUrl.trim()
  if (!videoUrl) throw new Error('Shot clip URL is required')
  if (!params.projectId) throw new Error('projectId is required')

  const video = await downloadClip(videoUrl)
  const audio = await extractAudioFromVideoBuffer(video)
  const filename = `shot-audio-${params.beatId || 'beat'}-${Date.now()}.mp3`
  const upload = await uploadToGCS(audio, {
    projectId: params.projectId,
    category: 'audio',
    subcategory: 'sfx',
    filename,
    contentType: 'audio/mpeg',
    metadata: {
      provider: 'shot-clip',
      sourceUrl: videoUrl.slice(0, 500),
    },
  })
  const url = upload.publicUrl || upload.url
  if (!url) throw new Error('Shot clip audio upload did not return a URL')
  return { url, gcsPath: upload.gcsPath }
}
