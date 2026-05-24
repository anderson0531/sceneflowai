/**
 * Server-only Edge TTS synthesis (Microsoft Edge online service, no API key).
 */

import { EdgeTTS } from 'edge-tts-universal'
import { finalizeTextForGoogleTts } from '@/lib/tts/textOptimizer'
import { resolveEdgeVoice } from '@/lib/tts/edgeTtsVoices'

export type SynthesizeEdgeMp3Params = {
  text: string
  /** Edge voice short name, e.g. hi-IN-MadhurNeural */
  voice?: string
  /** Target language code (en, hi, es, …) — used when voice is omitted */
  language?: string
  /** Character gender hint for voice selection when voice is omitted */
  gender?: string
  timeoutMs?: number
}

export async function synthesizeEdgeMp3(params: SynthesizeEdgeMp3Params): Promise<Buffer> {
  const sanitizedText = finalizeTextForGoogleTts(params.text)
  if (!sanitizedText.trim()) {
    throw new Error('Text is empty after removing bracketed tags')
  }

  const voice =
    params.voice?.trim() ||
    resolveEdgeVoice(params.language || 'en', params.gender)

  const timeoutMs = params.timeoutMs ?? 90_000

  const synthesize = async () => {
    const tts = new EdgeTTS(sanitizedText, voice)
    const result = await tts.synthesize()
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer())
    if (!audioBuffer.length) {
      throw new Error('Edge TTS returned empty audio')
    }
    return audioBuffer
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      synthesize(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Edge TTS timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      }),
    ])
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}
