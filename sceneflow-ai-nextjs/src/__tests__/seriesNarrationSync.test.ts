import { describe, expect, it } from 'vitest'
import {
  isSavedNarrationCurrent,
  readOverviewNarration,
  seriesEpisodeNarrationText,
  seriesOverviewNarrationText,
  withSavedSeriesNarration,
  type SavedSeriesNarration,
} from '@/lib/series/seriesNarrationSync'

const VOICE = 'gemini-Algenib'
const PROFILE = 'Warm, intelligent documentary storyteller.'

function saved(overrides: Partial<SavedSeriesNarration> = {}): SavedSeriesNarration {
  return {
    audioUrl: 'https://blob.example/overview.mp3',
    text: seriesOverviewNarrationText({
      logline: 'A pilot logline',
      productionBible: { logline: 'A pilot logline', synopsis: 'The synopsis.' },
    }),
    voiceId: VOICE,
    prompt: PROFILE,
    generatedAt: '2026-10-14T00:00:00.000Z',
    ...overrides,
  }
}

describe('series narration text', () => {
  it('speaks the bible logline and synopsis', () => {
    expect(
      seriesOverviewNarrationText({
        logline: 'Series logline',
        productionBible: { logline: 'Bible logline', synopsis: 'Bible synopsis' },
      })
    ).toBe('Bible logline\n\nBible synopsis')
  })

  it('falls back to the series logline when the bible logline is empty', () => {
    expect(
      seriesOverviewNarrationText({
        logline: 'Series logline',
        productionBible: { logline: '', synopsis: 'Bible synopsis' },
      })
    ).toBe('Series logline\n\nBible synopsis')
  })

  it('speaks an episode logline and synopsis', () => {
    expect(seriesEpisodeNarrationText({ logline: 'Cold open', synopsis: 'They leave.' })).toBe(
      'Cold open\n\nThey leave.'
    )
  })
})

describe('isSavedNarrationCurrent', () => {
  const current = {
    text: saved().text,
    voiceId: VOICE,
    prompt: PROFILE,
  }

  it('is current when text, voice, and profile match', () => {
    expect(isSavedNarrationCurrent(saved(), current)).toBe(true)
  })

  it('is not current when the logline changed', () => {
    const text = seriesOverviewNarrationText({
      productionBible: { logline: 'A different logline', synopsis: 'The synopsis.' },
    })
    expect(isSavedNarrationCurrent(saved(), { ...current, text })).toBe(false)
  })

  it('is not current when the synopsis changed', () => {
    const text = seriesOverviewNarrationText({
      productionBible: { logline: 'A pilot logline', synopsis: 'A new synopsis.' },
    })
    expect(isSavedNarrationCurrent(saved(), { ...current, text })).toBe(false)
  })

  it('is not current when the voice changed', () => {
    expect(isSavedNarrationCurrent(saved(), { ...current, voiceId: 'gemini-Kore' })).toBe(false)
  })

  it('is not current when the narrator profile changed', () => {
    expect(isSavedNarrationCurrent(saved(), { ...current, prompt: 'A colder read.' })).toBe(false)
  })

  it('is not current when the saved url is missing', () => {
    expect(isSavedNarrationCurrent(saved({ audioUrl: '' }), current)).toBe(false)
    expect(isSavedNarrationCurrent(null, current)).toBe(false)
    expect(readOverviewNarration({ overviewNarration: { text: 'x', voiceId: VOICE } })).toBeNull()
  })

  it('ignores the profile for voices that do not use it', () => {
    const clip = saved({ voiceId: 'voice_custom', prompt: undefined })
    expect(
      isSavedNarrationCurrent(clip, {
        text: clip.text,
        voiceId: 'voice_custom',
        prompt: 'This profile is not sent.',
      })
    ).toBe(true)
  })
})

describe('withSavedSeriesNarration', () => {
  it('keeps other metadata and sibling episode clips', () => {
    const overview = saved()
    const episodeA = saved({ audioUrl: 'https://blob.example/ep-a.mp3', text: 'Episode A' })
    const episodeB = saved({ audioUrl: 'https://blob.example/ep-b.mp3', text: 'Episode B' })
    const next = withSavedSeriesNarration(
      withSavedSeriesNarration(
        { ideaTopic: 'kept', episodeNarrations: { a: episodeA } },
        { section: 'overview', narration: overview }
      ),
      { section: 'episode', episodeId: 'b', narration: episodeB }
    )
    expect(next.ideaTopic).toBe('kept')
    expect(next.overviewNarration).toEqual(overview)
    expect(next.episodeNarrations).toEqual({ a: episodeA, b: episodeB })
  })
})
