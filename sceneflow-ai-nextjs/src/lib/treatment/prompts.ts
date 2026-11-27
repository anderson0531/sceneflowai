import {
  type ContentIntent,
  type ProductionFormat,
  buildPacingPhilosophyBlock,
  formatLabel,
  getFormatBlock,
  getIntentPromptBlocks,
  resolveBlueprintProductionFormat,
  resolveContentIntent,
  resolveContentIntentFromMetadata,
} from '@/lib/content/contentIntent'
import { getSeriesProductionProfile } from '@/config/series/productionFormats'
import {
  buildFoundationPromptBlock,
  getArtStylePresetName,
  resolveVariantArtStyle,
  resolveVariantAspectRatio,
} from '@/lib/treatment/blueprintFoundation'
import { BLUEPRINT_CHARACTER_IDENTITY_BLOCK } from '@/lib/character/characterNamingPrompt'
import { localeDirective } from '@/lib/prompts/localeDirective'

type Format = ProductionFormat

function nonFictionChecklistGenre(format: Format): string {
  switch (format) {
    case 'education':
    case 'training':
    case 'news':
    case 'podcast':
    case 'interview':
    case 'explainer':
    case 'advertisement':
      return format
    case 'product_demo':
      return 'product_demo'
    case 'case_study':
      return 'case_study'
    case 'documentary':
    default:
      return 'documentary'
  }
}

const NONFICTION_SCHEMA_OVERRIDE = `
SCHEMA FIELD OVERRIDE (NON-FICTION):
- "protagonist" is the narrator or host who presents the creator's stated subject. Not a fictional hero.
- "antagonist" is the real issue, event, or question being examined. Not a fictional villain.
- fatalFlaw is a real obstacle only. Do NOT invent a fatal flaw.
- scene_descriptions and illustrations depict the events being narrated.
- Do NOT invent a fictional plot or cast.`

// =============================================================================
// STATIC SCHEMA TEMPLATE - Built once at module load, not per-request
// This reduces memory allocation by ~3KB per request
// =============================================================================
const TREATMENT_SCHEMA_TEMPLATE = `SCHEMA - GENERATE IN THIS EXACT ORDER:
{
  "character_focus": "REQUIRED: Who is the protagonist and why? How do supporting characters serve the arc? (2-3 sentences)",
  "key_decisions": [
    {
      "decision": "REQUIRED: Major creative choice made",
      "why": "REQUIRED: Narrative justification",
      "impact": "REQUIRED: Effect on emotional arc, pacing, or thematic resonance"
    }
  ],
  "story_strengths": "REQUIRED: What makes this treatment compelling? (2-3 sentences)",
  "user_adjustments": "REQUIRED: How can user modify input for different emphasis? (2-3 sentences)",
  
  "estimatedDurationMinutes": "__TARGET_MINUTES__",
  
  "title": "Proposed title",
  "logline": "One- or two-sentence hook",
  "genre": "Genre",
  "format_length": "Featurette (30–60m) | Feature (60–120m) | Series episode | Short (5–30m) | …",
  "synopsis": "≤400 words",
  "audience": "string",
  "tone": "string",
  "style": "string",
  "target_audience": "Concrete audience description",
  "setting": "Time/place + world rules",
  "protagonist": "Main character brief (goal/flaw)",
  "antagonist": "Primary opposing force/conflict",
  
  "character_descriptions": [
    {
      "name": "SINGLE INDIVIDUAL FULL NAME (NEVER a group). If person appears at multiple ages/eras (>=10 yrs apart), create separate entries named '[Full Name] (Age NN)', e.g. '[Character] (Age 16)', '[Character] (Age 32)', '[Character] (Age 62)'",
      "role": "protagonist | supporting | antagonist",
      "subject": "Full name with title/nickname reflecting cultural background",
      "age": "Exact biological age for THIS entry in English (e.g. '16' or '32' or '62') — NEVER a multi-decade span like '16-62'",
      "gender": "male | female | non-binary",
      "ethnicity": "Specific heritage in English (or 'Mixed [Parent A] and [Parent B] heritage' when biological parents differ)",
      "keyFeature": "Defining natural facial/physical feature in English",
      "hairStyle": "Specific style, length, texture in English",
      "hairColor": "Exact hair color in English",
      "eyeColor": "Exact eye color in English",
      "expression": "Typical facial expression/demeanor in English",
      "build": "Body type, physique, posture in English",
      "appearance": "2-3 vivid English sentences of standing physical appearance (no clothing) for casting continuity",
      "defaultWardrobe": "Primary outfit/attire appropriate to role, setting, AND cultural background in English",
      "wardrobeAccessories": "Consistent accessories worn throughout in English",
      "voiceFingerprint": "Distinctive speech cadence, vocabulary level, syntactic rhythm, and verbal tells so this character sounds unmistakable in dialogue",
      "description": "Role in narrative + playable behavioral contradiction, vocal cadence, and dynamic with other characters",
      "familyRelationships": [
        {
          "relatedCharacterName": "Exact Name of related cast member",
          "relation": "parent_of | child_of | sibling_of | grandparent_of | grandchild_of | spouse_of",
          "biological": true
        }
      ],
      "externalGoal": "REQUIRED: What they visibly and actively pursue",
      "internalNeed": "REQUIRED: Deeper emotional truth that collides with their externalGoal",
      "fatalFlaw": "REQUIRED: Playable weakness/blind spot creating active obstacles",
      "arcStartingState": "REQUIRED: Who they are at start (beliefs, defenses, status)",
      "arcShift": "REQUIRED: Crucible moment that forces change",
      "arcEndingState": "REQUIRED: Who they become (transformed state)"
    }
  ],
  
  "scene_descriptions": [
    {
      "name": "Location Name",
      "type": "INT | EXT",
      "location": "Specific place, size, layout, and staging zones",
      "atmosphere": "Lighting, time of day, weather, mood, and sensory texture",
      "furniture_props": "Key interactive objects, furniture, and visual anchors"
    }
  ],

  "prop_descriptions": [
    {
      "name": "Prop Name",
      "category": "prop | vehicle | set_piece | technology | document | wardrobe_item",
      "description": "Visual appearance, material, condition, and scale",
      "significance": "Narrative or functional role in the story",
      "importance": "critical | high | medium | low"
    }
  ],
  
  "themes": ["Theme 1", "Theme 2"],
  "opening_hook": "Immediate visual and dramatic hook that grabs the audience in the opening moments",
  "cta": "__CTA_VALUE__",
  "learning_objectives": __LEARNING_VALUE__,
  "beats": [
    { "title": "Beat title", "eraOrAge": "Year/era & protagonist age if multi-era (e.g. '1968 — Age 16')", "intent": "Narrative/dramatic purpose + value shift (fiction) OR clarifying/illustrative purpose (non-fiction)", "synopsis": "≤150 words: state the entering conflict/hook, the concrete visual action on screen, and the THEREFORE/BUT turn that propels into the next beat", "minutes": 3.5, "characters": ["Exact Individual Character Name from character_descriptions (use matching '(Age NN)' entry for this beat's era)"] },
    { "title": "Next beat title", "eraOrAge": "e.g. '1984 — Age 32'", "intent": "Its own distinct purpose escalated by the prior beat", "synopsis": "≤150 words: causal consequence/complication, vivid on-screen action, and closing turn/hook", "minutes": 1.75, "characters": ["Exact Individual Character Name"] },
    { "title": "…continue until the whole story is covered", "eraOrAge": "…", "intent": "…", "synopsis": "…", "minutes": 4, "characters": ["…"] }
  ],
  "visual_style": "string",
  "audio_direction": "string",
  "broll_suggestions": ["string"]
}`

