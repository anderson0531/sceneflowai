export interface ProductionAssistant {
  id: string
  title: string
  voiceId: string
  description: string
}

export const DIRECTOR_ASSISTANTS: ProductionAssistant[] = [
  {
    id: 'senior-script-consultant',
    title: 'Senior Script Consultant',
    voiceId: 'en-US-Chirp-HD-K',
    description: 'Seasoned, soulful male voice. Measured wisdom, deep resonance, significant pauses.',
  },
  {
    id: 'head-of-editorial',
    title: 'Head of Editorial',
    voiceId: 'en-US-Chirp-HD-D',
    description: 'Polished, crisp, and authoritative. Formal, high-stakes production briefing tone.',
  },
  {
    id: 'research-lead',
    title: 'Research Lead',
    voiceId: 'en-US-Chirp-HD-O',
    description: 'Intelligent, inquisitive, neutral male tone. Optimized for data-heavy and investigative insights.',
  },
  {
    id: 'creative-story-partner',
    title: 'Creative Story Partner',
    voiceId: 'en-US-Chirp-HD-F',
    description: 'Warm, smooth, highly expressive female voice. Focus on narrative nuance and emotional summaries.',
  },
  {
    id: 'executive-producer',
    title: 'Executive Producer',
    voiceId: 'en-US-Chirp-HD-P',
    description: 'Commanding, steady baritone. Direct, no-nonsense delivery for status reports.',
  },
  {
    id: 'innovation-liaison',
    title: 'Innovation Liaison',
    voiceId: 'en-US-Chirp-HD-S',
    description: 'Modern, bright, energetic female voice. Tailored for tech-centric and visionary updates.',
  },
  {
    id: 'international-liaison',
    title: 'International Liaison',
    voiceId: 'en-US-Chirp-HD-C',
    description: 'Sophisticated, mid-range male. Neutral international polish for an unbiased perspective.',
  },
  {
    id: 'continuity-advisor',
    title: 'Continuity Advisor',
    voiceId: 'en-US-Chirp-HD-B',
    description: 'Trustworthy, grounded female voice. High clarity for long-form content.',
  },
  {
    id: 'field-correspondent',
    title: 'Field Correspondent',
    voiceId: 'en-US-Chirp-HD-A',
    description: 'Gritty, rhythmic, urgent male voice. Slight "breaking news" edge.',
  },
  {
    id: 'zen-flow-assistant',
    title: 'Zen Flow Assistant',
    voiceId: 'en-US-Chirp-HD-X',
    description: 'Ultra-calm, atmospheric male voice. Designed to reduce listener fatigue.',
  }
]

export function getAssistantDirectorNote(assistant: ProductionAssistant): string {
  return `[DirectorNote: Read with a ${assistant.description}]`
}

export function getAssistantById(id: string): ProductionAssistant | undefined {
  return DIRECTOR_ASSISTANTS.find((a) => a.id === id)
}

export function getAssistantByVoiceId(voiceId: string): ProductionAssistant | undefined {
  return DIRECTOR_ASSISTANTS.find((a) => a.voiceId === voiceId)
}

export function applyAssistantStyle(text: string, assistantId: string): string {
  const assistant = getAssistantById(assistantId)
  if (!assistant) {
    return text
  }
  const note = getAssistantDirectorNote(assistant)
  return `${note} ${text}`
}
