/**
 * Shared episode batch prompt builder for series generation.
 * Ensures format/intent-aware prompts across generate and episodes/add routes.
 */

import type { ContentIntent } from '@/lib/content/contentIntent'
import { resolveContentIntentFromMetadata } from '@/lib/content/contentIntent'
import {
  getSeriesProductionProfile,
  type SeriesProductionEngine,
} from '@/config/series/productionFormats'
import { SERIES_CHARACTER_NAMING_BLOCK } from '@/lib/character/characterNamingPrompt'
import { buildProperNounGlossary, localeDirective } from '@/lib/prompts/localeDirective'

export interface EpisodeBatchPromptInput {
  seriesTitle: string
  logline?: string
  synopsis?: string
  genre?: string
  tone?: string
  format?: string
  contentIntent?: ContentIntent
  characters?: Array<{ name?: string; role?: string; description?: string }>
  protagonist?: { name?: string; goal?: string; flaw?: string; characterId?: string }
  antagonistConflict?: { description?: string; type?: string }
  episodeSummaries: string
  activeThreads: Array<{ name: string; type: string; status: string; description?: string }>
  totalPlannedEpisodes: number
  startEpisodeNumber: number
  count: number
  /** Language episode prose should be authored in. Defaults to English. */
  storyLocale?: string
  /** Location and prop names from the series bible, kept verbatim. */
  locations?: Array<{ name?: string | null } | null>
  props?: Array<{ name?: string | null } | null>
}

export function resolveSeriesContentIntent(format?: string, genre?: string): ContentIntent {
  return resolveContentIntentFromMetadata({ format, genre })
}

export interface SeriesFormatMapping {
  personaInstruction: string
  mappingInstruction: string
  leadLabel: string
  oppositionLabel: string
  threadsLabel: string
  nonFiction: boolean
}

const NONFICTION_BAN =
  'Do NOT invent a fictional plot, cast, antagonist, or fatal flaw.'

