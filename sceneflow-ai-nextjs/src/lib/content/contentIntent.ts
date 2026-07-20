/**
 * Unified content intent model for generation, scoring, and Audience Resonance.
 * Derives intent from UI genre selection and flows through blueprint, series, script, and AR.
 */

export type ContentIntent = 'fiction' | 'informational' | 'commercial' | 'conversational'

export type ProductionFormat =
  | 'youtube'
  | 'short_film'
  | 'documentary'
  | 'education'
  | 'training'
  | 'news'
  | 'podcast'
  | 'interview'
  | 'product_demo'
  | 'explainer'
  | 'case_study'
  | 'advertisement'
  // Series formats
  | 'narrative'
  | 'educational'
  | 'demo'
  | 'sales'

/** Genre values from BlueprintReimaginDialog GENRE_OPTIONS */
export const GENRE_TO_CATEGORY: Record<string, ContentIntent> = {
  // Fiction
  drama: 'fiction',
  comedy: 'fiction',
  thriller: 'fiction',
  horror: 'fiction',
  scifi: 'fiction',
  fantasy: 'fiction',
  action: 'fiction',
  romance: 'fiction',
  mystery: 'fiction',
  adventure: 'fiction',
  animation: 'fiction',
  // Non-Fiction / Informational
  documentary: 'informational',
  education: 'informational',
  training: 'informational',
  news: 'informational',
  // Commercial
  'product-demo': 'commercial',
  explainer: 'commercial',
  'case-study': 'commercial',
  advertisement: 'commercial',
  // Conversational
  podcast: 'conversational',
  interview: 'conversational',
}

/** Map UI genre slug to production format used in prompts */
export const GENRE_TO_FORMAT: Record<string, ProductionFormat> = {
  drama: 'short_film',
  comedy: 'short_film',
  thriller: 'short_film',
  horror: 'short_film',
  scifi: 'short_film',
  fantasy: 'short_film',
  action: 'short_film',
  romance: 'short_film',
  mystery: 'short_film',
  adventure: 'short_film',
  animation: 'short_film',
  documentary: 'documentary',
  education: 'education',
  training: 'training',
  news: 'news',
  'product-demo': 'product_demo',
  explainer: 'explainer',
  'case-study': 'case_study',
  advertisement: 'advertisement',
  podcast: 'podcast',
  interview: 'interview',
}

export function resolveContentIntent(genre?: string | null): ContentIntent {
  if (!genre) return 'fiction'
  const key = genre.toLowerCase().trim()
  return GENRE_TO_CATEGORY[key] ?? 'fiction'
}

export function resolveProductionFormat(genre?: string | null): ProductionFormat {
  if (!genre) return 'short_film'
  const key = genre.toLowerCase().trim()
  return GENRE_TO_FORMAT[key] ?? 'short_film'
}

export function isFictionIntent(intent: ContentIntent): boolean {
  return intent === 'fiction'
}

export function getIntentLabel(intent: ContentIntent): string {
  switch (intent) {
    case 'fiction':
      return 'Fiction / Narrative'
    case 'informational':
      return 'Informational / Non-Fiction'
    case 'commercial':
      return 'Commercial / Persuasive'
    case 'conversational':
      return 'Conversational'
    default:
      return 'Fiction / Narrative'
  }
}

export interface IntentPromptBlocks {
  optimizationBlock: string
  characterBlock: string
  schemaFieldSemantics: string
  antiFictionalizationRule: string
  personaLabel: string
  step1Thinking: string
}

