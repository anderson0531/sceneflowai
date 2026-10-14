/**
 * Spoken series narration and whether a saved clip still matches it.
 * Client-safe: no Node or network imports.
 */

export interface SavedSeriesNarration {
  audioUrl: string
  text: string
  voiceId: string
  /** Narrator profile sent with prebuilt Gemini voices. Empty when unused. */
  prompt?: string
  generatedAt: string
}

export interface NarrationMatchInput {
  text: string
  voiceId: string
  prompt?: string
}

/** Logline, then synopsis — the same string the series Overview Listen button speaks. */
export function seriesOverviewNarrationText(input: {
  logline?: string | null
  productionBible?: { logline?: string | null; synopsis?: string | null } | null
}): string {
  const bible = input.productionBible
  return `${bible?.logline || input.logline || ''}\n\n${bible?.synopsis || ''}`.trim()
}

/** Episode logline, then synopsis. */
export function seriesEpisodeNarrationText(
  episode?: { logline?: string | null; synopsis?: string | null } | null
): string {
  return `${episode?.logline || ''}\n\n${episode?.synopsis || ''}`.trim()
}

/**
 * The profile is part of the performance only for prebuilt Gemini voices.
 * Designed `voice_` ids and other providers ignore it.
 */
export function activeNarrationPrompt(voiceId: string, prompt?: string | null): string {
  if (!voiceId.trim().startsWith('gemini-')) return ''
  return (prompt ?? '').trim()
}

export function isSavedNarrationCurrent(
  saved: SavedSeriesNarration | null | undefined,
  current: NarrationMatchInput
): boolean {
  if (!saved?.audioUrl?.trim() || typeof saved.text !== 'string' || !saved.voiceId?.trim()) {
    return false
  }
  return (
    saved.text === current.text &&
    saved.voiceId === current.voiceId &&
    (saved.prompt ?? '') === activeNarrationPrompt(current.voiceId, current.prompt)
  )
}

export function readSavedSeriesNarration(value: unknown): SavedSeriesNarration | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const audioUrl = typeof record.audioUrl === 'string' ? record.audioUrl.trim() : ''
  const text = typeof record.text === 'string' ? record.text : null
  const voiceId = typeof record.voiceId === 'string' ? record.voiceId.trim() : ''
  if (!audioUrl || text === null || !voiceId) return null
  const prompt = typeof record.prompt === 'string' ? record.prompt : undefined
  const generatedAt = typeof record.generatedAt === 'string' ? record.generatedAt : ''
  return {
    audioUrl,
    text,
    voiceId,
    ...(prompt !== undefined ? { prompt } : {}),
    generatedAt,
  }
}

export function readOverviewNarration(
  metadata: Record<string, any> | null | undefined
): SavedSeriesNarration | null {
  if (!metadata || typeof metadata !== 'object') return null
  return readSavedSeriesNarration(metadata.overviewNarration)
}

export function readEpisodeNarration(
  metadata: Record<string, any> | null | undefined,
  episodeId: string
): SavedSeriesNarration | null {
  if (!metadata || typeof metadata !== 'object') return null
  const map = metadata.episodeNarrations
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null
  return readSavedSeriesNarration((map as Record<string, unknown>)[episodeId])
}

export function withSavedSeriesNarration(
  metadata: Record<string, any> | null | undefined,
  update:
    | { section: 'overview'; narration: SavedSeriesNarration }
    | { section: 'episode'; episodeId: string; narration: SavedSeriesNarration }
): Record<string, any> {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {}
  if (update.section === 'overview') {
    return { ...base, overviewNarration: update.narration }
  }
  const existing = base.episodeNarrations
  const episodeNarrations =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {}
  episodeNarrations[update.episodeId] = update.narration
  return { ...base, episodeNarrations }
}
