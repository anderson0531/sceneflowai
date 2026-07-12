import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateVideoWithKlingVeoFallback } from '@/lib/kling/klingWithVeoFallback'

vi.mock('@/lib/kling/klingDirectClient', () => ({
  runKlingVideo: vi.fn(),
  submitKlingVideo: vi.fn(),
}))

vi.mock('@/lib/kling/jobStore', () => ({
  saveKlingJob: vi.fn(),
}))

import { runKlingVideo, submitKlingVideo } from '@/lib/kling/klingDirectClient'
import { saveKlingJob } from '@/lib/kling/jobStore'

describe('generateVideoWithKlingVeoFallback', () => {
  const envBackup: Record<string, string | undefined> = {}

  beforeEach(() => {
    envBackup.KLING_ASYNC = process.env.KLING_ASYNC
    envBackup.KLING_WEBHOOK_BASE_URL = process.env.KLING_WEBHOOK_BASE_URL
    process.env.KLING_ASYNC = 'true'
    process.env.KLING_WEBHOOK_BASE_URL = 'https://app.example.com'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.KLING_ASYNC = envBackup.KLING_ASYNC
    process.env.KLING_WEBHOOK_BASE_URL = envBackup.KLING_WEBHOOK_BASE_URL
  })

  it('uses synchronous runKlingVideo even when KLING_ASYNC=true and segment context is present', async () => {
    vi.mocked(runKlingVideo).mockResolvedValue(Buffer.from('sync-segment-video'))

    const result = await generateVideoWithKlingVeoFallback({
      prompt: 'Animate beat 5',
      method: 'I2V',
      segmentId: 'seg-beat-5',
      projectId: 'proj-1',
      sceneId: 'scene-1',
      userId: 'user-1',
      videoOptions: {
        durationSeconds: 5,
        aspectRatio: '16:9',
        startFrame: 'https://cdn.example.com/frame.png',
      },
    })

    expect(runKlingVideo).toHaveBeenCalledTimes(1)
    expect(submitKlingVideo).not.toHaveBeenCalled()
    expect(saveKlingJob).not.toHaveBeenCalled()
    expect(result.status).toBe('COMPLETED')
    expect(result.generationProvider).toBe('kling')
    expect(result.videoBuffer?.toString()).toBe('sync-segment-video')
    expect(result.klingJobId).toBeUndefined()
  })
})