function engineMapping(engine: SeriesProductionEngine): Omit<SeriesFormatMapping, 'nonFiction'> {
  if (engine === 'educational') {
    return {
      personaInstruction: 'You are an expert curriculum designer and educational video producer.',
      leadLabel: 'HOST/INSTRUCTOR',
      oppositionLabel: 'LEARNING CHALLENGE',
      threadsLabel: 'LEARNING OBJECTIVES / THEMES',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR EDUCATIONAL CONTENT:
- Ensure the curriculum is structured and builds on prior knowledge.
- "protagonist": Host, Lead Instructor, or Guide. This is a presenter, not a fictional hero.
- "antagonistConflict": Core learning challenge or misconception, not a fictional villain.
- "storyThreads": Learning objectives or recurring themes.
- "episodes": Individual lessons or training modules, sequenced from foundational to advanced.
- episode "beats": Lesson segments (Intro, Core Concept, Demonstration, Review).
- ${NONFICTION_BAN}`,
    }
  }

  if (engine === 'podcast') {
    return {
      personaInstruction: 'You are an expert podcast producer and showrunner.',
      leadLabel: 'HOST',
      oppositionLabel: 'TOPIC TENSION',
      threadsLabel: 'RECURRING SEGMENTS / THEMES',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR PODCAST CONTENT:
- "protagonist": Main host. This is a presenter, not a fictional hero.
- "characters": Co-hosts or guests from the creator's subject.
- "antagonistConflict": The question, debate, or subject tension. Not a fictional villain.
- "storyThreads": Recurring segments or season themes.
- episode "beats": Show segments (Intro, Main conversation, Outro).
- ${NONFICTION_BAN} If the creator explicitly describes fiction audio, follow that premise instead.`,
    }
  }

  if (engine === 'documentary') {
    return {
      personaInstruction: 'You are an expert documentary filmmaker and docuseries producer.',
      leadLabel: 'NARRATOR/HOST',
      oppositionLabel: 'REAL SUBJECT',
      threadsLabel: 'SUBJECT ANGLES / TIMELINES',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR DOCUMENTARY CONTENT:
- Hosts and narrators present the creator's stated subject. Pictures and scenes illustrate those events.
- "protagonist": Narrator, host, or the real subject being followed. Not a fictional hero, and not a fatal flaw.
- "characters": Narrators, interviewees, or real people from the stated subject. Do not invent a fictional cast.
- "antagonistConflict": The real issue, event, or question being examined. Do NOT invent a fictional antagonist.
- "storyThreads": Angles, timelines, or questions about the stated subject.
- "episodes": Installments that move through the real subject.
- episode "beats": Narration segments (Introduce the event, illustrate what happened, explain what it means).
- ${NONFICTION_BAN} Do not fill missing facts with invented drama.`,
    }
  }

  if (engine === 'demo') {
    return {
      personaInstruction: 'You are an expert product marketer and technical evangelist.',
      leadLabel: 'PRESENTER',
      oppositionLabel: 'PAIN POINT',
      threadsLabel: 'VALUE PILLARS',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR COMMERCIAL CONTENT:
- "protagonist": Presenter, product specialist, or customer in the real use case.
- "antagonistConflict": Customer pain point or the problem the product addresses. Not a fictional villain.
- "storyThreads": Features, workflows, or proof points.
- episode "beats": Problem, demonstration, result.
- ${NONFICTION_BAN} Do NOT convert this into a fictional screenplay.`,
    }
  }

  if (engine === 'sales') {
    return {
      personaInstruction: 'You are an expert sales director and persuasive content producer.',
      leadLabel: 'PRESENTER',
      oppositionLabel: 'OBJECTION',
      threadsLabel: 'OFFER / CAMPAIGN',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR SALES CONTENT:
- "protagonist": Presenter, brand voice, or the customer in the offer.
- "antagonistConflict": The objection, cost of inaction, or problem the offer addresses. Not a fictional villain.
- "storyThreads": Benefits, proof, and the offer.
- episode "beats": Hook, value, objection, call to action.
- ${NONFICTION_BAN} Do NOT convert this into a fictional screenplay.`,
    }
  }

  if (engine === 'news') {
    return {
      personaInstruction: 'You are an expert journalist and news producer.',
      leadLabel: 'ANCHOR/REPORTER',
      oppositionLabel: 'STORY BEING REPORTED',
      threadsLabel: 'DEVELOPMENTS',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR NEWS CONTENT:
- "protagonist": Anchor, reporter, or the real person at the center of the report.
- "characters": Sources, experts, or public figures from the stated story. Do not invent a fictional cast.
- "antagonistConflict": The controversy, crisis, or question being reported. Not a fictional villain.
- "storyThreads": Developments, perspectives, or context from the stated story.
- episode "beats": Lead, reporting, context.
- Maintain factual framing. ${NONFICTION_BAN}`,
    }
  }

  return {
    personaInstruction: 'You are an expert TV series showrunner creating episodic narrative content.',
    leadLabel: 'PROTAGONIST',
    oppositionLabel: 'ANTAGONIST/CONFLICT',
    threadsLabel: 'ACTIVE STORY THREADS',
    mappingInstruction: `
CRITICAL: Each episode must advance the overall series arc. Include "storyThreads" to track ongoing plots.`,
  }
}

export function getSeriesFormatMapping(format: string): SeriesFormatMapping {
  const profile = getSeriesProductionProfile(format)
  const engine = profile?.engine ?? 'narrative'
  const base = engineMapping(engine)
  const craft = profile?.craft ? `\nCRAFT: ${profile.craft}` : ''
  const nonFiction = profile ? profile.intent !== 'fiction' : false
  return {
    ...base,
    nonFiction,
    mappingInstruction: `${base.mappingInstruction}${craft}`,
  }
}

