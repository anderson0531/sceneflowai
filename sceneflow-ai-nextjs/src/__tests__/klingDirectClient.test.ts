import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  buildKlingAuthHeader,
  buildKlingVideoBody,
  buildKlingExtendBody,
  extractKlingVideoUrl,
  extractKlingVideoId,
  parseKlingWebhookPayload,
} from '@/lib/kling/klingDirectClient'
import { getKlingSegmentPollTimeoutSec } from '@/lib/kling/config'

describe('klingDirectClient helpers', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.KLING_API_KEY = process.env.KLING_API_KEY
    envBackup.KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY
    envBackup.KLING_SECRET_KEY = process.env.KLING_SECRET_KEY
    envBackup.KLING_DEFAULT_MODEL = process.env.KLING_DEFAULT_MODEL
    envBackup.KLING_POLL_TIMEOUT_SEC = process.env.KLING_POLL_TIMEOUT_SEC
    delete process.env.KLING_API_KEY
    delete process.env.KLING_ACCESS_KEY
    delete process.env.KLING_SECRET_KEY
    delete process.env.KLING_DEFAULT_MODEL
    delete process.env.KLING_POLL_TIMEOUT_SEC
  })

  afterEach(() => {
    process.env.KLING_API_KEY = envBackup.KLING_API_KEY
    process.env.KLING_ACCESS_KEY = envBackup.KLING_ACCESS_KEY
    process.env.KLING_SECRET_KEY = envBackup.KLING_SECRET_KEY
    process.env.KLING_DEFAULT_MODEL = envBackup.KLING_DEFAULT_MODEL
    process.env.KLING_POLL_TIMEOUT_SEC = envBackup.KLING_POLL_TIMEOUT_SEC
  })

  it('builds gateway Bearer auth from KLING_API_KEY', () => {
    process.env.KLING_API_KEY = 'api-key-kling-test'
    expect(buildKlingAuthHeader()).toBe('Bearer api-key-kling-test')
  })

  it('builds JWT auth from access + secret keys', () => {
    process.env.KLING_ACCESS_KEY = 'ak_test'
    process.env.KLING_SECRET_KEY = 'sk_test_secret'
    const header = buildKlingAuthHeader()
    expect(header.startsWith('Bearer ')).toBe(true)
    const token = header.slice('Bearer '.length)
    const decoded = jwt.verify(token, 'sk_test_secret') as { iss: string }
    expect(decoded.iss).toBe('ak_test')
  })

  it('builds T2V request body with sound enabled by default for kling-v2-6', () => {
    const { body } = buildKlingVideoBody({
      prompt: 'Character speaks calmly.',
      duration: 5,
      aspect_ratio: '16:9',
      model_name: 'kling-v3-omni',
    })
    expect(body.model_name).toBe('kling-v2-6')
    expect(body.prompt).toBe('Character speaks calmly.')
    expect(body.duration).toBe('5')
    expect(body.sound).toBe('on')
    expect(body.image_list).toBeUndefined()
  })

  it('sends official image field for I2V (not image_list)', () => {
    const { body, endpoint } = buildKlingVideoBody({
      prompt: 'Animate the scene',
      model_name: 'kling-v3-omni',
      startFrame: 'https://cdn.example.com/start.png',
    })
    expect(endpoint).toBe('image2video')
    expect(body.image).toBe('https://cdn.example.com/start.png')
    expect(body.image_list).toBeUndefined()
    expect(body.tail_image).toBeUndefined()
  })

  it('sends image_tail and forces pro mode when end frame is present', () => {
    const { body } = buildKlingVideoBody({
      prompt: 'Interpolate',
      model_name: 'kling-v3-omni',
      mode: 'std',
      startFrame: 'https://cdn.example.com/start.png',
      lastFrame: 'https://cdn.example.com/end.png',
    })
    expect(body.image).toBe('https://cdn.example.com/start.png')
    expect(body.image_tail).toBe('https://cdn.example.com/end.png')
    expect(body.mode).toBe('pro')
  })

  it('snaps duration to official 5/10 enum', () => {
    const short = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3-omni',
      duration: 3,
    })
    expect(short.body.duration).toBe('5')

    const long = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3-omni',
      duration: 12,
    })
    expect(long.body.duration).toBe('10')
  })

  it('gates unsupported params for kling-v2.6', () => {
    const { body, droppedKeys } = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v2.6',
      cfg_scale: 0.5,
      multi_shot: true,
      element_list: ['elem-1'],
    })
    expect(body.cfg_scale).toBeUndefined()
    expect(body.multi_shot).toBeUndefined()
    expect(body.element_list).toBeUndefined()
    expect(droppedKeys).toContain('cfg_scale')
    expect(droppedKeys).toContain('multi_shot')
    expect(droppedKeys).toContain('element_list')
  })

  it('omits sound for kling-v2-5-turbo official model', () => {
    const { body, droppedKeys } = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3-turbo',
      sound: true,
    })
    expect(body.model_name).toBe('kling-v2-5-turbo')
    expect(body.sound).toBeUndefined()
    expect(droppedKeys).toContain('sound')
  })

  it('includes cfg_scale for kling-v3 official model', () => {
    const { body } = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3',
      cfg_scale: 0.5,
    })
    expect(body.model_name).toBe('kling-v3')
    expect(body.cfg_scale).toBe(0.5)
  })

  it('includes element_list for kling-v3-omni', () => {
    const { body } = buildKlingVideoBody({
      prompt: '<<<element_1>>> walks forward',
      model_name: 'kling-v3-omni',
      element_list: ['elem-abc', 'elem-def'],
    })
    expect(body.element_list).toEqual(['elem-abc', 'elem-def'])
  })

  it('extracts video URL from Kling task result', () => {
    const url = extractKlingVideoUrl({
      task_status: 'succeed',
      task_result: { videos: [{ url: 'https://cdn.example.com/out.mp4' }] },
    })
    expect(url).toBe('https://cdn.example.com/out.mp4')
  })

  it('parses webhook payload', () => {
    const payload = parseKlingWebhookPayload({
      data: {
        task_id: 'task-123',
        task_status: 'succeed',
        task_result: { videos: [{ url: 'https://cdn.example.com/out.mp4' }] },
      },
    })
    expect(payload?.task_id).toBe('task-123')
    expect(payload?.task_status).toBe('succeed')
  })

  it('extracts video_id from task result', () => {
    const id = extractKlingVideoId({
      task_result: { videos: [{ id: 'vid-abc', url: 'https://cdn.example.com/out.mp4' }] },
    })
    expect(id).toBe('vid-abc')
  })

  it('builds video-extend body without model override', () => {
    const { body, droppedKeys } = buildKlingExtendBody({
      videoId: 'parent-vid-1',
      prompt: 'Continue the scene calmly',
      negativePrompt: 'blur',
      cfgScale: 0.6,
      webhookUrl: 'https://app.example.com/api/webhooks/kling',
      model: 'kling-v3-omni',
    })
    expect(body.video_id).toBe('parent-vid-1')
    expect(body.prompt).toBe('Continue the scene calmly')
    expect(body.callback_url).toBe('https://app.example.com/api/webhooks/kling')
    expect(body.model_name).toBeUndefined()
    expect(droppedKeys).toContain('model_name')
  })

  it('gates face_consistency without reference frame', () => {
    const { body, droppedKeys } = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3-omni',
      face_consistency: true,
    })
    expect(body.face_consistency).toBeUndefined()
    expect(droppedKeys).toContain('face_consistency')
  })

  it('includes face_consistency with start frame on v3-omni', () => {
    const { body } = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3-omni',
      face_consistency: true,
      startFrame: 'https://cdn.example.com/frame.png',
    })
    expect(body.face_consistency).toBe(true)
    expect(body.image).toBe('https://cdn.example.com/frame.png')
    expect(body.image_list).toBeUndefined()
  })

  it('emits callback_url (not webhook_url) when webhook_url input is provided', () => {
    const { body } = buildKlingVideoBody({
      prompt: 'Test',
      model_name: 'kling-v3-omni',
      webhook_url: 'https://app.example.com/api/webhooks/kling',
    })
    expect(body.callback_url).toBe('https://app.example.com/api/webhooks/kling')
    expect(body.webhook_url).toBeUndefined()
  })

  it('caps segment server poll timeout at 270s under Vercel maxDuration', () => {
    expect(getKlingSegmentPollTimeoutSec()).toBe(270)
    process.env.KLING_POLL_TIMEOUT_SEC = '120'
    expect(getKlingSegmentPollTimeoutSec()).toBe(120)
    process.env.KLING_POLL_TIMEOUT_SEC = '500'
    expect(getKlingSegmentPollTimeoutSec()).toBe(270)
  })
})
