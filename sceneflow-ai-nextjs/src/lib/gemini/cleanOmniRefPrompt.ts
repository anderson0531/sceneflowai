/**
 * Aggressive REF-time prompt cleanup for Omni reference_to_video.
 * Stored segment prompts are often bloated; this runs at generation time only.
 */

import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import { aliasCharacterVideoLabel } from '@/lib/character/characterPromptAlias'
import { sanitizeUnactuatedSurfaceInscriptions } from '@/lib/scene/beatVideoPromptCompiler'

const STYLE_TOKEN_PATTERNS = [
  /\bphotorealistic\b/gi,
  /\bprofessional photography\b/gi,
  /\b8K resolution\b/gi,
  /\bstudio lighting\b/gi,
  /\bsharp focus\b/gi,
  /\bcinematic \d+mm lens\b/gi,
  /\bshallow depth of field\b/gi,
  /\bhigh-contrast clinical lighting\b/gi,
]

/** Split stored prompt into clause-like segments. */
function splitPromptSegments(prompt: string): string[] {
  return prompt
    .replace(/\.\.+/g, '.')
    .split(/(?<=[.!?])\s+|\.\s+/)
    .map((s) => s.trim().replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
}

function isStyleOnlySegment(segment: string): boolean {
  const stripped = STYLE_TOKEN_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, ''),
    segment
  )
    .replace(/[,.\s]+/g, ' ')
    .trim()
  return stripped.length < 8
}

function stripStyleTokens(segment: string): string {
  let text = segment
  for (const pattern of STYLE_TOKEN_PATTERNS) {
    text = text.replace(pattern, '')
  }
  return text.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').replace(/,\s*\./g, '.').trim()
}

