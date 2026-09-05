export type SeriesTemplateId =
  | 'episodic_drama'
  | 'weekly_youtube'
  | 'learning_series'
  | 'animated_kids'
  | 'documentary'
  | 'anthology'

export interface SeriesTemplate {
  id: SeriesTemplateId
  label: string
  description: string
  format: string
  genre: string
  tone: string
  episodeCount: number
  conceptPlaceholder: string
  sampleConcept: string
}

export const SERIES_TEMPLATES: SeriesTemplate[] = [
  {
    id: 'episodic_drama',
    label: 'Episodic Drama',
    description: 'Serialized story with recurring cast and season-long arcs.',
    format: 'narrative',
    genre: 'drama',
    tone: 'dramatic',
    episodeCount: 10,
    conceptPlaceholder: 'A family drama set in a coastal town where secrets surface each episode…',
    sampleConcept:
      'A family drama set in a coastal town where each episode reveals a secret that reshapes loyalties across the season.',
  },
  {
    id: 'weekly_youtube',
    label: 'Weekly YouTube Channel',
    description: 'Recurring host, consistent format, episodic topics.',
    format: 'narrative',
    genre: 'any',
    tone: 'conversational',
    episodeCount: 12,
    conceptPlaceholder: 'A weekly show where the host explores one creator-economy topic per episode…',
    sampleConcept:
      'A weekly show where the host breaks down one creator-economy trend per episode with case studies and actionable takeaways.',
  },
  {
    id: 'learning_series',
    label: 'Learning Series',
    description: 'Instructional episodes with progressive curriculum.',
    format: 'educational',
    genre: 'educational',
    tone: 'clear',
    episodeCount: 8,
    conceptPlaceholder: 'An intro-to-filmmaking course covering script, pre-vis, and delivery…',
    sampleConcept:
      'An intro-to-filmmaking course that walks beginners from script structure through pre-vis beats to a finished screening cut.',
  },
  {
    id: 'animated_kids',
    label: 'Animated Kids',
    description: 'Light tone, recurring characters, moral-of-the-week structure.',
    format: 'narrative',
    genre: 'fantasy',
    tone: 'playful',
    episodeCount: 10,
    conceptPlaceholder: 'A group of young explorers solve one mystery per episode in a magical forest…',
    sampleConcept:
      'A group of young explorers solve one mystery per episode in a magical forest while learning teamwork and empathy.',
  },
  {
    id: 'documentary',
    label: 'Documentary',
    description: 'Episodic nonfiction with consistent visual language.',
    format: 'documentary',
    genre: 'documentary',
    tone: 'informative',
    episodeCount: 6,
    conceptPlaceholder: 'A docuseries following innovators rebuilding sustainable cities…',
    sampleConcept:
      'A docuseries following innovators rebuilding sustainable cities — one city, one breakthrough per episode.',
  },
  {
    id: 'anthology',
    label: 'Anthology',
    description: 'Standalone episodes united by theme or host framing.',
    format: 'narrative',
    genre: 'thriller',
    tone: 'varied',
    episodeCount: 8,
    conceptPlaceholder: 'Twilight-zone style episodes tied by a mysterious host narrator…',
    sampleConcept:
      'Twilight-zone style standalone episodes tied together by a mysterious host who appears at the start and end of each story.',
  },
]

export function getSeriesTemplate(id: SeriesTemplateId): SeriesTemplate | undefined {
  return SERIES_TEMPLATES.find((t) => t.id === id)
}
