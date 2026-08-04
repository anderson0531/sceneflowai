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

/** Inclusive runtime range the blueprint pipeline supports, in minutes. */
export const MIN_SUPPORTED_RUNTIME_MINUTES = 3
export const MAX_SUPPORTED_RUNTIME_MINUTES = 180

/**
 * Runtime the user asked for, in minutes, or null when the text names none.
 *
 * Unlike {@link analyzeDuration} this never clamps and has no fallback, so a
 * caller can tell "no duration mentioned" apart from "duration out of range".
 */
export function parseRequestedRuntimeMinutes(text: string | undefined | null): number | null {
  if (!text) return null
  const value = String(text)

  // Ranges first ("30-40 minutes"), otherwise the leading number would win alone.
  const range = value.match(
    /(\d{1,3}(?:\.\d+)?)\s*[-–—]\s*(\d{1,3}(?:\.\d+)?)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/i
  )
  if (range) {
    const low = parseFloat(range[1])
    const high = parseFloat(range[2])
    if (Number.isFinite(low) && Number.isFinite(high)) {
      return toMinutes((low + high) / 2, range[3])
    }
  }

  const single = value.match(
    /(\d{1,4}(?:\.\d+)?)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/i
  )
  if (single) {
    const amount = parseFloat(single[1])
    if (Number.isFinite(amount)) return toMinutes(amount, single[2])
  }

  return null
}

function toMinutes(amount: number, unit: string): number {
  const u = unit.toLowerCase()
  if (u.startsWith('h')) return amount * 60
  if (u.startsWith('s')) return amount / 60
  return amount
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


