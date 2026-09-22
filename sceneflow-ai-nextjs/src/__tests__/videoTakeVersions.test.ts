import { describe, expect, it } from 'vitest'
import {
  MEDIA_VERSION_CAP,
  appendSegmentTake,
  applyVideoTakeSelection,
  deriveClipQueueStatus,
  healMissingVideoPointer,
  listPlayableTakes,
  resolveLiveTake,
} from '@/lib/storyboard/mediaVersions'

const CLIP_A = 'https://blob.example/segments/a.mp4'
const CLIP_B = 'https://blob.example/segments/b.mp4'
const STILL = 'https://blob.example/frames/start.jpeg'

describe('listPlayableTakes / resolveLiveTake', () => {
  it('prefers currentTakeId, then the active URL, then the latest complete take', () => {
    const takes = [
      { id: 'new', createdAt: '2026-03-01T00:00:00.000Z', assetUrl: CLIP_B, status: 'COMPLETE' },
      { id: 'old', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: CLIP_A, status: 'COMPLETE' },
    ]
    expect(resolveLiveTake(takes, 'old', CLIP_B)?.id).toBe('old')
    expect(resolveLiveTake(takes, undefined, CLIP_A)?.url).toBe(CLIP_A)
    expect(resolveLiveTake(takes, undefined, undefined)?.id).toBe('new')
  })

  it('backfills a video URL that is not already stored on a take', () => {
    const listed = listPlayableTakes([], CLIP_A)
    expect(listed).toHaveLength(1)
    expect(listed[0]?.url).toBe(CLIP_A)
    expect(listed[0]?.backfill).toBe(true)
    expect(resolveLiveTake([], undefined, CLIP_A)?.url).toBe(CLIP_A)
  })

  it('does not treat a still URL as a video version', () => {
    expect(listPlayableTakes([], STILL)).toEqual([])
    expect(
      listPlayableTakes([{ id: 'still', assetUrl: STILL, status: 'COMPLETE' }], undefined)
    ).toEqual([])
  })

  it('keeps every stored take on read, including more than the append cap', () => {
    const takes = Array.from({ length: 12 }, (_, index) => ({
      id: `t${index}`,
      createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      videoUrl: `https://blob.example/segments/${index}.mp4`,
      status: 'COMPLETE',
    }))
    expect(listPlayableTakes(takes, undefined)).toHaveLength(12)
  })

  it('uses videoUrl when assetUrl is a still', () => {
    const live = resolveLiveTake(
      [{ id: 't1', assetUrl: STILL, videoUrl: CLIP_A, status: 'COMPLETE' }],
      't1',
      undefined
    )
    expect(live?.url).toBe(CLIP_A)
  })
})

describe('appendSegmentTake', () => {
  it('prepends the newest take and caps at 10', () => {
    let takes = Array.from({ length: MEDIA_VERSION_CAP }, (_, index) => ({
      id: `t${index}`,
      assetUrl: `https://blob.example/${index}.mp4`,
    }))
    takes = appendSegmentTake(takes, { id: 'newest', assetUrl: CLIP_B })
    expect(takes).toHaveLength(MEDIA_VERSION_CAP)
    expect(takes[0]?.id).toBe('newest')
    expect(takes.some((take) => take.id === 't0')).toBe(true)
    expect(takes.some((take) => take.id === 't9')).toBe(false)
  })
})

describe('healMissingVideoPointer', () => {
  it('restores an empty pointer from a stored complete take', () => {
    const healed = healMissingVideoPointer({
      status: 'DRAFT',
      activeAssetUrl: null,
      takes: [{ id: 't1', createdAt: '2026-01-01T00:00:00.000Z', assetUrl: CLIP_A, status: 'COMPLETE' }],
    })
    expect(healed.activeAssetUrl).toBe(CLIP_A)
    expect(healed.currentTakeId).toBe('t1')
    expect(healed.assetType).toBe('video')
    expect(healed.status).toBe('COMPLETE')
  })

  it('does not overwrite a different existing video URL', () => {
    const segment = {
      status: 'COMPLETE',
      assetType: 'video' as const,
      activeAssetUrl: CLIP_B,
      currentTakeId: 't2',
      takes: [
        { id: 't1', assetUrl: CLIP_A, status: 'COMPLETE', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 't2', assetUrl: CLIP_B, status: 'COMPLETE', createdAt: '2026-02-01T00:00:00.000Z' },
      ],
    }
    expect(healMissingVideoPointer(segment)).toBe(segment)
  })

  it('does not replace a non-empty still pointer', () => {
    const segment = {
      status: 'DRAFT',
      activeAssetUrl: STILL,
      takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
    }
    expect(healMissingVideoPointer(segment)).toBe(segment)
  })

  it('leaves an in-progress segment alone', () => {
    const segment = {
      status: 'GENERATING',
      activeAssetUrl: '',
      takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
    }
    expect(healMissingVideoPointer(segment)).toBe(segment)
  })
})

describe('applyVideoTakeSelection', () => {
  it('persists a backfilled URL into takes and makes it current', () => {
    const next = applyVideoTakeSelection(
      { activeAssetUrl: CLIP_A, takes: [], status: 'DRAFT' },
      listPlayableTakes([], CLIP_A)[0]!.id
    )
    expect(next.activeAssetUrl).toBe(CLIP_A)
    expect(next.assetType).toBe('video')
    expect(next.status).toBe('COMPLETE')
    expect(next.takes?.[0]?.assetUrl).toBe(CLIP_A)
  })
})

describe('applyVideoTakeSelection stills', () => {
  it('still points at a non-video take from history', () => {
    const next = applyVideoTakeSelection(
      {
        activeAssetUrl: CLIP_A,
        assetType: 'video',
        status: 'COMPLETE',
        takes: [
          { id: 'still', assetUrl: STILL, status: 'COMPLETE' },
          { id: 'clip', assetUrl: CLIP_A, status: 'COMPLETE' },
        ],
      },
      'still'
    )
    expect(next.activeAssetUrl).toBe(STILL)
    expect(next.currentTakeId).toBe('still')
    expect(next.assetType).toBe('video')
  })
})

describe('deriveClipQueueStatus', () => {
  it('marks a stored take complete even when segment status was cleared', () => {
    expect(
      deriveClipQueueStatus({
        status: 'DRAFT',
        activeAssetUrl: null,
        takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
      })
    ).toBe('complete')
  })

  it('keeps an in-progress generate as rendering', () => {
    expect(
      deriveClipQueueStatus({
        status: 'GENERATING',
        takes: [{ id: 't1', assetUrl: CLIP_A, status: 'COMPLETE' }],
      })
    ).toBe('rendering')
  })
})
