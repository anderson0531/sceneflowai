import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  LYRIA_3_CLIP_MODEL,
  LYRIA_3_PRO_MODEL,
  LYRIA_PRO_MAX_SEC,
  buildLyria3InteractionsBody,
  buildLyria3Prompt,
  clampGenerationDuration,
  clampRequestedPlayDuration,
  extractAudioFromLyriaInteraction,
  getLyriaInteractionId,
  isLyriaInteractionCompleted,
  isLyriaInteractionFailed,
  lyria3InteractionsEndpoint,
  lyriaBlobMeta,
  resolveMusicRequestDuration,
  selectLyriaModel,
} from '@/lib/audio/lyriaClient'

describe('selectLyriaModel', () => {
  it('uses Clip at and below 30 seconds', () => {
    expect(selectLyriaModel(1)).toBe(LYRIA_3_CLIP_MODEL)
    expect(selectLyriaModel(30)).toBe(LYRIA_3_CLIP_MODEL)
  })

  it('uses Pro above 30 seconds', () => {
    expect(selectLyriaModel(31)).toBe(LYRIA_3_PRO_MODEL)
    expect(selectLyriaModel(184)).toBe(LYRIA_3_PRO_MODEL)
    expect(selectLyriaModel(600)).toBe(LYRIA_3_PRO_MODEL)
  })
})

describe('clampGenerationDuration', () => {
  it('caps at the Vertex Pro maximum', () => {
    expect(clampGenerationDuration(600)).toBe(LYRIA_PRO_MAX_SEC)
    expect(clampGenerationDuration(184)).toBe(184)
    expect(clampGenerationDuration(95)).toBe(95)
  })

  it('falls back to 30 when the request is empty', () => {
    expect(clampGenerationDuration(0)).toBe(30)
    expect(clampGenerationDuration(Number.NaN)).toBe(30)
  })
})

describe('clampRequestedPlayDuration', () => {
  it('accepts the mixer ceiling of 600s', () => {
    expect(clampRequestedPlayDuration(600)).toBe(600)
    expect(clampRequestedPlayDuration(120)).toBe(120)
  })

  it('defaults missing values to 30', () => {
    expect(clampRequestedPlayDuration(undefined)).toBe(30)
    expect(clampRequestedPlayDuration(-4)).toBe(30)
  })
})

describe('resolveMusicRequestDuration', () => {
  it('prefers musicDuration over scene duration', () => {
    expect(resolveMusicRequestDuration({ musicDuration: 95, duration: 40 })).toBe(95)
  })

  it('falls back to scene duration, then 30', () => {
    expect(resolveMusicRequestDuration({ duration: 72 })).toBe(72)
    expect(resolveMusicRequestDuration({})).toBe(30)
  })
})

describe('buildLyria3Prompt', () => {
  it('asks Pro for an instrumental track of the requested length', () => {
    const prompt = buildLyria3Prompt('Cinematic orchestral score, ominous strings, slow tempo', 120)
    expect(prompt).toBe(
      'Create a 120-second instrumental film underscore, no vocals, no lyrics. Cinematic orchestral score, ominous strings, slow tempo'
    )
  })

  it('clamps the sentence to 184 seconds', () => {
    const prompt = buildLyria3Prompt('ambient pads', 600)
    expect(prompt.startsWith('Create a 184-second instrumental film underscore')).toBe(true)
  })
})

describe('buildLyria3InteractionsBody', () => {
  it('posts model + text input, with no duration field', () => {
    const body = buildLyria3InteractionsBody(LYRIA_3_PRO_MODEL, 'Create a 90-second instrumental.')
    expect(body).toEqual({
      model: LYRIA_3_PRO_MODEL,
      input: [{ type: 'text', text: 'Create a 90-second instrumental.' }],
    })
    expect(JSON.stringify(body)).not.toContain('duration')
  })
})

describe('lyria3InteractionsEndpoint', () => {
  it('targets the global Interactions API', () => {
    expect(lyria3InteractionsEndpoint('my-proj')).toBe(
      'https://aiplatform.googleapis.com/v1beta1/projects/my-proj/locations/global/interactions'
    )
  })
})

describe('extractAudioFromLyriaInteraction', () => {
  it('reads Vertex outputs[] audio/mpeg', () => {
    const audio = extractAudioFromLyriaInteraction({
      status: 'completed',
      outputs: [
        { type: 'text', text: 'lyrics' },
        { type: 'audio', mime_type: 'audio/mpeg', data: 'Zm9v' },
      ],
    })
    expect(audio).toEqual({ base64Data: 'Zm9v', mimeType: 'audio/mpeg' })
  })

  it('reads Gemini-shaped output_audio', () => {
    const audio = extractAudioFromLyriaInteraction({
      status: 'completed',
      output_audio: { data: 'YmFy', mime_type: 'audio/wav' },
    })
    expect(audio).toEqual({ base64Data: 'YmFy', mimeType: 'audio/wav' })
  })

  it('returns null when the interaction has no audio yet', () => {
    expect(extractAudioFromLyriaInteraction({ status: 'in_progress', id: 'abc' })).toBeNull()
  })
})

describe('interaction status helpers', () => {
  it('treats completed / succeeded as done', () => {
    expect(isLyriaInteractionCompleted({ status: 'completed' })).toBe(true)
    expect(isLyriaInteractionCompleted({ status: 'SUCCEEDED' })).toBe(true)
    expect(isLyriaInteractionCompleted({ status: 'in_progress' })).toBe(false)
  })

  it('treats failed payloads as failed', () => {
    expect(isLyriaInteractionFailed({ status: 'failed' })).toBe(true)
    expect(isLyriaInteractionFailed({ error: { message: 'no' } })).toBe(true)
    expect(isLyriaInteractionFailed({ status: 'completed' })).toBe(false)
  })

  it('strips a resource-name interaction id', () => {
    expect(
      getLyriaInteractionId({
        name: 'projects/p/locations/global/interactions/abc-123',
      })
    ).toBe('abc-123')
    expect(getLyriaInteractionId({ id: 'plain' })).toBe('plain')
  })
})

describe('lyriaBlobMeta', () => {
  it('stores MPEG as mp3 and WAV as wav', () => {
    expect(lyriaBlobMeta('audio/mpeg')).toEqual({ extension: 'mp3', contentType: 'audio/mpeg' })
    expect(lyriaBlobMeta('audio/wav')).toEqual({ extension: 'wav', contentType: 'audio/wav' })
  })
})

describe('music route wiring', () => {
  const route = readFileSync(
    join(__dirname, '../app/api/tts/google/music/route.ts'),
    'utf8'
  )
  const generateAll = readFileSync(
    join(__dirname, '../app/api/vision/generate-all-audio/route.ts'),
    'utf8'
  )

  it('calls Lyria 3 Interactions and measures container duration', () => {
    expect(route).toContain("from '@/lib/audio/lyriaClient'")
    expect(route).toContain('callLyria3')
    expect(route).toContain('selectLyriaModel')
    expect(route).toContain('getContainerAudioDurationSeconds')
    expect(route).not.toContain('lyria-002')
    expect(route).not.toContain(':predict')
    expect(route).not.toContain('getWavDurationSeconds')
  })

  it('asks generate-all-audio for the scene length instead of a hardcoded 30s', () => {
    expect(generateAll).toContain('resolveMusicRequestDuration')
    expect(generateAll).not.toMatch(/duration:\s*30/)
  })
})
