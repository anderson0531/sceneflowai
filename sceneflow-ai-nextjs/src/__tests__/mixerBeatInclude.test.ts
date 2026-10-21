import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  filterMixerIncludedSegments,
  isMixerBeatIncluded,
  listIncludedBeatVideos,
  listMixerBeatRows,
  restoreIncludedMixerBeats,
} from '@/lib/scene/mixerBeatInclude'
import { enumerateStoryboardFrameSlots, resolveDesignatedStillUrl } from '@/lib/storyboard/types'

describe('mixerBeatInclude', () => {
  it('isMixerBeatIncluded treats undefined and true as included', () => {
    expect(isMixerBeatIncluded({})).toBe(true)
    expect(isMixerBeatIncluded({ mixerBeatIncluded: true })).toBe(true)
  })

  it('isMixerBeatIncluded treats false as excluded', () => {
    expect(isMixerBeatIncluded({ mixerBeatIncluded: false })).toBe(false)
  })

  it('filterMixerIncludedSegments keeps included segments only', () => {
    const segments = [
      { segmentId: 'a', mixerBeatIncluded: true },
      { segmentId: 'b' },
      { segmentId: 'c', mixerBeatIncluded: false },
    ]
    expect(filterMixerIncludedSegments(segments).map((s) => s.segmentId)).toEqual([
      'a',
      'b',
    ])
  })

  it('listIncludedBeatVideos keeps completed included beat videos', () => {
    const segments = [
      { segmentId: 'video', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/a.mp4', assetType: 'video' },
      { segmentId: 'still', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/a.png', assetType: 'image' },
      { segmentId: 'excluded', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/b.mp4', assetType: 'video', mixerBeatIncluded: false },
      { segmentId: 'upload', status: 'COMPLETE', activeAssetUrl: 'https://cdn.example/c.webm' },
    ] as Parameters<typeof listIncludedBeatVideos>[0]
    expect(listIncludedBeatVideos(segments).map((segment) => segment.segmentId)).toEqual([
      'video',
      'upload',
    ])
  })

  it('lists a direction-included beat that only has an uploaded take', () => {
    const scene = {
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'One' },
        { beatId: 'bt_6', sequenceIndex: 5, kind: 'action', actionDescription: 'Six', excluded: false },
        { beatId: 'bt_hidden', sequenceIndex: 6, kind: 'action', actionDescription: 'Hidden', excluded: true },
      ],
    }
    const segments = [
      {
        segmentId: 'seg_1',
        beatId: 'bt_1',
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/one.mp4',
      },
      {
        segmentId: 'seg_6',
        beatId: 'bt_6',
        status: 'DRAFT',
        assetType: null,
        activeAssetUrl: null,
        takes: [{ assetUrl: 'https://cdn.example/upload.mp4', status: 'COMPLETE' }],
      },
      {
        segmentId: 'seg_hidden',
        beatId: 'bt_hidden',
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/hidden.mp4',
      },
    ] as Parameters<typeof listMixerBeatRows>[1]
    const rows = listMixerBeatRows(scene, segments)
    expect(rows.map((row) => row.beatId)).toEqual(['bt_1', 'bt_6'])
    expect(listIncludedBeatVideos(rows.map((row) => row.segment).filter(Boolean) as NonNullable<(typeof rows)[number]['segment']>[]).map((segment) => segment.segmentId)).toEqual([
      'seg_1',
      'seg_6',
    ])
  })

  it('restores a stale mixer exclusion when the beat is included', () => {
    const segments = [
      { segmentId: 'kept', beatId: 'bt_1', mixerBeatIncluded: false },
      { segmentId: 'still-out', beatId: 'bt_2', mixerBeatIncluded: false },
    ]
    const restored = restoreIncludedMixerBeats(segments, ['bt_1'])
    expect(restored.changed).toBe(true)
    expect(restored.segments[0].mixerBeatIncluded).toBe(true)
    expect(restored.segments[1].mixerBeatIncluded).toBe(false)
    expect(filterMixerIncludedSegments(restored.segments).map((segment) => segment.segmentId)).toEqual([
      'kept',
    ])
  })

  it('picks only one designated clip per beat and resolves its selected take URL', () => {
    const scene = {
      beats: [
        { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', actionDescription: 'Shot 1' },
        { beatId: 'bt_2', sequenceIndex: 1, kind: 'action', actionDescription: 'Shot 2' },
      ],
    }
    const segments = [
      {
        segmentId: 'seg_1_old',
        beatId: 'bt_1',
        sequenceIndex: 0,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/shot1-v1.mp4',
      },
      {
        segmentId: 'seg_1_selected',
        beatId: 'bt_1',
        sequenceIndex: 1,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/shot1-stale.mp4',
        currentTakeId: 'take_2',
        takes: [
          { id: 'take_1', assetUrl: 'https://cdn.example/shot1-v1.mp4', status: 'COMPLETE' },
          { id: 'take_2', assetUrl: 'https://cdn.example/shot1-v2-designated.mp4', status: 'COMPLETE' },
        ],
      },
      {
        segmentId: 'seg_2',
        beatId: 'bt_2',
        sequenceIndex: 2,
        status: 'COMPLETE',
        assetType: 'video',
        activeAssetUrl: 'https://cdn.example/shot2.mp4',
      },
    ] as Parameters<typeof listIncludedBeatVideos>[0]

    const included = listIncludedBeatVideos(segments, scene)
    expect(included).toHaveLength(2)
    expect(included[0]?.segmentId).toBe('seg_1_selected')
    expect(included[0]?.activeAssetUrl).toBe('https://cdn.example/shot1-v2-designated.mp4')
    expect(included[1]?.segmentId).toBe('seg_2')
  })

  it('resolves the designated still version when storyboardImageVersions exist', () => {
    expect(
      resolveDesignatedStillUrl('https://cdn.example/v1.png', 'v2', [
        { id: 'v1', url: 'https://cdn.example/v1.png' },
        { id: 'v2', url: 'https://cdn.example/v2-selected.png' },
      ])
    ).toBe('https://cdn.example/v2-selected.png')

    const scene = {
      imageUrl: 'https://cdn.example/scene.png',
      beats: [
        {
          beatId: 'bt_1',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Hero enters',
          storyboardImageUrl: 'https://cdn.example/v1.png',
          storyboardImageVersionId: 'v2',
          storyboardImageVersions: [
            { id: 'v1', url: 'https://cdn.example/v1.png' },
            { id: 'v2', url: 'https://cdn.example/v2-designated.png' },
          ],
        },
      ],
    }
    const slots = enumerateStoryboardFrameSlots(scene)
    expect(slots[0]?.displayImageUrl).toBe('https://cdn.example/v2-designated.png')
  })

  it('configures SceneStrip for full horizontal scroll, consistent scene selector, and ChapterStrip', () => {
    const playerSource = readFileSync(
      join(process.cwd(), 'src/components/vision/AudioGalleryPlayer.tsx'),
      'utf8'
    )
    expect(playerSource).toContain("flex w-full gap-2 overflow-x-auto justify-start")
    expect(playerSource).toContain('aria-label="Chapter selector"')
    expect(playerSource).toContain('<ChapterStrip')
    expect(playerSource).toContain('getScreeningChapterGroups')
  })
})
