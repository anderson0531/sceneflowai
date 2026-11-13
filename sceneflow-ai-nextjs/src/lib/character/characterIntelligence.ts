/**
 * Character & Ensemble Intelligence Engine (Isomorphic / Client-Safe)
 *
 * Provides pure, browser-safe localization prompts, family-consistency helpers,
 * minimal/poisoned description detectors, and deterministic cast enrichment fallbacks
 * across Series Studio, Blueprint Studio, Script Generation, and Production Continuity.
 *
 * Server-only Vertex AI Gemini ensemble enrichment lives in `./characterIntelligence.server.ts`.
 */

import { normalizeCharacterName } from '@/lib/character/detection'
import {
  formatAudienceDefinitionForPrompt,
  formatCulturalSignalsForPrompt,
  type AudienceCulturalSignals,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import {
  buildFamilialVisualContinuityClause,
  enforceEnsembleFamilyConsistency,
  type CharacterFamilyRelationship,
  type FamilyAwareCharacter,
} from '@/lib/character/characterFamily'

export interface CharacterLocalizationContext {
  setting?: string
  timeframe?: string
  storyLocale?: string
  targetAudience?: string
  audienceDefinition?: AudienceDefinition | null
  culturalSignals?: AudienceCulturalSignals | null
  locations?: Array<{
    name?: string
    location?: string
    description?: string
    atmosphere?: string
  }>
  props?: Array<{
    name?: string
    category?: string
    description?: string
  }>
}

export interface EnrichedCharacterProfile extends FamilyAwareCharacter {
  id?: string
  name: string
  role?: string
  subject?: string
  age?: string
  ageRange?: string
  gender?: string
  ethnicity?: string
  build?: string
  hairStyle?: string
  hairColor?: string
  eyeColor?: string
  keyFeature?: string
  expression?: string
  appearance?: string
  appearanceDescription?: string
  defaultWardrobe?: string
  wardrobeAccessories?: string
  description?: string
  personality?: string
  externalGoal?: string
  internalNeed?: string
  fatalFlaw?: string
  voiceDescription?: string
  familyRelationships?: CharacterFamilyRelationship[]
}

export interface EnsembleCastIntelligenceInput {
  characters: Array<Record<string, any>>
  storyContext?: {
    title?: string
    logline?: string
    synopsis?: string
    genre?: string
    tone?: string
    setting?: string
    timeframe?: string
    themes?: string[]
    artStyle?: string
  }
  localization?: CharacterLocalizationContext
  scenes?: Array<Record<string, any>>
  /** When true, overwrites even previously authored descriptions (default false: non-destructive baseline fill). */
  forceOverwrite?: boolean
}

export interface CastCharacterSyncUpdate {
  characterId: string
  characterName: string
  patch: Partial<EnrichedCharacterProfile>
  enrichedFields: string[]
  reason: string
}

export interface EnsembleCastIntelligenceResult {
  characters: Array<Record<string, any>>
  updates: CastCharacterSyncUpdate[]
  analysis: string
  usedFallback: boolean
}

const PLACEHOLDER_DESCRIPTION_PATTERNS = [
  /^character\s+from\s+script$/i,
  /^character\s+appearing\s+in\s+scene\b/i,
  /^supporting\s+character$/i,
  /^main\s+character$/i,
  /^minor\s+character$/i,
  /^background\s+character$/i,
  /^unnamed\s+character$/i,
  /^visual\s+look$/i,
  /^look$/i,
  /^not\s+specified$/i,
  /^n\/a$/i,
  /^tbd$/i,
]

const PHYSICAL_CUE_REGEX =
  /\b(eyes?|hair|skin|complexion|tall|short|petite|slender|athletic|stocky|lean|muscular|broad|build|jaw|cheekbones?|brow|freckles?|beard|stubble|clean[-\s]?shaven|mustache|wrinkles?|weathered|face|oval|angular|round| braids|curls|wavy|cropped|bald|silver|auburn|brunette|blonde|\d\s*['′]\s*\d+|\d+[-\s]?foot)\b/i

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * True when a stored `imagePrompt` was generated from a placeholder stub
 * (e.g. `Professional character portrait: Name, Character from script, photorealistic...`)
 * and must NOT hijack portrait generation in `rawMode`.
 */
export function isPoisonedPlaceholderImagePrompt(prompt?: string | null): boolean {
  const text = clean(prompt)
  if (!text) return false
  if (/\bcharacter\s+from\s+script\b/i.test(text)) return true
  if (/\bcharacter\s+appearing\s+in\s+scene\b/i.test(text)) return true
  if (
    /^professional\s+character\s+portrait:/i.test(text) &&
    !/\b(eyes?|hair|build|asian|african|black|white|caucasian|latino|hispanic|middle eastern|indigenous|mixed|south asian|southeast asian|\d0s|years?\s+old)\b/i.test(
      text
    )
  ) {
    return true
  }
  return false
}

/** True when narrative character `description` is empty or a stub placeholder. */
export function isMinimalCharacterDescription(description?: string | null): boolean {
  const text = clean(description)
  if (!text || text.length < 22) return true
  return PLACEHOLDER_DESCRIPTION_PATTERNS.some((re) => re.test(text))
}

/** True when standing physical `appearanceDescription` / `appearance` is empty or lacks physical specificity. */
export function isMinimalAppearanceDescription(appearance?: string | null): boolean {
  const text = clean(appearance)
  if (!text || text.length < 24) return true
  if (PLACEHOLDER_DESCRIPTION_PATTERNS.some((re) => re.test(text))) return true
  return !PHYSICAL_CUE_REGEX.test(text)
}

/**
 * Assemble a rich, camera-ready English standing physical description from structured character
 * attributes (excluding clothing/wardrobe so wardrobe prompts layer cleanly).
 */
export function composeStandingAppearanceFromAttributes(
  character: FamilyAwareCharacter,
  allCharacters?: ReadonlyArray<FamilyAwareCharacter>
): string {
  const ethnicity = clean(character.ethnicity)
  const rawAge = clean(character.age ?? character.ageRange)
  const gender = clean(character.gender).toLowerCase()
  const build = clean(character.build)
  const hairColor = clean(character.hairColor)
  const hairStyle = clean(character.hairStyle)
  const eyeColor = clean(character.eyeColor)
  const keyFeature = clean(character.keyFeature)
  const expression = clean(character.expression)

  const genderNoun =
    gender === 'female' || gender === 'woman'
      ? 'woman'
      : gender === 'male' || gender === 'man'
        ? 'man'
        : gender === 'non-binary'
          ? 'non-binary person'
          : 'person'

  const hasAnyStructured = Boolean(
    ethnicity || rawAge || build || hairColor || hairStyle || eyeColor || keyFeature || expression
  )
  if (!hasAnyStructured) return ''

  // Sentence 1: Identity core (ethnicity + gender + age + build)
  const identityLeadParts: string[] = []
  if (ethnicity) identityLeadParts.push(ethnicity)
  if (gender || ethnicity || rawAge) identityLeadParts.push(genderNoun)

  let lead = identityLeadParts.join(' ').trim()
  if (rawAge) {
    const ageFormatted = /^\d+$/.test(rawAge)
      ? `aged ${rawAge}`
      : /\b(child|teenager|teens|adult|elderly)\b/i.test(rawAge)
        ? `(${rawAge})`
        : `in their ${rawAge}`
    lead = lead ? `${lead} ${ageFormatted}` : `Person ${ageFormatted}`
  }
  if (build) {
    lead = lead ? `${lead} with ${/^(a|an)\s/i.test(build) ? build : `a ${build} build`}` : `${build} build`
  }

  // Sentence 2: Hair, eyes, facial structure & expression
  const detailParts: string[] = []
  if (hairColor && hairStyle) {
    detailParts.push(
      /\bhair\b/i.test(hairStyle) ? `${hairColor} ${hairStyle}` : `${hairColor}, ${hairStyle} hair`
    )
  } else if (hairStyle) {
    detailParts.push(/\bhair\b/i.test(hairStyle) ? hairStyle : `${hairStyle} hair`)
  } else if (hairColor) {
    detailParts.push(`${hairColor} hair`)
  }

  if (eyeColor) {
    detailParts.push(/\beyes?\b/i.test(eyeColor) ? eyeColor : `${eyeColor} eyes`)
  }
  if (keyFeature) {
    detailParts.push(keyFeature)
  }
  if (expression) {
    detailParts.push(
      /\b(expression|gaze|demeanor|look|smile)\b/i.test(expression)
        ? expression
        : `${expression} expression`
    )
  }

  const sentences: string[] = []
  if (lead) {
    sentences.push(`${lead.charAt(0).toUpperCase()}${lead.slice(1)}.`)
  }
  if (detailParts.length > 0) {
    const joined = detailParts.join(', ')
    sentences.push(`${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`)
  }

  const familyClause = buildFamilialVisualContinuityClause(character, allCharacters)
  if (familyClause) {
    sentences.push(familyClause)
  }

  return sentences.join(' ').trim()
}

/** True when a non-narrator cast member has missing or minimal baseline profile fields. */
export function characterNeedsBaselineEnrichment(character: Record<string, any>): boolean {
  if (!character || typeof character !== 'object') return false
  const role = clean(character.role).toLowerCase()
  const type = clean(character.type).toLowerCase()
  const name = clean(character.name)
  if (!name || role === 'narrator' || type === 'narrator' || type === 'description') {
    return false
  }

  const hasEthnicity = Boolean(clean(character.ethnicity))
  const hasAge = Boolean(clean(character.age ?? character.ageRange))
  const richAppearance =
    !isMinimalAppearanceDescription(character.appearanceDescription) ||
    !isMinimalAppearanceDescription(character.appearance)
  const richNarrative = !isMinimalCharacterDescription(character.description)

  return !hasEthnicity || !hasAge || !richAppearance || !richNarrative
}

const GEOGRAPHIC_ETHNICITY_HINTS: Array<{ pattern: RegExp; ethnicity: string; regionLabel: string }> = [
  { pattern: /\b(thailand|bangkok|chiang mai|phuket|isaan|thai)\b/i, ethnicity: 'Southeast Asian (Thai)', regionLabel: 'Thailand' },
  { pattern: /\b(japan|tokyo|kyoto|osaka|hokkaido|japanese)\b/i, ethnicity: 'East Asian (Japanese)', regionLabel: 'Japan' },
  { pattern: /\b(korea|seoul|busan|jeju|korean)\b/i, ethnicity: 'East Asian (Korean)', regionLabel: 'South Korea' },
  { pattern: /\b(china|beijing|shanghai|shenzhen|hong kong|taiwan|taipei|chinese|taiwanese)\b/i, ethnicity: 'East Asian (Chinese)', regionLabel: 'Greater China' },
  { pattern: /\b(vietnam|hanoi|saigon|ho chi minh|vietnamese)\b/i, ethnicity: 'Southeast Asian (Vietnamese)', regionLabel: 'Vietnam' },
  { pattern: /\b(philippines|manila|cebu|filipino|tagalog)\b/i, ethnicity: 'Southeast Asian (Filipino)', regionLabel: 'Philippines' },
  { pattern: /\b(indonesia|jakarta|bali|javanese|indonesian)\b/i, ethnicity: 'Southeast Asian (Indonesian)', regionLabel: 'Indonesia' },
  { pattern: /\b(india|mumbai|delhi|bengaluru|kolkata|chennai|indian|hindi|tamil|punjabi)\b/i, ethnicity: 'South Asian (Indian)', regionLabel: 'India' },
  { pattern: /\b(pakistan|karachi|lahore|urdu|pakistani)\b/i, ethnicity: 'South Asian (Pakistani)', regionLabel: 'Pakistan' },
  { pattern: /\b(nigeria|lagos|abuja|yoruba|igbo|nigerian)\b/i, ethnicity: 'Black (West African / Nigerian)', regionLabel: 'Nigeria' },
  { pattern: /\b(kenya|nairobi|swahili|kenyan)\b/i, ethnicity: 'Black (East African / Kenyan)', regionLabel: 'Kenya' },
  { pattern: /\b(ghana|accra|ghanaian)\b/i, ethnicity: 'Black (West African / Ghanaian)', regionLabel: 'Ghana' },
  { pattern: /\b(mexico|oaxaca|mexico city|cdmx|guadalajara|mexican)\b/i, ethnicity: 'Latino / Mexican', regionLabel: 'Mexico' },
  { pattern: /\b(colombia|bogota|medellin|colombian)\b/i, ethnicity: 'Latino / Colombian', regionLabel: 'Colombia' },
  { pattern: /\b(brazil|sao paulo|rio de janeiro|brazilian)\b/i, ethnicity: 'Brazilian / Latin American', regionLabel: 'Brazil' },
  { pattern: /\b(egypt|cairo|alexandria|egyptian)\b/i, ethnicity: 'Middle Eastern / North African (Egyptian)', regionLabel: 'Egypt' },
  { pattern: /\b(turkey|istanbul|ankara|turkish)\b/i, ethnicity: 'Turkish / Mediterranean', regionLabel: 'Turkey' },
  { pattern: /\b(ireland|dublin|galway|irish)\b/i, ethnicity: 'White (Irish)', regionLabel: 'Ireland' },
  { pattern: /\b(scandinavia|sweden|stockholm|norway|oslo|denmark|copenhagen)\b/i, ethnicity: 'White (Scandinavian)', regionLabel: 'Scandinavia' },
]

const MULTICULTURAL_OR_WESTERN_SETTING_RE =
  /\b(united\s+states|u\.s\.a?\.|america|american|pittsburgh|pennsylvania|new\s+york|manhattan|brooklyn|chicago|illinois|seattle|washington|los\s+angeles|san\s+francisco|silicon\s+valley|california|texas|houston|dallas|austin|atlanta|georgia|detroit|michigan|boston|massachusetts|ohio|cleveland|lorain|philadelphia|miami|florida|virginia|maryland|carolina|colorado|denver|arizona|oregon|portland|minnesota|vermont|new\s+jersey|connecticut|canada|toronto|vancouver|montreal|united\s+kingdom|u\.k\.|england|london|manchester|scotland|australia|sydney|melbourne|new\s+zealand|auckland|france|paris|germany|berlin|netherlands|amsterdam|switzerland|zurich|geneva|international|global|multi[-\s]?continent|diaspora)\b/i

/**
 * Infer a culturally grounded default ethnicity hint ONLY when the story's physical setting
 * and locations are exclusively grounded in a single mono-regional culture.
 *
 * Never uses `targetAudience` / `audienceDefinition` / UI `locales` to stamp cast ethnicity
 * (e.g. screening a 1970s Pittsburgh memoir for family in Thailand must NEVER turn Pittsburgh
 * characters Thai!), and returns `undefined` whenever a story spans multiple countries/regions
 * or multicultural Western settings so each character's own ethnicity/bio stands on its own.
 */
export function inferLocaleDefaultEthnicityHint(
  localization?: CharacterLocalizationContext
): string | undefined {
  if (!localization) return undefined

  const worldGeography = [
    clean(localization.setting),
    ...(localization.locations || [])
      .slice(0, 8)
      .map((l) => `${clean(l.name)} ${clean(l.location)}`),
  ]
    .filter(Boolean)
    .join(' | ')

  if (worldGeography) {
    // Multicultural / Western settings (or stories spanning e.g. Pittsburgh + Bangkok)
    // do NOT have a single blanket ethnicity for the entire cast.
    if (MULTICULTURAL_OR_WESTERN_SETTING_RE.test(worldGeography)) {
      return undefined
    }

    const matchedHints = GEOGRAPHIC_ETHNICITY_HINTS.filter((entry) =>
      entry.pattern.test(worldGeography)
    )
    if (matchedHints.length === 1) {
      return matchedHints[0]!.ethnicity
    }
    // 0 matches or >= 2 distinct countries/regions (e.g. "Bangkok and Dublin") -> no blanket default
    return undefined
  }

  // Fallback ONLY when no setting/locations exist yet and culturalSignals names a single specific culture
  const signals = localization.culturalSignals ?? localization.audienceDefinition?.culturalSignals
  if (signals?.cultures?.length === 1) {
    const singleCulture = signals.cultures[0]!.trim()
    if (MULTICULTURAL_OR_WESTERN_SETTING_RE.test(singleCulture)) return undefined
    for (const entry of GEOGRAPHIC_ETHNICITY_HINTS) {
      if (entry.pattern.test(singleCulture)) return entry.ethnicity
    }
  }

  return undefined
}

/**
 * Build a unified Localization, World Continuity & Family Genetics prompt block
 * reusable across Series, Blueprint, Script Generation, and Cast Sync.
 */
export function buildCharacterLocalizationPromptBlock(
  localization?: CharacterLocalizationContext
): string {
  const lines: string[] = [
    'CHARACTER DEPTH, LOCALIZATION & FAMILY CONSISTENCY — MANDATORY:',
    '1. STORY-ALIGNED ENGAGING BASELINE:',
    '   - Every character must have a specific dramatic purpose, playable behavioral contradiction, distinct personality, and concrete visual physicality aligned with the script, locations, props, and wardrobes.',
    '   - Never output generic stubs ("Character from script", "Supporting character", "Visual look").',
    '2. CULTURAL & GEOGRAPHIC LOCALIZATION:',
    '   - Ground character ethnicities, naming conventions, grooming, and default attire authentically in the story setting, era, locations, and target cultural context.',
    '   - Do NOT default to generic Western/American demographics when the setting, locations, or audience specify another culture or region (unless a character is explicitly written as an outsider/traveler).',
    '3. FAMILY & KINSHIP GENETIC CONSISTENCY:',
    '   - Identify all family relationships in the cast (`parent_of`, `child_of`, `sibling_of`, `grandparent_of`, `grandchild_of`, `spouse_of`) and set `"biological": true` for blood relatives vs `false` for spouses/adoptive/step relations.',
    '   - SAME-ETHNICITY PARENTS: Biological children and full siblings of parents sharing the same ethnicity MUST have that exact same ethnicity and compatible skin undertone, hair texture/color family, eye color genetics, and subtle familial bone structure.',
    '   - MIXED-ETHNICITY PARENTS: When biological parents have DIFFERENT ethnicities (e.g., Thai mother + Irish-American father), their biological children MUST be explicitly described as `"Mixed [Parent A] and [Parent B] heritage"` with blended physical features honoring both parents consistently across all biological siblings.',
    '   - GENERATIONAL AGE SPACING: Give every character a concrete `age` (e.g., `"46"` or `"mid-40s"`). Biological parents MUST be 20–38 years older than their children; grandparents MUST be 45–68 years older than grandchildren.',
    '4. INDIVIDUALS ONLY — NEVER COLLECTIVE GROUPS:',
    '   - Every character MUST be a single named individual human (or individual entity). NEVER profile plural or collective groups ("John\'s Friends", "Neighbors", "The Brothers", "Factory Workers", "Parents") as a character.',
    '5. MULTI-AGE / MULTI-ERA LIFE STAGES (SEPARATE `(Age NN)` CHARACTERS):',
    '   - Production Stage locks ONE base facial portrait per character card and uses Wardrobes ONLY for outfit changes at that same age.',
    '   - When a person appears at multiple distinct ages/decades (e.g. `John Miller (Age 16)`, `John Miller (Age 32)`, `John Miller (Age 62)`), keep each `(Age NN)` entry locked strictly to that biological age while sharing identical `ethnicity`, `gender`, `eyeColor`, and underlying facial bone structure across all life stages of that person.',
  ]

  if (localization) {
    const contextParts: string[] = []
    if (clean(localization.setting)) {
      contextParts.push(
        `- Setting / Era: ${clean(localization.setting)}${clean(localization.timeframe) ? ` (${clean(localization.timeframe)})` : ''}`
      )
    }
    if (localization.audienceDefinition) {
      contextParts.push(`- Target Audience & Cultural Context:\n  ${formatAudienceDefinitionForPrompt(localization.audienceDefinition).replace(/\n/g, '\n  ')}`)
    } else if (localization.culturalSignals) {
      const formatted = formatCulturalSignalsForPrompt(localization.culturalSignals)
      if (formatted) contextParts.push(`- Cultural Signals:\n  ${formatted.replace(/\n/g, '\n  ')}`)
    } else if (clean(localization.targetAudience)) {
      contextParts.push(`- Target Audience: ${clean(localization.targetAudience)}`)
    }

    const locSummaries = (localization.locations || [])
      .slice(0, 8)
      .map((l) => {
        const label = clean(l.name) || clean(l.location)
        const desc = clean(l.description) || clean(l.atmosphere)
        return label ? `${label}${desc ? ` (${desc.slice(0, 90)})` : ''}` : ''
      })
      .filter(Boolean)
    if (locSummaries.length > 0) {
      contextParts.push(`- Story Locations: ${locSummaries.join('; ')}`)
    }

    const propSummaries = (localization.props || [])
      .slice(0, 10)
      .map((p) => {
        const label = clean(p.name)
        const desc = clean(p.description)
        return label ? `${label}${desc ? ` (${desc.slice(0, 60)})` : ''}` : ''
      })
      .filter(Boolean)
    if (propSummaries.length > 0) {
      contextParts.push(`- Key Story Props: ${propSummaries.join('; ')}`)
    }

    if (contextParts.length > 0) {
      lines.push('', 'ACTIVE WORLD & LOCALIZATION SIGNALS:', ...contextParts)
    }
  }

  return lines.join('\n')
}

export function collectCharacterScriptEvidence(
  characterName: string,
  scenes: Array<Record<string, any>>
): string {
  if (!Array.isArray(scenes) || scenes.length === 0) return ''
  const normTarget = normalizeCharacterName(characterName)
  const firstToken = characterName.trim().split(/\s+/)[0]?.toLowerCase() || ''

  const matchedSnippets: string[] = []
  const dialogueSamples: string[] = []

  scenes.forEach((scene, idx) => {
    if (!scene || typeof scene !== 'object') return
    const sceneNum = scene.sceneNumber ?? idx + 1
    const heading =
      typeof scene.heading === 'string' ? scene.heading : clean(scene.heading?.text)
    const action = clean(scene.action)
    const visual = clean(scene.visualDescription)

    const charDialogue = (Array.isArray(scene.dialogue) ? scene.dialogue : []).filter(
      (d: any) => normalizeCharacterName(clean(d?.character)) === normTarget
    )

    const mentionedInText =
      charDialogue.length > 0 ||
      (firstToken.length >= 3 &&
        (action.toLowerCase().includes(firstToken) || visual.toLowerCase().includes(firstToken))) ||
      (Array.isArray(scene.characters) &&
        scene.characters.some((c: any) =>
          normalizeCharacterName(typeof c === 'string' ? c : clean(c?.name)) === normTarget
        ))

    if (!mentionedInText) return

    if (matchedSnippets.length < 6) {
      const actionExcerpt = [action, visual].filter(Boolean).join(' ').slice(0, 220)
      matchedSnippets.push(
        `Scene ${sceneNum}${heading ? ` (${heading})` : ''}${actionExcerpt ? `: ${actionExcerpt}` : ''}`
      )
    }

    for (const d of charDialogue) {
      if (dialogueSamples.length >= 6) break
      const line = clean(d?.line)
      if (line) dialogueSamples.push(`"${line.slice(0, 140)}"`)
    }
  })

  const parts: string[] = []
  if (matchedSnippets.length > 0) parts.push(`Scenes: ${matchedSnippets.join(' | ')}`)
  if (dialogueSamples.length > 0) parts.push(`Dialogue: ${dialogueSamples.join(' / ')}`)
  return parts.join('\n    ')
}

/**
 * Deterministic fallback that enriches minimal characters using story context,
 * localization hints, family consistency, and structured attributes when Gemini is unavailable.
 */
export function enrichEnsembleCastFallback(
  input: EnsembleCastIntelligenceInput
): EnsembleCastIntelligenceResult {
  const defaultEthnicity =
    inferLocaleDefaultEthnicityHint(input.localization) || 'Culturally grounded to story setting'
  const familyConsistent = enforceEnsembleFamilyConsistency(
    input.characters.map((c) => ({ ...c })),
    {
      scenes: input.scenes,
      defaultLocaleEthnicity: inferLocaleDefaultEthnicityHint(input.localization),
    }
  )

  const updates: CastCharacterSyncUpdate[] = []
  const enriched = familyConsistent.map((char, idx) => {
    const role = clean(char.role).toLowerCase()
    const type = clean(char.type).toLowerCase()
    if (role === 'narrator' || type === 'narrator' || type === 'description') {
      return char
    }

    const enrichedFields: string[] = []
    const next: Record<string, any> = { ...char }

    if (!clean(next.ethnicity)) {
      next.ethnicity = defaultEthnicity
      enrichedFields.push('ethnicity')
    }
    if (!clean(next.age) && !clean(next.ageRange)) {
      const fallbackAge = role === 'protagonist' ? 'early 30s' : 'mid 30s'
      next.age = fallbackAge
      next.ageRange = fallbackAge
      enrichedFields.push('age')
    } else if (clean(next.age) !== clean(char.age)) {
      enrichedFields.push('age')
    }
    if (clean(next.ethnicity) !== clean(char.ethnicity) && !enrichedFields.includes('ethnicity')) {
      enrichedFields.push('ethnicity')
    }

    if (!clean(next.build)) {
      next.build = 'natural proportioned'
      enrichedFields.push('build')
    }
    if (!clean(next.expression)) {
      next.expression = 'attentive, grounded demeanor'
      enrichedFields.push('expression')
    }

    if (isMinimalAppearanceDescription(next.appearanceDescription)) {
      const composed = composeStandingAppearanceFromAttributes(next, familyConsistent)
      if (composed) {
        next.appearanceDescription = composed
        if (isMinimalAppearanceDescription(next.appearance)) {
          next.appearance = composed
        }
        enrichedFields.push('appearanceDescription')
      }
    }

    if (isMinimalCharacterDescription(next.description)) {
      const settingLabel = clean(input.storyContext?.setting || input.localization?.setting)
      const relSummary = Array.isArray(next.familyRelationships) && next.familyRelationships.length > 0
        ? ` Connected by family ties (${next.familyRelationships
            .map((r: CharacterFamilyRelationship) => `${r.relation.replace(/_/g, ' ')} ${r.relatedCharacterName}`)
            .join(', ')}).`
        : ''
      next.description = `${clean(next.name)} serves a pivotal ${clean(next.role) || 'supporting'} role${settingLabel ? ` within ${settingLabel}` : ''}, bringing distinct perspective and interpersonal tension to the ensemble.${relSummary}`
      enrichedFields.push('description')
    }

    if (isPoisonedPlaceholderImagePrompt(next.imagePrompt)) {
      delete next.imagePrompt
      enrichedFields.push('imagePrompt')
    }

    if (enrichedFields.length > 0) {
      const patch: Partial<EnrichedCharacterProfile> = {}
      for (const field of enrichedFields) {
        ;(patch as Record<string, unknown>)[field] = next[field]
      }
      if (Array.isArray(next.familyRelationships) && next.familyRelationships.length > 0) {
        patch.familyRelationships = next.familyRelationships
      }
      updates.push({
        characterId: clean(next.id) || `char-${idx}`,
        characterName: clean(next.name),
        patch,
        enrichedFields,
        reason: 'Enriched baseline profile with ensemble family & localization consistency',
      })
    }

    return next
  })

  return {
    characters: enriched,
    updates,
    analysis: 'Applied deterministic localization and family consistency baseline.',
    usedFallback: true,
  }
}
