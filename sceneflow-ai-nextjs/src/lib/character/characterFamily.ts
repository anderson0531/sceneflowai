/**
 * Character Family, Kinship & Genetic Continuity Engine
 *
 * Ensures ensemble casts maintain biological and generational consistency across
 * Series Studio, Blueprint Studio, Script Generation, and Production Continuity:
 * - Infers family relationships from explicit metadata, character bios, surnames, and script scenes.
 * - Enforces shared ethnicity for single-heritage biological families and explicit
 *   mixed/blended ethnicity when biological parents have different ethnicities.
 * - Reconciles biologically plausible age gaps across grandparents, parents, children, and siblings.
 * - Produces English visual continuity clauses for portrait prompts and orders family anchors first.
 */

import { normalizeCharacterName } from '@/lib/character/detection'
import {
  extractSamePersonAgeStage,
  enforceSamePersonAgeStageConsistency,
  inferExplicitCharacterEthnicityFromProse,
} from '@/lib/character/ageStageContinuity'

export { inferExplicitCharacterEthnicityFromProse }

export type KinshipRelationType =
  | 'parent_of'
  | 'child_of'
  | 'sibling_of'
  | 'grandparent_of'
  | 'grandchild_of'
  | 'spouse_of'
  | 'extended_kin_of'

export interface CharacterFamilyRelationship {
  /** Canonical name of the related cast member */
  relatedCharacterName: string
  /** Optional stable ID of the related cast member */
  relatedCharacterId?: string
  /** Direction from THIS character to `relatedCharacterName` */
  relation: KinshipRelationType
  /** True for genetic bloodline relations; false for spouses, step-relatives, or adoptive links */
  biological: boolean
  /** Optional human-readable label (e.g., "Mother of Kai", "Twin sister of Mateo") */
  label?: string
}

export interface FamilyAwareCharacter {
  id?: string
  name?: string
  role?: string
  type?: string
  subject?: string
  age?: string | number
  ageRange?: string
  gender?: string
  ethnicity?: string
  hairStyle?: string
  hairColor?: string
  eyeColor?: string
  keyFeature?: string
  build?: string
  expression?: string
  appearance?: string
  appearanceDescription?: string
  description?: string
  backstory?: string
  samePersonGroupId?: string
  familyRelationships?: CharacterFamilyRelationship[]
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function reciprocalRelation(relation: KinshipRelationType): KinshipRelationType {
  switch (relation) {
    case 'parent_of':
      return 'child_of'
    case 'child_of':
      return 'parent_of'
    case 'grandparent_of':
      return 'grandchild_of'
    case 'grandchild_of':
      return 'grandparent_of'
    case 'sibling_of':
      return 'sibling_of'
    case 'spouse_of':
      return 'spouse_of'
    case 'extended_kin_of':
      return 'extended_kin_of'
  }
}

/**
 * Normalize loose LLM or user relationship strings into canonical directional `KinshipRelationType`.
 *
 * Examples:
 * - "parent_of", "mother of X", "biological_parent" -> { relation: 'parent_of', biological: true }
 * - "child_of", "son of X", "daughter" -> { relation: 'child_of', biological: true }
 * - "wife", "husband of X", "spouse", "partner" -> { relation: 'spouse_of', biological: false }
 * - "adoptive mother", "stepfather" -> { relation: 'parent_of', biological: false }
 */
export function normalizeKinshipRelation(
  rawRelation: unknown,
  explicitBiological?: unknown,
  rawLabel?: unknown
): { relation: KinshipRelationType; biological: boolean } | null {
  const combined = `${cleanText(rawRelation)} ${cleanText(rawLabel)}`.toLowerCase().trim()
  if (!combined) return null

  const nonBioCue = /\b(adoptive|adopted|step[-\s]?|foster|in[-\s]?law|godmother|godfather|spouse|husband|wife|partner|fianc[eé]+|married)\b/i.test(
    combined
  )
  const bioDefault = typeof explicitBiological === 'boolean' ? explicitBiological : !nonBioCue

  if (/\b(spouse_of|spouse|husband|wife|partner|married|fianc[eé]+)\b/.test(combined)) {
    return { relation: 'spouse_of', biological: false }
  }
  if (/\b(grandparent_of|biological_grandparent|grandmother|grandfather|grandma|grandpa|nana|abuela|abuelo|halmeoni|harabeoji)\b/.test(combined)) {
    return { relation: 'grandparent_of', biological: bioDefault }
  }
  if (/\b(grandchild_of|biological_grandchild|grandson|granddaughter|grandchild)\b/.test(combined)) {
    return { relation: 'grandchild_of', biological: bioDefault }
  }
  if (/\b(parent_of|biological_parent|adoptive_parent_of|mother|father|mom|dad|mama|papa|matriarch|patriarch)\b/.test(combined)) {
    return { relation: 'parent_of', biological: bioDefault }
  }
  if (/\b(child_of|biological_child|adopted_child_of|son|daughter|offspring|firstborn|youngest child)\b/.test(combined)) {
    return { relation: 'child_of', biological: bioDefault }
  }
  if (/\b(sibling_of|biological_sibling|brother|sister|twin|sibling)\b/.test(combined)) {
    return { relation: 'sibling_of', biological: bioDefault }
  }
  if (/\b(extended_kin_of|extended_biological_kin|uncle|aunt|cousin|nephew|niece)\b/.test(combined)) {
    return { relation: 'extended_kin_of', biological: bioDefault }
  }
  return null
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractFirstName(fullName: string): string {
  const cleaned = fullName.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?|capt\.?|lt\.?)\s+/i, '').trim()
  return cleaned.split(/\s+/)[0] || cleaned
}

