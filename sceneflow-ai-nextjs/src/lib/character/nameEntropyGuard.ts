/**
 * Deterministic Name Entropy Guard
 *
 * Audits generated Blueprint character names for:
 *  1. Overused LLM default first names / surnames (unless explicitly requested in user input)
 *  2. Cross-project cast repetition (recent character names from the creator's previous projects)
 *  3. Phonetic / initial collision among top leads
 *
 * When violations are found on non-user-supplied names, `enforceNameEntropyOnTreatment`
 * deterministically remaps offending names across the entire treatment payload
 * (`character_descriptions`, `beats`, `protagonist`, `antagonist`, `synopsis`, `logline`,
 * `familyRelationships`) with zero extra LLM latency.
 */

import {
  BANNED_AI_CHARACTER_NAMES,
  BANNED_AI_FIRST_NAMES,
  BANNED_AI_SURNAMES,
} from './characterNamingPrompt'

const BANNED_FIRST_SET = new Set(BANNED_AI_FIRST_NAMES.map((n) => n.toLowerCase()))
const BANNED_SURNAME_SET = new Set(BANNED_AI_SURNAMES.map((n) => n.toLowerCase()))
const BANNED_FULL_SET = new Set(BANNED_AI_CHARACTER_NAMES.map((n) => n.toLowerCase()))

export interface NameEntropyViolation {
  characterName: string
  reason: 'banned_first_name' | 'banned_surname' | 'banned_full_name' | 'recent_project_duplicate' | 'lead_initial_collision'
  detail: string
}

export interface NameEntropyReport {
  score: number
  passed: boolean
  violations: NameEntropyViolation[]
  remapped?: Array<{ from: string; to: string; reason: string }>
}

/**
 * Diverse, grounded, TTS-friendly replacement pools organized by gender presentation.
 * Intentionally avoids every name in BANNED_AI_FIRST_NAMES / BANNED_AI_SURNAMES.
 */
const REPLACEMENT_FIRST_NAMES: Record<'female' | 'male' | 'neutral', string[]> = {
  female: [
    'Tessa', 'Nadia', 'Priya', 'Simone', 'Hannah', 'Carmen', 'Fumiko', 'Sonia',
    'Maren', 'Beatrice', 'Amara', 'Dahlia', 'Rory', 'Ingrid', 'Paloma', 'Zora',
    'Wendy', 'Corinne', 'Bettina', 'Farah', 'Talia', 'Noemi', 'Greta', 'Linnea',
  ],
  male: [
    'Tomas', 'Gideon', 'Devon', 'Hector', 'Kenzo', 'Nolan', 'Rafael', 'Idris',
    'Calum', 'Bram', 'Soren', 'Dante', 'Kofi', 'Emil', 'Walter', 'Paco',
    'Grant', 'Tariq', 'Henrik', 'Milo', 'Oskar', 'Cyrus', 'Ruben', 'Desmond',
  ],
  neutral: [
    'Sasha', 'Quinn', 'Rowan', 'Avery', 'Devon', 'Remy', 'Robin', 'Hollis',
    'Shiloh', 'Ellis', 'Kieran', 'Sage', 'Linden', 'Toby', 'Marlowe', 'Frankie',
  ],
}

const REPLACEMENT_SURNAMES = [
  'Kowalski', 'Delgado', 'Okafor', 'Takahashi', 'Lindqvist', 'Bhatia', 'Gallagher', 'Alvarez',
  'Novak', 'Chaudhary', 'Mendez', 'Sato', 'Keller', 'Bianchi', 'Diallo', 'Haddad',
  'Perrin', 'Cavanagh', 'Nogueira', 'Varga', 'Osei', 'Fujimoto', 'Molina', 'Bauer',
  'Khoury', 'Solberg', 'Ramos', 'Petrov', 'Ibrahim', 'Donnelly', 'Castillo', 'Park',
]

