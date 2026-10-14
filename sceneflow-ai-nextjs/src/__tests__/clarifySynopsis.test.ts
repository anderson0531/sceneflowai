import { describe, it, expect } from 'vitest'
import {
  MAX_SYNOPSIS_TURNS,
  buildClarifySynopsisPrompt,
  fallbackSynopsisText,
  parseClarifySynopsisResult,
  sanitizeSynopsisMessages,
  type SynopsisMessage,
} from '@/lib/series/clarifySynopsis'
import { readSeriesIdeationSeed, resolveSeriesArtStyle, resolveSeriesStudioEntry } from '@/lib/series/seriesIdeation'
import { NEW_SERIES_EPISODE_COUNT } from '@/config/series/productionFormats'

const BEEKEEPERS = 'Follow three urban beekeepers through one honey season in Chicago.'

describe('buildClarifySynopsisPrompt', () => {
  it('includes the creator’s words, format, audience, and episode count', () => {
    const prompt = buildClarifySynopsisPrompt({
      productionFormat: 'documentary',
      episodeCount: 5,
      targetAudience: 'city planners',
      messages: [{ role: 'user', content: BEEKEEPERS }],
    })

    expect(prompt).toContain(BEEKEEPERS)
    expect(prompt).toContain('PRODUCTION TYPE: Documentary')
    expect(prompt).toContain('city planners')
    expect(prompt).toContain('5 episodes')
  })

  it('tells non-fiction formats not to invent a fictional plot', () => {
    const documentary = buildClarifySynopsisPrompt({
      productionFormat: 'documentary',
      episodeCount: 5,
      messages: [{ role: 'user', content: BEEKEEPERS }],
    })
    const narrative = buildClarifySynopsisPrompt({
      productionFormat: 'narrative',
      episodeCount: 5,
      messages: [{ role: 'user', content: 'A family drama in a coastal town.' }],
    })
    const drama = buildClarifySynopsisPrompt({
      productionFormat: 'cinematic_drama',
      episodeCount: 5,
      messages: [{ role: 'user', content: 'A family drama in a coastal town.' }],
    })
    const audioDrama = buildClarifySynopsisPrompt({
      productionFormat: 'audio_drama',
      episodeCount: 5,
      messages: [{ role: 'user', content: 'Two operators overhear a city changing.' }],
    })
    const news = buildClarifySynopsisPrompt({
      productionFormat: 'news',
      episodeCount: 5,
      messages: [{ role: 'user', content: 'A nightly briefing on a water crisis.' }],
    })

    expect(documentary).toContain('Do NOT invent a fictional plot')
    expect(documentary).toContain('stated subject')
    expect(news).toContain('Do NOT invent a fictional plot')
    expect(narrative).not.toContain('Do NOT invent a fictional plot')
    expect(drama).not.toContain('Do NOT invent a fictional plot')
    expect(drama).toContain('PRODUCTION TYPE: Cinematic Drama')
    expect(audioDrama).not.toContain('Do NOT invent a fictional plot')
    expect(audioDrama).toContain('audio drama')
  })

  it('keeps only the latest turns in the prompt', () => {
    const messages: SynopsisMessage[] = Array.from({ length: MAX_SYNOPSIS_TURNS + 3 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `turn_${String(index).padStart(2, '0')}`,
    }))
    const prompt = buildClarifySynopsisPrompt({
      productionFormat: 'narrative',
      episodeCount: 5,
      messages,
    })

    expect(prompt).not.toContain('turn_00')
    expect(prompt).not.toContain('turn_01')
    expect(prompt).not.toContain('turn_02')
    expect(prompt).toContain(`turn_${String(MAX_SYNOPSIS_TURNS + 2).padStart(2, '0')}`)
    expect(prompt).toContain(`turn_${String(messages.length - MAX_SYNOPSIS_TURNS).padStart(2, '0')}`)
  })

  it('locks the chosen art style into the series brief', () => {
    const prompt = buildClarifySynopsisPrompt({
      productionFormat: 'narrative',
      episodeCount: 5,
      artStyle: 'ghibli',
      messages: [{ role: 'user', content: 'A family keeps a lighthouse.' }],
    })

    expect(prompt).toContain('LOCKED ART STYLE — Ghibli-esque')
    expect(prompt).toContain('watercolor aesthetic')
    expect(prompt).toContain('EPISODE COUNT: 5')
  })

  it('writes a single-production brief when the surface is a project', () => {
    const prompt = buildClarifySynopsisPrompt({
      productionFormat: 'demo',
      episodeCount: 5,
      surface: 'project',
      scope: 'Short (5-30 min)',
      artStyle: 'anime-90s',
      messages: [{ role: 'user', content: 'Show how the field kit packs in under a minute.' }],
    })

    expect(prompt).toContain('single production')
    expect(prompt).toContain('SCOPE: Short (5-30 min)')
    expect(prompt).toContain('anime style')
    expect(prompt).not.toContain('EPISODE COUNT')
    expect(prompt).toContain('Do NOT invent a fictional plot')
  })
})

