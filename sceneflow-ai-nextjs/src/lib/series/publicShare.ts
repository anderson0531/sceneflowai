/**
 * Public Series Bible payload. Project ids, voice ids, and production notes stay off the link.
 */

export interface PublicSeriesBeat {
  beatNumber: number
  title: string
  description?: string
  act?: number
}

export interface PublicSeriesEpisode {
  episodeNumber: number
  title: string
  logline?: string
  synopsis?: string
  hook?: string
  beats: PublicSeriesBeat[]
}

export interface PublicSeriesCharacter {
  name: string
  role: string
  description?: string
}

export interface PublicSeriesShare {
  title: string
  logline?: string
  genre?: string
  synopsis?: string
  setting?: string
  protagonist?: { name: string; goal?: string }
  characters: PublicSeriesCharacter[]
  episodes: PublicSeriesEpisode[]
}

function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function buildPublicSeriesShare(input: {
  title?: string | null
  logline?: string | null
  genre?: string | null
  bible?: Record<string, unknown> | null
  episodes?: unknown[] | null
}): PublicSeriesShare {
  const bible = input.bible || {}
  const protagonistRaw =
    bible.protagonist && typeof bible.protagonist === 'object'
      ? (bible.protagonist as Record<string, unknown>)
      : null
  const protagonistName = text(protagonistRaw?.name)
  const protagonist = protagonistName
    ? { name: protagonistName, goal: text(protagonistRaw?.goal) }
    : undefined

  const characters = Array.isArray(bible.characters)
    ? bible.characters.flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return []
        const character = raw as Record<string, unknown>
        const name = text(character.name)
        if (!name) return []
        return [
          {
            name,
            role: text(character.role) || 'cast',
            description: text(character.description),
          },
        ]
      })
    : []

  const episodes = (input.episodes || []).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const episode = raw as Record<string, unknown>
    const episodeNumber =
      typeof episode.episodeNumber === 'number' && Number.isFinite(episode.episodeNumber)
        ? episode.episodeNumber
        : null
    const title = text(episode.title)
    if (episodeNumber == null || !title) return []
    const beats = Array.isArray(episode.beats)
      ? episode.beats.flatMap((beatRaw) => {
          if (!beatRaw || typeof beatRaw !== 'object') return []
          const beat = beatRaw as Record<string, unknown>
          const beatTitle = text(beat.title)
          if (!beatTitle) return []
          const beatNumber =
            typeof beat.beatNumber === 'number' && Number.isFinite(beat.beatNumber)
              ? beat.beatNumber
              : 0
          return [
            {
              beatNumber,
              title: beatTitle,
              description: text(beat.description),
              act: typeof beat.act === 'number' ? beat.act : undefined,
            },
          ]
        })
      : []
    return [
      {
        episodeNumber,
        title,
        logline: text(episode.logline),
        synopsis: text(episode.synopsis),
        hook: text(episode.episodeHook),
        beats,
      },
    ]
  })

  episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)

  return {
    title: text(input.title) || 'Series',
    logline: text(input.logline) || text(bible.logline),
    genre: text(input.genre),
    synopsis: text(bible.synopsis),
    setting: text(bible.setting),
    protagonist,
    characters,
    episodes,
  }
}

function joinSentences(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
}

/** Spoken copy for one share section. Callers cannot supply their own text. */
export function seriesShareNarrationText(
  share: PublicSeriesShare,
  section: 'overview' | 'episode',
  episodeNumber?: number
): string {
  if (section === 'overview') {
    return joinSentences([
      share.title,
      share.logline,
      share.synopsis,
      share.setting ? `Setting. ${share.setting}` : undefined,
      share.protagonist?.name
        ? `Protagonist. ${share.protagonist.name}${share.protagonist.goal ? `. ${share.protagonist.goal}` : ''}`
        : undefined,
    ])
  }

  const episode = share.episodes.find((item) => item.episodeNumber === episodeNumber)
  if (!episode) return ''
  const beats = episode.beats
    .map((beat) => joinSentences([beat.title, beat.description]))
    .filter(Boolean)
    .join(' ')
  return joinSentences([
    `Episode ${episode.episodeNumber}. ${episode.title}`,
    episode.logline,
    episode.synopsis,
    beats || undefined,
    episode.hook ? `Hook. ${episode.hook}` : undefined,
  ])
}
