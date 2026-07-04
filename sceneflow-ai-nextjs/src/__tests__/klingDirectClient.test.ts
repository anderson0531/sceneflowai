import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  buildKlingAuthHeader,
  buildKlingVideoBody,
  extractKlingVideoUrl,
} from '@/lib/kling/klingDirectClient'

describe('klingDirectClient helpers', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.KLING_API_KEY = process.env.KLING_API_KEY
    envBackup.KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY
    envBackup.KLING_SECRET_KEY = process.env.KLING_SECRET_KEY
    delete process.env.KLING_API_KEY
    delete process.env.KLING_ACCESS_KEY
    delete process.env.KLING_SECRET_KEY
  })

  afterEach(() => {
    process.env.KLING_API_KEY = envBackup.KLING_API_KEY
    process.env.KLING_ACCESS_KEY = envBackup.KLING_ACCESS_KEY
    process.env.KLING_SECRET_KEY = envBackup.KLING_SECRET_KEY
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

  it('builds T2V request body with sound enabled by default', () => {
    const body = buildKlingVideoBody({
      prompt: 'Character speaks calmly.',
      duration: 5,
      aspect_ratio: '16:9',
    })
    expect(body.model_name).toBeTruthy()
    expect(body.prompt).toBe('Character speaks calmly.')
    expect(body.duration).toBe('5')
    expect(body.sound).toBe('on')
  })

  it('extracts video URL from Kling task result', () => {
    const url = extractKlingVideoUrl({
      task_status: 'succeed',
      task_result: { videos: [{ url: 'https://cdn.example.com/out.mp4' }] },
    })
    expect(url).toBe('https://cdn.example.com/out.mp4')
  })
})