/** Comma-salad motion/mood clause (camera tokens + emotional beat). */
function isMotionMoodSalad(segment: string): boolean {
  const lower = segment.toLowerCase()
  if (/collapsing into .* realization|quiet resignation|horrifying|intense realization/.test(lower)) {
    return true
  }
  const commaCount = (segment.match(/,/g) ?? []).length
  if (commaCount < 2) return false
  const cameraTokens =
    /\b(dolly|static|close-up|wide|medium|handheld|tracking|pan|zoom|inserts?)\b/i.test(segment)
  const moodTokens = /\b(hard|dramatic|high-contrast|low-key|mood)\b/i.test(segment)
  return cameraTokens && moodTokens && commaCount >= 2
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordOverlapRatio(a: string, b: string): number {
  const wordsA = new Set(normalizeForCompare(a).split(' ').filter((w) => w.length > 3))
  const wordsB = new Set(normalizeForCompare(b).split(' ').filter((w) => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }
  return overlap / Math.min(wordsA.size, wordsB.size)
}

/** Keep the longer/more descriptive clause when two action sentences overlap. */
function dedupeSimilarSegments(segments: string[]): string[] {
  const kept: string[] = []
  for (const segment of segments) {
    const dupIdx = kept.findIndex(
      (existing) => wordOverlapRatio(existing, segment) >= 0.55
    )
    if (dupIdx === -1) {
      kept.push(segment)
    } else if (segment.length > kept[dupIdx].length) {
      kept[dupIdx] = segment
    }
  }
  return kept
}

/** Redundant static setup clauses already carried by reference plates. */
const REDUNDANT_REF_META_CLAUSE_RE = /^(Coverage|Lens|Space):\s*/i

/**
 * Structured director & fidelity clauses emitted by `compileBeatVideoPromptFromDirection`.
 * Preserving these prevents Omni REF from drifting off-script or losing camera/blocking/end-state direction.
 */
const STRUCTURED_DIRECTOR_CLAUSE_RE =
  /^(Shot|Angle|Camera|Blocking|Emotion|Gaze|Props?|Prop interaction|End on|Delivery|Only these people|No people in frame|Only these objects|No spoken dialogue|The only spoken line|The only action is|Continues the same spoken line|Cut from the previous shot|Strictly no extra)\b/i

const TIMED_COMPILED_BEAT_PROMPT_RE =
  /\b\d+s[–-]\d+s\s*\((?:Start frame|Action|Action progression|End frame)\):/i

const PERFORMANCE_CLAUSE_RE =
  /\bPerformance:\s*[\s\S]*?(?=\s+(?:\d+s[–-]\d+s\s*\([^)]+\)|Opening pose|Action|Coverage|Lens|Space|Shot|Angle|Camera|Blocking|Emotion|Gaze|Prop interaction|Props|Lighting|End on|Settle on|Sound|Only these people|No people in frame|Only these objects|Hold the 0s|The only spoken line|No spoken dialogue|All visible signage|Translate and render|Include clear on-screen captions|Do not render subtitles):?|$)/i

/**
 * Reduce a stored segment prompt to a concise neutral scene for Omni REF.
 * Caps freeform narrative prose to ~2 sentences while preserving structured
 * director/fidelity clauses (Shot, Camera, Blocking, Prop interaction, End on, occupancy).
 */
export function cleanOmniRefScenePrompt(prompt: string): string {
  if (!prompt?.trim()) return prompt

  if (TIMED_COMPILED_BEAT_PROMPT_RE.test(prompt)) {
    const actionMatch = prompt.match(
      /\b2s[–-][58]s\s*\(Action\):\s*([\s\S]*?)(?=\s+(?:\d+s[–-]\d+s\s*\([^)]+\)|Coverage|Lens|Space|Shot|Angle|Camera|Blocking|Emotion|Gaze|Prop interaction|Props|Lighting|End on|Sound):|$)/i
    )
    const clipActionText = actionMatch?.[1] ?? ''
    let timed = prompt
      .replace(/\s*\b(?:Coverage|Lens|Space):\s*[^.]*\./gi, '')
      .replace(
        /\s*\bBlocking:\s*[\s\S]*?(?=\s+(?:Emotion|Gaze|Prop interaction|Props|Lighting|\d+s[–-]\d+s\s*\([^)]+\)|End on|Settle on|Sound|Only these people|No people in frame|Only these objects):|$)/gi,
        ''
      )
      .replace(/\s*\bGaze:\s*[^.]*\./gi, '')
      .replace(/\s*\bProp interaction:\s*[^.]*\./gi, '')
      .replace(
        /\s*On\s+the\s+(?:damp\s+|dark\s+|wet\s+|subterranean\s+)?(?:slate\s+|stone\s+|brick\s+)?(?:wall|board|chalkboard|blackboard|surface)\b[^.]*\b(?:formula|inscription|equation|writing|text)\b[^.]*\./gi,
        ''
      )
      .replace(
        /\s*\bphotorealistic,\s*cinematic motion,\s*professional cinematography,\s*natural lighting,\s*shallow depth of field\.?/gi,
        ''
      )
    timed = sanitizeUnactuatedSurfaceInscriptions(timed, clipActionText) ?? timed
    timed = stripStyleTokens(timed)
      .replace(/\.\.+/g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return timed || prompt.trim()
  }

  const performanceMatch = prompt.match(PERFORMANCE_CLAUSE_RE)
  const performance = performanceMatch?.[0].replace(/\s+/g, ' ').trim()
  const body =
    performanceMatch?.index != null
      ? `${prompt.slice(0, performanceMatch.index).trim()} ${prompt
          .slice(performanceMatch.index + performanceMatch[0].length)
          .trim()}`.trim()
      : prompt

  const rawSegments = splitPromptSegments(body || prompt)
    .map(stripStyleTokens)
    .filter((s) => s.length > 0)
    .filter((s) => !REDUNDANT_REF_META_CLAUSE_RE.test(s))
    .filter((s) => !isStyleOnlySegment(s))
    .filter((s) => !isMotionMoodSalad(s))

  const proseSegments: string[] = []
  const directorClauses: string[] = []
  for (const seg of rawSegments) {
    if (STRUCTURED_DIRECTOR_CLAUSE_RE.test(seg)) {
      directorClauses.push(seg)
    } else {
      proseSegments.push(seg)
    }
  }

  const dedupedProse = dedupeSimilarSegments(proseSegments).slice(0, 2)
  const dedupedDirector = dedupeSimilarSegments(directorClauses).slice(0, 6)
  const combined = [...dedupedProse, ...dedupedDirector]

  const cleaned = combined
    .map((s) => (s.endsWith('.') ? s : `${s}.`))
    .join(' ')
    .replace(/\.\.+/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const scene = cleaned || (body || prompt).trim()
  if (performance && !/performance:/i.test(scene)) {
    return `${scene} ${performance}`.replace(/\s{2,}/g, ' ').trim()
  }
  return scene
}

/** Strip verbose delivery parentheticals from dialogue guide text. */
export function sanitizeOmniRefGuide(guide?: string | null): string | undefined {
  const raw = guide?.trim()
  if (!raw) return undefined

  let text = raw
  text = text.replace(/\s*\(with [^)]*delivery[^)]*\)/gi, '')
  text = text.replace(/\s*\([^)]*delivery[^)]*\)/gi, '')
  text = text.replace(/speaks the following line\s*:/gi, 'says:')
  text = neutralizeReferenceConflictPrompt(text)

  return text.trim() || undefined
}

/** Soften reference image labels for REF video (strip emotional suffixes, shot parentheticals). */
export function sanitizeOmniRefLabel(label?: string | null): string {
  if (!label?.trim()) return label?.trim() ?? ''

  let text = label.trim()

  if (/location reference/i.test(text)) {
    text = text.replace(/\s*\([^)]*(?:establishing|wide|shot|angle)[^)]*\)/gi, '')
    return neutralizeReferenceConflictPrompt(text).trim()
  }

  if (!/^identity reference/i.test(text) && !/^prop reference/i.test(text)) {
    const parts = text.split(/\s*[—–]\s*/)
    if (parts.length >= 3) {
      text = parts.slice(0, -1).join(' — ')
    }
  }

  if (!/^prop reference/i.test(text)) {
    text = aliasCharacterVideoLabel(text)
  }

  return neutralizeReferenceConflictPrompt(text).trim()
}
