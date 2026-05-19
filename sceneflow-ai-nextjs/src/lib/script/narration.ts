/**
 * Shared narration heuristics for Vision script + batch audio.
 * Production UI avoids treating duplicated description text as real VO; batch
 * generation must follow the same rules or it synthesizes "narration" the user
 * never authored as separate voiceover.
 */

function normalizeForDedup(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

export type SceneLikeForNarration = {
  narration?: unknown
  visualDescription?: unknown
  action?: unknown
  summary?: unknown
}

/**
 * True when `scene.narration` looks like intentional voiceover, not a copy of
 * the scene's visual/action block (a common generator artifact).
 */
export function isLikelyNarration(scene: SceneLikeForNarration): boolean {
  const narration = scene?.narration
  if (narration == null) return false
  const nTrim = String(narration).trim()
  if (!nTrim) return false
  const visual = String(scene.visualDescription || scene.action || scene.summary || '').trim()
  if (!visual) return true
  if (normalizeForDedup(nTrim) === normalizeForDedup(visual)) return false
  return true
}

/**
 * Text to send to TTS for scene narration in batch jobs.
 * Stored translations win; otherwise only narrate when `isLikelyNarration`.
 */
export function getBatchNarrationTtsText(
  scene: SceneLikeForNarration,
  storedNarration?: string | null
): string | null {
  const stored = storedNarration?.trim()
  if (stored) return stored
  if (!scene?.narration || !isLikelyNarration(scene)) return null
  const raw = String(scene.narration).trim()
  return raw.length > 0 ? raw : null
}

/** Scene has a separate narration audio asset (not narrator-as-dialogue only). */
export function hasStandaloneNarrationAudio(
  scene: SceneLikeForNarration & Record<string, unknown>
): boolean {
  if (!scene || typeof scene !== 'object') return false
  const na = scene.narrationAudio
  if (na && typeof na === 'object') {
    for (const k of Object.keys(na as object)) {
      const entry = (na as Record<string, { url?: string; audioUrl?: string }>)[k]
      if (entry && typeof entry === 'object' && (entry.url || entry.audioUrl)) return true
    }
  }
  const a = scene.narrationAudioUrl
  const b = scene.narrationUrl
  if (typeof a === 'string' && a.trim()) return true
  if (typeof b === 'string' && b.trim()) return true
  return false
}

export type ResolveNarrationTimelineOptions = {
  narrationText?: string | null
  /**
   * True when the API payload included `narrationText` (even `null`).
   * Prevents falling back to `scene.narration` when the UI means “no separate VO timeline”.
   */
  narrationTextKeyProvided?: boolean
  narrationDriven?: boolean
}

/**
 * Text expanded into generate-segments “combined audio timeline” narration rows (before dialogue lines).
 * Narrator-only dialogue stays on dialogue rows; do not duplicate `scene.narration` unless there is
 * real standalone narration audio or narration-driven mode (unless client overrides via `narrationText`).
 */
export function resolveNarrationTextForAudioTimeline(
  scene: SceneLikeForNarration & Record<string, unknown>,
  options?: ResolveNarrationTimelineOptions
): string {
  if (options?.narrationTextKeyProvided) {
    const t = options.narrationText
    if (t == null) return ''
    return String(t).trim()
  }
  const raw = String(scene?.narration ?? '').trim()
  if (!raw) return ''
  if (options?.narrationDriven) return raw
  if (hasStandaloneNarrationAudio(scene)) return raw
  return ''
}