/** Strip trailing life-stage suffix like " (Age 32)" to inspect the base name. */
export function stripAgeStageSuffix(rawName: string): { baseName: string; suffix: string } {
  const trimmed = (rawName || '').trim()
  const match = trimmed.match(/^(.*?)(\s*\(Age\s+\d+\))$/i)
  if (match) {
    return { baseName: match[1].trim(), suffix: match[2] }
  }
  return { baseName: trimmed, suffix: '' }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function nameAppearsInUserInput(baseName: string, userInput?: string): boolean {
  if (!userInput || !baseName) return false
  const normalizedInput = userInput.toLowerCase()
  const parts = baseName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3)
  if (parts.length === 0) return false
  if (normalizedInput.includes(baseName.toLowerCase())) return true
  // Check exact word-boundary match for first name if user explicitly wrote it
  const first = parts[0]
  return new RegExp(`\\b${escapeRegExp(first)}\\b`, 'i').test(userInput)
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Audit a cast list for AI-default clichés, cross-project repetition, and initial collisions.
 */
export function auditBlueprintCharacterNames(
  characters: Array<{ name?: string; role?: string }>,
  opts?: {
    userInput?: string
    recentProjectNames?: string[]
  }
): NameEntropyReport {
  const violations: NameEntropyViolation[] = []
  const recentSet = new Set(
    (opts?.recentProjectNames || [])
      .map((n) => stripAgeStageSuffix(n).baseName.toLowerCase())
      .filter(Boolean)
  )
  const seenBase = new Set<string>()
  const leadInitials: Array<{ initial: string; baseName: string }> = []

  for (const char of characters) {
    const rawName = (char.name || '').trim()
    if (!rawName) continue
    const { baseName } = stripAgeStageSuffix(rawName)
    const lowerBase = baseName.toLowerCase()
    if (seenBase.has(lowerBase)) continue
    seenBase.add(lowerBase)

    const userProvided = nameAppearsInUserInput(baseName, opts?.userInput)
    const tokens = baseName.split(/\s+/).filter(Boolean)
    const first = (tokens[0] || '').toLowerCase()
    const last = tokens.length > 1 ? tokens[tokens.length - 1].toLowerCase() : ''

    if (!userProvided) {
      if (BANNED_FULL_SET.has(lowerBase)) {
        violations.push({
          characterName: baseName,
          reason: 'banned_full_name',
          detail: `"${baseName}" is on the banned AI-default name list`,
        })
      } else {
        if (first && BANNED_FIRST_SET.has(first)) {
          violations.push({
            characterName: baseName,
            reason: 'banned_first_name',
            detail: `First name "${tokens[0]}" is an overused LLM default`,
          })
        }
        if (last && BANNED_SURNAME_SET.has(last)) {
          violations.push({
            characterName: baseName,
            reason: 'banned_surname',
            detail: `Surname "${tokens[tokens.length - 1]}" is an overused LLM default`,
          })
        }
      }

      if (recentSet.has(lowerBase)) {
        violations.push({
          characterName: baseName,
          reason: 'recent_project_duplicate',
          detail: `"${baseName}" was already used in a recent project by this creator`,
        })
      }
    }

    const role = (char.role || '').toLowerCase()
    if (leadInitials.length < 3 && (role === 'protagonist' || role === 'antagonist' || leadInitials.length < 2)) {
      const initial = first.charAt(0).toUpperCase()
      if (initial) {
        const collision = leadInitials.find((l) => l.initial === initial)
        if (collision && !userProvided) {
          violations.push({
            characterName: baseName,
            reason: 'lead_initial_collision',
            detail: `"${baseName}" shares starting initial "${initial}" with lead "${collision.baseName}"`,
          })
        }
        leadInitials.push({ initial, baseName })
      }
    }
  }

  let penalty = 0
  for (const v of violations) {
    if (v.reason === 'banned_full_name') penalty += 30
    else if (v.reason === 'banned_first_name' || v.reason === 'banned_surname') penalty += 20
    else if (v.reason === 'recent_project_duplicate') penalty += 15
    else if (v.reason === 'lead_initial_collision') penalty += 8
  }

  const score = Math.max(0, 100 - penalty)
  const hardFailure = violations.some(
    (v) =>
      v.reason === 'banned_full_name' ||
      v.reason === 'banned_first_name' ||
      v.reason === 'banned_surname' ||
      v.reason === 'recent_project_duplicate'
  )

  return {
    score,
    passed: !hardFailure && score >= 80,
    violations,
  }
}

function replaceNameInText(text: unknown, oldBase: string, newBase: string): unknown {
  if (typeof text !== 'string' || !text) return text
  const oldTokens = oldBase.split(/\s+/).filter(Boolean)
  const newTokens = newBase.split(/\s+/).filter(Boolean)
  let updated = text.replace(new RegExp(`\\b${escapeRegExp(oldBase)}\\b`, 'g'), newBase)

  // Also replace standalone first name if it changed and is >= 3 chars
  if (oldTokens[0] && newTokens[0] && oldTokens[0] !== newTokens[0] && oldTokens[0].length >= 3) {
    updated = updated.replace(new RegExp(`\\b${escapeRegExp(oldTokens[0])}\\b`, 'g'), newTokens[0])
  }
  // Also replace standalone surname if it changed and is >= 4 chars
  const oldLast = oldTokens.length > 1 ? oldTokens[oldTokens.length - 1] : ''
  const newLast = newTokens.length > 1 ? newTokens[newTokens.length - 1] : ''
  if (oldLast && newLast && oldLast !== newLast && oldLast.length >= 4) {
    updated = updated.replace(new RegExp(`\\b${escapeRegExp(oldLast)}\\b`, 'g'), newLast)
  }

  return updated
}

function pickFreshName(opts: {
  oldBase: string
  gender?: string
  replaceFirst: boolean
  replaceLast: boolean
  usedFirstNames: Set<string>
  usedSurnames: Set<string>
  usedInitials: Set<string>
  recentBaseSet: Set<string>
  seedKey: string
}): string {
  const tokens = opts.oldBase.split(/\s+/).filter(Boolean)
  const currentFirst = tokens[0] || ''
  const currentLast = tokens.length > 1 ? tokens[tokens.length - 1] : ''
  const genderNorm = (opts.gender || '').toLowerCase()
  const poolKey: 'female' | 'male' | 'neutral' =
    genderNorm.startsWith('f') ? 'female' : genderNorm.startsWith('m') ? 'male' : 'neutral'
  const firstPool = REPLACEMENT_FIRST_NAMES[poolKey]
  const startIdx = hashSeed(`${opts.seedKey}:${opts.oldBase}`)

  let chosenFirst = currentFirst
  if (opts.replaceFirst || !chosenFirst) {
    for (let offset = 0; offset < firstPool.length; offset += 1) {
      const candidate = firstPool[(startIdx + offset) % firstPool.length]
      const lower = candidate.toLowerCase()
      if (
        !opts.usedFirstNames.has(lower) &&
        !opts.usedInitials.has(candidate.charAt(0).toUpperCase())
      ) {
        chosenFirst = candidate
        break
      }
    }
    if (!chosenFirst || opts.usedFirstNames.has(chosenFirst.toLowerCase())) {
      chosenFirst = firstPool.find((c) => !opts.usedFirstNames.has(c.toLowerCase())) || firstPool[startIdx % firstPool.length]
    }
  }

  let chosenLast = currentLast
  if (opts.replaceLast && currentLast) {
    for (let offset = 0; offset < REPLACEMENT_SURNAMES.length; offset += 1) {
      const candidate = REPLACEMENT_SURNAMES[(startIdx + offset * 3) % REPLACEMENT_SURNAMES.length]
      const lower = candidate.toLowerCase()
      const fullLower = `${chosenFirst} ${candidate}`.toLowerCase()
      if (!opts.usedSurnames.has(lower) && !opts.recentBaseSet.has(fullLower)) {
        chosenLast = candidate
        break
      }
    }
  }

  opts.usedFirstNames.add(chosenFirst.toLowerCase())
  if (chosenFirst) opts.usedInitials.add(chosenFirst.charAt(0).toUpperCase())
  if (chosenLast) opts.usedSurnames.add(chosenLast.toLowerCase())

  return chosenLast ? `${chosenFirst} ${chosenLast}` : chosenFirst
}

/**
 * Deterministically inspect and repair banned or repeated AI character names across a treatment.
 * Preserves any character names explicitly written in the creator's input.
 */
export function enforceNameEntropyOnTreatment<T extends Record<string, any>>(
  treatment: T,
  opts?: {
    userInput?: string
    recentProjectNames?: string[]
    seedKey?: string
  }
): { treatment: T; report: NameEntropyReport } {
  const chars = Array.isArray(treatment?.character_descriptions)
    ? treatment.character_descriptions
    : []

  const initialAudit = auditBlueprintCharacterNames(chars, opts)
  const hardViolations = initialAudit.violations.filter(
    (v) =>
      v.reason === 'banned_full_name' ||
      v.reason === 'banned_first_name' ||
      v.reason === 'banned_surname' ||
      v.reason === 'recent_project_duplicate'
  )

  if (hardViolations.length === 0) {
    return { treatment, report: initialAudit }
  }

  const usedFirstNames = new Set<string>()
  const usedSurnames = new Set<string>()
  const usedInitials = new Set<string>()
  const recentBaseSet = new Set(
    (opts?.recentProjectNames || [])
      .map((n) => stripAgeStageSuffix(n).baseName.toLowerCase())
      .filter(Boolean)
  )

  // Seed already-valid cast names so replacements never collide with them
  for (const c of chars) {
    const { baseName } = stripAgeStageSuffix(String(c?.name || ''))
    const tokens = baseName.split(/\s+/).filter(Boolean)
    if (tokens[0]) {
      usedFirstNames.add(tokens[0].toLowerCase())
      usedInitials.add(tokens[0].charAt(0).toUpperCase())
    }
    if (tokens.length > 1) {
      usedSurnames.add(tokens[tokens.length - 1].toLowerCase())
    }
  }

  const baseNameRemap = new Map<string, { newBase: string; reason: string }>()
  const seedKey = opts?.seedKey || String(treatment?.title || treatment?.logline || 'sceneflow')

  for (const c of chars) {
    const { baseName } = stripAgeStageSuffix(String(c?.name || ''))
    if (!baseName || baseNameRemap.has(baseName)) continue

    const charViolations = hardViolations.filter((v) => v.characterName === baseName)
    if (charViolations.length === 0) continue

    const replaceFirst = charViolations.some(
      (v) =>
        v.reason === 'banned_first_name' ||
        v.reason === 'banned_full_name' ||
        v.reason === 'recent_project_duplicate'
    )
    const replaceLast = charViolations.some(
      (v) =>
        v.reason === 'banned_surname' ||
        v.reason === 'banned_full_name' ||
        v.reason === 'recent_project_duplicate'
    )

    const newBase = pickFreshName({
      oldBase: baseName,
      gender: c?.gender,
      replaceFirst,
      replaceLast,
      usedFirstNames,
      usedSurnames,
      usedInitials,
      recentBaseSet,
      seedKey,
    })

    if (newBase !== baseName) {
      baseNameRemap.set(baseName, {
        newBase,
        reason: charViolations.map((v) => v.reason).join(','),
      })
    }
  }

  if (baseNameRemap.size === 0) {
    return { treatment, report: initialAudit }
  }

  const next: Record<string, any> = { ...treatment }
  const remapped: Array<{ from: string; to: string; reason: string }> = []

  const applyAllRemapsToString = (val: unknown): unknown => {
    let cur = val
    for (const [oldBase, { newBase }] of baseNameRemap.entries()) {
      cur = replaceNameInText(cur, oldBase, newBase)
    }
    return cur
  }

  for (const [oldBase, { newBase, reason }] of baseNameRemap.entries()) {
    remapped.push({ from: oldBase, to: newBase, reason })
  }

  next.character_descriptions = chars.map((c: any) => {
    const { baseName, suffix } = stripAgeStageSuffix(String(c?.name || ''))
    const entry = baseNameRemap.get(baseName)
    const updatedName = entry ? `${entry.newBase}${suffix}` : c.name
    const updatedFamily = Array.isArray(c.familyRelationships)
      ? c.familyRelationships.map((rel: any) => {
          const relParsed = stripAgeStageSuffix(String(rel?.relatedCharacterName || ''))
          const relEntry = baseNameRemap.get(relParsed.baseName)
          return relEntry
            ? { ...rel, relatedCharacterName: `${relEntry.newBase}${relParsed.suffix}` }
            : rel
        })
      : c.familyRelationships

    return {
      ...c,
      name: updatedName,
      subject: applyAllRemapsToString(c.subject),
      description: applyAllRemapsToString(c.description),
      familyRelationships: updatedFamily,
    }
  })

  if (Array.isArray(next.beats)) {
    next.beats = next.beats.map((beat: any) => ({
      ...beat,
      title: applyAllRemapsToString(beat.title),
      intent: applyAllRemapsToString(beat.intent),
      synopsis: applyAllRemapsToString(beat.synopsis),
      characters: Array.isArray(beat.characters)
        ? beat.characters.map((n: string) => {
            const parsed = stripAgeStageSuffix(String(n || ''))
            const entry = baseNameRemap.get(parsed.baseName)
            return entry ? `${entry.newBase}${parsed.suffix}` : n
          })
        : beat.characters,
    }))
  }

  for (const field of [
    'title',
    'logline',
    'synopsis',
    'protagonist',
    'antagonist',
    'character_focus',
    'story_strengths',
    'opening_hook',
  ] as const) {
    if (typeof next[field] === 'string') {
      next[field] = applyAllRemapsToString(next[field])
    }
  }

  const finalAudit = auditBlueprintCharacterNames(next.character_descriptions, opts)
  return {
    treatment: next as T,
    report: {
      ...finalAudit,
      remapped,
    },
  }
}
