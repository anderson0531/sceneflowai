import { describe, expect, it } from 'vitest'
import {
  MEDIA_VERSION_CAP,
  appendMediaVersion,
  assignStillUrl,
  BEAT_START_STILL_SLOT,
  mediaBlobUrlTimestamp,
  mergeStillSlot,
  pickCurrentMediaUrl,
  resolveCurrentMedia,
  unionMediaVersions,
  unionRowsById,
  versionFromUrl,
} from '@/lib/storyboard/mediaVersions'

const OLD_URL = 'https://x.public.blob.vercel-storage.com/images/frames/p/old/1779500000000.jpeg'
const NEW_URL = 'https://x.public.blob.vercel-storage.com/images/frames/p/new/1779527367355-AbCdEf.jpeg'

describe('mediaBlobUrlTimestamp', () => {
  it('parses unsuffixed and suffixed Vercel blob paths', () => {
    expect(mediaBlobUrlTimestamp(OLD_URL)).toBe(1779500000000)
    expect(mediaBlobUrlTimestamp(NEW_URL)).toBe(1779527367355)
    expect(
      mediaBlobUrlTimestamp(
        'https://x.public.blob.vercel-storage.com/images/scenes/scene-1779600000000-xyz.png'
      )
    ).toBe(1779600000000)
  })
})

describe('appendMediaVersion / unionMediaVersions', () => {
  it('skips duplicate URLs and caps history at 10', () => {
    const first = versionFromUrl(OLD_URL, { source: 'generate', createdAt: '2026-01-01T00:00:00.000Z' })!
    let list = appendMediaVersion([], first)
    list = appendMediaVersion(list, first)
    expect(list).toHaveLength(1)

    for (let i = 0; i < 12; i++) {
      list = appendMediaVersion(
        list,
        versionFromUrl(`https://blob.example/${i}.png`, {
          createdAt: new Date(Date.UTC(2026, 0, i + 2)).toISOString(),
        })!
      )
    }
    expect(list.length).toBe(MEDIA_VERSION_CAP)
  })

  it('unions both URLs when the DB path timestamp is larger', () => {
    const db = [versionFromUrl(NEW_URL, { createdAt: '2026-04-01T00:00:00.000Z' })!]
    const client = [versionFromUrl(OLD_URL, { createdAt: '2026-05-01T00:00:00.000Z' })!]
    const unioned = unionMediaVersions(db, client)
    expect(unioned.map((v) => v.url).sort()).toEqual([NEW_URL, OLD_URL].sort())
  })
})

describe('pickCurrentMediaUrl', () => {
  it('keeps incoming when ISO stamps are missing even if blob digits are smaller', () => {
    expect(pickCurrentMediaUrl(OLD_URL, NEW_URL)).toBe(OLD_URL)
  })

  it('rejects incoming that is provably older by createdAt', () => {
    const incomingVersions = [
      versionFromUrl(OLD_URL, { createdAt: '2026-01-01T00:00:00.000Z' })!,
    ]
    const canonicalVersions = [
      versionFromUrl(NEW_URL, { createdAt: '2026-06-01T00:00:00.000Z' })!,
    ]
    expect(pickCurrentMediaUrl(OLD_URL, NEW_URL, incomingVersions, canonicalVersions)).toBe(NEW_URL)
  })

  it('ignores deferred incoming', () => {
    expect(pickCurrentMediaUrl('deferred', NEW_URL)).toBe(NEW_URL)
  })
})

describe('assignStillUrl / mergeStillSlot', () => {
  it('appends a version and points current at the new still', () => {
    const beat = assignStillUrl({ beatId: 'bt_1' }, BEAT_START_STILL_SLOT, NEW_URL, {
      source: 'generate',
      createdAt: '2026-06-01T00:00:00.000Z',
    })
    expect(beat.storyboardImageUrl).toBe(NEW_URL)
    expect((beat.storyboardImageVersions as { url: string }[]).map((v) => v.url)).toEqual([NEW_URL])
    expect(typeof beat.storyboardImageVersionId).toBe('string')
  })

  it('restore switches current without dropping history', () => {
    let beat = assignStillUrl({}, BEAT_START_STILL_SLOT, OLD_URL, {
      source: 'generate',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    beat = assignStillUrl(beat, BEAT_START_STILL_SLOT, NEW_URL, {
      source: 'generate',
      createdAt: '2026-06-01T00:00:00.000Z',
    })
    const oldId = (beat.storyboardImageVersions as { id: string; url: string }[]).find(
      (v) => v.url === OLD_URL
    )!.id
    const restored = assignStillUrl(beat, BEAT_START_STILL_SLOT, OLD_URL, { restoreVersionId: oldId })
    expect(restored.storyboardImageUrl).toBe(OLD_URL)
    expect(restored.storyboardImageVersionId).toBe(oldId)
    expect((restored.storyboardImageVersions as unknown[]).length).toBe(2)
  })

  it('unions versions and keeps the newer current on merge', () => {
    const canonical = assignStillUrl({}, BEAT_START_STILL_SLOT, OLD_URL, {
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const incoming = assignStillUrl({}, BEAT_START_STILL_SLOT, NEW_URL, {
      createdAt: '2026-06-01T00:00:00.000Z',
    })
    const merged: Record<string, unknown> = { ...incoming }
    mergeStillSlot(merged, incoming, canonical, BEAT_START_STILL_SLOT)
    expect(merged.storyboardImageUrl).toBe(NEW_URL)
    expect((merged.storyboardImageVersions as { url: string }[]).map((v) => v.url).sort()).toEqual(
      [NEW_URL, OLD_URL].sort()
    )
  })

  it('unions versions and keeps incoming current when blob digits would have dropped it', () => {
    const canonical = { storyboardImageUrl: NEW_URL }
    const incoming = { storyboardImageUrl: OLD_URL }
    const merged: Record<string, unknown> = { ...incoming }
    mergeStillSlot(merged, incoming, canonical, BEAT_START_STILL_SLOT)
    expect(merged.storyboardImageUrl).toBe(OLD_URL)
    expect((merged.storyboardImageVersions as { url: string }[]).map((v) => v.url).sort()).toEqual(
      [NEW_URL, OLD_URL].sort()
    )
  })
})

describe('resolveCurrentMedia', () => {
  it('returns the preferred URL when it exists', () => {
    const list = unionMediaVersions(
      [versionFromUrl(OLD_URL, { createdAt: '2026-01-01T00:00:00.000Z' })!],
      [versionFromUrl(NEW_URL, { createdAt: '2026-06-01T00:00:00.000Z' })!]
    )
    expect(resolveCurrentMedia(list, OLD_URL)?.url).toBe(OLD_URL)
    expect(resolveCurrentMedia(list)?.url).toBe(NEW_URL)
  })
})

describe('unionRowsById', () => {
  it('keeps takes from both sides', () => {
    const merged = unionRowsById(
      [{ id: 't2', assetUrl: 'b' }],
      [{ id: 't1', assetUrl: 'a' }],
      'id'
    )
    expect(merged.map((row) => row.id)).toEqual(['t1', 't2'])
  })

  it('does not wipe history when incoming takes are empty', () => {
    expect(unionRowsById([], [{ id: 't1' }], 'id')).toEqual([{ id: 't1' }])
  })
})
