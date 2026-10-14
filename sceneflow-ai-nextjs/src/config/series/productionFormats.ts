export const NEW_SERIES_EPISODE_COUNT = 5

export const DEFAULT_SERIES_PRODUCTION_FORMAT = 'cinematic_drama'

export type SeriesProductionEngine =
  | 'narrative'
  | 'documentary'
  | 'educational'
  | 'news'
  | 'podcast'
  | 'demo'
  | 'sales'

export type SeriesProductionIntent = 'fiction' | 'informational' | 'commercial' | 'conversational'

export type SeriesProductionCategoryId =
  | 'cinematic_fiction'
  | 'documentary_factual'
  | 'news_current'
  | 'education'
  | 'podcast_conversation'
  | 'commercial'

export const SERIES_PRODUCTION_CATEGORIES = [
  { id: 'cinematic_fiction', label: 'Cinematic Fiction' },
  { id: 'documentary_factual', label: 'Documentary and Factual' },
  { id: 'news_current', label: 'News and Current Affairs' },
  { id: 'education', label: 'Education' },
  { id: 'podcast_conversation', label: 'Podcast and Conversation' },
  { id: 'commercial', label: 'Commercial' },
] as const

export interface SeriesProductionFormatDefinition {
  value: string
  label: string
  hint: string
  placeholder: string
  category: SeriesProductionCategoryId
  intent: SeriesProductionIntent
  engine: SeriesProductionEngine
  /** One sentence that tells the model how this type should feel. */
  craft: string
}