// =============================================================================
// STATIC BASE INSTRUCTIONS - Built once at module load
// =============================================================================
const CULTURAL_AUTHENTICITY_BLOCK = BLUEPRINT_CHARACTER_IDENTITY_BLOCK

const SERIES_LIBRARY_IDENTITY_BLOCK = `
CHARACTER, LOCATION, AND PROP IDENTITY — SERIES LIBRARY:
- The series reference library is the source of characters, locations, and props.
- Use each locked name, role, and description verbatim. Do not rename or replace them.
- Write this episode's arc around those characters. Do not invent a parallel cast.
- A new character, location, or prop is allowed only when it is not already in the library. Set "isNew": true and start its description with "New:".
- Follow the consistency rules, story threads, canon events, and previous episodes in the continuity block. Do not contradict them.`

const OUTPUT_RULES_BLOCK = `
OUTPUT RULES - CRITICAL:
1. **START YOUR JSON WITH THESE 4 REQUIRED FIELDS** (in this exact order):
   - character_focus (string, 2-3 sentences, REQUIRED)
   - key_decisions (array with 2-4 decision objects, REQUIRED)
   - story_strengths (string, 2-3 sentences, REQUIRED)
   - user_adjustments (string, 2-3 sentences, REQUIRED)

2. **THEN ADD ALL OTHER FIELDS** following the schema below

3. **DO NOT SKIP** the 4 required narrative reasoning fields - they MUST appear first in your JSON

4. Return ONLY valid JSON - no markdown, no explanations, no text outside the JSON object

5. Be vivid and specific. Prefer concrete sensory detail and dramatic stakes over vague summary. Do not pad, but do not starve the story.

6. Do NOT use placeholders like "General audience"; provide concrete descriptions.

7. "protagonist" and "antagonist" MUST be plain JSON strings (one string each). Do NOT use nested objects here — put name, goal, and flaw inside the string sentences if needed.

8. Assign each beat the number of minutes the story/illustration genuinely needs. Beat "minutes" should reflect real pacing — do not invent uniform values.

9. **BEAT SHEET CRAFT ("THEREFORE / BUT" RULE)**: Never write a flat, episodic "and then" list of events. Every beat in "beats" MUST be causally linked to the beat before and after it ("Because of X, THEREFORE Y happens; BUT complication Z forces a new choice"). Each beat's "synopsis" must establish: (a) entering friction/objective, (b) concrete visual action on screen, and (c) the dramatic turn or value shift at the end of the beat.

10. **INDIVIDUAL CHARACTERS ONLY — NEVER GROUPS**: Every entry in "character_descriptions" and every beat's "characters" array MUST be a single named individual person — NEVER a collective/plural group ("Friends", "Neighbors", "The Brothers", "Parents", "Factory Workers"). If a couple or duo matters, create two separate individual characters.

11. **MULTI-AGE / MULTI-ERA LIFE STAGES = SEPARATE "(Age NN)" CHARACTERS + PER-BEAT HIGHLIGHTS**: Production Stage locks ONE base face reference image per character card and uses Wardrobes ONLY for outfit changes at that same biological age. Whenever a character appears at meaningfully different ages or time periods (>= 10 years apart — especially in Video Memoirs, biographies, and flashback stories), you MUST create SEPARATE entries in "character_descriptions" named "[Full Name] (Age NN)", keeping core genetic traits (ethnicity, eyeColor, facial bone structure) identical while adapting biological age, hair/skin aging, and period defaultWardrobe. Populate every beat's "characters" array with the exact individual character names (including the era-matched "(Age NN)" variant) featured in that beat.`

