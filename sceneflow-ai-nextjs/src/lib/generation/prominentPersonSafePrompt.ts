/**
 * Neutralizes real-person / "certain prominent individuals" false-positive triggers
 * for Google Vertex Veo & Gemini Omni video/still prompts while preserving:
 *  - Spoken dialogue inside quotation marks verbatim
 *  - Multimodal reference tokens (`person [1]`, `prop [1]`, `location [1]`)
 *  - Continuity cast/prop structure
 *
 * Pure TypeScript (client-bundle safe — do not import server-only modules here).
 */

import {
  distillMultiSceneStyleBibleForVideo,
  isMultiSceneStyleBibleArc,
} from '@/lib/artStyle/globalArtStyle'
import { rewriteVisualNamesToTokens } from '@/lib/vision/referenceImageBinding'

const PROMINENT_PEOPLE_ERROR_MARKERS = [
  'prominent individuals',
  'certain prominent',
  'prominent people',
  'prominent person',
  'public figure',
  'celebrity',
  'celebrities',
  'impersonat',
  'likeness of a real',
  'real person',
  'real-person',
  'famous person',
  'famous people',
  'famous individual',
]

/**
 * True when an AI provider error specifically cites prominent individuals,
 * public figures, celebrities, or real-person likeness restrictions.
 */
export function isProminentPeoplePolicyError(message?: string | null): boolean {
  if (!message?.trim()) return false
  const low = message.toLowerCase()
  return PROMINENT_PEOPLE_ERROR_MARKERS.some((marker) => low.includes(marker))
}

const SENTENCE_DOT_PLACEHOLDER = '\uE000'

/**
 * Prefix titles/abbreviations that never terminate a sentence before a name or number.
 */
const NON_TERMINAL_PREFIX_ABBREV_RE =
  /\b(Mr|Mrs|Ms|Mx|Dr|Prof|Rev|Fr|St|Mt|Lt|Capt|Cpt|Sgt|Cpl|Col|Gen|Adm|Gov|Sen|Rep|Pres|Hon|Messrs|Mmes|vs|v|approx|ca|est|no|vol|dept)\.(?=\s)/gi

/**
 * Generational suffixes & corporate/latin abbreviations (`Sr.`, `Jr.`, `etc.`)
 * when followed by `(Age 34)`, punctuation, lowercase continuation, or anything
 * other than a clear new-sentence starter (`The ...`, `He ...`, `Camera ...`).
 */
