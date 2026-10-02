import { describe, expect, it } from 'vitest'
import { KEY_FEATURE_ICON_KEYS } from '@/components/landing/keyFeatureIcons'
import {
  FEATURE_CHAPTER_MAP,
  FEATURE_DEMO_SECONDS,
  standaloneDemoKey,
} from '@/config/landing/keyFeatureChapterMap'

describe('key feature chapter map', () => {
  it('is an edit plan of 30-second demos, not a page graphic', () => {
    expect(FEATURE_DEMO_SECONDS).toBe(30)
    const source = FEATURE_CHAPTER_MAP
    expect(source.map((room) => room.roomId)).toEqual([
      'series-desk',
      'blueprint-board',
      'production-stage',
      'screening-room',
    ])
    expect(source.map((room) => room.filmSeconds)).toEqual([90, 75, 90, 60])
  })

  it('gives shared gestures one demo and leaves deploy inside the room film', () => {
    expect(standaloneDemoKey('reshapeSeries')).toBe('reshapeSeries')
    expect(standaloneDemoKey('directEpisode')).toBe('reshapeSeries')
    expect(standaloneDemoKey('blueprintDirector')).toBeNull()
    expect(standaloneDemoKey('sceneDirector')).toBe('sceneDirector')
    expect(standaloneDemoKey('scriptDirector')).toBe('sceneDirector')
    expect(standaloneDemoKey('byok')).toBe('byok')
    expect(standaloneDemoKey('budget')).toBe('byok')
    expect(standaloneDemoKey('referenceLibrary')).toBe('referenceLibrary')
    expect(standaloneDemoKey('preVis')).toBe('preVis')
    expect(standaloneDemoKey('mixer')).toBe('mixer')
    for (const icon of [
      'productionAgents',
      'directShot',
      'languageStreams',
      'deliveryResolution',
      'versionControl',
      'promoTrailer',
      'screeningPlayer',
      'screeningCollab',
      'packageShip',
    ]) {
      expect(standaloneDemoKey(icon)).toBeNull()
    }
  })

  it('mentions every feature icon exactly once', () => {
    const icons = FEATURE_CHAPTER_MAP.flatMap((room) =>
      room.beats.flatMap((beat) => [...beat.demoIcons])
    )
    expect(icons.sort()).toEqual([...KEY_FEATURE_ICON_KEYS].sort())
    expect(new Set(icons).size).toBe(icons.length)
  })
})
