import { describe, it, expect } from 'vitest'
import { getFootageBeatStatusConfig } from '@/components/vision/scene-production/DirectorConsoleImpl'
import type { DirectorQueueItem } from '@/components/vision/scene-production/types'

const baseItem: DirectorQueueItem = {
  segmentId: 'seg_1',
  sequenceIndex: 0,
  config: {
    mode: 'I2V',
    prompt: '',
    motionPrompt: '',
    visualPrompt: '',
    negativePrompt: '',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 6,
    startFrameUrl: null,
    endFrameUrl: null,
    sourceVideoUrl: null,
    approvalStatus: 'auto-ready',
    confidence: 80,
  },
  thumbnailUrl: null,
  status: 'queued',
}

describe('getFootageBeatStatusConfig', () => {
  it('shows In the Can for completed beats regardless of approvalStatus', () => {
    expect(getFootageBeatStatusConfig({ ...baseItem, status: 'complete' }).label).toBe('In the Can')
    expect(
      getFootageBeatStatusConfig({
        ...baseItem,
        status: 'complete',
        config: { ...baseItem.config, approvalStatus: 'auto-ready' },
      }).label
    ).toBe('In the Can')
    expect(
      getFootageBeatStatusConfig({
        ...baseItem,
        status: 'complete',
        config: { ...baseItem.config, approvalStatus: 'locked' },
      }).label
    ).toBe('In the Can')
  })

  it('shows Ready for queued beats without video', () => {
    expect(getFootageBeatStatusConfig(baseItem).label).toBe('Ready')
  })

  it('shows Rolling while rendering', () => {
    expect(getFootageBeatStatusConfig({ ...baseItem, status: 'rendering' }).label).toBe('Rolling')
  })
})
