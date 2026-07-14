import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getBeatOverlayFields } from '@/lib/storyboard/beatCaption'
import {
  defaultBeatOverlayType,
  resolveBeatCaptionText,
  isBeatCaptionManuallyEdited,
} from '@/lib/storyboard/playerTranslations'
import {
  purgeBeatCaptionTranslations,
  collectCaptionTargetLanguages,
  backfillBeatCaptionsForLanguage,
} from '@/lib/storyboard/beatCaptionTranslations'
import type { SceneBeat } from '@/lib/script/segmentTypes'
import type { ProjectStream } from '@/lib/streams/projectStreams'

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

  it('resolveBeatCaptionText hides stale auto-translation when English is empty', () => {
    const sceneTranslation = {
      beatsByBeatId: {
        bt_1: { overlayText: 'บทที่หนึ่ง', overlayEdited: false },
      },
    }
    expect(resolveBeatCaptionText(sceneTranslation, 'bt_1', '')).toBeUndefined()
    expect(resolveBeatCaptionText(sceneTranslation, 'bt_1', undefined)).toBeUndefined()
  })

  it('resolveBeatCaptionText keeps manually edited translation when English is empty', () => {
    const sceneTranslation = {
      beatsByBeatId: {
        bt_1: { overlayText: 'Título manual', overlayEdited: true },
      },
    }
    expect(resolveBeatCaptionText(sceneTranslation, 'bt_1', '')).toBe('Título manual')
  })

  it('purgeBeatCaptionTranslations removes beat from all language maps', async () => {
    const onSaveTranslations = vi.fn().mockResolvedValue(undefined)
    const storedTranslations = {
      th: {
        0: {
          beatsByBeatId: {
            bt_1: { overlayText: 'บทที่หนึ่ง' },
            bt_2: { overlayText: 'อื่นๆ' },
          },
        },
      },
      es: {
        0: {
          beatsByBeatId: {
            bt_1: { overlayText: 'Capítulo Uno' },
          },
        },
      },
    }

    await purgeBeatCaptionTranslations({
      beatId: 'bt_1',
      sceneIdx: 0,
      storedTranslations,
      onSaveTranslations,
    })

    expect(onSaveTranslations).toHaveBeenCalledTimes(2)
    expect(onSaveTranslations).toHaveBeenCalledWith('th', {
      0: { beatsByBeatId: { bt_2: { overlayText: 'อื่นๆ' } } },
    })
    expect(onSaveTranslations).toHaveBeenCalledWith('es', {
      0: { beatsByBeatId: undefined },
    })
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

  it('collectCaptionTargetLanguages includes stream languages without dialogueAudio', () => {
    const projectStreams: ProjectStream[] = [
      {
        id: 'stream-es',
        language: 'es',
        format: 'animatic',
        status: 'draft',
      },
    ]
    const scenes = [{ beats: [] }]
    expect(collectCaptionTargetLanguages(scenes, {}, projectStreams)).toEqual(['es'])
  })

  it('collectCaptionTargetLanguages unions stream, stored, and legacy audio keys', () => {
    const projectStreams: ProjectStream[] = [
      { id: 's1', language: 'es', format: 'animatic', status: 'draft' },
    ]
    const scenes = [
      {
        dialogueAudio: { th: { url: 'x' } },
        narrationAudio: { fr: { url: 'y' } },
      },
    ]
    const storedTranslations = { de: { 0: {} } }
    expect(collectCaptionTargetLanguages(scenes, storedTranslations, projectStreams)).toEqual([
      'de',
      'es',
      'fr',
      'th',
    ])
  })

  describe('backfillBeatCaptionsForLanguage', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ translatedText: 'Capítulo Uno' }),
      } as Response)
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it('translates beats with overlayText and skips manual overrides', async () => {
      const onSaveTranslations = vi.fn().mockResolvedValue(undefined)
      const scenes = [
        {
          beats: [
            { beatId: 'bt_1', sequenceIndex: 0, kind: 'action', overlayText: 'Chapter One' },
            { beatId: 'bt_2', sequenceIndex: 1, kind: 'action', overlayText: 'The End' },
          ],
        },
      ]
      const storedTranslations = {
        es: {
          0: {
            beatsByBeatId: {
              bt_2: { overlayText: 'Fin manual', overlayEdited: true },
            },
          },
        },
      }

      const count = await backfillBeatCaptionsForLanguage({
        language: 'es',
        scenes,
        storedTranslations,
        onSaveTranslations,
      })

      expect(count).toBe(1)
      expect(onSaveTranslations).toHaveBeenCalledTimes(1)
      expect(onSaveTranslations).toHaveBeenCalledWith('es', {
        0: {
          beatsByBeatId: {
            bt_1: { overlayText: 'Capítulo Uno', overlayEdited: false },
            bt_2: { overlayText: 'Fin manual', overlayEdited: true },
          },
        },
      })
    })

    it('returns zero for English and does not save', async () => {
      const onSaveTranslations = vi.fn()
      const count = await backfillBeatCaptionsForLanguage({
        language: 'en',
        scenes: [{ beats: [{ beatId: 'bt_1', sequenceIndex: 0, kind: 'action', overlayText: 'Hi' }] }],
        storedTranslations: {},
        onSaveTranslations,
      })
      expect(count).toBe(0)
      expect(onSaveTranslations).not.toHaveBeenCalled()
    })
  })
})