export const SERIES_PRODUCTION_FORMATS = [
  {
    value: 'cinematic_drama',
    label: 'Cinematic Drama',
    hint: 'Character-driven drama with filmed scenes',
    placeholder: 'e.g., A family in a coastal town hides a debt that resurfaces at every funeral.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft:
      'Write a cinematic drama: character-driven scenes, emotional stakes, and a visual style that feels like a filmed series.',
  },
  {
    value: 'thriller',
    label: 'Thriller',
    hint: 'Suspense, reversals, and a credible threat',
    placeholder: 'e.g., A night-shift archivist realizes the files she is cataloging are being rewritten overnight.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a cinematic thriller: suspense, reversals, and a credible threat.',
  },
  {
    value: 'action',
    label: 'Action',
    hint: 'Set pieces, momentum, and physical goals',
    placeholder: 'e.g., A retrieval crew has one night to extract a witness from a city under lockdown.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a cinematic action series: set pieces, momentum, and clear physical goals.',
  },
  {
    value: 'comedy',
    label: 'Comedy',
    hint: 'A humorous continuing cast',
    placeholder: 'e.g., Three roommates inherit a failing community theater and try to keep it open.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a comedy series: humor from character and situation, with a continuing cast.',
  },
  {
    value: 'horror',
    label: 'Horror',
    hint: 'Dread, threat, and uneasy reveals',
    placeholder:
      'e.g., Residents of a cul-de-sac hear the same lullaby from the empty house at the end of the street.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a horror series: dread, threat, and reveals that earn their fear.',
  },
  {
    value: 'science_fiction',
    label: 'Science Fiction',
    hint: 'Speculative ideas with a continuing world',
    placeholder: 'e.g., A colony ship wakes one passenger every decade to keep the course corrected.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a science-fiction series: a speculative premise with rules the story honors.',
  },
  {
    value: 'fantasy',
    label: 'Fantasy',
    hint: 'An invented world with its own rules',
    placeholder: 'e.g., A cartographer maps a city that rearranges itself whenever a treaty is broken.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a fantasy series: an invented world whose rules drive the story.',
  },
  {
    value: 'romance',
    label: 'Romance',
    hint: 'A relationship the season is built around',
    placeholder: 'e.g., Two rival florists share a stall at a year-long night market.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a romance series: the relationship is the story, and the season is built around it.',
  },
  {
    value: 'mystery',
    label: 'Mystery',
    hint: 'A question the episodes investigate',
    placeholder: 'e.g., A small-town clerk notices the same name disappearing from every public record.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a mystery series: a central question, clues, and a fair reveal.',
  },
  {
    value: 'crime',
    label: 'Crime',
    hint: 'An investigation inside a criminal world',
    placeholder: 'e.g., A defense investigator tracks a case that the precinct already closed.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a crime series: investigation, motive, and the world around the case.',
  },
  {
    value: 'adventure',
    label: 'Adventure',
    hint: 'A journey with escalating obstacles',
    placeholder: 'e.g., A survey team follows a river that is not on any of their maps.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write an adventure series: a journey, escalating obstacles, and a destination that matters.',
  },
  {
    value: 'narrative',
    label: 'Narrative',
    hint: 'Serialized story with a continuing cast',
    placeholder: 'e.g., A continuing cast faces a problem that changes them across the season.',
    category: 'cinematic_fiction',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a serialized story with a continuing cast and an arc across episodes.',
  },
  {
    value: 'documentary',
    label: 'Documentary',
    hint: 'Narrators present real events; pictures illustrate them',
    placeholder: 'e.g., Follow three urban beekeepers through one honey season in Chicago.',
    category: 'documentary_factual',
    intent: 'informational',
    engine: 'documentary',
    craft:
      "Hosts and narrators present the creator's stated subject, and the pictures illustrate those events.",
  },
  {
    value: 'true_crime',
    label: 'True Crime',
    hint: 'A factual case, not a dramatized plot',
    placeholder:
      'e.g., Reconstruct the unsolved disappearance of a lighthouse keeper from the case files and interviews.',
    category: 'documentary_factual',
    intent: 'informational',
    engine: 'documentary',
    craft:
      "Treat this as a factual true-crime account of the creator's case. Narrate the record; do not dramatize a fictional crime plot.",
  },
  {
    value: 'biography',
    label: 'Biography',
    hint: 'A life told from real events',
    placeholder: 'e.g., Tell the life of a city architect through the buildings and the people who still use them.',
    category: 'documentary_factual',
    intent: 'informational',
    engine: 'documentary',
    craft: "Tell the subject's life from the events the creator described. Do not invent a fictional biopic plot.",
  },
  {
    value: 'history',
    label: 'History',
    hint: 'Narrated historical events',
    placeholder: 'e.g., Narrate the week a harbor closed and how the town adapted.',
    category: 'documentary_factual',
    intent: 'informational',
    engine: 'documentary',
    craft: 'Narrate the historical events the creator described. Do not replace them with invented drama.',
  },
  {
    value: 'nature_science',
    label: 'Nature and Science',
    hint: 'Observed phenomena, explained on screen',
    placeholder: 'e.g., Explain how a coral reef rebuilds after a bleaching season, season by season.',
    category: 'documentary_factual',
    intent: 'informational',
    engine: 'documentary',
    craft: 'Explain the natural or scientific subject. Observe and illustrate it; do not personify it into fiction.',
  },
  {
    value: 'news',
    label: 'News',
    hint: 'Current events told as a continuing series',
    placeholder: 'e.g., A nightly briefing on a municipal water crisis as new facts come in.',
    category: 'news_current',
    intent: 'informational',
    engine: 'news',
    craft: 'Report the events the creator described with a clear lead, context, and what is known.',
  },
  {
    value: 'investigative',
    label: 'Investigative Report',
    hint: 'A factual inquiry across installments',
    placeholder: 'e.g., Reporters follow a public contract from the bid through the finished project.',
    category: 'news_current',
    intent: 'informational',
    engine: 'news',
    craft: 'Follow the factual inquiry the creator described. Findings come from that subject, not an invented conspiracy plot.',
  },
  {
    value: 'sports',
    label: 'Sports',
    hint: 'A season, club, or event as it happens',
    placeholder: "e.g., Cover one club's season from training camp through the final match.",
    category: 'news_current',
    intent: 'informational',
    engine: 'news',
    craft: 'Cover the sporting subject the creator described: competition, context, and what is at stake on the record.',
  },
  {
    value: 'educational',
    label: 'Education',
    hint: 'Instructional episodes that build on each other',
    placeholder: 'e.g., A five-lesson course on reading a city budget, each lesson building on the last.',
    category: 'education',
    intent: 'informational',
    engine: 'educational',
    craft: 'Teach the subject in sequence. Each episode adds a lesson; do not wrap it in a fictional plot.',
  },
  {
    value: 'training',
    label: 'Training',
    hint: 'A procedure or skill, one step at a time',
    placeholder: 'e.g., A workshop series that teaches a field kit setup, one procedure per episode.',
    category: 'education',
    intent: 'informational',
    engine: 'educational',
    craft: 'Train the viewer on the procedure. Demonstrate steps, checkpoints, and practice.',
  },
  {
    value: 'explainer',
    label: 'Explainer',
    hint: 'One idea made clear per episode',
    placeholder: 'e.g., Explain how a community solar subscription works, one concept per episode.',
    category: 'education',
    intent: 'informational',
    engine: 'educational',
    craft: 'Explain the idea plainly, with examples. Clarity comes before drama.',
  },
  {
    value: 'podcast',
    label: 'Podcast',
    hint: 'A recurring hosted show',
    placeholder: 'e.g., A weekly hosted conversation with people who restore old radios.',
    category: 'podcast_conversation',
    intent: 'conversational',
    engine: 'podcast',
    craft: 'Shape a hosted show with segments. Keep it conversational unless the creator explicitly describes fiction audio.',
  },
  {
    value: 'interview',
    label: 'Interview',
    hint: 'A host in conversation with a guest',
    placeholder: 'e.g., Sit-down interviews with the night-shift workers who keep a hospital running.',
    category: 'podcast_conversation',
    intent: 'conversational',
    engine: 'podcast',
    craft: 'Shape an interview series: a host, a guest, and the questions that draw out the subject.',
  },
  {
    value: 'audio_drama',
    label: 'Audio Drama',
    hint: 'Fiction carried by voice and sound',
    placeholder: 'e.g., An audio series about two switchboard operators who overhear a city changing.',
    category: 'podcast_conversation',
    intent: 'fiction',
    engine: 'narrative',
    craft: 'Write a fiction audio drama carried by dialogue, voice, and sound, not a hosted non-fiction show.',
  },
  {
    value: 'demo',
    label: 'Product Demo',
    hint: 'A product shown across a sequence of episodes',
    placeholder: 'e.g., Show how a field kit packs in under a minute, one workflow per episode.',
    category: 'commercial',
    intent: 'commercial',
    engine: 'demo',
    craft: 'Demonstrate the product or workflow. Show the problem, the feature, and the result.',
  },
  {
    value: 'sales',
    label: 'Sales',
    hint: 'A persuasive walkthrough with a clear offer',
    placeholder: 'e.g., A walkthrough of why a clinic switched suppliers, ending in a clear offer.',
    category: 'commercial',
    intent: 'commercial',
    engine: 'sales',
    craft: 'Make a persuasive walkthrough with a clear offer. Do not turn the pitch into a fictional screenplay.',
  },
  {
    value: 'advertisement',
    label: 'Advertisement',
    hint: 'A branded series with a message and a call to action',
    placeholder:
      "e.g., A short branded series about a bakery's morning routine and the product that makes it possible.",
    category: 'commercial',
    intent: 'commercial',
    engine: 'sales',
    craft: 'Make a branded series: a clear message, the product in use, and a call to action.',
  },
  {
    value: 'case_study',
    label: 'Case Study',
    hint: 'One customer, from problem to measured result',
    placeholder: 'e.g., Follow one customer from the problem through the measured result.',
    category: 'commercial',
    intent: 'commercial',
    engine: 'demo',
    craft: 'Tell a case study: customer context, challenge, solution, and measurable result.',
  },
] as const satisfies readonly SeriesProductionFormatDefinition[]