export function getIntentPromptBlocks(
  intent: ContentIntent,
  format: ProductionFormat
): IntentPromptBlocks {
  const antiFictionalizationRule =
    intent !== 'fiction'
      ? `CRITICAL — DO NOT FICTIONALIZE:
- Do NOT invent fictional characters, plotlines, or dramatized conflict unless the user explicitly requested fiction
- Preserve real subjects, companies, facts, and instructional content from user input
- Use narrative structure only to organize real information — not to create invented drama`
      : ''

  switch (intent) {
    case 'informational':
      return {
        personaLabel: formatLabel(format),
        optimizationBlock: `INFORMATION DELIVERY OPTIMIZATION (PRIMARY GOAL):
- Prioritize clear thesis, credible subjects/experts, evidence, and audience takeaways
- For documentary: use narrative arc over REAL subjects — do not invent fictional protagonists
- For education/training: scaffold learning objectives, examples, and assessments
- For news: factual accuracy, 5W1H structure, balanced perspectives
- Optimize for clarity, engagement, and retention — not dramatic invention`,
        characterBlock: `CRITICAL — SUBJECT/HOST/EXPERT PROFILES:
- Generate 2-4 profiles for hosts, instructors, experts, interviewees, or documentary subjects
- Each MUST have complete visual attributes: subject, ethnicity, keyFeature, hairStyle, hairColor, eyeColor, expression, build
- **NAMES MUST BE CULTURALLY AUTHENTIC**
- Map JSON fields semantically (same keys, non-fiction meaning):
  • protagonist field → Host, Lead Subject, or Expert (role + expertise)
  • antagonist field → Core Challenge, Knowledge Gap, or Problem Being Addressed
  • externalGoal → Their role/objective in this content
  • internalNeed → Unique perspective or expertise they bring
  • fatalFlaw → Misconception, obstacle, or challenge being addressed
  • arcStartingState → Initial premise or introduction
  • arcShift → Key insight, revelation, or turning point
  • arcEndingState → Final takeaway or conclusion
- Generate 3-5 scene_descriptions (key locations/sets)
- Generate treatment with BOLD format choices and CLEAR reasoning`,
        schemaFieldSemantics: `SCHEMA FIELD SEMANTICS (informational):
- protagonist → Host, Lead Subject, or Expert
- antagonist → Core Challenge, Knowledge Gap, or Problem
- character_descriptions → Real participants with expertise/role, not invented drama characters`,
        antiFictionalizationRule,
        step1Thinking: `- Who are the primary subjects/participants/experts and why?
- What is the core thesis or learning objective?
- What 2-4 major creative decisions did you make?
- What makes this treatment compelling for the target audience?`,
      }

    case 'commercial':
      return {
        personaLabel: formatLabel(format),
        optimizationBlock: `PERSUASION OPTIMIZATION (PRIMARY GOAL):
- Prioritize problem/solution clarity, product value, proof points, and CTA
- Structure for audience decision-making — not three-act fiction
- Emphasize benefits, credibility, and conversion-oriented beats
- Optimize for persuasive impact without inventing fictional narratives`,
        characterBlock: `CRITICAL — PRESENTER/CUSTOMER PROFILES:
- Generate 1-3 profiles: presenter, customer persona, or expert endorser as needed
- Map JSON fields semantically:
  • protagonist field → Presenter, Brand Voice, or Customer Persona
  • antagonist field → Buyer Objection, Pain Point, or Status Quo Problem
  • externalGoal → What the audience should understand or do
  • internalNeed → Emotional or practical motivation to act
  • fatalFlaw → Common misconception or barrier to adoption
  • arcStartingState → Problem awareness
  • arcShift → Value demonstration or proof moment
  • arcEndingState → Desired outcome / CTA
- Generate 2-4 scene_descriptions (product demos, office, customer environment)
- Focus on proof, benefits, and clear CTA`,
        schemaFieldSemantics: `SCHEMA FIELD SEMANTICS (commercial):
- protagonist → Presenter or Customer Persona
- antagonist → Pain Point or Buyer Objection
- beats → Problem → Solution → Proof → CTA flow`,
        antiFictionalizationRule,
        step1Thinking: `- What problem does this solve for the audience?
- What proof points and value proposition are strongest?
- What 2-4 major creative decisions did you make?
- What CTA or outcome should the audience take?`,
      }

    case 'conversational':
      return {
        personaLabel: formatLabel(format),
        optimizationBlock: `CONVERSATIONAL OPTIMIZATION (PRIMARY GOAL):
- Prioritize host/guest dynamics, segment flow, and audience engagement
- Structure as engaging dialogue or interview segments — not screenplay fiction
- Emphasize topic hooks, natural conversation beats, and listener/viewer takeaways
- Optimize for authentic conversation without inventing fictional plot`,
        characterBlock: `CRITICAL — HOST/GUEST PROFILES:
- Generate 2-4 profiles for host, co-host, guest, or panel participants
- Map JSON fields semantically:
  • protagonist field → Host or Primary Interviewer
  • antagonist field → Tension Topic, Debate Angle, or Core Question
  • externalGoal → Episode objective or topic to explore
  • internalNeed → Unique perspective each participant brings
  • fatalFlaw → Misconception or challenge to address in conversation
  • arcStartingState → Opening hook / topic introduction
  • arcShift → Key insight or debate turning point
  • arcEndingState → Closing takeaway or call to action
- Generate 2-4 scene_descriptions (studio, set, remote locations)
- Focus on segment flow and conversational authenticity`,
        schemaFieldSemantics: `SCHEMA FIELD SEMANTICS (conversational):
- protagonist → Host
- antagonist → Tension Topic or Core Question
- beats → Segment flow with hooks and takeaways`,
        antiFictionalizationRule,
        step1Thinking: `- Who is the host and who are the guests/participants?
- What is the core topic and why will the audience care?
- What 2-4 major segment or format decisions did you make?
- What takeaways should listeners/viewers leave with?`,
      }

    case 'fiction':
    default:
      return {
        personaLabel: formatLabel(format),
        optimizationBlock: `STORYTELLING OPTIMIZATION (PRIMARY GOAL):
- Prioritize narrative coherence, emotional resonance, dramatic structure
- Make bold creative decisions: combine characters, elevate subplots, shift focus
- Emphasize elements that strengthen themes and character arcs
- Optimize for maximum storytelling impact`,
        characterBlock: `CRITICAL — CHARACTER ARCS ARE MANDATORY:
- Generate 3-5 detailed character_descriptions (protagonist + supporting characters)
- Each character MUST have complete attributes and psychological depth
- **CHARACTER NAMES MUST BE CULTURALLY AUTHENTIC AND ORIGINAL** — avoid stock AI names (Elara, Vance, Lyra, Kael, Thorne, etc.)
- **EVERY CHARACTER MUST HAVE**: externalGoal, internalNeed, fatalFlaw, arcStartingState, arcShift, arcEndingState
- Each character needs a distinct voice, want/need/flaw, and clear relationship to the protagonist — not interchangeable archetypes
- Generate 3-5 detailed scene_descriptions (key locations)
- Character arcs must show CLEAR TRANSFORMATION`,
        schemaFieldSemantics: `SCHEMA FIELD SEMANTICS (fiction):
- protagonist → Main character with goal and flaw
- antagonist → Primary opposing force or conflict
- character_descriptions → Full character arcs with transformation`,
        antiFictionalizationRule: '',
        step1Thinking: `- Who is the protagonist and why?
- What 2-4 major creative decisions did you make?
- What makes this treatment compelling?
- How can the user adjust the input for different results?`,
      }
  }
}

