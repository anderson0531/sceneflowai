import {
  formatLabel,
  resolveProductionFormat,
  type ProductionFormat,
} from '@/lib/content/contentIntent'

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

/**
 * Runtime summed from the beats themselves.
 *
 * Derived at render time rather than read from a stored field, so the number
 * shown can never disagree with the beat list printed beneath it.
 */
export function summariseBeatsRuntime(beats: unknown): {
  minutes: number
  count: number
  display: string
} {
  if (!Array.isArray(beats) || beats.length === 0) {
    return { minutes: 0, count: 0, display: '' }
  }

  const minutes = beats.reduce((sum: number, beat) => {
    const value = Number((beat as { minutes?: unknown } | null)?.minutes)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  if (minutes <= 0) return { minutes: 0, count: beats.length, display: '' }

  return {
    minutes,
    count: beats.length,
    display: formatBlueprintRuntime(`${Math.round(minutes * 60)} seconds`).display,
  }
}

/** Compact runtime for tab labels, e.g. "40 min" → "40m", "90 sec" → "90s". */
export function compactBlueprintRuntimeDisplay(display: string): string {
  const trimmed = display.trim()
  if (!trimmed) return ''

  const minOnly = trimmed.match(/^(\d+)\s*min$/i)
  if (minOnly) return `${minOnly[1]}m`

  const secOnly = trimmed.match(/^(\d+)\s*sec$/i)
  if (secOnly) return `${secOnly[1]}s`

  const minSec = trimmed.match(/^(\d+)\s*min\s+(\d+)\s*sec$/i)
  if (minSec) return `${minSec[1]}m ${minSec[2]}s`

  return trimmed
}

/** Tab label for the Beats section, e.g. "Beats (10 - 40m)". Callers pass a translated base label. */
export function formatBeatsTabLabel(
  count: number,
  minutes: number,
  runtimeDisplay = '',
  label = 'Beats'
): string {
  if (count <= 0) return label
  if (minutes <= 0 || !runtimeDisplay.trim()) return `${label} (${count})`

  const compact = compactBlueprintRuntimeDisplay(runtimeDisplay)
  return compact ? `${label} (${count} - ${compact})` : `${label} (${count})`
}

/**
 * The production format for the Format field, e.g. "podcast episode".
 *
 * This used to render `format_length`, which holds a duration despite its name,
 * so the field labelled Format showed a runtime. Older blueprints do not carry
 * `format`, hence the fallbacks.
 */
export function resolveBlueprintFormatLabel(
  variant: Record<string, unknown> | null | undefined,
  projectFormat?: string | null
): string {
  const candidates = [variant?.format, projectFormat]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return formatLabel(candidate.trim() as ProductionFormat)
    }
  }

  const genre = variant?.genre
  if (typeof genre === 'string' && genre.trim()) {
    return formatLabel(resolveProductionFormat(genre))
  }

  return ''
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
