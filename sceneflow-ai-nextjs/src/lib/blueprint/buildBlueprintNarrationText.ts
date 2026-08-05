export type BlueprintNarrationMode = 'synopsis' | 'full' | 'beats'

/** Build speakable blueprint text for TTS previews. */
export function buildBlueprintNarrationText(
  variant: Record<string, unknown> | null | undefined,
  mode: BlueprintNarrationMode
): string {
  if (!variant) return ''

  if (mode === 'beats' && Array.isArray(variant.beats) && variant.beats.length > 0) {
    return (variant.beats as Array<{ title?: string; synopsis?: string; intent?: string }>)
      .map((beat, index) => {
        const title = beat.title || 'Beat'
        const body = beat.synopsis || beat.intent || ''
        return `${index + 1}. ${title} — ${body}`
      })
      .join('\n')
  }

  const baseSynopsis = String(variant.synopsis || variant.content || '')
  const logline = variant.logline ? `${variant.logline}. ` : ''

  if (mode === 'synopsis') {
    return `${logline}${baseSynopsis}`.trim()
  }

  const themes = Array.isArray(variant.themes)
    ? ` Themes: ${(variant.themes as string[]).join(', ')}`
    : ''
  const title = variant.title ? `${variant.title}.` : ''

  return [title, logline, baseSynopsis, themes].join(' ').trim()
}
