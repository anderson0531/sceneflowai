export type Beat = { title: string; summary: string; minutes: number }

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// Try to detect explicit duration in free text: "15 minute", "20min", "~25 minutes"
export function analyzeDuration(input: string | undefined | null, fallback: number = 20): number {
  if (!input) return fallback
  const re = /(\d{1,3})\s*(?:min|mins|minutes|minute|m)\b/i
  const m = input.match(re)
  if (m) {
    const v = parseInt(m[1], 10)
    if (Number.isFinite(v)) return clamp(v, 3, 180)
  }
  // Try ranges like 10-15 minutes -> choose middle
  const reRange = /(\d{1,3})\s*[-–]\s*(\d{1,3})\s*(?:min|minutes)?/i
  const r = input.match(reRange)
  if (r) {
    const a = parseInt(r[1], 10), b = parseInt(r[2], 10)
    if (Number.isFinite(a) && Number.isFinite(b)) return clamp(Math.round((a + b) / 2), 3, 180)
  }
  return fallback
}

export function sumBeatMinutes(beats: Beat[]): number {
  return beats.reduce((s, b) => s + (Number(b.minutes) || 0), 0)
}

// Redistribute minutes to hit the target while preserving relative weights.
export function normalizeDuration(beats: Beat[], targetMinutes: number): Beat[] {
  if (!Array.isArray(beats) || beats.length === 0) return []
  const minPerBeat = 0.25
  const current = sumBeatMinutes(beats)
  if (!current || current <= 0) {
    const per = targetMinutes / beats.length
    return beats.map(b => ({ ...b, minutes: Math.max(minPerBeat, per) }))
  }
  const ratio = targetMinutes / current
  const scaled = beats.map(b => ({ ...b, minutes: Math.max(minPerBeat, (b.minutes || minPerBeat) * ratio) }))
  // Round to 0.25 minutes increments to look tidy
  const rounded = scaled.map(b => ({ ...b, minutes: Math.round(b.minutes * 4) / 4 }))
  // Small correction to match exactly (±0.25)
  const diff = targetMinutes - sumBeatMinutes(rounded)
  if (Math.abs(diff) >= 0.25) {
    const step = diff > 0 ? 0.25 : -0.25
    let i = 0
    let remaining = Math.abs(Math.round(diff * 4))
    while (remaining > 0 && i < rounded.length) {
      rounded[i].minutes = Math.max(minPerBeat, rounded[i].minutes + step)
      remaining--
      i = (i + 1) % rounded.length
    }
  }
  return rounded
}