function extractSurname(fullName: string): string {
  const cleaned = fullName
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '')
    .trim()
  const parts = cleaned.split(/\s+/)
  return parts.length >= 2 ? parts[parts.length - 1]! : ''
}

/**
 * Parse an approximate numeric age from either a number ("42", 42) or a natural band
 * ("late 30s", "mid-60s", "early 20s", "teenager", "child").
 */
export function parseApproximateAge(rawAge: unknown, fallbackText?: string): number | null {
  if (typeof rawAge === 'number' && Number.isFinite(rawAge) && rawAge > 0 && rawAge < 120) {
    return Math.round(rawAge)
  }
  const source = `${cleanText(rawAge)} ${cleanText(fallbackText)}`.trim().toLowerCase()
  if (!source) return null

  // Explicit range like "41-45" or "41–45"
  const rangeMatch = source.match(/\b(\d{1,2})\s*[-–to]+\s*(\d{1,2})\b/)
  if (rangeMatch) {
    const low = Number(rangeMatch[1])
    const high = Number(rangeMatch[2])
    if (low > 0 && high >= low && high < 115) {
      return Math.round((low + high) / 2)
    }
  }

  // Decade band: "early 30s", "mid-40s", "late 50s", "30s"
  const decadeMatch = source.match(/\b(?:(early|mid|late)[-\s]+)?([1-9]0)s\b/)
  if (decadeMatch) {
    const modifier = decadeMatch[1]
    const base = Number(decadeMatch[2])
    if (modifier === 'early') return base + 2
    if (modifier === 'mid') return base + 5
    if (modifier === 'late') return base + 8
    return base + 4
  }

  // Exact age like "age 34", "34 years old", "34-year-old", or standalone 2-digit number when rawAge itself was passed
  const explicitAge =
    source.match(/\b(?:age[d]?|is)\s*(\d{1,2})\b/) ||
    source.match(/\b(\d{1,2})[-\s]*years?[-\s]*old\b/) ||
    source.match(/\b(\d{1,2})\s*yo\b/)
  if (explicitAge) {
    const n = Number(explicitAge[1])
    if (n > 0 && n < 115) return n
  }

  const rawTrimmed = cleanText(rawAge)
  if (/^\d{1,3}$/.test(rawTrimmed)) {
    const n = Number(rawTrimmed)
    if (n > 0 && n < 115) return n
  }

  if (/\b(toddler|infant|baby)\b/.test(source)) return 3
  if (/\b(young child|little boy|little girl)\b/.test(source)) return 7
  if (/\b(preteen|tween)\b/.test(source)) return 11
  if (/\b(child|schoolboy|schoolgirl)\b/.test(source)) return 9
  if (/\b(early teens)\b/.test(source)) return 13
  if (/\b(late teens)\b/.test(source)) return 18
  if (/\b(teenager|teen|adolescent|high school)\b/.test(source)) return 16
  if (/\b(college|university student|young adult)\b/.test(source)) return 21
  if (/\b(middle[-\s]?aged)\b/.test(source)) return 48
  if (/\b(elderly|senior|octogenarian)\b/.test(source)) return 74

  return null
}

/** Format a numeric age into a natural casting band (e.g. 42 -> "early 40s (42)"). */
export function formatAgeBandFromNumber(age: number): string {
  const clamped = Math.max(4, Math.min(98, Math.round(age)))
  if (clamped < 13) return `child (${clamped})`
  if (clamped < 18) return `teenager (${clamped})`
  if (clamped < 20) return `late teens (${clamped})`
  const decade = Math.floor(clamped / 10) * 10
  const rem = clamped % 10
  const qualifier = rem <= 3 ? 'early' : rem <= 6 ? 'mid' : 'late'
  return `${qualifier} ${decade}s`
}