/**
 * Default length posture.
 *
 * Nothing in the pipeline hardcoded a 15-minute target — it fell out of a
 * single 2.5-minute beat in the schema example multiplied by a 3-to-6 beat
 * structure. This states the expectation the platform actually has, so the
 * model stops reaching for short-form structure by default.
 */
const LONGFORM_DEPTH_BLOCK = `
LONG-FORM STORYTELLING DEPTH (DEFAULT POSTURE):
- This platform produces long-form video. 30 minutes or more is the norm here, not the exception.
- Give the story room: establish the world, let relationships develop on screen, and earn every reversal.
- Prefer 12-24 beats that each carry real dramatic or illustrative function over a compressed 5-8 beat sprint.
- Depth of character and story is the goal. Do NOT default to fast-paced short-form structure.
- Go short ONLY when the creator's input or the selected scope explicitly calls for it.`

function getFormatSpecificBlocks(format: Format, contentIntent?: ContentIntent) {
  const intent = contentIntent ?? resolveContentIntent(format === 'short_film' ? 'drama' : format.replace('_', '-'))
  return getIntentPromptBlocks(intent, format)
}

export function buildTreatmentPrompt(opts: {
  input: string
  coreConcept: any
  /** Blueprint format or a New Series production type id. */
  format: Format | string
  targetMinutes: number
  autoScope?: boolean
  advisoryScopeLabel?: string
  styleHint?: string
  context?: any
  beatStructure?: { label: string; beats: Array<{ title: string }> } | null
  persona?: 'Narrator'|'Director' | null
  hasExplicitSettings?: boolean
  contentIntent?: ContentIntent
  rigor?: 'fast' | 'balanced' | 'thorough'
  /** Language the treatment prose should be authored in. Defaults to English. */
  storyLocale?: string
  /** Character/location names that must be reproduced verbatim. */
  properNouns?: readonly string[]
  /** Pre-formatted reference asset catalog block */
  referenceCatalogBlock?: string
  /** Series continuity block including asset roster */
  seriesContinuityBlock?: string
  /** Cultural localization & family genetics directive block */
  localizationBlock?: string
  /** Pre-forged Showrunner Room creative brief (Stage 1 Pitch + Stage 2 Cast & World Bible) */
  creativeBriefBlock?: string
}) {
  const { input, coreConcept, targetMinutes, autoScope, advisoryScopeLabel, styleHint, context, beatStructure, persona, contentIntent, rigor = 'thorough', storyLocale, properNouns, referenceCatalogBlock, seriesContinuityBlock, localizationBlock, creativeBriefBlock } = opts
  const productionType = getSeriesProductionProfile(opts.format)
  const format = resolveBlueprintProductionFormat(opts.format)
  const intent = resolveContentIntentFromMetadata({
    contentIntent,
    format: opts.format,
    genre: context?.genre,
  })
  const productionTypeBlock = productionType
    ? `PRODUCTION TYPE: ${productionType.label}\nCRAFT: ${productionType.craft}\n`
    : ''
  const pacingPhilosophy = buildPacingPhilosophyBlock(intent)
  // In auto scope, runtime is advisory: the story/illustration decides its own
  // length. In fixed scope, honor the user's selected target.
  // Advisory scope is the default, so a neutral "let the material decide" read
  // as permission to go short. It carries a long-form prior instead.
  const scopeBlock = autoScope
    ? `SCOPE (ADVISORY): Let the material decide its length — aim for ${advisoryScopeLabel || 'the length the content genuinely needs'}. Do NOT pad or compress to hit a runtime; there is no fixed target.
Start from a long-form assumption: unless the input clearly describes something brief, expect this to run 30 minutes or more and write a beat sheet that genuinely fills it.`
    : `TARGET RUNTIME: ~${targetMinutes} minutes (±10%). Shape beat "minutes" so they sum to roughly this target.`
  const formatBlock = getFormatBlock(format)
  const formatSpecifics = getFormatSpecificBlocks(format, intent)
  const structureBlock = beatStructure
    ? `\nMACRO ACT / PHASE STRUCTURE:\n- Use the ${beatStructure.label} phases as macro narrative containers IN ORDER:\n${beatStructure.beats.map((b, i) => `  ${i + 1}. ${b.title}`).join('\n')}\n- For long-form stories (20+ min or auto scope), expand these macro phases into 12–24 concrete, story-specific dramatic beats with original evocative titles (do NOT just output 3–6 generic textbook labels).\n`
    : ''
  const personaBlock = persona === 'Director'
    ? '\nVOICE: Write as a concise, confident director offering clear, actionable guidance.'
    : persona === 'Narrator'
    ? '\nVOICE: Write as an engaging, neutral narrator with professional tone.'
    : ''
  
  const scoringGenre = intent === 'fiction' ? context?.genre : nonFictionChecklistGenre(format)
  const scoringChecklist = rigor === 'fast'
    ? buildLightweightChecklist(scoringGenre, context?.targetAudience, context?.tone, intent)
    : buildScoringAwareChecklist({
        genre: scoringGenre,
        targetAudience: context?.targetAudience,
        tone: context?.tone,
        contentIntent: intent,
      })
  
  const schemaBlock = TREATMENT_SCHEMA_TEMPLATE
    .replace('__TARGET_MINUTES__', autoScope
      ? 'Your honest estimate in minutes, derived from the beats you wrote'
      : String(targetMinutes))
    .replace('__CTA_VALUE__', formatBlock.includeCTA ? '"string"' : 'null')
    .replace('__LEARNING_VALUE__', formatBlock.includeLearning ? '["Objective 1", "Objective 2"]' : '[]')
  
  const antiFictionBlock = formatSpecifics.antiFictionalizationRule
    ? `\n${formatSpecifics.antiFictionalizationRule}\n`
    : ''
  const schemaOverride = intent === 'fiction' ? '' : `\n${NONFICTION_SCHEMA_OVERRIDE}\n`
  const characterIdentityBlock = seriesContinuityBlock
    ? `${SERIES_LIBRARY_IDENTITY_BLOCK}\n\n${CULTURAL_AUTHENTICITY_BLOCK}`
    : CULTURAL_AUTHENTICITY_BLOCK
  const libraryRules = seriesContinuityBlock
    ? `REFERENCE ASSET RULES:
- The reference roster is the series library. Reuse those characters, locations, and props verbatim.
- Do NOT rename or re-describe established assets; reference them by the same names and roles.
- Author a new character, location, or prop ONLY when it is not in the library. Set "isNew": true and start its description with "New:".
- Follow the consistency rules and storyline tracking in the continuity block. Do not contradict them.`
    : referenceCatalogBlock
      ? `REFERENCE ASSET RULES:
- Reuse catalog characters, locations, and props verbatim when the story requires them.
- Do NOT rename or re-describe established assets; reference them by the same names.
- Author new character_descriptions or scene_descriptions ONLY for genuinely new assets; mark new entries clearly in description.`
      : ''

  const artStyle = context?.artStyle || resolveVariantArtStyle(context || {})
  const aspectRatio = context?.aspectRatio || resolveVariantAspectRatio(context || {})
  const foundationBlock = buildFoundationPromptBlock(artStyle, aspectRatio)

  const languageBlock = localeDirective(storyLocale, {
    properNouns,
    keepEnglishFields: ['format_length'],
  })

  return `CRITICAL INSTRUCTIONS: You are a professional ${formatSpecifics.personaLabel} showrunner.
${productionTypeBlock}CONTENT INTENT: ${intent.toUpperCase()} — ${formatSpecifics.schemaFieldSemantics}
${scopeBlock}
PRIORITIES: ${formatBlock.priorities}
${personaBlock}${structureBlock}
${LONGFORM_DEPTH_BLOCK}

${pacingPhilosophy}

${scoringChecklist}
${characterIdentityBlock}
${intent === 'fiction' && localizationBlock ? `\n${localizationBlock}\n` : ''}
${formatSpecifics.optimizationBlock}
${antiFictionBlock}

${seriesContinuityBlock ? `\n${seriesContinuityBlock}\n` : ''}${referenceCatalogBlock ? `\n${referenceCatalogBlock}\n` : ''}${libraryRules ? `\n${libraryRules}\n` : ''}${creativeBriefBlock ? `\n${creativeBriefBlock}\n` : ''}

INPUT:
${input}

CORE CONCEPT:
- Title: ${coreConcept?.input_title}
- Synopsis: ${coreConcept?.input_synopsis}
- Themes: ${(coreConcept?.core_themes || []).join(', ')}
- Structure: ${coreConcept?.narrative_structure}

CONTEXT:
- Audience: ${context?.targetAudience || 'General'}
- Platform: ${context?.platform || 'YouTube & web'}
- Tone: ${context?.tone || 'Professional'}
- Genre: ${context?.genre || 'Documentary'}
- Art Style: ${getArtStylePresetName(artStyle)}
- Aspect Ratio: ${aspectRatio}
- Style Hint: ${styleHint || context?.visualStyle || getArtStylePresetName(artStyle)}

${foundationBlock}

${OUTPUT_RULES_BLOCK}
${languageBlock}
STEP 1: BEFORE GENERATING ANYTHING ELSE, THINK ABOUT:
${formatSpecifics.step1Thinking}

STEP 2: START YOUR JSON OUTPUT WITH THESE 4 FIELDS FIRST, THEN ADD ALL OTHER FIELDS.

${schemaBlock}
${schemaOverride}
${formatSpecifics.characterBlock}`
}


