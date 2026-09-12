/**
 * Reduce video direction to something a single still can hold.
 *
 * Scene direction is authored for coverage, then copied onto every beat, so a
 * frame request arrives asking for things a photograph cannot be. A beat shipped
 * `Two-Shot, Dynamic, shifting from high-angle dominance to low-angle
 * vulnerability` alongside the prompt's own "No camera motion." line, and a
 * film-wide `Macro (100mm) for extreme detail on the needle and ash` on a
 * two-shot of two people in a tunnel (production 2026-09-12). The model has to
 * pick a winner, and nothing in the request says which.
 *
 * Normalizing here fixes every stored project on its next generation, with no
 * migration and no change to how direction is authored.
 */

/** Motion the camera does over time, which a frozen instant cannot show. */
const CAMERA_MOTION_SOURCE =
  /\b(?:dynamic|dynamically|dynamism|kinetic|moving|movement|motion|dolly(?:ing|s)?|dollies|pan(?:ning|s)?|tilt(?:ing|s)?|track(?:ing|s)?|truck(?:ing)?|zoom(?:ing|s)?|push(?:ing)?[- ]?in|pull(?:ing)?[- ]?(?:out|back)|crane|craning|jib|steadicam|hand[- ]?held|whip|swish|orbit(?:ing)?|arc(?:ing)?|drift(?:ing)?|sweep(?:ing)?|shak(?:e|ing|y)|rack[- ]focus|slow[- ]motion|follow(?:ing)?|continuous|then)\b/
  .source

const HAS_CAMERA_MOTION = new RegExp(CAMERA_MOTION_SOURCE, 'i')
const CAMERA_MOTION_TOKENS = new RegExp(CAMERA_MOTION_SOURCE, 'gi')

/** How fast a move went, which is meaningless once the move is gone. */
const MOTION_QUALIFIER_TOKENS =
  /\b(?:slow(?:ly)?|fast|rapid(?:ly)?|quick(?:ly)?|gradual(?:ly)?|steady|steadily|smooth(?:ly)?|gentle|gently|sudden(?:ly)?|abrupt(?:ly)?|creeping)\b/gi

/** A move stated as a start and an end. The end is the frame that exists. */
const TRANSITION_PATTERNS: RegExp[] = [
  /\b(?:shift(?:ing|s)?|mov(?:ing|es)?|transition(?:ing|s)?|travel(?:l?ing|s)?|ris(?:ing|es)?|fall(?:ing|s)?|tilt(?:ing|s)?|push(?:ing|es)?|pull(?:ing|s)?|cran(?:ing|es)?|drift(?:ing|s)?|go(?:ing|es)?|swing(?:ing|s)?)\s+from\s+.+?\s+(?:to|into|toward|towards)\s+(.+)$/i,
  /^\s*from\s+.+?\s+(?:to|into|toward|towards)\s+(.+)$/i,
]

/** Words that make a phrase a camera angle rather than a mood. */
const ANGLE_KEYWORD =
  /\b(?:high|low|eye|overhead|worm|bird|dutch|canted|oblique|top|ground|shoulder|hip|knee|waist|chest|profile|frontal|rear|side|three[- ]quarter|over[- ]the[- ]shoulder|level|angle)\b/i

/**
 * Canonical angle for a phrase that carries emotive freight. Direction writes
 * "low-angle vulnerability" and the frame only needs "low angle"; the emotion
 * is already directed by the beat's expression cue.
 */
