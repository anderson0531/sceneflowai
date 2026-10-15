/**
 * Episode brief sent as the Blueprint generation input.
 * Continuity, consistency, and the reference library travel in the continuity
 * block, so this brief stays the episode story rather than a second copy.
 */

export function resolveSeriesTone(bible: {
  toneGuidelines?: string
  aesthetic?: { mood?: string }
} | null | undefined): string | undefined {
  const tone = bible?.toneGuidelines?.trim()
  if (tone) return tone
  const mood = bible?.aesthetic?.mood?.trim()
  return mood || undefined
}

export function buildEpisodeBlueprintBrief(
  episode: {
    episodeNumber?: number
    title?: string
    logline?: string
    synopsis?: string
    episodeHook?: string
    beats?: Array<{
      act?: number
      beatNumber?: number
      title?: string
      description?: string
    }>
  },
  bible: { synopsis?: string; logline?: string } | null | undefined,
  series: { title?: string; logline?: string } | null | undefined
): string {
  const lines: string[] = []
  lines.push(`Series: ${series?.title || 'Untitled series'}`)
  const seriesLogline = series?.logline?.trim() || bible?.logline?.trim()
  if (seriesLogline) lines.push(`Series logline: ${seriesLogline}`)
  const seriesSynopsis = bible?.synopsis?.trim()
  if (seriesSynopsis) {
    lines.push('')
    lines.push(`Series synopsis: ${seriesSynopsis}`)
  }
  lines.push('')
  lines.push(`Episode ${episode.episodeNumber ?? ''}: ${episode.title || 'Untitled'}`.trim())
  if (episode.logline?.trim()) {
    lines.push(`Logline: ${episode.logline.trim()}`)
  }
  if (episode.synopsis?.trim()) {
    lines.push('')
    lines.push(`Synopsis: ${episode.synopsis.trim()}`)
  }
  if (episode.episodeHook?.trim()) {
    lines.push('')
    lines.push(`Episode hook: ${episode.episodeHook.trim()}`)
  }
  if (episode.beats?.length) {
    lines.push('')
    lines.push('Story beats:')
    for (const beat of episode.beats) {
      const act = beat.act ? `Act ${beat.act}, ` : ''
      const number = beat.beatNumber ? `Beat ${beat.beatNumber}: ` : ''
      lines.push(`${act}${number}${beat.title || 'Beat'}`)
      if (beat.description?.trim()) lines.push(`  ${beat.description.trim()}`)
    }
  }
  return lines.join('\n').trim()
}