// formatLabel and getFormatBlock are exported from @/lib/content/contentIntent

// =============================================================================
// LIGHTWEIGHT CHECKLIST - Used when user provides explicit settings
// =============================================================================
// Reduces prompt size by ~2KB compared to full scoring checklist
// When user explicitly selects genre/tone/audience, they have clear intent

function buildLightweightChecklist(genre?: string, targetAudience?: string, tone?: string, contentIntent?: ContentIntent): string {
  const intent = contentIntent ?? resolveContentIntent(genre)
  const g = genre || (intent === 'fiction' ? 'drama' : 'documentary')
  const t = tone || 'professional'
  const a = targetAudience || 'general'

  if (intent === 'informational') {
    return `
QUALITY ESSENTIALS (User specified: Genre=${g}, Tone=${t}, Audience=${a}, Intent=informational):
- Clear thesis or learning objective
- Credible host/subject/expert profiles
- Logical segment or module structure
- Audience takeaway value
- Consistent ${t} tone throughout
- Do NOT invent fictional characters or plot`
  }

  if (intent === 'commercial') {
    return `
QUALITY ESSENTIALS (User specified: Genre=${g}, Tone=${t}, Audience=${a}, Intent=commercial):
- Clear problem and solution
- Strong value proposition and proof points
- Presenter or customer persona defined
- Clear CTA
- Consistent ${t} tone throughout
- Do NOT convert into fictional narrative`
  }

  if (intent === 'conversational') {
    return `
QUALITY ESSENTIALS (User specified: Genre=${g}, Tone=${t}, Audience=${a}, Intent=conversational):
- Engaging host and guest/participant profiles
- Clear topic and segment flow
- Listener/viewer takeaways
- Consistent ${t} tone throughout
- Do NOT invent fictional plot`
  }

  return `
QUALITY ESSENTIALS (User specified: Genre=${g}, Tone=${t}, Audience=${a}):
- Magnetic protagonist with an active externalGoal colliding with a deeper internalNeed and playable fatalFlaw
- Multidimensional supporting cast with distinct voices, contradictions, and interpersonal friction (never passive exposition)
- Causal "THEREFORE / BUT" beat progression (never episodic "and then" summaries) with a clear midpoint reversal and low-point crucible
- Every beat synopsis includes an entering conflict, concrete visual on-screen action, and an ending value shift
- Culturally authentic, original character names
- Logline with an irresistible hook, dramatic irony, or unexpected twist
- Consistent ${t} tone and high entertainment value for ${a} audience
`
}

