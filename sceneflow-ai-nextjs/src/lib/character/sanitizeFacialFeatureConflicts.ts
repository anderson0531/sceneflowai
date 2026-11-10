/**
 * Deterministic sanitizer that removes micro-anatomical facial overrides and
 * invented eye/beard/bone traits from scene/emotion prose when character
 * reference portraits own facial identity.
 *
 * Pure, client-safe module (no Node/Vertex/sharp imports).
 */

const EYE_COLOR_ADJECTIVE_RE =
  /\b((?:widened|wide|narrowed|narrow|softened|soft|sharp|focused|unblinking|glassy|steady|bright|dark|deep|pale|warm|cold|icy|steel|piercing)\s+)?(?:amber[- ]hazel|blue[- ]green|blue[- ]gr[ae]y|gr[ae]y[- ]blue|hazel[- ]green|green[- ]brown|dark[- ]brown|warm[- ]brown|light[- ]brown|ice[- ]blue|steel[- ]gr[ae]y|amber|hazel|emerald|sapphire|violet|cobalt|cerulean|blue|green|brown|gr[ae]y)\s+(eyes|irises)\b/gi

/**
 * Tail bridge phrases inside `Emotion:` / `Facial expression:` where LLMs append
 * medical/anatomical facial feature prescriptions (e.g. `, shown by tightly bunched
 * jaw masseters, flared nostrils drawing cold air, an intensely furrowed brow, and a
 * sharp tremor along his parted lower lip`).
 */
const ANATOMICAL_EMOTION_BRIDGE_RE =
  /,?\s*\b(?:shown|marked|betrayed|evidenced|indicated|conveyed|expressed|registered|manifested|visible)\s+(?:by|in|through|via|across)\s+([^.!?]+)(?=[.!?]|$)/gi

const ANATOMICAL_FACIAL_MECHANIC_RE =
  /\b(?:masseters?|mandibles?|jawlines?|jaw\s+muscles?|bunched\s+jaw|clenched\s+jaw|taut\s+jaw|rigid\s+jaw|cheekbones?|hollows?\s+of|nostrils?|eyebrows?|furrowed\s+brows?|lower\s+lids?|upper\s+lids?|eyelids?|lower\s+lips?|upper\s+lips?|nasolabial|glabella|orbicularis|chin\s+muscles?)\b/i

/**
 * Sub-clauses in verbose `Emotion:` blocks that prescribe specific facial geometry,
 * eye color, jaw muscles, eyebrow shape, nostril flare, or lip/lid contours.
 */
const PRESCRIPTIVE_FACIAL_SUBCLAUSE_RE =
  /\b(?:masseters?|mandibles?|jawlines?|jaw\s+muscles?|(?:tightly\s+|rigidly\s+|visibly\s+)?(?:bunched|clenched|knotted|flexed|flexing|bulging|grinding|taut|locked)\s+jaw|eyebrows?\s+(?:flattened|pulled|arched|knitted|drawn|furrowed|lifted|raised|lowered)|(?:intensely\s+|deeply\s+|sharply\s+)?furrowed\s+brows?|flared\s+nostrils?|glassy\s+(?:lower|upper)\s+lids?|(?:lower|upper)\s+eyelids?|tremor\s+along\s+(?:his|her|their|the\s+subject's|person\s*\[\d+\]'s)\s+(?:parted\s+)?(?:lower\s+|upper\s+)?lips?|parted\s+lips?\s+(?:slightly\s+)?(?:unsteady|trembling|quivering)|(?:hollowed|sunken|gaunt|chiseled|angular|square|clean[- ]shaven|stubbled|unshaven)\s+(?:cheeks?|cheekbones?|jaw|jawline|chin|face))\b/i

const INLINE_CONJOINED_JAW_ACTION_RE =
  /\s+and\s+(?:his|her|their|the\s+subject's|person\s*\[\d+\](?:'s|’s)?)\s+jaw(?:\s+muscles?|\s+masseters?)?\s+(?:tightens?|clenches?|sets?|locks?|bunches?|flexes?)(?:\s+(?:rigidly|sharply|tightly|visibly|hard))?\b/gi

const INLINE_STANDALONE_JAW_ACTION_RE =
  /\b(his|her|their|the\s+subject's|person\s*\[\d+\](?:'s|’s)?)\s+jaw(?:\s+muscles?|\s+masseters?)?\s+(?:tightens?|clenches?|sets?|locks?|bunches?|flexes?)(?:\s+(?:rigidly|sharply|tightly|visibly|hard))?\b/gi

const INLINE_MASSETER_PHRASE_RE =
  /\b(?:with\s+)?(?:tightly\s+|visibly\s+|sharply\s+|rigidly\s+)?(?:bunched|clenched|flexed|flexing|knotted|bulging|taut|working)\s+(?:jaw\s+)?masseters?\b/gi

const INLINE_BONE_BEARD_OVERRIDE_RE =
  /,?\s*\b(?:with\s+)?(?:a\s+)?(?:hollowed|sunken|gaunt|chiseled|angular|square[- ]jawed|clean[- ]shaven|heavily\s+stubbled)\s+(?:cheeks?|cheekbones?|jaw|jawline|chin|face)\b/gi

function inferFallbackEmotionMood(raw: string): string {
  const lower = raw.toLowerCase()
  if (/\b(?:reverence|awe|disbelief|stunned|wonder)\b/.test(lower)) {
    return 'stunned reverence'
  }
  if (/\b(?:frustrat|bitter|anger|angry|furious|rage)\b/.test(lower)) {
    return 'bitter frustration and coiled restraint'
  }
  if (/\b(?:fear|terrified|dread|panic|anxious)\b/.test(lower)) {
    return 'quiet dread and tense alertness'
  }
  if (/\b(?:grief|sad|sorrow|mourning|weary|exhaust)\b/.test(lower)) {
    return 'quiet, weary restraint'
  }
  return 'quiet, focused restraint'
}