function canonicalEthnicityTokens(ethnicity: string): string {
  const lower = ethnicity
    .toLowerCase()
    .replace(/\b(heritage|descent|ancestry|background|origin|ethnicity|person|man|woman|male|female)\b/g, ' ')
    .replace(/[^a-z\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Map broad synonyms to comparable root keys while keeping regional specificity intact
  if (/^(white|caucasian|european|european american)$/.test(lower)) return 'white-european'
  if (/^(black|african american|afro american)$/.test(lower)) return 'black-african-american'
  if (/^(hispanic|latino|latina|latinx)$/.test(lower)) return 'latino-hispanic'
  return lower
}

export function isMixedEthnicityLabel(ethnicity?: string | null): boolean {
  if (!ethnicity) return false
  return /\b(mixed|biracial|multiracial|blended|eurasian|afro[-\s]?latino|afro[-\s]?asian|half[-\s]+[a-z]+)\b/i.test(
    ethnicity
  )
}

function cleanEthnicityDisplay(raw: string): string {
  return raw
    .replace(/^mixed\s+/i, '')
    .replace(/\s+(heritage|descent|ancestry|background)$/i, '')
    .trim()
}

/** True when two ethnicity labels describe the same ancestral group (or one refines the other, e.g. "East Asian" & "East Asian (Japanese)"). */
export function areEthnicitiesCompatibleSameHeritage(a: string, b: string): boolean {
  const keyA = canonicalEthnicityTokens(a)
  const keyB = canonicalEthnicityTokens(b)
  if (!keyA || !keyB) return false
  if (keyA === keyB) return true
  if (keyA.includes(keyB) || keyB.includes(keyA)) return true
  return false
}

/**
 * Compute the biologically consistent ethnicity for a child given biological parent ethnicities.
 * - Same ethnicity parents -> keeps the more specific shared ethnicity.
 * - Distinct ethnicity parents -> "Mixed [Parent A] and [Parent B] heritage".
 */
export function resolveBiologicalChildEthnicity(
  parentEthnicities: string[],
  existingChildEthnicity?: string | null
): string | null {
  const validParents = parentEthnicities.map((e) => e.trim()).filter(Boolean)
  if (validParents.length === 0) return cleanText(existingChildEthnicity) || null

  // Deduplicate compatible parent ethnicities, keeping the longer/more specific label
  const distinctGroups: string[] = []
  for (const eth of validParents) {
    const matchIdx = distinctGroups.findIndex((existing) =>
      areEthnicitiesCompatibleSameHeritage(existing, eth)
    )
    if (matchIdx >= 0) {
      if (eth.length > distinctGroups[matchIdx]!.length) {
        distinctGroups[matchIdx] = eth
      }
    } else {
      distinctGroups.push(eth)
    }
  }

  const current = cleanText(existingChildEthnicity)

  if (distinctGroups.length >= 2) {
    // Mixed-heritage biological parents!
    const parts = distinctGroups.slice(0, 2).map(cleanEthnicityDisplay)
    const blended = `Mixed ${parts[0]} and ${parts[1]} heritage`
    if (current && isMixedEthnicityLabel(current)) {
      // Keep existing mixed label if it already mentions both parent roots
      const lowerCurrent = current.toLowerCase()
      const mentionsBoth = parts.every((p) => {
        const firstToken = p.toLowerCase().split(/[\s(/,-]+/).find((t) => t.length >= 3)
        return firstToken ? lowerCurrent.includes(firstToken) : false
      })
      if (mentionsBoth) return current
    }
    return blended
  }

  // Single known ancestral heritage across parent(s)
  const sharedParentEthnicity = distinctGroups[0]!
  if (!current) return sharedParentEthnicity

  // If only 1 biological parent is in the cast and the child is ALREADY explicitly marked
  // as mixed heritage incorporating that parent's root, preserve it (other parent may be off-screen).
  if (validParents.length === 1 && isMixedEthnicityLabel(current)) {
    const parentRoot = cleanEthnicityDisplay(sharedParentEthnicity)
      .toLowerCase()
      .split(/[\s(/,-]+/)
      .find((t) => t.length >= 3)
    if (parentRoot && current.toLowerCase().includes(parentRoot)) {
      return current
    }
  }

  if (areEthnicitiesCompatibleSameHeritage(current, sharedParentEthnicity)) {
    return current.length >= sharedParentEthnicity.length ? current : sharedParentEthnicity
  }

  return sharedParentEthnicity
}

/**
 * Infer and reciprocate family relationships across an ensemble cast from explicit
 * `familyRelationships`, character bios (`description`, `subject`, `backstory`, `keyFeature`),
 * and optional script scenes (`dialogue`, `action`).
 */
export function inferFamilyRelationshipsForEnsemble<T extends FamilyAwareCharacter>(
  characters: T[],
  scenes?: Array<Record<string, unknown>>
): T[] {
  if (!Array.isArray(characters) || characters.length <= 1) return characters

  const castIndices: number[] = []
  const byNormName = new Map<string, number>()
  const firstNameCounts = new Map<string, number>()
  const byFirstName = new Map<string, number>()

  characters.forEach((char, idx) => {
    const name = cleanText(char?.name)
    if (!name || char?.type === 'narrator' || char?.role === 'narrator' || char?.type === 'description') {
      return
    }
    castIndices.push(idx)
    const norm = normalizeCharacterName(name)
    if (norm) byNormName.set(norm, idx)
    const first = extractFirstName(name).toUpperCase()
    if (first.length >= 2) {
      firstNameCounts.set(first, (firstNameCounts.get(first) || 0) + 1)
      byFirstName.set(first, idx)
    }
  })

  if (castIndices.length <= 1) return characters

  const edgeMaps = characters.map(() => new Map<number, CharacterFamilyRelationship>())

  const resolveTargetIndex = (rawRef: string, selfIdx: number): number | null => {
    const norm = normalizeCharacterName(rawRef)
    if (!norm) return null
    const exact = byNormName.get(norm)
    if (exact !== undefined && exact !== selfIdx) return exact
    const first = extractFirstName(rawRef).toUpperCase()
    if (first && firstNameCounts.get(first) === 1) {
      const byFirst = byFirstName.get(first)
      if (byFirst !== undefined && byFirst !== selfIdx) return byFirst
    }
    return null
  }

  const addBidirectionalEdge = (
    fromIdx: number,
    toIdx: number,
    relation: KinshipRelationType,
    biological: boolean,
    label?: string
  ) => {
    if (fromIdx === toIdx) return
    const fromChar = characters[fromIdx]!
    const toChar = characters[toIdx]!
    const toName = cleanText(toChar.name)
    const fromName = cleanText(fromChar.name)
    if (!toName || !fromName) return

    const existingForward = edgeMaps[fromIdx]!.get(toIdx)
    if (!existingForward) {
      edgeMaps[fromIdx]!.set(toIdx, {
        relatedCharacterName: toName,
        ...(cleanText(toChar.id) ? { relatedCharacterId: cleanText(toChar.id) } : {}),
        relation,
        biological,
        ...(label ? { label } : {}),
      })
    }

    const revRelation = reciprocalRelation(relation)
    const existingReverse = edgeMaps[toIdx]!.get(fromIdx)
    if (!existingReverse) {
      edgeMaps[toIdx]!.set(fromIdx, {
        relatedCharacterName: fromName,
        ...(cleanText(fromChar.id) ? { relatedCharacterId: cleanText(fromChar.id) } : {}),
        relation: revRelation,
        biological,
      })
    }
  }

  // 1. Ingest explicit `familyRelationships` (or legacy `relationships`)
  for (const idx of castIndices) {
    const char = characters[idx]!
    const rawList = Array.isArray(char.familyRelationships)
      ? char.familyRelationships
      : Array.isArray((char as Record<string, unknown>).relationships)
        ? ((char as Record<string, unknown>).relationships as Array<Record<string, unknown>>)
        : []

    for (const rawEntry of rawList) {
      if (!rawEntry || typeof rawEntry !== 'object') continue
      const entry = rawEntry as Record<string, unknown>
      const targetName =
        cleanText(entry.relatedCharacterName) ||
        cleanText(entry.characterName) ||
        cleanText(entry.name)
      const targetIdx = resolveTargetIndex(targetName, idx)
      if (targetIdx === null) continue
      const parsed = normalizeKinshipRelation(
        entry.relation ?? entry.relationshipType ?? entry.type,
        entry.biological ?? entry.biologicalRelative,
        entry.label ?? entry.notes
      )
      if (!parsed) continue
      addBidirectionalEdge(
        idx,
        targetIdx,
        parsed.relation,
        parsed.biological,
        cleanText(entry.label) || cleanText(entry.notes) || undefined
      )
    }
  }

  // 2. Scan character bios (`subject`, `keyFeature`, `description`, `backstory`) for relational mentions of other cast members
  for (const selfIdx of castIndices) {
    const self = characters[selfIdx]!
    const bioText = [
      cleanText(self.subject),
      cleanText(self.keyFeature),
      cleanText(self.description),
      cleanText(self.backstory),
    ]
      .filter(Boolean)
      .join('. ')
    if (!bioText) continue

    for (const otherIdx of castIndices) {
      if (otherIdx === selfIdx) continue
      const otherName = cleanText(characters[otherIdx]!.name)
      const otherFirst = extractFirstName(otherName)
      const tokensToTry = [otherName]
      if (otherFirst.length >= 3 && firstNameCounts.get(otherFirst.toUpperCase()) === 1) {
        tokensToTry.push(otherFirst)
      }

      for (const nameToken of tokensToTry) {
        const esc = escapeRegex(nameToken)
        const nonBio = new RegExp(
          `\\b(adoptive|adopted|step[-\\s]?|foster|in[-\\s]?law)\\b[^.]{0,35}\\b${esc}\\b|\\b${esc}(?:'s)?\\s+(adoptive|adopted|step[-\\s]?|foster)`,
          'i'
        ).test(bioText)

        // Pattern A: "<OtherName>'s [younger/older/twin/estranged/late] <role>" in SELF's bio -> SELF is <role> of Other
        const possessiveMatch = bioText.match(
          new RegExp(
            `\\b${esc}(?:'s|’s)\\s+(?:[a-z-]+\\s+){0,2}(mother|father|mom|dad|parent|son|daughter|child|brother|sister|twin|sibling|grandmother|grandfather|grandson|granddaughter|husband|wife|spouse|partner)\\b`,
            'i'
          )
        )
        if (possessiveMatch) {
          const roleWord = possessiveMatch[1]!.toLowerCase()
          const parsed = normalizeKinshipRelation(roleWord, !nonBio)
          if (parsed) {
            addBidirectionalEdge(selfIdx, otherIdx, parsed.relation, parsed.biological)
            break
          }
        }

        // Pattern B: "<role> of/to [X and] <OtherName>" in SELF's bio -> SELF is <role> of Other
        const ofMatch = bioText.match(
          new RegExp(
            `\\b(mother|father|mom|dad|parent|son|daughter|brother|sister|twin|sibling|grandmother|grandfather|grandson|granddaughter|husband|wife|spouse|married)\\s+(?:of|to)\\s+(?:[^.;,\\n]{1,45}?\\s+and\\s+)?${esc}\\b`,
            'i'
          )
        )
        if (ofMatch) {
          const roleWord = ofMatch[1]!.toLowerCase()
          const parsed = normalizeKinshipRelation(roleWord, !nonBio)
          if (parsed) {
            addBidirectionalEdge(selfIdx, otherIdx, parsed.relation, parsed.biological)
            break
          }
        }
      }
    }
  }

  // 3. Scan script scenes for direct parental/sibling address in 2-character scenes or action cues
  if (Array.isArray(scenes) && scenes.length > 0) {
    for (const scene of scenes) {
      if (!scene || typeof scene !== 'object') continue
      const dialogue = Array.isArray(scene.dialogue)
        ? (scene.dialogue as Array<Record<string, unknown>>)
        : []
      const speakersInScene = Array.from(
        new Set(
          dialogue
            .map((d) => resolveTargetIndex(cleanText(d?.character), -1))
            .filter((idx): idx is number => idx !== null)
        )
      )

      if (speakersInScene.length === 2) {
        for (const d of dialogue) {
          const speakerIdx = resolveTargetIndex(cleanText(d?.character), -1)
          if (speakerIdx === null) continue
          const listenerIdx = speakersInScene.find((idx) => idx !== speakerIdx)
          if (listenerIdx === undefined) continue
          if (edgeMaps[speakerIdx]!.has(listenerIdx)) continue

          const line = cleanText(d?.line)
          // Direct vocative address at start/end of line: "Mom, listen..." or "...thanks, Dad."
          if (/(?:^|[\s,"'—-])(Mom|Mama|Mother|Dad|Papa|Father)(?:[,!?.—\s]|$)/.test(line)) {
            addBidirectionalEdge(speakerIdx, listenerIdx, 'child_of', true)
          } else if (/(?:^|[\s,"'—-])(Grandma|Grandpa|Grandmother|Grandfather|Nana|Abuela|Abuelo)(?:[,!?.—\s]|$)/.test(line)) {
            addBidirectionalEdge(speakerIdx, listenerIdx, 'grandchild_of', true)
          }
        }
      }
    }
  }

  // 4. Transitive nuclear-family closure:
  // - Two children sharing a biological parent are biological siblings.
  // - If P1 is biological parent_of C, and P2 is spouse_of P1 (and no step/adoptive edge exists), link P2 as biological parent_of C when C shares surname with P1/P2 or has <= 1 biological parent.
  for (const pIdx of castIndices) {
    const bioChildren: number[] = []
    const spouses: number[] = []
    for (const [targetIdx, rel] of edgeMaps[pIdx]!.entries()) {
      if (rel.relation === 'parent_of' && rel.biological) bioChildren.push(targetIdx)
      if (rel.relation === 'spouse_of') spouses.push(targetIdx)
    }

    // Siblings sharing a biological parent
    for (let i = 0; i < bioChildren.length; i++) {
      for (let j = i + 1; j < bioChildren.length; j++) {
        addBidirectionalEdge(bioChildren[i]!, bioChildren[j]!, 'sibling_of', true)
      }
    }

    // Co-parent inference for married couple in cast when child has only 1 linked parent
    if (spouses.length === 1) {
      const spouseIdx = spouses[0]!
      for (const childIdx of bioChildren) {
        if (edgeMaps[spouseIdx]!.has(childIdx)) continue
        const existingBioParentsOfChild = Array.from(edgeMaps[childIdx]!.values()).filter(
          (r) => r.relation === 'child_of' && r.biological
        )
        if (existingBioParentsOfChild.length < 2) {
          addBidirectionalEdge(spouseIdx, childIdx, 'parent_of', true)
        }
      }
    }
  }

  // Biological sibling -> shared biological parent closure:
  // If A and B are biological siblings, and P is a biological parent of A, link P as biological parent of B (unless non-bio edge already exists).
  for (const aIdx of castIndices) {
    const bioSiblings: number[] = []
    const bioParents: number[] = []
    for (const [targetIdx, rel] of Array.from(edgeMaps[aIdx]!.entries())) {
      if (rel.relation === 'sibling_of' && rel.biological) bioSiblings.push(targetIdx)
      if (rel.relation === 'child_of' && rel.biological) bioParents.push(targetIdx)
    }
    for (const sibIdx of bioSiblings) {
      for (const pIdx of bioParents) {
        if (!edgeMaps[pIdx]!.has(sibIdx)) {
          addBidirectionalEdge(pIdx, sibIdx, 'parent_of', true)
        }
      }
    }
  }

  // Grandparent transitive closure (G parent_of P, P parent_of C -> G grandparent_of C)
  for (const gIdx of castIndices) {
    for (const [pIdx, gpRel] of Array.from(edgeMaps[gIdx]!.entries())) {
      if (gpRel.relation !== 'parent_of' || !gpRel.biological) continue
      for (const [cIdx, pcRel] of Array.from(edgeMaps[pIdx]!.entries())) {
        if (pcRel.relation !== 'parent_of' || !pcRel.biological) continue
        addBidirectionalEdge(gIdx, cIdx, 'grandparent_of', true)
      }
    }
  }

  return characters.map((char, idx) => {
    const rels = Array.from(edgeMaps[idx]!.values())
    if (rels.length === 0) return char
    return {
      ...char,
      familyRelationships: rels,
    }
  })
}

/**
 * Enforce ethnic/blended-heritage consistency and biologically plausible generational age spacing
 * across an ensemble cast. Non-destructive when existing fields already satisfy family genetics.
 */
export function enforceEnsembleFamilyConsistency<T extends FamilyAwareCharacter>(
  characters: T[],
  options?: {
    scenes?: Array<Record<string, unknown>>
    defaultLocaleEthnicity?: string
  }
): T[] {
  if (!Array.isArray(characters) || characters.length === 0) return characters

  const withKinship = inferFamilyRelationshipsForEnsemble(characters, options?.scenes)
  const next = withKinship.map((c) => ({ ...c }))

  const byNormName = new Map<string, number>()
  next.forEach((c, idx) => {
    const norm = normalizeCharacterName(cleanText(c.name))
    if (norm) byNormName.set(norm, idx)
  })

  const findIndexForRel = (rel: CharacterFamilyRelationship): number | null => {
    if (rel.relatedCharacterId) {
      const byId = next.findIndex((c) => cleanText(c.id) === rel.relatedCharacterId)
      if (byId >= 0) return byId
    }
    const norm = normalizeCharacterName(rel.relatedCharacterName)
    const byName = norm ? byNormName.get(norm) : undefined
    return byName !== undefined ? byName : null
  }

  // Pass 0: Ground character ethnicity in explicit biographical prose (`description` / `subject` / `appearance`)
  // BEFORE any story-wide locale fallback runs, and self-heal polluted badges that contradict explicit bio prose.
  for (const char of next) {
    if (char.type === 'narrator' || char.role === 'narrator' || char.type === 'description') continue
    const rawDesc = cleanText(char.description)
    const bioEth =
      inferExplicitCharacterEthnicityFromProse(rawDesc) ||
      inferExplicitCharacterEthnicityFromProse(cleanText(char.subject))
    const lookEth = inferExplicitCharacterEthnicityFromProse(
      `${cleanText(char.appearanceDescription)} ${cleanText(char.appearance)}`
    )
    const currentEth = cleanText(char.ethnicity)

    if (!currentEth) {
      const resolvedFromProse = bioEth || lookEth
      if (resolvedFromProse) {
        char.ethnicity = resolvedFromProse
      }
    } else if (
      bioEth &&
      !isMixedEthnicityLabel(currentEth) &&
      !areEthnicitiesCompatibleSameHeritage(bioEth, currentEth)
    ) {
      // Check if the character's own narrative bio mentions any distinctive token of `currentEth`.
      // If NOT (e.g. bio says "African American ... in late-1970s Pittsburgh" while badge says "Southeast Asian (Thai)"),
      // self-heal the polluted badge and scrub any stale auto-generated longitudinal lock!
      const ethTokens = canonicalEthnicityTokens(currentEth)
        .split(/[\s/-]+/)
        .filter((t) => t.length >= 4 && !['asian', 'east', 'south', 'west', 'north', 'white', 'black'].includes(t))
      const descLower = rawDesc.toLowerCase()
      const bioMentionsCurrentEth =
        ethTokens.length > 0 && ethTokens.some((tok) => descLower.includes(tok))
      if (!bioMentionsCurrentEth) {
        char.ethnicity = bioEth
        if (typeof char.appearance === 'string' && /longitudinal identity lock:/i.test(char.appearance)) {
          const stage = extractSamePersonAgeStage(cleanText(char.name))
          const stripped = char.appearance.replace(/\s*Longitudinal identity lock:[\s\S]*$/i, '').trim()
          const rebuiltLock = `Longitudinal identity lock: exact same individual human being as ${stage.baseName || cleanText(char.name)} across life stages — identical ${bioEth} heritage${cleanText(char.eyeColor) ? `, ${cleanText(char.eyeColor)} eyes,` : ''} and underlying facial bone structure, depicted strictly at ${stage.numericAge ? `biological age ${stage.numericAge}` : stage.ageStageLabel || cleanText(char.age) || 'this life stage'}.`
          const healed = stripped ? `${stripped.replace(/\.*\s*$/, '.')} ${rebuiltLock}` : rebuiltLock
          char.appearance = healed
          if ('appearanceDescription' in char) {
            char.appearanceDescription = healed
          }
        }
      }
    }
  }

  // Pass 1: Propagate default locale ethnicity ONLY to root characters with empty ethnicity when provided
  if (options?.defaultLocaleEthnicity?.trim()) {
    const fallbackEth = options.defaultLocaleEthnicity.trim()
    for (const char of next) {
      if (char.type === 'narrator' || char.role === 'narrator' || char.type === 'description') continue
      const hasBioParents = (char.familyRelationships || []).some(
        (r) => (r.relation === 'child_of' || r.relation === 'grandchild_of') && r.biological
      )
      if (!hasBioParents && !cleanText(char.ethnicity)) {
        char.ethnicity = fallbackEth
      }
    }
  }

  // Pass 2: Top-down biological ethnicity inheritance (grandparents -> parents -> children -> siblings)
  // Run 2 iterations so multi-generation chains (grandparent -> parent -> child) settle completely.
  for (let pass = 0; pass < 2; pass++) {
    for (let idx = 0; idx < next.length; idx++) {
      const char = next[idx]!
      const rels = char.familyRelationships || []
      if (rels.length === 0) continue

      const bioParentEthnicities = rels
        .filter((r) => r.relation === 'child_of' && r.biological)
        .map((r) => {
          const pIdx = findIndexForRel(r)
          return pIdx !== null ? cleanText(next[pIdx]!.ethnicity) : ''
        })
        .filter(Boolean)

      if (bioParentEthnicities.length > 0) {
        const resolved = resolveBiologicalChildEthnicity(bioParentEthnicities, cleanText(char.ethnicity))
        if (resolved) {
          char.ethnicity = resolved
        }
        continue
      }

      // If no parents in cast, check biological grandparents
      const bioGrandparentEthnicities = rels
        .filter((r) => r.relation === 'grandchild_of' && r.biological)
        .map((r) => {
          const gIdx = findIndexForRel(r)
          return gIdx !== null ? cleanText(next[gIdx]!.ethnicity) : ''
        })
        .filter(Boolean)

      if (bioGrandparentEthnicities.length > 0 && !cleanText(char.ethnicity)) {
        const resolved = resolveBiologicalChildEthnicity(bioGrandparentEthnicities, cleanText(char.ethnicity))
        if (resolved) char.ethnicity = resolved
        continue
      }

      // Biological siblings: share ethnicity if one is defined and the other is missing (or propagate mixed label)
      const bioSiblingEthnicities = rels
        .filter((r) => r.relation === 'sibling_of' && r.biological)
        .map((r) => {
          const sIdx = findIndexForRel(r)
          return sIdx !== null ? cleanText(next[sIdx]!.ethnicity) : ''
        })
        .filter(Boolean)

      if (bioSiblingEthnicities.length > 0) {
        const mixedSibling = bioSiblingEthnicities.find((e) => isMixedEthnicityLabel(e))
        if (mixedSibling && !isMixedEthnicityLabel(cleanText(char.ethnicity))) {
          char.ethnicity = mixedSibling
        } else if (!cleanText(char.ethnicity)) {
          char.ethnicity = bioSiblingEthnicities[0]!
        }
      }
    }
  }

  // Bottom-up fallback: if a biological parent had NO ethnicity, and only 1 parent exists, and child has a non-mixed ethnicity, backfill parent
  for (let idx = 0; idx < next.length; idx++) {
    const char = next[idx]!
    if (cleanText(char.ethnicity)) continue
    const rels = char.familyRelationships || []
    const bioChildrenEthnicities = rels
      .filter((r) => r.relation === 'parent_of' && r.biological)
      .map((r) => {
        const cIdx = findIndexForRel(r)
        return cIdx !== null ? cleanText(next[cIdx]!.ethnicity) : ''
      })
      .filter((eth) => eth && !isMixedEthnicityLabel(eth))
    if (bioChildrenEthnicities.length > 0) {
      char.ethnicity = bioChildrenEthnicities[0]!
    }
  }

  // Pass 3: Reconcile biologically plausible generational ages
  const approxAges = next.map((char) =>
    parseApproximateAge(
      char.age ?? char.ageRange,
      `${cleanText(char.subject)} ${cleanText(char.description)} ${cleanText(char.appearanceDescription)} ${cleanText(char.appearance)}`
    )
  )

  const MIN_PARENT_GAP = 20
  const NATURAL_PARENT_GAP = 28
  const MIN_GRANDPARENT_GAP = 42
  const NATURAL_GRANDPARENT_GAP = 54

  for (let pass = 0; pass < 2; pass++) {
    for (let idx = 0; idx < next.length; idx++) {
      const char = next[idx]!
      const rels = char.familyRelationships || []
      for (const rel of rels) {
        const otherIdx = findIndexForRel(rel)
        if (otherIdx === null) continue

        const charAgeStage = extractSamePersonAgeStage(cleanText(char.name))
        const otherAgeStage = extractSamePersonAgeStage(cleanText(next[otherIdx]!.name))
        const hasExplicitEraAgeLock = charAgeStage.isAgeVariant || otherAgeStage.isAgeVariant

        if (rel.relation === 'parent_of') {
          const pAge = approxAges[idx]
          const cAge = approxAges[otherIdx]
          if (pAge !== null && cAge === null && !otherAgeStage.isAgeVariant) {
            const inferredChildAge = Math.max(6, pAge - NATURAL_PARENT_GAP)
            approxAges[otherIdx] = inferredChildAge
            const band = formatAgeBandFromNumber(inferredChildAge)
            next[otherIdx]!.age = band
            if ('ageRange' in next[otherIdx]!) next[otherIdx]!.ageRange = band
          } else if (pAge === null && cAge !== null && !charAgeStage.isAgeVariant) {
            const inferredParentAge = Math.min(88, cAge + NATURAL_PARENT_GAP)
            approxAges[idx] = inferredParentAge
            const band = formatAgeBandFromNumber(inferredParentAge)
            char.age = band
            if ('ageRange' in char) char.ageRange = band
          } else if (
            !hasExplicitEraAgeLock &&
            pAge !== null &&
            cAge !== null &&
            pAge - cAge < MIN_PARENT_GAP
          ) {
            // Generational collision in same-era cast! (Skipped when characters carry explicit `(Age NN)` flashback/present locks)
            const childIsProtagonist = cleanText(next[otherIdx]!.role).toLowerCase() === 'protagonist'
            if (childIsProtagonist || cAge <= 26) {
              const adjustedParent = Math.min(90, cAge + NATURAL_PARENT_GAP)
              approxAges[idx] = adjustedParent
              const band = formatAgeBandFromNumber(adjustedParent)
              char.age = band
              if ('ageRange' in char) char.ageRange = band
            } else {
              const adjustedChild = Math.max(8, pAge - NATURAL_PARENT_GAP)
              approxAges[otherIdx] = adjustedChild
              const band = formatAgeBandFromNumber(adjustedChild)
              next[otherIdx]!.age = band
              if ('ageRange' in next[otherIdx]!) next[otherIdx]!.ageRange = band
            }
          }
        }

        if (rel.relation === 'grandparent_of') {
          const gAge = approxAges[idx]
          const cAge = approxAges[otherIdx]
          if (gAge === null && cAge !== null && !charAgeStage.isAgeVariant) {
            const inferredGrand = Math.min(92, cAge + NATURAL_GRANDPARENT_GAP)
            approxAges[idx] = inferredGrand
            const band = formatAgeBandFromNumber(inferredGrand)
            char.age = band
            if ('ageRange' in char) char.ageRange = band
          } else if (gAge !== null && cAge === null && !otherAgeStage.isAgeVariant) {
            const inferredGrandchild = Math.max(6, gAge - NATURAL_GRANDPARENT_GAP)
            approxAges[otherIdx] = inferredGrandchild
            const band = formatAgeBandFromNumber(inferredGrandchild)
            next[otherIdx]!.age = band
            if ('ageRange' in next[otherIdx]!) next[otherIdx]!.ageRange = band
          } else if (
            !hasExplicitEraAgeLock &&
            gAge !== null &&
            cAge !== null &&
            gAge - cAge < MIN_GRANDPARENT_GAP
          ) {
            const adjustedGrand = Math.min(94, cAge + NATURAL_GRANDPARENT_GAP)
            approxAges[idx] = adjustedGrand
            const band = formatAgeBandFromNumber(adjustedGrand)
            char.age = band
            if ('ageRange' in char) char.ageRange = band
          }
        }
      }
    }
  }

  return enforceSamePersonAgeStageConsistency(next)
}

/**
 * Build a concise English visual continuity clause for a character's family genetics
 * so portrait generation renders unmistakable familial resemblance & age contrast
 * without cloning the exact same individual.
 */
export function buildFamilialVisualContinuityClause(
  character: FamilyAwareCharacter,
  allCharacters?: ReadonlyArray<FamilyAwareCharacter>
): string {
  const rels = Array.isArray(character.familyRelationships) ? character.familyRelationships : []
  const bioRels = rels.filter((r) => r.biological)
  if (bioRels.length === 0) return ''

  const castList = allCharacters || []
  const findRelChar = (rel: CharacterFamilyRelationship): FamilyAwareCharacter | undefined =>
    castList.find(
      (c) =>
        (rel.relatedCharacterId && cleanText(c.id) === rel.relatedCharacterId) ||
        normalizeCharacterName(cleanText(c.name)) === normalizeCharacterName(rel.relatedCharacterName)
    )

  const parentRels = bioRels.filter((r) => r.relation === 'child_of')
  if (parentRels.length > 0) {
    const parentSummaries = parentRels.map((r) => {
      const p = findRelChar(r)
      const pEth = cleanText(p?.ethnicity)
      return pEth ? `${r.relatedCharacterName} (${pEth})` : r.relatedCharacterName
    })
    const eth = cleanText(character.ethnicity)
    const age = cleanText(character.age ?? character.ageRange)
    const sharedTraits: string[] = []
    for (const r of parentRels) {
      const p = findRelChar(r)
      if (!p) continue
      if (cleanText(p.eyeColor) && !sharedTraits.some((t) => t.includes('eyes'))) {
        sharedTraits.push(`inherited ${cleanText(p.eyeColor).toLowerCase()} eye genetics`)
      }
      if (cleanText(p.hairColor) && !sharedTraits.some((t) => t.includes('hair'))) {
        sharedTraits.push(`${cleanText(p.hairColor).toLowerCase()} hair pigment family`)
      }
    }
    const traitPhrase =
      sharedTraits.length > 0
        ? `, subtle familial facial bone-structure resemblance with ${sharedTraits.join(' and ')}`
        : ', subtle familial facial bone-structure resemblance'
    const agePhrase = age ? `, distinctly ${age} generation` : ''
    return `Familial lineage: biological child of ${parentSummaries.join(' and ')}${eth ? ` (${eth})` : ''}${traitPhrase}${agePhrase}.`
  }

  const siblingRels = bioRels.filter((r) => r.relation === 'sibling_of')
  if (siblingRels.length > 0) {
    const names = siblingRels.map((r) => r.relatedCharacterName).join(' and ')
    const eth = cleanText(character.ethnicity)
    return `Familial lineage: biological sibling of ${names}${eth ? ` (${eth})` : ''}, sharing ancestral skin undertone and subtle family facial structure while remaining a distinct individual.`
  }

  return ''
}

/**
 * Order characters so older-generation biological family anchors (grandparents -> parents)
 * and protagonists are planned ahead of biological descendants in Reference Express.
 */
export function sortCharactersFamilyAnchorsFirst<T extends FamilyAwareCharacter>(
  characters: T[]
): T[] {
  if (!Array.isArray(characters) || characters.length <= 1) return characters

  const generationScore = (char: T): number => {
    const rels = Array.isArray(char.familyRelationships) ? char.familyRelationships : []
    let score = 0
    if (rels.some((r) => r.relation === 'grandparent_of' && r.biological)) score -= 30
    if (rels.some((r) => r.relation === 'parent_of' && r.biological)) score -= 15
    if (rels.some((r) => r.relation === 'child_of' && r.biological)) score += 15
    if (rels.some((r) => r.relation === 'grandchild_of' && r.biological)) score += 30
    return score
  }

  return characters
    .map((char, originalIndex) => ({ char, originalIndex, score: generationScore(char) }))
    .sort((a, b) => (a.score !== b.score ? a.score - b.score : a.originalIndex - b.originalIndex))
    .map((entry) => entry.char)
}