// =============================================================================
// SCORING-AWARE PRE-GENERATION CHECKLIST (Full version)
// =============================================================================
// These guidelines ensure treatments score 80+ on first generation
// Only used when explicit settings are NOT provided

export function buildScoringAwareChecklist(opts: {
  genre?: string
  targetAudience?: string
  tone?: string
  contentIntent?: ContentIntent
}): string {
  const intent = opts.contentIntent ?? resolveContentIntent(opts.genre)
  const genre = opts.genre?.trim() || (intent === 'fiction' ? 'drama' : 'documentary')
  const targetAudience = opts.targetAudience?.trim() || 'discerning general audiences'
  const tone = opts.tone?.trim() || (intent === 'fiction' ? 'cinematic and story-authentic' : 'clear and engaging')

  if (intent === 'informational') {
    return buildInformationalChecklist(genre, targetAudience, tone)
  }
  if (intent === 'commercial') {
    return buildCommercialChecklist(genre, targetAudience, tone)
  }
  if (intent === 'conversational') {
    return buildConversationalChecklist(genre, targetAudience, tone)
  }

  const demographicThemes = getDemographicThemes(targetAudience)
  const toneKeywords = getToneKeywords(tone)
  const genreConventions = getGenreConventions(genre)
  
  return `
=============================================================================
QUALITY GATE CHECKLIST - MUST PASS ALL ITEMS
=============================================================================
This treatment will be scored. To achieve 85+ on first generation, ENSURE:

AXIS 1: CONCEPT ORIGINALITY (25% of score)
[ ] HOOK/TWIST: Logline MUST contain an unexpected premise engine, dramatic irony, or vivid hook rooted directly in the creator's world — NEVER fall back to generic noir-detective or corporate-cover-up templates unless the prompt explicitly asks for one.
[ ] AVOID CLICHÉS: Do NOT use tired tropes without fresh subversion:
    - Chosen one prophecy (unless subverted)
    - Love at first sight (unless complicated)
    - Mentor dies solely to motivate hero
    - "It was all a dream/simulation" reveal
    - Generic burned-out loner haunted by an unnamed past case
[ ] SPECIFIC WORLD TEXTURE: Ground the premise in a tactile, unmistakable milieu (specific profession, season, local rules, sensory world).

AXIS 2: CHARACTER DEPTH & INTERPERSONAL FRICTION (25% of score)
[ ] PROTAGONIST GOAL vs. NEED: State clearly what they visibly pursue (externalGoal) and how it collides with their deeper emotional truth (internalNeed)
[ ] PROTAGONIST FLAW & CONTRADICTION: Give them a playable behavioral contradiction that creates active obstacles of their own making
[ ] ANTAGONIST & FOILS: Define a believable opposing force with a coherent counter-agenda, plus supporting characters who challenge rather than act as passive sounding boards
[ ] FORMATIVE BACKSTORY: Ground key characters in specific lived experience relevant to THIS story's world and tone (not generic trauma boilerplate)
[ ] DISTINCT VOICES: Every principal character must have a recognizable voiceFingerprint (cadence, diction, verbal tells)

AXIS 3: PACING, STRUCTURE & CAUSAL BEATS (20% of score)
[ ] THREE ACTS / CLEAR ESCALATION: Clear Setup, Escalating Confrontation, and Earned Resolution
[ ] CAUSAL BEAT PROGRESSION ("THEREFORE / BUT"): Every beat must be triggered by a consequence ("THEREFORE") or complication ("BUT") of the prior beat — never an episodic "and then" list
[ ] VISUAL SET-PIECES & TURNS: Each beat synopsis must describe concrete visual on-screen action and end on a clear shift in power, trust, danger, or revelation
[ ] INCITING INCIDENT: Early disruption that permanently alters the protagonist's status quo
[ ] MIDPOINT TURN: Major revelation or reversal at the story's midpoint that raises the cost of failure
[ ] LOW POINT/ALL IS LOST: Before the climax, protagonist's old strategy fails completely

AXIS 4: GENRE FIDELITY (15% of score) - ${genre.toUpperCase()}
[ ] ESSENTIAL CONVENTIONS: ${genreConventions}
[ ] TONE DIRECTION: ${toneKeywords}
[ ] CONSISTENT TONE: All elements must authentically reinforce the requested "${tone}" atmosphere

AXIS 5: AUDIENCE RESONANCE (15% of score) - ${targetAudience.toUpperCase()}
[ ] AUDIENCE FIT: ${demographicThemes.ageRange}
[ ] THEMATIC RESONANCE: ${demographicThemes.themes}
[ ] MARKETABLE LOGLINE: One vivid, poster-ready sentence that captures what makes THIS specific story unmissable

=============================================================================
PRE-GENERATION SELF-CHECK
=============================================================================
Before outputting, verify:
1. Can you state the protagonist's GOAL and colliding NEED in one sentence? → If no, add it
2. Can you state the protagonist's FLAW and behavioral contradiction? → If no, add it
3. Does every beat connect via THEREFORE / BUT with a concrete visual turn instead of "and then"? → If no, rewrite the beats
4. Does the logline feel genuinely fresh and specific to THIS premise rather than a stock genre template? → If no, sharpen it
5. Are character names culturally authentic, phonetically distinct, and free of overused AI defaults? → If not, fix them
=============================================================================
`
}

