/**
 * Server-Only Ensemble Cast Intelligence (Vertex AI Gemini)
 *
 * Separated from `./characterIntelligence.ts` so client components (`CharacterLibrary.tsx`,
 * `StudioPageClient.tsx`, `TreatmentCard.tsx`, etc.) can import pure character/localization
 * helpers without Turbopack tracing `@/lib/vertexai/gemini` (`google-auth-library`, `fs`, `net`)
 * into browser chunks.
 */

import 'server-only'

import { generateText } from '@/lib/vertexai/gemini'
import { safeParseJsonFromText } from '@/lib/safeJson'
import { normalizeCharacterName } from '@/lib/character/detection'
import { localeDirective } from '@/lib/prompts/localeDirective'
import {
  buildFamilialVisualContinuityClause,
  enforceEnsembleFamilyConsistency,
  normalizeKinshipRelation,
  type CharacterFamilyRelationship,
} from '@/lib/character/characterFamily'
import {
  buildCharacterLocalizationPromptBlock,
  characterNeedsBaselineEnrichment,
  collectCharacterScriptEvidence,
  composeStandingAppearanceFromAttributes,
  enrichEnsembleCastFallback,
  inferLocaleDefaultEthnicityHint,
  isMinimalAppearanceDescription,
  isMinimalCharacterDescription,
  isPoisonedPlaceholderImagePrompt,
  type CastCharacterSyncUpdate,
  type EnrichedCharacterProfile,
  type EnsembleCastIntelligenceInput,
  type EnsembleCastIntelligenceResult,
} from '@/lib/character/characterIntelligence'

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

      const pickVisualField = (
        existingVal: unknown,
        suggestedVal: unknown,
        isMinimalFn?: (v?: string | null) => boolean
      ): string => {
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
          const parsedRel = normalizeKinshipRelation(
            rawRel?.relation,
            rawRel?.biological,
            rawRel?.label
          )
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

      const resolvedAge = pickVisualField(
        existing.age ?? existing.ageRange,
        suggestion.age ?? suggestion.ageRange
      )
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
        wardrobeAccessories: pickVisualField(
          existing.wardrobeAccessories,
          suggestion.wardrobeAccessories
        ),
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