/**
 * Strip invented eye-color adjectives (`Widened amber-hazel eyes` -> `Widened eyes`)
 * while preserving non-color acting adjectives (`widened`, `unblinking`, `focused`).
 */
export function stripEyeColorOverrides(text: string): string {
  if (!text) return text
  return text.replace(EYE_COLOR_ADJECTIVE_RE, (_match, prefix?: string, noun?: string) => {
    const targetNoun = noun || 'eyes'
    return prefix ? `${prefix}${targetNoun}` : targetNoun
  })
}

/**
 * Distill the body of an `Emotion:` or `Facial expression:` clause so micro-anatomical
 * facial prescriptions (jaw masseters, eyebrow flattening, nostril flare, eye colors,
 * lower-lid/lower-lip tremors) do not override the reference portrait's features or beard.
 * Short natural cues (`eyes wide, mouth open`, `quiet dread`) pass through untouched.
 */
export function distillReferenceSafeEmotionBody(body: string): string {
  const raw = (body || '').trim()
  if (!raw) return ''

  // Preserve leading subject prefix if present (`person [1]: ...` or `Gideon Croft: ...`)
  let subjectPrefix = ''
  let content = raw
  const subjectMatch = content.match(
    /^((?:person\s*\[\d+\]|[A-Z][A-Za-z0-9'’_-]+(?:\s+[A-Z][A-Za-z0-9'’_-]+){0,2})\s*:\s*)/
  )
  if (subjectMatch) {
    subjectPrefix = subjectMatch[1]
    content = content.slice(subjectMatch[0].length).trim()
  }

  const trailingPunct = /[.!?]$/.exec(content)?.[0] ?? ''
  let working = content.replace(/[.!?]+$/, '').trim()

  // 1. Strip `, shown by <anatomical facial mechanics>` tails.
  working = working.replace(ANATOMICAL_EMOTION_BRIDGE_RE, (full, tail: string) => {
    return ANATOMICAL_FACIAL_MECHANIC_RE.test(tail) ? '' : full
  })

  // 2. Strip eye-color adjectives everywhere.
  working = stripEyeColorOverrides(working)

  // 3. When the clause contains prescriptive facial anatomy, filter comma/and sub-clauses.
  if (PRESCRIPTIVE_FACIAL_SUBCLAUSE_RE.test(working)) {
    const subclauses = working
      .split(/,\s*(?:and\s+)?|\s+and\s+(?=[a-z]+\s+(?:eyes?|brows?|eyebrows?|lips?|nostrils?|jaw|masseters?|cheeks?|tension|strain|reverence|frustration|dread|awe)\b)/i)
      .map((part) => part.trim())
      .filter(Boolean)

    const kept = subclauses.filter((clause) => !PRESCRIPTIVE_FACIAL_SUBCLAUSE_RE.test(clause))
    working = kept.length > 0 ? kept.join(', ') : inferFallbackEmotionMood(content)
  }

  // Soften "facial tension" -> "inner tension" so the model does not contort facial geometry
  working = working
    .replace(/\bfacial\s+tension\b/gi, 'quiet tension')
    .replace(/^and\s+/i, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,;\s]+|[,;\s]+$/g, '')
    .trim()

  if (!working) {
    working = inferFallbackEmotionMood(content)
  }

  return `${subjectPrefix}${working}${trailingPunct}`
}

const EMOTION_CLAUSE_IN_PROMPT_RE =
  /\b(Emotion:\s*)([\s\S]*?)(?=\s+(?:Coverage|Lens|Space|Shot|Angle|Camera|Blocking|Gaze|Prop interaction|Props|Lighting|End on|Sound|Scored moment|Incoming continuity|Continues the same|Only these people|No people in frame|Only these objects|Do not add objects|Hold the 0s|Progress smoothly|The only action|The only spoken line|No spoken dialogue):?|\s*$)/gi

/**
 * Remove facial-feature conflicts across a full video or still prompt while
 * preserving timing headers, blocking, camera direction, and acting emotion.
 */
export function sanitizeFacialFeatureConflicts(prompt: string): string {
  if (!prompt?.trim()) return prompt

  let text = prompt

  // 1. Distill structured `Emotion: ...` clauses first.
  text = text.replace(EMOTION_CLAUSE_IN_PROMPT_RE, (_full, label: string, body: string) => {
    const trimmedBody = body.trim()
    const endsWithDot = trimmedBody.endsWith('.')
    const distilled = distillReferenceSafeEmotionBody(trimmedBody)
    const normalized =
      endsWithDot && !/[.!?]$/.test(distilled) ? `${distilled}.` : distilled
    return `${label}${normalized}`
  })

  // 2. Strip anatomical `, shown by ...` bridges outside `Emotion:` if any appear in prose.
  text = text.replace(ANATOMICAL_EMOTION_BRIDGE_RE, (full, tail: string) => {
    return ANATOMICAL_FACIAL_MECHANIC_RE.test(tail) ? '' : full
  })

  // 3. Remove eye-color overrides (`Widened amber-hazel eyes` -> `Widened eyes`).
  text = stripEyeColorOverrides(text)

  // 4. Remove bare-jaw muscle / beard-erasing phrases in timed action prose.
  text = text.replace(INLINE_CONJOINED_JAW_ACTION_RE, '')
  text = text.replace(INLINE_STANDALONE_JAW_ACTION_RE, '$1 posture tenses')
  text = text.replace(INLINE_MASSETER_PHRASE_RE, 'tense restraint')
  text = text.replace(INLINE_BONE_BEARD_OVERRIDE_RE, '')

  return text
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\.\.+/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
