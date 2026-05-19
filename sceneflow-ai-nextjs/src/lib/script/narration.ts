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