/** Variable bible instructions. Fiction keeps a dramatic arc; non-fiction narrates the subject. */
export function seriesBibleTaskBlock(format: string, episodeCount: number): string {
  const mapping = getSeriesFormatMapping(format)
  if (!mapping.nonFiction) {
    return `Create a series bible that can sustain ${episodeCount} episodes/installments with compelling arcs.

Generate:
1. Series title (memorable, evocative)
2. Logline (1-2 sentences, hooks the audience)
3. Setting (vivid, specific), Protagonist (name, goal, fatal flaw), Antagonist/Conflict
4. Synopsis (2 paragraphs covering the full series arc)
5. Comprehensive characters and locations arrays.`
  }

  return `Create a series bible that can sustain ${episodeCount} installments about the creator's stated subject.
${NONFICTION_BAN} Hosts and narrators present that subject, and illustrations depict those events.

Generate:
1. Series title
2. Logline that states the real subject
3. Setting, narrator or host (name and role), and the real issue or question. Do NOT invent a protagonist fatal flaw or a fictional antagonist.
4. Synopsis covering how the stated subject unfolds across the installments
5. Narrators, real subjects, and locations. Do not invent a fictional cast.`
}

export function seriesBibleSchemaBlock(format: string): string {
  const mapping = getSeriesFormatMapping(format)
  if (!mapping.nonFiction) {
    return `{
  "title": "Series Title",
  "logline": "Hook that sells the series",
  "genre": "Genre",
  "productionBible": {
    "logline": "Hook",
    "synopsis": "Full series arc synopsis...",
    "setting": "Where and when",
    "timeframe": "Time period",
    "protagonist": {"characterId": "char_1", "name": "Name", "goal": "What they want", "flaw": "Fatal flaw"},
    "antagonistConflict": {"type": "character|nature|society|self|technology", "description": "Central conflict", "characterId": "char_2"},
    "characters": [
      {"id": "char_1", "name": "Name", "role": "protagonist", "description": "Character arc", "appearance": "Visual look", "personality": "Traits"},
      {"id": "char_2", "name": "Name", "role": "antagonist", "description": "Motivation", "appearance": "Look", "personality": "Traits"}
    ],
    "locations": [
      {"id": "loc_1", "name": "Name", "description": "Significance", "visualDescription": "Visual style"}
    ],
    "toneGuidelines": "Emotional tone and style",
    "visualGuidelines": "Cinematography and visual approach",
    "seriesArcs": ["Main arc description", "Subplot arc description"]
  },
  "episodeBlueprints": []
}`
  }

  return `{
  "title": "Series Title",
  "logline": "What this non-fiction series is about",
  "genre": "Genre",
  "productionBible": {
    "logline": "The stated subject",
    "synopsis": "How the subject unfolds across the installments...",
    "setting": "Where and when the subject takes place",
    "timeframe": "Time period",
    "protagonist": {"characterId": "char_1", "name": "Narrator or host", "goal": "What they present", "flaw": "Real obstacle only. Do not invent a fatal flaw."},
    "antagonistConflict": {"type": "society|nature|issue", "description": "The real issue or question. Not a fictional antagonist."},
    "characters": [
      {"id": "char_1", "name": "Name", "role": "narrator", "description": "How they present the subject", "appearance": "Visual look", "personality": "On-screen manner"}
    ],
    "locations": [
      {"id": "loc_1", "name": "Name", "description": "Why this place matters to the subject", "visualDescription": "What the illustration should show"}
    ],
    "toneGuidelines": "Editorial tone",
    "visualGuidelines": "How illustrations depict the events being narrated",
    "seriesArcs": ["How understanding of the subject develops"]
  },
  "episodeBlueprints": []
}`
}