export interface IntentScoringRubric {
  persona: string
  categories: Array<{ name: string; weight: number; description: string }>
  primaryFieldLabels: { lead: string; opposition: string }
  guardrail: string
}

export function getIntentScoringRubric(intent: ContentIntent): IntentScoringRubric {
  const guardrail =
    intent !== 'fiction'
      ? `GUARDRAIL: Do NOT recommend inventing fictional plot, characters, or dramatized conflict. Improve resonance within the ${intent} content mode.`
      : ''

  switch (intent) {
    case 'informational':
      return {
        persona: 'curriculum producer and documentary development executive',
        categories: [
          { name: 'Audience Relevance', weight: 25, description: 'Will this audience find this content valuable and relevant?' },
          { name: 'Clarity & Structure', weight: 20, description: 'Is the information organized clearly for this audience?' },
          { name: 'Subject/Expert Engagement', weight: 20, description: 'Are hosts/subjects credible and engaging for this audience?' },
          { name: 'Takeaway Value', weight: 20, description: 'Will the audience retain key insights or learning objectives?' },
          { name: 'Tone Fit', weight: 15, description: 'Does tone match audience and genre expectations?' },
        ],
        primaryFieldLabels: { lead: 'Host/Subject/Expert', opposition: 'Core Challenge/Question' },
        guardrail,
      }

    case 'commercial':
      return {
        persona: 'marketing video strategist and conversion-focused producer',
        categories: [
          { name: 'Audience Relevance', weight: 25, description: 'Does this speak to the target buyer/user pain points?' },
          { name: 'Value Proposition', weight: 20, description: 'Is the problem/solution and benefit clear?' },
          { name: 'Proof & Credibility', weight: 20, description: 'Are claims supported with credible proof points?' },
          { name: 'CTA Strength', weight: 20, description: 'Is there a clear, compelling call to action?' },
          { name: 'Tone Fit', weight: 15, description: 'Does tone match brand and audience expectations?' },
        ],
        primaryFieldLabels: { lead: 'Presenter/Customer Persona', opposition: 'Pain Point/Objection' },
        guardrail,
      }

    case 'conversational':
      return {
        persona: 'podcast producer and interview format specialist',
        categories: [
          { name: 'Audience Relevance', weight: 25, description: 'Will this topic engage the target audience?' },
          { name: 'Host/Guest Chemistry', weight: 20, description: 'Are host and participants compelling?' },
          { name: 'Segment Flow', weight: 20, description: 'Does the conversation structure maintain engagement?' },
          { name: 'Takeaway Value', weight: 20, description: 'Will listeners/viewers get clear insights?' },
          { name: 'Tone Fit', weight: 15, description: 'Does tone match format and audience expectations?' },
        ],
        primaryFieldLabels: { lead: 'Host', opposition: 'Tension Topic/Core Question' },
        guardrail,
      }

    case 'fiction':
    default:
      return {
        persona: 'development executive evaluating film treatment market viability',
        categories: [
          { name: 'Audience Appeal', weight: 25, description: 'Will this audience want to watch?' },
          { name: 'Genre & Tone Fit', weight: 20, description: 'Matches genre/tone expectations for this audience?' },
          { name: 'Concept Hook', weight: 20, description: 'Logline/premise grabs this audience?' },
          { name: 'Character Connection', weight: 20, description: 'Characters this audience will root for?' },
          { name: 'Clarity & Structure', weight: 15, description: 'Clear enough for this audience?' },
        ],
        primaryFieldLabels: { lead: 'Protagonist', opposition: 'Antagonist' },
        guardrail,
      }
  }
}