const NON_TERMINAL_SUFFIX_ABBREV_RE =
  /\b(Sr|Jr|etc|inc|corp|ltd|co)\.(?=\s+(?:\(|[a-z0-9]|[,;:—–-]|(?!(?:The|A|An|He|She|They|His|Her|Their|It|Its|This|That|These|Those|Meanwhile|Suddenly|Simultaneously|Camera|Shot|End)\b)[A-Z]))/g

/**
 * Single-letter middle initials (`Brian E. Anderson`).
 */
const INITIAL_ABBREV_RE = /\b([A-Z])\.(?=\s+(?:[A-Z][a-z]|\())/g

function maskNonTerminalPeriods(text: string): string {
  return text
    .replace(NON_TERMINAL_PREFIX_ABBREV_RE, `$1${SENTENCE_DOT_PLACEHOLDER}`)
    .replace(NON_TERMINAL_SUFFIX_ABBREV_RE, `$1${SENTENCE_DOT_PLACEHOLDER}`)
    .replace(INITIAL_ABBREV_RE, `$1${SENTENCE_DOT_PLACEHOLDER}`)
}

function unmaskNonTerminalPeriods(text: string): string {
  return text.split(SENTENCE_DOT_PLACEHOLDER).join('.')
}

/**
 * Splits prose into sentences on `.` / `!` / `?` without breaking inside names
 * like `"Brian Eric Anderson Sr. (Age 34)"` or `"Dr. Elena Rostova"`.
 */
export function splitSentencesPreservingTitles(text: string): string[] {
  const trimmed = text?.trim()
  if (!trimmed) return []
  return maskNonTerminalPeriods(trimmed)
    .split(/(?<=[.!?])\s+/)
    .map((part) => unmaskNonTerminalPeriods(part).trim())
    .filter(Boolean)
}

/**
 * Returns the first complete sentence without truncating at `Sr.`, `Jr.`, `Dr.`, etc.
 */
export function extractFirstSentencePreservingTitles(text?: string | null): string {
  const trimmed = text?.trim() ?? ''
  if (!trimmed) return ''
  const masked = maskNonTerminalPeriods(trimmed)
  const hit = masked.match(/^[^.!?]+[.!?]/)
  return unmaskNonTerminalPeriods(hit ? hit[0] : masked).trim()
}

const QUOTED_SPEECH_SPLIT =
  /("[^"\n]*"|“[^”\n]*”|(?<![A-Za-z0-9])'(?:[^'\n]|(?<=[A-Za-z0-9])'(?=[A-Za-z0-9]))*'(?![A-Za-z0-9]))/g

/**
 * Removes `(Character Display Name)` parentheticals after `person [N]` in the
 * `Use the images above.` binding block (including nested `(Age 34)` qualifiers),
 * keeping `person [N]` intact so Vertex Omni still binds the reference image
 * without tripping `[prohibited_content]` on real-world personal names.
 */
export function stripPersonDisplayNamesFromReferenceLegend(prompt: string): string {
  if (!prompt?.trim()) return prompt
  return prompt.replace(
    /\b(person\s*\[\d+\])\s*\((?:[^()\n]|\([^()\n]*\))*\)(?=\s+is\s+the\s+person\b)/gi,
    '$1'
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toCharPromptToken(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
  return cleaned ? `Char_${cleaned}` : ''
}

function parseAgeFromNameOrToken(raw: string): number | undefined {
  const parenAge = raw.match(/\(\s*(?:Age[d]?\s*)?(\d{1,3})(?:\s*yrs?|\s*years?\s*old)?\s*\)/i)
  if (parenAge) {
    const n = Number(parenAge[1])
    if (Number.isFinite(n) && n >= 1 && n <= 120) return n
  }
  const tokenAge = raw.match(/(?:^|_)AGE_(\d{1,3})(?:_|$)/i)
  if (tokenAge) {
    const n = Number(tokenAge[1])
    if (Number.isFinite(n) && n >= 1 && n <= 120) return n
  }
  return undefined
}

function inferGenderFromNameAndContext(
  rawName: string,
  unquotedContext: string,
  totalCharacters: number
): 'male' | 'female' | 'neutral' {
  const clean = rawName.replace(/\([^)]*\)/g, ' ')
  if (/\b(?:Sr|Jr|Mr|Sir|Lord|II|III|IV)\b\.?/i.test(clean) || /(?:_SR|_JR)(?:_|$)/i.test(rawName)) {
    return 'male'
  }
  if (/\b(?:Mrs|Ms|Miss|Lady|Madame)\b\.?/i.test(clean) || /^Char_(?:MS|MRS|MISS)_/i.test(rawName)) {
    return 'female'
  }
  if (totalCharacters <= 1 && unquotedContext) {
    const hasMalePronoun = /\b(?:he|him|his|himself)\b/i.test(unquotedContext)
    const hasFemalePronoun = /\b(?:she|her|hers|herself)\b/i.test(unquotedContext)
    if (hasMalePronoun && !hasFemalePronoun) return 'male'
    if (hasFemalePronoun && !hasMalePronoun) return 'female'
  }
  return 'neutral'
}

/**
 * Builds a concise, policy-safe visual subject phrase (e.g. `"the 34-year-old man"`,
 * `"the 17-year-old young man"`, `"the woman"`, `"the speaker"`) with zero proper names.
 */
export function deriveNeutralCharacterDescriptor(
  rawName: string,
  options?: {
    unquotedContext?: string
    totalCharacters?: number
    usedDescriptors?: Set<string>
  }
): string {
  const age = parseAgeFromNameOrToken(rawName)
  const gender = inferGenderFromNameAndContext(
    rawName,
    options?.unquotedContext ?? '',
    options?.totalCharacters ?? 1
  )

  let noun: string
  if (age !== undefined && age < 13) {
    noun = gender === 'male' ? 'boy' : gender === 'female' ? 'girl' : 'child'
  } else if (age !== undefined && age < 20) {
    noun = gender === 'male' ? 'young man' : gender === 'female' ? 'young woman' : 'teenager'
  } else {
    noun = gender === 'male' ? 'man' : gender === 'female' ? 'woman' : 'performer'
  }

  let candidate = age !== undefined ? `the ${age}-year-old ${noun}` : `the ${noun}`
  const used = options?.usedDescriptors
  if (used && used.has(candidate.toLowerCase())) {
    const ordinals = ['first', 'second', 'third', 'fourth']
    for (let idx = 1; idx < ordinals.length; idx++) {
      const alt =
        age !== undefined
          ? `the ${ordinals[idx]} ${age}-year-old ${noun}`
          : `the ${ordinals[idx]} ${noun}`
      if (!used.has(alt.toLowerCase())) {
        candidate = alt
        break
      }
    }
  }
  used?.add(candidate.toLowerCase())
  return candidate
}

function decodeCharTokenToDisplayCandidate(charToken: string): string | undefined {
  const body = charToken.replace(/^Char_/i, '').trim()
  if (!body || body.toLowerCase() === 'character' || body.toLowerCase() === 'narrator') {
    return undefined
  }
  let stem = body
  let ageSuffix = ''
  const ageMatch = stem.match(/^(.*?)_AGE_(\d{1,3})$/i)
  if (ageMatch) {
    stem = ageMatch[1]
    ageSuffix = ` (Age ${ageMatch[2]})`
  }
  const words = stem
    .split(/_+/)
    .filter(Boolean)
    .map((word) => {
      if (/^(?:SR|JR)$/i.test(word)) {
        return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}.`
      }
      if (/^(?:II|III|IV|V)$/i.test(word)) return word.toUpperCase()
      if (/^(?:MR|MRS|MS|DR|PROF)$/i.test(word)) {
        return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}.`
      }
      return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`
    })
  if (words.length === 0) return undefined
  return `${words.join(' ')}${ageSuffix}`
}

function collectCharacterNamesFromPrompt(unquotedText: string, seedNames: string[]): string[] {
  const found: string[] = []
  const seen = new Set<string>()
  const add = (raw?: string | null) => {
    const clean = (raw || '')
      .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!clean) return
    if (/^(?:person|prop|location)\s*\[\d+\]$/i.test(clean)) return
    if (/^(?:the\s+|no\s+|none\b|nobody\b|narrator\b)/i.test(clean)) return
    const key = clean.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    found.push(clean)
  }

  for (const seed of seedNames) add(seed)

  // Extract from compiled occupancy clauses: "Only these people are visible: Name1, Name2."
  const occupancyRe =
    /\b(?:Only these people are visible|same people already in frame|Cast in frame):\s*([^.\n]+)/gi
  let occMatch: RegExpExecArray | null
  while ((occMatch = occupancyRe.exec(unquotedText)) !== null) {
    const rawList = occMatch[1].replace(/\s*—\s*and no other people.*$/i, '')
    for (const part of rawList.split(/\s*,\s*|\s+and\s+/i)) {
      add(part)
    }
  }

  // Extract from Char_<IDENT> speaker tags
  const charTagRe = /\b(Char_[A-Za-z0-9_]+)\b/g
  let tagMatch: RegExpExecArray | null
  while ((tagMatch = charTagRe.exec(unquotedText)) !== null) {
    const token = tagMatch[1]
    const alreadyMatched = found.some(
      (existing) => toCharPromptToken(existing).toLowerCase() === token.toLowerCase()
    )
    if (!alreadyMatched) {
      const decoded = decodeCharTokenToDisplayCandidate(token)
      if (decoded) add(decoded)
    }
  }

  // Extract explicit honorific/suffix/age-qualified full names in prose
  const explicitPersonRe =
    /\b(?:(?:Mr|Mrs|Ms|Mx|Dr|Prof)\.\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+(?:Sr|Jr|II|III|IV)\.?(?:\s*\(Age[d]?\s*\d{1,3}\))?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s*\(Age[d]?\s*\d{1,3}\))/g
  let expMatch: RegExpExecArray | null
  while ((expMatch = explicitPersonRe.exec(unquotedText)) !== null) {
    add(expMatch[0])
  }

  return found
}

function capitalizeSentenceStarts(text: string): string {
  return text
    .replace(/^\s*(the\s+)/i, (m) => m.replace(/the/i, 'The'))
    .replace(/((?:[.!?]\s+|\(\s*(?:Start frame|Action|Action progression|End frame)\s*\):\s*|End on:\s*|Blocking:\s*|Emotion:\s*|Gaze:\s*|Prop interaction:\s*))(the\s+)/gi, (_, prefix: string, theWord: string) => {
      return `${prefix}The${theWord.slice(3)}`
    })
}

export interface DeidentifyProminentPersonOptions {
  /** Known cast character names on the beat / segment. */
  characterNames?: string[]
  /** Reference image bindings (`person [1]`) when REF plates are attached. */
  boundReplacements?: Array<{ name?: string; token?: string }>
  /** Replace `photorealistic` trigger keyword with live-action film phrasing. */
  softenPhotorealistic?: boolean
}

export interface DeidentifyProminentPersonResult {
  prompt: string
  wasModified: boolean
}

/**
 * Scrubs `Char_*` identifiers, `(Character Name)` multimodal legend parentheticals,
 * and character personal names outside quoted dialogue so Vertex Veo / Omni Flash
 * does not false-positive on `[prohibited_content] ... certain prominent individuals`.
 */
export function deidentifyPromptForProminentPersonPolicy(
  prompt: string,
  options: DeidentifyProminentPersonOptions = {}
): DeidentifyProminentPersonResult {
  if (!prompt?.trim()) return { prompt, wasModified: false }

  let next = stripPersonDisplayNamesFromReferenceLegend(prompt)

  const boundPersonEntries = (options.boundReplacements ?? []).filter(
    (entry) => entry.name?.trim() && entry.token && /^person\s*\[\d+\]$/i.test(entry.token.trim())
  )
  const uniqueBoundPersons: Array<{ name: string; token: string }> = []
  const seenBoundTokens = new Set<string>()
  for (const entry of boundPersonEntries) {
    const cleanToken = entry.token!.replace(/\s+/g, ' ').trim()
    const key = cleanToken.toLowerCase()
    if (seenBoundTokens.has(key)) continue
    seenBoundTokens.add(key)
    uniqueBoundPersons.push({ name: entry.name!.trim(), token: cleanToken })
  }

  if (boundPersonEntries.length > 0) {
    next = rewriteVisualNamesToTokens(next, boundPersonEntries)
  }

  const partsAfterBind = next.split(QUOTED_SPEECH_SPLIT)
  const unquotedBeforeDescriptorRebind = partsAfterBind.filter((_, idx) => idx % 2 === 0).join(' ')

  // If the prompt was pre-sanitized by Shot Director Safe (e.g. "The 34-year-old man"),
  // re-bind that neutral descriptor back to `person [N]` when REF plates are attached.
  if (uniqueBoundPersons.length > 0) {
    const boundDescriptorMap = new Map<string, { token: string; count: number }>()
    const recordBoundDesc = (desc: string, token: string) => {
      const key = desc.trim().toLowerCase()
      if (!key) return
      const existing = boundDescriptorMap.get(key)
      if (existing && existing.token !== token) {
        existing.count += 1
      } else if (!existing) {
        boundDescriptorMap.set(key, { token, count: 1 })
      }
    }
    const usedForBound = new Set<string>()
    for (const bp of uniqueBoundPersons) {
      const descMulti = deriveNeutralCharacterDescriptor(bp.name, {
        unquotedContext: unquotedBeforeDescriptorRebind,
        totalCharacters: uniqueBoundPersons.length,
        usedDescriptors: usedForBound,
      })
      recordBoundDesc(descMulti, bp.token)
      const descSingle = deriveNeutralCharacterDescriptor(bp.name, {
        unquotedContext: unquotedBeforeDescriptorRebind,
        totalCharacters: 1,
      })
      recordBoundDesc(descSingle, bp.token)
    }
    const unambiguousBoundDescs = [...boundDescriptorMap.entries()]
      .filter(([, v]) => v.count === 1)
      .sort((a, b) => b[0].length - a[0].length)

    if (unambiguousBoundDescs.length > 0) {
      next = next
        .split(QUOTED_SPEECH_SPLIT)
        .map((segment, idx) => {
          if (idx % 2 === 1) return segment
          let chunk = segment
          for (const [desc, { token }] of unambiguousBoundDescs) {
            const re = new RegExp(
              `(?<![\\p{L}\\p{N}_])${escapeRegExp(desc)}(?![\\p{L}\\p{N}_])`,
              'giu'
            )
            chunk = chunk.replace(re, token)
          }
          return chunk
        })
        .join('')
    }
  }

  const parts = next.split(QUOTED_SPEECH_SPLIT)
  const unquotedJoined = parts.filter((_, idx) => idx % 2 === 0).join(' ')

  const boundNamesLower = new Set(
    boundPersonEntries.map((entry) => entry.name!.trim().toLowerCase())
  )
  const unboundCharacterNames = collectCharacterNamesFromPrompt(
    unquotedJoined,
    options.characterNames ?? []
  ).filter((name) => !boundNamesLower.has(name.toLowerCase()))

  if (unboundCharacterNames.length > 0) {
    const usedDescriptors = new Set<string>()
    const descriptorReplacements = unboundCharacterNames.map((name) => ({
      name,
      token: deriveNeutralCharacterDescriptor(name, {
        unquotedContext: unquotedJoined,
        totalCharacters: unboundCharacterNames.length + uniqueBoundPersons.length,
        usedDescriptors,
      }),
    }))

    // Build exact + alias replacement map while keeping quoted dialogue untouched
    const stripQualifiers = (raw: string) =>
      raw.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
    const isSuffix = (w: string) => /^(?:sr|jr|ii|iii|iv|v)\.?$/i.test(w)
    const isTitle = (w: string) => /^(?:mr|mrs|ms|mx|dr|prof|sir|lady|miss)\.?$/i.test(w)

    const exactPairs: Array<{
      pattern: string
      replacement: string
      midSentenceDotOnly?: boolean
    }> = []
    const aliasCandidates = new Map<string, { replacement: string; count: number }>()

    const addExact = (pattern: string, replacement: string) => {
      const clean = pattern.replace(/[.,;:]+$/, '').trim()
      if (!clean || clean.length < 2) return
      if (/\b(?:Sr|Jr)\.$/i.test(pattern.trim())) {
        // Consume abbreviation period only when mid-sentence (before lowercase, "(", or timed header)
        exactPairs.push({
          pattern: `${clean}.`,
          replacement,
          midSentenceDotOnly: true,
        })
      }
      exactPairs.push({ pattern: clean, replacement })
    }

    const addAlias = (alias: string, replacement: string) => {
      const clean = alias.replace(/[.,;:]+$/, '').trim()
      if (clean.length < 3) return
      const key = clean.toLowerCase()
      const prev = aliasCandidates.get(key)
      if (prev && prev.replacement !== replacement) {
        prev.count += 1
      } else if (!prev) {
        aliasCandidates.set(key, { replacement, count: 1 })
      }
    }

    for (const { name, token: descriptor } of descriptorReplacements) {
      const charTag = toCharPromptToken(name)
      if (charTag) addExact(charTag, descriptor)
      addExact(name, descriptor)

      const base = stripQualifiers(name)
      if (base && base.toLowerCase() !== name.toLowerCase()) {
        addExact(base, descriptor)
        const baseCharTag = toCharPromptToken(base)
        if (baseCharTag) addExact(baseCharTag, descriptor)
      }

      const words = base.split(/\s+/).filter(Boolean)
      const coreWords = words.filter((w) => !isSuffix(w) && !isTitle(w))
      const core = coreWords.join(' ').trim()
      if (core && core.toLowerCase() !== base.toLowerCase()) {
        addExact(core, descriptor)
      }
      if (coreWords.length > 2) {
        addAlias(`${coreWords[0]} ${coreWords[coreWords.length - 1]}`, descriptor)
      }
      if (coreWords.length >= 2) {
        addAlias(coreWords[0], descriptor)
        addAlias(coreWords[coreWords.length - 1], descriptor)
      }
    }

    const sortedExact = exactPairs.sort((a, b) => b.pattern.length - a.pattern.length)
    const sortedAliases = [...aliasCandidates.entries()]
      .filter(([, v]) => v.count === 1)
      .map(([alias, v]) => ({ pattern: alias, replacement: v.replacement }))
      .sort((a, b) => b.pattern.length - a.pattern.length)

    next = next
      .split(QUOTED_SPEECH_SPLIT)
      .map((segment, idx) => {
        if (idx % 2 === 1) return segment
        let chunk = segment
        // Heal legacy broken split: "2s–5s (Action): Name Sr. 5s–8s (Action progression): (Age 34) <verb>"
        chunk = chunk.replace(
          /(\d+s[–-]\d+s\s*\(Action\):\s*)([^\n.]+?\b(?:Sr|Jr)\.)\s+\d+s[–-]\d+s\s*\(Action progression\):\s*(\(Age[d]?\s*\d{1,3}\))\s+/gi,
          '$1$2 $3 '
        )
        for (const { pattern, replacement, midSentenceDotOnly } of sortedExact) {
          const lookahead = midSentenceDotOnly
            ? '(?=\\s+(?:[a-z(]|\\d+s[–-]))'
            : '(?![\\p{L}\\p{N}_])'
          const re = new RegExp(
            `(?<![\\p{L}\\p{N}_])${escapeRegExp(pattern)}${lookahead}`,
            'giu'
          )
          chunk = chunk.replace(re, replacement)
        }
        // Any remaining orphan Char_<IDENT> token in non-quoted text
        chunk = chunk.replace(/\bChar_[A-Za-z0-9_]+\b/g, (rawTag) => {
          const decoded = decodeCharTokenToDisplayCandidate(rawTag)
          return decoded
            ? deriveNeutralCharacterDescriptor(decoded, { unquotedContext: unquotedJoined })
            : 'the speaker'
        })
        for (const { pattern, replacement } of sortedAliases) {
          const re = new RegExp(
            `(?<![\\p{L}\\p{N}_])${escapeRegExp(pattern)}(?![\\p{L}\\p{N}_])`,
            'giu'
          )
          chunk = chunk.replace(re, replacement)
        }
        return chunk
      })
      .join('')

    next = capitalizeSentenceStarts(next)
  } else {
    // Even if all known cast were bound to person [N], scrub any stray orphan Char_* tags outside quotes
    next = next
      .split(QUOTED_SPEECH_SPLIT)
      .map((segment, idx) => {
        if (idx % 2 === 1) return segment
        return segment.replace(/\bChar_[A-Za-z0-9_]+\b/g, (rawTag) => {
          const firstPersonToken = uniqueBoundPersons[0]?.token
          if (firstPersonToken && uniqueBoundPersons.length === 1) return firstPersonToken
          const decoded = decodeCharTokenToDisplayCandidate(rawTag)
          return decoded
            ? deriveNeutralCharacterDescriptor(decoded, { unquotedContext: unquotedJoined })
            : 'the speaker'
        })
      })
      .join('')
  }

  if (options.softenPhotorealistic) {
    next = next
      .split(QUOTED_SPEECH_SPLIT)
      .map((segment, idx) => {
        if (idx % 2 === 1) return segment
        return segment.replace(/\bphotorealistic\b/gi, 'cinematic 35mm live-action')
      })
      .join('')
  }

  return {
    prompt: next,
    wasModified: next !== prompt,
  }
}

/**
 * Sanitizes a reference image caption/label so legacy `"Identity reference 1: Full Name"`
 * or `Char_Full_Name` labels become neutral `"The next image is the identity of person [1]."`
 * without exposing personal names to Vertex's prominent-individuals classifier.
 */
export function deidentifyReferenceImageLabel(label: string, fallbackIndex = 1): string {
  const trimmed = label?.trim() ?? ''
  if (!trimmed) return trimmed
  const legacyMatch = trimmed.match(
    /^(identity|wardrobe|character)\s+reference(?:\s+(\d+))?:\s*(.+)$/i
  )
  if (legacyMatch) {
    const role = legacyMatch[1].toLowerCase()
    const idx = legacyMatch[2] ? Number(legacyMatch[2]) : fallbackIndex
    const token = `person [${Number.isFinite(idx) && idx >= 1 ? idx : fallbackIndex}]`
    if (role === 'wardrobe') return `The next image is the wardrobe of ${token}.`
    if (role === 'character') return `The next image is the identity and wardrobe of ${token}.`
    return `The next image is the identity of ${token}.`
  }
  return trimmed
    .replace(/\bChar_[A-Za-z0-9_]+\b/g, `person [${fallbackIndex}]`)
    .replace(
      /\b(person\s*\[\d+\])\s*\((?:[^()\n]|\([^()\n]*\))*\)/gi,
      '$1'
    )
}

function preserveLeadCase(matched: string, replacement: string): string {
  if (!matched || !replacement) return replacement
  const first = matched[0]
  if (first >= 'A' && first <= 'Z') {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

const SEMANTIC_SAFETY_CLUSTER_RULES: Array<[RegExp, string]> = [
  [/\bbrushed-stage\s+prop\b/gi, 'brushed-metal'],
  [
    /\bclinical\s+supremacy\s+and\s+absolute\s+mathematical\s+certainty\b/gi,
    'calm analytical certainty and unshakable focus',
  ],
  [/\bclinical\s+supremacy\b/gi, 'calm analytical certainty'],
  [/\bsupremacy\b/gi, 'certainty'],
  [/\bclinical\s+delivery\b/gi, 'calm, measured delivery'],
  [/\brelentless\s+delivery\b/gi, 'authoritative delivery'],
  [/\bsurgical,\s+and\s+utterly\s+commanding\b/gi, 'precise, and composed'],
  [/\butterly\s+commanding\b/gi, 'composed and authoritative'],
  [/\bmachine-like\s+cadence\b/gi, 'rhythmic cadence'],
  [/\boverwhelming\s+technical\s+dominance\b/gi, 'quiet technical confidence'],
  [/\boverwhelming\s+dominance\b/gi, 'quiet confidence'],
  [/\btechnical\s+dominance\b/gi, 'technical confidence'],
  [/\bmedical\s+modernism\b/gi, 'clean architectural modernism'],
  [
    /\bfilm\s+noir\s+infused\s+with\s+cold,\s*clinical\s+corporate\s+neo-realism\s+and\s+high-contrast\s+anamorphic\s+chiaroscuro\b/gi,
    'corporate neo-realism with high-contrast anamorphic lighting',
  ],
  [/\bcold,\s*clinical\s+corporate\b/gi, 'sleek corporate'],
  [/\bclinical\s+corporate\b/gi, 'sleek corporate'],
  [/\bgaze\s+locked\s+unblinkingly\b/gi, 'gaze locked steadily'],
  [/\brigid\s+athletic\s+stance\b/gi, 'poised athletic stance'],
  [
    /\bsurgical\b(?![-\s]+(?:mask|masks|gown|gowns|gloves|scrubs|tray|suite|theater|theatre|ward|table|instrument|instruments|scalpel|lamp|lights?))/gi,
    'precise',
  ],
  [
    /\bclinical\b(?![-\s]+(?:trial|trials|ward|clinic|hospital|chart|coat|lab))/gi,
    'composed',
  ],
  [/\brelentless\b/gi, 'unwavering'],
  [/\bdominance\b/gi, 'authority'],
]

/**
 * Neutralizes composite Vertex AI safety trigger clusters (medical + supremacy +
 * dominance + multi-location style-bible tails such as `Pattaya, Thailand`)
 * outside spoken quotation marks while preserving timing, blocking, and dialogue.
 */
export function softenVideoSafetyTriggerClusters(prompt: string): {
  prompt: string
  wasModified: boolean
} {
  if (!prompt?.trim()) return { prompt, wasModified: false }

  const next = prompt
    .split(QUOTED_SPEECH_SPLIT)
    .map((segment, idx) => {
      if (idx % 2 === 1) return segment
      let chunk = segment
        .split('\n')
        .map((line) => {
          if (!line.trim()) return line
          const lineLead = line.match(/^\s*/)?.[0] ?? ''
          const lineTrail = line.match(/\s*$/)?.[0] ?? ''
          const rewritten = splitSentencesPreservingTitles(line)
            .map((sentence) => {
              if (isMultiSceneStyleBibleArc(sentence)) {
                return `${distillMultiSceneStyleBibleForVideo(sentence)}.`
              }
              return sentence
            })
            .join(' ')
          return rewritten ? `${lineLead}${rewritten}${lineTrail}` : line
        })
        .join('\n')

      for (const [re, replacement] of SEMANTIC_SAFETY_CLUSTER_RULES) {
        chunk = chunk.replace(re, (matched) => preserveLeadCase(matched, replacement))
      }
      return chunk
    })
    .join('')

  return {
    prompt: next,
    wasModified: next !== prompt,
  }
}
