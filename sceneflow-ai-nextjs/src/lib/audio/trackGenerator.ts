interface GenerateTTSParams {
  text: string
  voiceId: string
  language?: string  // ISO language code for proper duration estimation
}

interface GenerateSFXParams {
  description: string
  duration?: number
}

// Languages that don't use spaces between words (CJK + Southeast Asian)
const NON_SPACE_LANGUAGES = ['th', 'zh', 'ja', 'ko', 'lo', 'km', 'my', 'vi']

/**
 * Estimate audio duration from text
 * Uses character count for non-space languages, word count for space-delimited
 */
function estimateDuration(text: string, language: string = 'en'): number {
  if (NON_SPACE_LANGUAGES.includes(language)) {
    // Thai, Chinese, Japanese, Korean: ~5-7 characters per second
    return Math.max(1, text.length / 6)
  }
  // Space-delimited languages: ~150 words per minute = 2.5 words/second
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  return Math.max(1, wordCount / 2.5)
}

/**
 * Estimate audio duration from blob size
 * More reliable than text-based estimation, especially for non-English
 */
function estimateDurationFromBlob(blobSize: number, language: string = 'en'): number {
  // MP3 bitrates: 128kbps (16KB/s) for English, 192kbps (24KB/s) for non-English
  const bytesPerSecond = language !== 'en' ? 24000 : 16000
  return Math.max(1, blobSize / bytesPerSecond)
}

/**
 * Generate narration or dialogue audio using ElevenLabs TTS
 * Returns blob URL and estimated duration
 */
export async function generateTTSAudio(params: GenerateTTSParams): Promise<{ mp3Url: string; duration: number }> {
  const language = params.language || 'en'
  
  const response = await fetch('/api/tts/elevenlabs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: params.text,
      voiceId: params.voiceId,
      language: language
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'TTS generation failed' }))
    throw new Error(error.error || 'Failed to generate audio')
  }

  const blob = await response.blob()
  
  // PRIMARY: Estimate duration from blob size (works for ALL languages)
  // This is more reliable than text-based estimation, especially for Thai/Chinese/etc.
  let estimatedDuration = estimateDurationFromBlob(blob.size, language)
  
  // FALLBACK: If blob size is suspiciously small, use text-based estimation
  if (estimatedDuration < 1 && params.text.length > 10) {
    estimatedDuration = estimateDuration(params.text, language)
  }
  
  console.log('[trackGenerator] Duration estimate:', {
    blobSize: blob.size,
    language,
    duration: estimatedDuration.toFixed(2)
  })

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
 * Uses saveToBlob to have server upload directly - avoids 4.5MB client payload limit
 */
export async function generateMusicAudio(description: string, duration: number, projectId?: string, sceneId?: string): Promise<{ mp3Url: string; duration: number }> {
  const response = await fetch('/api/tts/elevenlabs/music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: description,
      duration,
      saveToBlob: true,  // Server-side upload bypasses client payload limits
      projectId: projectId || 'default',
      sceneId: sceneId || `music-${Date.now()}`
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Music generation failed' }))
    throw new Error(error.error || 'Music generation failed')
  }

  // Server returns the blob URL directly when saveToBlob=true
  const data = await response.json()

  return {
    mp3Url: data.url,
    duration
  }
}

