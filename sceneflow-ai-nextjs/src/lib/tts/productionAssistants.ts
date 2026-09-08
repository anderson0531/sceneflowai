export interface ProductionAssistant {
  name: string
  avatar: {
    initials: string
    color: string
  }
  id: string
  title: string
  /** Gemini TTS voice used for Audience Resonance narration. */
  voiceId: string
  /** Legacy Cloud TTS ids so old localStorage / Zustand values still resolve. */
  legacyVoiceIds?: string[]
  description: string
  pitch: string
}

export const AUDIENCE_RESONANCE_VOICE_KEY = 'sceneflow-audience-resonance-voice'

export const DIRECTOR_ASSISTANTS: ProductionAssistant[] = [
  {
    id: 'senior-script-consultant',
    name: 'Marcus',
    avatar: { initials: 'M', color: 'bg-indigo-500' },
    title: 'Senior Script Consultant',
    voiceId: 'gemini-Algenib',
    legacyVoiceIds: ['en-US-Journey-D'],
    description: 'Seasoned, soulful male voice. Measured wisdom, deep resonance, significant pauses.',
    pitch: 'I bring measured wisdom and deep resonance to your script. Select me when you need a soulful, seasoned perspective on your narrative.',
  },
  {
    id: 'head-of-editorial',
    name: 'Elena',
    avatar: { initials: 'E', color: 'bg-rose-500' },
    title: 'Head of Editorial',
    voiceId: 'gemini-Achernar',
    legacyVoiceIds: ['en-US-Neural2-E'],
    description: 'Polished, crisp, and authoritative female voice. Formal, high-stakes production briefing tone.',
    pitch: 'My delivery is polished, crisp, and authoritative. Choose me for your high-stakes production briefings and formal script analysis.',
  },
  {
    id: 'research-lead',
    name: 'Julian',
    avatar: { initials: 'J', color: 'bg-emerald-500' },
    title: 'Research Lead',
    voiceId: 'gemini-Charon',
    legacyVoiceIds: ['en-US-Neural2-I'],
    description: 'Intelligent, inquisitive, neutral male tone. Optimized for data-heavy and investigative insights.',
    pitch: 'I provide an intelligent, inquisitive, and neutral tone. I am highly optimized for delivering data-heavy and investigative insights.',
  },
  {
    id: 'creative-story-partner',
    name: 'Sarah',
    avatar: { initials: 'S', color: 'bg-amber-500' },
    title: 'Creative Story Partner',
    voiceId: 'gemini-Zephyr',
    legacyVoiceIds: ['en-US-Journey-F'],
    description: 'Warm, smooth, highly expressive female voice. Focus on narrative nuance and emotional summaries.',
    pitch: 'I offer a warm, smooth, and highly expressive voice. Partner with me when you want to focus on narrative nuance and emotional resonance.',
  },
  {
    id: 'executive-producer',
    name: 'David',
    avatar: { initials: 'D', color: 'bg-slate-700' },
    title: 'Executive Producer',
    voiceId: 'gemini-Algieba',
    legacyVoiceIds: ['en-US-Neural2-A'],
    description: 'Commanding, steady baritone. Direct, no-nonsense delivery for status reports.',
    pitch: 'I deliver status reports with a commanding, steady baritone. Select me for direct, no-nonsense feedback on your project.',
  },
  {
    id: 'innovation-liaison',
    name: 'Chloe',
    avatar: { initials: 'C', color: 'bg-fuchsia-500' },
    title: 'Innovation Liaison',
    voiceId: 'gemini-Despina',
    legacyVoiceIds: ['en-US-Journey-O'],
    description: 'Modern, bright, energetic female voice. Tailored for tech-centric and visionary updates.',
    pitch: 'My voice is modern, bright, and energetic. I am the perfect choice for tech-centric stories and visionary project updates.',
  },
  {
    id: 'international-liaison',
    name: 'Arthur',
    avatar: { initials: 'A', color: 'bg-cyan-600' },
    title: 'International Liaison',
    voiceId: 'gemini-Orus',
    legacyVoiceIds: ['en-GB-Neural2-B'],
    description: 'Sophisticated, mid-range male. Neutral international polish for an unbiased perspective.',
    pitch: 'I speak with a sophisticated, neutral international polish. Choose me when your production requires a worldly, unbiased perspective.',
  },
  {
    id: 'continuity-advisor',
    name: 'Rachel',
    avatar: { initials: 'R', color: 'bg-teal-500' },
    title: 'Continuity Advisor',
    voiceId: 'gemini-Aoede',
    legacyVoiceIds: ['en-US-Neural2-C'],
    description: 'Trustworthy, grounded female voice. High clarity for long-form content.',
    pitch: 'I am your trustworthy, grounded advisor. My high clarity ensures you never lose the thread during long-form content review.',
  },
  {
    id: 'field-correspondent',
    name: 'Victor',
    avatar: { initials: 'V', color: 'bg-orange-600' },
    title: 'Field Correspondent',
    voiceId: 'gemini-Fenrir',
    legacyVoiceIds: ['en-US-Neural2-D'],
    description: 'Gritty, rhythmic, urgent male voice. Slight "breaking news" edge.',
    pitch: 'I bring a gritty, rhythmic, and urgent energy to the table. Select me if you want your script updates delivered with a breaking-news edge.',
  },
  {
    id: 'zen-flow-assistant',
    name: 'Maya',
    avatar: { initials: 'M', color: 'bg-violet-400' },
    title: 'Zen Flow Assistant',
    voiceId: 'gemini-Pulcherrima',
    legacyVoiceIds: ['en-US-Neural2-F'],
    description: 'Ultra-calm, atmospheric female voice. Designed to reduce listener fatigue.',
    pitch: 'I provide an ultra-calm, atmospheric experience. Choose me to reduce listener fatigue during those long, focused review sessions.',
  },
]