function buildInformationalChecklist(genre: string, targetAudience: string, tone: string): string {
  const genreConventions = getGenreConventions(genre)
  return `
=============================================================================
QUALITY GATE CHECKLIST — INFORMATIONAL CONTENT
=============================================================================
This treatment will be scored for audience resonance. ENSURE:

AXIS 1: THESIS & CLARITY (25%)
[ ] CLEAR THESIS: State the core topic, question, or learning objective upfront
[ ] AUDIENCE RELEVANCE: Content addresses what ${targetAudience} needs to know
[ ] NO FICTIONALIZATION: Do NOT invent fictional characters or dramatized plot

AXIS 2: SUBJECT/EXPERT DEPTH (25%)
[ ] HOST/SUBJECT DEFINED: Name the host, instructor, or documentary subject(s)
[ ] CREDIBILITY: Expertise or perspective is clear
[ ] CHALLENGE/QUESTION: Core problem or knowledge gap is stated (antagonist field)

AXIS 3: STRUCTURE & PACING (20%)
[ ] LOGICAL FLOW: Segments/modules build toward clear takeaways
[ ] ENGAGEMENT HOOKS: Opening captures audience attention
[ ] RECAP/SUMMARY: Key points reinforced for retention

AXIS 4: GENRE FIDELITY (15%) — ${genre.toUpperCase()}
[ ] ESSENTIAL CONVENTIONS: ${genreConventions}
[ ] CONSISTENT TONE: ${tone} atmosphere throughout

AXIS 5: TAKEAWAY VALUE (15%)
[ ] ACTIONABLE INSIGHTS: Audience leaves with clear understanding
[ ] LEARNING OBJECTIVES: Present when format is education/training
=============================================================================
`
}

