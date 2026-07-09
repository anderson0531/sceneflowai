/**
 * Curated Gemini 3.1 TTS base voices with gender and archetype metadata for scoring/UI.
 */

export type GeminiVoiceGender = 'male' | 'female'
export type GeminiVoiceAgeBand = 'young' | 'middle' | 'mature'

export interface GeminiVoiceCatalogEntry {
  id: string
  displayName: string
  gender: GeminiVoiceGender
  languageCode: string
  archetypeDescription: string
  ageBand: GeminiVoiceAgeBand
}

/** Gemini base voices tagged youthful/bright for young cast. */
const YOUNG_VOICE_IDS = new Set([
  'gemini-Despina',
  'gemini-Leda',
  'gemini-Puck',
  'gemini-Zephyr',
  'gemini-Fenrir',
])

/** Gemini base voices tagged older/gravelly for mature cast. */
const MATURE_VOICE_IDS = new Set([
  'gemini-Schedar',
  'gemini-Rasalgethi',
  'gemini-Charon',
  'gemini-Zubenelgenubi',
])

export function getGeminiVoiceAgeBand(id: string): GeminiVoiceAgeBand {
  if (YOUNG_VOICE_IDS.has(id)) return 'young'
  if (MATURE_VOICE_IDS.has(id)) return 'mature'
  return 'middle'
}

export const GEMINI_VOICE_CATALOG: GeminiVoiceCatalogEntry[] = [
  {
    id: 'gemini-Achernar',
    displayName: 'Achernar (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Crisp, articulate, and highly professional; excellent for authoritative narrators or corporate agents.',
  },
  {
    id: 'gemini-Achird',
    displayName: 'Achird (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Direct, steady, and clear; a solid choice for straightforward dialogue or informational prompts.',
  },
  {
    id: 'gemini-Algenib',
    displayName: 'Algenib (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Resonant, warm, and highly engaging; perfect for conversational leads or friendly guides.',
  },
  {
    id: 'gemini-Algieba',
    displayName: 'Algieba (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Smooth, commanding, and polished; well-suited for traditional professional voiceovers and announcers.',
  },
  {
    id: 'gemini-Alnilam',
    displayName: 'Alnilam (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Balanced, professional, and clear; a highly versatile, neutral male voice option.',
  },
  {
    id: 'gemini-Aoede',
    displayName: 'Aoede (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Smooth, rich, and warm; highly recommended for immersive storytelling, audiobooks, and long-form narrations.',
  },
  {
    id: 'gemini-Autonoe',
    displayName: 'Autonoe (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Distinct, sharp, and highly expressive; great for characters requiring nuanced emotional delivery.',
  },
  {
    id: 'gemini-Callirrhoe',
    displayName: 'Callirrhoe (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Elegant, melodic, and precisely articulate; ideal for refined, sophisticated, or dramatic roles.',
  },
  {
    id: 'gemini-Charon',
    displayName: 'Charon (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Deep, informative, and measured; tailored well for clinical, instructional, or documentary characters.',
  },
  {
    id: 'gemini-Despina',
    displayName: 'Despina (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Upbeat, bright, and modern; ideal for contemporary characters, marketing, or high-energy roles.',
  },
  {
    id: 'gemini-Enceladus',
    displayName: 'Enceladus (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Casual and uniquely breathy; a standout option for characters who are tired, bored, or delivering deadpan dialogue.',
  },
  {
    id: 'gemini-Erinome',
    displayName: 'Erinome (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Gentle, reassuring, and exceptionally soft; perfect for customer care, soothing guides, or empathetic characters.',
  },
  {
    id: 'gemini-Fenrir',
    displayName: 'Fenrir (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Excitable, dynamic, and highly animated; a prime choice for high-energy, expressive, or reactive characters.',
  },
  {
    id: 'gemini-Gacrux',
    displayName: 'Gacrux (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Soft, gentle, and intimate; great for quiet dialogue, internal monologues, or relaxed settings.',
  },
  {
    id: 'gemini-Iapetus',
    displayName: 'Iapetus (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Clear, neutral, and direct; useful for secondary characters requiring an un-intrusive broadcast delivery.',
  },
  {
    id: 'gemini-Kore',
    displayName: 'Kore (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Firm, confident, and highly self-assured; great for leadership roles, managers, or assertive characters.',
  },
  {
    id: 'gemini-Laomedeia',
    displayName: 'Laomedeia (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Nuanced, detailed, and highly expressive; easily adapts to heavy dramatic tonal shifts within scripts.',
  },
  {
    id: 'gemini-Leda',
    displayName: 'Leda (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Youthful, warm, and highly approachable; ideal for relatable protagonists, peers, or companion roles.',
  },
  {
    id: 'gemini-Orus',
    displayName: 'Orus (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Exceptionally clear, balanced, and completely neutral; an ideal middle-ground baseline voice.',
  },
  {
    id: 'gemini-Pulcherrima',
    displayName: 'Pulcherrima (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Calm, composed, and completely steady; flawless choice for highly logical, meditative, or stoic characters.',
  },
  {
    id: 'gemini-Puck',
    displayName: 'Puck (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Upbeat, playful, energetic, and cheerful; perfect for sidekicks, comedic relief, or enthusiastic prompts.',
  },
  {
    id: 'gemini-Rasalgethi',
    displayName: 'Rasalgethi (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Robust, deep, and fundamentally narrative-driven; adds excellent narrative weight to classic storytelling.',
  },
  {
    id: 'gemini-Sadachbia',
    displayName: 'Sadachbia (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Professional, crisp, and steady; fits standard industrial or e-learning narrator roles.',
  },
  {
    id: 'gemini-Sadaltager',
    displayName: 'Sadaltager (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Confident, corporate, and highly stable; excellent for polished executive or modern anchor characters.',
  },
  {
    id: 'gemini-Schedar',
    displayName: 'Schedar (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Gravelly, deep, and deeply authoritative; tailored for older characters, veterans, or gritty environments.',
  },
  {
    id: 'gemini-Sulafat',
    displayName: 'Sulafat (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Polished, clean, and corporate; premium sounding, ideal for sleek modern branding or assistants.',
  },
  {
    id: 'gemini-Umbriel',
    displayName: 'Umbriel (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Highly conversational, clear, and modern; perfect for tech-savvy characters or interactive dialogues.',
  },
  {
    id: 'gemini-Vindemiatrix',
    displayName: 'Vindemiatrix (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Precise, bright, and highly analytical; great for instructors, scientists, or highly articulate characters.',
  },
  {
    id: 'gemini-Zephyr',
    displayName: 'Zephyr (Gemini)',
    gender: 'female',
    languageCode: 'en-US',
    archetypeDescription:
      'Bright, clear, and highly energetic; brings a vibrant, high-energy presence to fast-paced script needs.',
  },
  {
    id: 'gemini-Zubenelgenubi',
    displayName: 'Zubenelgenubi (Gemini)',
    gender: 'male',
    languageCode: 'en-US',
    archetypeDescription:
      'Strong, highly steady, and deeply resonant; creates a solid anchor for heavy, grounding dialogue.',
  },
].map((entry) => ({
  ...entry,
  ageBand: getGeminiVoiceAgeBand(entry.id),
}))