const ANGLE_CANONICAL: Array<[RegExp, string]> = [
  [/\bworm'?s[- ]eye\b/i, "worm's-eye angle"],
  [/\bbird'?s[- ]eye\b/i, "bird's-eye angle"],
  [/\btop[- ]down\b/i, 'top-down angle'],
  [/\boverhead\b/i, 'overhead angle'],
  [/\bover[- ]the[- ]shoulder\b/i, 'over-the-shoulder angle'],
  [/\b(?:dutch|canted|oblique)\b/i, 'Dutch angle'],
  [/\beye[- ]level\b/i, 'eye-level angle'],
  [/\bground[- ]level\b/i, 'ground-level angle'],
  [/\bshoulder[- ]level\b/i, 'shoulder-level angle'],
  [/\bhip[- ]level\b/i, 'hip-level angle'],
  [/\bthree[- ]quarter\b/i, 'three-quarter angle'],
  [/\bhigh\b/i, 'high angle'],
  [/\blow\b/i, 'low angle'],
  [/\bprofile\b/i, 'profile angle'],
  [/\bfrontal\b/i, 'frontal angle'],
]

/** Shots that are pointed at one small thing, so a detail lens belongs on them. */
const DETAIL_SHOT_PATTERN =
  /\b(?:macro|insert|detail|extreme[- ]close|extreme[- ]cu|close[- ]?up|closeup|\becu\b|\bcu\b)\b/i

/** Lens families that can only resolve one small subject. */
const DETAIL_LENS_PATTERN = /\b(?:macro|probe lens|microscop\w*|extreme[- ]detail)\b/i

function tidy(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^[\s,;:.–—-]+/, '')
    .replace(/[\s,;:.–—-]+$/, '')
    .trim()
}

function reduceTransitionToEndState(value: string): string {
  for (const pattern of TRANSITION_PATTERNS) {
    const match = value.match(pattern)
    if (match?.[1]) return tidy(match[1])
  }

  // `X to Y` with no verb naming the move. Only a reduction when both halves
  // read as framing, so "close to the ground" survives intact.
  const bare = value.match(/^(.+?)\s+to\s+(.+)$/i)
  if (bare && ANGLE_KEYWORD.test(bare[1]) && ANGLE_KEYWORD.test(bare[2])) {
    return tidy(bare[2])
  }

  return value
}

function stripCameraMotion(value: string): string {
  if (!HAS_CAMERA_MOTION.test(value)) return tidy(value)
  // The speed of a move goes with the move. Only dropped alongside one, so a
  // shot scale that is genuinely "gentle" keeps its word.
  return tidy(value.replace(CAMERA_MOTION_TOKENS, ' ').replace(MOTION_QUALIFIER_TOKENS, ' '))
}

/** Hyphens and case are authoring style, not meaning: "Low-Angle" is "low angle". */
function comparable(value: string): string {
  return value.toLowerCase().replace(/[-\s]+/g, ' ')
}

function sameWording(a: string, b: string): boolean {
  return comparable(a) === comparable(b)
}

/**
 * One camera angle a photograph can be taken from, or nothing when the field
 * held only motion and mood.
 */
export function normalizeStillCameraAngle(cameraAngle?: string | null): string {
  const raw = tidy(cameraAngle ?? '')
  if (!raw) return ''

  const reduced = reduceTransitionToEndState(raw)
  for (const [pattern, canonical] of ANGLE_CANONICAL) {
    if (pattern.test(reduced)) return canonical
  }

  const stripped = stripCameraMotion(reduced)
  return ANGLE_KEYWORD.test(stripped) || stripped.split(' ').length <= 3 ? stripped : ''
}

/** Shot scale with any camera move stripped off it. */
export function normalizeStillShotType(shotType?: string | null): string {
  const raw = tidy(shotType ?? '')
  if (!raw) return ''
  return stripCameraMotion(reduceTransitionToEndState(raw))
}

export interface NormalizedStillFraming {
  /** Shot clause to lead Action/Framing with, e.g. `Two-Shot, low angle`. */
  shot: string
  /** Values that were rewritten, so the bad direction data stays visible. */
  rewrites: Array<{ field: 'shotType' | 'cameraAngle'; from: string; to: string }>
}

export function normalizeStillFraming(
  shotType?: string | null,
  cameraAngle?: string | null
): NormalizedStillFraming {
  const rewrites: NormalizedStillFraming['rewrites'] = []

  const rawShot = tidy(shotType ?? '')
  const rawAngle = tidy(cameraAngle ?? '')
  const shot = normalizeStillShotType(rawShot)
  const angle = normalizeStillCameraAngle(rawAngle)

  if (rawShot && !sameWording(shot, rawShot)) {
    rewrites.push({ field: 'shotType', from: rawShot, to: shot })
  }
  if (rawAngle && !sameWording(angle, rawAngle)) {
    rewrites.push({ field: 'cameraAngle', from: rawAngle, to: angle })
  }

  // A shot scale that already names the angle does not need it twice.
  const parts = [shot, angle].filter(Boolean)
  const deduped = parts.length === 2 && comparable(shot).includes(comparable(angle)) ? [shot] : parts

  return { shot: deduped.join(', '), rewrites }
}

export function isDetailShot(shotType?: string | null): boolean {
  return DETAIL_SHOT_PATTERN.test(shotType ?? '')
}

/**
 * Drop the subject a lens note names.
 *
 * `lensChoice` is authored per scene and then promoted to the film's lens
 * family, so one scene's "for extreme detail on the needle and ash" ends up
 * describing beats with no needle and no ash in them. Short purpose clauses
 * ("for depth", "for compression") describe the lens rather than a subject and
 * are kept.
 */
export function stripLensSubjectNote(lensAndFormat?: string | null): string {
  const raw = tidy(lensAndFormat ?? '')
  if (!raw) return ''

  return raw
    .split(';')
    .map((clause) => {
      const match = clause.match(/^(.*?)\s+\bfor\b\s+(.+)$/i)
      if (!match) return tidy(clause)
      const head = tidy(match[1])
      const purpose = tidy(match[2])
      if (!head) return tidy(clause)
      const namesASubject = / \bon\b /i.test(` ${purpose} `) || purpose.split(' ').length > 3
      return namesASubject ? head : tidy(clause)
    })
    .filter(Boolean)
    .join('; ')
}

/**
 * Remove a detail-lens clause from a shot that cannot hold one. A macro lens
 * does not frame two people in a tunnel, and asking for both leaves the model
 * to decide which instruction to honor.
 */
export function suppressDetailLensForShot(
  lensAndFormat?: string | null,
  shotType?: string | null
): string {
  const raw = tidy(lensAndFormat ?? '')
  if (!raw) return ''
  if (!shotType?.trim() || isDetailShot(shotType)) return raw

  const kept = raw
    .split(';')
    .map((clause) => tidy(clause))
    .filter((clause) => clause && !DETAIL_LENS_PATTERN.test(clause))

  return kept.join('; ')
}

/** Lens family for a still: no named subject, and no detail lens on a wide shot. */
export function normalizeStillLens(
  lensAndFormat?: string | null,
  shotType?: string | null
): string {
  return suppressDetailLensForShot(stripLensSubjectNote(lensAndFormat), shotType)
}