export function getIntentRevisionGuardrail(intent: ContentIntent): string {
  if (intent === 'fiction') return ''
  return `CONTENT INTENT: ${getIntentLabel(intent)}.
Maintain this content intent throughout revisions. Improve audience resonance WITHOUT converting factual, instructional, commercial, or conversational content into fictional narrative.
Do NOT add invented protagonists, antagonists, three-act drama, or character ghosts unless explicitly requested.`
}

export function getIntentCouplingRules(intent: ContentIntent): string {
  if (intent === 'fiction') {
    return `MANDATORY CROSS-SECTION BALANCE:
- character_descriptions → also update synopsis, protagonist, antagonist, and affected beats
- logline / genre / stakes → also update synopsis, beats pacing, and tone alignment
- beats structure → also update synopsis and total duration coherence
- tone / themes → also update visual_style and beat emotional tone`
  }

  if (intent === 'informational') {
    return `MANDATORY CROSS-SECTION BALANCE (informational):
- subject/host profiles → also update synopsis, protagonist field (host/subject), antagonist field (challenge), and affected beats
- thesis / learning objectives → also update synopsis, beats, and tone alignment
- beats structure → also update synopsis and duration coherence
- Do NOT introduce fictional plot or invented characters when revising`
  }

  if (intent === 'commercial') {
    return `MANDATORY CROSS-SECTION BALANCE (commercial):
- presenter/customer profiles → also update synopsis, protagonist field, antagonist field (pain point), and beats
- value proposition / CTA → also update synopsis, beats, and tone
- Do NOT convert into fictional narrative when revising`
  }

  return `MANDATORY CROSS-SECTION BALANCE (conversational):
- host/guest profiles → also update synopsis, protagonist field (host), antagonist field (tension topic), and segment beats
- topic / takeaways → also update synopsis and segment flow
- Do NOT introduce fictional plot when revising`
}

export function formatLabel(f: ProductionFormat): string {
  switch (f) {
    case 'youtube':
      return 'YouTube series'
    case 'short_film':
      return 'short film'
    case 'documentary':
      return 'documentary'
    case 'education':
      return 'educational content'
    case 'training':
      return 'training program'
    case 'news':
      return 'news segment'
    case 'podcast':
      return 'podcast episode'
    case 'interview':
      return 'interview'
    case 'product_demo':
      return 'product demonstration'
    case 'explainer':
      return 'explainer video'
    case 'case_study':
      return 'case study video'
    case 'advertisement':
      return 'advertisement'
    case 'narrative':
      return 'narrative series'
    case 'educational':
      return 'educational series'
    case 'demo':
      return 'product demo series'
    case 'sales':
      return 'sales video series'
    default:
      return 'video'
  }
}