function buildCommercialChecklist(genre: string, targetAudience: string, tone: string): string {
  return `
=============================================================================
QUALITY GATE CHECKLIST — COMMERCIAL CONTENT
=============================================================================
AXIS 1: PROBLEM/SOLUTION (25%)
[ ] PROBLEM CLEAR: Audience pain point is stated
[ ] SOLUTION CLEAR: Product/service value is articulated
[ ] NO FICTIONAL NARRATIVE: Use persuasive structure, not screenplay fiction

AXIS 2: VALUE PROPOSITION (25%)
[ ] BENEFITS: Clear audience benefits, not just features
[ ] PROOF POINTS: Credibility through demo, stats, or case evidence
[ ] PRESENTER/PERSONA: Defined in protagonist field

AXIS 3: STRUCTURE (20%)
[ ] HOOK → PROBLEM → SOLUTION → PROOF → CTA flow
[ ] Pacing appropriate for ${genre} format

AXIS 4: AUDIENCE FIT (15%) — ${targetAudience.toUpperCase()}
[ ] Speaks to target buyer/user concerns
[ ] Tone: ${tone}

AXIS 5: CTA (15%)
[ ] Clear call to action
=============================================================================
`
}

function buildConversationalChecklist(genre: string, targetAudience: string, tone: string): string {
  return `
=============================================================================
QUALITY GATE CHECKLIST — CONVERSATIONAL CONTENT
=============================================================================
AXIS 1: TOPIC & HOOK (25%)
[ ] COMPELLING TOPIC: Why ${targetAudience} will care
[ ] OPENING HOOK: Strong segment or episode opening

AXIS 2: HOST/GUEST (25%)
[ ] HOST DEFINED: Clear host persona in protagonist field
[ ] PARTICIPANTS: Guest or co-host profiles with expertise
[ ] TENSION TOPIC: Core question or debate angle (antagonist field)

AXIS 3: SEGMENT FLOW (20%)
[ ] NATURAL CONVERSATION: Segments flow logically
[ ] TAKEAWAYS: Clear insights per segment

AXIS 4: FORMAT FIT (15%) — ${genre.toUpperCase()}
[ ] Matches podcast/interview conventions
[ ] Tone: ${tone}

AXIS 5: AUDIENCE ENGAGEMENT (15%)
[ ] Listener/viewer value throughout
[ ] Do NOT invent fictional plot
=============================================================================
`
}

export function getDemographicThemes(demographic: string): { ageRange: string; themes: string } {
  const normalized = (demographic || '').trim().toLowerCase()
  const map: Record<string, { ageRange: string; themes: string }> = {
    'gen-z-18-24': {
      ageRange: '18-24 year olds',
      themes: 'identity formation, authenticity vs. performance, community belonging, finding one\'s voice',
    },
    'millennials-25-34': {
      ageRange: '25-34 year olds',
      themes: 'ambition vs. fulfillment, chosen family, career inflection points, redefining success',
    },
    'gen-x-35-54': {
      ageRange: '35-54 year olds',
      themes: 'midlife reinvention, family responsibility, mentorship, legacy, second acts',
    },
    'boomers-55+': {
      ageRange: '55-70+ year olds',
      themes: 'legacy, reconciliation, second chances, intergenerational bonds, reflection on life choices',
    },
    'teens-13-17': {
      ageRange: '13-17 year olds',
      themes: 'coming of age, loyalty, independence, self-discovery, belonging',
    },
    'family-all-ages': {
      ageRange: 'all ages (engaging for both kids and adults)',
      themes: 'adventure, teamwork, heart, courage, friendship, wonder',
    },
    'mature-21+': {
      ageRange: 'adult audiences (21+)',
      themes: 'moral complexity, high-stakes human choices, loyalty, consequence, truth',
    },
  }

  if (map[normalized]) return map[normalized]
  if (/\b(family|all ages|kids|children|four-quadrant)\b/i.test(normalized)) return map['family-all-ages']
  if (/\b(teen|ya|young adult|high school|13-17)\b/i.test(normalized)) return map['teens-13-17']
  if (/\b(gen.?z|18-24|college)\b/i.test(normalized)) return map['gen-z-18-24']
  if (/\b(millennial|25-34)\b/i.test(normalized)) return map['millennials-25-34']
  if (/\b(gen.?x|35-54|midlife)\b/i.test(normalized)) return map['gen-x-35-54']
  if (/\b(boomer|senior|55\+|60\+|retiree)\b/i.test(normalized)) return map['boomers-55+']
  if (/\b(mature|adult|21\+|r-rated)\b/i.test(normalized)) return map['mature-21+']

  // Free-text or unspecified audience: honor the creator's exact description without forcing millennial burnout
  return {
    ageRange: demographic?.trim()
      ? `Resonate authentically with ${demographic.trim()} (cast protagonist age organically to fit the premise)`
      : 'Cast protagonist age organically to serve the premise and emotional truth of the story',
    themes: 'Draw themes organically from the story\'s central conflict, world, and character stakes',
  }
}

