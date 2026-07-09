/**
 * Shared episode batch prompt builder for series generation.
 * Ensures format/intent-aware prompts across generate and episodes/add routes.
 */

import type { ContentIntent } from '@/lib/content/contentIntent'
import { resolveContentIntentFromMetadata } from '@/lib/content/contentIntent'
import { SERIES_CHARACTER_NAMING_BLOCK } from '@/lib/character/characterNamingPrompt'

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
}

export function resolveSeriesContentIntent(format?: string, genre?: string): ContentIntent {
  return resolveContentIntentFromMetadata({ format, genre })
}

export function getSeriesFormatMapping(format: string): {
  personaInstruction: string
  mappingInstruction: string
  leadLabel: string
  oppositionLabel: string
  threadsLabel: string
} {
  if (format === 'educational') {
    return {
      personaInstruction: 'You are an expert curriculum designer and educational video producer.',
      leadLabel: 'HOST/INSTRUCTOR',
      oppositionLabel: 'LEARNING CHALLENGE',
      threadsLabel: 'LEARNING OBJECTIVES / THEMES',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR EDUCATIONAL CONTENT:
- "protagonist": Host, Lead Instructor, or Guide
- "antagonistConflict": Core learning challenge or misconception
- "storyThreads": Learning objectives or recurring themes
- episode "beats": Lesson segments (Intro, Concept, Demo, Review)
- Do NOT invent fictional plot or characters`,
    }
  }

  if (format === 'podcast') {
    return {
      personaInstruction: 'You are an expert podcast producer and showrunner.',
      leadLabel: 'HOST',
      oppositionLabel: 'TENSION TOPIC',
      threadsLabel: 'RECURRING SEGMENTS / THEMES',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR PODCAST CONTENT:
- "protagonist": Main Host
- "antagonistConflict": Central theme, mystery, or debate angle
- "storyThreads": Recurring segments or season themes
- episode "beats": Show segments (Intro, Main, Outro)
- Do NOT invent fictional narrative plot`,
    }
  }

  if (format === 'documentary') {
    return {
      personaInstruction: 'You are an expert documentary filmmaker and docuseries producer.',
      leadLabel: 'SUBJECT/NARRATOR',
      oppositionLabel: 'CORE ISSUE',
      threadsLabel: 'INVESTIGATION ANGLES / TIMELINES',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR DOCUMENTARY CONTENT:
- "protagonist": Main subject or narrator/investigator
- "antagonistConflict": Central conflict or systemic issue (real, not fictional)
- "storyThreads": Investigation angles or historical timelines
- episode "beats": Narrative segments over real subjects
- Do NOT fictionalize real subjects or invent drama`,
    }
  }

  if (format === 'demo' || format === 'sales') {
    return {
      personaInstruction:
        format === 'demo'
          ? 'You are an expert product marketer and technical evangelist.'
          : 'You are an expert sales director and persuasive content producer.',
      leadLabel: 'PRESENTER',
      oppositionLabel: 'PAIN POINT / OBJECTION',
      threadsLabel: 'VALUE PILLARS / CAMPAIGN NARRATIVE',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR COMMERCIAL CONTENT:
- "protagonist": Presenter or Brand Voice
- "antagonistConflict": Customer pain point or objection
- "storyThreads": Value propositions or product pillars
- episode "beats": Problem → Solution → Proof → CTA segments
- Do NOT convert into fictional screenplay`,
    }
  }

  if (format === 'news') {
    return {
      personaInstruction: 'You are an expert investigative journalist and news producer.',
      leadLabel: 'ANCHOR/REPORTER',
      oppositionLabel: 'CORE CONTROVERSY',
      threadsLabel: 'ONGOING DEVELOPMENTS',
      mappingInstruction: `
CRITICAL SCHEMA MAPPING FOR NEWS CONTENT:
- "protagonist": Lead anchor or reporter
- "antagonistConflict": Core controversy or crisis
- "storyThreads": Perspectives or ongoing developments
- episode "beats": Headline, Field reporting, Analysis segments
- Maintain factual framing — no fictionalization`,
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