export function buildEpisodeBatchPrompt(input: EpisodeBatchPromptInput): string {
  const format = input.format || 'narrative'
  const mapping = getSeriesFormatMapping(format)
  const intent = input.contentIntent ?? resolveSeriesContentIntent(format, input.genre)

  const characterList =
    input.characters
      ?.map((c) => `- ${c.name} (${c.role}): ${c.description}`)
      .join('\n') || 'Not specified'

  const threadBlock =
    input.activeThreads
      .map((t) => `- ${t.name} (${t.type}): ${t.status} - ${t.description || ''}`)
      .join('\n') || 'None tracked'

  const continuationRules =
    intent === 'fiction'
      ? `Each episode must:
1. Continue naturally from the last episode's hook
2. Advance or resolve active story threads
3. Introduce new threads if appropriate for pacing
4. End with a hook for the next episode (except finale)
5. Consider series position (early=setup, middle=complications, late=resolution)`
      : intent === 'informational'
        ? `Each installment must:
1. Build logically on prior learning or documentary progression
2. Advance active themes/objectives
3. Maintain factual/instructional framing — do NOT invent fictional plot
4. End with preview of next installment (except finale)`
        : intent === 'commercial'
          ? `Each installment must:
1. Continue the campaign or product narrative logically
2. Advance value pillars or proof points
3. Maintain persuasive structure — do NOT convert into fiction
4. End with CTA or preview of next installment (except finale)`
          : `Each episode must:
1. Continue conversational topic flow from prior episode
2. Advance recurring segments or themes
3. Maintain authentic host/guest framing
4. End with hook for next episode (except finale)`

  // Names already established in the series bible must survive verbatim, or the
  // new episodes will silently drift away from existing reference images and
  // locked prompt tokens.
  const languageBlock = localeDirective(input.storyLocale, {
    properNouns: buildProperNounGlossary(
      {
        characters: input.characters,
        locations: input.locations,
        props: input.props,
      },
      [input.seriesTitle, input.protagonist?.name]
    ),
    keepEnglishFields: ['act', 'status', 'type'],
    note: 'Episode numbering, act numbers, and status values stay as specified in the schema.',
  })

  return `${mapping.personaInstruction}

SERIES: ${input.seriesTitle}
LOGLINE: ${input.logline || 'Not specified'}
SYNOPSIS: ${input.synopsis || 'Not specified'}
FORMAT: ${format}
GENRE: ${input.genre || 'Unspecified'}
TONE: ${input.tone || 'Not specified'}
CONTENT INTENT: ${intent}

CHARACTERS/SUBJECTS:
${characterList}

${SERIES_CHARACTER_NAMING_BLOCK}

${mapping.leadLabel}: ${input.protagonist?.name || 'Not specified'} - Goal/Role: ${input.protagonist?.goal || ''}${input.protagonist?.flaw ? `, Trait: ${input.protagonist.flaw}` : ''}

${mapping.oppositionLabel}: ${input.antagonistConflict?.description || 'Not specified'}

PREVIOUS INSTALLMENTS (last 5):
${input.episodeSummaries || 'None yet'}

${mapping.threadsLabel}:
${threadBlock}

SERIES LENGTH: ${input.totalPlannedEpisodes} total installments
CURRENT POSITION: Episodes ${input.startEpisodeNumber} to ${input.startEpisodeNumber + input.count - 1} of ${input.totalPlannedEpisodes}

Generate ${input.count} NEW episodes starting from Episode ${input.startEpisodeNumber}.

${continuationRules}

${mapping.mappingInstruction}
${languageBlock}
Return ONLY valid JSON array:
[
  {
    "episodeNumber": ${input.startEpisodeNumber},
    "title": "Episode Title",
    "logline": "One sentence hook",
    "synopsis": "Full episode summary",
    "beats": [
      {"beatNumber": 1, "title": "Opening", "description": "Pickup from previous", "act": 1},
      {"beatNumber": 2, "title": "Middle", "description": "Core content", "act": 2},
      {"beatNumber": 3, "title": "End", "description": "Conclusion/cliffhanger", "act": 3}
    ],
    "characters": [{"characterId": "${input.protagonist?.characterId || 'char_1'}", "role": "protagonist"}],
    "storyThreads": [{"id": "thread_1", "name": "Thread Name", "type": "main|subplot|objective|segment", "status": "developing|climax|resolved", "description": "Progress in this episode"}],
    "plotDevelopments": ["Key development in this episode"],
    "episodeHook": "Setup for next episode",
    "status": "blueprint"
  }
]`
}