export function getFormatBlock(f: ProductionFormat) {
  if (f === 'youtube')
    return {
      priorities: 'maximize retention, strong opening hook in first 20 seconds; clear segments and CTA',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'documentary')
    return {
      priorities: 'compelling narrative arc over real subjects, strong voiceover plan, visual motifs; audience engagement',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'education')
    return {
      priorities: 'clear learning objectives, scaffolded sections, recap and quick assessment',
      includeCTA: false,
      includeLearning: true,
    }
  if (f === 'training')
    return {
      priorities: 'task-oriented modules, demonstrations, checkpoints and practice prompts',
      includeCTA: false,
      includeLearning: true,
    }
  if (f === 'news')
    return {
      priorities: 'factual accuracy, clear headline/lead, 5W1H structure, balanced perspectives, source attribution',
      includeCTA: false,
      includeLearning: false,
    }
  if (f === 'podcast')
    return {
      priorities: 'conversational flow, engaging host presence, clear topic segments, listener hooks',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'interview')
    return {
      priorities: 'thoughtful questions, guest expertise showcase, natural conversation flow, key insights',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'product_demo')
    return {
      priorities: 'problem statement, product walkthrough, key features, proof/demo moments, clear CTA',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'explainer')
    return {
      priorities: 'clear problem framing, step-by-step explanation, visual metaphors, summary and CTA',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'case_study')
    return {
      priorities: 'customer context, challenge, solution, measurable results, social proof, CTA',
      includeCTA: true,
      includeLearning: false,
    }
  if (f === 'advertisement')
    return {
      priorities: 'hook in first 3 seconds, emotional appeal, brand message, memorable CTA',
      includeCTA: true,
      includeLearning: false,
    }
  return {
    priorities: 'three-act arc, character tension, cinematic pacing',
    includeCTA: false,
    includeLearning: false,
  }
}

/**
 * Balanced pacing philosophy shared by the Blueprint (treatment) and the script
 * generation prompts. It counterweights the retention-hook bias so the model is
 * explicitly told to EARN payoffs and allow gradual establishment (fiction) or
 * clear, gradual illustration (non-fiction), rather than front-loading hooks.
 */
export function buildPacingPhilosophyBlock(intent: ContentIntent): string {
  if (intent === 'fiction') {
    return `PACING PHILOSOPHY (BALANCE RETENTION WITH CRAFT):
- Open with intrigue, but EARN your payoffs — do not resolve or reveal everything early to chase a hook.
- Allow deliberate establishment: give the audience time to meet characters, understand the world, and feel the stakes before escalation.
- A retention hook and a quiet character/establishing beat are BOTH valuable; do not sacrifice setup, subtext, or the second act for speed.
- Vary rhythm intentionally: tension and release, action and reflection. Do not make every beat a cliffhanger.
- Let transformation land — reversals, low points, and resolutions need room to breathe.`
  }
  return `PACING PHILOSOPHY (BALANCE A STRONG ENTRY WITH CLEAR ILLUSTRATION):
- Open with a clear, engaging entry point, but do not sacrifice context, credibility, or completeness to front-load a hook.
- Establish the premise and the "why it matters" before diving into details.
- Illustrate with concrete examples, demonstrations, or proof BEFORE the takeaway or CTA — clarity and completeness over hook density.
- Build understanding gradually and logically; give each idea the space it needs to be understood.
- Reinforce key points for retention without padding or repetition for its own sake.`
}

/** Resolve content intent from genre string or stored metadata */
export function resolveContentIntentFromMetadata(metadata?: {
  contentIntent?: ContentIntent
  genre?: string
  format?: string
}): ContentIntent {
  if (metadata?.contentIntent) return metadata.contentIntent
  if (metadata?.genre) return resolveContentIntent(metadata.genre)
  // Series format fallback
  const fmt = metadata?.format?.toLowerCase()
  if (fmt === 'educational' || fmt === 'documentary' || fmt === 'news') return 'informational'
  if (fmt === 'demo' || fmt === 'sales') return 'commercial'
  if (fmt === 'podcast' || fmt === 'interview') return 'conversational'
  return 'fiction'
}