const CATALOG_BY_ID = new Map(GEMINI_VOICE_CATALOG.map((v) => [v.id, v]))

/** Legacy Studio/Neural2 voices still exposed by the Google voices API. */
const LEGACY_GOOGLE_VOICES = [
  {
    id: 'en-US-Studio-O',
    name: 'Sophia (Studio)',
    language: 'en-US',
    gender: 'FEMALE',
    type: 'Studio',
  },
  {
    id: 'en-US-Neural2-C',
    name: 'Emma (Neural2)',
    language: 'en-US',
    gender: 'FEMALE',
    type: 'Neural2',
  },
  {
    id: 'en-US-Studio-M',
    name: 'Marcus (Studio)',
    language: 'en-US',
    gender: 'MALE',
    type: 'Studio',
  },
  {
    id: 'en-US-Studio-Q',
    name: 'Quinn (Studio)',
    language: 'en-US',
    gender: 'MALE',
    type: 'Studio',
  },
] as const

export function getGeminiVoicesForApi() {
  const gemini = GEMINI_VOICE_CATALOG.map((voice) => ({
    id: voice.id,
    name: voice.displayName,
    language: voice.languageCode,
    gender: voice.gender.toUpperCase(),
    type: 'Gemini',
    description: voice.archetypeDescription,
    age: voice.ageBand,
  }))
  return [...gemini, ...LEGACY_GOOGLE_VOICES]
}

export function enrichGeminiVoicesForScoring<
  T extends { id: string; name?: string; gender?: string; description?: string; age?: string },
>(apiVoices: T[]): Array<T & { description: string; gender: string; age: string }> {
  return apiVoices.map((voice) => {
    const catalog = CATALOG_BY_ID.get(voice.id)
    const ageBand = catalog?.ageBand ?? getGeminiVoiceAgeBand(voice.id)
    return {
      ...voice,
      description: catalog?.archetypeDescription || voice.description || '',
      gender: catalog?.gender || voice.gender || '',
      name: catalog?.displayName || voice.name || voice.id,
      age: ageBand,
    }
  })
}

/** Picker-friendly list (gemini-* only) with archetype copy. */
export function getGeminiVoicesForPicker() {
  return GEMINI_VOICE_CATALOG.map((voice) => ({
    id: voice.id,
    name: voice.displayName.replace(' (Gemini)', ' (Premium)'),
    description: voice.archetypeDescription,
    gender: voice.gender === 'male' ? 'Male' : 'Female',
    category: 'Premium',
  }))
}
