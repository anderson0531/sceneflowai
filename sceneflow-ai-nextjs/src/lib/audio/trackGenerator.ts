interface GenerateTTSParams {
  text: string
  voiceId: string
}

interface GenerateSFXParams {
  description: string
  duration?: number
}

/**
 * Generate narration or dialogue audio using ElevenLabs TTS
 * Returns blob URL and estimated duration
 */
export async function generateTTSAudio(params: GenerateTTSParams): Promise<{ mp3Url: string; duration: number }> {
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.text,
      voiceId: params.voiceId
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'TTS generation failed' }))
    throw new Error(error.error || 'Failed to generate audio')
  }

  const blob = await response.blob()
  
  // Estimate duration (rough: ~150 words per minute)
  const wordCount = params.text.split(/\s+/).length
  const estimatedDuration = (wordCount / 150) * 60

  // Upload to Vercel Blob
  const formData = new FormData()
  const timestamp = Date.now()
  const filename = `audio/tts-${timestamp}.mp3`
  formData.append('file', blob, filename)

  const uploadRes = await fetch('/api/upload/audio', {
    method: 'POST',
    body: formData
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload audio file')
  }

  const { url } = await uploadRes.json()

  return {
    mp3Url: url,
    duration: estimatedDuration
  }
}

/**
 * Generate sound effect using ElevenLabs SFX API
 */
export async function generateSFXAudio(params: GenerateSFXParams): Promise<{ mp3Url: string; duration: number }> {
  const response = await fetch('/api/tts/elevenlabs/sound-effects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.description,
      duration: params.duration || 2.0
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'SFX generation failed' }))
    throw new Error(error.error || 'Failed to generate sound effect')
  }

  const blob = await response.blob()

  // Upload to Vercel Blob
  const formData = new FormData()
  const timestamp = Date.now()
  const filename = `audio/sfx-${timestamp}.mp3`
  formData.append('file', blob, filename)

  const uploadRes = await fetch('/api/upload/audio', {
    method: 'POST',
    body: formData
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload SFX file')
  }

  const { url } = await uploadRes.json()

  return {
    mp3Url: url,
    duration: params.duration || 2.0
  }
}

/**
 * Generate background music using ElevenLabs
 */
export async function generateMusicAudio(description: string, duration: number): Promise<{ mp3Url: string; duration: number }> {
  const response = await fetch('/api/tts/elevenlabs/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: description,
      duration
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Music generation failed' }))
    throw new Error(error.error || 'Music generation failed')
  }

  const blob = await response.blob()

  // Upload to Vercel Blob
  const formData = new FormData()
  const timestamp = Date.now()
  const filename = `audio/music-${timestamp}.mp3`
  formData.append('file', blob, filename)

  const uploadRes = await fetch('/api/upload/audio', {
    method: 'POST',
    body: formData
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload music file')
  }

  const { url } = await uploadRes.json()

  return {
    mp3Url: url,
    duration
  }
}

