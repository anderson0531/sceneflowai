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

  it('gives shared gestures one demo and leaves publish inside the room film', () => {
    expect(standaloneDemoKey('newSeries')).toBe('newSeries')
    expect(standaloneDemoKey('seriesReview')).toBe('seriesReview')
    expect(standaloneDemoKey('seriesResonance')).toBe('seriesResonance')
    expect(standaloneDemoKey('seriesDirector')).toBe('seriesDirector')
    expect(standaloneDemoKey('directEpisode')).toBe('seriesDirector')
    expect(standaloneDemoKey('startBlueprint')).toBe('startBlueprint')
    expect(standaloneDemoKey('treatment')).toBe('treatment')
    expect(standaloneDemoKey('castLocations')).toBe('castLocations')
    expect(standaloneDemoKey('blueprintDirector')).toBe('blueprintDirector')
    expect(standaloneDemoKey('blueprintResonance')).toBe('blueprintResonance')
    expect(standaloneDemoKey('goToProduction')).toBeNull()
    expect(standaloneDemoKey('stakeholderReview')).toBeNull()
    expect(standaloneDemoKey('byok')).toBe('byok')
    expect(standaloneDemoKey('budget')).toBe('byok')
    expect(standaloneDemoKey('productionScript')).toBe('productionScript')
    expect(standaloneDemoKey('scriptResonance')).toBe('scriptResonance')
    expect(standaloneDemoKey('castVisual')).toBe('castVisual')
    expect(standaloneDemoKey('directShot')).toBe('directShot')
    expect(standaloneDemoKey('sceneWorkflow')).toBe('directShot')
    expect(standaloneDemoKey('audioAgent')).toBe('audioAgent')
    expect(standaloneDemoKey('musicScore')).toBe('audioAgent')
    expect(standaloneDemoKey('continuity')).toBe('continuity')
    expect(standaloneDemoKey('stillsAgent')).toBe('stillsAgent')
    expect(standaloneDemoKey('stillsWorkbench')).toBe('stillsAgent')
    expect(standaloneDemoKey('animatic')).toBe('animatic')
    expect(standaloneDemoKey('videoAgent')).toBe('videoAgent')
    expect(standaloneDemoKey('clipsWorkbench')).toBe('videoAgent')
    expect(standaloneDemoKey('productionAgent')).toBe('videoAgent')
    expect(standaloneDemoKey('mixer')).toBe('mixer')
    expect(standaloneDemoKey('languageStreams')).toBe('languageStreams')
    for (const icon of [
      'startEpisode',
      'promoTrailers',
      'shipPackage',
      'screeningPlayer',
      'screeningCollab',
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