export function getToneKeywords(tone: string): string {
  const normalized = (tone || '').trim().toLowerCase()
  const map: Record<string, string> = {
    'dark-gritty': 'Reinforce dark, gritty atmosphere: visceral, shadowy, tense, raw, high-consequence',
    'light-comedic': 'Reinforce light comedic atmosphere: playful, witty, charming, crisp timing, buoyant',
    'inspirational': 'Reinforce inspirational atmosphere: uplifting, resilient, hopeful, breakthrough, earned triumph',
    'suspenseful': 'Reinforce suspenseful atmosphere: taut, anticipatory, ticking-clock tension, escalating dread',
    'heartwarming': 'Reinforce heartwarming atmosphere: tender, human, emotionally generous, grounded warmth',
    'satirical': 'Reinforce satirical atmosphere: sharp irony, biting social observation, escalated absurdity',
    'melancholic': 'Reinforce melancholic atmosphere: wistful, bittersweet, reflective, quiet longing',
    'whimsical': 'Reinforce whimsical atmosphere: imaginative, playful wonder, lyrical, surprising charm',
    'intense': 'Reinforce intense atmosphere: gripping, urgent, relentless momentum, high emotional pressure',
    'nostalgic': 'Reinforce nostalgic atmosphere: evocative period texture, memory, bittersweet familiarity',
  }

  if (map[normalized]) return map[normalized]
  if (/\b(dark|gritty|noir|bleak|grim)\b/i.test(normalized)) return map['dark-gritty']
  if (/\b(comed|funny|playful|light|witty|humorous)\b/i.test(normalized)) return map['light-comedic']
  if (/\b(inspir|uplift|hopeful|triumph)\b/i.test(normalized)) return map['inspirational']
  if (/\b(suspense|thrill|tense)\b/i.test(normalized)) return map['suspenseful']
  if (/\b(warm|heart|tender|cozy|romantic)\b/i.test(normalized)) return map['heartwarming']
  if (/\b(satir|ironic|parody)\b/i.test(normalized)) return map['satirical']
  if (/\b(melanchol|bittersweet|poignant)\b/i.test(normalized)) return map['melancholic']
  if (/\b(whimsic|magical|fantastical|wonder)\b/i.test(normalized)) return map['whimsical']
  if (/\b(intense|urgent|fierce|kinetic)\b/i.test(normalized)) return map['intense']
  if (/\b(nostalg|retro|vintage)\b/i.test(normalized)) return map['nostalgic']

  // Never silently inject dark-gritty keywords for free-text tones like "Cinematic" or "Warm"
  return `Commit authentically to a "${tone?.trim() || 'cinematic, emotionally vivid'}" atmosphere through concrete visual imagery, pacing, and dialogue texture`
}

export function getGenreConventions(genre: string): string {
  const normalized = (genre || '').trim().toLowerCase()
  const map: Record<string, string> = {
    'drama': 'emotional core, character transformation, personal stakes, cathartic resolution',
    'thriller': 'clear stakes, ticking clock, escalating tension, twist/reveal, suspenseful pacing',
    'horror': 'atmosphere of dread, clear threat, escalating scares, vulnerability and survival stakes',
    'comedy': 'clear comedic premise, escalating comic complications, endearing protagonist, real stakes beneath the humor',
    'sci-fi': 'world-building consistency, speculative premise driving human conflict, tactile technology/rules',
    'scifi': 'world-building consistency, speculative premise driving human conflict, tactile technology/rules',
    'science fiction': 'world-building consistency, speculative premise driving human conflict, tactile technology/rules',
    'romance': 'magnetic chemistry, meaningful obstacles to intimacy, emotional vulnerability, earned payoff',
    'action': 'clear objective, kinetic escalating set-pieces, physical stakes, worthy adversary',
    'fantasy': 'consistent world/magic rules with real cost, wonder, character-driven stakes',
    'mystery': 'compelling central question, fair-play clues and misdirection, earned revelation',
    'adventure': 'vivid sense of place, escalating physical/moral trials, camaraderie, discovery',
    'animation': 'expressive visual storytelling, silhouette clarity, emotional heart, imaginative set-pieces',
    'documentary': 'clear thesis, compelling subjects, narrative arc despite non-fiction',
    'education': 'clear learning objectives, scaffolded complexity, instructor credibility, practical examples, assessment checkpoints',
    'training': 'task-oriented modules, step-by-step demonstrations, hands-on practice, measurable competency goals',
    'news': 'headline impact, 5W1H coverage, balanced perspectives, source credibility, timeliness, factual accuracy',
    'podcast': 'engaging host persona, topic expertise, conversational warmth, listener value, memorable segments, clear episode arc',
    'interview': 'insightful questions, guest expertise showcase, conversational depth, key takeaways, story moments',
    'product-demo': 'problem statement, product walkthrough, key features, demo moments, clear CTA',
    'product_demo': 'problem statement, product walkthrough, key features, demo moments, clear CTA',
    explainer: 'clear problem framing, step-by-step explanation, visual metaphors, summary and CTA',
    'case-study': 'customer context, challenge, solution, measurable results, social proof',
    case_study: 'customer context, challenge, solution, measurable results, social proof',
    advertisement: 'hook in first 3 seconds, emotional appeal, brand message, memorable CTA',
  }
  if (map[normalized]) return map[normalized]
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value
  }
  return `Honor the defining craft expectations of ${genre || 'cinematic storytelling'}: specific world stakes, character transformation, and visual momentum`
}


