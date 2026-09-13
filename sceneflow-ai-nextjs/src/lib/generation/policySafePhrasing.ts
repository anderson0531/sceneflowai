/**
 * Policy-safe phrasing for beat direction and still prompts.
 *
 * Image safety on the Vertex requests is already as permissive as it goes
 * (`getGeminiImageSafetyThreshold` defaults to OFF), so an `IMAGE_SAFETY`
 * refusal is Google's non-configurable RAI filter and cannot be tuned away
 * from our side. It has to be prevented in the words, in two places: the
 * prompts that ask a model to write `frozenMoment` / `blocking` /
 * `propInteraction`, and a pass over direction already written and stored.
 *
 * Deliberately not a blacklist. Stripping the violent nouns strips the drama
 * and unbinds prop references, which are matched to the prop's own head noun.
 * What gets rewritten is the instant being named: the blow that has landed
 * instead of the blow in progress.
 */

/** Refused in production 2026-09-13; used verbatim as the worked example. */
const REJECTED_EXAMPLE =
  'A heavy iron spanner slams into the stone an inch from her fingers, showering sparks. Gideon looms over her, his eyes feral.'

const ACCEPTED_EXAMPLE =
  "The spanner's head is buried in cracked stone beside her open hand, dust still settling; Gideon stands over her, jaw set, chest heaving."

/**
 * Guidance for any model authoring beat direction or a still prompt.
 *
 * `compact` trims to the two rules that carry most of the refusals, for the
 * longform path where every prompt line costs scenes.
 */
export function buildPolicySafePhrasingRules(opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    return `PHYSICAL ACTION: the image model refuses a still that reads as real harm to a person, and a refused beat yields no frame. Name the settled result rather than the blow — an implement embedded, fallen, or gripped low reads as aftermath where the same implement mid-swing at a body is refused. Never aim an impact verb at a person or body part, and describe a face by its expression ("jaw set") rather than a predatory metaphor ("eyes feral"). Keep each prop's real name.`
  }
  return `PHYSICAL ACTION — WRITE THE FRAME, NOT THE HARM:
The image model's content filter cannot be configured off, and it refuses any still that reads as depicting real harm to a person. A refused beat produces no frame at all, so phrasing decides whether the shot exists. Keep the drama and change the instant you name:
• Name the settled result, not the blow. An implement at rest — embedded, fallen, gripped low — reads as aftermath. The same implement mid-swing toward a body reads as an assault in progress and is refused.
• Never aim an impact verb at a person or a body part, and do not measure a near miss against one. "slams into the stone an inch from her fingers" is refused; "buried in cracked stone beside her open hand" is not.
• Describe a face by its expression, not by a predatory or animal metaphor. "jaw set, chest heaving" passes where "eyes feral" does not.
• Keep every prop's real name. A prop reference image is bound to the prop's own noun, so never soften "spanner" into "weapon" or "stage prop" — change the action around it instead.
Rejected: "${REJECTED_EXAMPLE}"
Accepted: "${ACCEPTED_EXAMPLE}"
Same composition, same threat, same prop. The difference is that the strike has landed rather than being in progress.`
}

/**
 * Meaning-preserving rewrites for direction already written and stored.
 *
 * Far narrower than `IMAGE_SAFETY_ESCALATION`, which is a last-ditch retry and
 * is allowed to be destructive. This runs on the FIRST attempt for every beat
 * frame, so it may only touch verbs, posture adjectives and near-miss
 * measurements. It must never rewrite a noun: the route drops a prop reference
 * whose head noun the frame stops naming, so turning "spanner" into "stage
 * prop" would silently discard that prop's reference image.
 *
 * Verb forms are paired rather than captured so the replacement agrees in
 * number with whatever subject the direction gave it.
 */
const POLICY_SOFTENING: Array<[RegExp, string]> = [
  // Impact in progress against a surface -> the same implement come to rest.
  [/\b(?:slams|smashes|crashes|hammers|slices|crunches)\s+into\b/gi, 'rests embedded in'],
  [/\b(?:slam|smash|crash|hammer|slice|crunch)\s+into\b/gi, 'rest embedded in'],
  [/\b(?:slams|smashes|crashes|hammers|strikes)\s+(?:against|across)\b/gi, 'rests against'],
  [/\b(?:slam|smash|crash|hammer|strike)\s+(?:against|across)\b/gi, 'rest against'],

  // An impact verb taking a body part as its object is the assault construction
  // the filter reads most directly. Keep the body part, make the blow a near miss.
  [
    /\b(?:slams?|smashes?|strikes?|hits?|cracks?)\s+((?:his|her|their|the)\s+(?:head|skull|face|jaw|throat|neck|chest|ribs|spine|arm|wrist|hand|fingers|knee|leg|back))\b/gi,
    'stops just short of $1',
  ],

  // A near miss measured against a body reads as intent to wound.
  [
    /\b(?:an inch|inches|a hair|a hair's breadth|a fraction of an inch|millimet(?:er|re)s?|centimet(?:er|re)s?)\s+(?:away\s+)?from\b/gi,
    'beside',
  ],

  // Weapon-ready posture -> the same prop held.
  [/\bcocked\s+(?:back|at|to)\b/gi, 'held at'],
  [/\braised\s+to\s+(?:strike|swing|hit)\b/gi, 'held low'],
  [/\bmid-(?:swing|strike|blow)\b/gi, 'at rest'],
  [/\bwhite-knuckling\b/gi, 'gripping'],

  // Predatory or animal framing of a face -> a directable expression.
  [/\b(?:his|her|their)\s+eyes\s+feral\b/gi, 'jaw set'],
  [/\bferal\s+eyes\b/gi, 'hard-set eyes'],
  [/\b(?:feral|predatory|murderous|savage)\b/gi, 'hard-set'],
  [/\b(?:bloodlust|blood\s*lust|killing\s+rage)\b/gi, 'fury'],

  // Menace verb over a downed subject -> the same blocking, stated plainly.
  [/\blooms?\s+over\b/gi, 'stands over'],
  [/\blooming\s+over\b/gi, 'standing over'],
]

export interface SoftenedStillPhrasing {
  text: string
  /** Human-readable `before -> after` pairs, for logging. */
  changes: string[]
}

/**
 * Soften direction prose that would draw an `IMAGE_SAFETY` refusal.
 *
 * Returns the input untouched (and no changes) when nothing matches, so a
 * clean beat costs one regex sweep and is byte-identical on the way out.
 */
export function softenStillPhrasingForPolicy(
  text: string | undefined | null
): SoftenedStillPhrasing {
  const original = text?.trim() ?? ''
  if (!original) return { text: original, changes: [] }

  let next = original
  const changes: string[] = []
  for (const [pattern, replacement] of POLICY_SOFTENING) {
    const matched = next.match(pattern)
    if (!matched) continue
    const updated = next.replace(pattern, replacement)
    if (updated === next) continue
    changes.push(`"${matched[0]}" -> "${replacement.replace(/\$1/g, matched[1] ?? '')}"`)
    next = updated
  }

  return { text: next, changes }
}
