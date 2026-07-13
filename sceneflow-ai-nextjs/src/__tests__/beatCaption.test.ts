import { describe, it, expect } from 'vitest'
import { getBeatOverlayFields } from '@/lib/storyboard/beatCaption'
import {
  defaultBeatOverlayType,
  resolveBeatCaptionText,
  isBeatCaptionManuallyEdited,
} from '@/lib/storyboard/playerTranslations'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('beat caption helpers', () => {
  it('getBeatOverlayFields returns empty when no overlay text', () => {
    const beat = { beatId: 'bt_1', sequenceIndex: 0, kind: 'action' as const }
    expect(getBeatOverlayFields(beat)).toEqual({})
  })

  it('getBeatOverlayFields defaults overlay type from beatRole', () => {
    const beat: SceneBeat = {
      beatId: 'bt_1',
      sequenceIndex: 0,
      kind: 'action',
      beatRole: 'title_reveal',
      overlayText: 'Chapter One',
    }
    expect(getBeatOverlayFields(beat)).toEqual({
      overlayText: 'Chapter One',
      overlayType: 'title',
    })
  })

  it('defaultBeatOverlayType maps roles', () => {
    expect(defaultBeatOverlayType('title_reveal')).toBe('title')
    expect(defaultBeatOverlayType('credit')).toBe('lower_third')
    expect(defaultBeatOverlayType()).toBe('signage')
  })

  it('resolveBeatCaptionText prefers translated stream', () => {
    const sceneTranslation = {
      beatsByBeatId: {
        bt_1: { overlayText: 'บทที่หนึ่ง' },
      },
    }
    expect(resolveBeatCaptionText(sceneTranslation, 'bt_1', 'Chapter One')).toBe('บทที่หนึ่ง')
    expect(resolveBeatCaptionText(sceneTranslation, 'bt_2', 'Chapter One')).toBe('Chapter One')
  })

  it('isBeatCaptionManuallyEdited reads overlayEdited flag', () => {
    const sceneTranslation = {
      beatsByBeatId: {
        bt_1: { overlayText: 'Hola', overlayEdited: true },
      },
    }
    expect(isBeatCaptionManuallyEdited(sceneTranslation, 'bt_1')).toBe(true)
    expect(isBeatCaptionManuallyEdited(sceneTranslation, 'bt_2')).toBe(false)
  })
})
