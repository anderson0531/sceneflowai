import { describe, expect, it } from 'vitest'
import {
  buildOmniInteractionRequestBody,
  extractVideoFromOmniInteraction,
  formatOmniDuration,
  formatOmniInteractionErrorMessage,
  isOmniInteractionOperation,
  mapOmniInteractionStatus,
  normalizeOmniInteractionBuildOptions,
  normalizeOmniInteractionId,
  redactOmniPayloadForLog,
  resolveOmniPreviousInteractionId,
} from '@/lib/gemini/omniVideoInteractions'

describe('omniVideoInteractions helpers', () => {
  it('formats duration as Omni response_format string', () => {
    expect(formatOmniDuration(10)).toBe('10s')
    expect(formatOmniDuration(8)).toBe('8s')
  })

  it('detects interaction operation names', () => {
    expect(isOmniInteractionOperation('interaction:v1_abc123')).toBe(true)
    expect(isOmniInteractionOperation('v1_abc123')).toBe(true)
    expect(isOmniInteractionOperation('projects/p/locations/us/interactions/v1_abc')).toBe(true)
    expect(isOmniInteractionOperation('projects/p/locations/us/publishers/google/models/veo/operations/op')).toBe(false)
  })

  it('normalizes interaction id prefix', () => {
    expect(normalizeOmniInteractionId('interaction:v1_test')).toBe('v1_test')
    expect(normalizeOmniInteractionId('v1_test')).toBe('v1_test')
  })

  it('resolves previous interaction id from veoVideoRef formats', () => {
    expect(resolveOmniPreviousInteractionId('interaction:v1_prev')).toBe('v1_prev')
    expect(resolveOmniPreviousInteractionId('v1_prev')).toBe('v1_prev')
    expect(resolveOmniPreviousInteractionId('files/abc123')).toBeUndefined()
  })

  it('maps interaction status values', () => {
    expect(mapOmniInteractionStatus('completed')).toBe('COMPLETED')
    expect(mapOmniInteractionStatus('in_progress')).toBe('PROCESSING')
    expect(mapOmniInteractionStatus('failed')).toBe('FAILED')
  })

  it('redacts large base64 blobs in interaction payloads for logging', () => {
    const redacted = redactOmniPayloadForLog({
      id: 'video-1',
      status: 'failed',
      error: { message: 'quota exceeded' },
      steps: [
        {
          type: 'user_input',
          content: [{ type: 'image', mime_type: 'image/png', data: 'A'.repeat(200) }],
        },
      ],
    }) as Record<string, unknown>

    const steps = redacted.steps as Array<Record<string, unknown>>
    const content = (steps[0].content as Array<Record<string, unknown>>)[0]
    expect(content.data).toBe('[data omitted: 200 chars]')
    expect(redacted.error).toEqual({ message: 'quota exceeded' })
  })

  it('formats error messages from interaction payload signals', () => {
    const msg = formatOmniInteractionErrorMessage({
      status: 'failed',
      error: { message: 'RESOURCE_EXHAUSTED: fixed quota not allocated' },
    })
    expect(msg).toContain('RESOURCE_EXHAUSTED')
    expect(msg).toContain('fixed-quota allocation')
  })

  it('strips unsupported FTV lastFrame and EXT without valid previous id', () => {
    const normalized = normalizeOmniInteractionBuildOptions(
      {
        startFrame: 'https://example.com/start.png',
        lastFrame: 'https://example.com/end.png',
        previousInteractionId: 'v1_old',
      },
      { isFTV: true, isEXT: true, hasValidPreviousInteraction: false }
    )
    expect(normalized.lastFrame).toBeUndefined()
    expect(normalized.previousInteractionId).toBeUndefined()
    expect(normalized.startFrame).toBe('https://example.com/start.png')
  })

  it('builds Interactions API body without undocumented duration field', async () => {
    const body = await buildOmniInteractionRequestBody(
      'gemini-omni-flash-preview',
      'A cinematic sunset over the ocean.',
      { aspectRatio: '16:9', durationSeconds: 10 }
    )

    expect(body.model).toBe('gemini-omni-flash-preview')
    expect(body.background).toBe(true)
    expect(body.input).toBe('A cinematic sunset over the ocean.')
    expect(body.generation_config).toEqual({
      video_config: { task: 'text_to_video' },
    })
    expect(body.response_format).toEqual({
      type: 'video',
      aspect_ratio: '16:9',
      delivery: 'uri',
    })
    expect((body.response_format as Record<string, unknown>).duration).toBeUndefined()
  })

  it('extracts base64 video from completed interaction steps', () => {
    const extracted = extractVideoFromOmniInteraction({
      id: 'v1_test123',
      status: 'completed',
      steps: [
        { type: 'user_input', content: [{ type: 'text', text: 'prompt' }] },
        {
          type: 'model_output',
          content: [{ type: 'video', mime_type: 'video/mp4', data: 'AAAA' }],
        },
      ],
    })

    expect(extracted?.videoUrl).toBe('data:video/mp4;base64,AAAA')
    expect(extracted?.veoVideoRef).toBe('interaction:v1_test123')
    expect(extracted?.veoVideoRefExpiry).toBeTruthy()
  })

  it('extracts uri video from interaction response', () => {
    const extracted = extractVideoFromOmniInteraction({
      id: 'v1_uri_test',
      steps: [
        {
          type: 'model_output',
          content: [{
            type: 'video',
            mime_type: 'video/mp4',
            uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc:download?alt=media',
          }],
        },
      ],
    })

    expect(extracted?.videoUrl).toContain('files/abc')
    expect(extracted?.veoVideoRef).toBe('interaction:v1_uri_test')
  })
})