function assistantMatchesVoiceId(assistant: ProductionAssistant, voiceId: string): boolean {
  if (assistant.voiceId === voiceId) return true
  return (assistant.legacyVoiceIds || []).includes(voiceId)
}

export function getAssistantDirectorNote(assistant: ProductionAssistant): string {
  return `[DirectorNote: Read with a ${assistant.description}]`
}

export function getAssistantById(id: string): ProductionAssistant | undefined {
  return DIRECTOR_ASSISTANTS.find((a) => a.id === id)
}

export function getAssistantByVoiceId(voiceId: string): ProductionAssistant | undefined {
  return DIRECTOR_ASSISTANTS.find((a) => assistantMatchesVoiceId(a, voiceId))
}

export function resolveAssistant(idOrVoiceId?: string | null): ProductionAssistant {
  if (idOrVoiceId) {
    const byId = getAssistantById(idOrVoiceId)
    if (byId) return byId
    const byVoice = getAssistantByVoiceId(idOrVoiceId)
    if (byVoice) return byVoice
  }
  return DIRECTOR_ASSISTANTS[0]
}

/** Gemini voice id to send to /api/tts/google. */
export function resolveAssistantGeminiVoiceId(idOrVoiceId?: string | null): string {
  return resolveAssistant(idOrVoiceId).voiceId
}

export function applyAssistantStyle(text: string, assistantId: string): string {
  const assistant = getAssistantById(assistantId)
  if (!assistant) {
    return text
  }
  const note = getAssistantDirectorNote(assistant)
  return `${note} ${text}`
}

export interface PersistedAssistantVoice {
  assistantId: string
  voiceId: string
  voiceName: string
}

export function persistAssistantVoice(assistant: ProductionAssistant): void {
  if (typeof window === 'undefined') return
  const payload: PersistedAssistantVoice = {
    assistantId: assistant.id,
    voiceId: assistant.voiceId,
    voiceName: assistant.title,
  }
  try {
    localStorage.setItem(AUDIENCE_RESONANCE_VOICE_KEY, JSON.stringify(payload))
  } catch {}
}

export function loadPersistedAssistantVoice(): PersistedAssistantVoice | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUDIENCE_RESONANCE_VOICE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedAssistantVoice> & { voiceId?: string }
    const assistant = resolveAssistant(parsed.assistantId || parsed.voiceId)
    return {
      assistantId: assistant.id,
      voiceId: assistant.voiceId,
      voiceName: parsed.voiceName || assistant.title,
    }
  } catch {
    return null
  }
}
