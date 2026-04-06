export interface VoiceTraitTemplate {
  id: string
  label: string
  instruction: string
}

export interface VoiceTraitCategory {
  id: string
  label: string
  icon: string
  templates: VoiceTraitTemplate[]
}

export const VOICE_TRAIT_CATEGORIES: VoiceTraitCategory[] = [
  {
    id: 'age-gender',
    label: 'Age & Gender',
    icon: '👤',
    templates: [
      { id: 'young-adult-male', label: 'Young Adult Male', instruction: 'young adult male in his 20s' },
      { id: 'young-adult-female', label: 'Young Adult Female', instruction: 'young adult female in her 20s' },
      { id: 'middle-aged-male', label: 'Middle-Aged Male', instruction: 'middle-aged male in his 40s or 50s' },
      { id: 'middle-aged-female', label: 'Middle-Aged Female', instruction: 'middle-aged female in her 40s or 50s' },
      { id: 'elderly-male', label: 'Elderly Male', instruction: 'elderly male in his 70s' },
      { id: 'elderly-female', label: 'Elderly Female', instruction: 'elderly female in her 70s' }
    ]
  },
  {
    id: 'texture',
    label: 'Texture & Tone',
    icon: '🌊',
    templates: [
      { id: 'raspy', label: 'Raspy / Gravelly', instruction: 'with a raspy, gravelly texture' },
      { id: 'smooth', label: 'Smooth / Clear', instruction: 'with a smooth, clear, and resonant tone' },
      { id: 'warm', label: 'Warm / Comforting', instruction: 'with a warm, comforting, and empathetic tone' },
      { id: 'breathy', label: 'Breathy', instruction: 'with a soft, breathy vocal quality' },
      { id: 'nasal', label: 'Nasal', instruction: 'with a slightly nasal tone' },
      { id: 'booming', label: 'Booming', instruction: 'with a deep, booming, and authoritative resonance' }
    ]
  },
  {
    id: 'pace',
    label: 'Pace & Rhythm',
    icon: '⏱️',
    templates: [
      { id: 'slow-measured', label: 'Slow & Measured', instruction: 'speaking at a slow, measured, and deliberate pace' },
      { id: 'fast-energetic', label: 'Fast & Energetic', instruction: 'speaking at a fast, energetic, and rapid-fire pace' },
      { id: 'staccato', label: 'Staccato', instruction: 'with a staccato, clipped, and precise rhythm' },
      { id: 'fluid', label: 'Fluid & Melodic', instruction: 'with a fluid, melodic, and expressive rhythm' },
      { id: 'hesitant', label: 'Hesitant', instruction: 'speaking hesitantly with frequent pauses' }
    ]
  },
  {
    id: 'emotion',
    label: 'Attitude & Emotion',
    icon: '🎭',
    templates: [
      { id: 'authoritative', label: 'Authoritative', instruction: 'projecting strong authority and confidence' },
      { id: 'gentle', label: 'Gentle', instruction: 'projecting a gentle, caring demeanor' },
      { id: 'sarcastic', label: 'Sarcastic', instruction: 'with a dry, sarcastic, and cynical edge' },
      { id: 'scholarly', label: 'Scholarly', instruction: 'sounding scholarly, intellectual, and articulate' },
      { id: 'anxious', label: 'Anxious', instruction: 'sounding anxious, nervous, or on-edge' },
      { id: 'stoic', label: 'Stoic', instruction: 'with a stoic, detached, and emotionless delivery' }
    ]
  },
  {
    id: 'accent',
    label: 'Accent & Dialect',
    icon: '🌍',
    templates: [
      { id: 'american-neutral', label: 'American (Neutral)', instruction: 'with a standard, neutral American accent' },
      { id: 'british-rp', label: 'British (RP)', instruction: 'with a posh British Received Pronunciation (RP) accent' },
      { id: 'british-cockney', label: 'British (Cockney)', instruction: 'with a British Cockney accent' },
      { id: 'southern-drawl', label: 'American (Southern)', instruction: 'with a slow, American Southern drawl' },
      { id: 'new-york', label: 'American (New York)', instruction: 'with a distinct New York accent' },
      { id: 'australian', label: 'Australian', instruction: 'with an Australian accent' }
    ]
  }
]
