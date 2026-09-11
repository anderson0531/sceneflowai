/**
 * What kind of likeness failure the validator saw, and whether the shot could
 * have shown it.
 *
 * A single confidence number cannot distinguish "this is the wrong person"
 * from "this is the right person at the far end of an establishing shot".
 * Treating both as failure spends a second generation — the expensive half of
 * this route — on frames that were already correct, and spends nothing extra
 * on the frames that were not. Retries are therefore gated on a hard identity
 * mismatch: a subject whose skin tone or bone structure plainly belongs to
 * someone else, judged only at a distance where that is visible.
 */

export type LikenessShotScale = 'close' | 'medium' | 'wide' | 'unknown'

export type LikenessMismatchKind =
  /** Matches the reference. */
  | 'none'
  /** Plainly a different person — the only kind worth a second generation. */
  | 'identity'
  /** Same person, drifted hair, age read, or wardrobe. */
  | 'surface'
  /** Face too small, turned, or occluded to judge. */
  | 'indeterminate'

/**
 * Below this, the validator prompt reserves confidence for a different
 * ethnicity (<40) or a completely different facial structure (<50). Above it,
 * a miss is drift rather than a substitution.
 */
export const HARD_IDENTITY_CONFIDENCE_CEILING = 50

const CLOSE_SHOT = /\b(close[-\s]?ups?|closeup|extreme\s+close|ecu|cu|choker|insert|macro)\b/i
const WIDE_SHOT =
  /\b(wide|establishing|long\s+shot|full[-\s]?body|full\s+shot|master\s+shot|aerial|drone|crane|bird'?s[-\s]?eye|landscape)\b/i
const MEDIUM_SHOT =
  /\b(medium|mid[-\s]?shot|two[-\s]?shot|three[-\s]?shot|cowboy|waist|bust|over[-\s]the[-\s]shoulder|ots)\b/i

/**
 * Close is tested before wide so "medium close-up" is judged on the face, and
 * wide before medium so "medium wide" is not — an unresolvable face should
 * lower what the validator is trusted to assert, never raise it.
 */
export function classifyShotScale(shotType?: string | null): LikenessShotScale {
  const text = (shotType ?? '').trim()
  if (!text) return 'unknown'
  if (CLOSE_SHOT.test(text)) return 'close'
  if (WIDE_SHOT.test(text)) return 'wide'
  if (MEDIUM_SHOT.test(text)) return 'medium'
  return 'unknown'
}

/** True when the shot is too distant for facial structure to carry evidence. */
export function faceIsAssessableAtScale(scale: LikenessShotScale): boolean {
  return scale !== 'wide'
}

const MISMATCH_KINDS: LikenessMismatchKind[] = ['none', 'identity', 'surface', 'indeterminate']

const MISMATCH_ALIASES: Record<string, LikenessMismatchKind> = {
  match: 'none',
  matches: 'none',
  ok: 'none',
  hard: 'identity',
  different_person: 'identity',
  'different person': 'identity',
  wrong_person: 'identity',
  ethnicity: 'identity',
  soft: 'surface',
  drift: 'surface',
  hair: 'surface',
  wardrobe: 'surface',
  unknown: 'indeterminate',
  unassessable: 'indeterminate',
  not_assessable: 'indeterminate',
  occluded: 'indeterminate',
}

export function normalizeMismatchKind(raw: unknown): LikenessMismatchKind | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (!value) return undefined
  if ((MISMATCH_KINDS as string[]).includes(value)) return value as LikenessMismatchKind
  return MISMATCH_ALIASES[value] ?? MISMATCH_ALIASES[value.replace(/_/g, ' ')]
}

export interface LikenessMismatchSignals {
  matches?: boolean | null
  confidence?: number | null
  mismatchKind?: unknown
  ethnicityMatch?: boolean | null
  facialMatch?: boolean | null
  faceAssessable?: boolean | null
  shotScale?: LikenessShotScale
}

/**
 * Settle on a kind, preferring what the validator reported and falling back to
 * its per-criterion flags. On a wide shot the confidence number is not trusted
 * to prove a substitution: only skin tone survives that distance, so a low
 * score with matching skin tone is read as unassessable rather than wrong.
 */
export function resolveLikenessMismatchKind(
  signals: LikenessMismatchSignals
): LikenessMismatchKind {
  const scale = signals.shotScale ?? 'unknown'
  const explicit = normalizeMismatchKind(signals.mismatchKind)
  if (explicit) return explicit

  if (signals.faceAssessable === false) {
    return signals.ethnicityMatch === false ? 'identity' : 'indeterminate'
  }

  if (signals.ethnicityMatch === false) return 'identity'
  if (signals.matches === true) return 'none'

  const confidence = typeof signals.confidence === 'number' ? signals.confidence : undefined

  if (scale === 'wide') {
    // Facial structure is the one criterion a wide shot cannot settle.
    return signals.facialMatch === false || confidence == null ? 'indeterminate' : 'surface'
  }

  if (confidence == null) return 'indeterminate'
  if (confidence < HARD_IDENTITY_CONFIDENCE_CEILING) return 'identity'
  return 'surface'
}

/** The one condition that justifies paying for a second generation. */
export function isHardIdentityMismatch(
  validation: { mismatchKind?: unknown; matches?: boolean | null; confidence?: number | null } | null | undefined
): boolean {
  if (!validation) return false
  return (
    resolveLikenessMismatchKind({
      mismatchKind: validation.mismatchKind,
      matches: validation.matches,
      confidence: validation.confidence,
    }) === 'identity'
  )
}
