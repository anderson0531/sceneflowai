import { describe, expect, it } from 'vitest'
import { deliveryFrameSize } from '@/lib/video/renderTypes'
import {
  collectPublishScenes,
  listPublishChapters,
  resolvePublishDelivery,
} from '@/lib/publish/publishUnits'

const scenes = [
  {
    id: 's1',
    index: 0,
    sceneNumber: 1,
    title: 'Cold open',
    blueprintBeatIndex: 0,
    blueprintBeatTitle: 'Arrival',
    mp4Url: 'https://example.com/s1.mp4',
    duration: 40,
  },
  {
    id: 's2',
    index: 1,
    sceneNumber: 2,
    title: 'Threshold',
    blueprintBeatIndex: 0,
    blueprintBeatTitle: 'Arrival',
    mp4Url: 'https://example.com/s2.mp4',
    duration: 55,
  },
  {
    id: 's3',
    index: 2,
    sceneNumber: 3,
    title: 'Turn',
    blueprintBeatIndex: 1,
    blueprintBeatTitle: 'The turn',
    mp4Url: 'https://example.com/s3.mp4',
    duration: 30,
  },
]

describe('delivery frames', () => {
  it('keeps 1080p landscape and swaps it for 9:16', () => {
    expect(deliveryFrameSize('1080p', '16:9')).toEqual({ width: 1920, height: 1080 })
    expect(deliveryFrameSize('1080p', '9:16')).toEqual({ width: 1080, height: 1920 })
    expect(deliveryFrameSize('720p', '9:16')).toEqual({ width: 720, height: 1280 })
    expect(deliveryFrameSize('4K', '9:16')).toEqual({ width: 2160, height: 3840 })
  })
})

describe('publish units', () => {
  it('groups scenes that share a blueprint beat into chapters', () => {
    const chapters = listPublishChapters(scenes)
    expect(chapters).toEqual([
      { beatIndex: 0, title: 'Arrival', sceneIds: ['s1', 's2'] },
      { beatIndex: 1, title: 'The turn', sceneIds: ['s3'] },
    ])
  })

  it('ships a rendered scene directly in 16:9 and pads it for 9:16', () => {
    const landscape = resolvePublishDelivery({
      kind: 'scene',
      aspectRatio: '16:9',
      language: 'en',
      sceneId: 's1',
      scenes,
      streams: [],
    })
    expect(landscape.needsRender).toBe(false)
    expect(landscape.mp4Url).toBe('https://example.com/s1.mp4')
    expect(landscape.blockedReason).toBeUndefined()

    const vertical = resolvePublishDelivery({
      kind: 'scene',
      aspectRatio: '9:16',
      language: 'en',
      sceneId: 's1',
      scenes,
      streams: [],
    })
    expect(vertical.needsRender).toBe(true)
    expect(vertical.clips).toHaveLength(1)
    expect(vertical.aspectNote).toContain('pads')
  })

  it('stitches a chapter from the scenes in that blueprint beat', () => {
    const chapter = resolvePublishDelivery({
      kind: 'chapter',
      aspectRatio: '16:9',
      language: 'en',
      beatIndex: 0,
      scenes,
      streams: [],
    })
    expect(chapter.needsRender).toBe(true)
    expect(chapter.clips.map((clip) => clip.sceneId)).toEqual(['s1', 's2'])
    expect(chapter.blueprintBeatIndex).toBe(0)
  })

  it('blocks chapter shipping when scenes are not linked to a blueprint beat', () => {
    const chapter = resolvePublishDelivery({
      kind: 'chapter',
      aspectRatio: '16:9',
      language: 'en',
      scenes: scenes.map(({ blueprintBeatIndex: _beat, blueprintBeatTitle: _title, ...scene }) => scene),
      streams: [],
    })
    expect(chapter.blockedReason).toContain('Blueprint beat')
  })

  it('uses the language master for 16:9 and scene clips for a vertical master', () => {
    const landscape = resolvePublishDelivery({
      kind: 'master',
      aspectRatio: '16:9',
      language: 'en',
      scenes,
      streams: [{ language: 'en', mp4Url: 'https://example.com/master.mp4', status: 'ready' }],
      projectTitle: 'Northline',
    })
    expect(landscape.mp4Url).toBe('https://example.com/master.mp4')
    expect(landscape.needsRender).toBe(false)
    expect(landscape.title).toContain('Master')

    const vertical = resolvePublishDelivery({
      kind: 'master',
      aspectRatio: '9:16',
      language: 'en',
      scenes,
      streams: [{ language: 'en', mp4Url: 'https://example.com/master.mp4', status: 'ready' }],
    })
    expect(vertical.needsRender).toBe(true)
    expect(vertical.clips).toHaveLength(3)
  })

  it('reads scene streams from production state', () => {
    const collected = collectPublishScenes(
      [
        {
          id: 's1',
          sceneNumber: 1,
          heading: 'INT. DOCK',
          blueprintBeatIndex: 2,
          blueprintBeatTitle: 'Dock',
        },
      ],
      {
        s1: {
          productionStreams: [
            { status: 'ready', language: 'en', streamType: 'video', streamVersion: 2, mp4Url: 'https://example.com/v2.mp4', duration: 12 },
            { status: 'ready', language: 'en', streamType: 'video', streamVersion: 1, mp4Url: 'https://example.com/v1.mp4', duration: 10 },
          ],
        },
      },
      'en'
    )
    expect(collected[0]?.mp4Url).toBe('https://example.com/v2.mp4')
    expect(collected[0]?.blueprintBeatIndex).toBe(2)
    expect(collected[0]?.title).toBe('INT. DOCK')
  })
})
