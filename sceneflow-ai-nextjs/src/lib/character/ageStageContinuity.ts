/**
 * Multi-Age / Multi-Era Character Continuity & Individual-Only Cast Enforcement
 *
 * Production Stage character references intentionally lock ONE base facial portrait (`referenceImage`)
 * per character card and vary outfits via Wardrobes. Therefore:
 * 1. Characters appearing at meaningfully different ages or eras (e.g., childhood, youth, midlife,
 *    senior years — critical in Video Memoirs and multi-decade narratives) MUST be modeled as
 *    SEPARATE individual character entries (e.g. `John Miller (Age 16)`, `John Miller (Age 32)`,
 *    `John Miller (Age 62)`) sharing core genetic traits (`ethnicity`, `eyeColor`, bone structure).
 * 2. Every character MUST be a single named individual — NEVER a plural or collective group
 *    (`"John's Friends"`, `"The Brothers"`, `"Neighbors"`, `"Factory Workers"`).
 */

const SCREENPLAY_DELIVERY_TAG_INNER =
  /^(?:v\.?\s*o\.?|voice\s*[- ]?over|o\.?\s*s\.?|off\s*[- ]?screen|o\.?\s*c\.?|off\s*[- ]?camera|cont['’]?d\.?|continued|cont\.?|filtered|on\s+(?:phone|radio|tv|monitor|speaker|intercom|tape)|into\s+(?:phone|mic|microphone|radio)|over\s+(?:phone|radio|speaker|intercom)|pre\s*[- ]?lap|subtitled|whispering|sotto\s+voce|archive\s+audio|archival\s+audio)$/i

/**
 * Strip ONLY screenplay delivery/technical parentheticals like `(V.O.)`, `(O.S.)`, `(CONT'D)`,
 * while strictly preserving character age/era qualifiers like `(Age 16)`, `(Age 32)`, `(1978)`, `(Young)`.
 */
export function stripScreenplayDeliveryAnnotations(input: string): string {
  if (!input) return ''
  return input
    .replace(/\s*\(([^)]*)\)/g, (fullMatch, inner: string) => {
      const trimmedInner = inner.trim()
      if (!trimmedInner) return ''
      if (SCREENPLAY_DELIVERY_TAG_INNER.test(trimmedInner)) {
        return ''
      }
      return ` (${trimmedInner})`
    })
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ParsedAgeStageInfo {
  isAgeVariant: boolean
  baseName: string
  ageStageLabel?: string
  numericAge?: number
}

/**
 * Detect whether a character name carries an age/era life-stage qualifier:
 * - `"John Miller (Age 16)"` -> `{ isAgeVariant: true, baseName: "John Miller", ageStageLabel: "Age 16", numericAge: 16 }`
 * - `"John Miller Age 32"` -> `{ isAgeVariant: true, baseName: "John Miller", ageStageLabel: "Age 32", numericAge: 32 }`
 * - `"John Miller (16)"` -> `{ isAgeVariant: true, baseName: "John Miller", ageStageLabel: "Age 16", numericAge: 16 }`
 * - `"Young John Miller"` -> `{ isAgeVariant: true, baseName: "John Miller", ageStageLabel: "Young" }`
 */
export function extractSamePersonAgeStage(rawName: string): ParsedAgeStageInfo {
  const cleaned = stripScreenplayDeliveryAnnotations(rawName || '')
  if (!cleaned) {
    return { isAgeVariant: false, baseName: '' }
  }

  // 1. Parenthetical `(Age 16)`, `(Aged 32)`, `(16 yrs)`, `(16)`
  const parenAgeMatch = cleaned.match(
    /^(.*?)\s*\(\s*(?:age[d]?\s*)?(\d{1,3})(?:\s*(?:yo|yrs?|years?\s*old))?\s*\)\s*$/i
  )
  if (parenAgeMatch) {
    const base = parenAgeMatch[1]!.trim()
    const num = Number(parenAgeMatch[2])
    if (base && num > 0 && num < 120) {
      return {
        isAgeVariant: true,
        baseName: base,
        ageStageLabel: `Age ${num}`,
        numericAge: num,
      }
    }
  }

  // 2. Parenthetical era/life-stage `(1968)`, `(1970s)`, `(Young)`, `(Teen)`, `(Child)`, `(Elder)`, `(Early 20s)`
  const parenEraMatch = cleaned.match(
    /^(.*?)\s*\(\s*((?:18|19|20)\d{2}s?|(?:early|mid|late)[-\s]+\d0s|child|childhood|kid|boy|girl|teen|teenager|youth|young(?:\s+adult)?|middle[-\s]?aged|elder|elderly|senior|older|present(?:\s+day)?)\s*\)\s*$/i
  )
  if (parenEraMatch && parenEraMatch[1]!.trim()) {
    const base = parenEraMatch[1]!.trim()
    const rawLabel = parenEraMatch[2]!.trim()
    const titleLabel = rawLabel
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    return {
      isAgeVariant: true,
      baseName: base,
      ageStageLabel: titleLabel,
    }
  }

  // 3. Trailing `"John Miller Age 16"` or `"John Miller, Age 16"` or `"John Miller - Age 16"`
  const trailingAgeMatch = cleaned.match(
    /^(.*?)(?:\s*[,—–-]\s*|\s+)age[d]?\s+(\d{1,3})\s*$/i
  )
  if (trailingAgeMatch) {
    const base = trailingAgeMatch[1]!.trim()
    const num = Number(trailingAgeMatch[2])
    if (base && num > 0 && num < 120) {
      return {
        isAgeVariant: true,
        baseName: base,
        ageStageLabel: `Age ${num}`,
        numericAge: num,
      }
    }
  }

  // 4. Bare trailing age number `"John 17"`, `"John Miller 17"` (4..105, excluding generic numbered roles like "Guard 4")
  const bareTrailingNumMatch = cleaned.match(
    /^([A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*)*)\s+(\d{1,3})\s*$/
  )
  if (bareTrailingNumMatch) {
    const base = bareTrailingNumMatch[1]!.trim()
    const num = Number(bareTrailingNumMatch[2])
    const numberedRoleRe =
      /\b(?:guard|soldier|officer|cop|police|detective|agent|worker|tech|technician|doctor|nurse|medic|pilot|driver|patron|guest|customer|waiter|waitress|bartender|clerk|henchman|thug|bystander|reporter|journalist|student|kid|boy|girl|man|woman|person|voice|speaker|prisoner|inmate|crew|member|villager|citizen|rebel|trooper|sentinel)\s*$/i
    if (base && num >= 4 && num <= 105 && !numberedRoleRe.test(base)) {
      return {
        isAgeVariant: true,
        baseName: base,
        ageStageLabel: `Age ${num}`,
        numericAge: num,
      }
    }
  }

  // 5. Leading `"Young John Miller"`, `"Teenage John Miller"`, `"Elder John Miller"`
  const leadingStageMatch = cleaned.match(
    /^(young|teen|teenage|child|little|elder|older|adult)\s+([A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+)*)$/i
  )
  if (leadingStageMatch && leadingStageMatch[2]!.trim()) {
    const rawStage = leadingStageMatch[1]!.trim()
    const stageLabel = rawStage.charAt(0).toUpperCase() + rawStage.slice(1).toLowerCase()
    return {
      isAgeVariant: true,
      baseName: leadingStageMatch[2]!.trim(),
      ageStageLabel: stageLabel,
    }
  }

  return { isAgeVariant: false, baseName: cleaned }
}

/**
 * Format a clean, canonical age-stage character name:
 * e.g. `formatAgeVariantCharacterName("John Miller (Age 62)", 16)` -> `"John Miller (Age 16)"`
 */
export function formatAgeVariantCharacterName(
  rawBaseOrVariantName: string,
  ageOrEraInput: string | number
): string {
  const parsed = extractSamePersonAgeStage(rawBaseOrVariantName)
  const base = (parsed.baseName || rawBaseOrVariantName || 'Character').trim()
  const rawAgeStr = String(ageOrEraInput ?? '').trim()
  if (!rawAgeStr) return base

  const exactNumMatch =
    rawAgeStr.match(/^(?:age[d]?\s*)?(\d{1,3})(?:\s*(?:yo|yrs?|years?\s*old))?$/i)
  if (exactNumMatch) {
    const n = Number(exactNumMatch[1])
    if (n > 0 && n < 120) {
      return `${base} (Age ${n})`
    }
  }

  const cleanedLabel = rawAgeStr.replace(/^\(|\)$/g, '').trim()
  const capitalized =
    cleanedLabel.charAt(0).toUpperCase() + cleanedLabel.slice(1)
  return `${base} (${capitalized})`
}

const GROUP_NOUN_PLURALS = new Set([
  'friends',
  'brothers',
  'sisters',
  'siblings',
  'parents',
  'grandparents',
  'grandchildren',
  'grandkids',
  'children',
  'kids',
  'boys',
  'girls',
  'cousins',
  'relatives',
  'uncles',
  'aunts',
  'family',
  'neighbors',
  'neighbours',
  'townspeople',
  'villagers',
  'locals',
  'citizens',
  'coworkers',
  'co-workers',
  'colleagues',
  'workers',
  'employees',
  'staff',
  'nurses',
  'doctors',
  'medics',
  'soldiers',
  'troops',
  'sailors',
  'veterans',
  'teammates',
  'players',
  'classmates',
  'students',
  'pupils',
  'teachers',
  'guests',
  'attendees',
  'mourners',
  'crowd',
  'crowds',
  'onlookers',
  'bystanders',
  'spectators',
  'customers',
  'patrons',
  'regulars',
  'shoppers',
  'passengers',
  'bandmates',
  'musicians',
  'singers',
  'choir',
  'ensemble',
  'community',
  'couple',
  'twins',
  'trio',
  'group',
  'members',
  'elders',
  'ancestors',
])

const EXPLICIT_GROUP_PHRASE_RE =
  /\b(group\s+of|crowd\s+of|circle\s+of|team\s+of|chorus\s+of|various\s+|multiple\s+|assorted\s+|several\s+|family\s+members|factory\s+workers|hospital\s+staff|wedding\s+guests|funeral\s+guests|neighborhood\s+regulars|high\s+school\s+friends|childhood\s+friends|college\s+friends|war\s+buddies|school\s+children|the\s+siblings|the\s+brothers|the\s+sisters|the\s+parents|the\s+kids|the\s+children|the\s+grandchildren|the\s+neighbors|the\s+friends|the\s+family)\b/i

/**
 * Returns true if `name` represents a plural/collective group rather than a single individual.
 * Characters in SceneFlow MUST be individuals (never groups) so each card maps to one human face & voice.
 */
export function isCollectiveOrGroupCharacterName(
  rawName: string,
  rawDescription?: string
): boolean {
  const parsed = extractSamePersonAgeStage(rawName)
  const clean = parsed.baseName.trim()
  if (!clean) return true

  const lower = clean.toLowerCase()
  if (lower === 'narrator' || lower === 'voiceover') return false

  if (EXPLICIT_GROUP_PHRASE_RE.test(clean)) return true

  // Single-word plural group noun: "Friends", "Neighbors", "Parents", "Siblings", "Classmates"
  if (GROUP_NOUN_PLURALS.has(lower)) return true

  const tokens = lower
    .replace(/[^a-z0-9'’-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return true

  const lastToken = tokens[tokens.length - 1]!
  const firstToken = tokens[0]!

  // Possessive or determiner + plural group noun: "John's Friends", "His Brothers", "Our Neighbors", "Local Workers"
  const hasGroupDeterminerOrPossessive =
    firstToken === 'the' ||
    firstToken === 'his' ||
    firstToken === 'her' ||
    firstToken === 'their' ||
    firstToken === 'our' ||
    firstToken === 'my' ||
    firstToken === 'local' ||
    firstToken === 'young' ||
    firstToken === 'old' ||
    firstToken === 'fellow' ||
    firstToken === 'other' ||
    tokens.some((t) => /['’]s$/.test(t))

  if (GROUP_NOUN_PLURALS.has(lastToken) && (hasGroupDeterminerOrPossessive || tokens.length >= 2)) {
    // Guard against genuine 2-word individual names whose surname happens to match a rare noun?
    // None of GROUP_NOUN_PLURALS are common surnames except possibly "Brothers"/" Waters" (Waters is not in set).
    // Still, check if firstToken is a common proper first name without possessive and lastToken === 'brothers'
    if (!hasGroupDeterminerOrPossessive && tokens.length === 2 && lastToken === 'brothers') {
      // e.g. "Smith Brothers" -> IS a plural pair ("The Smith Brothers" / "Smith Brothers")!
      return true
    }
    return true
  }

  // Check description for unambiguous collective framing when name ends in 's'
  if (
    rawDescription &&
    /^(?:a\s+)?(?:group|crowd|collection|team|gathering|ensemble|pair|set)\s+of\b/i.test(
      rawDescription.trim()
    ) &&
    lastToken.endsWith('s')
  ) {
    return true
  }

  return false
}

/**
 * Split compound paired character names like `"Arthur & Elena Lin"` or `"John and Mary Carter"`
 * into individual names `["Arthur Lin", "Elena Lin"]`.
 * Returns `[rawName]` unchanged if it is already a single individual, or `[]` if it is an anonymous group (`"Friends & Neighbors"`).
 */
export function splitCompoundIndividualNames(rawName: string): string[] {
  const trimmed = (rawName || '').trim()
  if (!trimmed) return []

  if (!/\s+(?:&|and)\s+/i.test(trimmed)) {
    return isCollectiveOrGroupCharacterName(trimmed) ? [] : [trimmed]
  }

  // Extract trailing `(Age NN)` if attached to the pair
  const stageInfo = extractSamePersonAgeStage(trimmed)
  const core = stageInfo.baseName
  const parts = core
    .split(/\s+(?:&|and)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length !== 2) {
    return isCollectiveOrGroupCharacterName(trimmed) ? [] : [trimmed]
  }

  // If either side is a group noun ("Friends and Family", "Brothers and Sisters"), reject as group
  if (
    parts.some((p) => isCollectiveOrGroupCharacterName(p)) ||
    /^(mom|dad|mother|father|grandma|grandpa)$/i.test(parts[0]!)
  ) {
    return []
  }

  // Propagate shared surname from part 2 to part 1 when part 1 is a single given name:
  // e.g. "Arthur" + "Elena Lin" -> ["Arthur Lin", "Elena Lin"]
  const p1Tokens = parts[0]!.split(/\s+/)
  const p2Tokens = parts[1]!.split(/\s+/)
  let firstIndividual = parts[0]!
  const secondIndividual = parts[1]!
  if (p1Tokens.length === 1 && p2Tokens.length >= 2) {
    const sharedSurname = p2Tokens.slice(1).join(' ')
    firstIndividual = `${p1Tokens[0]} ${sharedSurname}`
  }

  return [firstIndividual, secondIndividual]
}

/**
 * Detect when a single character entry spans multiple distinct life-stage ages
 * (e.g., `age: "16, 32, 62"` or `age: "16-62"` or description mentioning `"at age 16 ... at age 62"`).
 * Returns sorted distinct numeric ages when ≥2 distinct life-stage ages (at least 10 years apart) are found.
 */
export function detectMultiAgeStagesOnCharacter(
  char: Record<string, unknown>,
  beats?: Array<Record<string, unknown>>
): number[] {
  const rawName = String(char?.name || '').trim()
  if (!rawName) return []

  // Already an explicit single age-stage variant!
  const existingStage = extractSamePersonAgeStage(rawName)
  if (existingStage.isAgeVariant) return []

  const rawAge = String(char?.age ?? char?.ageRange ?? '').trim()
  const desc = `${String(char?.description || '')} ${String(char?.appearance || '')} ${String(char?.appearanceDescription || '')}`

  const candidateAges = new Set<number>()

  // 1. Comma/slash/and list in `age`: e.g. "16, 32, 62" or "16 / 32 / 62" or "16, 32, and 62"
  if (rawAge && /[,/]|\band\b/i.test(rawAge)) {
    const nums = rawAge.match(/\b\d{1,2}\b/g)
    if (nums && nums.length >= 2) {
      nums.forEach((n) => {
        const val = Number(n)
        if (val >= 3 && val <= 105) candidateAges.add(val)
      })
    }
  }

  // 2. Wide range in `age`: e.g. "16-62" or "16 to 62" (span >= 15 years — NOT a narrow casting band like "32-36"!)
  const rangeMatch = rawAge.match(/^\s*(\d{1,2})\s*(?:[-–—]|to)\s*(\d{1,2})\s*$/i)
  if (rangeMatch) {
    const low = Number(rangeMatch[1])
    const high = Number(rangeMatch[2])
    if (low >= 3 && high <= 105 && high - low >= 15) {
      candidateAges.add(low)
      candidateAges.add(high)
    }
  }

  // 3. Explicit `"age 16"`, `"aged 32"`, `"16-year-old"` mentions in character description or beat synopses tied to this character
  const baseFirst = existingStage.baseName.split(/\s+/)[0]?.toLowerCase() || ''
  const scanForExplicitAges = (text: string) => {
    const matches = text.matchAll(/\b(?:age[d]?\s*(\d{1,2})|(\d{1,2})[-\s]*years?[-\s]*old)\b/gi)
    for (const m of matches) {
      const val = Number(m[1] || m[2])
      if (val >= 4 && val <= 105) {
        candidateAges.add(val)
      }
    }
  }

  if (candidateAges.size >= 2) {
    // Also pull any middle age stage mentioned in description (e.g. "16-62" in age field + "age 32" in bio)
    scanForExplicitAges(desc)
  } else {
    // Check if description itself lists 2+ distinct ages for this person
    const bioAges = new Set<number>()
    const bioMatches = desc.matchAll(/\b(?:at\s+age\s*(\d{1,2})|age\s*(\d{1,2})|(\d{1,2})[-\s]*year[-\s]*old)\b/gi)
    for (const m of bioMatches) {
      const val = Number(m[1] || m[2] || m[3])
      if (val >= 4 && val <= 105) bioAges.add(val)
    }
    if (bioAges.size >= 2) {
      bioAges.forEach((a) => candidateAges.add(a))
    }
  }

  // Also check beats if beats mention `<FirstName> (16)` / `<FirstName> at age 16` across multiple eras
  if (Array.isArray(beats) && baseFirst.length >= 3) {
    for (const b of beats) {
      const bText = `${String(b?.title || '')} ${String(b?.eraOrAge || '')} ${String(b?.synopsis || '')}`
      if (!bText.toLowerCase().includes(baseFirst)) continue
      const escapedFirst = baseFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const charAgeInBeat = bText.match(
        new RegExp(
          `\\b${escapedFirst}\\b[^.]{0,30}?\\b(?:age[d]?\\s*(\\d{1,2})|\\((\\d{1,2})\\)|(\\d{1,2})[-\\s]*years?[-\\s]*old)`,
          'i'
        )
      )
      if (charAgeInBeat) {
        const n = Number(charAgeInBeat[1] || charAgeInBeat[2] || charAgeInBeat[3])
        if (n >= 4 && n <= 105) candidateAges.add(n)
      }
    }
  }

  const sorted = [...candidateAges].sort((a, b) => a - b)
  if (sorted.length < 2) return []

  // Cluster ages that are within 7 years of each other so minor aging within one era doesn't over-split,
  // keeping distinct life stages (>= 10 years apart between clusters, or >= 8 years when 3+ stages).
  const distinctStages: number[] = [sorted[0]!]
  for (let i = 1; i < sorted.length; i++) {
    const prev = distinctStages[distinctStages.length - 1]!
    if (sorted[i]! - prev >= 8) {
      distinctStages.push(sorted[i]!)
    }
  }

  if (
    distinctStages.length >= 2 &&
    distinctStages[distinctStages.length - 1]! - distinctStages[0]! >= 10
  ) {
    return distinctStages
  }
  return []
}

function formatAgeBandLabel(age: number): string {
  if (age < 13) return `child (${age})`
  if (age < 18) return `teenager (${age})`
  if (age < 20) return `late teens (${age})`
  const decade = Math.floor(age / 10) * 10
  const rem = age % 10
  const mod = rem <= 3 ? 'early' : rem <= 6 ? 'mid' : 'late'
  return `${mod} ${decade}s (${age})`
}

function inferYouthHairFromEthnicity(ethnicity: string, currentHairColor: string): string {
  const lowerHair = currentHairColor.toLowerCase()
  const isAgedHair = /\b(silver|white|gray|grey|salt[-\s]*and[-\s]*pepper|balding)\b/i.test(lowerHair)
  if (!isAgedHair && currentHairColor.trim()) return currentHairColor.trim()

  const lowerEth = ethnicity.toLowerCase()
  if (/\b(east asian|south asian|southeast asian|chinese|japanese|korean|thai|indian|vietnamese|filipino|black|african|latino|hispanic|mexican|middle eastern|arab)\b/.test(lowerEth)) {
    return 'natural deep dark brown-black'
  }
  if (/\b(irish|scottish|celtic)\b/.test(lowerEth)) {
    return 'warm auburn-brown'
  }
  return 'natural dark brown'
}

function scrubAgeContradictingAdjectives(text: string, targetAge: number): string {
  if (!text) return ''
  let out = text
    // Strip hardcoded mismatched age numbers in prose
    .replace(/\b\d{1,2}[-\s]*years?[-\s]*old\b/gi, `${targetAge}-year-old`)
    .replace(/\baged?\s+\d{1,2}\b/gi, `aged ${targetAge}`)

  if (targetAge < 40) {
    out = out
      .replace(/\b(silver|snow[-\s]?white|pure white|salt[-\s]*and[-\s]*pepper|graying|greying|gray|grey)\s+(hair|chignon|curls|waves|temples|beard)\b/gi, 'natural dark $2')
      .replace(/\b(deeply\s+wrinkled|weathered\s+elderly|elderly|octogenarian|septuagenarian|frail)\b/gi, 'youthful')
  } else if (targetAge >= 60) {
    out = out.replace(/\b(teenage|adolescent|boyish|girlish|high[-\s]?school)\b/gi, 'mature, seasoned')
  }
  return out.replace(/\s+/g, ' ').trim()
}

export interface BuildAgeVariantOptions {
  targetAge: number
  eraLabel?: string
  defaultWardrobeOverride?: string
  samePersonGroupId?: string
  lookTransformNote?: string
  likenessCharacterId?: string
}

/**
 * Create a new standalone individual character entry representing `sourceChar` at `targetAge`.
 * Preserves core genetic traits (`ethnicity`, `gender`, `eyeColor`, facial structure) while
 * adapting biological age, hair aging, and longitudinal portrait continuity.
 */
export function buildAgeVariantCharacter<T extends Record<string, any>>(
  sourceChar: T,
  options: BuildAgeVariantOptions
): T {
  const {
    targetAge,
    eraLabel,
    defaultWardrobeOverride,
    samePersonGroupId,
    lookTransformNote,
    likenessCharacterId,
  } = options
  const parsed = extractSamePersonAgeStage(String(sourceChar?.name || 'Character'))
  const baseName = parsed.baseName || 'Character'
  const newName = formatAgeVariantCharacterName(baseName, targetAge)
  const groupKey =
    samePersonGroupId ||
    String(sourceChar?.samePersonGroupId || '') ||
    `person-${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const ethnicity = String(sourceChar?.ethnicity || '').trim()
  const gender = String(sourceChar?.gender || '').trim()
  const eyeColor = String(sourceChar?.eyeColor || '').trim()
  const rawHairColor = String(sourceChar?.hairColor || '').trim()
  const rawHairStyle = String(sourceChar?.hairStyle || '').trim()

  let adaptedHairColor = rawHairColor
  if (targetAge <= 42) {
    adaptedHairColor = inferYouthHairFromEthnicity(ethnicity, rawHairColor)
  } else if (targetAge >= 62 && rawHairColor && !/\b(silver|gray|grey|white|salt)\b/i.test(rawHairColor)) {
    adaptedHairColor = `silver-threaded ${rawHairColor}`
  } else if (targetAge >= 68 && !adaptedHairColor) {
    adaptedHairColor = 'silver-gray'
  }

  const stagePhrase =
    targetAge < 13
      ? `childhood life stage at age ${targetAge}`
      : targetAge < 20
        ? `adolescent/youth life stage at age ${targetAge}`
        : targetAge < 38
          ? `young-adult prime at age ${targetAge}`
          : targetAge < 58
            ? `midlife maturity at age ${targetAge}`
            : `senior life stage at age ${targetAge} with natural wisdom lines`

  const rawSourceLook = String(
    sourceChar?.appearanceDescription || sourceChar?.appearance || ''
  ).trim()
  const cleanedSourceLook = scrubAgeContradictingAdjectives(
    rawSourceLook.replace(/Longitudinal identity lock:.*$/i, '').trim(),
    targetAge
  )

  const longitudinalLock = `Longitudinal identity lock: exact same individual human being as ${baseName} depicted strictly at biological age ${targetAge}${eraLabel ? ` (${eraLabel})` : ''} (${stagePhrase})${ethnicity ? `, ${ethnicity}` : ''}${eyeColor ? `, same ${eyeColor} eyes` : ''}, preserving identical underlying facial bone structure while rendering authentic age-${targetAge} skin texture and ${adaptedHairColor || 'age-accurate'} hair.`

  const trimmedLookNote = lookTransformNote?.trim() || ''
  const nextAppearance = [
    trimmedLookNote ? `${trimmedLookNote.replace(/\.*\s*$/, '.')}` : '',
    cleanedSourceLook ? `${cleanedSourceLook.replace(/\.*\s*$/, '.')}` : '',
    longitudinalLock,
  ]
    .filter(Boolean)
    .join(' ')

  const rawDesc = scrubAgeContradictingAdjectives(
    String(sourceChar?.description || '').trim(),
    targetAge
  )
  const eraSuffix = eraLabel ? ` (${eraLabel}, Age ${targetAge})` : ` (Age ${targetAge})`
  const nextDescription = rawDesc
    ? `${baseName}${eraSuffix}: ${rawDesc}`
    : `${baseName} at age ${targetAge}${eraLabel ? ` during ${eraLabel}` : ''}.`

  const baseSlug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const nextWardrobe =
    defaultWardrobeOverride?.trim() ||
    (eraLabel
      ? `Period-authentic attire for ${baseName} at age ${targetAge} (${eraLabel})`
      : String(sourceChar?.defaultWardrobe || '').trim())

  const cloned: Record<string, any> = {
    ...sourceChar,
    id: `char-${baseSlug}-${Math.random().toString(36).slice(2, 6)}`,
    name: newName,
    subject: newName,
    samePersonGroupId: groupKey,
    age: String(targetAge),
    ageRange: formatAgeBandLabel(targetAge),
    ...(gender ? { gender } : {}),
    ...(ethnicity ? { ethnicity } : {}),
    ...(eyeColor ? { eyeColor } : {}),
    ...(adaptedHairColor ? { hairColor: adaptedHairColor } : {}),
    ...(rawHairStyle ? { hairStyle: scrubAgeContradictingAdjectives(rawHairStyle, targetAge) } : {}),
    appearance: nextAppearance,
    appearanceDescription: nextAppearance,
    description: nextDescription,
    ...(nextWardrobe ? { defaultWardrobe: nextWardrobe } : {}),
    // Never inherit base character's bare-name aliases or adult voiceConfig onto an age variant!
    aliases: undefined,
    voiceConfig: undefined,
    voiceDescription: undefined,
    // Dedicated age-variant MUST generate/upload its own age-accurate portrait & wardrobes!
    referenceImage: null,
    imageApproved: false,
    imagePrompt: undefined,
    visionDescription: undefined,
    wardrobes: [],
    ...(likenessCharacterId
      ? {
          likenessSourceType: 'character',
          likenessCharacterId,
          likenessImageUrl: undefined,
          likenessTransformNote:
            trimmedLookNote ||
            `${targetAge}-year-old version of the reference${eraLabel ? ` (${eraLabel})` : ''}`,
        }
      : {
          likenessSourceType: 'none',
          likenessCharacterId: undefined,
          likenessImageUrl: undefined,
          likenessTransformNote: trimmedLookNote || undefined,
        }),
  }

  return cloned as T
}

const EXPLICIT_HYPHENATED_ETHNICITY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\bmixed\s+([a-z][a-z\s()/&-]{2,40}?)\s+and\s+([a-z][a-z\s()/&-]{2,40}?)\s+(?:heritage|descent|ancestry|background)\b/i,
    label: '__MATCH_MIXED__',
  },
  {
    pattern: /\bAfrican[-\s]American\b(?!\s+(?:history|studies|literature|art|music|church|community|neighborhood|museum))/i,
    label: 'African American',
  },
  { pattern: /\bBlack[-\s]American\b/i, label: 'African American' },
  { pattern: /\bTaiwanese[-\s]American\b/i, label: 'East Asian (Taiwanese-American)' },
  { pattern: /\bChinese[-\s]American\b/i, label: 'East Asian (Chinese-American)' },
  { pattern: /\bJapanese[-\s]American\b/i, label: 'East Asian (Japanese-American)' },
  { pattern: /\bKorean[-\s]American\b/i, label: 'East Asian (Korean-American)' },
  { pattern: /\bVietnamese[-\s]American\b/i, label: 'Southeast Asian (Vietnamese-American)' },
  { pattern: /\bThai[-\s]American\b/i, label: 'Mixed Southeast Asian (Thai) and American heritage' },
  { pattern: /\bFilipino[-\s]American\b/i, label: 'Southeast Asian (Filipino-American)' },
  { pattern: /\bIndian[-\s]American\b/i, label: 'South Asian (Indian-American)' },
  { pattern: /\bMexican[-\s]American\b/i, label: 'Latino (Mexican-American)' },
  { pattern: /\bCuban[-\s]American\b/i, label: 'Latino (Cuban-American)' },
  { pattern: /\bIrish[-\s]American\b/i, label: 'White (Irish-American)' },
  { pattern: /\bItalian[-\s]American\b/i, label: 'White (Italian-American)' },
  { pattern: /\bPolish[-\s]American\b/i, label: 'White (Polish-American)' },
  { pattern: /\bJewish[-\s]American\b/i, label: 'Jewish-American' },
  { pattern: /\bLebanese[-\s]American\b/i, label: 'Middle Eastern (Lebanese-American)' },
  { pattern: /\bNigerian[-\s]American\b/i, label: 'Black (Nigerian-American)' },
]

const PERSON_NOUN_FOLLOW_RE =
  '(?:man|woman|boy|girl|teen|teenager|adolescent|youth|child|kid|son|daughter|father|mother|dad|mom|brother|sister|husband|wife|spouse|partner|grandmother|grandfather|granddaughter|grandson|matriarch|patriarch|widow|widower|elder|prodigy|high\\s+school|college|student|athlete|point\\s+guard|player|coach|mentor|teacher|professor|principal|pastor|minister|priest|monk|doctor|nurse|surgeon|architect|engineer|scientist|executive|founder|co-founder|entrepreneur|bookseller|curator|artist|musician|writer|poet|journalist|detective|officer|soldier|veteran|worker|machinist|steelworker|welder|craftsman|artisan|chef|merchant|villager|neighbor)'

const EXPLICIT_PERSON_DEMOGRAPHIC_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: new RegExp(`\\bBlack\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Black / African American',
  },
  {
    pattern: new RegExp(`\\bThai\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Southeast Asian (Thai)',
  },
  {
    pattern: new RegExp(`\\bJapanese\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'East Asian (Japanese)',
  },
  {
    pattern: new RegExp(`\\bKorean\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'East Asian (Korean)',
  },
  {
    pattern: new RegExp(`\\bChinese\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'East Asian (Chinese)',
  },
  {
    pattern: new RegExp(`\\bTaiwanese\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'East Asian (Taiwanese)',
  },
  {
    pattern: new RegExp(`\\bVietnamese\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Southeast Asian (Vietnamese)',
  },
  {
    pattern: new RegExp(`\\bFilipino\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Southeast Asian (Filipino)',
  },
  {
    pattern: new RegExp(`\\b(?:South\\s+Asian|Indian)\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'South Asian (Indian)',
  },
  {
    pattern: new RegExp(`\\b(?:East\\s+Asian)\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'East Asian',
  },
  {
    pattern: new RegExp(`\\b(?:Southeast\\s+Asian)\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Southeast Asian',
  },
  {
    pattern: new RegExp(`\\b(?:Latino|Latina|Hispanic|Mexican)\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Latino / Hispanic',
  },
  {
    pattern: new RegExp(`\\b(?:White|Caucasian)\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'White / European',
  },
  {
    pattern: new RegExp(`\\bIrish\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'White (Irish)',
  },
  {
    pattern: new RegExp(`\\bNigerian\\s+(?:[a-z-]+\\s+){0,2}?${PERSON_NOUN_FOLLOW_RE}\\b`, 'i'),
    label: 'Black (West African / Nigerian)',
  },
]

/**
 * Extract an explicit individual demographic/ethnicity identity stated directly in a character's
 * opening biographical prose (e.g. `"A lean, hyper-vigilant African American high school math prodigy..."`
 * -> `"African American"`), ignoring auto-generated `Longitudinal identity lock:` clauses.
 */
export function inferExplicitCharacterEthnicityFromProse(rawProse?: string | null): string | undefined {
  if (!rawProse) return undefined
  const withoutAutoLocks = rawProse
    .replace(/Longitudinal identity lock:[\s\S]*$/i, '')
    .replace(/Familial lineage:[\s\S]*$/i, '')
    .trim()
  if (!withoutAutoLocks) return undefined

  // Normalize common honorific/generational periods ("Sr.", "Jr.", "Dr.", "Mr.", "Mrs.", "Ms.", "St.")
  // before extracting the opening biographical sentence so "Brian Eric Anderson Sr." never truncates early!
  const honorificSafe = withoutAutoLocks.replace(
    /\b(Sr|Jr|Dr|Mr|Mrs|Ms|Prof|Rev|St|Capt|Lt|Sgt|Col|Gen)\.\s+/gi,
    '$1 '
  )
  const openingSentence =
    honorificSafe.split(/[.!?]\s+/)[0]?.slice(0, 360) ||
    honorificSafe.slice(0, 360)

  for (const item of EXPLICIT_HYPHENATED_ETHNICITY_PATTERNS) {
    const m = openingSentence.match(item.pattern)
    if (m) {
      if (item.label === '__MATCH_MIXED__') {
        return `Mixed ${m[1]!.trim()} and ${m[2]!.trim()} heritage`
      }
      return item.label
    }
  }

  for (const item of EXPLICIT_PERSON_DEMOGRAPHIC_PATTERNS) {
    if (item.pattern.test(openingSentence)) {
      return item.label
    }
  }

  return undefined
}

/**
 * Synchronize core genetic traits (`ethnicity`, `gender`, `eyeColor`, `samePersonGroupId`, longitudinal
 * appearance lock) across multiple `(Age NN)` character entries representing the same person.
 */
export function enforceSamePersonAgeStageConsistency<T extends Record<string, any>>(
  characters: T[]
): T[] {
  if (!Array.isArray(characters) || characters.length <= 1) return characters

  const groups = new Map<string, number[]>()
  characters.forEach((char, idx) => {
    const rawName = String(char?.name || '').trim()
    if (!rawName || char?.type === 'narrator' || char?.role === 'narrator') return
    const stage = extractSamePersonAgeStage(rawName)
    const key = stage.baseName.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!key) return
    const list = groups.get(key) || []
    list.push(idx)
    groups.set(key, list)
  })

  const out = characters.map((c) => ({ ...c }))

  for (const [baseKey, indices] of groups.entries()) {
    if (indices.length < 2) continue
    const groupId = `person-${baseKey.replace(/[^a-z0-9]+/g, '-')}`

    // 1. Prefer explicit ethnicity stated in the person's biographical prose (`description` / `subject`)
    const proseEthnicities = indices
      .map(
        (i) =>
          inferExplicitCharacterEthnicityFromProse(String(out[i]?.description || '')) ||
          inferExplicitCharacterEthnicityFromProse(String(out[i]?.subject || ''))
      )
      .filter((v): v is string => Boolean(v))

    // 2. Otherwise pick by majority frequency across age variants (NEVER by longest string length,
    //    which previously let one polluted variant like "Southeast Asian (Thai)" win over "African American"!)
    const explicitFieldEthnicities = indices
      .map((i) => String(out[i]?.ethnicity || '').trim())
      .filter(Boolean)

    let sharedEthnicity = proseEthnicities[0] || ''
    if (!sharedEthnicity && explicitFieldEthnicities.length > 0) {
      const mixed = explicitFieldEthnicities.find((e) => /\bmixed\b/i.test(e))
      if (mixed) {
        sharedEthnicity = mixed
      } else {
        const counts = new Map<string, { display: string; count: number }>()
        for (const eth of explicitFieldEthnicities) {
          const norm = eth.toLowerCase()
          const prev = counts.get(norm)
          counts.set(norm, { display: prev?.display || eth, count: (prev?.count || 0) + 1 })
        }
        sharedEthnicity =
          [...counts.values()].sort((a, b) => b.count - a.count)[0]?.display ||
          explicitFieldEthnicities[0]!
      }
    }

    const sharedGender =
      indices.map((i) => String(out[i]?.gender || '').trim()).find(Boolean) || ''
    const sharedEyeColor =
      indices.map((i) => String(out[i]?.eyeColor || '').trim()).find(Boolean) || ''
    const canonicalBaseDisplay =
      extractSamePersonAgeStage(String(out[indices[0]!]?.name || '')).baseName || baseKey

    for (const idx of indices) {
      const c = out[idx]! as Record<string, any>
      const stage = extractSamePersonAgeStage(String(c.name || ''))
      c.samePersonGroupId = c.samePersonGroupId || groupId
      if (sharedEthnicity) {
        // Same individual across life stages MUST share the exact same ancestral ethnicity
        c.ethnicity = sharedEthnicity
      }
      if (sharedGender && !String(c.gender || '').trim()) {
        c.gender = sharedGender
      }
      if (sharedEyeColor && !String(c.eyeColor || '').trim()) {
        c.eyeColor = sharedEyeColor
      }
      if (stage.numericAge && !String(c.age || '').trim()) {
        c.age = String(stage.numericAge)
        c.ageRange = formatAgeBandLabel(stage.numericAge)
      }

      const ageLabel = stage.numericAge
        ? `biological age ${stage.numericAge}`
        : stage.ageStageLabel || String(c.age || 'this life stage')
      const lockClause = `Longitudinal identity lock: exact same individual human being as ${canonicalBaseDisplay} across life stages — identical ${c.ethnicity || 'ancestral'} heritage${c.eyeColor ? `, ${c.eyeColor} eyes,` : ''} and underlying facial bone structure, depicted strictly at ${ageLabel}.`

      const existingApp = String(c.appearance || c.appearanceDescription || '').trim()
      const baseLookWithoutOldLock = existingApp
        .replace(/\s*Longitudinal identity lock:[\s\S]*$/i, '')
        .trim()
      const mergedApp = baseLookWithoutOldLock
        ? `${baseLookWithoutOldLock.replace(/\.*\s*$/, '.')} ${lockClause}`
        : lockClause
      c.appearance = mergedApp
      if ('appearanceDescription' in c || !c.appearance) {
        c.appearanceDescription = mergedApp
      }
    }
  }

  return out
}

function pickBestAgeVariantForBeat(
  variants: Array<{ name: string; numericAge?: number }>,
  beat: Record<string, unknown>,
  beatIndex: number,
  totalBeats: number
): string {
  if (variants.length === 1) return variants[0]!.name
  const beatText = `${String(beat?.title || '')} ${String(beat?.eraOrAge || '')} ${String(beat?.intent || '')} ${String(beat?.synopsis || '')}`
  const lower = beatText.toLowerCase()

  // 1. Exact age number match in beat text (e.g. "age 16", "(16)", "16-year-old")
  for (const v of variants) {
    if (!v.numericAge) continue
    const ageRe = new RegExp(`\\b(?:age[d]?\\s*${v.numericAge}|${v.numericAge}[-\\s]*years?[-\\s]*old|\\(${v.numericAge}\\))\\b`, 'i')
    if (ageRe.test(beatText)) return v.name
  }

  const sortedByAge = [...variants].sort(
    (a, b) => (a.numericAge ?? 40) - (b.numericAge ?? 40)
  )

  // 2. Life-stage keyword cues in beat text
  if (/\b(child|childhood|born|birth|elementary|schoolboy|schoolgirl|little|hometown|early\s+years|youth|teen|high\s+school|varsity|prom|graduation|first\s+job)\b/.test(lower)) {
    return sortedByAge[0]!.name
  }
  if (/\b(today|present|legacy|retirement|golden\s+anniversary|grandchildren|granddaughter|grandson|passing\s+the|closing|reflection|elder|final)\b/.test(lower)) {
    return sortedByAge[sortedByAge.length - 1]!.name
  }

  // 3. Proportional chronological fallback across the beat sheet
  const ratio = totalBeats > 1 ? beatIndex / (totalBeats - 1) : 0
  const mappedIdx = Math.min(
    sortedByAge.length - 1,
    Math.max(0, Math.round(ratio * (sortedByAge.length - 1)))
  )
  return sortedByAge[mappedIdx]!.name
}

/**
 * Sanitize Blueprint `character_descriptions` and `beats`:
 * 1. Splits compound paired names (`"Arthur & Elena Lin"`) into individuals and filters out collective groups (`"Friends"`, `"Neighbors"`).
 * 2. Splits characters with multi-decade age spans (`age: "16, 32, 62"` or `"16-62"`) into separate `(Age NN)` character entries.
 * 3. Synchronizes same-person genetics across `(Age NN)` entries.
 * 4. Highlights individual `characters` on every beat (resolving bare names to the beat's matching `(Age NN)` character!).
 */
export function sanitizeBlueprintCharactersAndBeats<
  TChar extends Record<string, any>,
  TBeat extends Record<string, any>,
>(input: {
  characters: TChar[]
  beats: TBeat[]
}): {
  characters: TChar[]
  beats: TBeat[]
} {
  const rawChars = Array.isArray(input.characters) ? input.characters : []
  const rawBeats = Array.isArray(input.beats) ? input.beats : []

  // Step 1: Expand compound pairs ("Arthur & Elena Lin") and drop collective groups ("John's Friends")
  const individualChars: TChar[] = []
  for (const ch of rawChars) {
    if (!ch || typeof ch !== 'object') continue
    const rawName = String(ch.name || '').trim()
    if (!rawName) continue
    const role = String(ch.role || '').toLowerCase()
    if (role === 'narrator') {
      individualChars.push(ch)
      continue
    }
    if (isCollectiveOrGroupCharacterName(rawName, String(ch.description || ''))) {
      continue
    }
    const splitNames = splitCompoundIndividualNames(rawName)
    if (splitNames.length === 0) continue
    if (splitNames.length === 1) {
      individualChars.push(ch)
    } else {
      for (const singleName of splitNames) {
        individualChars.push({
          ...ch,
          id: undefined,
          name: singleName,
          subject: singleName,
        })
      }
    }
  }

  // Step 2: Split multi-age span characters into separate `Name (Age NN)` entries
  const ageExpandedChars: TChar[] = []
  for (const ch of individualChars) {
    const multiAges = detectMultiAgeStagesOnCharacter(ch, rawBeats)
    if (multiAges.length >= 2) {
      const parsedBase = extractSamePersonAgeStage(String(ch.name || '')).baseName
      const groupId = `person-${parsedBase.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      for (const ageNum of multiAges) {
        ageExpandedChars.push(
          buildAgeVariantCharacter(ch, {
            targetAge: ageNum,
            samePersonGroupId: groupId,
          })
        )
      }
    } else {
      ageExpandedChars.push(ch)
    }
  }

  // Deduplicate exact normalized names while preserving distinct `(Age NN)` variants
  const dedupedChars: TChar[] = []
  const seenKeys = new Set<string>()
  for (const ch of ageExpandedChars) {
    const key = stripScreenplayDeliveryAnnotations(String(ch.name || ''))
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    if (!key || seenKeys.has(key)) continue
    seenKeys.add(key)
    dedupedChars.push(ch)
  }

  // Step 3: Enforce same-person longitudinal genetic consistency across age variants
  const consistentChars = enforceSamePersonAgeStageConsistency(dedupedChars)

  // Build lookup index by exact canonical name and by baseName -> age variants
  const variantsByBase = new Map<string, Array<{ name: string; numericAge?: number }>>()
  const exactNameMap = new Map<string, string>()
  const firstNameToBase = new Map<string, string>()

  for (const ch of consistentChars) {
    const fullName = String(ch.name || '').trim()
    if (!fullName || String(ch.role || '').toLowerCase() === 'narrator') continue
    exactNameMap.set(fullName.toLowerCase(), fullName)
    const stage = extractSamePersonAgeStage(fullName)
    const baseKey = stage.baseName.toLowerCase()
    const list = variantsByBase.get(baseKey) || []
    const parsedNum =
      stage.numericAge ??
      (/^\d{1,3}$/.test(String(ch.age || '').trim()) ? Number(String(ch.age).trim()) : undefined)
    list.push({ name: fullName, numericAge: parsedNum })
    variantsByBase.set(baseKey, list)

    const firstToken = stage.baseName.split(/\s+/)[0]?.toLowerCase()
    if (firstToken && firstToken.length >= 3) {
      if (!firstNameToBase.has(firstToken)) {
        firstNameToBase.set(firstToken, baseKey)
      } else if (firstNameToBase.get(firstToken) !== baseKey) {
        firstNameToBase.set(firstToken, '__ambiguous__')
      }
    }
  }

  // Step 4: Resolve and highlight individual `characters` on every beat
  const enrichedBeats = rawBeats.map((beat, beatIdx) => {
    const resolvedNames: string[] = []
    const addResolved = (name: string) => {
      if (!name || isCollectiveOrGroupCharacterName(name)) return
      if (!resolvedNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        resolvedNames.push(name)
      }
    }

    const rawBeatChars = Array.isArray(beat?.characters)
      ? beat.characters
      : Array.isArray(beat?.keyCharacters)
        ? beat.keyCharacters
        : []

    for (const rawEntry of rawBeatChars) {
      const candidateStr = typeof rawEntry === 'string' ? rawEntry.trim() : String(rawEntry?.name || '').trim()
      if (!candidateStr) continue
      const splitSingles = splitCompoundIndividualNames(candidateStr)
      for (const single of splitSingles) {
        const lowerSingle = single.toLowerCase()
        if (exactNameMap.has(lowerSingle)) {
          addResolved(exactNameMap.get(lowerSingle)!)
          continue
        }
        const stage = extractSamePersonAgeStage(single)
        const baseKey =
          variantsByBase.has(stage.baseName.toLowerCase())
            ? stage.baseName.toLowerCase()
            : firstNameToBase.get(stage.baseName.toLowerCase())
        if (baseKey && baseKey !== '__ambiguous__' && variantsByBase.has(baseKey)) {
          const matched = pickBestAgeVariantForBeat(
            variantsByBase.get(baseKey)!,
            stage.numericAge ? { ...beat, eraOrAge: `Age ${stage.numericAge}` } : beat,
            beatIdx,
            rawBeats.length
          )
          addResolved(matched)
        } else if (!isCollectiveOrGroupCharacterName(single)) {
          addResolved(single)
        }
      }
    }

    // Also scan beat title + synopsis to highlight any cast members clearly active in the beat
    const beatProse = `${String(beat?.title || '')} ${String(beat?.synopsis || '')}`
    for (const [baseKey, variants] of variantsByBase.entries()) {
      const firstToken = baseKey.split(/\s+/)[0] || ''
      const fullBaseRe = new RegExp(`\\b${baseKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      const unambiguousFirst =
        firstToken.length >= 3 && firstNameToBase.get(firstToken) === baseKey
          ? new RegExp(`\\b${firstToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
          : null

      if (fullBaseRe.test(beatProse) || (unambiguousFirst && unambiguousFirst.test(beatProse))) {
        const alreadyHasBase = resolvedNames.some(
          (n) => extractSamePersonAgeStage(n).baseName.toLowerCase() === baseKey
        )
        if (!alreadyHasBase) {
          addResolved(pickBestAgeVariantForBeat(variants, beat, beatIdx, rawBeats.length))
        }
      }
    }

    return {
      ...beat,
      ...(resolvedNames.length > 0 ? { characters: resolvedNames } : {}),
    }
  })

  return {
    characters: consistentChars,
    beats: enrichedBeats,
  }
}