describe('parseClarifySynopsisResult', () => {
  it('reads the proposal, reply, and inferred genre and tone', () => {
    const result = parseClarifySynopsisResult(
      {
        assistantMessage: 'Does the house stay the setting for every episode?',
        synopsis: 'Five friends open a haunted-house business and learn the building is occupied.',
        readyToLock: false,
        genre: 'comedy',
        tone: 'lighthearted',
      },
      'raw idea'
    )

    expect(result.assistantMessage).toContain('house')
    expect(result.synopsis).toContain('haunted-house')
    expect(result.readyToLock).toBe(false)
    expect(result.genre).toBe('comedy')
    expect(result.tone).toBe('lighthearted')
  })

  it('falls back when the model JSON is unusable', () => {
    const result = parseClarifySynopsisResult(null, 'my original idea')
    expect(result.synopsis).toBe('my original idea')
    expect(result.readyToLock).toBe(false)
    expect(result.assistantMessage.length).toBeGreaterThan(0)
    expect(result.genre).toBeUndefined()
    expect(result.tone).toBeUndefined()
  })

  it('drops empty or non-string genre and tone', () => {
    const result = parseClarifySynopsisResult(
      { synopsis: 'A sales series about a field kit.', genre: '  ', tone: 4, readyToLock: 'yes' },
      'fallback'
    )
    expect(result.synopsis).toContain('field kit')
    expect(result.genre).toBeUndefined()
    expect(result.tone).toBeUndefined()
    expect(result.readyToLock).toBe(false)
  })
})

describe('sanitizeSynopsisMessages', () => {
  it('drops empty and unknown roles and caps history', () => {
    const raw = [
      { role: 'system', content: 'ignore' },
      { role: 'user', content: '   ' },
      ...Array.from({ length: MAX_SYNOPSIS_TURNS + 2 }, (_, index) => ({
        role: 'user',
        content: `idea-${index}`,
      })),
    ]
    const messages = sanitizeSynopsisMessages(raw)
    expect(messages).toHaveLength(MAX_SYNOPSIS_TURNS)
    expect(messages[0].content).toBe('idea-2')
    expect(messages.some((message) => message.content === 'ignore')).toBe(false)
  })
})

describe('readSeriesIdeationSeed', () => {
  it('keeps a stored episode count and opens a locked synopsis as confirmed', () => {
    const seed = readSeriesIdeationSeed({
      maxEpisodes: 40,
      targetAudience: 'city planners',
      metadata: {
        ideaTopic: 'A documentary about harbor pilots.',
        format: 'documentary',
        episodeCount: 8,
        synopsisLocked: true,
        genre: 'documentary',
        tone: 'any',
      },
    })

    expect(seed.format).toBe('documentary')
    expect(seed.episodeCount).toBe(8)
    expect(seed.locked?.synopsis).toContain('harbor pilots')
    expect(seed.locked?.genre).toBe('documentary')
    expect(seed.locked?.tone).toBeUndefined()
    expect(seed.draft).toBe('')
    expect(seed.audience.description).toContain('city planners')
  })

  it('falls back to five episodes and leaves an unlocked idea in the draft', () => {
    const seed = readSeriesIdeationSeed({
      metadata: { ideaTopic: 'A weekly show about street food.' },
    })
    expect(seed.episodeCount).toBe(NEW_SERIES_EPISODE_COUNT)
    expect(seed.locked).toBeNull()
    expect(seed.draft).toContain('street food')
    expect(seed.format).toBe('narrative')
    expect(seed.artStyle).toBe('photorealistic')
  })

  it('reads a stored art style preset', () => {
    const seed = readSeriesIdeationSeed({
      metadata: { artStyle: 'ghibli', ideaTopic: 'A weekly show about street food.' },
    })
    expect(seed.artStyle).toBe('ghibli')
  })
})

describe('resolveSeriesArtStyle', () => {
  it('prefers an explicit preset, then metadata, then the vision phase', () => {
    expect(resolveSeriesArtStyle({ artStyle: 'pixar', metadata: { artStyle: 'ghibli' } })).toBe('pixar')
    expect(resolveSeriesArtStyle({ metadata: { artStyle: 'comic-book' } })).toBe('comic-book')
    expect(
      resolveSeriesArtStyle({
        metadata: { visionPhase: { artStyle: 'anime-90s' } },
      })
    ).toBe('anime-90s')
    expect(resolveSeriesArtStyle({})).toBe('photorealistic')
  })
})

describe('resolveSeriesStudioEntry', () => {
  it('generates from the create flag before the empty dialog can open', () => {
    expect(
      resolveSeriesStudioEntry({
        hasContent: false,
        ideaTopic: 'Five friends open a haunted house.',
        pendingAutoGenerate: true,
        searchAutoGenerate: false,
      })
    ).toBe('generate')
  })

  it('uses the query as a backup and waits until the synopsis is present', () => {
    expect(
      resolveSeriesStudioEntry({
        hasContent: false,
        ideaTopic: '',
        pendingAutoGenerate: false,
        searchAutoGenerate: true,
      })
    ).toBe('wait')
    expect(
      resolveSeriesStudioEntry({
        hasContent: false,
        ideaTopic: 'A documentary about harbor pilots.',
        searchAutoGenerate: true,
      })
    ).toBe('generate')
  })

  it('opens ideation only for an empty series that was not just created', () => {
    expect(
      resolveSeriesStudioEntry({
        hasContent: false,
        ideaTopic: 'A weekly show about street food.',
      })
    ).toBe('ideate')
    expect(
      resolveSeriesStudioEntry({
        hasContent: true,
        ideaTopic: 'Already generated.',
        pendingAutoGenerate: true,
      })
    ).toBe('ready')
  })
})

describe('fallbackSynopsisText', () => {
  it('prefers the current proposal, then the latest creator note', () => {
    expect(
      fallbackSynopsisText({
        currentSynopsis: 'locked draft',
        messages: [{ role: 'user', content: 'older idea' }],
      })
    ).toBe('locked draft')
    expect(
      fallbackSynopsisText({
        messages: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'question' },
          { role: 'user', content: 'second' },
        ],
      })
    ).toBe('second')
  })
})