export type SeriesProductionFormat = (typeof SERIES_PRODUCTION_FORMATS)[number]['value']

const FORMAT_VALUES = new Set<string>(SERIES_PRODUCTION_FORMATS.map((format) => format.value))

const FORMAT_BY_VALUE = new Map<string, SeriesProductionFormatDefinition>(
  SERIES_PRODUCTION_FORMATS.map((format) => [format.value, format])
)

export function isSeriesProductionFormat(value: string): value is SeriesProductionFormat {
  return FORMAT_VALUES.has(value)
}

export function getSeriesProductionProfile(
  value: string | null | undefined
): SeriesProductionFormatDefinition | undefined {
  if (!value) return undefined
  return FORMAT_BY_VALUE.get(value.trim().toLowerCase())
}

/** Known series types win over a free-text genre. Unknown formats return null. */
export function intentForSeriesProductionFormat(
  value: string | null | undefined
): SeriesProductionIntent | null {
  return getSeriesProductionProfile(value)?.intent ?? null
}

/** Formats whose synopsis must stay non-fiction. */
export const NON_FICTION_PRODUCTION_FORMATS = new Set<SeriesProductionFormat>(
  SERIES_PRODUCTION_FORMATS.filter((format) => format.intent !== 'fiction').map(
    (format) => format.value
  )
)

export function isNonFictionProductionFormat(format: string): boolean {
  return NON_FICTION_PRODUCTION_FORMATS.has(format as SeriesProductionFormat)
}

export function seriesProductionFormatsByCategory(): Array<{
  id: SeriesProductionCategoryId
  label: string
  formats: SeriesProductionFormatDefinition[]
}> {
  return SERIES_PRODUCTION_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    formats: SERIES_PRODUCTION_FORMATS.filter((format) => format.category === category.id),
  }))
}
