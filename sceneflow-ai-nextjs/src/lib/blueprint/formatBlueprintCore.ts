function str(value: unknown): string {
  if (typeof value !== 'string') return value != null ? String(value).trim() : ''
  return value.trim()
}

export type BlueprintCoreFields = {
  title: string
  logline: string
  genre: string
  formatLength: string
  targetAudience: string
  authorWriter: string
  date: string
}

export function getBlueprintCoreFields(variant: Record<string, unknown>): BlueprintCoreFields {
  return {
    title: str(variant.title),
    logline: str(variant.logline),
    genre: str(variant.genre),
    formatLength: str(variant.format_length),
    targetAudience: str(variant.target_audience),
    authorWriter: str(variant.author_writer),
    date: str(variant.date),
  }
}

/** Humanize runtime strings like "600 seconds" for display chips. */
export function formatBlueprintRuntime(raw: string): { display: string; raw: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { display: '', raw: '' }

  const secondsMatch = trimmed.match(/^(\d+)\s*seconds?$/i)
  if (secondsMatch) {
    const totalSeconds = Number.parseInt(secondsMatch[1], 10)
    if (Number.isFinite(totalSeconds) && totalSeconds > 0) {
      if (totalSeconds >= 3600) {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        const display =
          minutes > 0 || seconds > 0
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${hours} hr`
        return { display, raw: trimmed }
      }

      if (totalSeconds >= 60) {
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        const display =
          seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min`
        return { display, raw: trimmed }
      }

      return { display: `${totalSeconds} sec`, raw: trimmed }
    }
  }

  return { display: trimmed, raw: trimmed }
}
