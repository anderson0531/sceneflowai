/**
 * Character & Ensemble Intelligence Engine
 *
 * Provides automated, story-aligned, culturally localized, and family-consistent
 * character baselines across Series Studio, Blueprint Studio, Script Generation,
 * and Production Continuity (Cast Agent & Reference Express).
 */

import { safeParseJsonFromText } from '@/lib/safeJson'
import { normalizeCharacterName } from '@/lib/character/detection'
import { localeDirective } from '@/lib/prompts/localeDirective'
import {
  formatAudienceDefinitionForPrompt,
  formatCulturalSignalsForPrompt,
  type AudienceCulturalSignals,
  type AudienceDefinition,
} from '@/lib/types/audienceResonance'
import {
  buildFamilialVisualContinuityClause,
  enforceEnsembleFamilyConsistency,
  normalizeKinshipRelation,
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

/**
 * Infer a culturally grounded default ethnicity hint when the story's setting,
 * locations, or audience cultural signals point to a specific region/culture.
 */
export function inferLocaleDefaultEthnicityHint(
  localization?: CharacterLocalizationContext
): string | undefined {
  if (!localization) return undefined

  const signals = localization.culturalSignals ?? localization.audienceDefinition?.culturalSignals
  if (signals?.cultures?.length === 1) {
    const singleCulture = signals.cultures[0]!.trim()
    for (const entry of GEOGRAPHIC_ETHNICITY_HINTS) {
      if (entry.pattern.test(singleCulture)) return entry.ethnicity
    }
    if (singleCulture.length >= 3) return singleCulture
  }

  const combinedSetting = [
    clean(localization.setting),
    clean(localization.targetAudience),
    clean(localization.audienceDefinition?.description),
    ...(signals?.locales || []),
    ...(localization.locations || []).slice(0, 6).map((l) => `${clean(l.name)} ${clean(l.location)}`),
  ]
    .filter(Boolean)
    .join(' | ')

  for (const entry of GEOGRAPHIC_ETHNICITY_HINTS) {
    if (entry.pattern.test(combinedSetting)) {
      return entry.ethnicity
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

function collectCharacterScriptEvidence(
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

/**
 * Run holistic AI Casting Director + Dramaturg analysis across the entire cast ensemble,
 * grounding every character in the script, setting, locations, props, wardrobes,
 * localization signals, and biological/mixed family genetics.
 */
export async function enrichEnsembleCastWithIntelligence(
  input: EnsembleCastIntelligenceInput
): Promise<EnsembleCastIntelligenceResult> {
  const safeCharacters = Array.isArray(input.characters) ? input.characters : []
  const nonNarratorCast = safeCharacters.filter((c) => {
    const role = clean(c?.role).toLowerCase()
    const type = clean(c?.type).toLowerCase()
    return Boolean(clean(c?.name)) && role !== 'narrator' && type !== 'narrator' && type !== 'description'
  })

  if (nonNarratorCast.length === 0) {
    return {
      characters: safeCharacters,
      updates: [],
      analysis: 'No cast characters to enrich.',
      usedFallback: false,
    }
  }

  // First pre-link obvious family edges from existing bios & scenes so the LLM sees them explicitly
  const preLinked = enforceEnsembleFamilyConsistency(
    safeCharacters.map((c) => ({ ...c })),
    {
      scenes: input.scenes,
      defaultLocaleEthnicity: inferLocaleDefaultEthnicityHint(input.localization),
    }
  )

  const anyNeedsEnrichment =
    input.forceOverwrite === true ||
    preLinked.some((c) => characterNeedsBaselineEnrichment(c))

  if (!anyNeedsEnrichment) {
    // Still return any family-consistency updates discovered deterministically!
    const deterministicUpdates: CastCharacterSyncUpdate[] = []
    preLinked.forEach((afterChar, i) => {
      const beforeChar = safeCharacters[i] || {}
      const changedFields: string[] = []
      const patch: Record<string, unknown> = {}
      if (clean(afterChar.ethnicity) !== clean(beforeChar.ethnicity)) {
        changedFields.push('ethnicity')
        patch.ethnicity = afterChar.ethnicity
      }
      if (clean(afterChar.age) !== clean(beforeChar.age)) {
        changedFields.push('age')
        patch.age = afterChar.age
      }
      const prevRelLen = Array.isArray(beforeChar.familyRelationships)
        ? beforeChar.familyRelationships.length
        : 0
      const nextRelLen = Array.isArray(afterChar.familyRelationships)
        ? afterChar.familyRelationships.length
        : 0
      if (nextRelLen > prevRelLen) {
        changedFields.push('familyRelationships')
        patch.familyRelationships = afterChar.familyRelationships
      }
      if (changedFields.length > 0) {
        deterministicUpdates.push({
          characterId: clean(afterChar.id) || `char-${i}`,
          characterName: clean(afterChar.name),
          patch,
          enrichedFields: changedFields,
          reason: 'Synchronized family lineage, ethnicity, and generational age spacing',
        })
      }
    })
    return {
      characters: preLinked,
      updates: deterministicUpdates,
      analysis: 'Cast profiles already complete; verified family & localization consistency.',
      usedFallback: false,
    }
  }

  const localizationBlock = buildCharacterLocalizationPromptBlock(input.localization)
  const properNouns = nonNarratorCast.map((c) => clean(c.name)).filter(Boolean)
  const langBlock = localeDirective(input.localization?.storyLocale, {
    properNouns,
    keepEnglishFields: ['age', 'ageRange', 'gender', 'appearance', 'relation'],
  })

  const castRosterPrompt = preLinked
    .map((c, idx) => {
      const role = clean(c.role).toLowerCase()
      const type = clean(c.type).toLowerCase()
      if (role === 'narrator' || type === 'narrator' || type === 'description') return ''
      const existingWardrobeSummary = Array.isArray(c.wardrobes) && c.wardrobes.length > 0
        ? c.wardrobes
            .slice(0, 3)
            .map((w: any) => `${clean(w.name)}: ${clean(w.description)}`)
            .join(' | ')
        : clean(c.defaultWardrobe)
      const relSummary = Array.isArray(c.familyRelationships) && c.familyRelationships.length > 0
        ? c.familyRelationships
            .map((r: CharacterFamilyRelationship) => `${r.relation} ${r.relatedCharacterName} (biological=${r.biological})`)
            .join(', ')
        : 'none detected yet — infer from names, dialogue, and story!'
      const scriptEvidence = input.scenes?.length
        ? collectCharacterScriptEvidence(clean(c.name), input.scenes)
        : ''

      return `[${idx + 1}] NAME: "${clean(c.name)}" (ID: "${clean(c.id) || `char-${idx}`}", Role: ${clean(c.role) || 'supporting'})
    Current Description: ${clean(c.description) || '(minimal/missing)'}
    Current Appearance: ${clean(c.appearanceDescription) || clean(c.appearance) || '(missing)'}
    Current Attributes: age=${clean(c.age ?? c.ageRange) || '?'}, gender=${clean(c.gender) || '?'}, ethnicity=${clean(c.ethnicity) || '?'}, build=${clean(c.build) || '?'}, hair=${clean(c.hairColor)} ${clean(c.hairStyle)}, eyes=${clean(c.eyeColor) || '?'}
    Wardrobes: ${existingWardrobeSummary || '(not yet specified)'}
    Known Family Links: ${relSummary}${scriptEvidence ? `\n    ${scriptEvidence}` : ''}`
    })
    .filter(Boolean)
    .join('\n\n')

  const storySummary = [
    input.storyContext?.title ? `Title: ${input.storyContext.title}` : '',
    input.storyContext?.genre ? `Genre: ${input.storyContext.genre}` : '',
    input.storyContext?.tone ? `Tone: ${input.storyContext.tone}` : '',
    input.storyContext?.setting || input.localization?.setting
      ? `Setting: ${input.storyContext?.setting || input.localization?.setting}`
      : '',
    input.storyContext?.logline ? `Logline: ${input.storyContext.logline}` : '',
    input.storyContext?.synopsis ? `Synopsis: ${input.storyContext.synopsis.slice(0, 1200)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are a master Film & Series Casting Director, Dramaturg, and Continuity Supervisor.
Analyze the entire ensemble cast together against the storyline, script scenes, dialogue, locations, props, wardrobes, and cultural localization signals. Create rich, engaging, story-enhancing baseline profiles for every cast member while strictly enforcing family/genetic consistency across relatives.

${localizationBlock}
${langBlock}
STORY CONTEXT:
${storySummary || 'Contemporary narrative'}

ENSEMBLE CAST TO PROFILE TOGETHER:
${castRosterPrompt}

CRITICAL PRESERVATION & COHERENCE RULES:
1. Reproduce each character's exact \`name\` and \`id\`. Do NOT rename existing characters.
2. Where a character ALREADY has a specific, non-placeholder physical trait or established ethnic heritage that fits the story, preserve it and design their biological relatives (parents, children, siblings, grandparents) to be genetically consistent with it!
3. If two biological parents have DIFFERENT ethnicities, their biological children MUST have \`ethnicity\` set to \`"Mixed [Parent A Ethnicity] and [Parent B Ethnicity] heritage"\` and \`appearanceDescription\` describing blended features from both parents.
4. \`appearanceDescription\` MUST be 2–3 vivid English sentences describing standing physical identity ONLY (age band, ethnicity/skin tone, standing height in feet like \`5'7" tall\`, build, facial bone structure, hair color/style/texture, eye color/shape, defining physical feature, natural resting expression, and familial resemblance if related). EXCLUDE clothing, props, and injuries from \`appearanceDescription\`.
5. \`defaultWardrobe\` & \`wardrobeAccessories\` MUST describe signature baseline clothing in English aligned with the script scenes, setting, culture, and Locations/Props.
6. For \`gender\`: use \`"male"\`, \`"female"\`, or \`"non-binary"\` based on script pronouns, kinship terms (mother/father/son/daughter), and story cues.

Return ONLY valid JSON matching this exact schema:
{
  "analysis": "Brief ensemble casting, localization, and family-lineage continuity summary",
  "characters": [
    {
      "id": "exact ID from input",
      "name": "exact Name from input",
      "role": "protagonist | antagonist | supporting",
      "age": "concrete age or narrow band in English, e.g. '44' or 'early 40s (42)'",
      "gender": "male | female | non-binary",
      "ethnicity": "specific culturally grounded ethnicity or 'Mixed X and Y heritage' in English",
      "build": "height + physique in English, e.g. '5\\'10\\" tall, lean wiry build'",
      "hairStyle": "specific style, length, and texture in English",
      "hairColor": "specific hair color in English",
      "eyeColor": "specific eye color in English",
      "keyFeature": "distinctive facial/physical trait in English (not a job title)",
      "expression": "characteristic resting expression in English",
      "appearanceDescription": "2-3 vivid sentences of standing physical identity in English (no clothing)",
      "defaultWardrobe": "signature baseline outfit in English matching script & setting",
      "wardrobeAccessories": "signature everyday accessories in English",
      "description": "2-3 engaging sentences: narrative role, playable contradiction, and dynamic with other characters",
      "personality": "vivid playable traits and vocal cadence",
      "externalGoal": "active visible objective in the story",
      "internalNeed": "deeper emotional truth",
      "fatalFlaw": "playable blind spot or vulnerability",
      "voiceDescription": "TTS casting vocal timbre, register, pace, and texture in English",
      "familyRelationships": [
        {
          "relatedCharacterName": "Exact Name of relative in cast",
          "relation": "parent_of | child_of | sibling_of | grandparent_of | grandchild_of | spouse_of | extended_kin_of",
          "biological": true,
          "label": "e.g. Mother of Kai"
        }
      ]
    }
  ]
}`

  try {
    const { generateText } = await import('@/lib/vertexai/gemini')
    const response = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.45,
      maxOutputTokens: 6144,
      responseMimeType: 'application/json',
    })

    const parsed = safeParseJsonFromText(response.text) as {
      analysis?: string
      characters?: Array<Record<string, any>>
    }
    const aiChars = Array.isArray(parsed?.characters) ? parsed.characters : []
    if (aiChars.length === 0) {
      return enrichEnsembleCastFallback(input)
    }

    const aiById = new Map<string, Record<string, any>>()
    const aiByNormName = new Map<string, Record<string, any>>()
    for (const item of aiChars) {
      if (!item || typeof item !== 'object') continue
      const id = clean(item.id)
      const normName = normalizeCharacterName(clean(item.name))
      if (id) aiById.set(id, item)
      if (normName) aiByNormName.set(normName, item)
    }

    // Merge AI suggestions non-destructively onto existing characters
    const mergedRaw = preLinked.map((existing, idx) => {
      const role = clean(existing.role).toLowerCase()
      const type = clean(existing.type).toLowerCase()
      if (role === 'narrator' || type === 'narrator' || type === 'description') {
        return existing
      }

      const id = clean(existing.id)
      const normName = normalizeCharacterName(clean(existing.name))
      const suggestion = (id && aiById.get(id)) || (normName && aiByNormName.get(normName))
      if (!suggestion) return existing

      const force = input.forceOverwrite === true
      const hasDrawnPortrait = Boolean(clean(existing.referenceImage))

      const pickVisualField = (existingVal: unknown, suggestedVal: unknown, isMinimalFn?: (v?: string | null) => boolean): string => {
        const cur = clean(existingVal)
        const sug = clean(suggestedVal)
        if (!sug) return cur
        if (force && !hasDrawnPortrait) return sug
        if (!cur || (isMinimalFn && isMinimalFn(cur))) return sug
        return cur
      }

      const nextRels: CharacterFamilyRelationship[] = [
        ...(Array.isArray(existing.familyRelationships) ? existing.familyRelationships : []),
      ]
      if (Array.isArray(suggestion.familyRelationships)) {
        for (const rawRel of suggestion.familyRelationships) {
          const targetName = clean(rawRel?.relatedCharacterName)
          const parsedRel = normalizeKinshipRelation(rawRel?.relation, rawRel?.biological, rawRel?.label)
          if (!targetName || !parsedRel) continue
          const already = nextRels.some(
            (r) =>
              normalizeCharacterName(r.relatedCharacterName) === normalizeCharacterName(targetName)
          )
          if (!already) {
            nextRels.push({
              relatedCharacterName: targetName,
              relation: parsedRel.relation,
              biological: parsedRel.biological,
              ...(clean(rawRel?.label) ? { label: clean(rawRel.label) } : {}),
            })
          }
        }
      }

      const resolvedAge = pickVisualField(existing.age ?? existing.ageRange, suggestion.age ?? suggestion.ageRange)
      const next: Record<string, any> = {
        ...existing,
        id: existing.id || `char-${idx}`,
        role:
          clean(existing.role) && clean(existing.role) !== 'character'
            ? existing.role
            : clean(suggestion.role) || 'supporting',
        age: resolvedAge || existing.age,
        ageRange: resolvedAge || existing.ageRange,
        gender: pickVisualField(existing.gender, suggestion.gender),
        ethnicity: pickVisualField(existing.ethnicity, suggestion.ethnicity),
        build: pickVisualField(existing.build, suggestion.build),
        hairStyle: pickVisualField(existing.hairStyle, suggestion.hairStyle),
        hairColor: pickVisualField(existing.hairColor, suggestion.hairColor),
        eyeColor: pickVisualField(existing.eyeColor, suggestion.eyeColor),
        keyFeature: pickVisualField(existing.keyFeature, suggestion.keyFeature),
        expression: pickVisualField(existing.expression, suggestion.expression),
        defaultWardrobe: pickVisualField(existing.defaultWardrobe, suggestion.defaultWardrobe),
        wardrobeAccessories: pickVisualField(existing.wardrobeAccessories, suggestion.wardrobeAccessories),
        description: pickVisualField(
          existing.description,
          suggestion.description,
          isMinimalCharacterDescription
        ),
        personality: pickVisualField(existing.personality, suggestion.personality),
        externalGoal: pickVisualField(existing.externalGoal, suggestion.externalGoal),
        internalNeed: pickVisualField(existing.internalNeed, suggestion.internalNeed),
        fatalFlaw: pickVisualField(existing.fatalFlaw, suggestion.fatalFlaw),
        voiceDescription: pickVisualField(existing.voiceDescription, suggestion.voiceDescription),
        ...(nextRels.length > 0 ? { familyRelationships: nextRels } : {}),
      }

      const nextAppearance = pickVisualField(
        existing.appearanceDescription || existing.appearance,
        suggestion.appearanceDescription || suggestion.appearance,
        isMinimalAppearanceDescription
      )
      if (nextAppearance) {
        if (force || isMinimalAppearanceDescription(existing.appearanceDescription)) {
          next.appearanceDescription = nextAppearance
        }
        if (force || isMinimalAppearanceDescription(existing.appearance)) {
          next.appearance = nextAppearance
        }
      }

      if (isPoisonedPlaceholderImagePrompt(next.imagePrompt)) {
        delete next.imagePrompt
      }

      return next
    })

    // Deterministic post-pass guarantees 100% family ethnicity (same or mixed!) and generational age consistency
    const finalCharacters = enforceEnsembleFamilyConsistency(mergedRaw, {
      scenes: input.scenes,
      defaultLocaleEthnicity: inferLocaleDefaultEthnicityHint(input.localization),
    }).map((char, idx, all) => {
      const role = clean(char.role).toLowerCase()
      const type = clean(char.type).toLowerCase()
      if (role === 'narrator' || type === 'narrator' || type === 'description') return char
      const next: Record<string, any> = { ...char }

      // Ensure familial continuity & any updated inherited ethnicity/age are reflected in appearanceDescription if not locked by a drawn portrait
      const beforePreLink = safeCharacters[idx] || {}
      const hadUserAuthoredAppearance =
        !isMinimalAppearanceDescription(beforePreLink.appearanceDescription) &&
        Boolean(clean(beforePreLink.referenceImage))

      if (!hadUserAuthoredAppearance) {
        const familyClause = buildFamilialVisualContinuityClause(next, all)
        if (isMinimalAppearanceDescription(next.appearanceDescription)) {
          const composed = composeStandingAppearanceFromAttributes(next, all)
          if (composed) {
            next.appearanceDescription = composed
            if (isMinimalAppearanceDescription(next.appearance)) {
              next.appearance = composed
            }
          }
        } else if (
          familyClause &&
          !clean(next.appearanceDescription).toLowerCase().includes('familial lineage:')
        ) {
          next.appearanceDescription = `${clean(next.appearanceDescription).replace(/\.*\s*$/, '.')} ${familyClause}`
        }
      }
      return next
    })

    // Compute clean per-character diff updates
    const TRACKED_FIELDS = [
      'role',
      'age',
      'ageRange',
      'gender',
      'ethnicity',
      'build',
      'hairStyle',
      'hairColor',
      'eyeColor',
      'keyFeature',
      'expression',
      'appearance',
      'appearanceDescription',
      'defaultWardrobe',
      'wardrobeAccessories',
      'description',
      'personality',
      'externalGoal',
      'internalNeed',
      'fatalFlaw',
      'voiceDescription',
    ] as const

    const updates: CastCharacterSyncUpdate[] = []
    finalCharacters.forEach((afterChar, idx) => {
      const beforeChar = safeCharacters[idx] || {}
      const patch: Record<string, unknown> = {}
      const enrichedFields: string[] = []

      for (const field of TRACKED_FIELDS) {
        const beforeVal = clean(beforeChar[field])
        const afterVal = clean(afterChar[field])
        if (afterVal && afterVal !== beforeVal) {
          patch[field] = afterChar[field]
          enrichedFields.push(field)
        }
      }

      const beforeRels = JSON.stringify(beforeChar.familyRelationships || [])
      const afterRels = JSON.stringify(afterChar.familyRelationships || [])
      if (afterRels !== beforeRels && Array.isArray(afterChar.familyRelationships)) {
        patch.familyRelationships = afterChar.familyRelationships
        enrichedFields.push('familyRelationships')
      }

      if (isPoisonedPlaceholderImagePrompt(beforeChar.imagePrompt) && !afterChar.imagePrompt) {
        patch.imagePrompt = undefined
        enrichedFields.push('imagePrompt')
      }

      if (enrichedFields.length > 0) {
        updates.push({
          characterId: clean(afterChar.id) || `char-${idx}`,
          characterName: clean(afterChar.name),
          patch: patch as Partial<EnrichedCharacterProfile>,
          enrichedFields,
          reason:
            clean(parsed?.analysis) ||
            'Enriched character baseline from script, world localization, and family continuity',
        })
      }
    })

    return {
      characters: finalCharacters,
      updates,
      analysis:
        clean(parsed?.analysis) ||
        `Enriched ${updates.length} cast profile(s) with story, localization, and family continuity.`,
      usedFallback: false,
    }
  } catch (err) {
    console.warn('[CharacterIntelligence] Gemini ensemble pass failed, using deterministic fallback:', err)
    return enrichEnsembleCastFallback(input)
  }
}
